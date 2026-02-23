import { Router } from 'express';
import * as ctrl from '../controllers/tchalaController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/search', ctrl.searchDreams);
router.get('/all', ctrl.getAllDreams);

// Admin-only CRUD
router.post('/', authenticate, authorize('admin'), ctrl.createDream);
router.put('/:id', authenticate, authorize('admin'), ctrl.updateDream);
router.delete('/:id', authenticate, authorize('admin'), ctrl.deleteDream);

export default router;
