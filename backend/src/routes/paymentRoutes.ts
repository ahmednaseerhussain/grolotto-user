import { Router } from 'express';
import * as ctrl from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPaymentSchema } from '../validators/schemas';

const router = Router();

// Create MonCash payment (returns redirect URL)
router.post('/intent', authenticate, validate(createPaymentSchema), ctrl.createPaymentIntent);

// Verify payment after user returns from MonCash gateway
router.post('/verify', authenticate, ctrl.verifyPayment);

// Check payment status
router.get('/status/:transactionId', authenticate, ctrl.getTransactionStatus);

export default router;
