// ============================================
// Conditions Controller — Chronic Conditions API
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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { PrismaService } from '../../common/database/database.module';
import { TimelineService } from '../timeline/timeline.service';
import { CreateConditionDto, UpdateConditionDto } from './dto/health.dto';
import { TimelineEventType, ConditionStatus } from '@maate/database';

@ApiTags('conditions')
@ApiBearerAuth()
@Controller({ path: 'conditions', version: '1' })
export class ConditionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timelineService: TimelineService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Record a chronic condition' })
  async createCondition(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateConditionDto,
  ) {
    const diagnosedDate = dto.diagnosedDate ? new Date(dto.diagnosedDate) : new Date();

    const condition = await this.prisma.chronicCondition.create({
      data: {
        userId,
        conditionName: dto.conditionName,
        icdCode: dto.icdCode,
        snomedCode: dto.snomedCode,
        status: dto.status || 'ACTIVE',
        severity: dto.severity || 'MODERATE',
        diagnosedDate,
        diagnosedBy: dto.diagnosedBy,
        notes: dto.notes,
        managementPlan: dto.managementPlan,
      },
    });

    // Auto-record TimelineEvent
    await this.timelineService.recordEvent({
      userId,
      type: TimelineEventType.CONDITION_DIAGNOSED,
      title: `Condition Diagnosed: ${dto.conditionName}`,
      description: `Status: ${dto.status || 'ACTIVE'}, Severity: ${dto.severity || 'MODERATE'}. ${dto.notes || ''}`.trim(),
      severity: dto.severity,
      refResourceType: 'ChronicCondition',
      refResourceId: condition.id,
      occurredAt: diagnosedDate,
      metadata: {
        conditionName: dto.conditionName,
        icdCode: dto.icdCode,
        diagnosedBy: dto.diagnosedBy,
      },
    });

    return { success: true, data: condition };
  }

  @Get()
  @ApiOperation({ summary: 'List user chronic conditions' })
  @ApiQuery({ name: 'status', enum: ConditionStatus, required: false })
  async getConditions(
    @CurrentUser('sub') userId: string,
    @Query('status') status?: ConditionStatus,
  ) {
    const conditions = await this.prisma.chronicCondition.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(status && { status }),
      },
      orderBy: { diagnosedDate: 'desc' },
    });

    return { data: conditions };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update chronic condition status or notes' })
  async updateCondition(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConditionDto,
  ) {
    const condition = await this.prisma.chronicCondition.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!condition) return { success: false, message: 'Condition not found' };

    const updated = await this.prisma.chronicCondition.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.severity && { severity: dto.severity }),
        ...(dto.resolvedDate && { resolvedDate: new Date(dto.resolvedDate) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.managementPlan !== undefined && { managementPlan: dto.managementPlan }),
      },
    });

    if (dto.status === 'RESOLVED') {
      await this.timelineService.recordEvent({
        userId,
        type: TimelineEventType.CONDITION_RESOLVED,
        title: `Condition Resolved: ${condition.conditionName}`,
        description: `Marked as resolved on ${new Date().toLocaleDateString()}`,
        refResourceType: 'ChronicCondition',
        refResourceId: condition.id,
        occurredAt: dto.resolvedDate ? new Date(dto.resolvedDate) : new Date(),
      });
    }

    return { success: true, data: updated };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a chronic condition' })
  async deleteCondition(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    const deleted = await this.prisma.chronicCondition.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return { success: deleted.count > 0 };
  }
}
