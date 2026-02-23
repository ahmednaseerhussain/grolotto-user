import { Router } from 'express';
import * as ctrl from '../controllers/lotteryController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { placeBetSchema, publishResultsSchema } from '../validators/schemas';

const router = Router();

// Player
router.post('/bet', authenticate, validate(placeBetSchema), ctrl.placeBet);
router.get('/tickets', authenticate, ctrl.getMyTickets);

// Public
router.get('/rounds', ctrl.getLotteryRounds);

// Admin publishes results globally per state per day
router.post('/results', authenticate, authorize('admin'), validate(publishResultsSchema), ctrl.publishResults);
router.get('/random-numbers', authenticate, authorize('admin'), ctrl.generateRandomNumbers);

export default router;
