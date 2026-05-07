import { Request, Response, NextFunction } from 'express';
import * as vendorService from '../services/vendorService';
import * as lotteryService from '../services/lotteryService';
import * as notificationService from '../services/notificationService';
import * as mustSendService from '../services/mustSendService';

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
    const period = (req.query.period as string) || 'today';
    const stats = await vendorService.getVendorStats(vendor.id, period);
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

export async function getPlayHistorySummary(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const filters = {
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      drawState: req.query.drawState as string,
      drawTime: req.query.drawTime as string,
    };
    const summary = await vendorService.getVendorPlayHistorySummary(vendor.id, filters);
    res.json(summary);
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
    const { amount, method, currency, bankName, bankAccountName, bankAccountNumber, bankRoutingNumber, moncashPhone, zelleEmail, zellePhone, cashappTag, paypalEmail } = req.body;
    const payout = await vendorService.requestPayout(
      vendor.id, amount, method || 'moncash', currency || 'HTG',
      { bankName, bankAccountName, bankAccountNumber, bankRoutingNumber, moncashPhone, zelleEmail, zellePhone, cashappTag, paypalEmail }
    );
    notificationService.notifyAdmins(
      'vendor_payout_request',
      'New vendor payout request',
      `Vendor requested ${amount} ${currency || 'HTG'} via ${method || 'moncash'}.`,
      { role: 'vendor', id: vendor.id },
      { amount, currency: currency || 'HTG', method: method || 'moncash', payoutId: (payout as any)?.id }
    ).catch(() => {});
    res.status(201).json(payout);
  } catch (error) {
    next(error);
  }
}

export async function getMyPayouts(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const limit = parseInt(req.query.limit as string) || 50;
    const payouts = await vendorService.getMyPayouts(vendor.id, limit);
    res.json({ payouts });
  } catch (error) {
    next(error);
  }
}

export async function getMyMustSend(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const records = await mustSendService.listForVendor(vendor.id);
    res.json({ records });
  } catch (error) {
    next(error);
  }
}

export async function submitMustSendProof(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const { proofUrl, notes } = req.body || {};
    const record = await mustSendService.markSubmitted(vendor.id, req.params.id, proofUrl, notes);
    res.json(record);
  } catch (error) {
    next(error);
  }
}

// ─── Vendor Lottery Round Management ─────────────────────

export async function getMyRounds(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const rounds = await lotteryService.getVendorRounds(vendor.id, {
      status: req.query.status as string,
      date: req.query.date as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    });
    res.json(rounds);
  } catch (error) {
    next(error);
  }
}

export async function getMyRoundDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const details = await lotteryService.getVendorRoundDetails(vendor.id, req.params.roundId);
    res.json(details);
  } catch (error) {
    next(error);
  }
}

// NOTE: publishMyResults and generateRandomNumbers were REMOVED.
// Vendors no longer publish results — only admin publishes globally.

export async function getPayoutMultipliers(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const multipliers = await vendorService.getPayoutMultipliers(vendor.id);
    res.json(multipliers);
  } catch (error) {
    next(error);
  }
}

export async function updatePayoutMultipliers(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const result = await vendorService.updatePayoutMultipliers(vendor.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPublicPayoutMultipliers(req: Request, res: Response, next: NextFunction) {
  try {
    const multipliers = await vendorService.getPayoutMultipliers(req.params.id);
    res.json(multipliers);
  } catch (error) {
    next(error);
  }
}

// ─── Draw Schedules ────────────────────────────────────────

export async function getDrawSchedules(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const schedules = await vendorService.getDrawSchedules(vendor.id);
    res.json(schedules);
  } catch (error) {
    next(error);
  }
}

export async function upsertDrawSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    const { drawState, drawTime, openTime, closeTime } = req.body;
    const schedule = await vendorService.upsertDrawSchedule(vendor.id, drawState, drawTime, openTime, closeTime);
    res.json(schedule);
  } catch (error) {
    next(error);
  }
}

export async function deleteDrawSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user!.id);
    await vendorService.deleteDrawSchedule(vendor.id, req.params.scheduleId);
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    next(error);
  }
}

export async function checkDrawScheduleStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = req.params.vendorId;
    const drawState = (req.query.drawState as string) || (req.query.state as string);
    const drawTime = req.query.drawTime as string;
    if (!drawState || !drawTime) {
      return res.status(400).json({ error: 'drawState and drawTime are required' });
    }
    const result = await vendorService.checkDrawSchedule(vendorId, drawState, drawTime);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPublicSchedules(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = req.params.vendorId;
    const schedules = await vendorService.getDrawSchedules(vendorId);
    res.json({ schedules });
  } catch (error) {
    next(error);
  }
}
