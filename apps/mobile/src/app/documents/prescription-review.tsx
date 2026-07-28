// ============================================
// MAATE — Prescription OCR Review Screen
// AI correction UI with confidence highlights
// ============================================

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard, Button, Chip } from '@/components/ui';
import { useDocumentStore } from '@/store/documentStore';
import type { PrescriptionExtraction, MedicationEntity } from '@maate/shared-types';

export default function PrescriptionReviewScreen() {
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const { getOcrResult, confirmPrescription } = useDocumentStore();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PrescriptionExtraction | null>(null);

  useEffect(() => {
    if (docId) {
      loadOcr();
    }
  }, [docId]);

  const loadOcr = async () => {
    try {
      setLoading(true);
      const result = await getOcrResult(docId);
      setData(result);
    } catch (err) {
      Alert.alert('Error', 'Failed to process prescription. You can still enter details manually.', [
        { text: 'Enter Manually', onPress: () => setData({ medications: [], icd_codes: [], confidence_score: 0 }) },
        { text: 'Go Back', onPress: () => router.back() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMedication = (index: number, field: keyof MedicationEntity, value: string) => {
    if (!data) return;
    const newMeds = [...data.medications];
    newMeds[index] = { ...newMeds[index], [field]: value } as MedicationEntity;
    setData({ ...data, medications: newMeds });
  };

  const handleAddMedication = () => {
    if (!data) return;
    setData({
      ...data,
      medications: [...data.medications, { name: '', dosage: '', timing: '', duration: '' }]
    });
  };

  const handleSave = async () => {
    if (!data || !docId) return;
    try {
      await confirmPrescription(docId, data);
      Alert.alert('Success', 'Prescription saved and reminders set!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/home') }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to save prescription');
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={s.loadingText}>AI is analyzing your prescription...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
      
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={s.title}>Review Extraction</Text>
        <Pressable onPress={handleSave}>
          <Text style={s.saveBtnText}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.confidenceBanner}>
          <Ionicons name="sparkles" size={16} color={Colors.accent.violet} />
          <Text style={s.confidenceText}>
            AI Confidence: {Math.round((data?.confidence_score || 0) * 100)}%
          </Text>
        </View>

        {/* Doctor Info */}
        <Text style={s.sectionTitle}>Medical Details</Text>
        <View style={s.card}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Doctor Name</Text>
            <TextInput 
              style={s.input} 
              value={data?.doctor_name || ''} 
              onChangeText={(t) => setData(prev => ({ ...prev!, doctor_name: t }))}
              placeholder="e.g. Dr. Smith"
              placeholderTextColor={Colors.dark.textMuted}
            />
          </View>
          <View style={s.inputGroup}>
            <Text style={s.label}>Diagnosis</Text>
            <TextInput 
              style={s.input} 
              value={data?.diagnosis || ''} 
              onChangeText={(t) => setData(prev => ({ ...prev!, diagnosis: t }))}
              placeholder="e.g. Hypertension"
              placeholderTextColor={Colors.dark.textMuted}
            />
          </View>
        </View>

        {/* Medications */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Medications ({data?.medications.length})</Text>
          <Pressable onPress={handleAddMedication}>
            <Ionicons name="add-circle" size={24} color={Colors.primary[400]} />
          </Pressable>
        </View>

        {data?.medications.map((med, idx) => (
          <View key={idx} style={s.medCard}>
            <View style={s.medHeader}>
              <View style={s.medTitleRow}>
                <View style={s.medIcon}>
                  <Ionicons name="medical" size={16} color={Colors.primary[400]} />
                </View>
                <TextInput 
                  style={s.medNameInput} 
                  value={med.name} 
                  onChangeText={(t) => handleUpdateMedication(idx, 'name', t)}
                  placeholder="Medicine Name"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>
              <Pressable onPress={() => {
                const newMeds = data.medications.filter((_, i) => i !== idx);
                setData({ ...data, medications: newMeds });
              }}>
                <Ionicons name="trash-outline" size={18} color={Colors.status.critical} />
              </Pressable>
            </View>

            <View style={s.medGrid}>
              <View style={s.gridItem}>
                <Text style={s.gridLabel}>Dosage</Text>
                <TextInput 
                  style={s.gridInput} 
                  value={med.dosage} 
                  onChangeText={(t) => handleUpdateMedication(idx, 'dosage', t)}
                  placeholder="500mg"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>
              <View style={s.gridItem}>
                <Text style={s.gridLabel}>Timing</Text>
                <TextInput 
                  style={s.gridInput} 
                  value={med.timing} 
                  onChangeText={(t) => handleUpdateMedication(idx, 'timing', t)}
                  placeholder="BD / TDS"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>
              <View style={s.gridItem}>
                <Text style={s.gridLabel}>Duration</Text>
                <TextInput 
                  style={s.gridInput} 
                  value={med.duration} 
                  onChangeText={(t) => handleUpdateMedication(idx, 'duration', t)}
                  placeholder="5 days"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>
            </View>
          </View>
        ))}

        <Button 
          title="Confirm & Save" 
          onPress={handleSave} 
          size="lg" 
          variant="primary" 
          fullWidth 
          style={{ marginTop: Spacing.xl }} 
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  center: { flex: 1, backgroundColor: Colors.dark.bg, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 20, fontSize: 16, color: Colors.dark.textSecondary, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.base },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.dark.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.dark.text },
  saveBtnText: { color: Colors.primary[400], fontWeight: '700', fontSize: 16 },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  confidenceBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139,92,246,0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 20 },
  confidenceText: { fontSize: 12, fontWeight: '600', color: Colors.accent.violet },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark.text, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: 24, borderWidth: 1, borderColor: Colors.dark.border },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, color: Colors.dark.textMuted, marginBottom: 4, fontWeight: '600' },
  input: { fontSize: 15, color: Colors.dark.text, borderBottomWidth: 1, borderBottomColor: Colors.dark.border, paddingVertical: 6 },
  medCard: { backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.border },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  medTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  medIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: `${Colors.primary[500]}20`, alignItems: 'center', justifyContent: 'center' },
  medNameInput: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.dark.text },
  medGrid: { flexDirection: 'row', gap: 12 },
  gridItem: { flex: 1 },
  gridLabel: { fontSize: 11, color: Colors.dark.textMuted, marginBottom: 2 },
  gridInput: { fontSize: 13, color: Colors.dark.text, backgroundColor: Colors.dark.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 },
});
