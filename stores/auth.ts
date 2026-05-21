import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User, AuthTokens } from '@/types';
import { authService } from '@/services/auth';

const ACCESS_TOKEN_KEY = 'scanit_access_token';
const REFRESH_TOKEN_KEY = 'scanit_refresh_token';
const USER_KEY = 'scanit_user';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signUp: (name: string, email: string, password: string, role: 'consumer' | 'seller') => Promise<boolean>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      const [accessToken, refreshToken, userStr] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);

      if (accessToken && userStr) {
        const user = JSON.parse(userStr) as User;
        set({
          user,
          tokens: { accessToken, refreshToken: refreshToken ?? '', expiresAt: 0 },
          isInitialized: true,
        });
      } else {
        set({ isInitialized: true });
      }
    } catch {
      set({ isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    const res = await authService.login({ email, password });
    if (!res.success) {
      set({ isLoading: false, error: res.message ?? 'Login failed' });
      return false;
    }
    const { user, tokens } = res.data;
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    set({ user, tokens, isLoading: false, error: null });
    return true;
  },

  signUp: async (name, email, password, role) => {
    set({ isLoading: true, error: null });
    const res = await authService.signUp({ name, email, password, role });
    if (!res.success) {
      set({ isLoading: false, error: res.message ?? 'Sign up failed' });
      return false;
    }
    const { user, tokens } = res.data;
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    set({ user, tokens, isLoading: false, error: null });
    return true;
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    set({ user: null, tokens: null });
  },

  clearError: () => set({ error: null }),

  updateUser: (updates) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates };
    set({ user: updated });
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated)).catch(() => null);
  },
}));
