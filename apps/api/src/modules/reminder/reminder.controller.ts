// ============================================
// Reminder Controller — Adherence Tracking
// APIs for responding to reminders
// ============================================

import { Controller, Post, Put, Body, Param, Patch, Get, Delete, Query, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { PrismaService } from '../../common/database/database.module';
import { ReminderResponse, ReminderFrequency, MealRelation, MealType, ReminderType } from '@maate/database';
import { IsEnum, IsOptional, IsString, IsArray, IsNumber, IsBoolean } from 'class-validator';

class RespondToReminderDto {
  @IsEnum(ReminderResponse)
  response!: ReminderResponse;

  @IsString()
  @IsOptional()
  notes?: string;
}

class CreateMedicineReminderDto {
  @IsString()
  medicineName!: string;

  @IsString()
  @IsOptional()
  dosage?: string;

  @IsEnum(ReminderFrequency)
  frequency!: ReminderFrequency;

  @IsArray()
  @IsString({ each: true })
  timesOfDay!: string[];

  @IsArray()
  @IsOptional()
  daysOfWeek?: number[];

  @IsEnum(MealRelation)
  @IsOptional()
  mealRelation?: MealRelation;

  @IsString()
  @IsOptional()
  instructions?: string;
}

class UpdateMedicineReminderDto {
  @IsString()
  @IsOptional()
  medicineName?: string;

  @IsString()
  @IsOptional()
  dosage?: string;

  @IsEnum(ReminderFrequency)
  @IsOptional()
  frequency?: ReminderFrequency;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  timesOfDay?: string[];

  @IsArray()
  @IsOptional()
  daysOfWeek?: number[];

  @IsEnum(MealRelation)
  @IsOptional()
  mealRelation?: MealRelation;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

class UpsertWaterReminderDto {
  @IsNumber()
  dailyGoalMl!: number;

  @IsNumber()
  intervalMinutes!: number;

  @IsString()
  activeStart!: string;

  @IsString()
  activeEnd!: string;

  @IsNumber()
  glassSizeMl!: number;

  @IsBoolean()
  isActive!: boolean;
}

class CreateMealReminderDto {
  @IsEnum(MealType)
  mealType!: MealType;

  @IsString()
  scheduledTime!: string;

  @IsString()
  @IsOptional()
  dietaryNotes?: string;
}

class UpdateMealReminderDto {
  @IsEnum(MealType)
  @IsOptional()
  mealType?: MealType;

  @IsString()
  @IsOptional()
  scheduledTime?: string;

  @IsString()
  @IsOptional()
  dietaryNotes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

@ApiTags('reminders')
@ApiBearerAuth()
@Controller({ path: 'reminders', version: '1' })
export class ReminderController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get all active reminders for the user' })
  async getActiveReminders(@CurrentUser('sub') userId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [meds, water, meals, logs] = await Promise.all([
      this.prisma.medicineReminder.findMany({ where: { userId, isActive: true, deletedAt: null } }),
      this.prisma.waterReminder.findUnique({ where: { userId } }),
      this.prisma.mealReminder.findMany({ where: { userId, isActive: true } }),
      this.prisma.reminderLog.findMany({
        where: {
          userId,
          scheduledAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
    ]);
    return { data: { meds, water, meals, logs } };
  }

  @Post(':type/:id/log')
  @ApiOperation({ summary: 'Log a response to a reminder by reminder configuration ID' })
  async logResponseForReminder(
    @CurrentUser('sub') userId: string,
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() dto: RespondToReminderDto,
  ) {
    const reminderType = type.toUpperCase() as ReminderType;
    
    // Create or update log for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const existingLog = await this.prisma.reminderLog.findFirst({
      where: {
        userId,
        reminderId: id,
        reminderType,
        scheduledAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    if (existingLog) {
      await this.prisma.reminderLog.update({
        where: { id: existingLog.id },
        data: {
          response: dto.response,
          respondedAt: new Date(),
          notes: dto.notes,
        },
      });
      return { success: true, message: 'Response updated' };
    } else {
      await this.prisma.reminderLog.create({
        data: {
          userId,
          reminderId: id,
          reminderType,
          scheduledAt: new Date(),
          deliveredAt: new Date(),
          respondedAt: new Date(),
          response: dto.response,
          notes: dto.notes,
        },
      });
      return { success: true, message: 'Response recorded' };
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new medicine reminder' })
  async createMedicineReminder(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateMedicineReminderDto,
  ) {
    const reminder = await this.prisma.medicineReminder.create({
      data: {
        userId,
        medicineName: dto.medicineName,
        dosage: dto.dosage,
        frequency: dto.frequency,
        timesOfDay: dto.timesOfDay,
        daysOfWeek: dto.daysOfWeek || [1, 2, 3, 4, 5, 6, 7],
        mealRelation: dto.mealRelation || 'ANY',
        startDate: new Date(),
        instructions: dto.instructions,
      },
    });
    return { data: reminder };
  }

  @Put('medicine/:id')
  @ApiOperation({ summary: 'Update an existing medicine reminder' })
  async updateMedicineReminder(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMedicineReminderDto,
  ) {
    const reminder = await this.prisma.medicineReminder.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!reminder) {
      return { success: false, message: 'Medicine reminder not found' };
    }
    const updated = await this.prisma.medicineReminder.update({
      where: { id },
      data: {
        ...(dto.medicineName && { medicineName: dto.medicineName }),
        ...(dto.dosage !== undefined && { dosage: dto.dosage }),
        ...(dto.frequency && { frequency: dto.frequency }),
        ...(dto.timesOfDay && { timesOfDay: dto.timesOfDay }),
        ...(dto.daysOfWeek && { daysOfWeek: dto.daysOfWeek }),
        ...(dto.mealRelation && { mealRelation: dto.mealRelation }),
        ...(dto.instructions !== undefined && { instructions: dto.instructions }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    return { success: true, data: updated };
  }

  @Put('meal/:id')
  @ApiOperation({ summary: 'Update an existing meal reminder' })
  async updateMealReminder(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMealReminderDto,
  ) {
    const meal = await this.prisma.mealReminder.findFirst({
      where: { id, userId },
    });
    if (!meal) {
      return { success: false, message: 'Meal reminder not found' };
    }
    const updated = await this.prisma.mealReminder.update({
      where: { id },
      data: {
        ...(dto.mealType && { mealType: dto.mealType }),
        ...(dto.scheduledTime && { scheduledTime: dto.scheduledTime }),
        ...(dto.dietaryNotes !== undefined && { dietaryNotes: dto.dietaryNotes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    return { success: true, data: updated };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a reminder (medicine fallback)' })
  async updateReminderFallback(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMedicineReminderDto,
  ) {
    return this.updateMedicineReminder(userId, id, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get reminder adherence logs history with filters' })
  async getAdherenceHistory(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('reminderId') reminderId?: string,
    @Query('reminderType') reminderType?: ReminderType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const where: any = { userId };

    if (reminderId) where.reminderId = reminderId;
    if (reminderType) where.reminderType = reminderType;

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
    }

    const take = limit ? Math.min(Math.max(1, parseInt(limit, 10)), 100) : 50;
    const skip = offset ? Math.max(0, parseInt(offset, 10)) : 0;

    const [logs, total] = await Promise.all([
      this.prisma.reminderLog.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.reminderLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        limit: take,
        offset: skip,
      },
    };
  }

  @Post('water')
  @ApiOperation({ summary: 'Upsert water reminder settings' })
  async upsertWaterReminder(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpsertWaterReminderDto,
  ) {
    const reminder = await this.prisma.waterReminder.upsert({
      where: { userId },
      update: {
        dailyGoalMl: dto.dailyGoalMl,
        intervalMinutes: dto.intervalMinutes,
        activeStart: dto.activeStart,
        activeEnd: dto.activeEnd,
        glassSizeMl: dto.glassSizeMl,
        isActive: dto.isActive,
      },
      create: {
        userId,
        dailyGoalMl: dto.dailyGoalMl,
        intervalMinutes: dto.intervalMinutes,
        activeStart: dto.activeStart,
        activeEnd: dto.activeEnd,
        glassSizeMl: dto.glassSizeMl,
        isActive: dto.isActive,
      },
    });
    return { data: reminder };
  }

  @Post('meal')
  @ApiOperation({ summary: 'Create a new meal reminder' })
  async createMealReminder(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateMealReminderDto,
  ) {
    const reminder = await this.prisma.mealReminder.create({
      data: {
        userId,
        mealType: dto.mealType,
        scheduledTime: dto.scheduledTime,
        dietaryNotes: dto.dietaryNotes,
      },
    });
    return { data: reminder };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a reminder (medicine or meal)' })
  async deleteReminder(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    // Try medicine first (soft delete)
    const medDeleted = await this.prisma.medicineReminder.updateMany({
      where: { id, userId },
      data: { deletedAt: new Date(), isActive: false },
    });
    if (medDeleted.count > 0) {
      return { success: true, message: 'Medicine reminder deleted' };
    }

    // Try meal (hard delete since no deletedAt exists in schema)
    const mealDeleted = await this.prisma.mealReminder.deleteMany({
      where: { id, userId },
    });
    if (mealDeleted.count > 0) {
      return { success: true, message: 'Meal reminder deleted' };
    }

    return { success: false, message: 'Reminder not found' };
  }

  @Patch('logs/:id/respond')
  @ApiOperation({ summary: 'Log a response to a reminder (Taken, Skipped, etc.)' })
  async respondToReminder(
    @CurrentUser('sub') userId: string,
    @Param('id') logId: string,
    @Body() dto: RespondToReminderDto,
  ) {
    await this.prisma.reminderLog.updateMany({
      where: { id: logId, userId },
      data: {
        response: dto.response,
        respondedAt: new Date(),
        notes: dto.notes,
      },
    });

    return { message: 'Response recorded', success: true };
  }

  @Post('logs/:id/snooze')
  @ApiOperation({ summary: 'Snooze a reminder' })
  async snoozeReminder(
    @CurrentUser('sub') userId: string,
    @Param('id') logId: string,
  ) {
    const log = await this.prisma.reminderLog.findFirst({
      where: { id: logId, userId },
    });

    if (!log) return { error: 'Log not found' };

    // Update state to SNOOZED
    await this.prisma.reminderLog.update({
      where: { id: logId },
      data: { response: 'SNOOZED', respondedAt: new Date() },
    });

    return { message: 'Reminder snoozed for 15 minutes' };
  }

  @Get('stats/adherence')
  @ApiOperation({ summary: 'Get adherence statistics' })
  async getAdherence(@CurrentUser('sub') userId: string) {
    const total = await this.prisma.reminderLog.count({ where: { userId } });
    const taken = await this.prisma.reminderLog.count({
      where: { userId, response: 'TAKEN' },
    });

    return {
      data: {
        total,
        taken,
        adherenceRate: total > 0 ? (taken / total) * 100 : 100,
      },
    };
  }
}

