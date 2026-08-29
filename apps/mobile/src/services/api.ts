// ============================================
// Mobile — API Client Configuration
// ============================================

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env['EXPO_PUBLIC_API_URL'] || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor: attach JWT ─────────
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: handle 401 ────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = data.accessToken || data.data?.accessToken;
        const newRefreshToken = data.refreshToken || data.data?.refreshToken;

        if (!newAccessToken) {
          throw new Error('No access token returned from refresh endpoint');
        }

        await SecureStore.setItemAsync('accessToken', newAccessToken);
        if (newRefreshToken) {
          await SecureStore.setItemAsync('refreshToken', newRefreshToken);
        }

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — force logout
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        // TODO: Navigate to login screen
      }
    }

    return Promise.reject(error);
  },
);
