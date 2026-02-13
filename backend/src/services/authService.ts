import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { query, withTransaction } from '../database/pool';
import config from '../config';
import { AppError } from '../middleware/errorHandler';

const SALT_ROUNDS = 12;

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: 'player' | 'vendor' | 'admin';
  phone?: string;
  dateOfBirth?: string;
  country?: string;
}

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

export async function register(input: RegisterInput): Promise<{ user: UserProfile; tokens: TokenPair }> {
  const { email, password, name, role = 'player', phone, dateOfBirth, country } = input;

  // Check if email already exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
  }

  // Cannot self-register as admin
  if (role === 'admin') {
    throw new AppError('Cannot register as admin', 403);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  return withTransaction(async (client) => {
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, name, role, phone, date_of_birth, country, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
       RETURNING id, email, name, role, phone, date_of_birth, address, city, country, is_verified, created_at`,
      [email.toLowerCase(), passwordHash, name, role, phone || null, dateOfBirth || null, country || 'Haiti']
    );

    const user = userResult.rows[0];

    // Create wallet
    await client.query(
      'INSERT INTO wallets (user_id) VALUES ($1)',
      [user.id]
    );

    const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });

    // Store refresh token
    await client.query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [tokens.refreshToken, user.id]
    );

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
}

export async function login(input: LoginInput): Promise<{ user: UserProfile; tokens: TokenPair }> {
  const { email, password } = input;

  const result = await query(
    `SELECT u.id, u.email, u.name, u.role, u.password_hash, u.phone, u.date_of_birth,
            u.address, u.city, u.country, u.is_verified, u.is_active, u.created_at,
            w.balance_usd
     FROM users u
     LEFT JOIN wallets w ON w.user_id = u.id
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw new AppError('Account is suspended', 403, 'ACCOUNT_SUSPENDED');
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
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
  updates: { name?: string; phone?: string; address?: string; city?: string; country?: string }
): Promise<UserProfile> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`);
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
