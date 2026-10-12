import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import VendorProfile from '../models/VendorProfile.js';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function bootstrapUser() {
  const email = requiredEnv('BOOTSTRAP_EMAIL').toLowerCase();
  const password = requiredEnv('BOOTSTRAP_PASSWORD');
  const fullName = requiredEnv('BOOTSTRAP_FULL_NAME');
  const role = process.env.BOOTSTRAP_ROLE || 'customer';

  if (!['customer', 'vendor'].includes(role)) {
    throw new Error('BOOTSTRAP_ROLE must be customer or vendor');
  }
  if (password.length < 12) {
    throw new Error('BOOTSTRAP_PASSWORD must contain at least 12 characters');
  }

  let vendorDetails;
  if (role === 'vendor') {
    vendorDetails = {
      storeName: requiredEnv('BOOTSTRAP_STORE_NAME'),
      slug: requiredEnv('BOOTSTRAP_STORE_SLUG').toLowerCase(),
      category: requiredEnv('BOOTSTRAP_CATEGORY')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      province: process.env.BOOTSTRAP_PROVINCE?.trim() || 'Đà Nẵng',
    };
  }

  await mongoose.connect(requiredEnv('MONGODB_URI'));
  let user = await User.findOne({ email });
  if (user) {
    console.info(`An account for ${email} already exists; no changes were made.`);
    return;
  }

  user = await User.create({
    email,
    password,
    fullName,
    role,
    status: 'active',
  });

  if (role === 'vendor') {
    try {
      await VendorProfile.create({
        userId: user._id,
        storeName: vendorDetails.storeName,
        slug: vendorDetails.slug,
        category: vendorDetails.category,
        location: { province: vendorDetails.province },
      });
    } catch (error) {
      await User.deleteOne({ _id: user._id });
      throw error;
    }
  }

  console.info(`Created active ${role} account: ${email}`);
}

bootstrapUser()
  .catch((error) => {
    console.error('Could not create bootstrap account:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
