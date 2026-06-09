import { Request, Response, NextFunction } from 'express';
import * as landingService from '../services/landingService';
import * as stripeService from '../services/stripeService';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_CURRENCIES = ['USD', 'HTG'];
const VALID_MANUAL_METHODS = ['zelle', 'cashapp'];
const VALID_DELIVERY_METHODS = ['whatsapp', 'email'];

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseAmount(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export async function createContact(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = {
      name: normalizeString(req.body?.name),
      email: normalizeString(req.body?.email),
      subject: normalizeString(req.body?.subject),
      message: normalizeString(req.body?.message),
    };

    if (!payload.name || !payload.subject || !payload.message || !EMAIL_PATTERN.test(payload.email)) {
      return res.status(400).json({ error: 'Name, valid email, subject, and message are required.' });
    }

    const submission = await landingService.createContactSubmission(payload);
    res.status(201).json({ ok: true, submission });
  } catch (error) {
    next(error);
  }
}

export async function createGiftCardOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const customerEmail = normalizeString(req.body?.customerEmail ?? req.body?.email);
    const currency = normalizeString(req.body?.currency).toUpperCase() as 'USD' | 'HTG';
    const paymentMethod = normalizeString(req.body?.paymentMethod).toLowerCase() as 'zelle' | 'cashapp';
    const amount = parseAmount(req.body?.amount);
    const customerName = normalizeString(req.body?.customerName ?? req.body?.fullName);
    const transactionReference = normalizeString(req.body?.transactionReference);
    const deliveryMethod = normalizeString(req.body?.deliveryMethod).toLowerCase() as 'whatsapp' | 'email';
    const deliveryContact = normalizeString(req.body?.deliveryContact);

    if (!EMAIL_PATTERN.test(customerEmail) || !amount || !VALID_CURRENCIES.includes(currency)) {
      return res.status(400).json({ error: 'Valid email, amount, and currency are required.' });
    }

    if (!VALID_MANUAL_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Payment method must be zelle or cashapp.' });
    }

    if (!customerName || !transactionReference || !deliveryContact || !VALID_DELIVERY_METHODS.includes(deliveryMethod)) {
      return res.status(400).json({ error: 'Full name, transaction reference, delivery method, and delivery contact are required.' });
    }

    const order = await landingService.createLandingOrder({
      customerEmail,
      customerName,
      transactionReference,
      deliveryMethod,
      deliveryContact,
      amount,
      currency,
      paymentMethod,
    });

    res.status(201).json({ ok: true, order });
  } catch (error) {
    next(error);
  }
}

export async function createStripeIntent(req: Request, res: Response, next: NextFunction) {
  try {
    const customerEmail = normalizeString(req.body?.customerEmail ?? req.body?.email);
    const customerName = normalizeString(req.body?.customerName ?? req.body?.fullName);
    const currency = normalizeString(req.body?.currency).toUpperCase() as 'USD' | 'HTG';
    const amount = parseAmount(req.body?.amount);

    if (!EMAIL_PATTERN.test(customerEmail) || !amount || !VALID_CURRENCIES.includes(currency)) {
      return res.status(400).json({ error: 'Valid email, amount, and currency are required.' });
    }

    if (!customerName) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const result = await landingService.createLandingStripeIntent({
      customerEmail,
      customerName,
      amount,
      currency,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function confirmStripePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const paymentIntentId = normalizeString(req.body?.paymentIntentId);
    if (!paymentIntentId) {
      return res.status(400).json({ error: 'paymentIntentId is required.' });
    }

    const result = await landingService.completeStripeOrder(paymentIntentId);
    if (!result.completed) {
      return res.status(400).json({ error: 'Payment not completed.', status: result.status });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature || Array.isArray(signature)) {
      return res.status(400).json({ error: 'Missing Stripe signature.' });
    }

    const event = stripeService.constructWebhookEvent(req.body as Buffer, signature);

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as any;
      await landingService.completeStripeOrder(intent.id);
    }

    if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
      const intent = event.data.object as any;
      await landingService.failStripeOrder(intent.id, event.type);
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}
