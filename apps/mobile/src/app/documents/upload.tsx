// ============================================
// MAATE — Secure Document Upload Screen
// Multi-modal (Camera, Gallery, Files) + S3 Direct Upload
// ============================================

import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { GlassCard, Button, Chip } from '../../components/ui';
import { useDocumentStore } from '../../store/documentStore';

const docTypes = [
  { id: 'LAB_REPORT', label: 'Lab Report', icon: 'flask' as const, color: Colors.primary[500] },
  { id: 'PRESCRIPTION', label: 'Prescription', icon: 'medkit' as const, color: Colors.accent.teal },
  { id: 'DISCHARGE_SUMMARY', label: 'Discharge', icon: 'document-text' as const, color: Colors.accent.sky },
  { id: 'IMAGING', label: 'Imaging', icon: 'image' as const, color: Colors.accent.violet },
  { id: 'VACCINATION', label: 'Vaccination', icon: 'shield-checkmark' as const, color: Colors.status.normal },
  { id: 'OTHER', label: 'Other', icon: 'folder' as const, color: Colors.dark.textMuted },
];

export default function UploadScreen() {
  const [selectedType, setSelectedType] = useState('LAB_REPORT');
  const [selectedFile, setSelectedFile] = useState<{ uri: string, name: string, type: string } | null>(null);
  const { uploadDocument, isUploading, uploadProgress } = useDocumentStore();

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/dicom'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Camera access is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const file = result.assets[0];
      setSelectedFile({
        uri: file.uri,
        name: `camera_capture_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
    }
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const file = result.assets[0];
      setSelectedFile({
        uri: file.uri,
        name: file.fileName || `gallery_image_${Date.now()}.${file.uri.split('.').pop()}`,
        type: file.mimeType || 'image/jpeg',
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    try {
      await uploadDocument(
        selectedFile.uri,
        selectedFile.name,
        selectedFile.type,
        selectedType
      );
      Alert.alert('Success', 'Document uploaded and processing started!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/home') }
      ]);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Something went wrong');
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
      
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={s.title}>Upload Report</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Upload Area */}
        <Pressable 
          onPress={handleFilePick}
          style={({ pressed }) => [s.uploadArea, { opacity: pressed ? 0.8 : 1 }, selectedFile && s.uploadAreaSelected]}
        >
          <LinearGradient colors={['rgba(99,102,241,0.08)', 'rgba(99,102,241,0.02)'] as [string, string]} style={StyleSheet.absoluteFill} />
          <View style={[s.uploadIcon, selectedFile && { backgroundColor: `${Colors.status.normal}20` }]}>
            <Ionicons 
              name={selectedFile ? 'checkmark-circle' : 'cloud-upload'} 
              size={40} 
              color={selectedFile ? Colors.status.normal : Colors.primary[400]} 
            />
          </View>
          <Text style={s.uploadTitle}>{selectedFile ? 'File Selected' : 'Tap to Upload'}</Text>
          <Text style={s.uploadSub} numberOfLines={1}>
            {selectedFile ? selectedFile.name : 'PDF, JPG, PNG, DICOM up to 50MB'}
          </Text>
          
          <View style={s.uploadActions}>
            <Pressable onPress={handleCamera}>
              <Chip label="Camera" icon="camera" color={Colors.accent.teal} variant="outlined" size="md" />
            </Pressable>
            <Pressable onPress={handleGallery}>
              <Chip label="Gallery" icon="image" color={Colors.accent.sky} variant="outlined" size="md" />
            </Pressable>
            <Pressable onPress={handleFilePick}>
              <Chip label="Files" icon="folder" color={Colors.accent.violet} variant="outlined" size="md" />
            </Pressable>
          </View>
        </Pressable>

        {/* Progress Bar (if uploading) */}
        {isUploading && (
          <View style={s.progressContainer}>
            <View style={s.progressRow}>
              <Text style={s.progressText}>Uploading...</Text>
              <Text style={s.progressPercent}>{Math.round((Object.values(uploadProgress)[0] || 0) * 100)}%</Text>
            </View>
            <View style={s.progressBarBg}>
              <View style={[s.progressBarFill, { width: `${(Object.values(uploadProgress)[0] || 0) * 100}%` }]} />
            </View>
          </View>
        )}

        {/* Document Type */}
        <Text style={s.sectionTitle}>Document Type</Text>
        <View style={s.typesGrid}>
          {docTypes.map((dt) => (
            <Pressable key={dt.id} style={[s.typeCard, selectedType === dt.id && s.typeCardActive]}
              onPress={() => setSelectedType(dt.id)}>
              <View style={[s.typeIcon, { backgroundColor: `${dt.color}15` }]}>
                <Ionicons name={dt.icon} size={20} color={dt.color} />
              </View>
              <Text style={[s.typeLabel, selectedType === dt.id && { color: Colors.primary[400] }]}>{dt.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* AI processing info */}
        <GlassCard variant="gradient" gradientColors={['rgba(139,92,246,0.08)', 'rgba(99,102,241,0.04)'] as [string, string]} padding="base">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="sparkles" size={22} color={Colors.accent.violet} />
            <View style={{ flex: 1 }}>
              <Text style={s.aiTitle}>AI-Powered Processing</Text>
              <Text style={s.aiSub}>Virus scan + OCR extraction + AI summary will be generated</Text>
            </View>
          </View>
        </GlassCard>

        <Button 
          title={isUploading ? 'Uploading...' : 'Upload & Process'} 
          onPress={handleUpload} 
          size="lg" 
          fullWidth 
          icon={isUploading ? undefined : "cloud-upload"} 
          iconPosition="right" 
          style={{ marginTop: 24 }} 
          disabled={!selectedFile || isUploading}
        />
        
        {isUploading && <ActivityIndicator color={Colors.primary[400]} style={{ marginTop: 16 }} />}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.base },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.dark.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Typography.sizes.headline, fontWeight: Typography.weights.bold, color: Colors.dark.text },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  uploadArea: { borderRadius: BorderRadius.xl, borderWidth: 2, borderColor: Colors.dark.border, borderStyle: 'dashed', padding: Spacing['2xl'], alignItems: 'center', marginBottom: Spacing.xl, overflow: 'hidden' },
  uploadAreaSelected: { borderColor: Colors.status.normal, borderStyle: 'solid' },
  uploadIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: `${Colors.primary[500]}12`, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  uploadTitle: { fontSize: Typography.sizes.headline, fontWeight: Typography.weights.bold, color: Colors.dark.text },
  uploadSub: { fontSize: Typography.sizes.footnote, color: Colors.dark.textMuted, marginTop: 4, marginBottom: Spacing.base, paddingHorizontal: 20, textAlign: 'center' },
  uploadActions: { flexDirection: 'row', gap: 10 },
  progressContainer: { marginBottom: Spacing.xl },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 13, color: Colors.dark.textSecondary },
  progressPercent: { fontSize: 13, fontWeight: 'bold', color: Colors.primary[400] },
  progressBarBg: { height: 6, backgroundColor: Colors.dark.border, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary[500] },
  sectionTitle: { fontSize: Typography.sizes.headline, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: Spacing.md },
  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  typeCard: { width: '31%', backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  typeCardActive: { borderColor: Colors.primary[500], backgroundColor: `${Colors.primary[500]}08` },
  typeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  typeLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.dark.textSecondary, textAlign: 'center' },
  aiTitle: { fontSize: Typography.sizes.body, fontWeight: Typography.weights.semibold, color: Colors.dark.text },
  aiSub: { fontSize: Typography.sizes.caption, color: Colors.dark.textSecondary, marginTop: 2 },
});
