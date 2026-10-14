import mongoose from 'mongoose';
import User from '../models/User.js';
import VendorProfile from '../models/VendorProfile.js';
import Rfp from '../models/Rfp.js';
import Lead from '../models/Lead.js';
import Review from '../models/Review.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { MODEL_CANDIDATES } from '../services/geminiService.js';
import { getWeatherForLocation } from '../services/weatherService.js';
import { geocodeLocation } from '../services/googleMapsService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Get high-level overview metrics & KPIs
export const getAdminOverview = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    usersByRole,
    usersByStatus,
    totalVendors,
    verifiedVendors,
    proVendors,
    totalRfps,
    rfpsByStatus,
    totalLeads,
    leadsByStatus,
    totalReviews,
    ratingStats,
    creditsAggregate,
  ] = await Promise.all([
    User.countDocuments(),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    VendorProfile.countDocuments(),
    VendorProfile.countDocuments({ isVerified: true }),
    VendorProfile.countDocuments({ isPro: true }),
    Rfp.countDocuments(),
    Rfp.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Lead.countDocuments(),
    Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Review.countDocuments(),
    Review.aggregate([{ $group: { _id: null, avgRating: { $avg: '$rating' } } }]),
    User.aggregate([{ $group: { _id: null, totalCredits: { $sum: '$creditsBalance' } } }]),
  ]);

  return res.json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        byRole: Object.fromEntries(usersByRole.map((item) => [item._id, item.count])),
        byStatus: Object.fromEntries(usersByStatus.map((item) => [item._id, item.count])),
      },
      vendors: {
        total: totalVendors,
        verified: verifiedVendors,
        pro: proVendors,
      },
      rfps: {
        total: totalRfps,
        byStatus: Object.fromEntries(rfpsByStatus.map((item) => [item._id, item.count])),
      },
      leads: {
        total: totalLeads,
        byStatus: Object.fromEntries(leadsByStatus.map((item) => [item._id, item.count])),
      },
      reviews: {
        total: totalReviews,
        avgRating: Number(ratingStats[0]?.avgRating?.toFixed(1) || 5),
      },
      credits: {
        totalDistributed: creditsAggregate[0]?.totalCredits || 0,
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        name: mongoose.connection.name,
      },
    },
  });
});

// 2. List all users with pagination, search, and filters
export const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.role && req.query.role !== 'all') {
    query.role = req.query.role;
  }
  if (req.query.status && req.query.status !== 'all') {
    query.status = req.query.status;
  }
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ fullName: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return res.json({
    success: true,
    users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// 3. Update user status (active / suspended / pending)
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'suspended', 'pending'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
  }

  if (String(req.user._id) === String(id) && status !== 'active') {
    return res.status(400).json({ success: false, message: 'Bạn không thể tự khóa tài khoản của chính mình' });
  }

  const user = await User.findByIdAndUpdate(id, { status }, { new: true }).select('-password');
  if (!user) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
  }

  return res.json({ success: true, user, message: `Đã cập nhật trạng thái người dùng thành: ${status}` });
});

// 4. Update user role (customer / vendor / admin)
export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['customer', 'vendor', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ' });
  }

  // Prevent removing the last admin
  if (String(req.user._id) === String(id) && role !== 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin', status: 'active' });
    if (adminCount <= 1) {
      return res.status(400).json({ success: false, message: 'Hệ thống cần ít nhất một tài khoản Quản trị viên' });
    }
  }

  const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
  if (!user) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
  }

  return res.json({ success: true, user, message: `Đã phân quyền tài khoản thành: ${role}` });
});

// 5. Update user credits balance
export const updateUserCredits = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const amount = Number(req.body.amount);
  const mode = req.body.mode || 'add'; // 'add' or 'set'

  if (!Number.isFinite(amount)) {
    return res.status(400).json({ success: false, message: 'Số lượng credit không hợp lệ' });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
  }

  if (mode === 'set') {
    user.creditsBalance = Math.max(0, amount);
  } else {
    user.creditsBalance = Math.max(0, (user.creditsBalance || 0) + amount);
  }

  await user.save();
  return res.json({
    success: true,
    user: { _id: user._id, fullName: user.fullName, email: user.email, creditsBalance: user.creditsBalance },
    message: `Đã cập nhật số dư credit thành công: ${user.creditsBalance} B-Credit`,
  });
});

// 6. List all vendor profiles
export const listVendors = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.isVerified !== undefined && req.query.isVerified !== 'all') {
    query.isVerified = req.query.isVerified === 'true';
  }
  if (req.query.isPro !== undefined && req.query.isPro !== 'all') {
    query.isPro = req.query.isPro === 'true';
  }
  if (req.query.category && req.query.category !== 'all') {
    query.category = req.query.category;
  }
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ storeName: searchRegex }, { bio: searchRegex }, { tags: searchRegex }, { slug: searchRegex }];
  }

  const [vendors, total] = await Promise.all([
    VendorProfile.find(query)
      .populate('userId', 'fullName email phone status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    VendorProfile.countDocuments(query),
  ]);

  return res.json({
    success: true,
    vendors,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// 7. Verify or toggle Pro status for a vendor
export const verifyVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = {};

  if (typeof req.body.isVerified === 'boolean') {
    updates.isVerified = req.body.isVerified;
  }
  if (typeof req.body.isPro === 'boolean') {
    updates.isPro = req.body.isPro;
  }
  if (req.body.boostStatus) {
    updates.boostStatus = req.body.boostStatus;
  }

  const vendor = await VendorProfile.findByIdAndUpdate(id, { $set: updates }, { new: true })
    .populate('userId', 'fullName email phone status');

  if (!vendor) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ gian hàng' });
  }

  return res.json({
    success: true,
    vendor,
    message: `Đã cập nhật trạng thái xác thực gian hàng: ${vendor.storeName}`,
  });
});

// 8. List all RFPs (Project briefs)
export const listRfps = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.status && req.query.status !== 'all') {
    query.status = req.query.status;
  }
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ title: searchRegex }, { description: searchRegex }, { category: searchRegex }];
  }

  const [rfps, total] = await Promise.all([
    Rfp.find(query)
      .populate('customerId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Rfp.countDocuments(query),
  ]);

  return res.json({
    success: true,
    rfps: rfps.map((rfp) => ({
      ...rfp,
      matchedVendorCount: (rfp.matchedVendorIds || []).length,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// 9. Update RFP status
export const updateRfpStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['open', 'processing', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái dự án không hợp lệ' });
  }

  const rfp = await Rfp.findByIdAndUpdate(id, { status }, { new: true }).populate('customerId', 'fullName email');
  if (!rfp) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy dự án RFP' });
  }

  return res.json({ success: true, rfp, message: `Đã cập nhật trạng thái RFP thành: ${status}` });
});

// 10. List all reviews
export const listReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.rating && req.query.rating !== 'all') {
    query.rating = Number(req.query.rating);
  }

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate('customerId', 'fullName email avatar')
      .populate('vendorId', 'storeName slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(query),
  ]);

  return res.json({
    success: true,
    reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// 11. Toggle review visibility or delete review
export const updateReviewVisibility = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isPublic } = req.body;

  if (typeof isPublic !== 'boolean') {
    return res.status(400).json({ success: false, message: 'isPublic phải là boolean' });
  }

  const review = await Review.findByIdAndUpdate(id, { isPublic }, { new: true });
  if (!review) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
  }

  return res.json({
    success: true,
    review,
    message: isPublic ? 'Đánh giá đã được hiển thị công khai' : 'Đánh giá đã được ẩn',
  });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const review = await Review.findByIdAndDelete(id);
  if (!review) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
  }
  return res.json({ success: true, message: 'Đã xóa đánh giá thành công' });
});

// 12. Full System & Integrations Diagnostics Check
export const getSystemHealth = asyncHandler(async (req, res) => {
  // Test DB
  const dbConnected = mongoose.connection.readyState === 1;

  // Test Weather
  let weatherStatus = { status: 'unknown', details: null };
  try {
    const weatherData = await getWeatherForLocation('Đà Nẵng');
    weatherStatus = {
      status: 'healthy',
      provider: weatherData.provider,
      sample: `${weatherData.city}: ${weatherData.temp_c}°C, ${weatherData.condition}`,
    };
  } catch (error) {
    weatherStatus = { status: 'degraded', error: error.message };
  }

  // Test Gemini AI
  let geminiStatus = { status: 'unknown', details: null };
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    geminiStatus = { status: 'missing_key', error: 'GEMINI_API_KEY chưa được cấu hình' };
  } else {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      let successModel = null;
      for (const m of MODEL_CANDIDATES.slice(0, 3)) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          await model.generateContent('Hi');
          successModel = m;
          break;
        } catch {
          // try next
        }
      }
      if (successModel) {
        geminiStatus = { status: 'healthy', activeModel: successModel };
      } else {
        geminiStatus = { status: 'rate_limited', note: 'Các model chính đang đạt hạn mức 429/503. Dự phòng đang hoạt động.' };
      }
    } catch (e) {
      geminiStatus = { status: 'error', error: e.message };
    }
  }

  // Test Google Maps
  let mapsStatus = { status: 'unknown' };
  try {
    const geo = await geocodeLocation('Đà Nẵng');
    mapsStatus = {
      status: 'healthy',
      provider: geo.provider,
      hasApiKey: Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim()),
      embedSupported: true,
    };
  } catch (e) {
    mapsStatus = { status: 'degraded', error: e.message };
  }

  return res.json({
    success: true,
    system: {
      database: { status: dbConnected ? 'healthy' : 'down' },
      ai: geminiStatus,
      weather: weatherStatus,
      maps: mapsStatus,
      timestamp: new Date().toISOString(),
    },
  });
});
