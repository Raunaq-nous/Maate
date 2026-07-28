// ============================================
// OTP Service — Generate & Verify OTPs
// Uses Redis for storage with TTL
// ============================================

import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../common/redis/redis.module';

@Injectable()
export class OtpService {
  private readonly OTP_TTL = 300; // 5 minutes
  private readonly OTP_PREFIX = 'otp:';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async generate(identifier: string): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redis.set(`${this.OTP_PREFIX}${identifier}`, otp, 'EX', this.OTP_TTL);
    return otp;
  }

  async verify(identifier: string, otp: string): Promise<boolean> {
    const stored = await this.redis.get(`${this.OTP_PREFIX}${identifier}`);
    if (stored === otp) {
      await this.redis.del(`${this.OTP_PREFIX}${identifier}`);
      return true;
    }
    return false;
  }

  async getOtpForDev(identifier: string): Promise<string | null> {
    return this.redis.get(`${this.OTP_PREFIX}${identifier}`);
  }
}

