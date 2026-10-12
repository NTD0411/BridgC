import { create } from 'zustand';

export const useSessionStore = create((set) => ({
  token: localStorage.getItem('bridgc_token'),
  setToken: (token) => {
    if (token) localStorage.setItem('bridgc_token', token);
    else localStorage.removeItem('bridgc_token');
    set({ token });
  },
}));
