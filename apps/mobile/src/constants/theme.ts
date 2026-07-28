// ============================================
// MAATE — Design System Tokens
// Inspired by: Apple Health × Headspace × Notion
// ============================================

export const Colors = {
  // ─── Core Brand ─────────────────────────────
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1', // Main brand - Indigo
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },
  // ─── Accent (Health/Vitality) ───────────────
  accent: {
    teal: '#14B8A6',
    emerald: '#10B981',
    sky: '#0EA5E9',
    rose: '#F43F5E',
    amber: '#F59E0B',
    violet: '#8B5CF6',
  },
  // ─── Semantic ──────────────────────────────
  status: {
    normal: '#10B981',
    low: '#F59E0B',
    high: '#F97316',
    critical: '#EF4444',
    info: '#3B82F6',
  },
  // ─── Dark Theme (Primary) ──────────────────
  dark: {
    bg: '#0A0E1A',
    surface: '#111827',
    surfaceElevated: '#1A2035',
    surfaceHover: '#1E293B',
    border: '#1F2937',
    borderSubtle: '#374151',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#0F172A',
  },
  // ─── Light Theme ───────────────────────────
  light: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    surfaceHover: '#E2E8F0',
    border: '#E2E8F0',
    borderSubtle: '#CBD5E1',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textInverse: '#F8FAFC',
  },
  // ─── Gradients ─────────────────────────────
  gradients: {
    primary: ['#6366F1', '#8B5CF6'],
    health: ['#10B981', '#14B8A6'],
    warm: ['#F59E0B', '#F97316'],
    danger: ['#EF4444', '#F43F5E'],
    ocean: ['#0EA5E9', '#6366F1'],
    night: ['#0A0E1A', '#1A2035'],
    card: ['rgba(99, 102, 241, 0.08)', 'rgba(139, 92, 246, 0.04)'],
    glassLight: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)'],
    glassDark: ['rgba(17,24,39,0.7)', 'rgba(26,32,53,0.5)'],
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

export const Typography = {
  sizes: {
    caption: 11,
    footnote: 13,
    body: 15,
    callout: 16,
    headline: 17,
    title3: 20,
    title2: 22,
    title1: 28,
    largeTitle: 34,
    hero: 42,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  }),
} as const;

export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 0.8,
  },
} as const;
