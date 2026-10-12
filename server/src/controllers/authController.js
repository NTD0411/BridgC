import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const login = asyncHandler(async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ message: 'Tài khoản hiện không hoạt động' });
  }
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');

  const token = jwt.sign({ sub: String(user._id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  return res.json({
    token,
    user: {
      id: user._id,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar,
    },
  });
});
