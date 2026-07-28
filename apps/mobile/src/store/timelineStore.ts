// ============================================
// Mobile — Timeline Store (Zustand)
// Global Health History State
// ============================================

import { create } from 'zustand';
import { apiClient } from '../services/api';
import { TimelineEventType } from '@maate/database';

export interface TimelineEvent {
  id: string;
  eventType: TimelineEventType;
  title: string;
  description?: string;
  metadata?: any;
  occurredAt: string;
  isPinned: boolean;
}

interface TimelineState {
  events: TimelineEvent[];
  isLoading: boolean;
  page: number;
  hasMore: boolean;
  
  fetchTimeline: (reset?: boolean, type?: string) => Promise<void>;
  togglePin: (id: string, status: boolean) => Promise<void>;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  events: [],
  isLoading: false,
  page: 1,
  hasMore: true,

  fetchTimeline: async (reset = false, type) => {
    if (get().isLoading) return;
    
    const currentPage = reset ? 1 : get().page;
    set({ isLoading: true });

    try {
      const { data } = await apiClient.get('/timeline', {
        params: {
          page: currentPage,
          limit: 20,
          ...(type && { type }),
        },
      });

      const newEvents = data.data;
      set({
        events: reset ? newEvents : [...get().events, ...newEvents],
        page: currentPage + 1,
        hasMore: newEvents.length === 20,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to fetch timeline', error);
    }
  },

  togglePin: async (id, status) => {
    try {
      await apiClient.patch(`/timeline/${id}/pin`, { isPinned: status });
      set((state) => ({
        events: state.events.map((e) => e.id === id ? { ...e, isPinned: status } : e),
      }));
    } catch (error) {
      console.error('Failed to toggle pin', error);
    }
  },
}));
