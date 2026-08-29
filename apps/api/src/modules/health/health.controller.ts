// ============================================
// Health Controller — Liveness & Readiness Checks
// Verifies PostgreSQL and Redis connectivity
// ============================================

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/auth/jwt-auth.guard';
import { PrismaService } from '../../common/database/database.module';
import { RedisService } from '../../common/redis/redis.service';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check verifying database and cache connectivity' })
  async getHealth() {
    const startTime = Date.now();

    // 1. Check PostgreSQL
    let dbStatus = 'down';
    let dbLatencyMs = -1;
    let seededUsers = 0;
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      seededUsers = await this.prisma.user.count();
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = 'up';
    } catch (err: any) {
      dbStatus = `error: ${err.message}`;
    }

    // 2. Check Redis
    let redisStatus = 'down';
    let redisLatencyMs = -1;
    try {
      const redisStart = Date.now();
      await this.redisService.set('health_check', 'ok', 10);
      const val = await this.redisService.get('health_check');
      if (val === 'ok') {
        redisStatus = 'up';
        redisLatencyMs = Date.now() - redisStart;
      }
    } catch (err: any) {
      redisStatus = `error: ${err.message}`;
    }

    const isHealthy = dbStatus === 'up' && redisStatus === 'up';

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      latencyMs: Date.now() - startTime,
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          seededUsers,
        },
        redis: {
          status: redisStatus,
          latencyMs: redisLatencyMs,
        },
      },
    };
  }
}
