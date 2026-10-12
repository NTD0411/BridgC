import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const portfolioItemSchema = new Schema(
  {
    type: { type: String, enum: ['image', 'video', 'pdf'], required: true },
    url: { type: String, required: true, trim: true },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { _id: true },
);

const packageSchema = new Schema(
  {
    name: { type: String, enum: ['Basic', 'Standard', 'Premium'], required: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    price: { type: Number, min: 0, required: true },
    features: { type: [String], default: [] },
  },
  { _id: true },
);

const availabilitySchema = new Schema(
  {
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ['available', 'busy', 'fully_booked'],
      required: true,
    },
  },
  { _id: false },
);

const vendorProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    storeName: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo: { type: String, trim: true, default: '' },
    coverImage: { type: String, trim: true, default: '' },
    bio: { type: String, trim: true, maxlength: 5000, default: '' },
    category: { type: [String], required: true, validate: (items) => items.length > 0 },
    location: {
      province: { type: String, required: true, trim: true },
      city: { type: String, trim: true, default: '' },
    },
    address: { type: String, trim: true, maxlength: 300, default: '' },
    tags: { type: [String], default: [] },
    portfolio: { type: [portfolioItemSchema], default: [] },
    embeds: {
      youtube: { type: [String], default: [] },
      vimeo: { type: [String], default: [] },
      spotify: { type: [String], default: [] },
      soundcloud: { type: [String], default: [] },
    },
    companyProfilePdfUrl: { type: String, trim: true, default: '' },
    cataloguePdfUrl: { type: String, trim: true, default: '' },
    packages: { type: [packageSchema], default: [] },
    availabilityCalendar: { type: [availabilitySchema], default: [] },
    stats: {
      ratingAvg: { type: Number, min: 0, max: 5, default: 0 },
      reviewCount: { type: Number, min: 0, default: 0 },
      responseRate: { type: Number, min: 0, max: 100, default: 0 },
      responseTimeMinutes: { type: Number, min: 0, default: 0 },
      profileViews: { type: Number, min: 0, default: 0 },
      impressions: { type: Number, min: 0, default: 0 },
    },
    isVerified: { type: Boolean, default: false },
    isPro: { type: Boolean, default: false },
    boostStatus: {
      isBoosted: { type: Boolean, default: false },
      expiresAt: { type: Date, default: null },
      badge: { type: String, trim: true, default: '' },
    },
    autoReplyMessage: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true, versionKey: false },
);

vendorProfileSchema.index({ category: 1, 'location.province': 1, 'location.city': 1 });
vendorProfileSchema.index({ tags: 1 });
vendorProfileSchema.index({ 'stats.ratingAvg': -1, isVerified: -1 });
vendorProfileSchema.index({ storeName: 'text', bio: 'text', tags: 'text' });

export default model('VendorProfile', vendorProfileSchema);
