import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    fileType: { type: String, required: true, trim: true, maxlength: 100 },
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    conversationId: { type: String, required: true, trim: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message: { type: String, trim: true, maxlength: 10000, default: '' },
    attachments: { type: [attachmentSchema], default: [] },
    quotePdfUrl: { type: String, trim: true, default: '' },
    isRecalled: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

messageSchema.pre('validate', function validateMessage() {
  if (!this.message && !this.quotePdfUrl && this.attachments.length === 0) {
    this.invalidate('message', 'A message must contain text or an attachment');
  }
});
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

export default model('Message', messageSchema);
