// ============================================
// MAATE UI — Chip, Badge, Avatar, Divider
// Small reusable design atoms
// ============================================

import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography } from '../../constants/theme';

// ─── Chip ──────────────────────────────────
interface ChipProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  variant?: 'filled' | 'outlined';
  size?: 'sm' | 'md';
}

export function Chip({ label, icon, color = Colors.primary[500], variant = 'filled', size = 'sm' }: ChipProps) {
  const isFilled = variant === 'filled';
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: isFilled ? `${color}18` : 'transparent',
          borderColor: `${color}40`,
          borderWidth: isFilled ? 0 : 1,
          paddingVertical: size === 'sm' ? 4 : 6,
          paddingHorizontal: size === 'sm' ? 10 : 14,
        },
      ]}
    >
      {icon && <Ionicons name={icon} size={size === 'sm' ? 12 : 14} color={color} style={{ marginRight: 4 }} />}
      <Text style={[styles.chipText, { color, fontSize: size === 'sm' ? 11 : 13 }]}>{label}</Text>
    </View>
  );
}

// ─── StatusBadge ───────────────────────────
interface StatusBadgeProps {
  status: 'normal' | 'low' | 'high' | 'critical' | 'info' | 'pending';
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const colorMap: Record<string, string> = {
    normal: Colors.status.normal,
    low: Colors.status.low,
    high: Colors.status.high,
    critical: Colors.status.critical,
    info: Colors.status.info,
    pending: Colors.dark.textMuted,
  };
  const c = colorMap[status] ?? Colors.dark.textMuted;
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={[styles.badge, { backgroundColor: `${c}18` }]}>
      <View style={[styles.badgeDot, { backgroundColor: c }]} />
      <Text style={[styles.badgeText, { color: c, fontSize: size === 'sm' ? 11 : 13 }]}>{displayLabel}</Text>
    </View>
  );
}

// ─── Avatar ───────────────────────────────
interface AvatarProps {
  name: string;
  size?: number;
  imageUrl?: string;
  color?: string;
}

export function Avatar({ name, size = 40, color }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const bgColor = color ?? Colors.primary[600];

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

// ─── SectionHeader ────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {action && (
        <Text style={styles.sectionAction} onPress={action.onPress}>
          {action.label}
        </Text>
      )}
    </View>
  );
}

// ─── Divider ──────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ─── EmptyState ───────────────────────────
interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name={icon} size={32} color={Colors.primary[400]} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.full },
  chipText: { fontWeight: Typography.weights.semibold, letterSpacing: 0.2 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  badgeText: { fontWeight: Typography.weights.semibold },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: Typography.weights.bold },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.sizes.title3, fontWeight: Typography.weights.bold, color: Colors.dark.text },
  sectionSubtitle: { fontSize: Typography.sizes.footnote, color: Colors.dark.textSecondary, marginTop: 2 },
  sectionAction: { fontSize: Typography.sizes.footnote, fontWeight: Typography.weights.semibold, color: Colors.primary[400] },
  divider: { height: 1, backgroundColor: Colors.dark.border, marginVertical: Spacing.md },
  emptyContainer: { alignItems: 'center', paddingVertical: Spacing['4xl'] },
  emptyIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: `${Colors.primary[500]}15`, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.base },
  emptyTitle: { fontSize: Typography.sizes.headline, fontWeight: Typography.weights.semibold, color: Colors.dark.text, marginBottom: Spacing.xs },
  emptySubtitle: { fontSize: Typography.sizes.body, color: Colors.dark.textSecondary, textAlign: 'center', paddingHorizontal: Spacing['3xl'] },
});
