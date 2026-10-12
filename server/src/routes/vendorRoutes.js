import { Router } from 'express';
import { searchVendors, suggestVendors } from '../controllers/vendorController.js';

const router = Router();
router.get('/', searchVendors);
router.get('/suggest', suggestVendors);
export default router;
