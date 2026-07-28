// ============================================
// MAATE — Analytics Dashboard Screen
// Data-Driven Charts, Trends, Health Score
// ============================================

import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard, SectionHeader, StatusBadge, Chip } from '@/components/ui';
import {
  useAnalyticsStore,
  PeriodKey,
  HealthTrend,
} from '@/store/analyticsStore';

const periods: PeriodKey[] = ['7D', '1M', '3M', '6M', '1Y'];

export default function AnalyticsScreen() {
  const {
    period, setPeriod, fetchDashboard, isLoading,
    adherence, waterIntake, sleepTrends, healthTrends, healthScore,
  } = useAnalyticsStore();

  useEffect(() => { fetchDashboard(); }, []);

  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={s.title}>Analytics</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Period Picker */}
        <View style={s.periodRow}>
          {periods.map((p) => (
            <Pressable key={p} style={[s.periodChip, period === p && s.periodChipActive]} onPress={() => setPeriod(p)}>
              <Text style={[s.periodText, period === p && s.periodTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        {isLoading && !adherence ? (
          <View style={s.loaderWrap}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
          </View>
        ) : (
          <>
            {/* ─── Health Score Ring ─────────────── */}
            <GlassCard padding="xl" style={s.scoreCard}>
              <View style={s.scoreRow}>
                <View style={s.ringOuter}>
                  <LinearGradient
                    colors={[Colors.primary[500], Colors.accent.violet]}
                    style={s.ringGrad}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <View style={s.ringInner}>
                      <Text style={s.scoreValue}>{healthScore?.score ?? '--'}</Text>
                      <Text style={s.scoreLabel}>Health Score</Text>
                    </View>
                  </LinearGradient>
                </View>
                <View style={s.breakdownCol}>
                  <BreakdownRow label="Medicine" value={healthScore?.breakdown.adherence.value ?? 0} color={Colors.primary[500]} />
                  <BreakdownRow label="Lab Results" value={healthScore?.breakdown.labResults.value ?? 0} color={Colors.accent.teal} />
                  <BreakdownRow label="Activity" value={healthScore?.breakdown.activity.value ?? 0} color={Colors.accent.amber} />
                </View>
              </View>
            </GlassCard>

            {/* ─── Medication Adherence ──────────── */}
            <GlassCard variant="gradient" gradientColors={Colors.gradients.primary as unknown as [string, string]} padding="xl" style={{ marginBottom: Spacing.xl }}>
              <Text style={s.cardHeader}>Medicine Adherence</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                <Text style={s.adherenceValue}>{adherence?.rate ?? '--'}</Text>
                <Text style={s.adherenceUnit}>%</Text>
              </View>

              {/* Adherence Bar Chart */}
              <View style={s.chartContainer}>
                {(adherence?.dailyChart ?? []).slice(-14).map((d: any, i: number) => (
                  <View key={i} style={s.barCol}>
                    <View style={[s.bar, { height: Math.max(4, d.rate * 0.6), backgroundColor: d.rate >= 80 ? '#FFF' : 'rgba(255,255,255,0.35)' }]} />
                  </View>
                ))}
              </View>

              <View style={s.adherenceStatsRow}>
                {[
                  { l: 'Taken', v: adherence?.taken ?? 0 },
                  { l: 'Skipped', v: adherence?.skipped ?? 0 },
                  { l: 'Missed', v: adherence?.missed ?? 0 },
                ].map(st => (
                  <View key={st.l} style={{ alignItems: 'center' }}>
                    <Text style={s.statValue}>{st.v}</Text>
                    <Text style={s.statLabel}>{st.l}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>

            {/* ─── Health Trends Grid ───────────── */}
            <SectionHeader title="Health Trends" subtitle={`Last ${period}`} />
            <View style={s.trendsGrid}>
              {(healthTrends ?? []).map((card: HealthTrend) => (
                <GlassCard key={card.parameter} padding="base" style={s.trendCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.trendLabel}>{card.parameter}</Text>
                    <StatusBadge status={card.status as any} size="sm" />
                  </View>
                  <Text style={s.trendValue}>
                    {card.value} <Text style={s.trendUnit}>{card.unit}</Text>
                  </Text>

                  {/* Sparkline */}
                  <View style={s.sparkline}>
                    {(card.sparkline ?? []).map((h: number, i: number) => {
                      const max = Math.max(...card.sparkline, 1);
                      const barH = (h / max) * 50;
                      return (
                        <View
                          key={i}
                          style={[
                            s.sparkBar,
                            {
                              height: Math.max(4, barH),
                              backgroundColor: card.status === 'normal' ? Colors.status.normal
                                : card.status === 'high' ? Colors.status.high
                                : Colors.status.low,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                    <Ionicons
                      name={card.trendDirection === 'UP' ? 'trending-up' : card.trendDirection === 'DOWN' ? 'trending-down' : 'remove'}
                      size={14}
                      color={card.trend.startsWith('+') ? Colors.status.high : Colors.status.normal}
                    />
                    <Text style={{ fontSize: 12, color: card.trend.startsWith('+') ? Colors.status.high : Colors.status.normal, fontWeight: '600' }}>
                      {card.trend}
                    </Text>
                    <Text style={{ fontSize: 11, color: Colors.dark.textMuted }}> vs prev</Text>
                  </View>
                </GlassCard>
              ))}
            </View>

            {/* ─── Water Intake ──────────────────── */}
            <SectionHeader title="Water Intake" subtitle="Daily tracking" />
            <GlassCard padding="lg" style={{ marginBottom: Spacing.xl }}>
              {/* Water bar chart */}
              <View style={s.waterChart}>
                {(waterIntake?.dailyChart ?? []).slice(-10).map((d: any, i: number) => {
                  const maxH = 60;
                  const barH = Math.min(maxH, (d.litres / 3.5) * maxH);
                  const goalMet = d.litres >= 2.5;
                  return (
                    <View key={i} style={s.waterBarCol}>
                      <View style={[s.waterBar, { height: Math.max(4, barH), backgroundColor: goalMet ? Colors.accent.sky : `${Colors.accent.sky}40` }]} />
                      <Text style={s.waterBarLabel}>{d.litres}L</Text>
                    </View>
                  );
                })}
              </View>
              <View style={s.waterStatsRow}>
                {[
                  { l: 'Avg/Day', v: `${waterIntake?.avgLitres ?? '--'}L`, c: Colors.accent.sky },
                  { l: 'Goal Hit', v: `${waterIntake?.goalHitDays ?? 0}/${waterIntake?.totalDays ?? 0}`, c: Colors.status.normal },
                  { l: 'Best', v: `${waterIntake?.bestLitres ?? '--'}L`, c: Colors.accent.amber },
                ].map(st => (
                  <View key={st.l} style={{ alignItems: 'center' }}>
                    <Text style={[s.waterStatVal, { color: st.c }]}>{st.v}</Text>
                    <Text style={s.waterStatLabel}>{st.l}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>

            {/* ─── Sleep Trends ──────────────────── */}
            <SectionHeader title="Sleep Quality" subtitle="Nightly hours" />
            <GlassCard padding="lg" style={{ marginBottom: Spacing.xl }}>
              <View style={s.sleepChart}>
                {(sleepTrends?.dailyChart ?? []).slice(-10).map((d: any, i: number) => {
                  const maxH = 60;
                  const barH = Math.min(maxH, (d.hours / 10) * maxH);
                  const good = d.hours >= 7;
                  return (
                    <View key={i} style={s.waterBarCol}>
                      <View style={[s.waterBar, { height: Math.max(4, barH), backgroundColor: good ? Colors.accent.violet : `${Colors.accent.violet}40` }]} />
                      <Text style={s.waterBarLabel}>{d.hours}h</Text>
                    </View>
                  );
                })}
              </View>
              <View style={s.waterStatsRow}>
                {[
                  { l: 'Average', v: `${sleepTrends?.avgHours ?? '--'}h`, c: Colors.accent.violet },
                  { l: 'Best', v: `${sleepTrends?.bestHours ?? '--'}h`, c: Colors.status.normal },
                  { l: 'Worst', v: `${sleepTrends?.worstHours ?? '--'}h`, c: Colors.status.critical },
                ].map(st => (
                  <View key={st.l} style={{ alignItems: 'center' }}>
                    <Text style={[s.waterStatVal, { color: st.c }]}>{st.v}</Text>
                    <Text style={s.waterStatLabel}>{st.l}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function BreakdownRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.breakdownRow}>
      <View style={s.breakdownInfo}>
        <View style={[s.breakdownDot, { backgroundColor: color }]} />
        <Text style={s.breakdownLabel}>{label}</Text>
      </View>
      <View style={s.breakdownBarBg}>
        <View style={[s.breakdownBarFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.breakdownValue}>{value}%</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.base },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.dark.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Typography.sizes.headline, fontWeight: Typography.weights.bold, color: Colors.dark.text },
  scroll: { paddingHorizontal: Spacing.xl },
  loaderWrap: { marginTop: 100, alignItems: 'center' },

  // Period Picker
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.xl },
  periodChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border },
  periodChipActive: { backgroundColor: `${Colors.primary[500]}15`, borderColor: Colors.primary[500] },
  periodText: { fontSize: 13, fontWeight: '600' as const, color: Colors.dark.textMuted },
  periodTextActive: { color: Colors.primary[400] },

  // Health Score Ring
  scoreCard: { marginBottom: Spacing.xl },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  ringOuter: { width: 110, height: 110, borderRadius: 55 },
  ringGrad: { flex: 1, borderRadius: 55, padding: 6 },
  ringInner: { flex: 1, borderRadius: 49, backgroundColor: Colors.dark.surface, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontSize: 36, fontWeight: '900' as const, color: Colors.dark.text },
  scoreLabel: { fontSize: 10, color: Colors.dark.textMuted, fontWeight: '700' as const, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  breakdownCol: { flex: 1, gap: 12 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakdownInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 80 },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { fontSize: 12, color: Colors.dark.textSecondary, fontWeight: '600' as const },
  breakdownBarBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.dark.bg },
  breakdownBarFill: { height: 6, borderRadius: 3 },
  breakdownValue: { fontSize: 12, fontWeight: '700' as const, color: Colors.dark.text, width: 34, textAlign: 'right' },

  // Adherence
  cardHeader: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  adherenceValue: { fontSize: 42, fontWeight: '800' as const, color: '#FFF' },
  adherenceUnit: { fontSize: 20, color: 'rgba(255,255,255,0.5)', marginLeft: 2 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 65, marginTop: 16 },
  barCol: { flex: 1, alignItems: 'center' },
  bar: { width: '100%', borderRadius: 2 },
  adherenceStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  statValue: { fontSize: 16, fontWeight: '700' as const, color: '#FFF' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  // Trends Grid
  trendsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  trendCard: { width: '48.5%' },
  trendLabel: { fontSize: 13, color: Colors.dark.textSecondary, fontWeight: '500' as const },
  trendValue: { fontSize: 22, fontWeight: '800' as const, color: Colors.dark.text, marginTop: 4 },
  trendUnit: { fontSize: 13, fontWeight: '400' as const, color: Colors.dark.textMuted },
  sparkline: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 55, marginTop: 12 },
  sparkBar: { flex: 1, borderRadius: 2, opacity: 0.7 },

  // Water & Sleep Charts
  waterChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80, marginBottom: 16 },
  sleepChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80, marginBottom: 16 },
  waterBarCol: { flex: 1, alignItems: 'center' },
  waterBar: { width: '80%', borderRadius: 4 },
  waterBarLabel: { fontSize: 9, color: Colors.dark.textMuted, marginTop: 4, fontWeight: '600' as const },
  waterStatsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.dark.border },
  waterStatVal: { fontSize: 20, fontWeight: '700' as const },
  waterStatLabel: { fontSize: 11, color: Colors.dark.textMuted, marginTop: 4 },
});
