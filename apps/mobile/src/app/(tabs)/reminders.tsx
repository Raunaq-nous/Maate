// ============================================
// MAATE — Reminders Screen
// Live Medicine, Water, Meal reminders & adherence
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard, Chip, StatusBadge, Button, EmptyState } from '@/components/ui';
import { apiClient } from '@/services/api';

const tabs = ['Medicine', 'Water', 'Meals'] as const;

interface MedicineItem {
  id: string;
  medicineName: string;
  dosage?: string | null;
  frequency: string;
  timesOfDay: string[];
  daysOfWeek?: number[];
  mealRelation?: string | null;
  instructions?: string | null;
  isActive: boolean;
}

interface WaterItem {
  id: string;
  dailyGoalMl: number;
  intervalMinutes: number;
  activeStart: string;
  activeEnd: string;
  glassSizeMl: number;
  isActive: boolean;
}

interface MealItem {
  id: string;
  mealType: string;
  scheduledTime: string;
  dietaryNotes?: string | null;
  isActive: boolean;
}

interface ReminderLogItem {
  id: string;
  reminderId: string;
  reminderType: string;
  scheduledAt: string;
  response?: string | null;
  notes?: string | null;
}

export default function RemindersScreen() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('Medicine');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [meds, setMeds] = useState<MedicineItem[]>([]);
  const [water, setWater] = useState<WaterItem | null>(null);
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [logs, setLogs] = useState<ReminderLogItem[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchActiveReminders = useCallback(async () => {
    try {
      const res = await apiClient.get('/reminders/active');
      const data = res.data?.data || {};
      setMeds(data.meds || []);
      setWater(data.water || null);
      setMeals(data.meals || []);
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch active reminders', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveReminders();
  }, [fetchActiveReminders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveReminders();
  };

  const handleLogAdherence = async (type: string, id: string, response: 'TAKEN' | 'SKIPPED' | 'SNOOZED') => {
    try {
      setActionLoadingId(id);
      await apiClient.post(`/reminders/${type}/${id}/log`, { response });
      await fetchActiveReminders();
    } catch (err) {
      console.error(`Failed to log response for ${type} ${id}:`, err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getLogForReminder = (id: string) => {
    return logs.find((l) => l.reminderId === id);
  };

  // Water calculation from today's logs
  const waterLogsTaken = logs.filter((l) => l.reminderType === 'WATER' && l.response === 'TAKEN');
  const glassSize = water?.glassSizeMl || 250;
  const currentWaterMl = waterLogsTaken.length * glassSize;
  const goalWaterMl = water?.dailyGoalMl || 2500;
  const waterPercent = Math.min(100, Math.round((currentWaterMl / goalWaterMl) * 100));

  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
      
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Reminders</Text>
        <Text style={s.subtitle}>Stay on track with your health</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={tab === 'Medicine' ? 'medkit' : tab === 'Water' ? 'water' : 'nutrition'}
              size={16}
              color={activeTab === tab ? Colors.primary[400] : Colors.dark.textMuted}
            />
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary[500]} />}
      >
        {loading && !refreshing ? (
          <View style={s.loaderWrap}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
          </View>
        ) : null}

        {/* ─── Medicine Tab ─────────────────────── */}
        {!loading && activeTab === 'Medicine' && (
          meds.length === 0 ? (
            <EmptyState
              icon="medkit-outline"
              title="No Medicine Reminders"
              subtitle="You haven't set up any medicine reminders yet."
            />
          ) : (
            meds.map((med) => {
              const log = getLogForReminder(med.id);
              const isCompleted = log?.response === 'TAKEN';
              const isSnoozed = log?.response === 'SNOOZED';
              const isBusy = actionLoadingId === med.id;

              return (
                <GlassCard key={med.id} padding="base" style={s.card}>
                  <View style={s.row}>
                    <View style={s.medIcon}>
                      <Ionicons name="medkit" size={20} color={Colors.primary[400]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.medName}>{med.medicineName}</Text>
                      <Text style={s.medDose}>
                        {med.dosage || '1 dose'} · {med.mealRelation || 'Any time'}
                      </Text>
                      <View style={s.timesRow}>
                        {med.timesOfDay?.map((t) => (
                          <Chip key={t} label={t} icon="time" color={Colors.accent.teal} size="sm" />
                        ))}
                      </View>
                    </View>
                    <StatusBadge
                      status={isCompleted ? 'normal' : isSnoozed ? 'high' : 'pending'}
                      label={isCompleted ? 'Taken ✅' : isSnoozed ? 'Snoozed' : 'Upcoming'}
                    />
                  </View>

                  {/* Actions */}
                  <View style={s.actionRow}>
                    <Button
                      title={isCompleted ? 'Taken' : 'Mark Taken'}
                      variant={isCompleted ? 'secondary' : 'primary'}
                      size="sm"
                      icon="checkmark-circle"
                      disabled={isCompleted || isBusy}
                      onPress={() => handleLogAdherence('medicine', med.id, 'TAKEN')}
                    />
                    {!isCompleted && (
                      <Button
                        title="Snooze"
                        variant="secondary"
                        size="sm"
                        icon="time-outline"
                        disabled={isBusy}
                        onPress={() => handleLogAdherence('medicine', med.id, 'SNOOZED')}
                      />
                    )}
                  </View>
                </GlassCard>
              );
            })
          )
        )}

        {/* ─── Water Tab ────────────────────────── */}
        {!loading && activeTab === 'Water' && (
          <GlassCard
            variant="gradient"
            gradientColors={['rgba(14,165,233,0.12)', 'rgba(14,165,233,0.04)'] as [string, string]}
            padding="xl"
          >
            <View style={{ alignItems: 'center' }}>
              <View style={s.waterCircle}>
                <Ionicons name="water" size={36} color={Colors.accent.sky} />
                <Text style={s.waterAmount}>{currentWaterMl.toLocaleString()} ml</Text>
                <Text style={s.waterGoal}>of {goalWaterMl.toLocaleString()} ml</Text>
              </View>
              <View style={s.waterBar}>
                <View style={[s.waterBarFill, { width: `${waterPercent}%` }]} />
              </View>
              <Text style={s.waterPercent}>{waterPercent}% of daily goal</Text>
              
              {water ? (
                <Button
                  title={`Log Water (+${water.glassSizeMl || 250}ml)`}
                  onPress={() => handleLogAdherence('water', water.id, 'TAKEN')}
                  variant="secondary"
                  icon="add-circle"
                  size="md"
                  disabled={actionLoadingId === water.id}
                  style={{ marginTop: 16 }}
                />
              ) : (
                <Text style={[s.subtitle, { marginTop: 12 }]}>No water goal set</Text>
              )}
            </View>
          </GlassCard>
        )}

        {/* ─── Meals Tab ────────────────────────── */}
        {!loading && activeTab === 'Meals' && (
          meals.length === 0 ? (
            <EmptyState
              icon="nutrition-outline"
              title="No Meal Reminders"
              subtitle="No scheduled meal reminders found."
            />
          ) : (
            meals.map((meal) => {
              const log = getLogForReminder(meal.id);
              const isEaten = log?.response === 'TAKEN';
              const isBusy = actionLoadingId === meal.id;

              return (
                <GlassCard key={meal.id} padding="base" style={s.card}>
                  <View style={s.row}>
                    <View style={[s.medIcon, { backgroundColor: `${Colors.accent.amber}15` }]}>
                      <Ionicons name="nutrition" size={20} color={Colors.accent.amber} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.medName}>
                        {meal.mealType.charAt(0) + meal.mealType.slice(1).toLowerCase()}
                      </Text>
                      <Text style={s.medDose}>Scheduled: {meal.scheduledTime}</Text>
                      {meal.dietaryNotes ? (
                        <Text style={s.notesText}>{meal.dietaryNotes}</Text>
                      ) : null}
                    </View>
                    <StatusBadge
                      status={isEaten ? 'normal' : 'pending'}
                      label={isEaten ? 'Eaten ✅' : 'Upcoming'}
                    />
                  </View>

                  <View style={s.actionRow}>
                    <Button
                      title={isEaten ? 'Eaten' : 'Mark Eaten'}
                      variant={isEaten ? 'secondary' : 'primary'}
                      size="sm"
                      icon="checkmark-circle"
                      disabled={isEaten || isBusy}
                      onPress={() => handleLogAdherence('meal', meal.id, 'TAKEN')}
                    />
                  </View>
                </GlassCard>
              );
            })
          )
        )}

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
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: { backgroundColor: Colors.dark.surfaceElevated },
  tabText: { fontSize: 13, fontWeight: '600' as const, color: Colors.dark.textMuted },
  tabTextActive: { color: Colors.primary[400] },
  scroll: { paddingHorizontal: Spacing.xl },
  card: { marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  medIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Colors.primary[500]}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medName: { fontSize: 15, fontWeight: '600' as const, color: Colors.dark.text },
  medDose: { fontSize: 13, color: Colors.dark.textSecondary, marginTop: 2 },
  notesText: { fontSize: 11, color: Colors.dark.textMuted, fontStyle: 'italic', marginTop: 2 },
  timesRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  waterCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: `${Colors.accent.sky}30`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  waterAmount: { fontSize: 28, fontWeight: '800' as const, color: Colors.accent.sky, marginTop: 4 },
  waterGoal: { fontSize: 13, color: Colors.dark.textSecondary },
  waterBar: { width: '100%', height: 8, backgroundColor: Colors.dark.border, borderRadius: 4 },
  waterBarFill: { height: 8, backgroundColor: Colors.accent.sky, borderRadius: 4 },
  waterPercent: { fontSize: 13, color: Colors.dark.textSecondary, marginTop: 8 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  loaderWrap: { paddingVertical: 40, alignItems: 'center' },
});
