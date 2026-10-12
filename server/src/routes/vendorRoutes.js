import { Router } from 'express';
import {
  compareVendors,
  getVendorBySlug,
  getVendorDashboard,
  saveVendorProfile,
  searchVendors,
  suggestVendors,
} from '../controllers/vendorController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.get('/', searchVendors);
router.get('/suggest', suggestVendors);
router.get('/compare', compareVendors);
router.get('/me/dashboard', requireAuth, requireRole('vendor'), getVendorDashboard);
router.put('/me/profile', requireAuth, requireRole('vendor'), saveVendorProfile);
router.get('/:slug', getVendorBySlug);
export default router;
