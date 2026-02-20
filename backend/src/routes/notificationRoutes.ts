import { Router } from 'express';
import * as ctrl from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, ctrl.getNotifications);
router.get('/unread-count', authenticate, ctrl.getUnreadCount);
router.put('/:id/read', authenticate, ctrl.markAsRead);
router.put('/read-all', authenticate, ctrl.markAllAsRead);

export default router;
