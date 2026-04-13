/**
 * Stripe integration for debit-card gift card purchases.
 *
 * Required .env keys:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET   (optional — for automated verification)
 */
import Stripe from 'stripe';

let stripe: InstanceType<typeof Stripe> | null = null;

function getStripe(): InstanceType<typeof Stripe> {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not set in environment');
    stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' as any });
  }
  return stripe;
}

/**
 * Create a PaymentIntent for the given amount.
 * Returns the client_secret so the frontend can confirm the payment.
 */
export async function createPaymentIntent(
  amount: number,
  currency: string,
  metadata?: Record<string, string>,
) {
  const s = getStripe();
  const intent = await s.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe uses cents
    currency: currency.toLowerCase(),
    metadata: metadata ?? {},
    automatic_payment_methods: { enabled: true },
  });
  return {
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
  };
}

/**
 * Verify a PaymentIntent succeeded (used after webhook or manual check).
 */
export async function verifyPaymentIntent(paymentIntentId: string): Promise<{
  status: string;
  succeeded: boolean;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}> {
  const s = getStripe();
  const intent = await s.paymentIntents.retrieve(paymentIntentId);
  return {
    status: intent.status,
    succeeded: intent.status === 'succeeded',
    amount: intent.amount / 100,
    currency: intent.currency.toUpperCase(),
    metadata: intent.metadata,
  };
}

/**
 * Construct and verify a Stripe webhook event (for automated fulfilment).
 */
export function constructWebhookEvent(body: Buffer, sig: string): ReturnType<InstanceType<typeof Stripe>['webhooks']['constructEvent']> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not set');
  const s = getStripe();
  return s.webhooks.constructEvent(body, sig, secret);
}
