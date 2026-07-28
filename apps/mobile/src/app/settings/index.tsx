// ============================================
// MAATE — Settings Screen
// ============================================

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { GlassCard, Divider } from '../../components/ui';

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [dataSync, setDataSync] = useState(true);

  const sections = [
    {
      title: 'Preferences',
      items: [
        { icon: 'moon' as const, label: 'Dark Mode', color: Colors.primary[500], toggle: true, value: darkMode, onChange: setDarkMode },
        { icon: 'language' as const, label: 'Language', color: Colors.accent.sky, subtitle: 'English (India)' },
        { icon: 'time' as const, label: 'Timezone', color: Colors.accent.teal, subtitle: 'Asia/Kolkata' },
      ],
    },
    {
      title: 'Notifications',
      items: [
        { icon: 'notifications' as const, label: 'Push Notifications', color: Colors.accent.amber, toggle: true, value: pushNotif, onChange: setPushNotif },
        { icon: 'alarm' as const, label: 'Reminder Sound', color: Colors.accent.violet, subtitle: 'Default' },
        { icon: 'volume-high' as const, label: 'Escalation Alerts', color: Colors.accent.rose, subtitle: 'After 30 min' },
      ],
    },
    {
      title: 'Security',
      items: [
        { icon: 'finger-print' as const, label: 'Biometric Lock', color: Colors.status.normal, toggle: true, value: biometric, onChange: setBiometric },
        { icon: 'lock-closed' as const, label: 'Change PIN', color: Colors.primary[400] },
        { icon: 'key' as const, label: 'Active Sessions', color: Colors.accent.amber },
      ],
    },
    {
      title: 'Data',
      items: [
        { icon: 'sync' as const, label: 'Auto Sync', color: Colors.accent.sky, toggle: true, value: dataSync, onChange: setDataSync },
        { icon: 'download' as const, label: 'Export Health Data', color: Colors.accent.teal },
        { icon: 'trash' as const, label: 'Delete Account', color: Colors.accent.rose },
      ],
    },
  ];

  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={s.title}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {sections.map((section) => (
          <View key={section.title} style={{ marginBottom: Spacing.xl }}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <GlassCard padding="sm">
              {section.items.map((item, i) => (
                <React.Fragment key={item.label}>
                  <View style={s.settingRow}>
                    <View style={[s.settingIcon, { backgroundColor: `${item.color}15` }]}>
                      <Ionicons name={item.icon} size={18} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.settingLabel}>{item.label}</Text>
                      {'subtitle' in item && item.subtitle && <Text style={s.settingSub}>{item.subtitle}</Text>}
                    </View>
                    {'toggle' in item && item.toggle ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onChange}
                        trackColor={{ false: Colors.dark.border, true: `${Colors.primary[500]}60` }}
                        thumbColor={item.value ? Colors.primary[500] : Colors.dark.textMuted}
                      />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} />
                    )}
                  </View>
                  {i < section.items.length - 1 && <Divider style={{ marginHorizontal: 50 }} />}
                </React.Fragment>
              ))}
            </GlassCard>
          </View>
        ))}
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
  sectionTitle: { fontSize: 13, fontWeight: '600' as const, color: Colors.dark.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: Spacing.md, gap: Spacing.md },
  settingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '500' as const, color: Colors.dark.text },
  settingSub: { fontSize: 12, color: Colors.dark.textMuted, marginTop: 1 },
});
