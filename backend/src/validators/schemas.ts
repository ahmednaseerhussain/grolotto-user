import { z } from 'zod';

/**
 * Validate a date string (YYYY-MM-DD) and ensure the person is at least 18 years old.
 */
function isValidAdultDOB(dateStr: string): boolean {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, yearStr, monthStr, dayStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const dob = new Date(year, month - 1, day);
  if (dob.getFullYear() !== year || dob.getMonth() !== month - 1 || dob.getDate() !== day) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18;
}

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['player', 'vendor']).optional().default('player'),
  phone: z.string().optional(),
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
    .refine(isValidAdultDOB, 'You must be at least 18 years old to register'),
  country: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
    .refine(isValidAdultDOB, 'You must be at least 18 years old')
    .optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export const placeBetSchema = z.object({
  vendorId: z.string().uuid('Invalid vendor ID'),
  drawState: z.enum(['NY', 'FL', 'GA', 'TX', 'PA', 'CT', 'TN', 'NJ']),
  gameType: z.enum(['senp', 'maryaj', 'loto3', 'loto4', 'loto5']),
  numbers: z.array(z.number().int().min(0)).min(1).max(5),
  betAmount: z.number().positive('Bet amount must be positive'),
  currency: z.enum(['USD', 'HTG']).default('USD'),
});

export const createPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive').max(10000),
  currency: z.enum(['USD', 'HTG']).default('USD'),
});

export const publishResultsSchema = z.object({
  drawState: z.enum(['NY', 'FL', 'GA', 'TX', 'PA', 'CT', 'TN', 'NJ']),
  winningNumbers: z.record(
    z.enum(['senp', 'maryaj', 'loto3', 'loto4', 'loto5']),
    z.array(z.number().int().min(0))
  ),
  drawDate: z.string().optional(),
});

export const vendorRegistrationSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  dateOfBirth: z.string(),
  businessName: z.string().optional(),
});

export const drawSettingsSchema = z.object({
  enabled: z.boolean(),
  games: z.record(
    z.enum(['senp', 'maryaj', 'loto3', 'loto4', 'loto5']),
    z.object({
      enabled: z.boolean(),
      minAmount: z.number().min(0),
      maxAmount: z.number().min(0),
    })
  ),
});
