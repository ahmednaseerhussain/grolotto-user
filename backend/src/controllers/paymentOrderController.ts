import { Request, Response, NextFunction } from 'express';
import * as paymentOrderService from '../services/paymentOrderService';

// ─── Player endpoints ───────────────────────────────────

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { amount, currency, paymentMethod, giftCardAmount } = req.body;

    if (!amount || !currency || !paymentMethod) {
      return res.status(400).json({ error: 'amount, currency and paymentMethod are required' });
    }

    const validMethods = ['zelle', 'cashapp', 'stripe'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: `Invalid payment method. Use: ${validMethods.join(', ')}` });
    }

    const order = await paymentOrderService.createPaymentOrder(
      userId,
      parseFloat(amount),
      currency,
      paymentMethod,
      giftCardAmount ? parseFloat(giftCardAmount) : undefined,
    );

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
}

export async function getMyOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const orders = await paymentOrderService.getPaymentOrders({ userId });
    res.json(orders);
  } catch (error) {
    next(error);
  }
}

// ─── Admin endpoints ────────────────────────────────────

export async function listOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.query;
    const orders = await paymentOrderService.getPaymentOrders(
      status ? { status: status as string } : undefined,
    );
    res.json(orders);
  } catch (error) {
    next(error);
  }
}

export async function approveOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const adminId = req.user!.id;
    const { id } = req.params;
    const { notes } = req.body;
    const order = await paymentOrderService.approvePaymentOrder(id, adminId, notes);
    res.json({ message: 'Payment order approved — wallet credited', order });
  } catch (error) {
    next(error);
  }
}

export async function rejectOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const adminId = req.user!.id;
    const { id } = req.params;
    const { reason } = req.body;
    const order = await paymentOrderService.rejectPaymentOrder(id, adminId, reason);
    res.json({ message: 'Payment order rejected', order });
  } catch (error) {
    next(error);
  }
}
