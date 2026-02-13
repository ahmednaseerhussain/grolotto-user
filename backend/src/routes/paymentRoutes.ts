import { Router, raw } from 'express';
import * as ctrl from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPaymentSchema } from '../validators/schemas';

const router = Router();

router.post('/intent', authenticate, validate(createPaymentSchema), ctrl.createPaymentIntent);
router.post('/webhook', raw({ type: 'application/json' }), ctrl.handleWebhook);
router.get('/status/:transactionId', authenticate, ctrl.getTransactionStatus);

export default router;
