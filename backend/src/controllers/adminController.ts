import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/adminService';

export async function getSystemStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await adminService.getSystemStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.query.role as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const users = await adminService.getAllUsers(role, page, limit);
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function approveVendor(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.approveVendor(req.params.vendorId);
    res.json({ message: 'Vendor approved' });
  } catch (error) {
    next(error);
  }
}

export async function rejectVendor(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.rejectVendor(req.params.vendorId, req.body.reason || '');
    res.json({ message: 'Vendor rejected' });
  } catch (error) {
    next(error);
  }
}

export async function suspendVendor(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.suspendVendor(req.params.vendorId);
    res.json({ message: 'Vendor suspended' });
  } catch (error) {
    next(error);
  }
}

export async function activateVendor(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.activateVendor(req.params.vendorId);
    res.json({ message: 'Vendor activated' });
  } catch (error) {
    next(error);
  }
}

export async function suspendUser(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.suspendUser(req.params.userId);
    res.json({ message: 'User suspended' });
  } catch (error) {
    next(error);
  }
}

export async function activateUser(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.activateUser(req.params.userId);
    res.json({ message: 'User activated' });
  } catch (error) {
    next(error);
  }
}

export async function getAppSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await adminService.getAppSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
}

export async function updateAppSetting(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.updateAppSetting(req.params.key, req.body.value, req.user!.id);
    res.json({ message: 'Setting updated' });
  } catch (error) {
    next(error);
  }
}

export async function getPendingPayouts(req: Request, res: Response, next: NextFunction) {
  try {
    const payouts = await adminService.getPendingPayouts();
    res.json(payouts);
  } catch (error) {
    next(error);
  }
}

export async function processVendorPayout(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.processVendorPayout(
      req.params.payoutId,
      req.body.action,
      req.user!.id,
      req.body.notes,
      req.body.transferReference
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// Advertisement CRUD
export async function getAdvertisements(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as string;
    const ads = await adminService.getAdvertisements(status);
    res.json(ads);
  } catch (error) {
    next(error);
  }
}

export async function createAdvertisement(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.createAdvertisement(req.body, req.user!.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateAdvertisement(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.updateAdvertisement(req.params.adId, req.body);
    res.json({ message: 'Advertisement updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdvertisement(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.deleteAdvertisement(req.params.adId);
    res.json({ message: 'Advertisement deleted' });
  } catch (error) {
    next(error);
  }
}

export async function recordAdClick(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.recordAdClick(req.params.adId);
    res.json({ message: 'Click recorded' });
  } catch (error) {
    next(error);
  }
}

export async function recordAdImpression(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.recordAdImpression(req.params.adId);
    res.json({ message: 'Impression recorded' });
  } catch (error) {
    next(error);
  }
}
