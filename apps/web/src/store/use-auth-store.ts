// ============================================
// Auth Store — Session & User State
// ============================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserProfile, FamilyMemberResponse } from "@maate/shared-types";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface Profile {
  id: string;
  fullName: string;
  relationship: string;
  gender?: string | null;
  dateOfBirth?: string | Date | null;
  avatarUrl?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  selectedProfileId: string | null;
  profiles: Profile[];
  setAuth: (user: User, token: string, refreshToken?: string | null) => void;
  logout: () => void;
  setSelectedProfileId: (id: string | null) => void;
  setProfiles: (profiles: Profile[]) => void;
  fetchProfiles: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      selectedProfileId: null,
      profiles: [],
      setAuth: (user, token, refreshToken) => {
        const effectiveRefreshToken = refreshToken ?? get().refreshToken;
        set({
          user,
          token,
          refreshToken: effectiveRefreshToken,
          isAuthenticated: true,
          selectedProfileId: user.id,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("maate_token", token);
          if (effectiveRefreshToken) {
            localStorage.setItem("maate_refresh_token", effectiveRefreshToken);
          }
          const isSecure = window.location.protocol === "https:";
          document.cookie = `maate_token=${token}; path=/; max-age=2592000; SameSite=Lax${isSecure ? "; Secure" : ""}`;
        }
      },
      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          selectedProfileId: null,
          profiles: [],
        });
        if (typeof window !== "undefined") {
          localStorage.removeItem("maate_token");
          localStorage.removeItem("maate_refresh_token");
          document.cookie = "maate_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        }
      },
      setSelectedProfileId: (id) => set({ selectedProfileId: id }),
      setProfiles: (profiles) => set({ profiles }),
      fetchProfiles: async () => {
        const state = get();
        if (!state.user || !state.token) return;

        try {
          const { default: apiClient } = await import("@/lib/api");
          const res = await apiClient.get("/family/profiles");
          const { owned = [], shared = [] } = res.data;

          const selfProfile: Profile = {
            id: state.user.id,
            fullName: state.user.fullName,
            relationship: "SELF",
          };

          const allProfiles = [
            selfProfile,
            ...owned,
            ...shared,
          ];

          set({ profiles: allProfiles });

          const currentSelected = state.selectedProfileId;
          if (!currentSelected || !allProfiles.some((p) => p.id === currentSelected)) {
            set({ selectedProfileId: state.user.id });
          }
        } catch (error) {
          console.error("Failed to fetch family profiles:", error);
        }
      },
    }),
    {
      name: "maate-auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
