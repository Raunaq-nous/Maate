// ============================================
// Reminder Scheduler — Job Generation Engine
// Window-based scheduling for millions of users
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/database/database.module';
import { ReminderType } from '@maate/database';
import { addMinutes, startOfMinute, endOfMinute, format, getISODay } from 'date-fns';
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

  /**
   * Public trigger for manual invocation (used in testing and immediate sync)
   */
  async triggerScanNow() {
    await this.scheduleUpcomingReminders();
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
      const userTime = toZonedTime(new Date(), reminder.user.timezone || 'Asia/Kolkata');
      const currentIsoDay = getISODay(userTime); // 1 = Monday, ..., 7 = Sunday

      // daysOfWeek filtering: If configured, verify today is included
      if (reminder.daysOfWeek && reminder.daysOfWeek.length > 0 && !reminder.daysOfWeek.includes(currentIsoDay)) {
        continue;
      }

      for (const scheduledTime of reminder.timesOfDay) {
        // If scheduledTime is within our 5-min window in user's timezone
        if (this.isTimeInWindow(scheduledTime, userTime, 5)) {
          const delay = this.calculateDelayMs(scheduledTime, userTime);
          const scheduledDateKey = format(this.getScheduledDate(scheduledTime, userTime), 'yyyyMMddHHmm');
          
          await this.enqueueReminder({
            reminderId: reminder.id,
            userId: reminder.userId,
            type: ReminderType.MEDICINE,
            title: 'Medicine Reminder 💊',
            body: `Time to take ${reminder.medicineName}${reminder.dosage ? ` (${reminder.dosage})` : ''}`,
            delay,
            scheduledDateKey,
          });
        }
      }
    }
  }

  private async scheduleWaterReminders(start: Date, end: Date) {
    const activeWaterReminders = await this.prisma.waterReminder.findMany({
      where: { isActive: true },
      include: { user: true },
    });

    for (const reminder of activeWaterReminders) {
      const userTime = toZonedTime(new Date(), reminder.user.timezone || 'Asia/Kolkata');
      const interval = reminder.intervalMinutes || 90;
      
      const [startH, startM] = (reminder.activeStart || '07:00').split(':').map(Number);
      const [endH, endM] = (reminder.activeEnd || '21:00').split(':').map(Number);
      const startTotal = (startH || 0) * 60 + (startM || 0);
      const endTotal = (endH || 0) * 60 + (endM || 0);

      for (let m = startTotal; m <= endTotal; m += interval) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        const scheduledTime = `${hh}:${mm}`;

        if (this.isTimeInWindow(scheduledTime, userTime, 5)) {
          const delay = this.calculateDelayMs(scheduledTime, userTime);
          const scheduledDateKey = format(this.getScheduledDate(scheduledTime, userTime), 'yyyyMMddHHmm');

          await this.enqueueReminder({
            reminderId: reminder.id,
            userId: reminder.userId,
            type: ReminderType.WATER,
            title: 'Hydration Reminder 💧',
            body: `Time for a glass of water (${reminder.glassSizeMl || 250}ml). Stay hydrated!`,
            delay,
            scheduledDateKey,
          });
        }
      }
    }
  }

  private async scheduleMealReminders(start: Date, end: Date) {
    const activeMeals = await this.prisma.mealReminder.findMany({
      where: { isActive: true },
      include: { user: true },
    });

    for (const meal of activeMeals) {
      const userTime = toZonedTime(new Date(), meal.user.timezone || 'Asia/Kolkata');
      if (this.isTimeInWindow(meal.scheduledTime, userTime, 5)) {
        const delay = this.calculateDelayMs(meal.scheduledTime, userTime);
        const scheduledDateKey = format(this.getScheduledDate(meal.scheduledTime, userTime), 'yyyyMMddHHmm');

        await this.enqueueReminder({
          reminderId: meal.id,
          userId: meal.userId,
          type: ReminderType.MEAL,
          title: 'Meal Reminder 🍽️',
          body: `It's time for ${meal.mealType.toLowerCase()}. Stay healthy!`,
          delay,
          scheduledDateKey,
        });
      }
    }
  }

  private async enqueueReminder(jobData: any) {
    const dateKey = jobData.scheduledDateKey || format(new Date(), 'yyyyMMddHHmm');
    const jobId = `${jobData.type}_${jobData.reminderId}_${dateKey}`;
    
    await this.reminderQueue.add('send-notification', jobData, {
      jobId,
      delay: jobData.delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    });
    
    this.logger.debug(`Enqueued ${jobData.type} reminder (jobId=${jobId}) for user ${jobData.userId} with ${jobData.delay}ms delay`);
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
    const scheduledDate = this.getScheduledDate(scheduledTime, now);
    const diff = scheduledDate.getTime() - now.getTime();
    return Math.max(0, diff);
  }

  private getScheduledDate(scheduledTime: string, now: Date): Date {
    const [sHour, sMin] = (scheduledTime || '00:00').split(':').map(Number);
    const scheduledDate = new Date(now);
    scheduledDate.setHours(sHour || 0, sMin || 0, 0, 0);
    return scheduledDate;
  }
}

