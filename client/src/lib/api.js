export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export function assetUrl(url) {
  if (typeof url !== 'string' || !url) return '';
  if (url.startsWith('/api/')) return `${API_URL}${url}`;
  return url;
}

export async function apiRequest(path, { token, ...options } = {}) {
  if (import.meta.env.PROD && !API_URL) {
    throw new Error('VITE_API_URL is not configured for the production build');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Request failed (${response.status})`);
  }
  return payload;
}
