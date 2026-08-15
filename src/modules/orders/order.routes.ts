import { Router } from 'express';
import { createOrder, getMyOrders, getOrder, getAllOrders, updateOrderStatus, cancelOrder } from './order.controller';
import { authenticate, authorize } from '../../shared/middleware/auth';

const router = Router();

router.post('/', authenticate, createOrder);
router.get('/mine', authenticate, getMyOrders);
router.get('/:id', authenticate, getOrder);
router.get('/', authenticate, authorize('admin'), getAllOrders);
router.patch('/:id/status', authenticate, authorize('admin'), updateOrderStatus);
router.patch('/:id/cancel', authenticate, cancelOrder);

export default router;
