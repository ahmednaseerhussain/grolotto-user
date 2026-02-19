import { Request, Response, NextFunction } from 'express';
import * as vendorService from '../services/vendorService';

export async function getActiveVendors(req: Request, res: Response, next: NextFunction) {
  try {
    const vendors = await vendorService.getActiveVendors();
    res.json(vendors);
  } catch (error) {
    next(error);
  }
}

export async function getVendorById(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);
    res.json(vendor);
  } catch (error) {
    next(error);
  }
}

export async function getMyVendorProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    res.json(vendor);
  } catch (error) {
    next(error);
  }
}

export async function getMyVendorStats(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const stats = await vendorService.getVendorStats(vendor.id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

export async function updateDrawSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    await vendorService.updateDrawSettings(vendor.id, req.params.drawState, req.body);
    res.json({ message: 'Draw settings updated' });
  } catch (error) {
    next(error);
  }
}

export async function registerVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await vendorService.registerVendor(req.user!.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPlayHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await vendorService.getVendorPlayHistory(vendor.id, page, limit);
    res.json(history);
  } catch (error) {
    next(error);
  }
}

export async function getReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = req.params.id;
    const reviews = await vendorService.getVendorReviews(vendorId);
    res.json(reviews);
  } catch (error) {
    next(error);
  }
}

export async function getNumberLimits(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const limits = await vendorService.getNumberLimits(vendor.id);
    res.json(limits);
  } catch (error) {
    next(error);
  }
}

export async function createNumberLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const result = await vendorService.createNumberLimit(vendor.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateNumberLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    await vendorService.updateNumberLimit(vendor.id, req.params.limitId, req.body);
    res.json({ message: 'Number limit updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteNumberLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    await vendorService.deleteNumberLimit(vendor.id, req.params.limitId);
    res.json({ message: 'Number limit deleted' });
  } catch (error) {
    next(error);
  }
}

export async function requestPayout(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const { amount, method, currency } = req.body;
    const payout = await vendorService.requestPayout(vendor.id, amount, method || 'moncash', currency || 'HTG');
    res.status(201).json(payout);
  } catch (error) {
    next(error);
  }
}
