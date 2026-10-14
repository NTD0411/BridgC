import { Router } from 'express';
import { geocode, getMapConfig } from '../controllers/mapController.js';

const router = Router();
router.get('/geocode', geocode);
router.get('/config', getMapConfig);

export default router;
