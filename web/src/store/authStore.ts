import { create } from 'zustand';
import { api } from '../services/api';

interface User {
  id: number;
  dni: string;
  nombre: string;
  apellido: string;
  role: string;
  avatar_url: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (dni: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('nexus_token'),
  user: null,
  loading: false,
  error: null,

  login: async (dni, password) => {
    set({ loading: true, error: null });
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { dni, password },
      });
      localStorage.setItem('nexus_token', data.token);
      set({ token: data.token, user: data.user, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  logout: async () => {
    const token = get().token;
    if (token) {
      try {
        await api('/auth/logout', { method: 'POST', token });
      } catch {}
    }
    localStorage.removeItem('nexus_token');
    set({ token: null, user: null });
  },

  fetchUser: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const data = await api('/auth/me', { token });
      set({ user: data.user });
    } catch {
      localStorage.removeItem('nexus_token');
      set({ token: null, user: null });
    }
  },

  setToken: (token) => {
    if (token) {
      localStorage.setItem('nexus_token', token);
    } else {
      localStorage.removeItem('nexus_token');
    }
    set({ token });
  },
}));
