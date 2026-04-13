import { query } from '../database/pool';

export interface PaymentOrder {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  giftCardAmount: number | null;
  status: string;
  stripePaymentIntentId: string | null;
  adminNotes: string | null;
  approvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(r: any): PaymentOrder {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    userEmail: r.user_email,
    amount: parseFloat(r.amount),
    currency: r.currency,
    paymentMethod: r.payment_method,
    giftCardAmount: r.gift_card_amount ? parseFloat(r.gift_card_amount) : null,
    status: r.status,
    stripePaymentIntentId: r.stripe_payment_intent_id,
    adminNotes: r.admin_notes,
    approvedBy: r.approved_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function createPaymentOrder(
  userId: string,
  amount: number,
  currency: string,
  paymentMethod: string,
  giftCardAmount?: number,
  stripePaymentIntentId?: string,
) {
  const result = await query(
    `INSERT INTO payment_orders (user_id, amount, currency, payment_method, gift_card_amount, stripe_payment_intent_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, amount, currency, paymentMethod, giftCardAmount ?? amount, stripePaymentIntentId ?? null],
  );
  return mapRow(result.rows[0]);
}

export async function getPaymentOrders(filters?: { status?: string; userId?: string }) {
  let where = '';
  const vals: any[] = [];
  const conditions: string[] = [];

  if (filters?.status) {
    vals.push(filters.status);
    conditions.push(`po.status = $${vals.length}`);
  }
  if (filters?.userId) {
    vals.push(filters.userId);
    conditions.push(`po.user_id = $${vals.length}`);
  }
  if (conditions.length) where = 'WHERE ' + conditions.join(' AND ');

  const result = await query(
    `SELECT po.*, u.name as user_name, u.email as user_email
     FROM payment_orders po
     LEFT JOIN users u ON u.id = po.user_id
     ${where}
     ORDER BY po.created_at DESC`,
    vals,
  );
  return result.rows.map(mapRow);
}

export async function getPaymentOrderById(id: string) {
  const result = await query(
    `SELECT po.*, u.name as user_name, u.email as user_email
     FROM payment_orders po
     LEFT JOIN users u ON u.id = po.user_id
     WHERE po.id = $1`,
    [id],
  );
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function approvePaymentOrder(orderId: string, adminId: string, notes?: string) {
  // Mark as approved
  const result = await query(
    `UPDATE payment_orders
     SET status = 'approved', approved_by = $2, admin_notes = $3, updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [orderId, adminId, notes ?? null],
  );
  if (result.rows.length === 0) throw new Error('Order not found or already processed');

  const order = mapRow(result.rows[0]);

  // Credit the player's wallet
  const col = order.currency === 'HTG' ? 'balance_htg' : 'balance_usd';
  await query(
    `UPDATE wallets SET ${col} = ${col} + $1, total_deposited = total_deposited + $1 WHERE user_id = $2`,
    [order.giftCardAmount ?? order.amount, order.userId],
  );

  // Record a wallet transaction
  await query(
    `INSERT INTO transactions (user_id, type, amount, currency, status, description)
     VALUES ($1, 'deposit', $2, $3, 'completed', $4)`,
    [
      order.userId,
      order.giftCardAmount ?? order.amount,
      order.currency,
      `Payment via ${order.paymentMethod} — approved by admin`,
    ],
  );

  return order;
}

export async function rejectPaymentOrder(orderId: string, adminId: string, reason?: string) {
  const result = await query(
    `UPDATE payment_orders
     SET status = 'rejected', approved_by = $2, admin_notes = $3, updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [orderId, adminId, reason ?? null],
  );
  if (result.rows.length === 0) throw new Error('Order not found or already processed');
  return mapRow(result.rows[0]);
}
