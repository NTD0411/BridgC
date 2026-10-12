import { Router } from 'express';
import { createRfp } from '../controllers/rfpController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.post('/', requireAuth, createRfp);
export default router;
