import { Router } from 'express';
import { createReview } from '../controllers/reviewController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.post('/', requireAuth, requireRole('customer'), createReview);
export default router;
