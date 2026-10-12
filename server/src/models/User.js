import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    role: {
      type: String,
      enum: ['customer', 'vendor', 'admin'],
      required: true,
      default: 'customer',
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      maxlength: 254,
    },
    password: { type: String, minlength: 8, select: false },
    googleId: { type: String, trim: true, unique: true, sparse: true, select: false },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    avatar: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'active',
      index: true,
    },
    creditsBalance: { type: Number, min: 0, default: 0 },
    referralCode: { type: String, trim: true, uppercase: true, sparse: true, unique: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false },
);

userSchema.index({ role: 1, status: 1 });
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default model('User', userSchema);
