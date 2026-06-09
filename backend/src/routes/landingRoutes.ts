import { Router } from 'express';
import * as ctrl from '../controllers/landingController';

const router = Router();

router.post('/contact', ctrl.createContact);
router.post('/gift-card-orders', ctrl.createGiftCardOrder);
router.post('/stripe/create-payment-intent', ctrl.createStripeIntent);
router.post('/stripe/confirm', ctrl.confirmStripePayment);

export default router;
