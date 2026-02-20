import axios from 'axios';
import crypto from 'crypto';
import config from '../config';
import { AppError } from '../middleware/errorHandler';
import * as walletService from './walletService';
import { query } from '../database/pool';

/**
 * MonCash Payment Integration Service
 * 
 * MonCash is Haiti's primary mobile money platform by Digicel.
 * 
 * Flow:
 * 1. Frontend calls createPayment → we get a payment token from MonCash
 * 2. User is redirected to MonCash gateway to authorize payment
 * 3. MonCash redirects back with transactionId → we verify and credit wallet
 * 
 * MonCash API docs: https://sandbox.moncashbutton.digicelgroup.com/Moncash-business/
 * 
 * NOTE: MonCash processes ALL payments in HTG. If USD is passed, we convert at the current rate.
 */

// Default USD→HTG exchange rate. Overridden by app_settings.htg_exchange_rate from DB.
const DEFAULT_USD_TO_HTG_RATE = 150;

// Cache exchange rate (refresh every hour)
let cachedExchangeRate: { rate: number; expiresAt: number } | null = null;

/**
 * Get USD→HTG exchange rate from app_settings DB with 1-hour cache.
 */
async function getExchangeRate(): Promise<number> {
  if (cachedExchangeRate && cachedExchangeRate.expiresAt > Date.now()) {
    return cachedExchangeRate.rate;
  }
  try {
    const result = await query(
      `SELECT value FROM app_settings WHERE key = 'htg_exchange_rate'`
    );
    if (result.rows.length > 0) {
      const val = result.rows[0].value;
      const rate = parseFloat(typeof val === 'string' ? val : JSON.stringify(val));
      if (!isNaN(rate) && rate > 0) {
        cachedExchangeRate = { rate, expiresAt: Date.now() + 3600_000 };
        return rate;
      }
    }
  } catch { /* use default */ }
  cachedExchangeRate = { rate: DEFAULT_USD_TO_HTG_RATE, expiresAt: Date.now() + 3600_000 };
  return DEFAULT_USD_TO_HTG_RATE;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get OAuth2 access token from MonCash (client_credentials grant).
 * Caches the token until expiry.
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const { clientId, clientSecret, baseUrl } = config.moncash;
  
  if (!clientId || !clientSecret) {
    throw new AppError('MonCash credentials not configured', 500, 'MONCASH_NOT_CONFIGURED');
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await axios.post(
      `${baseUrl}/Api/oauth/token`,
      'scope=read,write&grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      }
    );

    const { access_token, expires_in } = response.data;
    
    cachedToken = {
      token: access_token,
      expiresAt: Date.now() + (expires_in - 60) * 1000, // Refresh 60s before expiry
    };

    return access_token;
  } catch (error: any) {
    console.error('MonCash OAuth error:', error.response?.data || error.message);
    throw new AppError('Failed to authenticate with MonCash', 500, 'MONCASH_AUTH_ERROR');
  }
}

/**
 * Create a MonCash payment.
 * Returns a payment token that the frontend uses to redirect the user to MonCash gateway.
 */
export async function createPayment(input: {
  userId: string;
  amount: number;
  currency: 'USD' | 'HTG';
}): Promise<{
  paymentUrl: string;
  orderId: string;
  amount: number;
  amountHtg: number;
  currency: string;
}> {
  const { userId, amount, currency } = input;

  if (amount <= 0) {
    throw new AppError('Amount must be positive', 400);
  }
  if (amount > 10000) {
    throw new AppError('Amount exceeds maximum allowed ($10,000)', 400, 'AMOUNT_TOO_HIGH');
  }

  // MonCash only processes in HTG — convert if needed
  const exchangeRate = await getExchangeRate();
  const amountHtg = currency === 'USD' ? Math.round(amount * exchangeRate * 100) / 100 : amount;

  // Generate unique order ID for idempotency
  const orderId = `GRO_${userId.substring(0, 8)}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  try {
    const token = await getAccessToken();
    const { baseUrl } = config.moncash;

    const response = await axios.post(
      `${baseUrl}/Api/v1/CreatePayment`,
      { amount: amountHtg, orderId },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    const paymentToken = response.data?.payment_token?.token;
    if (!paymentToken) {
      throw new AppError('No payment token received from MonCash', 500);
    }

    // Build the redirect URL for the user
    const paymentUrl = `${baseUrl}/Moncash-business/Payment/Redirect?token=${paymentToken}`;

    return {
      paymentUrl,
      orderId,
      amount,
      amountHtg,
      currency,
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    console.error('MonCash createPayment error:', error.response?.data || error.message);
    throw new AppError('Failed to create MonCash payment', 500, 'MONCASH_PAYMENT_ERROR');
  }
}

/**
 * Retrieve payment details by order ID.
 * Used to verify payment after user returns from MonCash gateway.
 */
export async function getPaymentByOrderId(orderId: string): Promise<{
  transactionId: string;
  status: string;
  amount: number;
  payer: string;
  message: string;
}> {
  try {
    const token = await getAccessToken();
    const { baseUrl } = config.moncash;

    const response = await axios.post(
      `${baseUrl}/Api/v1/RetrieveOrderPayment`,
      { orderId },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    const payment = response.data?.payment;
    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    return {
      transactionId: payment.transaction_id?.toString() || '',
      status: payment.message === 'successful' ? 'completed' : payment.message,
      amount: payment.cost,
      payer: payment.payer,
      message: payment.message,
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    console.error('MonCash getPaymentByOrderId error:', error.response?.data || error.message);
    throw new AppError('Failed to retrieve MonCash payment', 500, 'MONCASH_RETRIEVE_ERROR');
  }
}

/**
 * Retrieve payment details by transaction ID.
 */
export async function getPaymentByTransactionId(transactionId: string): Promise<{
  transactionId: string;
  status: string;
  amount: number;
  payer: string;
  message: string;
}> {
  try {
    const token = await getAccessToken();
    const { baseUrl } = config.moncash;

    const response = await axios.post(
      `${baseUrl}/Api/v1/RetrieveTransactionPayment`,
      { transactionId },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    const payment = response.data?.payment;
    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    return {
      transactionId: payment.transaction_id?.toString() || '',
      status: payment.message === 'successful' ? 'completed' : payment.message,
      amount: payment.cost,
      payer: payment.payer,
      message: payment.message,
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to retrieve MonCash payment', 500);
  }
}

/**
 * Verify and credit a user's wallet after MonCash payment confirmation.
 * Called after the user returns from MonCash gateway with a transactionId.
 */
export async function verifyAndCreditPayment(
  userId: string,
  orderId: string,
  transactionId: string
): Promise<{
  status: string;
  amount: number;
  newBalance: number;
}> {
  // 1. Retrieve payment from MonCash to verify
  const payment = transactionId 
    ? await getPaymentByTransactionId(transactionId)
    : await getPaymentByOrderId(orderId);

  if (payment.status !== 'completed') {
    throw new AppError(`Payment not completed. Status: ${payment.status}`, 400, 'PAYMENT_NOT_COMPLETED');
  }

  // 2. Credit wallet with idempotency
  const idempotencyKey = `moncash_${payment.transactionId}`;

  try {
    const result = await walletService.creditWallet(
      userId,
      payment.amount,
      'HTG', // MonCash always processes in HTG
      idempotencyKey,
      `MonCash deposit - ${payment.amount} HTG`,
      'moncash',
      payment.transactionId
    );

    return {
      status: 'credited',
      amount: payment.amount,
      newBalance: result.newBalance,
    };
  } catch (error: any) {
    if (error.code === 'DUPLICATE_TRANSACTION' || error.code === '23505') {
      return { status: 'already_processed', amount: payment.amount, newBalance: 0 };
    }
    throw error;
  }
}
