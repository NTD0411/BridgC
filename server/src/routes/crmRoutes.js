import { Router } from 'express';
import { updateLeadStatus } from '../controllers/crmController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.patch('/leads/:id/status', requireAuth, updateLeadStatus);
export default router;
