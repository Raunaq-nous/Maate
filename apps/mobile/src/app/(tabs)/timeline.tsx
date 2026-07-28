// ============================================
// MAATE — Health Timeline Screen
// Chronological Health History & Insights
// ============================================

import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay, parseISO } from 'date-fns';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard, Chip } from '@/components/ui';
import { useTimelineStore, TimelineEvent } from '@/store/timelineStore';

const EVENT_CONFIG: Record<string, { icon: any, color: string, label: string }> = {
  DOCUMENT_UPLOADED: { icon: 'document-text', color: Colors.primary[500], label: 'UPLOAD' },
  LAB_RESULT: { icon: 'flask', color: Colors.accent.teal, label: 'LAB' },
  PRESCRIPTION_ADDED: { icon: 'medkit', color: Colors.accent.sky, label: 'RX' },
  VITAL_RECORDED: { icon: 'pulse', color: Colors.status.critical, label: 'VITAL' },
  MEDICATION_STARTED: { icon: 'play-circle', color: Colors.status.normal, label: 'MED START' },
  SYMPTOM_REPORTED: { icon: 'warning', color: Colors.accent.amber, label: 'SYMPTOM' },
  CONDITION_DIAGNOSED: { icon: 'bandage', color: Colors.accent.violet, label: 'DIAGNOSIS' },
  DEFAULT: { icon: 'medical', color: Colors.dark.textSecondary, label: 'EVENT' }
};

export default function TimelineScreen() {
  const { events, isLoading, fetchTimeline, hasMore } = useTimelineStore();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchTimeline(true);
  }, [activeFilter]);

  const groupedEvents = useMemo(() => {
    const groups: { date: string, events: TimelineEvent[] }[] = [];
    events.forEach(event => {
      const dateStr = format(parseISO(event.occurredAt), 'MMMM d, yyyy');
      const group = groups.find(g => g.date === dateStr);
      if (group) {
        group.events.push(event);
      } else {
        groups.push({ date: dateStr, events: [event] });
      }
    });
    return groups;
  }, [events]);

  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
      
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>Health Timeline</Text>
            <Text style={s.sub}>Your medical journey at a glance</Text>
          </View>
          <Pressable style={s.searchBtn}>
            <Ionicons name="search" size={20} color={Colors.dark.textSecondary} />
          </Pressable>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          <FilterChip label="All" active={activeFilter === null} onPress={() => setActiveFilter(null)} />
          <FilterChip label="Reports" active={activeFilter === 'DOCUMENT_UPLOADED'} onPress={() => setActiveFilter('DOCUMENT_UPLOADED')} />
          <FilterChip label="Vitals" active={activeFilter === 'VITAL_RECORDED'} onPress={() => setActiveFilter('VITAL_RECORDED')} />
          <FilterChip label="Meds" active={activeFilter === 'PRESCRIPTION_ADDED'} onPress={() => setActiveFilter('PRESCRIPTION_ADDED')} />
        </ScrollView>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={isLoading && events.length === 0} onRefresh={() => fetchTimeline(true)} tintColor={Colors.primary[500]} />
        }
      >
        {groupedEvents.map((sec, idx) => (
          <View key={sec.date} style={{ marginBottom: 20 }}>
            <View style={s.dateRow}>
              <View style={s.dateDot} />
              <Text style={s.dateText}>{sec.date}</Text>
            </View>
            
            {sec.events.map((ev, evIdx) => {
              const config = (EVENT_CONFIG[ev.eventType] || EVENT_CONFIG['DEFAULT'])!;
              return (
                <View key={ev.id} style={s.evWrap}>
                  {/* Timeline connecting line */}
                  <View style={[s.line, (idx === groupedEvents.length - 1 && evIdx === sec.events.length - 1) && { bottom: '50%' }]} />
                  
                  <GlassCard padding="md" style={s.evCard}>
                    <View style={s.evRow}>
                      <View style={[s.evIcon, { backgroundColor: `${config.color}15` }]}>
                        <Ionicons name={config.icon} size={20} color={config.color} />
                      </View>
                      
                      <View style={{ flex: 1 }}>
                        <View style={s.titleRow}>
                          <Text style={s.evTitle} numberOfLines={1}>{ev.title}</Text>
                          <Chip label={config.label} color={config.color} size="sm" />
                        </View>
                        {ev.description && <Text style={s.evSub} numberOfLines={2}>{ev.description}</Text>}
                        <Text style={s.evTime}>{format(parseISO(ev.occurredAt), 'hh:mm a')}</Text>
                      </View>

                      {ev.isPinned && <Ionicons name="pin" size={14} color={Colors.primary[400]} style={{ alignSelf: 'flex-start' }} />}
                    </View>
                  </GlassCard>
                </View>
              );
            })}
          </View>
        ))}

        {isLoading && events.length > 0 && (
          <ActivityIndicator color={Colors.primary[500]} style={{ marginVertical: 20 }} />
        )}
        
        {!isLoading && events.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={Colors.dark.border} />
            <Text style={s.emptyText}>No events recorded yet</Text>
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) {
  return (
    <Pressable 
      onPress={onPress}
      style={[s.filterChip, active && s.filterChipActive]}
    >
      <Text style={[s.filterLabel, active && s.filterLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.dark.text, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: Colors.dark.textSecondary, marginTop: 4 },
  searchBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.dark.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  filters: { paddingRight: 40, gap: 8, marginBottom: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border },
  filterChipActive: { backgroundColor: Colors.primary[500], borderColor: Colors.primary[500] },
  filterLabel: { fontSize: 14, fontWeight: '600', color: Colors.dark.textSecondary },
  filterLabelActive: { color: 'white' },
  scroll: { paddingHorizontal: Spacing.xl },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 10 },
  dateDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary[500], marginRight: 16, borderWidth: 3, borderColor: `${Colors.primary[500]}33` },
  dateText: { fontSize: 15, fontWeight: '800', color: Colors.dark.text, textTransform: 'uppercase', letterSpacing: 1 },
  evWrap: { paddingLeft: 6, marginLeft: 5, marginBottom: 12 },
  line: { position: 'absolute', left: 0, top: -16, bottom: -16, width: 2, backgroundColor: Colors.dark.border },
  evCard: { marginLeft: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  evRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  evIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 },
  evTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.dark.text },
  evSub: { fontSize: 13, color: Colors.dark.textSecondary, lineHeight: 18, marginBottom: 6 },
  evTime: { fontSize: 11, fontWeight: '600', color: Colors.dark.textMuted, textTransform: 'uppercase' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, color: Colors.dark.textMuted, fontSize: 16 },
});
