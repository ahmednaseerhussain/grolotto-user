import { Router } from 'express';
import * as ctrl from '../controllers/rewardController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, ctrl.getUserRewards);
router.post('/:rewardId/claim', authenticate, ctrl.claimReward);

export default router;
