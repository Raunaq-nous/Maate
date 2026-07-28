// ============================================
// MAATE — Reminders Screen
// Medicine, Water, Meal reminders
// ============================================

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard, Chip, StatusBadge, SectionHeader, Button } from '@/components/ui';

const tabs = ['Medicine', 'Water', 'Meals'] as const;

const medicines = [
  { id: '1', name: 'Metformin 500mg', dosage: '1 tablet', times: ['7:00 AM', '9:00 PM'], meal: 'After Meal', active: true },
  { id: '2', name: 'Amlodipine 5mg', dosage: '1 tablet', times: ['8:00 AM'], meal: 'Any Time', active: true },
  { id: '3', name: 'Atorvastatin 10mg', dosage: '1 tablet', times: ['9:00 PM'], meal: 'After Meal', active: true },
];

export default function RemindersScreen() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('Medicine');

  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
      <View style={s.header}>
        <Text style={s.title}>Reminders</Text>
        <Text style={s.subtitle}>Stay on track with your health</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {tabs.map((tab) => (
          <Pressable key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
            <Ionicons name={tab === 'Medicine' ? 'medkit' : tab === 'Water' ? 'water' : 'nutrition'} size={16}
              color={activeTab === tab ? Colors.primary[400] : Colors.dark.textMuted} />
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {activeTab === 'Medicine' && medicines.map((med) => (
          <GlassCard key={med.id} padding="base" style={s.card}>
            <View style={s.row}>
              <View style={s.medIcon}><Ionicons name="medkit" size={20} color={Colors.primary[400]} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.medName}>{med.name}</Text>
                <Text style={s.medDose}>{med.dosage} · {med.meal}</Text>
                <View style={s.timesRow}>
                  {med.times.map((t) => <Chip key={t} label={t} icon="time" color={Colors.accent.teal} size="sm" />)}
                </View>
              </View>
              <StatusBadge status="normal" label="Active" />
            </View>
          </GlassCard>
        ))}

        {activeTab === 'Water' && (
          <GlassCard variant="gradient" gradientColors={['rgba(14,165,233,0.12)', 'rgba(14,165,233,0.04)'] as [string, string]} padding="xl">
            <View style={{ alignItems: 'center' }}>
              <View style={s.waterCircle}>
                <Ionicons name="water" size={36} color={Colors.accent.sky} />
                <Text style={s.waterAmount}>1,800 ml</Text>
                <Text style={s.waterGoal}>of 2,500 ml</Text>
              </View>
              <View style={s.waterBar}>
                <View style={[s.waterBarFill, { width: '72%' }]} />
              </View>
              <Text style={s.waterPercent}>72% of daily goal</Text>
              <Button title="Log Water (+250ml)" onPress={() => {}} variant="secondary" icon="add-circle" size="md" style={{ marginTop: 16 }} />
            </View>
          </GlassCard>
        )}

        {activeTab === 'Meals' && ['Breakfast', 'Lunch', 'Dinner'].map((meal) => (
          <GlassCard key={meal} padding="base" style={s.card}>
            <View style={s.row}>
              <View style={[s.medIcon, { backgroundColor: `${Colors.accent.amber}15` }]}>
                <Ionicons name="nutrition" size={20} color={Colors.accent.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.medName}>{meal}</Text>
                <Text style={s.medDose}>{meal === 'Breakfast' ? '8:00 AM' : meal === 'Lunch' ? '1:00 PM' : '7:30 PM'}</Text>
              </View>
              <StatusBadge status="pending" label="Upcoming" />
            </View>
          </GlassCard>
        ))}

        <Button title="Add New Reminder" onPress={() => {}} variant="primary" icon="add-circle" fullWidth size="lg" style={{ marginTop: 20 }} />
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  title: { fontSize: Typography.sizes.title1, fontWeight: Typography.weights.bold, color: Colors.dark.text },
  subtitle: { fontSize: Typography.sizes.body, color: Colors.dark.textSecondary, marginTop: 4 },
  tabs: { flexDirection: 'row', marginHorizontal: Spacing.xl, backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  tabActive: { backgroundColor: Colors.dark.surfaceElevated },
  tabText: { fontSize: 13, fontWeight: '600' as const, color: Colors.dark.textMuted },
  tabTextActive: { color: Colors.primary[400] },
  scroll: { paddingHorizontal: Spacing.xl },
  card: { marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  medIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: `${Colors.primary[500]}15`, alignItems: 'center', justifyContent: 'center' },
  medName: { fontSize: 15, fontWeight: '600' as const, color: Colors.dark.text },
  medDose: { fontSize: 13, color: Colors.dark.textSecondary, marginTop: 2 },
  timesRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  waterCircle: { width: 160, height: 160, borderRadius: 80, borderWidth: 4, borderColor: `${Colors.accent.sky}30`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  waterAmount: { fontSize: 28, fontWeight: '800' as const, color: Colors.accent.sky, marginTop: 4 },
  waterGoal: { fontSize: 13, color: Colors.dark.textSecondary },
  waterBar: { width: '100%', height: 8, backgroundColor: Colors.dark.border, borderRadius: 4 },
  waterBarFill: { height: 8, backgroundColor: Colors.accent.sky, borderRadius: 4 },
  waterPercent: { fontSize: 13, color: Colors.dark.textSecondary, marginTop: 8 },
});
