import { Test, TestingModule } from '@nestjs/testing';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { ReminderController } from './reminder.controller';
import { PrismaService } from '../../common/database/database.module';
import { TimelineService } from '../timeline/timeline.service';
import { ReminderResponse, ReminderType } from '@maate/database';

describe('ReminderService & Scheduler (DaysOfWeek, Timezones & Adherence)', () => {
  let scheduler: ReminderSchedulerService;
  let controller: ReminderController;
  let prisma: any;
  let queue: any;
  let timelineService: any;

  beforeEach(async () => {
    prisma = {
      medicineReminder: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      waterReminder: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      mealReminder: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      reminderLog: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      timelineEvent: {
        create: jest.fn(),
      },
    };

    queue = {
      add: jest.fn().mockResolvedValue({ id: 'job-rem-1' }),
    };

    timelineService = {
      recordEvent: jest.fn().mockResolvedValue({ id: 'tl-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderSchedulerService,
        ReminderController,
        { provide: PrismaService, useValue: prisma },
        { provide: 'BullQueue_reminders', useValue: queue },
        { provide: TimelineService, useValue: timelineService },
      ],
    }).compile();

    scheduler = module.get<ReminderSchedulerService>(ReminderSchedulerService);
    controller = module.get<ReminderController>(ReminderController);
  });

  describe('daysOfWeek & Schedule Filtering', () => {
    it('should ignore reminder if current day of week is not in daysOfWeek array', async () => {
      // Setup a reminder configured only for impossible day 999
      prisma.medicineReminder.findMany.mockResolvedValue([
        {
          id: 'med-1',
          userId: 'user-1',
          medicineName: 'Metformin',
          dosage: '500mg',
          isActive: true,
          startDate: new Date('2026-01-01'),
          endDate: null,
          daysOfWeek: [999], // Impossible day -> will never match current day
          timesOfDay: ['10:00'],
          user: { timezone: 'Asia/Kolkata' },
        },
      ]);

      await scheduler.scheduleUpcomingReminders();

      // Should not enqueue any jobs
      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  describe('Adherence Calculation & Response State Transitions', () => {
    it('should calculate accurate adherence percentage from logged responses', async () => {
      // 2 taken out of 3 total logs = 66.67%
      prisma.reminderLog.count
        .mockResolvedValueOnce(3) // total
        .mockResolvedValueOnce(2); // taken

      const stats = await controller.getAdherence('user-1');

      expect(stats.data.total).toBe(3);
      expect(stats.data.taken).toBe(2);
      expect(stats.data.adherenceRate).toBeCloseTo(66.67, 1);
    });

    it('should record TAKEN response and auto-generate a TimelineEvent', async () => {
      prisma.reminderLog.findFirst.mockResolvedValue({
        id: 'log-1',
        userId: 'user-1',
        reminderId: 'med-1',
        reminderType: ReminderType.MEDICINE,
        scheduledFor: new Date(),
      });

      prisma.medicineReminder.findUnique.mockResolvedValue({
        id: 'med-1',
        medicineName: 'Metformin',
        dosage: '500mg',
      });

      const response = await controller.respondToReminder('user-1', 'log-1', {
        response: ReminderResponse.TAKEN,
        notes: 'Taken after breakfast',
      });

      expect(response.success).toBe(true);
      expect(prisma.reminderLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({
          response: ReminderResponse.TAKEN,
          notes: 'Taken after breakfast',
        }),
      });

      // Timeline event recorded
      expect(timelineService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'MEDICATION_STARTED',
          title: 'Dose Taken: Metformin',
        }),
      );
    });

    it('should update state to SNOOZED when snoozing a reminder', async () => {
      prisma.reminderLog.findFirst.mockResolvedValue({
        id: 'log-1',
        userId: 'user-1',
      });

      const res = await controller.snoozeReminder('user-1', 'log-1');

      expect(res.message).toBe('Reminder snoozed for 15 minutes');
      expect(prisma.reminderLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({
          response: 'SNOOZED',
        }),
      });
    });
  });
});
