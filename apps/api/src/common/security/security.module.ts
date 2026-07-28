// ============================================
// Security Module — Rate Limiting & Hardening
// ============================================

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 60000, // 1 minute
      limit: 60,  // 60 requests
    }, {
      name: 'medium',
      ttl: 3600000, // 1 hour
      limit: 1000,
    }, {
      name: 'auth', // Stricter for login/register
      ttl: 3600000,
      limit: 10,
    }]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class SecurityModule {}
