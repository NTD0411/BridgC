import { Router } from 'express';
import {
  getAdminOverview,
  listUsers,
  updateUserStatus,
  updateUserRole,
  updateUserCredits,
  listVendors,
  verifyVendor,
  listRfps,
  updateRfpStatus,
  listReviews,
  updateReviewVisibility,
  deleteReview,
  getSystemHealth,
} from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Protect all admin routes with authentication and admin role requirement
router.use(requireAuth);
router.use(requireRole('admin'));

// Metrics & Overview
router.get('/metrics', getAdminOverview);
router.get('/system', getSystemHealth);

// Users Management
router.get('/users', listUsers);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/credits', updateUserCredits);

// Vendors Management
router.get('/vendors', listVendors);
router.patch('/vendors/:id/verify', verifyVendor);

// RFPs Management
router.get('/rfps', listRfps);
router.patch('/rfps/:id/status', updateRfpStatus);

// Reviews Moderation
router.get('/reviews', listReviews);
router.patch('/reviews/:id/visibility', updateReviewVisibility);
router.delete('/reviews/:id', deleteReview);

export default router;
