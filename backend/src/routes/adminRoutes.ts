import { Router } from 'express';
import * as ctrl from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

// Dashboard
router.get('/stats', ctrl.getSystemStats);

// User management — specific paths before parameterized
router.get('/users', ctrl.getAllUsers);
router.post('/users', ctrl.createAdminUser);
router.put('/users/:userId/suspend', ctrl.suspendUser);
router.put('/users/:userId/activate', ctrl.activateUser);
router.put('/users/:userId', ctrl.updateAdminUser);
router.delete('/users/:userId', ctrl.deleteAdminUser);

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

// Draw Configs
router.get('/draws', ctrl.getDrawConfigs);
router.post('/draws', ctrl.createDrawConfig);
router.put('/draws/:id', ctrl.updateDrawConfig);
router.delete('/draws/:id', ctrl.deleteDrawConfig);

// Gift Cards
router.post('/gift-cards/batch', ctrl.generateGiftCardBatch);
router.post('/gift-cards/redeem', ctrl.redeemGiftCard);
router.get('/gift-cards/batches', ctrl.getGiftCardBatches);
router.get('/gift-cards', ctrl.getGiftCards);

// Notifications
router.post('/notifications/broadcast', ctrl.broadcastNotification);

// Transactions
router.get('/transactions', ctrl.getTransactions);

// Lottery rounds
router.post('/rounds', ctrl.createLotteryRound);

export default router;
