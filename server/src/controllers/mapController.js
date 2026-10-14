import { asyncHandler } from '../middleware/errorHandler.js';
import { geocodeLocation, buildMapUrls } from '../services/googleMapsService.js';

export const geocode = asyncHandler(async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!query) {
    return res.status(400).json({ success: false, message: 'Tham số q (địa điểm/địa chỉ) là bắt buộc' });
  }

  const result = await geocodeLocation(query);
  return res.json({ success: true, ...result });
});

export const getMapConfig = asyncHandler(async (req, res) => {
  const hasGoogleKey = Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim());
  return res.json({
    hasKey: hasGoogleKey,
    provider: hasGoogleKey ? 'Google Maps JavaScript API' : 'Google Maps Embed & Open Geocoding Fallback',
    note: hasGoogleKey
      ? 'Google Maps API key đã được cấu hình trên server.'
      : 'Chưa cấu hình GOOGLE_MAPS_API_KEY. Hệ thống đang sử dụng Google Maps Embed và Geocoding mở miễn phí.',
  });
});
