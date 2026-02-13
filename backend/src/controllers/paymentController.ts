import { Request, Response, NextFunction } from 'express';
import * as moonpayService from '../services/moonpayService';

export async function createPaymentIntent(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await moonpayService.createPaymentIntent({
      userId: req.user!.id,
      amount: req.body.amount,
      currency: req.body.currency || 'USD',
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * MoonPay webhook handler.
 * This endpoint is called by MoonPay servers — NOT by our frontend.
 * The raw body is needed for signature verification.
 */
export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['moonpay-signature'] as string;
    if (!signature) {
      res.status(400).json({ error: 'Missing signature header' });
      return;
    }

    // Express raw body middleware stores it on req.body when content-type is correct
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const result = await moonpayService.handleWebhook(req.body, signature, rawBody);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTransactionStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await moonpayService.getTransactionStatus(req.params.transactionId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
