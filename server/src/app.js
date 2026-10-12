import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import crmRoutes from './routes/crmRoutes.js';
import authRoutes from './routes/authRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import rfpRoutes from './routes/rfpRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getAllowedClientOrigins } from './config/clientOrigins.js';

export function createApp(io) {
  const app = express();
  const allowedOrigins = getAllowedClientOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        const error = new Error('Origin is not allowed by CORS');
        error.statusCode = 403;
        return callback(error);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    req.io = io;
    next();
  });
  app.get('/api/health', (req, res) => {
    const connected = mongoose.connection.readyState === 1;
    return res.status(connected ? 200 : 503).json({
      status: connected ? 'ok' : 'unavailable',
      database: connected ? 'connected' : 'disconnected',
    });
  });
  app.use('/api/auth', authRoutes);
  app.use('/api/rfps', rfpRoutes);
  app.use('/api/crm', crmRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/vendors', vendorRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
  app.use(errorHandler);
  return app;
}
