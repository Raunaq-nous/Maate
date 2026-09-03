// ============================================
// Analytics Controller — Health Dashboard APIs
// ============================================

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { AnalyticsService, PeriodKey } from './analytics.service';
import { QueryTrendsDto } from './dto/health.dto';

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

  @Get('trends')
  @ApiOperation({ summary: 'Get vital signs and biomarker trends' })
  async getTrends(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryTrendsDto,
  ) {
    return { data: await this.analyticsService.getTrends(userId, query) };
  }

  @Get('adherence')
  @ApiOperation({ summary: 'Get medication adherence analytics' })
  @ApiQuery({ name: 'period', enum: ['7D', '1M', '3M', '6M', '1Y'], required: false })
  async getAdherence(
    @CurrentUser('sub') userId: string,
    @Query('period') period: PeriodKey = '3M',
  ) {
    const { start, end } = (this.analyticsService as any).periodToDates(period);
    return { data: await this.analyticsService.getMedicationAdherence(userId, start, end) };
  }

  @Get('intake')
  @ApiOperation({ summary: 'Get hydration intake analytics' })
  @ApiQuery({ name: 'period', enum: ['7D', '1M', '3M', '6M', '1Y'], required: false })
  async getIntake(
    @CurrentUser('sub') userId: string,
    @Query('period') period: PeriodKey = '3M',
  ) {
    const { start, end } = (this.analyticsService as any).periodToDates(period);
    return { data: await this.analyticsService.getWaterIntake(userId, start, end) };
  }

  @Get('risk-score')
  @ApiOperation({ summary: 'Get overall health risk and score' })
  @ApiQuery({ name: 'period', enum: ['7D', '1M', '3M', '6M', '1Y'], required: false })
  async getRiskScore(
    @CurrentUser('sub') userId: string,
    @Query('period') period: PeriodKey = '3M',
  ) {
    const { start, end } = (this.analyticsService as any).periodToDates(period);
    return { data: await this.analyticsService.computeHealthScore(userId, start, end) };
  }
}
