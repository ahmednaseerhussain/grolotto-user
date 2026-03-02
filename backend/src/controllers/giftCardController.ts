import { Request, Response, NextFunction } from 'express';
import * as giftCardService from '../services/giftCardService';

export async function purchaseGiftCard(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount, currency, recipientName, message } = req.body;
    const result = await giftCardService.purchaseGiftCard(
      req.user!.id,
      amount,
      currency || 'HTG',
      recipientName,
      message
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function redeemGiftCard(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Gift card code is required' });
      return;
    }
    const result = await giftCardService.redeemGiftCard(req.user!.id, code);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getMyGiftCards(req: Request, res: Response, next: NextFunction) {
  try {
    const cards = await giftCardService.getMyGiftCards(req.user!.id);
    res.json({ success: true, data: cards });
  } catch (error) {
    next(error);
  }
}
