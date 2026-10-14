import axios from 'axios';

const WEATHER_API_URL = 'https://api.weatherapi.com/v1';

// WMO code mapper for Open-Meteo
function mapWmoCode(code) {
  if (code === 0) return { condition: 'Trời quang đãng', icon: 'https://cdn.weatherapi.com/weather/64x64/day/113.png' };
  if ([1, 2].includes(code)) return { condition: 'Ít mây / Trời nắng', icon: 'https://cdn.weatherapi.com/weather/64x64/day/116.png' };
  if (code === 3) return { condition: 'Nhiều mây', icon: 'https://cdn.weatherapi.com/weather/64x64/day/119.png' };
  if ([45, 48].includes(code)) return { condition: 'Có sương mù', icon: 'https://cdn.weatherapi.com/weather/64x64/day/248.png' };
  if ([51, 53, 55].includes(code)) return { condition: 'Mưa phùn nhẹ', icon: 'https://cdn.weatherapi.com/weather/64x64/day/266.png' };
  if ([61, 63, 65].includes(code)) return { condition: 'Mưa rào', icon: 'https://cdn.weatherapi.com/weather/64x64/day/296.png' };
  if ([80, 81, 82].includes(code)) return { condition: 'Mưa rào lớn', icon: 'https://cdn.weatherapi.com/weather/64x64/day/308.png' };
  if ([95, 96, 99].includes(code)) return { condition: 'Giông bão', icon: 'https://cdn.weatherapi.com/weather/64x64/day/389.png' };
  return { condition: 'Có mây rải rác', icon: 'https://cdn.weatherapi.com/weather/64x64/day/116.png' };
}

function mapWeatherPayload(payload, forecastDay) {
  const current = forecastDay?.day
    ? {
        temp_c: forecastDay.day.avgtemp_c,
        feelslike_c: forecastDay.day.avgtemp_c,
        condition: forecastDay.day.condition?.text || '',
        icon: forecastDay.day.condition?.icon || '',
        humidity: forecastDay.day.avghumidity,
        wind_kph: forecastDay.day.maxwind_kph,
        precip_mm: forecastDay.day.totalprecip_mm,
        chance_of_rain: forecastDay.day.daily_chance_of_rain,
        uv: forecastDay.day.uv,
        is_day: 1,
      }
    : {
        temp_c: payload.current.temp_c,
        feelslike_c: payload.current.feelslike_c,
        condition: payload.current.condition?.text || '',
        icon: payload.current.condition?.icon || '',
        humidity: payload.current.humidity,
        wind_kph: payload.current.wind_kph,
        precip_mm: payload.current.precip_mm,
        chance_of_rain: payload.current.precip_mm > 0 ? 80 : payload.current.cloud,
        uv: payload.current.uv,
        is_day: payload.current.is_day,
      };

  return {
    city: payload.location.name,
    region: payload.location.region,
    country: payload.location.country,
    lat: payload.location.lat,
    lng: payload.location.lon,
    localtime: payload.location.localtime,
    forecastDate: forecastDay?.date || null,
    provider: 'WeatherAPI',
    ...current,
    icon: current.icon?.startsWith('//') ? `https:${current.icon}` : current.icon,
  };
}

async function getWeatherFromOpenMeteo(location, eventDate) {
  const query = String(location || '').trim() || 'Đà Nẵng';
  // 1. Geocode location using Open-Meteo Geocoding API (free, no key required)
  const geoRes = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
    params: { name: query, count: 1, language: 'vi', format: 'json' },
    timeout: 8000,
  });

  const place = geoRes.data?.results?.[0] || {
    name: query,
    latitude: 16.0678,
    longitude: 108.2208,
    country: 'Việt Nam',
    admin1: query,
  };

  // 2. Fetch forecast
  const weatherRes = await axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: place.latitude,
      longitude: place.longitude,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max',
      timezone: 'auto',
    },
    timeout: 8000,
  });

  const current = weatherRes.data?.current || {};
  const daily = weatherRes.data?.daily || {};
  const code = current.weather_code ?? 1;
  const mapped = mapWmoCode(code);

  return {
    city: place.name || query,
    region: place.admin1 || place.name || 'Việt Nam',
    country: place.country || 'Việt Nam',
    lat: place.latitude,
    lng: place.longitude,
    localtime: current.time || new Date().toISOString(),
    forecastDate: eventDate || null,
    temp_c: Math.round(current.temperature_2m ?? 27),
    feelslike_c: Math.round(current.apparent_temperature ?? 29),
    condition: mapped.condition,
    icon: mapped.icon,
    humidity: current.relative_humidity_2m ?? 75,
    wind_kph: Math.round((current.wind_speed_10m ?? 2) * 3.6),
    precip_mm: current.precipitation ?? 0,
    chance_of_rain: daily.precipitation_probability_max?.[0] ?? (current.precipitation > 0 ? 80 : 20),
    uv: daily.uv_index_max?.[0] ?? 6,
    is_day: 1,
    provider: 'Open-Meteo (Miễn phí)',
  };
}

function getFallbackWeather(location, eventDate) {
  const cityName = String(location || '').trim() || 'Đà Nẵng';
  return {
    city: cityName,
    region: 'Việt Nam',
    country: 'Việt Nam',
    lat: 16.0544,
    lng: 108.2022,
    localtime: new Date().toISOString(),
    forecastDate: eventDate || null,
    temp_c: 28,
    feelslike_c: 30,
    condition: 'Thời tiết ấm áp, thuận lợi',
    icon: 'https://cdn.weatherapi.com/weather/64x64/day/116.png',
    humidity: 70,
    wind_kph: 12,
    precip_mm: 0,
    chance_of_rain: 15,
    uv: 6,
    is_day: 1,
    provider: 'Dự báo dự phòng',
  };
}

export async function getWeatherForLocation(location, eventDate) {
  const apiKey = process.env.WEATHER_API_KEY?.trim();
  const query = String(location || '').trim() || 'Da Nang';

  // 1. Try WeatherAPI if key is provided
  if (apiKey) {
    try {
      const requestedDate = eventDate ? new Date(eventDate) : null;
      const isValidDate = requestedDate && !Number.isNaN(requestedDate.getTime());
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const localDateKey = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
      const daysAhead = isValidDate ? Math.round((new Date(localDateKey(requestedDate)).getTime() - today.getTime()) / 86400000) : 0;

      if (isValidDate && daysAhead >= 0 && daysAhead <= 14) {
        const { data } = await axios.get(`${WEATHER_API_URL}/forecast.json`, {
          params: { key: apiKey, q: query, days: Math.min(Math.max(daysAhead + 1, 1), 14), lang: 'vi', aqi: 'no' },
          timeout: 10000,
        });
        const match = data.forecast?.forecastday?.find((day) => day.date === localDateKey(requestedDate))
          || data.forecast?.forecastday?.at(-1);
        return mapWeatherPayload(data, match);
      }

      const { data } = await axios.get(`${WEATHER_API_URL}/current.json`, {
        params: { key: apiKey, q: query, lang: 'vi', aqi: 'no' },
        timeout: 10000,
      });
      return mapWeatherPayload(data);
    } catch (weatherApiError) {
      console.warn('WeatherAPI call failed, switching to Open-Meteo:', weatherApiError.message);
    }
  }

  // 2. If WeatherAPI key is not present or failed, use Open-Meteo (free, no key needed)
  try {
    return await getWeatherFromOpenMeteo(query, eventDate);
  } catch (openMeteoError) {
    console.warn('Open-Meteo call failed, using default climate data:', openMeteoError.message);
  }

  // 3. Fallback to climate estimates so service NEVER crashes
  return getFallbackWeather(query, eventDate);
}

