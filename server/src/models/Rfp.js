import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const rfpSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true, trim: true, maxlength: 100, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    budgetMin: { type: Number, min: 0, default: null },
    budgetMax: { type: Number, min: 0, default: null },
    tags: { type: [String], default: [] },
    location: {
      province: { type: String, required: true, trim: true },
      city: { type: String, trim: true, default: '' },
    },
    eventDate: { type: Date, default: null },
    deadline: { type: Date, default: null },
    dynamicFields: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['open', 'processing', 'closed', 'completed'],
      default: 'open',
      index: true,
    },
    matchedVendorIds: [{ type: Schema.Types.ObjectId, ref: 'VendorProfile' }],
  },
  { timestamps: true, versionKey: false },
);

rfpSchema.index({ status: 1, category: 1, 'location.province': 1, deadline: 1 });
rfpSchema.index({ customerId: 1, createdAt: -1 });
rfpSchema.pre('validate', function validateBudgets() {
  if (this.budgetMin != null && this.budgetMax != null && this.budgetMin > this.budgetMax) {
    this.invalidate('budgetMax', 'budgetMax must be greater than or equal to budgetMin');
  }
});

export default model('Rfp', rfpSchema);
