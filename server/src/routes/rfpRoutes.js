import { Router } from 'express';
import { createRfp } from '../controllers/rfpController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.post('/', requireAuth, requireRole('customer'), createRfp);
export default router;
