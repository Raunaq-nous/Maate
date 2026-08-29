// ============================================
// Health Module — Analytics & Vitals
// ============================================

import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class HealthModule {}
