import jwt from 'jsonwebtoken';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { deleteStoredFile, findStoredFile, openStoredFile, storeFile } from '../config/gridfs.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const serveUpload = asyncHandler(async (req, res, next) => {
  const file = await findStoredFile(req.params.fileId);
  if (!file) return res.status(404).json({ message: 'Không tìm thấy tệp' });

  if (file.metadata?.purpose === 'chat') {
    let payload;
    try {
      payload = jwt.verify(String(req.query.token || ''), process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Liên kết tệp chat không hợp lệ hoặc đã hết hạn' });
    }
    if (
      payload.scope !== 'chat-file' ||
      payload.fileId !== String(file._id) ||
      payload.conversationId !== String(file.metadata.conversationId)
    ) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập tệp này' });
    }
    const conversation = await Conversation.exists({
      _id: file.metadata.conversationId,
      $or: [
        { customerId: file.metadata.ownerId },
        { vendorId: file.metadata.ownerId },
      ],
    });
    if (!conversation) return res.status(403).json({ message: 'Bạn không có quyền truy cập tệp này' });
    res.set('Cache-Control', 'private, no-store');
  } else if (file.metadata?.purpose === 'vendor-profile' || file.metadata?.purpose === 'personal-avatar') {
    res.set('Cache-Control', 'public, max-age=3600');
  } else {
    return res.status(404).json({ message: 'Không tìm thấy tệp' });
  }

  const contentType = file.metadata.contentType || file.contentType || 'application/octet-stream';
  const fileName = file.metadata.originalName || file.filename || 'download';
  const safeName = fileName.replace(/[^\x20-\x7E]|["\\]/g, '_');
  const encodedName = encodeURIComponent(fileName).replace(/['()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  res.set({
    'Accept-Ranges': 'bytes',
    'Content-Type': contentType,
    'Content-Disposition': `inline; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
    'X-Content-Type-Options': 'nosniff',
  });

  let start = 0;
  let end = file.length;
  const range = req.get('range');
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      res.set('Content-Range', `bytes */${file.length}`);
      return res.status(416).end();
    }
    if (!match[1]) {
      const suffixLength = Number(match[2]);
      start = Math.max(file.length - suffixLength, 0);
    } else {
      start = Number(match[1]);
      if (match[2]) end = Math.min(Number(match[2]) + 1, file.length);
    }
    if (start >= file.length || end <= start) {
      res.set('Content-Range', `bytes */${file.length}`);
      return res.status(416).end();
    }
    res.status(206);
    res.set('Content-Range', `bytes ${start}-${end - 1}/${file.length}`);
  }
  res.set('Content-Length', String(end - start));
  const download = openStoredFile(file._id, { start, end });
  download.once('error', next);
  download.pipe(res);
});

export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'A file is required' });

  const fileId = await storeFile(req.file.buffer, {
    fileName: req.file.originalname,
    contentType: req.file.mimetype,
    metadata: {
      purpose: 'vendor-profile',
      ownerId: String(req.user._id),
      contentType: req.file.mimetype,
      originalName: req.file.originalname,
    },
  });
  return res.status(201).json({
    url: `/api/uploads/${fileId}`,
    fileId: String(fileId),
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
  });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn ảnh đại diện' });
  if (!req.file.mimetype.startsWith('image/')) {
    return res.status(415).json({ message: 'Ảnh đại diện phải là tệp hình ảnh' });
  }
  if (req.file.size > 5 * 1024 * 1024) {
    return res.status(413).json({ message: 'Ảnh đại diện không được lớn hơn 5 MB' });
  }

  const fileId = await storeFile(req.file.buffer, {
    fileName: req.file.originalname,
    contentType: req.file.mimetype,
    metadata: {
      purpose: 'personal-avatar',
      ownerId: String(req.user._id),
      contentType: req.file.mimetype,
      originalName: req.file.originalname,
    },
  });
  const avatar = `/api/uploads/${fileId}`;

  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatar } },
      { new: true, runValidators: true },
    ).select('email fullName phone avatar role creditsBalance');
    if (!user) {
      await deleteStoredFile(fileId);
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }
    return res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        creditsBalance: user.creditsBalance,
      },
    });
  } catch (error) {
    await deleteStoredFile(fileId);
    throw error;
  }
});
