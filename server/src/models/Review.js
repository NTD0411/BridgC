import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const reviewSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true, index: true },
    rfpId: { type: Schema.Types.ObjectId, ref: 'Rfp', default: null },
    dealId: { type: Schema.Types.ObjectId, ref: 'Lead', default: null },
    rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    comment: { type: String, trim: true, maxlength: 5000, default: '' },
    photos: { type: [String], default: [] },
    isVerifiedDeal: { type: Boolean, required: true, default: false, immutable: true },
  },
  { timestamps: true, versionKey: false },
);

reviewSchema.pre('validate', function validateDealReference() {
  if (!this.rfpId && !this.dealId) {
    this.invalidate('dealId', 'A review must reference an RFP or a completed deal');
  }
});
reviewSchema.index(
  { customerId: 1, vendorId: 1, rfpId: 1 },
  { unique: true, partialFilterExpression: { rfpId: { $type: 'objectId' } } },
);
reviewSchema.index(
  { customerId: 1, vendorId: 1, dealId: 1 },
  { unique: true, partialFilterExpression: { dealId: { $type: 'objectId' } } },
);
reviewSchema.index({ vendorId: 1, createdAt: -1 });

export default model('Review', reviewSchema);
