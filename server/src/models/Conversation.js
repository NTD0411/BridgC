import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const conversationSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorProfileId: { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true },
    lastMessage: { type: String, trim: true, maxlength: 160, default: '' },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastSenderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    customerUnreadCount: { type: Number, min: 0, default: 0 },
    vendorUnreadCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

conversationSchema.index({ customerId: 1, vendorId: 1 }, { unique: true });
conversationSchema.index({ customerId: 1, lastMessageAt: -1 });
conversationSchema.index({ vendorId: 1, lastMessageAt: -1 });

export default model('Conversation', conversationSchema);
