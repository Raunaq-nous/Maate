// ============================================
// Mobile — Notification Manager
// Push Notification Handlers & Action Setup
// ============================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { apiClient } from '@/services/api';

// Configure how notifications are displayed when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const REMINDER_ACTIONS = {
  TAKE: 'TAKE_MEDICINE',
  SNOOZE: 'SNOOZE_REMINDER',
  SKIP: 'SKIP_REMINDER',
};

export class NotificationManager {
  static async init() {
    // 1. Setup notification categories for actionable buttons
    await Notifications.setNotificationCategoryAsync('reminder', [
      {
        identifier: REMINDER_ACTIONS.TAKE,
        buttonTitle: 'Taken ✅',
        options: { opensAppToForeground: false },
      },
      {
        identifier: REMINDER_ACTIONS.SNOOZE,
        buttonTitle: 'Snooze ⏰',
        options: { opensAppToForeground: false },
      },
      {
        identifier: REMINDER_ACTIONS.SKIP,
        buttonTitle: 'Skip',
        options: { opensAppToForeground: false, isDestructive: true },
      },
    ]);

    // 2. Handle background actions
    Notifications.addNotificationResponseReceivedListener(this.handleResponse);
  }

  static async handleResponse(response: Notifications.NotificationResponse) {
    const { actionIdentifier, notification } = response;
    const { data } = notification.request.content;
    const logId = data?.['logId'] as string | undefined;

    if (!logId) return;

    try {
      switch (actionIdentifier) {
        case REMINDER_ACTIONS.TAKE:
          await apiClient.patch(`/reminders/logs/${logId}/respond`, { response: 'TAKEN' });
          break;
        case REMINDER_ACTIONS.SNOOZE:
          await apiClient.post(`/reminders/logs/${logId}/snooze`);
          break;
        case REMINDER_ACTIONS.SKIP:
          await apiClient.patch(`/reminders/logs/${logId}/respond`, { response: 'SKIPPED' });
          break;
        default:
          // If just tapped, navigate to the reminder details or home
          router.push({ pathname: '/(tabs)/home', params: { logId } });
      }
    } catch (err) {
      console.error('Failed to process notification action', err);
    }
  }

  static async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }

    // Get Expo push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    
    // Register with backend
    try {
      await apiClient.post('/notifications/register-device', {
        pushToken: token,
        deviceType: Platform.OS,
        deviceName: Platform.OS === 'ios' ? 'iPhone' : 'Android Device', // Simplify for MVP
      });
    } catch (err) {
      console.error('Failed to register device token', err);
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }

    return true;
  }
}
