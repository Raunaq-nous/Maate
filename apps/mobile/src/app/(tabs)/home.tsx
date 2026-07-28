// ============================================
// MAATE — Dashboard / Home Screen
// Health command center with quick actions
// ============================================

import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { GlassCard, SectionHeader, StatusBadge, Avatar, Chip } from '@/components/ui';

// Mock data
const todayReminders = [
  { id: '1', name: 'Metformin 500mg', time: '07:00 AM', status: 'taken' as const, icon: 'medkit' as const },
  { id: '2', name: 'Amlodipine 5mg', time: '08:00 AM', status: 'pending' as const, icon: 'medkit' as const },
  { id: '3', name: 'Drink Water', time: '09:30 AM', status: 'pending' as const, icon: 'water' as const },
];

const recentDocs = [
  { id: '1', title: 'Blood Test - CBC', date: 'May 2, 2026', type: 'LAB_REPORT', status: 'COMPLETED' as const },
  { id: '2', title: 'Chest X-Ray', date: 'Apr 28, 2026', type: 'IMAGING', status: 'COMPLETED' as const },
];

const quickActions = [
  { id: '1', icon: 'cloud-upload' as const, label: 'Upload\nReport', color: Colors.primary[500], gradient: Colors.gradients.primary },
  { id: '2', icon: 'scan' as const, label: 'Scan\nPrescription', color: Colors.accent.teal, gradient: Colors.gradients.health },
  { id: '3', icon: 'chatbubble-ellipses' as const, label: 'Ask\nMaate AI', color: Colors.accent.sky, gradient: Colors.gradients.ocean },
  { id: '4', icon: 'share-social' as const, label: 'Share with\nDoctor', color: Colors.accent.amber, gradient: Colors.gradients.warm },
];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Good Morning 👋</Text>
            <Text style={styles.userName}>Priya</Text>
          </View>
          <Pressable style={styles.notificationButton} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={24} color={Colors.dark.text} />
            <View style={styles.notificationBadge} />
          </Pressable>
          <Avatar name="Priya Sharma" size={44} />
        </View>

        {/* Health Score Card */}
        <GlassCard variant="gradient" gradientColors={Colors.gradients.primary as unknown as [string, string]} style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <View>
              <Text style={styles.scoreLabel}>Health Score</Text>
              <View style={styles.scoreValueRow}>
                <Text style={styles.scoreValue}>82</Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                <Chip label="3 tests normal" icon="checkmark-circle" color="#10B981" />
              </View>
            </View>
            <View style={styles.scoreCircle}>
              <Ionicons name="pulse" size={28} color="#FFF" />
            </View>
          </View>
          <View style={styles.scoreBar}>
            <View style={styles.scoreBarFill} />
          </View>
          <View style={styles.scoreMetrics}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>92%</Text>
              <Text style={styles.metricLabel}>Adherence</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricValue}>1.8L</Text>
              <Text style={styles.metricLabel}>Water</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricValue}>3</Text>
              <Text style={styles.metricLabel}>Reports</Text>
            </View>
          </View>
        </GlassCard>

        {/* Quick Actions */}
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [
                styles.quickAction,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Today's Reminders */}
        <SectionHeader
          title="Today's Schedule"
          subtitle={`${todayReminders.filter((r) => r.status === 'taken').length}/${todayReminders.length} completed`}
          action={{ label: 'View All', onPress: () => router.push('/(tabs)/reminders') }}
        />
        <View style={styles.remindersList}>
          {todayReminders.map((reminder) => (
            <GlassCard key={reminder.id} padding="md" style={styles.reminderCard}>
              <View style={styles.reminderRow}>
                <View style={[styles.reminderIcon, {
                  backgroundColor: reminder.status === 'taken' ? `${Colors.status.normal}15` : `${Colors.primary[500]}15`,
                }]}>
                  <Ionicons
                    name={reminder.icon}
                    size={20}
                    color={reminder.status === 'taken' ? Colors.status.normal : Colors.primary[400]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reminderName}>{reminder.name}</Text>
                  <Text style={styles.reminderTime}>{reminder.time}</Text>
                </View>
                {reminder.status === 'taken' ? (
                  <Ionicons name="checkmark-circle" size={24} color={Colors.status.normal} />
                ) : (
                  <StatusBadge status="pending" label="Due" />
                )}
              </View>
            </GlassCard>
          ))}
        </View>

        {/* Recent Documents */}
        <SectionHeader
          title="Recent Documents"
          action={{ label: 'See All', onPress: () => router.push('/documents') }}
        />
        {recentDocs.map((doc) => (
          <GlassCard key={doc.id} padding="md" style={styles.docCard}>
            <View style={styles.docRow}>
              <View style={styles.docIcon}>
                <Ionicons name="document-text" size={22} color={Colors.primary[400]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>{doc.title}</Text>
                <Text style={styles.docDate}>{doc.date}</Text>
              </View>
              <Chip label={doc.type.replace('_', ' ')} color={Colors.accent.teal} size="sm" />
            </View>
          </GlassCard>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  scrollContent: { paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl, gap: Spacing.md },
  greeting: { fontSize: Typography.sizes.body, color: Colors.dark.textSecondary },
  userName: { fontSize: Typography.sizes.title1, fontWeight: Typography.weights.bold, color: Colors.dark.text },
  notificationButton: { padding: 8, position: 'relative' },
  notificationBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent.rose },
  scoreCard: { marginHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  scoreLabel: { fontSize: Typography.sizes.footnote, color: 'rgba(255,255,255,0.7)', fontWeight: Typography.weights.medium },
  scoreValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  scoreValue: { fontSize: Typography.sizes.hero, fontWeight: Typography.weights.heavy, color: '#FFF' },
  scoreMax: { fontSize: Typography.sizes.title3, color: 'rgba(255,255,255,0.5)', marginLeft: 2, fontWeight: Typography.weights.medium },
  scoreCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  scoreBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, marginTop: Spacing.base, marginBottom: Spacing.base },
  scoreBarFill: { height: 6, width: '82%', backgroundColor: '#FFF', borderRadius: 3 },
  scoreMetrics: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  metric: { alignItems: 'center' },
  metricValue: { fontSize: Typography.sizes.headline, fontWeight: Typography.weights.bold, color: '#FFF' },
  metricLabel: { fontSize: Typography.sizes.caption, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  metricDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.xl, gap: Spacing.md, marginBottom: Spacing.xl },
  quickAction: { width: '47%', backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, borderWidth: 1, borderColor: Colors.dark.border, alignItems: 'center' },
  quickActionIcon: { width: 48, height: 48, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  quickActionLabel: { fontSize: Typography.sizes.footnote, fontWeight: Typography.weights.semibold, color: Colors.dark.text, textAlign: 'center', lineHeight: 18 },
  remindersList: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.xl },
  reminderCard: { marginBottom: 0 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  reminderIcon: { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  reminderName: { fontSize: Typography.sizes.body, fontWeight: Typography.weights.semibold, color: Colors.dark.text },
  reminderTime: { fontSize: Typography.sizes.caption, color: Colors.dark.textMuted, marginTop: 2 },
  docCard: { marginHorizontal: Spacing.xl, marginBottom: Spacing.sm },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  docIcon: { width: 40, height: 40, borderRadius: BorderRadius.md, backgroundColor: `${Colors.primary[500]}15`, alignItems: 'center', justifyContent: 'center' },
  docTitle: { fontSize: Typography.sizes.body, fontWeight: Typography.weights.semibold, color: Colors.dark.text },
  docDate: { fontSize: Typography.sizes.caption, color: Colors.dark.textMuted, marginTop: 2 },
});
