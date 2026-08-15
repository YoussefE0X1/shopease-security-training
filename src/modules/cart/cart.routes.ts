import { Router } from 'express';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from './cart.controller';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();

router.get('/', authenticate, getCart);
router.post('/items', authenticate, addToCart);
router.patch('/items/:itemId', authenticate, updateCartItem);
router.delete('/items/:itemId', authenticate, removeFromCart);
router.delete('/', authenticate, clearCart);

export default router;
