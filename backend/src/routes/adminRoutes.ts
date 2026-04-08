import { Router } from 'express';
import * as ctrl from '../controllers/adminController';
import { authenticate, authorize, authorizeResource } from '../middleware/auth';
import { validateUUIDParams } from '../middleware/validate';

const router = Router();

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

// Dashboard — all admin roles can see the dashboard
router.get('/stats', authorizeResource('dashboard'), ctrl.getSystemStats);
router.get('/analytics', authorizeResource('reports'), ctrl.getAnalytics);

// User management — players + admin-users scoped
router.get('/users', authorizeResource('players'), ctrl.getAllUsers);
router.post('/users', authorizeResource('roles'), ctrl.createAdminUser);
router.put('/users/:userId/suspend', validateUUIDParams('userId'), authorizeResource('players'), ctrl.suspendUser);
router.put('/users/:userId/activate', validateUUIDParams('userId'), authorizeResource('players'), ctrl.activateUser);
router.put('/users/:userId', validateUUIDParams('userId'), authorizeResource('roles'), ctrl.updateAdminUser);
router.delete('/users/:userId', validateUUIDParams('userId'), authorizeResource('roles'), ctrl.deleteAdminUser);

// Vendor management
router.put('/vendors/:vendorId/approve', validateUUIDParams('vendorId'), authorizeResource('vendors'), ctrl.approveVendor);
router.put('/vendors/:vendorId/reject', validateUUIDParams('vendorId'), authorizeResource('vendors'), ctrl.rejectVendor);
router.put('/vendors/:vendorId/suspend', validateUUIDParams('vendorId'), authorizeResource('vendors'), ctrl.suspendVendor);
router.put('/vendors/:vendorId/activate', validateUUIDParams('vendorId'), authorizeResource('vendors'), ctrl.activateVendor);

// Vendor payout multipliers (admin override)
router.get('/vendors/:vendorId/payout-multipliers', validateUUIDParams('vendorId'), authorizeResource('vendors'), ctrl.getVendorPayoutMultipliers);
router.put('/vendors/:vendorId/payout-multipliers', validateUUIDParams('vendorId'), authorizeResource('vendors'), ctrl.updateVendorPayoutMultipliers);
router.put('/vendors/:vendorId/commission', validateUUIDParams('vendorId'), authorizeResource('vendors'), ctrl.updateVendorCommission);

// Settings — super_admin / admin only (by default)
router.get('/settings', authorizeResource('settings'), ctrl.getAppSettings);
router.put('/settings/:key', authorizeResource('settings'), ctrl.updateAppSetting);

// Payouts
router.get('/payouts/pending', authorizeResource('payouts'), ctrl.getPendingPayouts);
router.post('/payouts/:payoutId/process', validateUUIDParams('payoutId'), authorizeResource('payouts'), ctrl.processVendorPayout);

// Advertisements
router.get('/advertisements', authorizeResource('ads'), ctrl.getAdvertisements);
router.post('/advertisements', authorizeResource('ads'), ctrl.createAdvertisement);
router.put('/advertisements/:adId', validateUUIDParams('adId'), authorizeResource('ads'), ctrl.updateAdvertisement);
router.delete('/advertisements/:adId', validateUUIDParams('adId'), authorizeResource('ads'), ctrl.deleteAdvertisement);
router.post('/advertisements/:adId/click', validateUUIDParams('adId'), authorizeResource('ads'), ctrl.recordAdClick);
router.post('/advertisements/:adId/impression', validateUUIDParams('adId'), authorizeResource('ads'), ctrl.recordAdImpression);

// Draw Configs
router.get('/draws', authorizeResource('draws'), ctrl.getDrawConfigs);
router.post('/draws', authorizeResource('draws'), ctrl.createDrawConfig);
router.put('/draws/:id', validateUUIDParams('id'), authorizeResource('draws'), ctrl.updateDrawConfig);
router.delete('/draws/:id', validateUUIDParams('id'), authorizeResource('draws'), ctrl.deleteDrawConfig);

// Gift Cards
router.post('/gift-cards/batch', authorizeResource('gift-cards'), ctrl.generateGiftCardBatch);
router.post('/gift-cards/redeem', authorizeResource('gift-cards'), ctrl.redeemGiftCard);
router.get('/gift-cards/batches', authorizeResource('gift-cards'), ctrl.getGiftCardBatches);
router.get('/gift-cards', authorizeResource('gift-cards'), ctrl.getGiftCards);
router.put('/gift-cards/:cardId/deactivate', authorizeResource('gift-cards'), ctrl.deactivateGiftCard);
router.delete('/gift-cards/:cardId', authorizeResource('gift-cards'), ctrl.deleteGiftCard);

// Notifications
router.post('/notifications/broadcast', authorizeResource('notifications'), ctrl.broadcastNotification);
router.get('/notifications/history', authorizeResource('notifications'), ctrl.getBroadcastHistory);

// Transactions
router.get('/transactions', authorizeResource('transactions'), ctrl.getTransactions);

// Lottery rounds & results
router.post('/rounds', authorizeResource('results'), ctrl.createLotteryRound);

// Player Withdrawals
router.get('/withdrawals/pending', authorizeResource('payouts'), ctrl.getPendingWithdrawals);
router.post('/withdrawals/:withdrawalId/process', validateUUIDParams('withdrawalId'), authorizeResource('payouts'), ctrl.processPlayerWithdrawal);

export default router;
