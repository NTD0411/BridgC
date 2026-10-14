import { asyncHandler } from '../middleware/errorHandler.js';
import { getWeatherForLocation } from '../services/weatherService.js';

export const getCurrentWeather = asyncHandler(async (req, res) => {
  const location = typeof req.query.location === 'string' ? req.query.location.trim() : 'Da Nang';
  if (location.length > 180) {
    return res.status(400).json({ success: false, message: 'Địa điểm quá dài' });
  }
  const data = await getWeatherForLocation(location);
  return res.json({ success: true, data });
});
