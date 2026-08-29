// ============================================
// Maate API Client — Axios Foundation
// HIPAA-ready · Secure · Automated Token Refresh
// ============================================

import axios, { InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/use-auth-store";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1",
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const state = useAuthStore.getState();
  let token = state.token;

  // Fallback to localStorage or cookie if Zustand hasn't hydrated yet
  if (!token && typeof window !== "undefined") {
    token = localStorage.getItem("maate_token");
  }
  if (!token && typeof window !== "undefined") {
    const match = document.cookie.match(/(?:^|; )maate_token=([^;]*)/);
    token = match ? decodeURIComponent(match[1]) : null;
  }

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const selectedProfileId = state.selectedProfileId;
  const primaryUserId = state.user?.id;
  if (selectedProfileId && selectedProfileId !== primaryUserId && config.headers) {
    config.headers["x-patient-id"] = selectedProfileId;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken =
          useAuthStore.getState().refreshToken ||
          (typeof window !== "undefined" ? localStorage.getItem("maate_refresh_token") : null);

        if (!storedRefreshToken) {
          throw new Error("No refresh token available");
        }

        const res = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { refreshToken: storedRefreshToken },
          { headers: { "ngrok-skip-browser-warning": "true" } }
        );

        const newAccessToken = res.data.accessToken || res.data.token;
        const newRefreshToken = res.data.refreshToken || storedRefreshToken;
        const currentUser = res.data.user || useAuthStore.getState().user;

        if (!newAccessToken) {
          throw new Error("No access token returned from refresh endpoint");
        }

        useAuthStore.getState().setAuth(currentUser, newAccessToken, newRefreshToken);
        apiClient.defaults.headers.common["Authorization"] = "Bearer " + newAccessToken;
        originalRequest.headers["Authorization"] = "Bearer " + newAccessToken;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

