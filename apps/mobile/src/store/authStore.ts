// ============================================
// Mobile — Auth Store (Zustand)
// Supports email/password, OTP, OAuth, biometric
// ============================================

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { UserProfile, AuthResponse } from '@maate/shared-types';
import { apiClient } from '../services/api';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricSessionId: string | null;

  // Actions
  setAuth: (response: AuthResponse) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<AuthResponse>;
  loginWithPassword: (email: string, password: string) => Promise<AuthResponse>;
  loginWithOtp: (phone: string, otp: string) => Promise<AuthResponse>;
  loginWithOAuth: (provider: 'google' | 'apple', idToken: string, fullName?: string) => Promise<AuthResponse>;
  loginWithBiometric: () => Promise<AuthResponse>;
  registerBiometric: (biometricKey: string) => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  biometricSessionId: null,

  // ─── Core: persist tokens + update state ────
  setAuth: async (response: AuthResponse) => {
    await SecureStore.setItemAsync('accessToken', response.accessToken);
    await SecureStore.setItemAsync('refreshToken', response.refreshToken);
    set({ user: response.user, isAuthenticated: true });
  },

  // ─── Email/Password Register ────────────────
  register: async (email, password, fullName) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', {
      email, password, fullName,
    });
    await get().setAuth(data);
    return data;
  },

  // ─── Email/Password Login ───────────────────
  loginWithPassword: async (email, password) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', {
      email, password,
    });
    await get().setAuth(data);
    return data;
  },

  // ─── OTP Login ──────────────────────────────
  sendOtp: async (phone) => {
    await apiClient.post('/auth/send-otp', { phone });
  },

  loginWithOtp: async (phone, otp) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/verify-otp', {
      phone, otp,
    });
    await get().setAuth(data);
    return data;
  },

  // ─── OAuth Login ────────────────────────────
  loginWithOAuth: async (provider, idToken, fullName?) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/oauth', {
      provider, idToken, fullName,
    });
    await get().setAuth(data);
    return data;
  },

  // ─── Biometric ──────────────────────────────
  registerBiometric: async (biometricKey) => {
    const { data } = await apiClient.post('/auth/biometric/register', {
      biometricKey,
    });
    await SecureStore.setItemAsync('biometricSessionId', data.sessionId);
    set({ biometricSessionId: data.sessionId });
  },

  loginWithBiometric: async () => {
    const sessionId = await SecureStore.getItemAsync('biometricSessionId');
    if (!sessionId) throw new Error('No biometric session found');

    // In production: use expo-local-authentication to get signature
    const signature = 'biometric-verified'; // placeholder

    const { data } = await apiClient.post<AuthResponse>('/auth/biometric/login', {
      sessionId, signature,
    });
    await get().setAuth(data);
    return data;
  },

  // ─── Password Reset ────────────────────────
  forgotPassword: async (email) => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token, newPassword) => {
    await apiClient.post('/auth/reset-password', { token, newPassword });
  },

  // ─── Logout ────────────────────────────────
  logout: async () => {
    try { await apiClient.post('/auth/logout'); } catch { /* ignore */ }
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  // ─── Check existing auth ───────────────────
  checkAuth: async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    const biometricSessionId = await SecureStore.getItemAsync('biometricSessionId');
    set({
      isAuthenticated: !!token,
      isLoading: false,
      biometricSessionId,
    });
  },
}));
