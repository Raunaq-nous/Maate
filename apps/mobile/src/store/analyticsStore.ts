// ============================================
// Mobile — Analytics Store (Zustand)
// Dashboard Data & Period Management
// ============================================

import { create } from 'zustand';
import { apiClient } from '../services/api';

export type PeriodKey = '7D' | '1M' | '3M' | '6M' | '1Y';

export interface AdherenceData {
  rate: number;
  taken: number;
  skipped: number;
  missed: number;
  total: number;
  dailyChart: { date: string; rate: number }[];
}

export interface WaterData {
  avgLitres: string;
  bestLitres: string;
  goalHitDays: number;
  totalDays: number;
  dailyChart: { date: string; litres: number }[];
}

export interface SleepData {
  avgHours: number;
  bestHours: number;
  worstHours: number;
  dailyChart: { date: string; hours: number }[];
}

export interface HealthTrend {
  parameter: string;
  value: string;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
  status: 'normal' | 'high' | 'low';
  trend: string;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
  sparkline: number[];
}

export interface HealthScoreData {
  score: number;
  breakdown: {
    adherence: { weight: number; value: number };
    labResults: { weight: number; value: number };
    activity: { weight: number; value: number };
  };
}

interface AnalyticsState {
  period: PeriodKey;
  isLoading: boolean;
  adherence: AdherenceData | null;
  waterIntake: WaterData | null;
  sleepTrends: SleepData | null;
  healthTrends: HealthTrend[];
  healthScore: HealthScoreData | null;

  setPeriod: (p: PeriodKey) => void;
  fetchDashboard: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  period: '3M',
  isLoading: false,
  adherence: null,
  waterIntake: null,
  sleepTrends: null,
  healthTrends: [],
  healthScore: null,

  setPeriod: (period) => {
    set({ period });
    get().fetchDashboard();
  },

  fetchDashboard: async () => {
    set({ isLoading: true });
    try {
      const { data } = await apiClient.get('/analytics/dashboard', {
        params: { period: get().period },
      });
      set({
        adherence: data.data.adherence,
        waterIntake: data.data.waterIntake,
        sleepTrends: data.data.sleepTrends,
        healthTrends: data.data.healthTrends,
        healthScore: data.data.healthScore,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      console.error('Failed to fetch analytics', err);
    }
  },
}));
