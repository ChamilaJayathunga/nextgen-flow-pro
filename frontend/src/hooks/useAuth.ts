'use client';

import { create } from 'zustand';
import { post, get } from '@/lib/api';
import { setToken, removeToken, setUser, getToken } from '@/lib/auth';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await post<{ token: string; user: User }>('/auth/login', {
        email,
        password,
      });
      setToken(response.token);
      setUser(response.user as unknown as Record<string, unknown>);
      set({ user: response.user, isAuthenticated: true, isLoading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Login failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await post<{ token: string; user: User }>(
        '/auth/register',
        { name, email, password }
      );
      setToken(response.token);
      setUser(response.user as unknown as Record<string, unknown>);
      set({ user: response.user, isAuthenticated: true, isLoading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Registration failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    removeToken();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = getToken();
    if (!token) {
      set({ user: null, isAuthenticated: false });
      return;
    }
    set({ isLoading: true });
    try {
      const user = await get<User>('/auth/me');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      removeToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
