import multer from 'multer';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

export const uploadFileMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error('Only image, PDF, and supported video files are allowed');
      error.statusCode = 415;
      return callback(error);
    }
    return callback(null, true);
  },
});
