// ============================================
// Notification Service — Multi-channel Delivery
// Token Management, Batching, and Retries
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaService } from '../../common/database/database.module';
import { NotificationType, NotificationChannel } from '@maate/database';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private expo: Expo;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {
    this.expo = new Expo();
  }

  /**
   * Registers or updates a user device push token.
   */
  async registerDevice(userId: string, data: {
    pushToken: string;
    deviceType: string;
    deviceName?: string;
  }) {
    return this.prisma.userDevice.upsert({
      where: { pushToken: data.pushToken },
      create: {
        userId,
        pushToken: data.pushToken,
        deviceType: data.deviceType,
        deviceName: data.deviceName,
      },
      update: {
        userId,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Enqueues a push notification for delivery.
   */
  async sendPushNotification(userId: string, payload: {
    title: string;
    body: string;
    data?: any;
    type?: NotificationType;
  }) {
    // 1. Create a database record for analytics and history
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        type: payload.type || 'SYSTEM',
        channel: 'PUSH',
        status: 'PENDING',
      },
    });

    // 2. Fetch active devices for the user
    const devices = await this.prisma.userDevice.findMany({
      where: { userId, isActive: true },
    });

    if (devices.length === 0) {
      this.logger.warn(`No active devices for user ${userId}`);
      return;
    }

    // 3. Enqueue for each device to handle per-token failures/retries
    for (const device of devices) {
      await this.notificationQueue.add('deliver-push', {
        notificationId: notification.id,
        pushToken: device.pushToken,
        title: payload.title,
        body: payload.body,
        data: payload.data,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      });
    }

    return notification;
  }

  /**
   * Unregisters a device token (e.g. on logout).
   */
  async unregisterDevice(pushToken: string) {
    return this.prisma.userDevice.update({
      where: { pushToken },
      data: { isActive: false },
    });
  }
}
