// ============================================
// MAATE UI — Button Component
// Primary action button with haptic feedback
// ============================================

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const sizeConfig = {
    sm: { height: 36, px: Spacing.md, fontSize: Typography.sizes.footnote, iconSize: 16 },
    md: { height: 48, px: Spacing.lg, fontSize: Typography.sizes.callout, iconSize: 20 },
    lg: { height: 56, px: Spacing.xl, fontSize: Typography.sizes.headline, iconSize: 22 },
  };

  const config = sizeConfig[size];

  const renderContent = () => {
    const textColor =
      variant === 'ghost' || variant === 'secondary'
        ? Colors.primary[400]
        : '#FFFFFF';

    if (loading) {
      return <ActivityIndicator color={textColor} size="small" />;
    }

    return (
      <>
        {icon && iconPosition === 'left' && (
          <Ionicons
            name={icon}
            size={config.iconSize}
            color={textColor}
            style={{ marginRight: Spacing.sm }}
          />
        )}
        <Text
          style={[
            styles.text,
            {
              fontSize: config.fontSize,
              color: textColor,
              fontWeight: Typography.weights.semibold,
            },
          ]}
        >
          {title}
        </Text>
        {icon && iconPosition === 'right' && (
          <Ionicons
            name={icon}
            size={config.iconSize}
            color={textColor}
            style={{ marginLeft: Spacing.sm }}
          />
        )}
      </>
    );
  };

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.container,
          {
            height: config.height,
            paddingHorizontal: config.px,
            opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          fullWidth && styles.fullWidth,
          style,
        ]}
      >
        <LinearGradient
          colors={Colors.gradients.primary as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.lg }]}
        />
        {renderContent()}
      </Pressable>
    );
  }

  const variantStyles: Record<string, { bg: ViewStyle; text: TextStyle }> = {
    secondary: {
      bg: {
        backgroundColor: 'rgba(99, 102, 241, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
      },
      text: { color: Colors.primary[400] },
    },
    ghost: {
      bg: { backgroundColor: 'transparent' },
      text: { color: Colors.primary[400] },
    },
    danger: {
      bg: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
      text: { color: Colors.accent.rose },
    },
    success: {
      bg: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
      text: { color: Colors.accent.emerald },
    },
  };

  const vs = (variantStyles[variant] ?? variantStyles['secondary'])!;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.container,
        vs.bg,
        {
          height: config.height,
          paddingHorizontal: config.px,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          borderRadius: BorderRadius.lg,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {renderContent()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    letterSpacing: 0.3,
  },
});
