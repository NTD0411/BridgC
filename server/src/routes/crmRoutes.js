import { Router } from 'express';
import { updateLeadStatus } from '../controllers/crmController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.patch('/leads/:id/status', requireAuth, requireRole('vendor'), updateLeadStatus);
export default router;
