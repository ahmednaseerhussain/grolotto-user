import { Request, Response, NextFunction } from 'express';
import * as moncashService from '../services/moncashService';

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
