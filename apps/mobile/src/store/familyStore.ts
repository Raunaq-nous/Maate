// ============================================
// Mobile — Family Store (Zustand)
// Permission Sharing & Profile Management
// ============================================

import { create } from 'zustand';
import { apiClient } from '../services/api';

export interface FamilyMember {
  id: string;
  fullName: string;
  relationship: string;
  accessLevel?: string;
  isOwner: boolean;
}

interface FamilyState {
  members: FamilyMember[];
  sharedProfiles: FamilyMember[];
  isLoading: boolean;
  
  fetchProfiles: () => Promise<void>;
  addMember: (name: string, relationship: string) => Promise<void>;
  shareAccess: (memberId: string, email: string, level: string) => Promise<void>;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  members: [],
  sharedProfiles: [],
  isLoading: false,

  fetchProfiles: async () => {
    set({ isLoading: true });
    try {
      const { data } = await apiClient.get('/family/profiles');
      set({ 
        members: data.owned, 
        sharedProfiles: data.shared,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to fetch family profiles', error);
    }
  },

  addMember: async (fullName, relationship) => {
    try {
      await apiClient.post('/family/members', { fullName, relationship });
      await get().fetchProfiles();
    } catch (error) {
      console.error('Failed to add member', error);
      throw error;
    }
  },

  shareAccess: async (memberId, email, level) => {
    try {
      await apiClient.post(`/family/members/${memberId}/share`, { 
        granteeEmail: email, 
        level 
      });
    } catch (error) {
      console.error('Failed to share access', error);
      throw error;
    }
  },
}));
