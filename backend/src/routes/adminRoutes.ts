import { Router } from 'express';
import * as ctrl from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

// Dashboard
router.get('/stats', ctrl.getSystemStats);

// User management
router.get('/users', ctrl.getAllUsers);
router.put('/users/:userId/suspend', ctrl.suspendUser);
router.put('/users/:userId/activate', ctrl.activateUser);

// Vendor management
router.put('/vendors/:vendorId/approve', ctrl.approveVendor);
router.put('/vendors/:vendorId/reject', ctrl.rejectVendor);
router.put('/vendors/:vendorId/suspend', ctrl.suspendVendor);
router.put('/vendors/:vendorId/activate', ctrl.activateVendor);

// Settings
router.get('/settings', ctrl.getAppSettings);
router.put('/settings/:key', ctrl.updateAppSetting);

// Payouts
router.get('/payouts/pending', ctrl.getPendingPayouts);
router.post('/payouts/:payoutId/process', ctrl.processVendorPayout);

// Advertisements
router.get('/advertisements', ctrl.getAdvertisements);
router.post('/advertisements', ctrl.createAdvertisement);
router.put('/advertisements/:adId', ctrl.updateAdvertisement);
router.delete('/advertisements/:adId', ctrl.deleteAdvertisement);
router.post('/advertisements/:adId/click', ctrl.recordAdClick);
router.post('/advertisements/:adId/impression', ctrl.recordAdImpression);

export default router;
