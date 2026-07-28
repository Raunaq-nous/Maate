// ============================================
// MAATE — Prescription OCR Review Screen
// ============================================

import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { GlassCard, Chip, StatusBadge, Button, SectionHeader } from '../../components/ui';

const extractedMeds = [
  { name: 'Metformin 500mg', dosage: '1 tablet', frequency: 'Twice daily', meal: 'After meals', confidence: 0.95 },
  { name: 'Amlodipine 5mg', dosage: '1 tablet', frequency: 'Once daily', meal: 'Morning', confidence: 0.92 },
  { name: 'Pantoprazole 40mg', dosage: '1 capsule', frequency: 'Once daily', meal: 'Before breakfast', confidence: 0.88 },
];

export default function OcrReviewScreen() {
  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={s.title}>OCR Review</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* OCR Status */}
        <GlassCard variant="gradient" gradientColors={['rgba(16,185,129,0.1)', 'rgba(20,184,166,0.04)'] as [string, string]} padding="base" style={{ marginBottom: Spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.status.normal} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700' as const, color: Colors.dark.text }}>OCR Extraction Complete</Text>
              <Text style={{ fontSize: 12, color: Colors.dark.textSecondary, marginTop: 2 }}>Engine: Tesseract · Confidence: 91.7% · 420ms</Text>
            </View>
          </View>
        </GlassCard>

        {/* Extracted Medications */}
        <SectionHeader title="Extracted Medications" subtitle="Review and confirm" />
        {extractedMeds.map((med, i) => (
          <GlassCard key={i} padding="base" style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={s.medName}>{med.name}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  <Chip label={med.dosage} icon="medical" color={Colors.primary[400]} size="sm" />
                  <Chip label={med.frequency} icon="repeat" color={Colors.accent.teal} size="sm" />
                  <Chip label={med.meal} icon="nutrition" color={Colors.accent.amber} size="sm" />
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, color: Colors.dark.textMuted }}>Confidence</Text>
                <Text style={{ fontSize: 16, fontWeight: '700' as const, color: med.confidence > 0.9 ? Colors.status.normal : Colors.status.low }}>
                  {Math.round(med.confidence * 100)}%
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable style={s.editChip}>
                <Ionicons name="create" size={14} color={Colors.primary[400]} />
                <Text style={{ fontSize: 12, color: Colors.primary[400], fontWeight: '600' as const }}>Edit</Text>
              </Pressable>
              <Pressable style={s.editChip}>
                <Ionicons name="alarm" size={14} color={Colors.accent.teal} />
                <Text style={{ fontSize: 12, color: Colors.accent.teal, fontWeight: '600' as const }}>Create Reminder</Text>
              </Pressable>
            </View>
          </GlassCard>
        ))}

        {/* Raw Text Preview */}
        <SectionHeader title="Raw OCR Text" />
        <GlassCard padding="base" style={{ marginBottom: Spacing.xl }}>
          <Text style={{ fontSize: 12, color: Colors.dark.textMuted, fontFamily: 'monospace', lineHeight: 18 }}>
            {'Dr. R. Mehta, MBBS, MD\nApollo Clinic, Mumbai\n\nRx:\n1. Tab Metformin 500mg - 1-0-1 (after meals)\n2. Tab Amlodipine 5mg - 1-0-0 (morning)\n3. Cap Pantoprazole 40mg - 1-0-0 (before breakfast)\n\nFollow up after 1 month.'}
          </Text>
        </GlassCard>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button title="Confirm All" onPress={() => {}} variant="primary" icon="checkmark-circle" size="lg" style={{ flex: 1 }} />
          <Button title="Re-scan" onPress={() => {}} variant="secondary" icon="refresh" size="lg" style={{ flex: 0.6 }} />
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
  scroll: { paddingHorizontal: Spacing.xl },
  card: { marginBottom: Spacing.sm },
  medName: { fontSize: 16, fontWeight: '700' as const, color: Colors.dark.text },
  editChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.dark.bg, borderWidth: 1, borderColor: Colors.dark.border },
});
