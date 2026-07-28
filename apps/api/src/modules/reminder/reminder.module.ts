// ============================================
// Reminder Module — Distributed Scheduling
// ============================================

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ReminderController } from './reminder.controller';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { ReminderProcessor } from './reminder.processor';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'reminders',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      },
    }),
    NotificationModule,
  ],
  controllers: [ReminderController],
  providers: [ReminderSchedulerService, ReminderProcessor],
  exports: [ReminderSchedulerService],
})
export class ReminderModule {}
