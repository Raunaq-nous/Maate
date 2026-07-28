// ============================================
// Reminder Scheduler — Job Generation Engine
// Window-based scheduling for millions of users
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/database/database.module';
import { ReminderType, ReminderFrequency } from '@maate/database';
import { addMinutes, startOfMinute, endOfMinute, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('reminders') private readonly reminderQueue: Queue,
  ) {}

  /**
   * Runs every minute to schedule reminders for the next 5-minute window.
   * This windowing approach handles millions of users by offloading 
   * actual execution to the distributed BullMQ workers.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduleUpcomingReminders() {
    const startTime = startOfMinute(addMinutes(new Date(), 1));
    const endTime = endOfMinute(addMinutes(new Date(), 5));

    this.logger.log(`Scanning for reminders between ${startTime.toISOString()} and ${endTime.toISOString()}`);

    // 1. Process Medicine Reminders
    await this.scheduleMedicineReminders(startTime, endTime);
    
    // 2. Process Water Reminders
    await this.scheduleWaterReminders(startTime, endTime);
    
    // 3. Process Meal Reminders
    await this.scheduleMealReminders(startTime, endTime);
  }

  private async scheduleMedicineReminders(start: Date, end: Date) {
    const activeReminders = await this.prisma.medicineReminder.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        startDate: { lte: end },
        OR: [{ endDate: null }, { endDate: { gte: start } }],
      },
      include: { user: true },
    });

    for (const reminder of activeReminders) {
      const userTime = toZonedTime(new Date(), reminder.user.timezone || 'UTC');
      const currentTimeStr = format(userTime, 'HH:mm');

      for (const scheduledTime of reminder.timesOfDay) {
        // If scheduledTime is within our 5-min window in user's timezone
        if (this.isTimeInWindow(scheduledTime, userTime, 5)) {
          const delay = this.calculateDelayMs(scheduledTime, userTime);
          
          await this.enqueueReminder({
            reminderId: reminder.id,
            userId: reminder.userId,
            type: ReminderType.MEDICINE,
            title: 'Medicine Reminder',
            body: `Time to take ${reminder.medicineName} (${reminder.dosage || ''})`,
            delay,
          });
        }
      }
    }
  }

  private async scheduleWaterReminders(start: Date, end: Date) {
    // Water reminders are typically periodic (every 90 mins)
    // Implementation would find the next interval and enqueue
  }

  private async scheduleMealReminders(start: Date, end: Date) {
    const activeMeals = await this.prisma.mealReminder.findMany({
      where: { isActive: true },
      include: { user: true },
    });

    for (const meal of activeMeals) {
      const userTime = toZonedTime(new Date(), meal.user.timezone);
      if (this.isTimeInWindow(meal.scheduledTime, userTime, 5)) {
        const delay = this.calculateDelayMs(meal.scheduledTime, userTime);
        await this.enqueueReminder({
          reminderId: meal.id,
          userId: meal.userId,
          type: ReminderType.MEAL,
          title: 'Meal Reminder',
          body: `It's time for ${meal.mealType.toLowerCase()}. Stay healthy!`,
          delay,
        });
      }
    }
  }

  private async enqueueReminder(jobData: any) {
    const jobId = `${jobData.type}_${jobData.reminderId}_${format(new Date(), 'yyyyMMddHHmm')}`;
    
    await this.reminderQueue.add('send-notification', jobData, {
      jobId,
      delay: jobData.delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    });
    
    this.logger.debug(`Enqueued ${jobData.type} reminder for user ${jobData.userId} with ${jobData.delay}ms delay`);
  }

  private isTimeInWindow(scheduledTime: string, now: Date, windowMinutes: number): boolean {
    const [sHour, sMin] = (scheduledTime || '00:00').split(':').map(Number);
    if (sHour === undefined || sMin === undefined || isNaN(sHour) || isNaN(sMin)) return false;
    
    const sTotal = sHour * 60 + sMin;
    const nTotal = now.getHours() * 60 + now.getMinutes();
    
    // Check if scheduled time is between now and now + window
    return sTotal >= nTotal && sTotal < nTotal + windowMinutes;
  }

  private calculateDelayMs(scheduledTime: string, now: Date): number {
    const [sHour, sMin] = (scheduledTime || '00:00').split(':').map(Number);
    const scheduledDate = new Date(now);
    scheduledDate.setHours(sHour || 0, sMin || 0, 0, 0);
    
    const diff = scheduledDate.getTime() - now.getTime();
    return Math.max(0, diff);
  }
}
