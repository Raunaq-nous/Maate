// ============================================
// MAATE UI — GlassCard Component
// Frosted glass surface for elevated content
// ============================================

import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Spacing, Shadows } from '../../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  padding?: keyof typeof Spacing;
  borderRadius?: keyof typeof BorderRadius;
  style?: ViewStyle;
  gradientColors?: readonly [string, string, ...string[]];
}

export function GlassCard({
  children,
  variant = 'default',
  padding = 'base',
  borderRadius = 'xl',
  style,
  gradientColors,
}: GlassCardProps) {
  const containerStyle: ViewStyle = {
    borderRadius: BorderRadius[borderRadius],
    padding: Spacing[padding],
    overflow: 'hidden',
  };

  if (variant === 'gradient' || gradientColors) {
    return (
      <View style={[containerStyle, Shadows.md, styles.gradientOuter, style]}>
        <LinearGradient
          colors={gradientColors ?? (Colors.gradients.glassLight as unknown as [string, string])}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.glassInner}>{children}</View>
      </View>
    );
  }

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: Colors.dark.surface,
      borderWidth: 1,
      borderColor: Colors.dark.border,
    },
    elevated: {
      backgroundColor: Colors.dark.surfaceElevated,
      ...Shadows.lg,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: Colors.dark.borderSubtle,
    },
  };

  return (
    <View style={[containerStyle, variantStyles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  gradientOuter: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  glassInner: {
    position: 'relative',
    zIndex: 1,
  },
});
