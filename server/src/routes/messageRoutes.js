import { Router } from 'express';
import multer from 'multer';
import {
  authorizeConversation,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
  startConversation,
} from '../controllers/messageController.js';
import { requireAuth } from '../middleware/auth.js';

function requireChatUser(req, res, next) {
  if (req.user.role !== 'customer' && req.user.role !== 'vendor') {
    return res.status(403).json({ message: 'Chỉ khách hàng và vendor mới có thể sử dụng chat' });
  }
  return next();
}

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
]);

const attachmentsUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 5 },
  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error('Chỉ hỗ trợ ảnh, video và tài liệu PDF/Office/TXT/CSV');
      error.statusCode = 415;
      return callback(error);
    }
    return callback(null, true);
  },
});

const router = Router();
router.use(requireAuth, requireChatUser);
router.get('/conversations', listConversations);
router.post('/conversations', startConversation);
router.get('/:conversationId', authorizeConversation, listMessages);
router.post(
  '/:conversationId',
  authorizeConversation,
  (req, res, next) => attachmentsUpload.array('attachments', 5)(req, res, next),
  sendMessage,
);
router.post('/:conversationId/read', authorizeConversation, markConversationRead);
export default router;
