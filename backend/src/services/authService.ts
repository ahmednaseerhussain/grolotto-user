import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { query, withTransaction } from '../database/pool';
import config from '../config';
import { AppError } from '../middleware/errorHandler';
import * as rewardService from './rewardService';
import { getPermissionsForRole } from '../middleware/auth';
import { sendPasswordResetEmail, sendSignupVerificationEmail } from './emailService';

const SALT_ROUNDS = 12;

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: 'player' | 'vendor' | 'admin';
  phone?: string;
  dateOfBirth?: string;
  country?: string;
  // Optional vendor fields — if role === 'vendor', vendor row is created in same transaction
  firstName?: string;
  lastName?: string;
  businessName?: string;
  operatingCurrency?: 'HTG' | 'USD';
  acceptedTerms?: boolean;
  // When true, register creates the account but does NOT issue tokens; caller must verify via OTP.
  verifyByEmail?: boolean;
}

const TERMS_VERSION = '2025-01';

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  adminRole?: string;
  permissions?: string[];
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  isVerified: boolean;
  balance: number;
  createdAt: string;
}

function generateTokens(user: { id: string; email: string; role: string }): TokenPair {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiry } as SignOptions
  );
  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry } as SignOptions
  );
  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput): Promise<{ user: UserProfile; tokens: TokenPair | null; requiresEmailVerification?: boolean }> {
  const { email, password, name, role = 'player', phone, dateOfBirth, country,
    firstName, lastName, businessName, operatingCurrency, acceptedTerms, verifyByEmail } = input;

  // Check if email already exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
  }

  // Cannot self-register as admin
  if (role === 'admin') {
    throw new AppError('Cannot register as admin', 403);
  }

  // If registering as vendor, require vendor fields so we don't end up with orphan users
  if (role === 'vendor') {
    if (!firstName || firstName.trim().length < 2) {
      throw new AppError('First name is required (min 2 characters) for vendor registration', 400);
    }
    if (!lastName || lastName.trim().length < 2) {
      throw new AppError('Last name is required (min 2 characters) for vendor registration', 400);
    }
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  // If web flow with email verification, the user starts unverified; otherwise legacy mobile flow keeps users verified by default.
  const emailVerifiedInitial = verifyByEmail ? false : true;
  const termsAcceptedAt = acceptedTerms ? new Date() : null;

  const result = await withTransaction(async (client) => {
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, name, role, phone, date_of_birth, country, is_verified, email_verified, terms_accepted_at, terms_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8, $9, $10)
       RETURNING id, email, name, role, phone, date_of_birth, address, city, country, is_verified, email_verified, created_at`,
      [email.toLowerCase(), passwordHash, name, role, phone || null, dateOfBirth || null, country || 'Haiti',
       emailVerifiedInitial, termsAcceptedAt, acceptedTerms ? TERMS_VERSION : null]
    );

    const user = userResult.rows[0];

    // Create wallet
    await client.query(
      'INSERT INTO wallets (user_id) VALUES ($1)',
      [user.id]
    );

    // If vendor, create vendor row atomically in the same transaction
    if (role === 'vendor') {
      const currency = operatingCurrency === 'USD' ? 'USD' : 'HTG';
      const vendorInsert = await client.query(
        `INSERT INTO vendors (user_id, first_name, last_name, business_name, display_name, status, application_date)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
         RETURNING id`,
        [user.id, firstName!, lastName!, businessName || null, `${firstName} ${lastName}`]
      );
      // Try to set operating_currency — silently skip if column hasn't been migrated
      try {
        await client.query(
          `UPDATE vendors SET operating_currency = $1 WHERE id = $2`,
          [currency, vendorInsert.rows[0].id]
        );
      } catch { /* column doesn't exist — will default */ }
    }

    // Create welcome bonus reward (non-blocking)
    rewardService.createWelcomeBonus(user.id);

    let tokens: TokenPair | null = null;
    if (!verifyByEmail) {
      tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
      await client.query(
        'UPDATE users SET refresh_token = $1 WHERE id = $2',
        [tokens.refreshToken, user.id]
      );
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        dateOfBirth: user.date_of_birth,
        address: user.address,
        city: user.city,
        country: user.country,
        isVerified: user.is_verified,
        balance: 0,
        createdAt: user.created_at,
      },
      tokens,
    };
  });

  if (verifyByEmail) {
    // Generate a signup OTP and email it — fire and forget logging on error so register still succeeds
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await query(
      `UPDATE email_verifications SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
      [result.user.id]
    );
    await query(
      `INSERT INTO email_verifications (user_id, otp_code, expires_at) VALUES ($1, $2, $3)`,
      [result.user.id, otp, expiresAt]
    );
    await sendSignupVerificationEmail(result.user.email, otp, result.user.name).catch((err) =>
      console.error('[SIGNUP VERIFY] email send failed:', err?.message || err)
    );
    if (process.env.DEV_EXPOSE_OTP === 'true') {
      console.log(`[SIGNUP VERIFY] OTP for ${result.user.email}: ${otp}`);
    }
    return { ...result, requiresEmailVerification: true };
  }

  return result;
}

export async function login(input: LoginInput): Promise<{ user: UserProfile; tokens: TokenPair }> {
  const { email, password } = input;

  // Check if brute-force columns exist (migration may not have run yet)
  let hasBruteForceColumns = true;
  try {
    const colCheck = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'users' AND column_name = 'failed_login_attempts'`
    );
    hasBruteForceColumns = colCheck.rows.length > 0;
  } catch { hasBruteForceColumns = false; }

  const baseSelect = `SELECT u.id, u.email, u.name, u.role, u.password_hash, u.phone, u.date_of_birth,
            u.address, u.city, u.country, u.is_verified, u.is_active, u.created_at, u.admin_role,
            ${hasBruteForceColumns ? 'u.failed_login_attempts, u.last_failed_login,' : ''}
            w.balance_usd
     FROM users u
     LEFT JOIN wallets w ON w.user_id = u.id
     WHERE u.email = $1`;

  const result = await query(baseSelect, [email.toLowerCase()]);

  if (result.rows.length === 0) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    // Fetch the admin-supplied suspension reason so the user sees it
    let suspensionMsg = 'Your account has been suspended. Please contact support.';
    try {
      const reasonResult = await query(
        `SELECT value FROM app_settings WHERE key = $1`,
        [`suspension_reason_${user.id}`]
      );
      if (reasonResult.rows.length > 0) {
        const val = typeof reasonResult.rows[0].value === 'string'
          ? JSON.parse(reasonResult.rows[0].value)
          : reasonResult.rows[0].value;
        if (val?.reason) {
          suspensionMsg = `Account suspended: ${val.reason}`;
        }
      }
    } catch { /* non-critical — fall back to generic message */ }
    throw new AppError(suspensionMsg, 403, 'ACCOUNT_SUSPENDED');
  }

  const bruteForceEnabled = config.rateLimitEnabled;

  // Check brute force protection (only if enabled and migration has run)
  if (bruteForceEnabled && hasBruteForceColumns && user.failed_login_attempts >= 5 && user.last_failed_login) {
    const lockoutEnd = new Date(user.last_failed_login);
    lockoutEnd.setMinutes(lockoutEnd.getMinutes() + 15);
    if (new Date() < lockoutEnd) {
      throw new AppError('Account temporarily locked. Try again in 15 minutes.', 429, 'ACCOUNT_LOCKED');
    }
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    if (bruteForceEnabled && hasBruteForceColumns) {
      await query(
        'UPDATE users SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1, last_failed_login = NOW() WHERE id = $1',
        [user.id]
      );
    }
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Reset failed attempts on successful login
  if (bruteForceEnabled && hasBruteForceColumns) {
    await query(
      'UPDATE users SET failed_login_attempts = 0, last_failed_login = NULL WHERE id = $1',
      [user.id]
    );
  }

  const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });

  // Store refresh token
  await query(
    'UPDATE users SET refresh_token = $1 WHERE id = $2',
    [tokens.refreshToken, user.id]
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      adminRole: user.role === 'admin' ? (user.admin_role || 'admin') : undefined,
      permissions: user.role === 'admin' ? getPermissionsForRole(user.admin_role || 'admin') : undefined,
      phone: user.phone,
      dateOfBirth: user.date_of_birth,
      address: user.address,
      city: user.city,
      country: user.country,
      isVerified: user.is_verified,
      balance: parseFloat(user.balance_usd || '0'),
      createdAt: user.created_at,
    },
    tokens,
  };
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;

    // Verify token matches stored token (prevents reuse after logout)
    const result = await query(
      'SELECT id, email, role, refresh_token FROM users WHERE id = $1 AND is_active = TRUE',
      [decoded.id]
    );

    if (result.rows.length === 0 || result.rows[0].refresh_token !== refreshToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    const user = result.rows[0];
    const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });

    // Rotate refresh token
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, user.id]);

    return tokens;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid refresh token', 401);
  }
}

export async function logout(userId: string): Promise<void> {
  await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [userId]);
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const result = await query(
    `SELECT u.id, u.email, u.name, u.role, u.phone, u.date_of_birth,
            u.address, u.city, u.country, u.is_verified, u.created_at,
            w.balance_usd
     FROM users u
     LEFT JOIN wallets w ON w.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = result.rows[0];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    dateOfBirth: user.date_of_birth,
    address: user.address,
    city: user.city,
    country: user.country,
    isVerified: user.is_verified,
    balance: parseFloat(user.balance_usd || '0'),
    createdAt: user.created_at,
  };
}

export async function updateProfile(
  userId: string,
  updates: { name?: string; phone?: string; dateOfBirth?: string; address?: string; city?: string; country?: string }
): Promise<UserProfile> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Map camelCase keys to snake_case DB columns
  const fieldMap: Record<string, string> = {
    name: 'name',
    phone: 'phone',
    dateOfBirth: 'date_of_birth',
    address: 'address',
    city: 'city',
    country: 'country',
  };

  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined && fieldMap[key]) {
      setClauses.push(`${fieldMap[key]} = $${paramIndex}`);
      values.push(val);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    throw new AppError('No fields to update', 400);
  }

  values.push(userId);
  await query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  return getProfile(userId);
}

/**
 * Request a password reset. Generates a 6-digit OTP, stores it in email_verifications,
 * and returns the OTP (in production this would be emailed/SMS'd).
 */
export async function requestPasswordReset(email: string): Promise<{ message: string; otp?: string }> {
  const userResult = await query(
    'SELECT id, email, is_active FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  // Always return success to avoid email enumeration
  if (userResult.rows.length === 0) {
    return { message: 'If an account with that email exists, a reset code has been sent.' };
  }

  const user = userResult.rows[0];
  if (!user.is_active) {
    return { message: 'If an account with that email exists, a reset code has been sent.' };
  }

  // Generate 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Invalidate previous unused codes for this user
  await query(
    'UPDATE email_verifications SET used = TRUE WHERE user_id = $1 AND used = FALSE',
    [user.id]
  );

  // Store new OTP
  await query(
    `INSERT INTO email_verifications (user_id, otp_code, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, otp, expiresAt]
  );

  await sendPasswordResetEmail(email, otp).catch((err) =>
    console.error('[PASSWORD RESET] email send failed:', err?.message || err)
  );

  const exposeOtp = process.env.DEV_EXPOSE_OTP === 'true';
  if (exposeOtp) {
    console.log(`[PASSWORD RESET] OTP for ${email}: ${otp}`);
  }
  return {
    message: 'If an account with that email exists, a reset code has been sent.',
    ...(exposeOtp ? { otp } : {}),
  };
}

/**
 * Reset password using OTP code.
 */
export async function resetPassword(email: string, otpCode: string, newPassword: string): Promise<void> {
  const userResult = await query(
    'SELECT id FROM users WHERE email = $1 AND is_active = TRUE',
    [email.toLowerCase()]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('Invalid email or reset code', 400, 'INVALID_RESET');
  }

  const userId = userResult.rows[0].id;

  // Find valid OTP
  const otpResult = await query(
    `SELECT id FROM email_verifications
     WHERE user_id = $1 AND otp_code = $2 AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId, otpCode]
  );

  if (otpResult.rows.length === 0) {
    throw new AppError('Invalid or expired reset code', 400, 'INVALID_OTP');
  }

  // Mark OTP as used
  await query('UPDATE email_verifications SET used = TRUE WHERE id = $1', [otpResult.rows[0].id]);

  // Hash new password and update
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
}

/**
 * Verify a signup OTP. On success: marks user email_verified=TRUE and returns user + tokens.
 */
export async function verifyEmail(email: string, otpCode: string): Promise<{ user: UserProfile; tokens: TokenPair }> {
  const userResult = await query(
    `SELECT u.id, u.email, u.name, u.role, u.phone, u.date_of_birth, u.address, u.city, u.country,
            u.is_verified, u.is_active, u.email_verified, u.admin_role, u.created_at, w.balance_usd
     FROM users u LEFT JOIN wallets w ON w.user_id = u.id
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );
  if (userResult.rows.length === 0) {
    throw new AppError('Invalid email or verification code', 400, 'INVALID_VERIFICATION');
  }
  const user = userResult.rows[0];
  if (!user.is_active) {
    throw new AppError('Account suspended. Please contact support.', 403, 'ACCOUNT_SUSPENDED');
  }

  const otpResult = await query(
    `SELECT id FROM email_verifications
     WHERE user_id = $1 AND otp_code = $2 AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [user.id, otpCode]
  );
  if (otpResult.rows.length === 0) {
    throw new AppError('Invalid or expired verification code', 400, 'INVALID_OTP');
  }

  await query('UPDATE email_verifications SET used = TRUE WHERE id = $1', [otpResult.rows[0].id]);
  await query('UPDATE users SET email_verified = TRUE WHERE id = $1', [user.id]);

  const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
  await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, user.id]);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      adminRole: user.role === 'admin' ? (user.admin_role || 'admin') : undefined,
      permissions: user.role === 'admin' ? getPermissionsForRole(user.admin_role || 'admin') : undefined,
      phone: user.phone,
      dateOfBirth: user.date_of_birth,
      address: user.address,
      city: user.city,
      country: user.country,
      isVerified: user.is_verified,
      balance: parseFloat(user.balance_usd || '0'),
      createdAt: user.created_at,
    },
    tokens,
  };
}

/**
 * Resend a signup verification OTP. Always returns success to prevent enumeration.
 */
export async function resendVerification(email: string): Promise<{ message: string; otp?: string }> {
  const userResult = await query(
    'SELECT id, email, name, email_verified, is_active FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  const genericMsg = { message: 'If an account exists, a new verification code has been sent.' };
  if (userResult.rows.length === 0) return genericMsg;
  const user = userResult.rows[0];
  if (!user.is_active) return genericMsg;
  if (user.email_verified) return { message: 'Email is already verified.' };

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await query(
    `UPDATE email_verifications SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
    [user.id]
  );
  await query(
    `INSERT INTO email_verifications (user_id, otp_code, expires_at) VALUES ($1, $2, $3)`,
    [user.id, otp, expiresAt]
  );

  await sendSignupVerificationEmail(user.email, otp, user.name).catch((err) =>
    console.error('[SIGNUP VERIFY] resend failed:', err?.message || err)
  );

  const exposeOtp = process.env.DEV_EXPOSE_OTP === 'true';
  if (exposeOtp) {
    console.log(`[SIGNUP VERIFY] OTP for ${user.email}: ${otp}`);
  }
  return { ...genericMsg, ...(exposeOtp ? { otp } : {}) };
}
