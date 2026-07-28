// ============================================
// Analytics Controller — Health Dashboard APIs
// ============================================

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { AnalyticsService, PeriodKey } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get full analytics dashboard data' })
  @ApiQuery({ name: 'period', enum: ['7D', '1M', '3M', '6M', '1Y'], required: false })
  async getDashboard(
    @CurrentUser('sub') userId: string,
    @Query('period') period: PeriodKey = '3M',
  ) {
    return { data: await this.analyticsService.getDashboard(userId, period) };
  }
}
