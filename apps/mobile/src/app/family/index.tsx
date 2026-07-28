// ============================================
// MAATE — Family Management Screen
// Caregiver coordination & Shared health
// ============================================

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard, Button, Chip } from '@/components/ui';
import { useFamilyStore, FamilyMember } from '@/store/familyStore';

export default function FamilyManagementScreen() {
  const { members, sharedProfiles, fetchProfiles, isLoading, addMember, shareAccess } = useFamilyStore();
  
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [isShareModalVisible, setShareModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('PARENT');
  const [shareEmail, setShareEmail] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleAddMember = async () => {
    if (!newName) return;
    try {
      await addMember(newName, newRelation);
      setAddModalVisible(false);
      setNewName('');
    } catch (err) {
      Alert.alert('Error', 'Failed to add family member');
    }
  };

  const handleShare = async () => {
    if (!selectedMember || !shareEmail) return;
    try {
      await shareAccess(selectedMember.id, shareEmail, 'VIEW');
      setShareModalVisible(false);
      setShareEmail('');
      Alert.alert('Success', `Access shared with ${shareEmail}`);
    } catch (err) {
      Alert.alert('Error', 'User not found or sharing failed');
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
      
      <View style={s.header}>
        <View>
          <Text style={s.title}>Family Health</Text>
          <Text style={s.sub}>Manage and share health records with loved ones</Text>
        </View>
        <Pressable style={s.addBtn} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="person-add" size={20} color="white" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Managed Profiles */}
        <Text style={s.sectionTitle}>Profiles You Manage</Text>
        {members.map((member) => (
          <GlassCard key={member.id} padding="md" style={s.profileCard}>
            <View style={s.profileRow}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{member.fullName[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.profileName}>{member.fullName}</Text>
                <Text style={s.profileRelation}>{member.relationship}</Text>
              </View>
              <Pressable 
                style={s.shareActionBtn} 
                onPress={() => {
                  setSelectedMember(member);
                  setShareModalVisible(true);
                }}
              >
                <Ionicons name="share-social-outline" size={20} color={Colors.primary[400]} />
              </Pressable>
            </View>
          </GlassCard>
        ))}

        {/* Shared Profiles */}
        {sharedProfiles.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Shared With You</Text>
            {sharedProfiles.map((profile) => (
              <GlassCard key={profile.id} padding="md" style={s.profileCard}>
                <View style={s.profileRow}>
                  <View style={[s.avatar, { backgroundColor: Colors.accent.violet }]}>
                    <Text style={s.avatarText}>{profile.fullName[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.profileName}>{profile.fullName}</Text>
                    <Chip label={profile.accessLevel || 'VIEW ONLY'} color={Colors.accent.violet} size="sm" />
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.dark.textMuted} />
                </View>
              </GlassCard>
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Member Modal */}
      <Modal visible={isAddModalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Add Family Member</Text>
            <TextInput 
              style={s.input} 
              placeholder="Full Name" 
              placeholderTextColor={Colors.dark.textMuted} 
              value={newName}
              onChangeText={setNewName}
            />
            <View style={s.relationRow}>
              {['PARENT', 'CHILD', 'SPOUSE'].map((r) => (
                <Pressable 
                  key={r} 
                  style={[s.relationChip, newRelation === r && s.relationChipActive]}
                  onPress={() => setNewRelation(r)}
                >
                  <Text style={[s.relationText, newRelation === r && { color: 'white' }]}>{r}</Text>
                </Pressable>
              ))}
            </View>
            <Button title="Create Profile" onPress={handleAddMember} fullWidth />
            <Pressable onPress={() => setAddModalVisible(false)} style={s.cancelBtn}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Share Modal */}
      <Modal visible={isShareModalVisible} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Share {selectedMember?.fullName}'s Profile</Text>
            <Text style={s.modalSub}>Enter the email of the person you want to grant access to.</Text>
            <TextInput 
              style={s.input} 
              placeholder="caregiver@email.com" 
              placeholderTextColor={Colors.dark.textMuted} 
              autoCapitalize="none"
              value={shareEmail}
              onChangeText={setShareEmail}
            />
            <Button title="Send Invite" onPress={handleShare} fullWidth />
            <Pressable onPress={() => setShareModalVisible(false)} style={s.cancelBtn}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: Colors.dark.text },
  sub: { fontSize: 13, color: Colors.dark.textSecondary, marginTop: 4, maxWidth: '80%' },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary[500], alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.dark.text, marginTop: 24, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  profileCard: { marginBottom: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary[500], alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800', color: 'white' },
  profileName: { fontSize: 16, fontWeight: '700', color: Colors.dark.text },
  profileRelation: { fontSize: 13, color: Colors.dark.textSecondary, marginTop: 2 },
  shareActionBtn: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: Spacing.xl },
  modalContent: { backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.dark.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.dark.text, marginBottom: 8 },
  modalSub: { fontSize: 14, color: Colors.dark.textSecondary, marginBottom: 20 },
  input: { backgroundColor: Colors.dark.bg, borderRadius: BorderRadius.lg, padding: 16, color: Colors.dark.text, marginBottom: 20, borderWidth: 1, borderColor: Colors.dark.border },
  relationRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  relationChip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.border, alignItems: 'center' },
  relationChipActive: { backgroundColor: Colors.primary[500], borderColor: Colors.primary[500] },
  relationText: { fontSize: 12, fontWeight: '700', color: Colors.dark.textSecondary },
  cancelBtn: { marginTop: 16, alignItems: 'center' },
  cancelBtnText: { color: Colors.dark.textMuted, fontSize: 14, fontWeight: '600' },
});
