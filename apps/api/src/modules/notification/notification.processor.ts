// ============================================
// Notification Processor — Delivery Worker
// Batching, Error Handling, and Token Management
// ============================================

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaService } from '../../common/database/database.module';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);
  private expo: Expo;

  constructor(private readonly prisma: PrismaService) {
    this.expo = new Expo();
  }

  @Process('deliver-push')
  async handleDelivery(job: Job<any>) {
    const { notificationId, pushToken, title, body, data } = job.data;

    // 1. Validate token
    if (!Expo.isExpoPushToken(pushToken)) {
      this.logger.error(`Invalid push token: ${pushToken}`);
      await this.markTokenAsInactive(pushToken);
      return;
    }

    // 2. Prepare message
    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
    };

    try {
      // 3. Send to Expo
      const tickets = await this.expo.sendPushNotificationsAsync([message]);
      const ticket = tickets[0];

      // 4. Handle ticket status
      if (ticket && ticket.status === 'ok') {
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: { status: 'SENT', sentAt: new Date() },
        });
      } else if (ticket && ticket.status === 'error') {
        const error = (ticket as any).details?.error;
        this.logger.error(`Push ticket error: ${error}`);
        
        if (error === 'DeviceNotRegistered') {
          await this.markTokenAsInactive(pushToken);
        }
        
        throw new Error(`Delivery failed: ${error}`);
      }

    } catch (err) {
      this.logger.error(`Failed to send notification ${notificationId} to ${pushToken}`, err);
      throw err; // Re-throw for BullMQ retry
    }
  }

  private async markTokenAsInactive(pushToken: string) {
    await this.prisma.userDevice.updateMany({
      where: { pushToken },
      data: { isActive: false },
    });
  }
}
