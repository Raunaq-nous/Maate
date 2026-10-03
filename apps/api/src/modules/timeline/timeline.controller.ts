// ============================================
// Timeline Controller — Health History API
// Unified access to chronological events
// ============================================

import { TimelineEventType } from '@maate/database';
import { Controller, Get, Query, Patch, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';

import type { AuditService} from '../../common/audit/audit.service';
import { AuditAction } from '../../common/audit/audit.service';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';

import type { TimelineService, TimelineFilters } from './timeline.service';

@ApiTags('timeline')
@ApiBearerAuth()
@Controller({ path: 'timeline', version: '1' })
export class TimelineController {
  constructor(
    private readonly timelineService: TimelineService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get unified health timeline' })
  @ApiQuery({ name: 'type', enum: TimelineEventType, required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTimeline(
    @CurrentUser('sub') userId: string,
    @Query() filters: TimelineFilters,
    @Req() req?: Request,
  ) {
    const data = await this.timelineService.getTimeline(userId, filters);
    await this.audit.record({
      userId,
      action: AuditAction.PHI_VIEW,
      resource: 'Timeline',
      req,
    });
    return data;
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: 'Pin/Unpin an event on the timeline' })
  async togglePin(
    @CurrentUser('sub') userId: string,
    @Param('id') eventId: string,
    @Body('isPinned') isPinned: boolean,
  ) {
    return this.timelineService.togglePin(userId, eventId, isPinned);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get health timeline highlights' })
  async getHighlights(@CurrentUser('sub') userId: string, @Req() req?: Request) {
    const summary = await this.timelineService.getSummary(userId);
    await this.audit.record({
      userId,
      action: AuditAction.PHI_VIEW,
      resource: 'TimelineSummary',
      req,
    });
    return summary;
  }
}
