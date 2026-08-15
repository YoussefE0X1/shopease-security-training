import { Router } from 'express';
import { getDashboardStats, exportOrders } from './admin.controller';
import { authenticate, authorizeTokenRole } from '../../shared/middleware/auth';

const router = Router();

// VULNERABILITY (bfla-admin-stats): no role check — any authenticated user can
// read revenue, order and customer statistics.
router.get('/stats', authenticate, getDashboardStats);

// VULNERABILITY (bfla-stale-token-role): this endpoint trusts the `role` claim
// inside the JWT instead of the current database role. A user whose role was
// demoted (or account removed) keeps exporting all orders until the token
// naturally expires.
router.get('/export', authorizeTokenRole('admin'), exportOrders);

export default router;
