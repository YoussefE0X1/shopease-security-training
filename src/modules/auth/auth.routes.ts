import { Router } from 'express';
import { register, login, refresh, logout, getMe, changePassword } from './auth.controller';
import { authenticate } from '../../shared/middleware/auth';
import { validate } from '../../shared/middleware/validate';

const router = Router();

router.post('/register', validate([
  { field: 'name', required: true, type: 'string', minLength: 2, maxLength: 50 },
  { field: 'email', required: true, type: 'email' },
  { field: 'password', required: true, type: 'string', minLength: 6 },
]), register);

router.post('/login', validate([
  { field: 'email', required: true, type: 'email' },
  { field: 'password', required: true },
]), login);

router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

export default router;
