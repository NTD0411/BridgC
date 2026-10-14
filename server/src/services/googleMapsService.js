import axios from 'axios';

export async function geocodeLocation(query) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) {
    throw new Error('Địa điểm hoặc địa chỉ tìm kiếm không được để trống');
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  // 1. If Google Maps API key is configured, query Google Geocoding API
  if (apiKey) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address: cleanQuery, key: apiKey, language: 'vi' },
        timeout: 8000,
      });
      if (response.data?.status === 'OK' && response.data.results?.length) {
        const result = response.data.results[0];
        const { lat, lng } = result.geometry.location;
        return {
          formattedAddress: result.formatted_address || cleanQuery,
          lat,
          lng,
          placeId: result.place_id,
          provider: 'Google Maps API',
          mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.formatted_address || cleanQuery)}`,
          directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
          embedUrl: `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(result.formatted_address || cleanQuery)}`,
        };
      }
    } catch (googleError) {
      console.warn('Google Maps Geocoding failed, falling back to open geocoding:', googleError.message);
    }
  }

  // 2. Open-Meteo & OpenStreetMap Geocoding Fallback (Free, No API Key required)
  try {
    const response = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
      params: { name: cleanQuery, count: 1, language: 'vi', format: 'json' },
      timeout: 8000,
    });
    const place = response.data?.results?.[0];
    if (place) {
      const lat = place.latitude;
      const lng = place.longitude;
      const addressName = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
      return {
        formattedAddress: addressName,
        lat,
        lng,
        placeId: String(place.id),
        provider: 'Open Geocoding (Miễn phí)',
        mapUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        embedUrl: `https://maps.google.com/maps?q=${lat},${lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`,
      };
    }
  } catch (openGeoError) {
    console.warn('Open geocoding failed:', openGeoError.message);
  }

  // 3. Fallback direct Google Maps embed and link via address query string
  return {
    formattedAddress: cleanQuery,
    lat: 16.0544,
    lng: 108.2022,
    placeId: null,
    provider: 'Google Maps Direct',
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanQuery)}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cleanQuery)}`,
    embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(cleanQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`,
  };
}

export function buildMapUrls(addressOrLocation) {
  const query = encodeURIComponent(String(addressOrLocation || 'Đà Nẵng').trim());
  return {
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${query}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
    embedUrl: `https://maps.google.com/maps?q=${query}&t=&z=14&ie=UTF8&iwloc=&output=embed`,
  };
}
