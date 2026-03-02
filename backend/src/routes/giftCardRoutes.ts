import { Router } from 'express';
import * as ctrl from '../controllers/giftCardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Purchase a gift card (debits wallet)
router.post('/purchase', authenticate, ctrl.purchaseGiftCard);

// Redeem a gift card code (credits wallet)
router.post('/redeem', authenticate, ctrl.redeemGiftCard);

// Get my purchased gift cards
router.get('/my-cards', authenticate, ctrl.getMyGiftCards);

export default router;
