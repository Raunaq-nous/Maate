// ============================================
// Token Service — JWT + Refresh Token Rotation
// Family-based rotation detection (theft guard)
// ============================================

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

import { PrismaService } from '../../../common/database/database.module';

export interface JwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  role: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Generate access + refresh token pair ─
  async generateTokenPair(
    user: { id: string; email?: string | null; phone?: string | null; role: string },
    meta?: { userAgent?: string; ipAddress?: string; sessionId?: string; family?: string },
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      role: user.role,
      sessionId: meta?.sessionId,
    };

    const accessToken = await this.jwt.signAsync(payload);

    // Cryptographically secure refresh token
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshDays = parseInt(this.config.get('JWT_REFRESH_DAYS', '30'));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    // Use existing family or create new one for rotation tracking
    const family = meta?.family ?? randomBytes(16).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        family,
        expiresAt,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: parseInt(this.config.get('JWT_ACCESS_EXPIRY_SECONDS', '900')),
    };
  }

  // ─── Refresh with rotation + theft detection ─
  async refreshAccessToken(refreshToken: string, meta?: { userAgent?: string; ipAddress?: string }) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // THEFT DETECTION: if token was already used (revoked),
    // revoke ENTIRE family — an attacker may have stolen the old token
    if (stored.isRevoked) {
      this.logger.warn(`Refresh token reuse detected! Revoking family=${stored.family} user=${stored.userId}`);
      await this.prisma.refreshToken.updateMany({
        where: { family: stored.family },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Token reuse detected. All sessions revoked for security.');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Revoke current token (one-time use)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    // Issue new pair in same family
    return this.generateTokenPair(
      { id: stored.user.id, email: stored.user.email, phone: stored.user.phone, role: stored.user.role },
      { userAgent: meta?.userAgent, ipAddress: meta?.ipAddress, family: stored.family },
    );
  }

  // ─── Verify access token ────────────────────
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  // ─── Revoke all tokens for user ─────────────
  async revokeAllTokens(userId: string) {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    this.logger.log(`Revoked ${result.count} tokens for user ${userId}`);
  }

  // ─── Revoke specific family ─────────────────
  async revokeTokenFamily(family: string) {
    await this.prisma.refreshToken.updateMany({
      where: { family },
      data: { isRevoked: true },
    });
  }

  // ─── Cleanup expired tokens (cron) ──────────
  async cleanupExpiredTokens() {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true, createdAt: { lt: new Date(Date.now() - 7 * 86400000) } }] },
    });
    this.logger.log(`Cleaned up ${result.count} expired/revoked tokens`);
  }
}
