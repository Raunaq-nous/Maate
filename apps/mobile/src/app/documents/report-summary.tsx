// ============================================
// MAATE — AI Report Summary Screen
// Patient-friendly insights & trend tracking
// ============================================

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { GlassCard, Button, Chip } from '../../components/ui';
import { apiClient } from '../../services/api';

interface LabValue {
  parameter: string;
  value: string;
  unit?: string;
  reference_range?: string;
  is_abnormal: boolean;
  interpretation?: string;
  trend?: 'UP' | 'DOWN' | 'STABLE';
}

interface AiSummaryData {
  layperson_summary: string;
  clinical_summary: string;
  key_findings: LabValue[];
  risk_flags: string[];
  recommendations: string[];
  citations: string[];
  is_mock?: boolean;
}

export default function ReportSummaryScreen() {
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AiSummaryData | null>(null);

  useEffect(() => {
    if (docId) fetchSummary();
  }, [docId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(`/documents/${docId}/summary`);
      const raw = data.data;
      if (!raw) {
        setSummary(null);
        return;
      }

      setSummary({
        layperson_summary:
          raw.layperson_summary || raw.laypersonSummary || raw.summary_text || raw.summaryText || '',
        clinical_summary: raw.clinical_summary || raw.summary_text || raw.summaryText || '',
        key_findings: (raw.key_findings || raw.keyFindings || []).map((f: any) => ({
          parameter: f.parameter || 'Unknown',
          value: String(f.value ?? ''),
          unit: f.unit || '',
          reference_range: f.reference_range || f.referenceRange || '',
          is_abnormal: Boolean(
            f.is_abnormal || f.status === 'high' || f.status === 'low' || f.status === 'critical',
          ),
          interpretation: f.interpretation || f.note || '',
          trend: f.trend,
        })),
        risk_flags: (raw.risk_flags || raw.riskFlags || []).map((r: any) =>
          typeof r === 'string' ? r : r.recommendation || r.parameter || JSON.stringify(r),
        ),
        recommendations: raw.recommendations || [],
        citations: raw.citations || [],
        is_mock: Boolean(raw.is_mock || raw.isMock),
      });
    } catch (err) {
      console.error('Failed to fetch summary', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!summary) return;
    await Share.share({
      message: `Maate Health AI Summary:\n\n${summary.layperson_summary}\n\nKey Findings: ${summary.key_findings.map(f => `${f.parameter}: ${f.value}`).join(', ')}`,
    });
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={s.loadingText}>AI is analyzing your report details...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={s.container}>
        <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
          </Pressable>
          <Text style={s.title}>AI Insights</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[s.center, { paddingHorizontal: Spacing.xl }]}>
          <Ionicons name="document-text-outline" size={48} color={Colors.primary[400]} />
          <Text style={[s.title, { marginTop: 16, textAlign: 'center' }]}>Summary In Progress</Text>
          <Text style={[s.loadingText, { marginTop: 8 }]}>
            OCR extraction is ready. AI clinical summarization has not yet been generated for this document.
          </Text>
          <Button
            title="Back to Records"
            variant="secondary"
            style={{ marginTop: 24 }}
            onPress={() => router.back()}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
      
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={s.title}>AI Insights</Text>
        <Pressable onPress={handleShare} style={s.shareBtn}>
          <Ionicons name="share-outline" size={22} color={Colors.dark.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Status Badge */}
        <View style={s.statusContainer}>
          <Chip 
            label={summary?.risk_flags.length ? 'Attention Required' : 'Mostly Normal'} 
            color={summary?.risk_flags.length ? Colors.status.critical : Colors.status.normal} 
            size="md" 
            icon={summary?.risk_flags.length ? 'warning' : 'checkmark-circle'}
          />
        </View>

        {/* Layperson Summary */}
        <Text style={s.sectionTitle}>What this means for you</Text>
        <GlassCard padding="lg" variant="gradient" gradientColors={['rgba(99,102,241,0.08)', 'rgba(99,102,241,0.02)'] as [string, string]}>
          <Text style={s.summaryText}>{summary?.layperson_summary}</Text>
        </GlassCard>

        {/* Key Findings with Trends */}
        <Text style={s.sectionTitle}>Key Findings & Trends</Text>
        {summary?.key_findings.map((item, idx) => (
          <View key={idx} style={s.findingCard}>
            <View style={s.findingHeader}>
              <Text style={s.paramName}>{item.parameter}</Text>
              {item.is_abnormal && <Chip label="High/Low" color={Colors.status.critical} size="sm" />}
            </View>
            
            <View style={s.valueRow}>
              <Text style={[s.valueText, item.is_abnormal && { color: Colors.status.critical }]}>
                {item.value} {item.unit}
              </Text>
              {item.trend && (
                <View style={s.trendBox}>
                  <Ionicons 
                    name={item.trend === 'UP' ? 'trending-up' : item.trend === 'DOWN' ? 'trending-down' : 'remove'} 
                    size={16} 
                    color={item.trend === 'UP' ? Colors.status.critical : Colors.status.normal} 
                  />
                  <Text style={[s.trendText, { color: item.trend === 'UP' ? Colors.status.critical : Colors.status.normal }]}>
                    {item.trend}
                  </Text>
                </View>
              )}
            </View>
            
            {item.reference_range && (
              <Text style={s.refRange}>Ref: {item.reference_range}</Text>
            )}
            
            {item.interpretation && (
              <View style={s.interpretationBox}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.dark.textSecondary} />
                <Text style={s.interpretationText}>{item.interpretation}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Recommendations */}
        {summary?.recommendations.length ? (
          <>
            <Text style={s.sectionTitle}>Recommended Next Steps</Text>
            <GlassCard padding="lg" style={{ backgroundColor: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}>
              {summary.recommendations.map((rec, idx) => (
                <View key={idx} style={s.recItem}>
                  <Ionicons name="arrow-forward" size={16} color={Colors.accent.amber} />
                  <Text style={s.recText}>{rec}</Text>
                </View>
              ))}
            </GlassCard>
          </>
        ) : null}

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.dark.textMuted} />
          <Text style={s.disclaimerText}>
            AI-generated summary for informational purposes. Always consult with a doctor for medical advice.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  center: { flex: 1, backgroundColor: Colors.dark.bg, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 20, fontSize: 16, color: Colors.dark.textSecondary, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.base },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.dark.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.dark.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: Colors.dark.text },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  statusContainer: { marginBottom: 24, alignSelf: 'flex-start' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark.text, marginTop: 24, marginBottom: 12 },
  summaryText: { fontSize: 16, lineHeight: 24, color: Colors.dark.textSecondary },
  findingCard: { backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: 12, borderWidth: 1, borderColor: Colors.dark.border },
  findingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  paramName: { fontSize: 14, fontWeight: '600', color: Colors.dark.textMuted, textTransform: 'uppercase' },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  valueText: { fontSize: 22, fontWeight: '800', color: Colors.dark.text },
  trendBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.dark.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  trendText: { fontSize: 11, fontWeight: '700' },
  refRange: { fontSize: 12, color: Colors.dark.textMuted, marginBottom: 8 },
  interpretationBox: { flexDirection: 'row', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.dark.border },
  interpretationText: { flex: 1, fontSize: 13, color: Colors.dark.textSecondary, fontStyle: 'italic' },
  recItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  recText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.dark.text },
  disclaimer: { flexDirection: 'row', gap: 8, marginTop: 32, paddingHorizontal: 10, alignItems: 'center' },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.dark.textMuted, lineHeight: 16 },
});
