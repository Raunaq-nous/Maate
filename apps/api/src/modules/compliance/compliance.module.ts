// ============================================
// Compliance Module — DPDP & HIPAA
// ============================================

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../../common/storage/storage.module';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';

@Module({
  imports: [DatabaseModule, AuthModule, StorageModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
