import { Router } from 'express';
import { getCurrentWeather } from '../controllers/weatherController.js';

const router = Router();
router.get('/current', getCurrentWeather);
export default router;
