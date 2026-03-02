import { query, withTransaction } from '../database/pool';
import { AppError } from '../middleware/errorHandler';
import * as walletService from './walletService';
import * as notificationService from './notificationService';
import crypto from 'crypto';

/**
 * Generate a unique 12-character gift card code: XXXX-XXXX-XXXX
 */
function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I,L,O,0,1 to avoid confusion
  let code = '';
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

/**
 * Purchase a gift card. Debits the buyer's wallet and creates a gift card record.
 */
export async function purchaseGiftCard(
  buyerId: string,
  amount: number,
  currency: 'HTG' | 'USD',
  recipientName?: string,
  message?: string
) {
  if (amount <= 0) throw new AppError('Amount must be positive', 400);

  // Predefined denominations
  const validHTG = [500, 1000, 2000, 5000, 10000];
  const validUSD = [5, 10, 25, 50, 100];
  const valid = currency === 'HTG' ? validHTG : validUSD;
  if (!valid.includes(amount)) {
    throw new AppError(`Invalid gift card amount. Valid: ${valid.join(', ')} ${currency}`, 400);
  }

  return withTransaction(async (client) => {
    // Check buyer's balance
    const balanceField = currency === 'USD' ? 'balance_usd' : 'balance_htg';
    const walletCheck = await client.query(
      `SELECT ${balanceField} as balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [buyerId]
    );
    if (walletCheck.rows.length === 0) throw new AppError('Wallet not found', 404);
    if (parseFloat(walletCheck.rows[0].balance) < amount) {
      throw new AppError('Insufficient balance to purchase gift card', 400, 'INSUFFICIENT_BALANCE');
    }

    // Debit buyer's wallet
    await client.query(
      `UPDATE wallets SET ${balanceField} = ${balanceField} - $1 WHERE user_id = $2`,
      [amount, buyerId]
    );

    // Generate unique code
    let code: string;
    let attempts = 0;
    do {
      code = generateGiftCardCode();
      const existing = await client.query('SELECT id FROM gift_cards WHERE code = $1', [code]);
      if (existing.rows.length === 0) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) throw new AppError('Failed to generate unique code', 500);

    // Create gift card
    const result = await client.query(
      `INSERT INTO gift_cards (code, amount, currency, purchased_by, recipient_name, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING id, code, amount, currency, recipient_name, message, purchased_at, expires_at`,
      [code, amount, currency, buyerId, recipientName || null, message || null]
    );

    // Create transaction record for buyer
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, currency, payment_method, status, description, idempotency_key)
       VALUES ($1, 'gift_card_purchase', $2, $3, 'wallet', 'completed', $4, $5)`,
      [buyerId, amount, currency, `Gift card purchase: ${code}`, `giftcard-purchase-${result.rows[0].id}`]
    );

    // Notify buyer
    notificationService.createPlayerNotification(
      buyerId,
      'gift_card',
      'Gift Card Purchased',
      `You purchased a ${amount} ${currency} gift card. Code: ${code}`,
      { code, amount, currency }
    );

    const gc = result.rows[0];
    return {
      id: gc.id,
      code: gc.code,
      amount: parseFloat(gc.amount),
      currency: gc.currency,
      recipientName: gc.recipient_name,
      message: gc.message,
      purchasedAt: gc.purchased_at,
      expiresAt: gc.expires_at,
    };
  });
}

/**
 * Redeem a gift card code. Credits the redeemer's wallet.
 */
export async function redeemGiftCard(userId: string, code: string) {
  const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Re-format: XXXX-XXXX-XXXX
  const formattedCode = normalizedCode.length === 12
    ? `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4, 8)}-${normalizedCode.slice(8, 12)}`
    : code.toUpperCase().trim();

  return withTransaction(async (client) => {
    // Find the gift card
    const gcResult = await client.query(
      `SELECT id, code, amount, currency, status, purchased_by, expires_at
       FROM gift_cards WHERE code = $1 FOR UPDATE`,
      [formattedCode]
    );

    if (gcResult.rows.length === 0) {
      throw new AppError('Invalid gift card code', 404, 'INVALID_CODE');
    }

    const gc = gcResult.rows[0];

    if (gc.status === 'redeemed') {
      throw new AppError('This gift card has already been redeemed', 400, 'ALREADY_REDEEMED');
    }
    if (gc.status === 'expired' || new Date(gc.expires_at) < new Date()) {
      throw new AppError('This gift card has expired', 400, 'EXPIRED');
    }
    if (gc.status === 'cancelled') {
      throw new AppError('This gift card has been cancelled', 400, 'CANCELLED');
    }

    // Cannot redeem own gift card
    if (String(gc.purchased_by) === String(userId)) {
      throw new AppError('You cannot redeem your own gift card', 400, 'SELF_REDEEM');
    }

    const amount = parseFloat(gc.amount);
    const currency = gc.currency as 'HTG' | 'USD';

    // Credit redeemer's wallet
    const balanceField = currency === 'USD' ? 'balance_usd' : 'balance_htg';
    await client.query(
      `UPDATE wallets SET ${balanceField} = ${balanceField} + $1, total_deposited = total_deposited + $1
       WHERE user_id = $2`,
      [amount, userId]
    );

    // Mark gift card as redeemed
    await client.query(
      `UPDATE gift_cards SET status = 'redeemed', redeemed_by = $1, redeemed_at = NOW() WHERE id = $2`,
      [userId, gc.id]
    );

    // Create transaction record for redeemer
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, currency, payment_method, status, description, idempotency_key)
       VALUES ($1, 'gift_card_redeem', $2, $3, 'gift_card', 'completed', $4, $5)`,
      [userId, amount, currency, `Gift card redeemed: ${formattedCode}`, `giftcard-redeem-${gc.id}`]
    );

    // Notify redeemer
    notificationService.createPlayerNotification(
      userId,
      'gift_card',
      'Gift Card Redeemed!',
      `${amount} ${currency} has been added to your wallet from a gift card.`,
      { amount, currency }
    );

    // Notify buyer
    notificationService.createPlayerNotification(
      String(gc.purchased_by),
      'gift_card',
      'Gift Card Redeemed',
      `Your gift card (${formattedCode}) has been redeemed by someone.`,
      { code: formattedCode }
    );

    return {
      amount,
      currency,
      message: `${amount} ${currency} has been added to your wallet!`,
    };
  });
}

/**
 * Get gift cards purchased by a user.
 */
export async function getMyGiftCards(userId: string) {
  const result = await query(
    `SELECT id, code, amount, currency, status, recipient_name, message,
            purchased_at, redeemed_at, expires_at
     FROM gift_cards WHERE purchased_by = $1
     ORDER BY purchased_at DESC`,
    [userId]
  );

  return result.rows.map((r) => ({
    id: r.id,
    code: r.code,
    amount: parseFloat(r.amount),
    currency: r.currency,
    status: r.status,
    recipientName: r.recipient_name,
    message: r.message,
    purchasedAt: r.purchased_at,
    redeemedAt: r.redeemed_at,
    expiresAt: r.expires_at,
  }));
}
