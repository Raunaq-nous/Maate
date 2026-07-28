// ============================================
// Notification Module — Multi-channel Delivery
// ============================================

import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationProcessor } from './notification.processor';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      },
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationProcessor, MailService],
  exports: [NotificationService, MailService],
})
export class NotificationModule {}

