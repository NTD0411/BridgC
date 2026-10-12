import 'dotenv/config';
import { createServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { getAllowedClientOrigins } from './config/clientOrigins.js';
import User from './models/User.js';
import Conversation from './models/Conversation.js';

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set to a random secret with at least 32 characters');
  }
  await connectDatabase();
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: getAllowedClientOrigins(), credentials: true },
  });
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub).select('_id role status');
      if (!user || user.status !== 'active') return next(new Error('Account unavailable'));
      socket.data.userId = String(user._id);
      socket.data.role = user.role;
      return next();
    } catch (error) {
      return next(error);
    }
  });
  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
    socket.on('chat:join', async ({ conversationId } = {}, acknowledge = () => {}) => {
      try {
        const conversation = await Conversation.findById(conversationId).select('customerId vendorId');
        if (!conversation) return acknowledge({ error: 'Không tìm thấy cuộc trò chuyện' });
        const userId = socket.data.userId;
        if (![String(conversation.customerId), String(conversation.vendorId)].includes(userId)) {
          return acknowledge({ error: 'Bạn không có quyền truy cập cuộc trò chuyện này' });
        }
        socket.join(`conversation:${conversationId}`);
        return acknowledge({ success: true });
      } catch (error) {
        console.error('Failed to join chat conversation', error);
        return acknowledge({ error: 'Không thể kết nối cuộc trò chuyện' });
      }
    });
    socket.on('chat:leave', ({ conversationId } = {}) => {
      if (typeof conversationId === 'string') socket.leave(`conversation:${conversationId}`);
    });
  });

  const app = createApp(io);
  httpServer.on('request', app);
  const port = Number(process.env.PORT || 5000);
  httpServer.listen(port, () => console.info(`BridgC API listening on ${port}`));
}

start().catch((error) => {
  console.error('Failed to start BridgC API', error);
  process.exitCode = 1;
});
