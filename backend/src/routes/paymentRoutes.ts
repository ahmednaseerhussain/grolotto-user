import { Router } from 'express';
import * as ctrl from '../controllers/paymentController';
import * as paymentOrderCtrl from '../controllers/paymentOrderController';
import * as stripeService from '../services/stripeService';
import * as paymentOrderService from '../services/paymentOrderService';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPaymentSchema } from '../validators/schemas';

const router = Router();

// Create MonCash payment (returns redirect URL)
router.post('/intent', authenticate, validate(createPaymentSchema), ctrl.createPaymentIntent);

// Verify payment after user returns from MonCash gateway
router.post('/verify', authenticate, ctrl.verifyPayment);

// Check payment status
router.get('/status/:transactionId', authenticate, ctrl.getTransactionStatus);

// === MonCash public callback URLs (no auth) ===
// Return URL: MonCash redirects user here after payment
router.get('/moncash/return', ctrl.moncashReturn);

// Alert URL: MonCash sends payment notification here
router.post('/moncash/notify', ctrl.moncashWebhook);
router.get('/moncash/notify', ctrl.moncashWebhook); // MonCash may also GET

// === PayPal Endpoints ===
router.post('/paypal/create-order', authenticate, ctrl.createPayPalOrder);
router.post('/paypal/capture-order', authenticate, ctrl.capturePayPalOrder);
router.get('/paypal/return', ctrl.paypalReturn); // PayPal redirects user here

// === Payment Orders (Zelle / CashApp / manual) ===
router.post('/orders', authenticate, paymentOrderCtrl.createOrder);
router.get('/orders/mine', authenticate, paymentOrderCtrl.getMyOrders);

// === Stripe — create intent for debit card payment ===
router.post('/stripe/create-intent', authenticate, async (req, res, next) => {
  try {
    const { amount, currency, giftCardAmount } = req.body;
    if (!amount || !currency) {
      return res.status(400).json({ error: 'amount and currency are required' });
    }

    const metadata = { userId: req.user!.id };
    const intent = await stripeService.createPaymentIntent(
      parseFloat(amount),
      currency,
      metadata,
    );

    // Create a pending payment order linked to the Stripe intent
    const order = await paymentOrderService.createPaymentOrder(
      req.user!.id,
      parseFloat(amount),
      currency,
      'stripe',
      giftCardAmount ? parseFloat(giftCardAmount) : undefined,
      intent.paymentIntentId,
    );

    res.json({ ...intent, orderId: order.id });
  } catch (error) {
    next(error);
  }
});

// === Stripe — confirm payment succeeded (client calls after payment) ===
router.post('/stripe/confirm', authenticate, async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ error: 'paymentIntentId is required' });
    }

    const result = await stripeService.verifyPaymentIntent(paymentIntentId);
    if (!result.succeeded) {
      return res.status(400).json({ error: 'Payment not completed', status: result.status });
    }

    // Find and auto-approve the linked payment order
    const { query: dbQuery } = require('../database/pool');
    const orderResult = await dbQuery(
      `SELECT id FROM payment_orders WHERE stripe_payment_intent_id = $1 AND status = 'pending' LIMIT 1`,
      [paymentIntentId],
    );
    if (orderResult.rows.length > 0) {
      await paymentOrderService.approvePaymentOrder(
        orderResult.rows[0].id,
        'system', // auto-approved by Stripe confirmation
        'Auto-approved — Stripe payment confirmed',
      );
    }

    res.json({ success: true, amount: result.amount, currency: result.currency });
  } catch (error) {
    next(error);
  }
});

// === Payment config (public — returns Zelle email, CashApp tag) ===
router.get('/config', async (_req, res, next) => {
  try {
    const { query: dbQuery } = require('../database/pool');
    const result = await dbQuery(
      `SELECT key, value FROM app_settings WHERE key IN ('zelle_email', 'cashapp_tag', 'cashapp_phone')`
    );
    const config: Record<string, string> = {};
    for (const row of result.rows) {
      config[row.key] = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
    }
    res.json(config);
  } catch (error) { next(error); }
});

export default router;
