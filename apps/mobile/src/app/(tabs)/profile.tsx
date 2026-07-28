// ============================================
// MAATE — Profile Screen
// ============================================

import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard, Avatar, Divider } from '@/components/ui';

const menuItems = [
  { icon: 'person' as const, label: 'Edit Profile', color: Colors.primary[500], route: '/profile/edit' },
  { icon: 'people' as const, label: 'Family Members', color: Colors.accent.teal, route: '/family' },
  { icon: 'share-social' as const, label: 'Doctor Shares', color: Colors.accent.sky, route: '/shares' },
  { icon: 'analytics' as const, label: 'Health Analytics', color: Colors.accent.violet, route: '/analytics' },
  { icon: 'notifications' as const, label: 'Notifications', color: Colors.accent.amber, route: '/notifications' },
  { icon: 'settings' as const, label: 'Settings', color: Colors.dark.textSecondary, route: '/settings' },
  { icon: 'shield-checkmark' as const, label: 'Privacy & Data', color: Colors.status.normal, route: '/privacy' },
  { icon: 'help-circle' as const, label: 'Help & Support', color: Colors.status.info, route: '/help' },
];

export default function ProfileScreen() {
  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Profile Card */}
        <GlassCard variant="gradient" gradientColors={Colors.gradients.primary as unknown as [string, string]} padding="xl" style={s.profileCard}>
          <View style={s.profileRow}>
            <Avatar name="Priya Sharma" size={64} />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>Priya Sharma</Text>
              <Text style={s.detail}>+91 98765 43210</Text>
              <Text style={s.detail}>B+ · Female · 42 years</Text>
            </View>
            <Pressable style={s.editBtn}><Ionicons name="create" size={18} color="#FFF" /></Pressable>
          </View>
          <View style={s.statsRow}>
            {[{ v: '12', l: 'Reports' }, { v: '3', l: 'Family' }, { v: '92%', l: 'Adherence' }].map((stat) => (
              <View key={stat.l} style={s.stat}>
                <Text style={s.statValue}>{stat.v}</Text>
                <Text style={s.statLabel}>{stat.l}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Menu */}
        <GlassCard padding="sm" style={s.menuCard}>
          {menuItems.map((item, i) => (
            <React.Fragment key={item.label}>
              <Pressable style={({ pressed }) => [s.menuItem, { opacity: pressed ? 0.7 : 1 }]} onPress={() => {}}>
                <View style={[s.menuIcon, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} />
              </Pressable>
              {i < menuItems.length - 1 && <Divider style={{ marginHorizontal: 56 }} />}
            </React.Fragment>
          ))}
        </GlassCard>

        {/* Logout */}
        <Pressable style={s.logoutBtn}>
          <Ionicons name="log-out" size={18} color={Colors.accent.rose} />
          <Text style={s.logoutText}>Sign Out</Text>
        </Pressable>

        <Text style={s.version}>Maate v0.1.0 · Made with ❤️ in India</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  scroll: { paddingTop: 60, paddingHorizontal: Spacing.xl },
  profileCard: { marginBottom: Spacing.xl },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  name: { fontSize: Typography.sizes.title3, fontWeight: Typography.weights.bold, color: '#FFF' },
  detail: { fontSize: Typography.sizes.footnote, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.lg, paddingTop: Spacing.base, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: Typography.sizes.title3, fontWeight: Typography.weights.bold, color: '#FFF' },
  statLabel: { fontSize: Typography.sizes.caption, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  menuCard: { marginBottom: Spacing.xl },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.md, gap: Spacing.md },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: Typography.sizes.body, fontWeight: Typography.weights.medium, color: Colors.dark.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: `${Colors.accent.rose}10`, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: `${Colors.accent.rose}25` },
  logoutText: { fontSize: Typography.sizes.body, fontWeight: Typography.weights.semibold, color: Colors.accent.rose },
  version: { textAlign: 'center', fontSize: Typography.sizes.caption, color: Colors.dark.textMuted, marginTop: Spacing.xl },
});
