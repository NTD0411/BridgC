import { create } from 'zustand';

function getTokenRole(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null;
    return payload.role === 'customer' || payload.role === 'vendor' || payload.role === 'admin'
      ? payload.role
      : null;
  } catch {
    return null;
  }
}

export const useSessionStore = create((set) => {
  const logout = () => {
    localStorage.removeItem('bridgc_token');
    localStorage.removeItem('bridgc_user');
    set({ token: null, role: null, user: null });
  };

  const storedToken = localStorage.getItem('bridgc_token');
  let storedUser = null;
  try {
    storedUser = JSON.parse(localStorage.getItem('bridgc_user') || 'null');
  } catch {
    localStorage.removeItem('bridgc_user');
  }

  return {
    token: storedToken,
    role: getTokenRole(storedToken),
    user: storedUser,
    setSession: (token, user) => {
      if (token) localStorage.setItem('bridgc_token', token);
      else localStorage.removeItem('bridgc_token');
      if (user) localStorage.setItem('bridgc_user', JSON.stringify(user));
      else localStorage.removeItem('bridgc_user');
      set({ token, role: getTokenRole(token), user: user || null });
    },
    logout,
  };
});
