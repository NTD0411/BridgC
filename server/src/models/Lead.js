import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const noteSchema = new Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const leadSchema = new Schema(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rfpId: { type: Schema.Types.ObjectId, ref: 'Rfp', default: null, index: true },
    source: {
      type: String,
      enum: ['search', 'rfp', 'quick_inquiry'],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'new_lead',
        'consulting',
        'quoted',
        'closed_won',
        'in_progress',
        'completed',
        'cancelled',
      ],
      default: 'new_lead',
      index: true,
    },
    notes: { type: [noteSchema], default: [] },
    quotedAmount: { type: Number, min: 0, default: null },
  },
  { timestamps: true, versionKey: false },
);

leadSchema.index({ vendorId: 1, status: 1, updatedAt: -1 });
leadSchema.index({ vendorId: 1, customerId: 1, rfpId: 1 });
export default model('Lead', leadSchema);
