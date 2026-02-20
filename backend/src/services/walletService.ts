import { query, withTransaction } from '../database/pool';
import { AppError } from '../middleware/errorHandler';
import * as notificationService from './notificationService';
import * as rewardService from './rewardService';

/**
 * Get wallet balance for a user.
 */
export async function getWallet(userId: string) {
  const result = await query(
    `SELECT w.balance_usd, w.balance_htg, w.total_deposited, w.total_withdrawn, w.total_won, w.total_bet
     FROM wallets w WHERE w.user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Wallet not found', 404);
  }

  const w = result.rows[0];
  return {
    balanceUsd: parseFloat(w.balance_usd),
    balanceHtg: parseFloat(w.balance_htg),
    totalDeposited: parseFloat(w.total_deposited),
    totalWithdrawn: parseFloat(w.total_withdrawn),
    totalWon: parseFloat(w.total_won),
    totalBet: parseFloat(w.total_bet),
  };
}

/**
 * Credit wallet (used after payment confirmation).
 * Uses idempotency key to prevent double credits.
 */
export async function creditWallet(
  userId: string,
  amount: number,
  currency: 'USD' | 'HTG',
  idempotencyKey: string,
  description: string,
  paymentMethod: string,
  moncashTransactionId?: string
) {
  return withTransaction(async (client) => {
    // Check idempotency - prevent double credit
    const existingTx = await client.query(
      'SELECT id FROM transactions WHERE idempotency_key = $1',
      [idempotencyKey]
    );

    if (existingTx.rows.length > 0) {
      throw new AppError('Transaction already processed', 409, 'DUPLICATE_TRANSACTION');
    }

    // Credit wallet
    const balanceField = currency === 'USD' ? 'balance_usd' : 'balance_htg';
    const walletResult = await client.query(
      `UPDATE wallets SET ${balanceField} = ${balanceField} + $1, total_deposited = total_deposited + $1
       WHERE user_id = $2
       RETURNING ${balanceField} as new_balance`,
      [amount, userId]
    );

    if (walletResult.rows.length === 0) {
      throw new AppError('Wallet not found', 404);
    }

    // Create transaction record
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, currency, payment_method, status, description, moncash_transaction_id, idempotency_key)
       VALUES ($1, 'deposit', $2, $3, $4, 'completed', $5, $6, $7)`,
      [userId, amount, currency, paymentMethod, description, moncashTransactionId || null, idempotencyKey]
    );

    // Send deposit notification and check first-deposit bonus (non-blocking)
    notificationService.createPlayerNotification(
      userId,
      'deposit',
      'Deposit Received',
      `Your deposit of ${amount.toFixed(2)} ${currency} has been credited to your wallet.`,
      { amount, currency }
    );
    rewardService.createFirstDepositBonus(userId, amount);

    return {
      newBalance: parseFloat(walletResult.rows[0].new_balance),
    };
  });
}

/**
 * Debit wallet (for withdrawals).
 */
export async function debitWallet(
  userId: string,
  amount: number,
  currency: 'USD' | 'HTG',
  idempotencyKey: string,
  description: string,
  payoutMethod: string
) {
  return withTransaction(async (client) => {
    const existingTx = await client.query(
      'SELECT id FROM transactions WHERE idempotency_key = $1',
      [idempotencyKey]
    );

    if (existingTx.rows.length > 0) {
      throw new AppError('Transaction already processed', 409, 'DUPLICATE_TRANSACTION');
    }

    const balanceField = currency === 'USD' ? 'balance_usd' : 'balance_htg';
    const walletResult = await client.query(
      `UPDATE wallets SET ${balanceField} = ${balanceField} - $1, total_withdrawn = total_withdrawn + $1
       WHERE user_id = $2 AND ${balanceField} >= $1
       RETURNING ${balanceField} as new_balance`,
      [amount, userId]
    );

    if (walletResult.rows.length === 0) {
      throw new AppError('Insufficient balance', 400, 'INSUFFICIENT_BALANCE');
    }

    await client.query(
      `INSERT INTO transactions (user_id, type, amount, currency, payment_method, status, description, idempotency_key)
       VALUES ($1, 'withdrawal', $2, $3, $4, 'pending', $5, $6)`,
      [userId, amount, currency, payoutMethod, description, idempotencyKey]
    );

    return {
      newBalance: parseFloat(walletResult.rows[0].new_balance),
    };
  });
}

/**
 * Get user's transaction history.
 */
export async function getTransactions(
  userId: string,
  filters?: { type?: string; page?: number; limit?: number }
) {
  const conditions = ['user_id = $1'];
  const values: any[] = [userId];
  let paramIndex = 2;

  if (filters?.type) {
    conditions.push(`type = $${paramIndex++}`);
    values.push(filters.type);
  }

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const offset = (page - 1) * limit;

  const countResult = await query(
    `SELECT COUNT(*) FROM transactions WHERE ${conditions.join(' AND ')}`,
    values
  );

  const result = await query(
    `SELECT id, type, amount, currency, payment_method, status, description,
            ticket_id, vendor_id, moncash_transaction_id, created_at
     FROM transactions
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  return {
    transactions: result.rows.map((r) => ({
      id: r.id,
      type: r.type,
      amount: parseFloat(r.amount),
      currency: r.currency,
      paymentMethod: r.payment_method,
      status: r.status,
      description: r.description,
      ticketId: r.ticket_id,
      vendorId: r.vendor_id,
      createdAt: r.created_at,
    })),
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
  };
}
