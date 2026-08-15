import { Router } from 'express';
import { createCoupon, getCoupons, validateCoupon, deleteCoupon } from './coupon.controller';
import { authenticate } from '../../shared/middleware/auth';
import { validate } from '../../shared/middleware/validate';

const router = Router();

router.get('/', authenticate, getCoupons);
router.post('/', authenticate, validate([
  { field: 'code', required: true },
  { field: 'type', required: true },
  { field: 'value', required: true, type: 'number', min: 0 },
  { field: 'expiresAt', required: true },
]), createCoupon);
router.post('/validate', authenticate, validateCoupon);
router.delete('/:id', authenticate, deleteCoupon);

export default router;
