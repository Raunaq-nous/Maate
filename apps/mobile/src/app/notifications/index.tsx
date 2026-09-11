// ============================================
// MAATE — Notifications Center
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard } from '@/components/ui';
import { apiClient } from '@/services/api';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
  } catch {
    return 'Recently';
  }
}

function getIconAndColor(type: string): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  const t = (type || '').toUpperCase();
  switch (t) {
    case 'REMINDER':
      return { icon: 'alarm', color: Colors.accent.amber };
    case 'ALERT':
    case 'ESCALATION':
      return { icon: 'warning', color: Colors.accent.rose };
    case 'ACHIEVEMENT':
      return { icon: 'trophy', color: Colors.status.normal };
    case 'SYSTEM':
      return { icon: 'information-circle', color: Colors.accent.sky };
    case 'INFO':
    default:
      return { icon: 'sparkles', color: Colors.accent.violet };
  }
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get<any[]>('/notifications/history');
      const items: NotificationItem[] = (res.data || []).map((n) => {
        const { icon, color } = getIconAndColor(n.type);
        return {
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          time: formatRelativeTime(n.createdAt),
          read: Boolean(n.readAt || n.status === 'READ'),
          icon,
          color,
        };
      });
      setNotifications(items);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await apiClient.post('/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const markRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      await apiClient.post(`/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={s.title}>Notifications</Text>
        <Pressable onPress={markAllRead} disabled={unreadCount === 0}>
          <Text
            style={{
              fontSize: 13,
              color: unreadCount > 0 ? Colors.primary[400] : Colors.dark.textMuted,
              fontWeight: '600' as const,
            }}
          >
            Mark all read
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary[400]} />
        }
      >
        {loading && !refreshing ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors.primary[400]} />
          </View>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <Pressable key={n.id} onPress={() => markRead(n.id)}>
              <GlassCard padding="md" style={{ ...s.card, ...(!n.read ? s.unread : {}) }}>
                <View style={s.row}>
                  <View style={[s.icon, { backgroundColor: `${n.color}15` }]}>
                    <Ionicons name={n.icon} size={20} color={n.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={s.notifTitle}>{n.title}</Text>
                      {!n.read && <View style={s.dot} />}
                    </View>
                    <Text style={s.notifBody}>{n.body}</Text>
                    <Text style={s.notifTime}>{n.time}</Text>
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          ))
        ) : (
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.dark.textMuted} />
            <Text style={{ color: Colors.dark.textMuted, marginTop: Spacing.md, fontSize: 14 }}>
              No notifications yet
            </Text>
          </View>
        )}
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
  unread: { borderLeftWidth: 3, borderLeftColor: Colors.primary[500] },
  row: { flexDirection: 'row', gap: Spacing.md },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary[500] },
  notifTitle: { fontSize: 15, fontWeight: '600' as const, color: Colors.dark.text },
  notifBody: { fontSize: 13, color: Colors.dark.textSecondary, marginTop: 2, lineHeight: 18 },
  notifTime: { fontSize: 11, color: Colors.dark.textMuted, marginTop: 4 },
});

