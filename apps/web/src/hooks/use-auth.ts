// ============================================
// Maate Auth — useAuth Hook
// Central logic for login, register, and social
// ============================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/use-auth-store";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";
import { LoginInput, RegisterInput } from "@/lib/auth.schema";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth, logout: storeLogout } = useAuthStore();
  const { toast } = useToast();
  const router = useRouter();

  const login = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const { rememberMe, ...loginPayload } = data;
      const res = await apiClient.post("/auth/login", loginPayload);
      const { user, accessToken, token, refreshToken } = res.data;
      
      setAuth(user, accessToken || token, refreshToken);
      toast({
        title: "Welcome back!",
        description: "Secure session initialized.",
      });
      router.push("/dashboard");
    } catch (err: any) {
      const message = err.response?.data?.message;
      toast({
        variant: "destructive",
        title: "Login failed",
        description: Array.isArray(message) ? message[0] : message || "Please check your credentials.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      const { confirmPassword, terms, ...registerPayload } = data;
      await apiClient.post("/auth/register", registerPayload);
      toast({
        title: "Account created",
        description: "Please verify your email to continue.",
      });
      router.push(`/verify-otp?email=${data.email}`);
    } catch (err: any) {
      const message = err.response?.data?.message;
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: Array.isArray(message) ? message[0] : message || "Something went wrong.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore network or token errors during logout
    }
    storeLogout();
    router.push("/login");
  };

  const socialAuth = (provider: 'google' | 'apple') => {
    // In production: Redirect to /api/auth/[provider]
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/${provider}`;
  };

  return {
    login,
    register,
    logout,
    socialAuth,
    isLoading,
  };
}
