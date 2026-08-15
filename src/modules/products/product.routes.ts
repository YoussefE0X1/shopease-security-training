import { Router } from 'express';
import {
  createProduct, getProducts, getProduct, getProductBySlug, updateProduct, deleteProduct, getFeaturedProducts,
} from './product.controller';
import { authenticate, optionalAuthenticate } from '../../shared/middleware/auth';
import { upload } from '../../shared/utils/upload';

const router = Router();

router.get('/', optionalAuthenticate, getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProduct);
router.post('/', authenticate, upload.array('images', 10), createProduct);
router.patch('/:id', authenticate, upload.array('images', 10), updateProduct);
router.delete('/:id', authenticate, deleteProduct);

export default router;
