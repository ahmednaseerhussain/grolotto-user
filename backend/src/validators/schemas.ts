import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['player', 'vendor']).optional().default('player'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
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
  roundId: z.string().uuid('Invalid round ID'),
  winningNumbers: z.record(
    z.enum(['senp', 'maryaj', 'loto3', 'loto4', 'loto5']),
    z.array(z.number().int().min(0))
  ),
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
