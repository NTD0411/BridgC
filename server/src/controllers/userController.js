import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

function serializeUser(user) {
  return {
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    creditsBalance: user.creditsBalance,
  };
}

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('email fullName phone avatar role creditsBalance')
    .lean();
  if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
  return res.json({ user: serializeUser(user) });
});

export const updateCurrentUser = asyncHandler(async (req, res) => {
  const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';

  if (!fullName || fullName.length > 120) {
    return res.status(400).json({ message: 'Họ tên là bắt buộc và không được vượt quá 120 ký tự' });
  }
  if (phone.length > 30 || (phone && !/^[+()\d .-]+$/.test(phone))) {
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { fullName, phone } },
    { new: true, runValidators: true },
  ).select('email fullName phone avatar role creditsBalance');
  if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
  return res.json({ user: serializeUser(user) });
});
