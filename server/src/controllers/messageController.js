import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import VendorProfile from '../models/VendorProfile.js';
import { createChatFileToken, deleteStoredFile, storeFile } from '../config/gridfs.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const conversationRoom = (conversationId) => `conversation:${conversationId}`;
const chatFileUrl = (fileId, conversationId) =>
  `/api/uploads/${fileId}?token=${encodeURIComponent(createChatFileToken(fileId, conversationId))}`;

function serializeMessageAttachments(message, conversationId) {
  return {
    ...message,
    attachments: (message.attachments || []).map((attachment) => ({
      ...attachment,
      url: attachment.fileId
        ? chatFileUrl(attachment.fileId, conversationId)
        : attachment.url,
    })),
  };
}

export const authorizeConversation = asyncHandler(async (req, res, next) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation) return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
  const userId = String(req.user._id);
  if (![String(conversation.customerId), String(conversation.vendorId)].includes(userId)) {
    return res.status(403).json({ message: 'Bạn không có quyền truy cập cuộc trò chuyện này' });
  }
  req.conversation = conversation;
  return next();
});

export const listConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const filter = req.user.role === 'vendor'
    ? { vendorId: userId }
    : req.user.role === 'customer'
      ? { customerId: userId }
      : { $or: [{ customerId: userId }, { vendorId: userId }] };

  const conversations = await Conversation.find(filter)
    .sort({ lastMessageAt: -1 })
    .populate('customerId', 'fullName avatar role')
    .populate('vendorId', 'fullName avatar role')
    .populate('vendorProfileId', 'storeName logo slug')
    .lean();

  return res.json({
    conversations: conversations.map((conversation) => ({
      id: String(conversation._id),
      customer: conversation.customerId,
      vendor: conversation.vendorId,
      vendorProfile: conversation.vendorProfileId,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      lastSenderId: conversation.lastSenderId ? String(conversation.lastSenderId) : null,
      unreadCount: String(conversation.customerId._id) === String(userId)
        ? conversation.customerUnreadCount
        : conversation.vendorUnreadCount,
    })),
  });
});

export const startConversation = asyncHandler(async (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ message: 'Chỉ khách hàng mới có thể bắt đầu cuộc trò chuyện với vendor' });
  }
  const vendorSlug = typeof req.body.vendorSlug === 'string' ? req.body.vendorSlug.trim().toLowerCase() : '';
  if (!vendorSlug || vendorSlug.length > 160) {
    return res.status(400).json({ message: 'Vendor không hợp lệ' });
  }

  const profile = await VendorProfile.findOne({ slug: vendorSlug }).select('_id userId storeName');
  if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ vendor' });
  const vendor = await User.findOne({ _id: profile.userId, role: 'vendor', status: 'active' }).select('_id');
  if (!vendor) return res.status(404).json({ message: 'Tài khoản vendor hiện không khả dụng' });
  if (String(vendor._id) === String(req.user._id)) {
    return res.status(400).json({ message: 'Không thể tự bắt đầu cuộc trò chuyện với chính mình' });
  }

  const conversation = await Conversation.findOneAndUpdate(
    { customerId: req.user._id, vendorId: vendor._id },
    {
      $setOnInsert: {
        customerId: req.user._id,
        vendorId: vendor._id,
        vendorProfileId: profile._id,
        lastMessageAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
    .populate('customerId', 'fullName avatar role')
    .populate('vendorId', 'fullName avatar role')
    .populate('vendorProfileId', 'storeName logo slug')
    .lean();

  req.io?.to(`user:${vendor._id}`).emit('chat:conversation', {
    conversationId: String(conversation._id),
    lastMessage: conversation.lastMessage,
    lastMessageAt: conversation.lastMessageAt,
  });

  return res.status(200).json({
    conversation: {
      id: String(conversation._id),
      customer: conversation.customerId,
      vendor: conversation.vendorId,
      vendorProfile: conversation.vendorProfileId,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      lastSenderId: conversation.lastSenderId ? String(conversation.lastSenderId) : null,
      unreadCount: conversation.customerUnreadCount,
    },
  });
});

export const listMessages = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const before = req.query.before ? new Date(req.query.before) : null;
  if (before && Number.isNaN(before.getTime())) {
    return res.status(400).json({ message: 'Thời điểm phân trang không hợp lệ' });
  }
  const filter = { conversationId: String(req.conversation._id) };
  if (before) filter.createdAt = { $lt: before };
  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('senderId', 'fullName avatar role')
    .lean();
  return res.json({
    messages: messages.reverse().map((message) =>
      serializeMessageAttachments(message, req.conversation._id)),
  });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const text = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  const files = req.files || [];
  if (text.length > 10000) return res.status(400).json({ message: 'Tin nhắn tối đa 10.000 ký tự' });
  if (!text && files.length === 0) return res.status(400).json({ message: 'Tin nhắn cần có nội dung hoặc tệp đính kèm' });

  const conversation = req.conversation;
  const senderId = String(req.user._id);
  const isCustomer = senderId === String(conversation.customerId);
  const receiverId = isCustomer ? conversation.vendorId : conversation.customerId;
  const uploadedFileIds = [];
  let message;
  let attachments = [];
  try {
    for (const file of files) {
      const fileId = await storeFile(file.buffer, {
        fileName: file.originalname,
        contentType: file.mimetype,
        metadata: {
          purpose: 'chat',
          ownerId: senderId,
          conversationId: String(conversation._id),
          contentType: file.mimetype,
          originalName: file.originalname.slice(0, 255),
        },
      });
      uploadedFileIds.push(fileId);
      attachments.push({
        fileId: String(fileId),
        fileType: file.mimetype,
        fileName: file.originalname.slice(0, 255),
      });
    }
    message = await Message.create({
      conversationId: String(conversation._id),
      senderId: req.user._id,
      receiverId,
      message: text,
      attachments,
    });
  } catch (error) {
    const cleanupResults = await Promise.allSettled(
      uploadedFileIds.map((fileId) => deleteStoredFile(fileId)),
    );
    cleanupResults
      .filter((result) => result.status === 'rejected')
      .forEach((result) => console.error('Failed to clean up an unreferenced chat upload', result.reason));
    throw error;
  }
  const updatedConversation = await Conversation.findByIdAndUpdate(conversation._id, {
    $set: {
      lastMessage: text || (attachments.length === 1
        ? `Đã gửi tệp: ${attachments[0].fileName}`
        : `Đã gửi ${attachments.length} tệp`),
      lastMessageAt: message.createdAt,
      lastSenderId: req.user._id,
    },
    $inc: isCustomer
      ? { vendorUnreadCount: 1 }
      : { customerUnreadCount: 1 },
  }, { new: true });

  const serialized = serializeMessageAttachments({
    ...message.toObject(),
    senderId: {
      _id: req.user._id,
      fullName: req.user.fullName,
      avatar: req.user.avatar,
      role: req.user.role,
    },
  }, conversation._id);
  req.io?.to(conversationRoom(String(conversation._id))).emit('chat:message', serialized);
  req.io?.to(`user:${receiverId}`).emit('chat:conversation', {
    conversationId: String(conversation._id),
    lastMessage: updatedConversation.lastMessage,
    lastMessageAt: updatedConversation.lastMessageAt,
  });

  return res.status(201).json({ message: serialized });
});

export const markConversationRead = asyncHandler(async (req, res) => {
  const isCustomer = String(req.user._id) === String(req.conversation.customerId);
  await Conversation.updateOne(
    { _id: req.conversation._id },
    { $set: isCustomer ? { customerUnreadCount: 0 } : { vendorUnreadCount: 0 } },
  );
  req.io?.to(conversationRoom(String(req.conversation._id))).emit('chat:read', {
    conversationId: String(req.conversation._id),
    readerId: String(req.user._id),
  });
  return res.json({ success: true });
});
