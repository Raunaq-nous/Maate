// ============================================
// MAATE — Onboarding Screen
// 3-step carousel with gradient illustrations
// ============================================

import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { Button } from '@/components/ui';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: 'document-text' as const,
    title: 'All Your Health\nIn One Place',
    subtitle: 'Upload prescriptions, lab reports, and medical documents. Our AI reads, organizes, and summarizes them for you.',
    gradientColors: ['#6366F1', '#8B5CF6'] as [string, string],
    iconBg: 'rgba(99,102,241,0.15)',
  },
  {
    id: '2',
    icon: 'alarm' as const,
    title: 'Never Miss a\nMedicine Again',
    subtitle: 'Smart reminders for medicines, water intake, and meals — with family escalation if you miss a dose.',
    gradientColors: ['#10B981', '#14B8A6'] as [string, string],
    iconBg: 'rgba(16,185,129,0.15)',
  },
  {
    id: '3',
    icon: 'chatbubble-ellipses' as const,
    title: 'Your AI Health\nAssistant',
    subtitle: 'Ask questions about your reports, track health trends, and share records securely with your doctor.',
    gradientColors: ['#0EA5E9', '#6366F1'] as [string, string],
    iconBg: 'rgba(14,165,233,0.15)',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/login');
  };

  const renderSlide = ({ item }: { item: typeof slides[0] }) => (
    <View style={[styles.slide, { width }]}>
      {/* Illustration Circle */}
      <View style={styles.illustrationContainer}>
        <LinearGradient
          colors={item.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.illustrationGradient}
        />
        <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon} size={64} color="#FFF" />
        </View>
        {/* Decorative dots */}
        <View style={[styles.dot, styles.dot1]} />
        <View style={[styles.dot, styles.dot2]} />
        <View style={[styles.dot, styles.dot3]} />
      </View>

      {/* Text */}
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.dark.bg, Colors.dark.surface]}
        style={StyleSheet.absoluteFill}
      />

      {/* Skip button */}
      <Pressable style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        scrollEventThrottle={16}
      />

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {/* Pagination dots */}
        <View style={styles.pagination}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.paginationDot,
                i === currentIndex
                  ? styles.paginationDotActive
                  : styles.paginationDotInactive,
              ]}
            />
          ))}
        </View>

        <Button
          title={currentIndex === slides.length - 1 ? 'Get Started' : 'Continue'}
          onPress={handleNext}
          size="lg"
          fullWidth
          icon={currentIndex === slides.length - 1 ? 'sparkles' : 'arrow-forward'}
          iconPosition="right"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  skipButton: { position: 'absolute', top: 60, right: 24, zIndex: 10, padding: 8 },
  skipText: { color: Colors.dark.textSecondary, fontSize: Typography.sizes.callout, fontWeight: Typography.weights.medium },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['2xl'] },
  illustrationContainer: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['3xl'] },
  illustrationGradient: { position: 'absolute', width: 220, height: 220, borderRadius: 110, opacity: 0.2 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(99,102,241,0.4)' },
  dot1: { top: 20, right: 30 },
  dot2: { bottom: 30, left: 20 },
  dot3: { top: 80, left: 10 },
  title: { fontSize: Typography.sizes.largeTitle, fontWeight: Typography.weights.bold, color: Colors.dark.text, textAlign: 'center', lineHeight: 42, marginBottom: Spacing.base },
  subtitle: { fontSize: Typography.sizes.body, color: Colors.dark.textSecondary, textAlign: 'center', lineHeight: 24 },
  bottomSection: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing['4xl'] },
  pagination: { flexDirection: 'row', justifyContent: 'center', marginBottom: Spacing.xl },
  paginationDot: { height: 4, borderRadius: 2, marginHorizontal: 4 },
  paginationDotActive: { width: 24, backgroundColor: Colors.primary[500] },
  paginationDotInactive: { width: 8, backgroundColor: Colors.dark.borderSubtle },
});
