import { Router } from 'express';
import { chat, getAiStatus, planEvent } from '../controllers/aiController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.get('/status', requireAuth, getAiStatus);
router.post('/chat', requireAuth, chat);
router.post('/event-plan', planEvent);
export default router;
