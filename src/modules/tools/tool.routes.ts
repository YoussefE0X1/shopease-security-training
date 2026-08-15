import { Router } from 'express';
import { importImage, generateInvoice } from './tool.controller';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();

router.post('/import-image', authenticate, importImage);
router.get('/invoice', authenticate, generateInvoice);

export default router;
