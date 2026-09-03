// ============================================
// Timeline Controller — Health History API
// Unified access to chronological events
// ============================================

import { Controller, Get, Query, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { TimelineService, TimelineFilters } from './timeline.service';
import { TimelineEventType } from '@maate/database';

@ApiTags('timeline')
@ApiBearerAuth()
@Controller({ path: 'timeline', version: '1' })
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get()
  @ApiOperation({ summary: 'Get unified health timeline' })
  @ApiQuery({ name: 'type', enum: TimelineEventType, required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTimeline(
    @CurrentUser('sub') userId: string,
    @Query() filters: TimelineFilters,
  ) {
    return this.timelineService.getTimeline(userId, filters);
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
  async getHighlights(@CurrentUser('sub') userId: string) {
    return this.timelineService.getSummary(userId);
  }
}
