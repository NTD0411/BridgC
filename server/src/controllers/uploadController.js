import { Readable } from 'node:stream';
import { getCloudinary } from '../config/cloudinary.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'A file is required' });

  const resourceType = req.file.mimetype === 'application/pdf'
    ? 'raw'
    : req.file.mimetype.startsWith('video/')
      ? 'video'
      : 'image';
  const cloudinary = getCloudinary();
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'bridgc',
        resource_type: resourceType,
        use_filename: false,
      },
      (error, uploaded) => {
        if (error) return reject(error);
        return resolve(uploaded);
      },
    );
    Readable.from([req.file.buffer]).pipe(stream);
  });

  return res.status(201).json({
    url: result.secure_url,
    publicId: result.public_id,
    resourceType,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
  });
});
