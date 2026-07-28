// ============================================
// MAATE — Notifications Center
// ============================================

import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard } from '@/components/ui';

const notifications = [
  { id: '1', type: 'reminder', title: 'Medicine Due', body: 'Time to take Amlodipine 5mg', time: '2 min ago', read: false, icon: 'alarm' as const, color: Colors.accent.amber },
  { id: '2', type: 'alert', title: 'Report Ready', body: 'Your CBC blood test summary is ready', time: '1 hr ago', read: false, icon: 'sparkles' as const, color: Colors.accent.violet },
  { id: '3', type: 'info', title: 'Water Reminder', body: "You're at 60% of your daily water goal", time: '3 hrs ago', read: true, icon: 'water' as const, color: Colors.accent.sky },
  { id: '4', type: 'escalation', title: 'Missed Medicine Alert', body: 'Your father missed Metformin. Tap to follow up.', time: '5 hrs ago', read: true, icon: 'warning' as const, color: Colors.accent.rose },
  { id: '5', type: 'info', title: 'Health Insight', body: 'Your blood sugar trend improved by 8% this month', time: 'Yesterday', read: true, icon: 'trending-up' as const, color: Colors.status.normal },
];

export default function NotificationsScreen() {
  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={s.title}>Notifications</Text>
        <Pressable><Text style={{ fontSize: 13, color: Colors.primary[400], fontWeight: '600' as const }}>Mark all read</Text></Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {notifications.map((n) => (
          <GlassCard key={n.id} padding="md" style={{ ...s.card, ...(!n.read ? s.unread : {}) }}>
            <View style={s.row}>
              <View style={[s.icon, { backgroundColor: `${n.color}15` }]}>
                <Ionicons name={n.icon} size={20} color={n.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.notifTitle}>{n.title}</Text>
                  {!n.read && <View style={s.dot} />}
                </View>
                <Text style={s.notifBody}>{n.body}</Text>
                <Text style={s.notifTime}>{n.time}</Text>
              </View>
            </View>
          </GlassCard>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.base },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.dark.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Typography.sizes.headline, fontWeight: Typography.weights.bold, color: Colors.dark.text },
  scroll: { paddingHorizontal: Spacing.xl },
  card: { marginBottom: Spacing.sm },
  unread: { borderLeftWidth: 3, borderLeftColor: Colors.primary[500] },
  row: { flexDirection: 'row', gap: Spacing.md },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary[500] },
  notifTitle: { fontSize: 15, fontWeight: '600' as const, color: Colors.dark.text },
  notifBody: { fontSize: 13, color: Colors.dark.textSecondary, marginTop: 2, lineHeight: 18 },
  notifTime: { fontSize: 11, color: Colors.dark.textMuted, marginTop: 4 },
});
