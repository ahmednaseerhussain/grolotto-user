import { Request, Response, NextFunction } from 'express';
import * as walletService from '../services/walletService';

export async function getWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const wallet = await walletService.getWallet(req.user!.id);
    res.json(wallet);
  } catch (error) {
    next(error);
  }
}

export async function getTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await walletService.getTransactions(req.user!.id, {
      type: req.query.type as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}
