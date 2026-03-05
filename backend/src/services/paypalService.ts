import axios from 'axios';
import { AppError } from '../middleware/errorHandler';
import * as walletService from './walletService';
import { query } from '../database/pool';

/**
 * PayPal Payment Integration Service (Sandbox / Production)
 *
 * Flow:
 * 1. Frontend calls createOrder → we create PayPal order, return orderID + approveUrl
 * 2. User approves on PayPal (redirect or popup)
 * 3. Frontend calls captureOrder with the orderID → we capture & credit wallet
 *
 * Sandbox:  https://api-m.sandbox.paypal.com
 * Production: https://api-m.paypal.com
 */

const PAYPAL_BASE = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get OAuth2 access token from PayPal (client_credentials grant).
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new AppError('PayPal credentials not configured', 500, 'PAYPAL_NOT_CONFIGURED');
  }

  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const response = await axios.post(
    `${PAYPAL_BASE}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const { access_token, expires_in } = response.data;
  cachedToken = {
    token: access_token,
    expiresAt: Date.now() + (expires_in - 60) * 1000,
  };
  return access_token;
}

/**
 * Create a PayPal order.
 * Returns the order ID and approval URL for the user.
 */
export async function createOrder(input: {
  userId: string;
  amount: number;
  currency?: string;
  returnUrl?: string;
  cancelUrl?: string;
}): Promise<{
  orderId: string;
  approveUrl: string;
  amount: number;
  currency: string;
}> {
  const { userId, amount, currency = 'USD' } = input;

  if (amount <= 0) throw new AppError('Amount must be positive', 400);
  if (amount > 10000) throw new AppError('Amount exceeds maximum ($10,000)', 400, 'AMOUNT_TOO_HIGH');

  const token = await getAccessToken();

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
  const returnUrl = input.returnUrl || `${backendUrl}/api/payments/paypal/return`;
  const cancelUrl = input.cancelUrl || `${frontendUrl}/player/dashboard`;

  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: `GRO_${userId.substring(0, 8)}_${Date.now()}`,
      amount: {
        currency_code: currency === 'HTG' ? 'USD' : 'USD', // PayPal uses USD
        value: amount.toFixed(2),
      },
      description: `GroLotto Wallet Deposit - $${amount.toFixed(2)}`,
    }],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: 'GroLotto',
          locale: 'en-US',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      },
    },
  };

  try {
    const response = await axios.post(
      `${PAYPAL_BASE}/v2/checkout/orders`,
      orderPayload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const order = response.data;
    const approveLink = order.links?.find((l: any) => l.rel === 'payer-action' || l.rel === 'approve');

    // Store pending order in DB for later verification
    await query(
      `INSERT INTO transactions (user_id, type, amount, currency, status, description, idempotency_key)
       VALUES ($1, 'deposit', $2, 'USD', 'pending', $3, $4)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [userId, amount, `PayPal deposit - $${amount.toFixed(2)}`, `paypal_${order.id}`]
    );

    return {
      orderId: order.id,
      approveUrl: approveLink?.href || '',
      amount,
      currency: 'USD',
    };
  } catch (error: any) {
    console.error('PayPal createOrder error:', error.response?.data || error.message);
    throw new AppError('Failed to create PayPal order', 500, 'PAYPAL_ORDER_ERROR');
  }
}

/**
 * Capture a PayPal order after user approval.
 * Credits the user's USD wallet.
 */
export async function captureOrder(
  userId: string,
  orderId: string,
): Promise<{
  status: string;
  amount: number;
  transactionId: string;
  newBalance: number;
}> {
  const token = await getAccessToken();

  try {
    const response = await axios.post(
      `${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const order = response.data;

    if (order.status !== 'COMPLETED') {
      throw new AppError(`PayPal order not completed. Status: ${order.status}`, 400, 'PAYPAL_NOT_COMPLETED');
    }

    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture) {
      throw new AppError('No capture data from PayPal', 500);
    }

    const capturedAmount = parseFloat(capture.amount.value);
    const paypalTxnId = capture.id;
    const idempotencyKey = `paypal_${orderId}`;

    // Credit user's USD wallet
    const result = await walletService.creditWallet(
      userId,
      capturedAmount,
      'USD',
      idempotencyKey,
      `PayPal deposit - $${capturedAmount.toFixed(2)}`,
      'paypal',
      paypalTxnId
    );

    return {
      status: 'credited',
      amount: capturedAmount,
      transactionId: paypalTxnId,
      newBalance: result.newBalance,
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    if (error.code === 'DUPLICATE_TRANSACTION' || error.code === '23505') {
      return { status: 'already_processed', amount: 0, transactionId: '', newBalance: 0 };
    }
    console.error('PayPal captureOrder error:', error.response?.data || error.message);
    throw new AppError('Failed to capture PayPal payment', 500, 'PAYPAL_CAPTURE_ERROR');
  }
}

/**
 * Get PayPal order details.
 */
export async function getOrderDetails(orderId: string) {
  const token = await getAccessToken();

  const response = await axios.get(
    `${PAYPAL_BASE}/v2/checkout/orders/${orderId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  return response.data;
}
