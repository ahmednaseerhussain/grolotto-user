import { Request, Response, NextFunction } from 'express';
import * as walletService from '../services/walletService';
import * as notificationService from '../services/notificationService';
import { v4 as uuidv4 } from 'uuid';

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

export async function requestWithdrawal(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount, currency, method, bankName, accountHolderName, accountNumber, routingNumber, notes, moncashPhone, cashappTag, paypalEmail, zelleEmail } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }
    if (!currency || !['USD', 'HTG'].includes(currency)) {
      return res.status(400).json({ message: 'Invalid currency' });
    }

    const paymentMethod = method || 'bank_transfer';

    if (paymentMethod === 'moncash') {
      if (!moncashPhone || !/^\+?[0-9]{8,15}$/.test(moncashPhone.replace(/[\s-]/g, ''))) {
        return res.status(400).json({ message: 'Valid MonCash phone number is required' });
      }
    } else if (paymentMethod === 'cashapp') {
      if (!cashappTag || cashappTag.trim().length < 2) {
        return res.status(400).json({ message: 'Valid Cash App $cashtag is required' });
      }
    } else if (paymentMethod === 'paypal') {
      if (!paypalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) {
        return res.status(400).json({ message: 'Valid PayPal email address is required' });
      }
    } else if (paymentMethod === 'zelle') {
      if (!zelleEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(zelleEmail)) {
        return res.status(400).json({ message: 'Valid Zelle email address is required' });
      }
    } else {
      if (!bankName || !accountHolderName || !accountNumber) {
        return res.status(400).json({ message: 'Bank details are required' });
      }
    }

    const minAmount = currency === 'HTG' ? 500 : 5;
    if (amount < minAmount) {
      return res.status(400).json({ message: `Minimum withdrawal is ${minAmount} ${currency}` });
    }

    const idempotencyKey = `withdraw_${req.user!.id}_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const description = paymentMethod === 'moncash'
      ? `MonCash withdrawal to ${moncashPhone}`
      : paymentMethod === 'cashapp'
      ? `Cash App withdrawal to ${cashappTag}`
      : paymentMethod === 'paypal'
      ? `PayPal withdrawal to ${paypalEmail}`
      : paymentMethod === 'zelle'
      ? `Zelle withdrawal to ${zelleEmail}`
      : `Bank withdrawal to ${bankName} - ${accountHolderName}`;

    const result = await walletService.debitWallet(
      req.user!.id,
      amount,
      currency as 'USD' | 'HTG',
      idempotencyKey,
      description,
      paymentMethod
    );

    // Store withdrawal details in the transaction metadata
    const metadata = paymentMethod === 'moncash'
      ? { moncashPhone, notes: notes || null }
      : paymentMethod === 'cashapp'
      ? { cashappTag, notes: notes || null }
      : paymentMethod === 'paypal'
      ? { paypalEmail, notes: notes || null }
      : paymentMethod === 'zelle'
      ? { zelleEmail, notes: notes || null }
      : { bankName, accountHolderName, accountNumber, routingNumber: routingNumber || null, notes: notes || null };

    await walletService.updateWithdrawalMetadata(req.user!.id, idempotencyKey, metadata);

    // Notify admins so the bell shows the pending request.
    notificationService.notifyAdmins(
      'withdrawal_request',
      'New withdrawal request',
      `Player requested ${amount} ${currency} via ${paymentMethod}.`,
      { role: 'player', id: req.user!.id },
      { amount, currency, method: paymentMethod }
    ).catch(() => {});

    res.json({ message: 'Withdrawal request submitted', newBalance: result.newBalance });
  } catch (error) {
    next(error);
  }
}

// Admin endpoint to get any player's wallet
export async function getPlayerWalletById(req: Request, res: Response, next: NextFunction) {
  try {
    const { playerId } = req.params;
    const wallet = await walletService.getWallet(playerId);
    res.json(wallet);
  } catch (error) {
    next(error);
  }
}
