// ============================================
// Health Module — Analytics & Vitals
// ============================================

import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { HealthController } from './health.controller';
import { VitalsController } from './vitals.controller';
import { SymptomsController } from './symptoms.controller';
import { ConditionsController } from './conditions.controller';
import { DoctorNotesController } from './doctor-notes.controller';

@Module({
  controllers: [
    HealthController,
    AnalyticsController,
    VitalsController,
    SymptomsController,
    ConditionsController,
    DoctorNotesController,
  ],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class HealthModule {}

