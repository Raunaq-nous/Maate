// ============================================
// Symptoms Controller — Symptom Log & Tracker
// ============================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { PrismaService } from '../../common/database/database.module';
import { TimelineService } from '../timeline/timeline.service';
import { CreateSymptomDto, QuerySymptomsDto } from './dto/health.dto';
import { TimelineEventType } from '@maate/database';

@ApiTags('symptoms')
@ApiBearerAuth()
@Controller({ path: 'symptoms', version: '1' })
export class SymptomsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timelineService: TimelineService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Log a new symptom entry' })
  async createSymptom(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateSymptomDto,
  ) {
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();

    const symptom = await this.prisma.symptomEntry.create({
      data: {
        userId,
        symptomName: dto.symptomName,
        bodyArea: dto.bodyArea,
        severity: dto.severity || 'MILD',
        duration: dto.duration,
        frequency: dto.frequency,
        triggers: dto.triggers || [],
        accompaniedBy: dto.accompaniedBy || [],
        notes: dto.notes,
        startedAt,
      },
    });

    // Auto-record TimelineEvent
    await this.timelineService.recordEvent({
      userId,
      type: TimelineEventType.SYMPTOM_REPORTED,
      title: `Symptom Reported: ${dto.symptomName}`,
      description: `Severity: ${dto.severity || 'MILD'}${dto.bodyArea ? ` (${dto.bodyArea})` : ''}. ${dto.notes || ''}`.trim(),
      severity: dto.severity,
      refResourceType: 'SymptomEntry',
      refResourceId: symptom.id,
      occurredAt: startedAt,
      metadata: {
        symptomName: dto.symptomName,
        bodyArea: dto.bodyArea,
        severity: dto.severity,
        duration: dto.duration,
        triggers: dto.triggers,
      },
    });

    return { success: true, data: symptom };
  }

  @Get()
  @ApiOperation({ summary: 'Get user logged symptoms' })
  async getSymptoms(
    @CurrentUser('sub') userId: string,
    @Query() query: QuerySymptomsDto,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.severity) where.severity = query.severity;
    if (query.startDate || query.endDate) {
      where.startedAt = {};
      if (query.startDate) where.startedAt.gte = new Date(query.startDate);
      if (query.endDate) where.startedAt.lte = new Date(query.endDate);
    }

    const [symptoms, total] = await Promise.all([
      this.prisma.symptomEntry.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.symptomEntry.count({ where }),
    ]);

    return {
      data: symptoms,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Mark a symptom as resolved' })
  async resolveSymptom(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    const symptom = await this.prisma.symptomEntry.findFirst({
      where: { id, userId },
    });
    if (!symptom) return { success: false, message: 'Symptom not found' };

    const resolved = await this.prisma.symptomEntry.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });

    await this.timelineService.recordEvent({
      userId,
      type: TimelineEventType.CONDITION_RESOLVED,
      title: `Symptom Resolved: ${symptom.symptomName}`,
      description: `Symptom that began ${symptom.startedAt.toLocaleDateString()} has resolved.`,
      refResourceType: 'SymptomEntry',
      refResourceId: symptom.id,
      occurredAt: new Date(),
    });

    return { success: true, data: resolved };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a symptom entry' })
  async deleteSymptom(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    const deleted = await this.prisma.symptomEntry.deleteMany({
      where: { id, userId },
    });
    return { success: deleted.count > 0 };
  }
}
