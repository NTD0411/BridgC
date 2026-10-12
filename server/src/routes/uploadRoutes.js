import { Router } from 'express';
import { serveUpload, uploadAvatar, uploadFile } from '../controllers/uploadController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadAvatarMiddleware, uploadFileMiddleware } from '../middleware/upload.js';

const router = Router();
router.get('/:fileId', serveUpload);
router.post('/avatar', requireAuth, uploadAvatarMiddleware.single('file'), uploadAvatar);
router.post('/', requireAuth, requireRole('vendor'), uploadFileMiddleware.single('file'), uploadFile);
export default router;
