import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { AuditService } from './audit/audit.service';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';

@Global()
@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD') || undefined,
          db: configService.get<number>('REDIS_DB', 0),
        },
      }),
    }),
    StorageModule,
  ],
  providers: [AuditService],
  exports: [AuditService, DatabaseModule, RedisModule, StorageModule, BullModule],
})
export class CommonModule {}
