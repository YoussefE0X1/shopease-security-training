import { Router } from 'express';
import { createReview, getProductReviews, deleteReview } from './review.controller';
import { authenticate, authorize } from '../../shared/middleware/auth';
import { validate } from '../../shared/middleware/validate';

const router = Router();

router.get('/:productId', getProductReviews);
router.post('/:productId', authenticate, validate([
  { field: 'rating', required: true, type: 'number', min: 1, max: 5 },
]), createReview);
router.delete('/:id', authenticate, deleteReview);

export default router;
