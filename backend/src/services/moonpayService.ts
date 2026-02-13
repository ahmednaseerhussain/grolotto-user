import axios from 'axios';
import crypto from 'crypto';
import config from '../config';
import { AppError } from '../middleware/errorHandler';
import * as walletService from './walletService';

/**
 * MoonPay Payment Integration Service
 *
 * Flow:
 * 1. Frontend calls createPaymentIntent → gets a signed URL
 * 2. User completes payment on MoonPay widget
 * 3. MoonPay calls our webhook → we verify signature → credit wallet
 *
 * MoonPay docs: https://docs.moonpay.com/
 */

interface CreatePaymentIntentInput {
  userId: string;
  amount: number;
  currency: 'USD' | 'HTG';
  walletAddress?: string;
}

interface MoonPayWebhookPayload {
  type: string;
  data: {
    id: string;
    status: string;
    baseCurrencyAmount: number;
    baseCurrency: { code: string };
    externalTransactionId?: string;
    cryptoTransactionId?: string;
    walletAddress?: string;
  };
}

/**
 * Create a MoonPay payment intent.
 * Returns a signed URL the frontend opens to complete payment.
 */
export async function createPaymentIntent(input: CreatePaymentIntentInput) {
  const { userId, amount, currency } = input;

  if (amount <= 0) {
    throw new AppError('Amount must be positive', 400);
  }

  if (amount > 10000) {
    throw new AppError('Amount exceeds maximum allowed ($10,000)', 400, 'AMOUNT_TOO_HIGH');
  }

  // Generate unique external transaction ID for idempotency
  const externalId = `grolotto_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  try {
    // Build MoonPay widget URL parameters
    const params = new URLSearchParams({
      apiKey: config.moonpay.apiKey,
      baseCurrencyCode: currency.toLowerCase(),
      baseCurrencyAmount: amount.toString(),
      externalTransactionId: externalId,
      colorCode: '#3b82f6',
      language: 'en',
    });

    // Sign the URL for security
    const urlToSign = `?${params.toString()}`;
    const signature = crypto
      .createHmac('sha256', config.moonpay.secretKey)
      .update(urlToSign)
      .digest('base64');

    const signedUrl = `${config.moonpay.baseUrl}/v1/nbuy?${params.toString()}&signature=${encodeURIComponent(signature)}`;

    return {
      paymentUrl: signedUrl,
      externalTransactionId: externalId,
      amount,
      currency,
    };
  } catch (error: any) {
    console.error('MoonPay createPaymentIntent error:', error.message);
    throw new AppError('Failed to create payment intent', 500, 'MOONPAY_ERROR');
  }
}

/**
 * Verify MoonPay webhook signature.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', config.moonpay.webhookSecret)
    .update(rawBody)
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Handle MoonPay webhook event.
 * Called when a payment status changes.
 */
export async function handleWebhook(payload: MoonPayWebhookPayload, signature: string, rawBody: string) {
  // 1. Verify webhook signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw new AppError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
  }

  const { type, data } = payload;

  // 2. Only process completed transactions
  if (type !== 'transaction_updated' || data.status !== 'completed') {
    return { status: 'ignored', reason: `Event type: ${type}, status: ${data.status}` };
  }

  // 3. Extract user ID from our external transaction ID
  const externalId = data.externalTransactionId;
  if (!externalId || !externalId.startsWith('grolotto_')) {
    return { status: 'ignored', reason: 'Not a GROLOTTO transaction' };
  }

  const parts = externalId.split('_');
  const userId = parts[1]; // grolotto_{userId}_{timestamp}_{random}

  if (!userId) {
    throw new AppError('Could not extract user from transaction ID', 400);
  }

  // 4. Determine currency
  const currencyCode = data.baseCurrency?.code?.toUpperCase();
  const currency = currencyCode === 'HTG' ? 'HTG' : 'USD';

  // 5. Credit wallet using idempotency key (prevents double credit)
  const idempotencyKey = `moonpay_${data.id}`;

  try {
    const result = await walletService.creditWallet(
      userId,
      data.baseCurrencyAmount,
      currency as 'USD' | 'HTG',
      idempotencyKey,
      `MoonPay deposit - ${data.baseCurrencyAmount} ${currency}`,
      'moonpay',
      data.id
    );

    return {
      status: 'credited',
      userId,
      amount: data.baseCurrencyAmount,
      currency,
      newBalance: result.newBalance,
    };
  } catch (error: any) {
    if (error.code === 'DUPLICATE_TRANSACTION') {
      return { status: 'already_processed', moonpayId: data.id };
    }
    throw error;
  }
}

/**
 * Get MoonPay transaction status (for checking pending payments).
 */
export async function getTransactionStatus(moonpayTransactionId: string) {
  try {
    const response = await axios.get(
      `${config.moonpay.baseUrl}/v1/transactions/${moonpayTransactionId}`,
      {
        headers: {
          Authorization: `Api-Key ${config.moonpay.secretKey}`,
        },
      }
    );

    return {
      id: response.data.id,
      status: response.data.status,
      amount: response.data.baseCurrencyAmount,
      currency: response.data.baseCurrency?.code,
    };
  } catch (error: any) {
    throw new AppError('Failed to fetch MoonPay transaction status', 500);
  }
}
