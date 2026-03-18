import { Router } from 'express';
import * as ctrl from '../controllers/vendorController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateUUIDParams } from '../middleware/validate';
import { vendorRegistrationSchema, drawSettingsSchema } from '../validators/schemas';

const router = Router();

// Public
router.get('/', ctrl.getActiveVendors);
router.get('/me', authenticate, authorize('vendor'), ctrl.getMyVendorProfile);
router.get('/me/stats', authenticate, authorize('vendor'), ctrl.getMyVendorStats);
router.get('/me/history', authenticate, authorize('vendor'), ctrl.getPlayHistory);
router.get('/:id', validateUUIDParams('id'), ctrl.getVendorById);
router.get('/:id/reviews', validateUUIDParams('id'), ctrl.getReviews);

// Authenticated
router.post('/register', authenticate, validate(vendorRegistrationSchema), ctrl.registerVendor);
router.put('/draws/:drawState', authenticate, authorize('vendor'), validate(drawSettingsSchema), ctrl.updateDrawSettings);

// Number limits management
router.get('/me/number-limits', authenticate, authorize('vendor'), ctrl.getNumberLimits);
router.post('/me/number-limits', authenticate, authorize('vendor'), ctrl.createNumberLimit);
router.put('/me/number-limits/:limitId', authenticate, authorize('vendor'), validateUUIDParams('limitId'), ctrl.updateNumberLimit);
router.delete('/me/number-limits/:limitId', authenticate, authorize('vendor'), validateUUIDParams('limitId'), ctrl.deleteNumberLimit);

// Payout requests
router.post('/me/payouts', authenticate, authorize('vendor'), ctrl.requestPayout);

// Payout multiplier management
router.get('/me/payout-multipliers', authenticate, authorize('vendor'), ctrl.getPayoutMultipliers);
router.put('/me/payout-multipliers', authenticate, authorize('vendor'), ctrl.updatePayoutMultipliers);

// Public: vendor payout rates (for player Results popup)
router.get('/:id/payout-multipliers', validateUUIDParams('id'), ctrl.getPublicPayoutMultipliers);

// Vendor lottery rounds (read-only — admin publishes results globally)
router.get('/me/rounds', authenticate, authorize('vendor'), ctrl.getMyRounds);
router.get('/me/rounds/:roundId', authenticate, authorize('vendor'), validateUUIDParams('roundId'), ctrl.getMyRoundDetails);

export default router;
