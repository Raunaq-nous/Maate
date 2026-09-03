// ============================================
// Vitals Controller — Vital Signs Tracking API
// ============================================

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { PrismaService } from '../../common/database/database.module';
import { TimelineService } from '../timeline/timeline.service';
import { CreateVitalSignDto, QueryVitalsDto } from './dto/health.dto';
import { TimelineEventType, Severity } from '@maate/database';

@ApiTags('vitals')
@ApiBearerAuth()
@Controller({ path: 'vitals', version: '1' })
export class VitalsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timelineService: TimelineService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Record a new vital sign measurement' })
  async createVital(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateVitalSignDto,
  ) {
    const measuredAt = dto.measuredAt ? new Date(dto.measuredAt) : new Date();

    const vital = await this.prisma.vitalSign.create({
      data: {
        userId,
        type: dto.type,
        value: dto.value,
        valueSecondary: dto.valueSecondary,
        unit: dto.unit,
        status: dto.status || 'NORMAL',
        source: dto.source || 'MANUAL',
        deviceName: dto.deviceName,
        notes: dto.notes,
        measuredAt,
      },
    });

    // Auto-record TimelineEvent
    const severityMap: Record<string, Severity> = {
      CRITICAL: Severity.CRITICAL,
      HIGH: Severity.MODERATE,
      LOW: Severity.MODERATE,
      NORMAL: Severity.MILD,
    };

    const vitalTitle = `${dto.type.replace(/_/g, ' ')}: ${dto.value}${dto.valueSecondary ? `/${dto.valueSecondary}` : ''} ${dto.unit}`;

    await this.timelineService.recordEvent({
      userId,
      type: TimelineEventType.VITAL_RECORDED,
      title: vitalTitle,
      description: dto.notes || `Recorded via ${dto.source || 'manual entry'}`,
      severity: dto.status ? severityMap[dto.status] : Severity.MILD,
      refResourceType: 'VitalSign',
      refResourceId: vital.id,
      occurredAt: measuredAt,
      metadata: {
        vitalType: dto.type,
        value: dto.value,
        valueSecondary: dto.valueSecondary,
        unit: dto.unit,
        status: dto.status,
      },
    });

    return { success: true, data: vital };
  }

  @Get()
  @ApiOperation({ summary: 'Get user vital signs with filtering' })
  async getVitals(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryVitalsDto,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.type) where.type = query.type;
    if (query.startDate || query.endDate) {
      where.measuredAt = {};
      if (query.startDate) where.measuredAt.gte = new Date(query.startDate);
      if (query.endDate) where.measuredAt.lte = new Date(query.endDate);
    }

    const [vitals, total] = await Promise.all([
      this.prisma.vitalSign.findMany({
        where,
        orderBy: { measuredAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.vitalSign.count({ where }),
    ]);

    return {
      data: vitals,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest reading for each vital type' })
  async getLatestVitals(@CurrentUser('sub') userId: string) {
    const allTypes = await this.prisma.vitalSign.findMany({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
      distinct: ['type'],
    });

    return { data: allTypes };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vital sign entry' })
  async deleteVital(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    const deleted = await this.prisma.vitalSign.deleteMany({
      where: { id, userId },
    });

    return { success: deleted.count > 0 };
  }
}
