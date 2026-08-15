import { Router } from 'express';
import { getMyNotifications, markAsRead, markAllAsRead } from './notification.controller';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();

router.get('/', authenticate, getMyNotifications);
router.patch('/:id/read', authenticate, markAsRead);
router.patch('/read-all', authenticate, markAllAsRead);

export default router;
