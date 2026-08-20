import { Router } from 'express';
import {
  getProfile, getMyWallet, updateProfile, addAddress, updateAddress, deleteAddress, toggleWishlist, getUsers, updateUserRole, deleteMyAccount, deleteUser,
} from './user.controller';
import { authenticate } from '../../shared/middleware/auth';
import { validate } from '../../shared/middleware/validate';

const router = Router();

router.get('/profile', authenticate, getProfile);
router.get('/wallet', authenticate, getMyWallet);
router.patch('/profile', authenticate, updateProfile);

router.post('/addresses', authenticate, validate([
  { field: 'label', required: true },
  { field: 'street', required: true },
  { field: 'city', required: true },
  { field: 'state', required: true },
  { field: 'zip', required: true },
  { field: 'country', required: true },
]), addAddress);
router.patch('/addresses/:addressId', authenticate, updateAddress);
router.delete('/addresses/:addressId', authenticate, deleteAddress);

router.post('/wishlist/:productId', authenticate, toggleWishlist);

router.get('/', authenticate, getUsers);
router.delete('/me', authenticate, deleteMyAccount);
router.patch('/:id/role', authenticate, updateUserRole);
router.delete('/:id', authenticate, deleteUser);

export default router;
