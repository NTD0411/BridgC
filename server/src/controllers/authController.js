import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

function createSession(user) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET is required');

  const token = jwt.sign({ sub: String(user._id), role: user.role }, jwtSecret, {
    expiresIn: '7d',
  });
  return {
    token,
    user: {
      id: user._id,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar,
      creditsBalance: user.creditsBalance,
    },
  };
}

function isValidRole(role) {
  return role === 'customer' || role === 'vendor';
}

export const login = asyncHandler(async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.password || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ message: 'Tài khoản hiện không hoạt động' });
  }

  return res.json(createSession(user));
});

export const register = asyncHandler(async (req, res) => {
  const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const role = req.body.role;

  if (!fullName || fullName.length > 120) {
    return res.status(400).json({ message: 'Vui lòng nhập họ tên (tối đa 120 ký tự)' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ message: 'Vui lòng nhập email hợp lệ' });
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ message: 'Mật khẩu cần có ít nhất 8 ký tự và tối đa 72 byte' });
  }
  if (!isValidRole(role)) {
    return res.status(400).json({ message: 'Vai trò tài khoản không hợp lệ' });
  }
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');

  const existingUser = await User.exists({ email });
  if (existingUser) {
    return res.status(409).json({ message: 'Email này đã được đăng ký' });
  }

  const user = await User.create({ email, password, fullName, role, status: 'active' });
  return res.status(201).json(createSession(user));
});

export const googleLogin = asyncHandler(async (req, res) => {
  const credential = typeof req.body.credential === 'string' ? req.body.credential : '';
  const role = req.body.role;
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

  if (!clientId) {
    return res.status(503).json({ message: 'Đăng nhập Google chưa được cấu hình trên máy chủ' });
  }
  if (!credential) {
    return res.status(400).json({ message: 'Thiếu thông tin xác thực Google' });
  }
  if (!isValidRole(role)) {
    return res.status(400).json({ message: 'Vai trò tài khoản không hợp lệ' });
  }
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');

  const googleClient = new OAuth2Client(clientId);
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
  } catch (error) {
    if (error?.response || error?.code) {
      console.error('Google ID token verification service failed', error.message);
      return res.status(502).json({ message: 'Không thể kết nối dịch vụ xác thực Google' });
    }
    return res.status(401).json({ message: 'Không thể xác thực tài khoản Google' });
  }
  const googleUser = ticket.getPayload();
  if (!googleUser?.sub || !googleUser.email || googleUser.email_verified !== true) {
    return res.status(401).json({ message: 'Tài khoản Google chưa xác minh email' });
  }

  const email = googleUser.email.trim().toLowerCase();
  let user = await User.findOne({ email }).select('+googleId');
  if (user) {
    if (user.googleId && user.googleId !== googleUser.sub) {
      return res.status(409).json({ message: 'Email này đã liên kết với tài khoản Google khác' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Tài khoản hiện không hoạt động' });
    }
    if (!user.googleId) {
      user.googleId = googleUser.sub;
      if (!user.avatar && googleUser.picture) user.avatar = googleUser.picture;
      await user.save();
    }
  } else {
    user = await User.create({
      googleId: googleUser.sub,
      email,
      fullName: googleUser.name?.trim() || email.split('@')[0],
      avatar: googleUser.picture || '',
      role,
      status: 'active',
    });
  }

  return res.json(createSession(user));
});
