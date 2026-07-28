// ============================================
// Password Service — Hashing, Verification, Reset
// Uses bcrypt with timing-safe comparison
// ============================================

import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../../common/database/database.module';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);
  private readonly SALT_ROUNDS = 12;
  private readonly RESET_TOKEN_TTL = 3600; // 1 hour in seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── Hash password ──────────────────────────
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  // ─── Verify password ───────────────────────
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ─── Account lockout check ─────────────────
  async checkLockout(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { failedAttempts: true, lockedUntil: true },
    });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Account locked. Try again in ${minutesLeft} minute(s).`,
      );
    }
  }

  // ─── Record failed attempt ─────────────────
  async recordFailedAttempt(userId: string): Promise<void> {
    const maxAttempts = parseInt(this.config.get('MAX_LOGIN_ATTEMPTS', '5'));
    const lockoutMinutes = parseInt(this.config.get('LOCKOUT_MINUTES', '15'));

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: { increment: 1 } },
      select: { failedAttempts: true },
    });

    if (user.failedAttempts >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + lockoutMinutes * 60000);
      await this.prisma.user.update({
        where: { id: userId },
        data: { lockedUntil },
      });
      this.logger.warn(`Account locked for user ${userId} until ${lockedUntil.toISOString()}`);
    }
  }

  // ─── Reset failed attempts ─────────────────
  async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }

  // ─── Generate password reset token ─────────
  async createResetToken(email: string, ipAddress?: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether email exists — return null silently
      return null;
    }

    // Rate limit: max 3 reset requests per hour
    const recentResets = await this.prisma.passwordReset.count({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - 3600000) },
      },
    });

    if (recentResets >= 3) {
      throw new BadRequestException('Too many reset requests. Try again in 1 hour.');
    }

    // Invalidate previous tokens
    await this.prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + this.RESET_TOKEN_TTL * 1000),
        ipAddress,
      },
    });

    return rawToken; // Send this via email; store hashed version
  }

  // ─── Validate and use reset token ──────────
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    const reset = await this.prisma.passwordReset.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await this.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash, failedAttempts: 0, lockedUntil: null },
      }),
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens on password change
      this.prisma.refreshToken.updateMany({
        where: { userId: reset.userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    this.logger.log(`Password reset completed for user ${reset.userId}`);
  }

  // ─── Change password (authenticated) ───────
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      throw new BadRequestException('Account does not have a password. Use OAuth or set one first.');
    }

    const isValid = await this.verify(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await this.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      // Revoke all refresh tokens except current session
      this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);
  }
}
