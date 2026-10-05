// ============================================
// Vitals Controller — Vital Signs Tracking API
// ============================================

import { TimelineEventType, Severity } from '@maate/database';
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';

import { AuditService, AuditAction } from '../../common/audit/audit.service';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { PrismaService } from '../../common/database/database.module';
import { TimelineService } from '../timeline/timeline.service';

import { CreateVitalSignDto, QueryVitalsDto } from './dto/health.dto';

@ApiTags('vitals')
@ApiBearerAuth()
@Controller({ path: 'vitals', version: '1' })
export class VitalsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timelineService: TimelineService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Record a new vital sign measurement' })
  async createVital(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateVitalSignDto,
    @Req() req?: Request,
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

    await this.audit.record({
      userId,
      action: AuditAction.PHI_CREATE,
      resource: 'VitalSign',
      resourceId: vital.id,
      req,
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
    @Req() req?: Request,
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

    await this.audit.record({
      userId,
      action: AuditAction.PHI_VIEW,
      resource: 'VitalSign',
      req,
    });

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
  async getLatestVitals(@CurrentUser('sub') userId: string, @Req() req?: Request) {
    const allTypes = await this.prisma.vitalSign.findMany({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
      distinct: ['type'],
    });

    await this.audit.record({
      userId,
      action: AuditAction.PHI_VIEW,
      resource: 'VitalSign',
      req,
    });

    return { data: allTypes };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vital sign entry' })
  async deleteVital(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Req() req?: Request,
  ) {
    const deleted = await this.prisma.vitalSign.deleteMany({
      where: { id, userId },
    });

    if (deleted.count > 0) {
      await this.audit.record({
        userId,
        action: AuditAction.PHI_DELETE,
        resource: 'VitalSign',
        resourceId: id,
        req,
      });
    }

    return { success: deleted.count > 0 };
  }
}
