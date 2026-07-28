// ============================================
// Common Module — Compliance & Infra
// ============================================

import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit/audit.service';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';

@Global()
@Module({
  imports: [DatabaseModule, RedisModule, StorageModule],
  providers: [AuditService],
  exports: [AuditService, DatabaseModule, RedisModule, StorageModule],
})
export class CommonModule {}
