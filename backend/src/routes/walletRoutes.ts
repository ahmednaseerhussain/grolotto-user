import { Router } from 'express';
import * as ctrl from '../controllers/walletController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, ctrl.getWallet);
router.get('/transactions', authenticate, ctrl.getTransactions);
router.post('/withdraw', authenticate, ctrl.requestWithdrawal);

export default router;
