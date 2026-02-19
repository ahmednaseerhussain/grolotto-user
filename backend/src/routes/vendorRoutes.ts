import { Router } from 'express';
import * as ctrl from '../controllers/vendorController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { vendorRegistrationSchema, drawSettingsSchema } from '../validators/schemas';

const router = Router();

// Public
router.get('/', ctrl.getActiveVendors);
router.get('/me', authenticate, authorize('vendor'), ctrl.getMyVendorProfile);
router.get('/me/stats', authenticate, authorize('vendor'), ctrl.getMyVendorStats);
router.get('/me/history', authenticate, authorize('vendor'), ctrl.getPlayHistory);
router.get('/:id', ctrl.getVendorById);
router.get('/:id/reviews', ctrl.getReviews);

// Authenticated
router.post('/register', authenticate, validate(vendorRegistrationSchema), ctrl.registerVendor);
router.put('/draws/:drawState', authenticate, authorize('vendor'), validate(drawSettingsSchema), ctrl.updateDrawSettings);

// Number limits management
router.get('/me/number-limits', authenticate, authorize('vendor'), ctrl.getNumberLimits);
router.post('/me/number-limits', authenticate, authorize('vendor'), ctrl.createNumberLimit);
router.put('/me/number-limits/:limitId', authenticate, authorize('vendor'), ctrl.updateNumberLimit);
router.delete('/me/number-limits/:limitId', authenticate, authorize('vendor'), ctrl.deleteNumberLimit);

export default router;
