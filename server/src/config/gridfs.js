import { Readable } from 'node:stream';
import mongoose, { Types } from 'mongoose';

const { GridFSBucket } = mongoose.mongo;
import jwt from 'jsonwebtoken';

const bucketName = 'bridgcUploads';
const chatFileTokenLifetime = '30m';

function getBucket() {
  if (!mongoose.connection.db) {
    const error = new Error('MongoDB must be connected before storing files');
    error.statusCode = 503;
    throw error;
  }
  return new GridFSBucket(mongoose.connection.db, { bucketName });
}

export function storeFile(buffer, { fileName, contentType, metadata }) {
  const bucket = getBucket();
  return new Promise((resolve, reject) => {
    const upload = bucket.openUploadStream(fileName, {
      contentType,
      metadata,
    });
    upload.once('error', reject);
    upload.once('finish', () => resolve(upload.id));
    Readable.from([buffer]).pipe(upload);
  });
}

export function findStoredFile(id) {
  if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
  return getBucket().find({ _id: new Types.ObjectId(id) }).next();
}

export function openStoredFile(id, options) {
  return getBucket().openDownloadStream(new Types.ObjectId(id), options);
}

export function deleteStoredFile(id) {
  if (!Types.ObjectId.isValid(id)) return Promise.resolve();
  return getBucket().delete(new Types.ObjectId(id));
}

export function createChatFileToken(fileId, conversationId) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  return jwt.sign(
    { scope: 'chat-file', fileId: String(fileId), conversationId: String(conversationId) },
    process.env.JWT_SECRET,
    { expiresIn: chatFileTokenLifetime },
  );
}
