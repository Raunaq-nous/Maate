// ============================================
// MAATE — Report Viewer & OCR Review Screens
// ============================================

import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { GlassCard, StatusBadge, Chip, Button, Divider, SectionHeader } from '../../components/ui';

// Report Viewer: shows AI summary + key findings + original
export default function ReportViewerScreen() {
  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={s.title}>Report Details</Text>
        <Pressable style={s.shareBtn}><Ionicons name="share-social" size={20} color={Colors.primary[400]} /></Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Report Meta */}
        <GlassCard padding="base" style={{ marginBottom: Spacing.base }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={s.reportIcon}><Ionicons name="flask" size={24} color={Colors.primary[400]} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700' as const, color: Colors.dark.text }}>CBC Blood Test</Text>
              <Text style={{ fontSize: 13, color: Colors.dark.textSecondary, marginTop: 2 }}>Apollo Diagnostics · Dr. R. Mehta</Text>
              <Text style={{ fontSize: 12, color: Colors.dark.textMuted, marginTop: 2 }}>May 2, 2026</Text>
            </View>
            <Chip label="LAB REPORT" color={Colors.primary[400]} size="sm" />
          </View>
        </GlassCard>

        {/* AI Summary */}
        <SectionHeader title="AI Summary" subtitle="Powered by GPT-4o" />
        <GlassCard variant="gradient" gradientColors={['rgba(139,92,246,0.1)', 'rgba(99,102,241,0.04)'] as [string, string]} padding="base" style={{ marginBottom: Spacing.xl }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Ionicons name="sparkles" size={18} color={Colors.accent.violet} />
            <Text style={{ fontSize: 13, fontWeight: '600' as const, color: Colors.accent.violet }}>AI Generated Summary</Text>
          </View>
          <Text style={{ fontSize: 14, color: Colors.dark.text, lineHeight: 22 }}>
            Your CBC results are largely within normal ranges. Hemoglobin at 13.5 g/dL is healthy. White blood cell count and platelet count are normal. RBC indices suggest no anemia.
          </Text>
          <Text style={{ fontSize: 11, color: Colors.dark.textMuted, marginTop: 12, fontStyle: 'italic' }}>
            ⚠️ AI-generated summary. Not medical advice. Consult your doctor.
          </Text>
        </GlassCard>

        {/* Key Findings */}
        <SectionHeader title="Key Findings" />
        {[
          { param: 'Hemoglobin', value: '13.5 g/dL', ref: '12.0 – 15.5', status: 'normal' as const },
          { param: 'WBC Count', value: '7,200 /µL', ref: '4,000 – 11,000', status: 'normal' as const },
          { param: 'Platelets', value: '285,000 /µL', ref: '150,000 – 400,000', status: 'normal' as const },
          { param: 'RBC Count', value: '4.8 M/µL', ref: '4.2 – 5.4', status: 'normal' as const },
        ].map((f) => (
          <GlassCard key={f.param} padding="md" style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600' as const, color: Colors.dark.text }}>{f.param}</Text>
                <Text style={{ fontSize: 12, color: Colors.dark.textMuted, marginTop: 2 }}>Ref: {f.ref}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 16, fontWeight: '700' as const, color: Colors.dark.text }}>{f.value}</Text>
                <StatusBadge status={f.status} size="sm" />
              </View>
            </View>
          </GlassCard>
        ))}

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: Spacing.xl }}>
          <Button title="Share with Doctor" onPress={() => {}} variant="secondary" icon="share-social" size="md" style={{ flex: 1 }} />
          <Button title="Ask Maate AI" onPress={() => {}} variant="primary" icon="sparkles" size="md" style={{ flex: 1 }} />
        </View>

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
  shareBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${Colors.primary[500]}15`, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.xl },
  reportIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: `${Colors.primary[500]}12`, alignItems: 'center', justifyContent: 'center' },
});
