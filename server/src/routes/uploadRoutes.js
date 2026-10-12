import { Router } from 'express';
import { uploadFile } from '../controllers/uploadController.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadFileMiddleware } from '../middleware/upload.js';

const router = Router();
router.post('/', requireAuth, uploadFileMiddleware.single('file'), uploadFile);
export default router;
