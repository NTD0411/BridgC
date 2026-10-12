import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const pitchSchema = new Schema(
  {
    rfpId: { type: Schema.Types.ObjectId, ref: 'Rfp', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    proposalPdfUrl: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true, versionKey: false },
);

pitchSchema.index({ rfpId: 1, vendorId: 1 }, { unique: true });
export default model('Pitch', pitchSchema);
