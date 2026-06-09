import crypto from 'crypto';
import { query } from '../database/pool';
import * as stripeService from './stripeService';

type ContactStatus = 'new' | 'read' | 'archived';
type LandingPaymentMethod = 'zelle' | 'cashapp' | 'stripe';
type LandingOrderStatus = 'pending' | 'completed' | 'failed' | 'rejected';

export type ContactInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type LandingOrderInput = {
  customerEmail: string;
  customerName?: string;
  transactionReference?: string;
  deliveryMethod?: 'whatsapp' | 'email';
  deliveryContact?: string;
  amount: number;
  currency: 'USD' | 'HTG';
  paymentMethod: LandingPaymentMethod;
};

function mapContact(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrder(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    customerEmail: row.customer_email || row.user_email || null,
    customerName: row.customer_name || null,
    transactionReference: row.transaction_reference || null,
    deliveryMethod: row.delivery_method || null,
    deliveryContact: row.delivery_contact || null,
    userName: row.user_name || null,
    amount: Number(row.amount),
    currency: row.currency,
    paymentMethod: row.payment_method,
    giftCardAmount: row.gift_card_amount ? Number(row.gift_card_amount) : null,
    status: row.status,
    stripePaymentIntentId: row.stripe_payment_intent_id || null,
    adminNotes: row.admin_notes || null,
    approvedBy: row.approved_by || null,
    source: row.source || 'app',
    giftCardCode: row.gift_card_code || null,
    giftCardPin: row.gift_card_pin || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateGiftCardCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(16);
  for (let index = 0; index < 16; index += 1) {
    code += chars[bytes[index] % chars.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`;
}

async function ensureGiftCardForOrder(orderId: string) {
  const existing = await query(
    `SELECT code, pin_code FROM gift_cards WHERE payment_order_id = $1 LIMIT 1`,
    [orderId],
  );
  if (existing.rows.length > 0) {
    return {
      code: existing.rows[0].code,
      pin: existing.rows[0].pin_code,
    };
  }

  const orderResult = await query(
    `SELECT id, customer_email, gift_card_amount, amount, currency
     FROM payment_orders
     WHERE id = $1`,
    [orderId],
  );
  if (orderResult.rows.length === 0) return null;

  const order = orderResult.rows[0];
  let code = generateGiftCardCode();
  for (let attempts = 0; attempts < 5; attempts += 1) {
    try {
      const created = await query(
        `INSERT INTO gift_cards (code, pin_code, amount, currency, status, purchased_by, purchaser_email, payment_order_id)
         VALUES ($1, $1, $2, $3, 'active', NULL, $4, $5)
         RETURNING code, pin_code`,
        [
          code,
          order.gift_card_amount ?? order.amount,
          order.currency,
          order.customer_email,
          order.id,
        ],
      );
      return {
        code: created.rows[0].code,
        pin: created.rows[0].pin_code,
      };
    } catch (error: any) {
      if (error?.code !== '23505') throw error;
      code = generateGiftCardCode();
    }
  }

  throw new Error('Unable to generate a unique gift card code');
}

export async function createContactSubmission(input: ContactInput) {
  const result = await query(
    `INSERT INTO contact_submissions (name, email, subject, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      input.name.trim(),
      normalizeEmail(input.email),
      input.subject.trim(),
      input.message.trim(),
    ],
  );
  return mapContact(result.rows[0]);
}

export async function listContactSubmissions(status?: string) {
  const values: any[] = [];
  const where = status ? 'WHERE status = $1' : '';
  if (status) values.push(status);

  const result = await query(
    `SELECT * FROM contact_submissions
     ${where}
     ORDER BY created_at DESC`,
    values,
  );
  return result.rows.map(mapContact);
}

export async function getContactSubmission(id: string) {
  const result = await query('SELECT * FROM contact_submissions WHERE id = $1', [id]);
  return result.rows[0] ? mapContact(result.rows[0]) : null;
}

export async function updateContactSubmission(id: string, status: ContactStatus) {
  const result = await query(
    `UPDATE contact_submissions
     SET status = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status],
  );
  return result.rows[0] ? mapContact(result.rows[0]) : null;
}

export async function deleteContactSubmission(id: string) {
  const result = await query(
    `DELETE FROM contact_submissions
     WHERE id = $1
     RETURNING id`,
    [id],
  );
  return result.rows.length > 0;
}

export async function createLandingOrder(input: LandingOrderInput, stripePaymentIntentId?: string) {
  const result = await query(
    `INSERT INTO payment_orders
       (user_id, customer_email, customer_name, transaction_reference, delivery_method, delivery_contact,
        amount, currency, payment_method, gift_card_amount, stripe_payment_intent_id, source)
     VALUES
       (NULL, $1, $2, $3, $4, $5, $6, $7, $8, $6, $9, 'landing')
     RETURNING *`,
    [
      normalizeEmail(input.customerEmail),
      input.customerName?.trim() || null,
      input.transactionReference?.trim() || null,
      input.deliveryMethod || null,
      input.deliveryContact?.trim() || null,
      input.amount,
      input.currency,
      input.paymentMethod,
      stripePaymentIntentId ?? null,
    ],
  );
  return mapOrder(result.rows[0]);
}

export async function createLandingStripeIntent(input: Omit<LandingOrderInput, 'paymentMethod'>) {
  const pendingOrder = await createLandingOrder({ ...input, paymentMethod: 'stripe' });
  const intent = await stripeService.createPaymentIntent(input.amount, input.currency, {
    source: 'landing',
    orderId: pendingOrder.id,
    customerEmail: normalizeEmail(input.customerEmail),
    customerName: input.customerName?.trim() || '',
    giftCardAmount: String(input.amount),
    displayCurrency: input.currency,
    productName: `GroLotto ${input.currency} ${input.amount} Gift Card`,
  }, {
    description: `GroLotto ${input.currency} ${input.amount} Gift Card`,
    receiptEmail: normalizeEmail(input.customerEmail),
  });

  const updated = await query(
    `UPDATE payment_orders
     SET stripe_payment_intent_id = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [pendingOrder.id, intent.paymentIntentId],
  );

  return {
    order: mapOrder(updated.rows[0]),
    paymentIntentId: intent.paymentIntentId,
    clientSecret: intent.clientSecret,
  };
}

export async function completeStripeOrder(paymentIntentId: string) {
  const verification = await stripeService.verifyPaymentIntent(paymentIntentId);
  if (!verification.succeeded) {
    await query(
      `UPDATE payment_orders
       SET status = 'failed', admin_notes = $2, updated_at = NOW()
       WHERE stripe_payment_intent_id = $1 AND status = 'pending'`,
      [paymentIntentId, `Stripe status: ${verification.status}`],
    );
    return { completed: false, status: verification.status };
  }

  const result = await query(
    `UPDATE payment_orders
     SET status = 'completed', admin_notes = COALESCE(admin_notes, 'Auto-completed by Stripe'), updated_at = NOW()
     WHERE stripe_payment_intent_id = $1 AND status IN ('pending', 'failed')
     RETURNING *`,
    [paymentIntentId],
  );

  if (result.rows.length === 0) {
    const existing = await query(
      `SELECT * FROM payment_orders WHERE stripe_payment_intent_id = $1 LIMIT 1`,
      [paymentIntentId],
    );
    return {
      completed: existing.rows[0]?.status === 'completed',
      status: existing.rows[0]?.status || verification.status,
      order: existing.rows[0] ? mapOrder(existing.rows[0]) : null,
    };
  }

  const giftCard = await ensureGiftCardForOrder(result.rows[0].id);
  return {
    completed: true,
    status: 'completed',
    order: mapOrder({
      ...result.rows[0],
      gift_card_code: giftCard?.code,
      gift_card_pin: giftCard?.pin,
    }),
  };
}

export async function failStripeOrder(paymentIntentId: string, reason?: string) {
  const result = await query(
    `UPDATE payment_orders
     SET status = 'failed', admin_notes = $2, updated_at = NOW()
     WHERE stripe_payment_intent_id = $1 AND status = 'pending'
     RETURNING *`,
    [paymentIntentId, reason ?? 'Stripe payment failed'],
  );

  return result.rows[0] ? mapOrder(result.rows[0]) : null;
}

export async function listLandingOrders(filters?: { status?: string; currency?: string; paymentMethod?: string }) {
  const values: any[] = [];
  const conditions = [`po.source = 'landing'`];

  if (filters?.status) {
    values.push(filters.status);
    conditions.push(`po.status = $${values.length}`);
  }
  if (filters?.currency) {
    values.push(filters.currency);
    conditions.push(`po.currency = $${values.length}`);
  }
  if (filters?.paymentMethod) {
    values.push(filters.paymentMethod);
    conditions.push(`po.payment_method = $${values.length}`);
  }

  const result = await query(
    `SELECT po.*, u.name as user_name, u.email as user_email,
            gc.code as gift_card_code, gc.pin_code as gift_card_pin
     FROM payment_orders po
     LEFT JOIN users u ON u.id = po.user_id
     LEFT JOIN gift_cards gc ON gc.payment_order_id = po.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY po.created_at DESC`,
    values,
  );
  return result.rows.map(mapOrder);
}

export async function getLandingOrder(id: string) {
  const result = await query(
    `SELECT po.*, u.name as user_name, u.email as user_email,
            gc.code as gift_card_code, gc.pin_code as gift_card_pin
     FROM payment_orders po
     LEFT JOIN users u ON u.id = po.user_id
     LEFT JOIN gift_cards gc ON gc.payment_order_id = po.id
     WHERE po.id = $1 AND po.source = 'landing'`,
    [id],
  );
  return result.rows[0] ? mapOrder(result.rows[0]) : null;
}

export async function updateLandingOrderStatus(id: string, status: LandingOrderStatus, notes?: string) {
  const result = await query(
    `UPDATE payment_orders
     SET status = $2, admin_notes = $3, updated_at = NOW()
     WHERE id = $1 AND source = 'landing'
     RETURNING *`,
    [id, status, notes ?? null],
  );

  if (result.rows.length === 0) return null;

  let giftCard = null;
  if (status === 'completed') {
    giftCard = await ensureGiftCardForOrder(id);
  }

  return mapOrder({
    ...result.rows[0],
    gift_card_code: giftCard?.code,
    gift_card_pin: giftCard?.pin,
  });
}

export async function deleteLandingOrder(id: string) {
  await query(
    `DELETE FROM gift_cards
     WHERE payment_order_id = $1
       AND status != 'redeemed'`,
    [id],
  );

  const result = await query(
    `DELETE FROM payment_orders
     WHERE id = $1
       AND source = 'landing'
     RETURNING id`,
    [id],
  );

  return result.rows.length > 0;
}

export async function getLandingDashboardSummary() {
  const result = await query(`
    SELECT
      (SELECT COUNT(*)::INT FROM contact_submissions) AS total_contacts,
      (SELECT COUNT(*)::INT FROM contact_submissions WHERE status = 'new') AS new_contacts,
      (SELECT COUNT(*)::INT FROM payment_orders WHERE source = 'landing') AS total_orders,
      (SELECT COUNT(*)::INT FROM payment_orders WHERE source = 'landing' AND status = 'pending') AS pending_orders,
      (SELECT COUNT(*)::INT FROM payment_orders WHERE source = 'landing' AND status = 'completed') AS completed_orders,
      COALESCE((SELECT SUM(amount)::NUMERIC FROM payment_orders WHERE source = 'landing' AND status = 'completed' AND currency = 'USD'), 0) AS usd_sales,
      COALESCE((SELECT SUM(amount)::NUMERIC FROM payment_orders WHERE source = 'landing' AND status = 'completed' AND currency = 'HTG'), 0) AS htg_sales
  `);

  const row = result.rows[0];
  return {
    totalContacts: Number(row.total_contacts),
    newContacts: Number(row.new_contacts),
    totalOrders: Number(row.total_orders),
    pendingOrders: Number(row.pending_orders),
    completedOrders: Number(row.completed_orders),
    usdSales: Number(row.usd_sales),
    htgSales: Number(row.htg_sales),
  };
}
