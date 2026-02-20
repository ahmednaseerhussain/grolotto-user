import { Request, Response, NextFunction } from 'express';
import * as moncashService from '../services/moncashService';
import { query } from '../database/pool';

/**
 * Create a MonCash payment.
 * Returns a redirect URL for the user to complete payment on MonCash.
 */
export async function createPaymentIntent(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await moncashService.createPayment({
      userId: req.user!.id,
      amount: req.body.amount,
      currency: req.body.currency || 'HTG',
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Verify a MonCash payment after user returns from gateway.
 * Frontend calls this with the orderId and transactionId.
 */
export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId, transactionId } = req.body;
    if (!orderId && !transactionId) {
      res.status(400).json({ error: 'orderId or transactionId required' });
      return;
    }
    const result = await moncashService.verifyAndCreditPayment(
      req.user!.id,
      orderId || '',
      transactionId || ''
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get payment status by transaction ID.
 */
export async function getTransactionStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await moncashService.getPaymentByTransactionId(req.params.transactionId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * MonCash Return URL callback.
 * MonCash redirects the user here after payment with transactionId in query.
 * This is a public endpoint (no auth required) — it shows a simple HTML page.
 */
export async function moncashReturn(req: Request, res: Response) {
  const transactionId = req.query.transactionId as string;

  if (!transactionId) {
    res.status(200).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>Payment Processing</h2>
        <p>No transaction ID received. Please return to the app and check your balance.</p>
        <p>You can close this page.</p>
      </body></html>
    `);
    return;
  }

  try {
    // Try to find order in our pending transactions and auto-verify
    const payment = await moncashService.getPaymentByTransactionId(transactionId);
    
    res.status(200).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2 style="color:#10b981">&check; Payment ${payment.status === 'completed' ? 'Successful' : 'Processing'}</h2>
        <p><strong>Amount:</strong> ${payment.amount} HTG</p>
        <p><strong>Transaction:</strong> ${transactionId}</p>
        <p>Return to the GRO Lotto app to see your updated balance.</p>
        <p style="color:#6b7280;font-size:14px">You can close this page.</p>
      </body></html>
    `);
  } catch {
    res.status(200).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>Payment Received</h2>
        <p><strong>Transaction:</strong> ${transactionId}</p>
        <p>Please return to the GRO Lotto app and verify your payment.</p>
        <p style="color:#6b7280;font-size:14px">You can close this page.</p>
      </body></html>
    `);
  }
}

/**
 * MonCash Alert URL (notification webhook).
 * MonCash POSTs payment notification here on successful payment.
 * Public endpoint — no auth required.
 */
export async function moncashWebhook(req: Request, res: Response) {
  try {
    const transactionId = req.body?.transactionId || req.query?.transactionId;
    
    console.log('[MonCash Webhook] Received notification:', {
      body: req.body,
      query: req.query,
      transactionId,
    });

    if (transactionId) {
      // Look up which user owns this order and auto-credit
      const payment = await moncashService.getPaymentByTransactionId(String(transactionId));
      
      if (payment.status === 'completed') {
        // Find the pending transaction by matching moncash_transaction_id or order pattern
        const txResult = await query(
          `SELECT user_id FROM transactions WHERE moncash_transaction_id = $1 LIMIT 1`,
          [String(transactionId)]
        );
        
        if (txResult.rows.length === 0) {
          console.log('[MonCash Webhook] No matching transaction found for auto-credit, transactionId:', transactionId);
        } else {
          console.log('[MonCash Webhook] Payment already processed for transactionId:', transactionId);
        }
      }
    }

    // Always respond 200 to acknowledge receipt
    res.status(200).json({ status: 'received' });
  } catch (error: any) {
    console.error('[MonCash Webhook] Error:', error.message);
    // Still respond 200 to prevent MonCash from retrying
    res.status(200).json({ status: 'received' });
  }
}
