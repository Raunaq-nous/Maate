// ============================================
// Reminder Processor — Delivery Engine
// BullMQ Consumer for Notification Dispatch
// ============================================

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../common/database/database.module';
import { NotificationModule } from '../notification/notification.module';
import { NotificationService } from '../notification/notification.service';
import { ReminderType } from '@maate/database';

@Processor('reminders')
export class ReminderProcessor {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @Process('send-notification')
  async handleReminder(job: Job<any>) {
    const { reminderId, userId, type, title, body } = job.data;
    
    this.logger.log(`Processing ${type} reminder for user ${userId}`);

    try {
      // 1. Create a log entry in PENDING state
      const log = await this.prisma.reminderLog.create({
        data: {
          userId,
          reminderId,
          reminderType: type as ReminderType,
          scheduledAt: new Date(),
          deliveredAt: new Date(),
        },
      });

      // 2. Send Push Notification via NotificationService
      // This will handle FCM/APNS and internal Notification table logging
      await this.notificationService.sendPushNotification(userId, {
        title,
        body,
        data: {
          type,
          reminderId,
          logId: log.id,
          click_action: 'REMINDER_OPEN',
        },
      });

      // 3. Update log to mark as delivered
      await this.prisma.reminderLog.update({
        where: { id: log.id },
        data: { deliveredAt: new Date() },
      });

      this.logger.log(`Reminder delivered: ${log.id}`);
      return { logId: log.id };

    } catch (err) {
      this.logger.error(`Failed to deliver reminder: ${reminderId}`, err);
      // BullMQ will handle retries based on the backoff policy defined in the scheduler
      throw err;
    }
  }
}
