import { Request, Response, NextFunction } from 'express';
import * as landingService from '../services/landingService';

const CONTACT_STATUSES = ['new', 'read', 'archived'] as const;
const ORDER_STATUSES = ['pending', 'completed', 'failed', 'rejected'] as const;

export async function getDashboardSummary(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await landingService.getLandingDashboardSummary());
  } catch (error) {
    next(error);
  }
}

export async function listContacts(req: Request, res: Response, next: NextFunction) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(await landingService.listContactSubmissions(status));
  } catch (error) {
    next(error);
  }
}

export async function getContact(req: Request, res: Response, next: NextFunction) {
  try {
    const contact = await landingService.getContactSubmission(req.params.id);
    if (!contact) return res.status(404).json({ error: 'Contact submission not found' });
    res.json(contact);
  } catch (error) {
    next(error);
  }
}

export async function updateContact(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.body?.status;
    if (!CONTACT_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${CONTACT_STATUSES.join(', ')}` });
    }

    const contact = await landingService.updateContactSubmission(req.params.id, status);
    if (!contact) return res.status(404).json({ error: 'Contact submission not found' });
    res.json(contact);
  } catch (error) {
    next(error);
  }
}

export async function deleteContact(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = await landingService.deleteContactSubmission(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Contact submission not found' });
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
}

export async function listGiftCardOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const currency = typeof req.query.currency === 'string' ? req.query.currency.toUpperCase() : undefined;
    const paymentMethod = typeof req.query.paymentMethod === 'string' ? req.query.paymentMethod : undefined;
    res.json(await landingService.listLandingOrders({ status, currency, paymentMethod }));
  } catch (error) {
    next(error);
  }
}

export async function getGiftCardOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await landingService.getLandingOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Gift card order not found' });
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function updateGiftCardOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.body?.status;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${ORDER_STATUSES.join(', ')}` });
    }

    const notes = typeof req.body?.notes === 'string' ? req.body.notes : undefined;
    const order = await landingService.updateLandingOrderStatus(req.params.id, status, notes);
    if (!order) return res.status(404).json({ error: 'Gift card order not found' });
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function deleteGiftCardOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = await landingService.deleteLandingOrder(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Gift card order not found' });
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
}
