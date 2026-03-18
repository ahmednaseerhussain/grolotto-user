import { Router } from 'express';
import * as ctrl from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';
import { validateUUIDParams } from '../middleware/validate';

const router = Router();

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

// Dashboard
router.get('/stats', ctrl.getSystemStats);

// User management — specific paths before parameterized
router.get('/users', ctrl.getAllUsers);
router.post('/users', ctrl.createAdminUser);
router.put('/users/:userId/suspend', validateUUIDParams('userId'), ctrl.suspendUser);
router.put('/users/:userId/activate', validateUUIDParams('userId'), ctrl.activateUser);
router.put('/users/:userId', validateUUIDParams('userId'), ctrl.updateAdminUser);
router.delete('/users/:userId', validateUUIDParams('userId'), ctrl.deleteAdminUser);

// Vendor management
router.put('/vendors/:vendorId/approve', validateUUIDParams('vendorId'), ctrl.approveVendor);
router.put('/vendors/:vendorId/reject', validateUUIDParams('vendorId'), ctrl.rejectVendor);
router.put('/vendors/:vendorId/suspend', validateUUIDParams('vendorId'), ctrl.suspendVendor);
router.put('/vendors/:vendorId/activate', validateUUIDParams('vendorId'), ctrl.activateVendor);

// Vendor payout multipliers (admin override)
router.get('/vendors/:vendorId/payout-multipliers', validateUUIDParams('vendorId'), ctrl.getVendorPayoutMultipliers);
router.put('/vendors/:vendorId/payout-multipliers', validateUUIDParams('vendorId'), ctrl.updateVendorPayoutMultipliers);

// Settings
router.get('/settings', ctrl.getAppSettings);
router.put('/settings/:key', ctrl.updateAppSetting);

// Payouts
router.get('/payouts/pending', ctrl.getPendingPayouts);
router.post('/payouts/:payoutId/process', validateUUIDParams('payoutId'), ctrl.processVendorPayout);

// Advertisements
router.get('/advertisements', ctrl.getAdvertisements);
router.post('/advertisements', ctrl.createAdvertisement);
router.put('/advertisements/:adId', validateUUIDParams('adId'), ctrl.updateAdvertisement);
router.delete('/advertisements/:adId', validateUUIDParams('adId'), ctrl.deleteAdvertisement);
router.post('/advertisements/:adId/click', validateUUIDParams('adId'), ctrl.recordAdClick);
router.post('/advertisements/:adId/impression', validateUUIDParams('adId'), ctrl.recordAdImpression);

// Draw Configs
router.get('/draws', ctrl.getDrawConfigs);
router.post('/draws', ctrl.createDrawConfig);
router.put('/draws/:id', validateUUIDParams('id'), ctrl.updateDrawConfig);
router.delete('/draws/:id', validateUUIDParams('id'), ctrl.deleteDrawConfig);

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

// Player Withdrawals
router.get('/withdrawals/pending', ctrl.getPendingWithdrawals);
router.post('/withdrawals/:withdrawalId/process', validateUUIDParams('withdrawalId'), ctrl.processPlayerWithdrawal);

export default router;
