// ============================================
// Token Service — JWT + Refresh Token Rotation
// Family-based rotation detection (theft guard)
// ============================================

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

import { PrismaService } from '../../../common/database/database.module';
import { RevokeReason } from '@maate/database';

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

    // Check revoked status and branch on specific revocation reason
    if (stored.isRevoked) {
      if (stored.revokedReason === RevokeReason.LOGOUT) {
        throw new UnauthorizedException('Session has ended. Please log in again.');
      }

      if (stored.revokedReason === RevokeReason.THEFT_DETECTED) {
        throw new UnauthorizedException('Session revoked due to security incident. Please log in again.');
      }

      if (stored.revokedReason === RevokeReason.ROTATED) {
        // THEFT DETECTION: this token was already rotated out and should not be reused.
        // Revoke remaining active tokens in this family as an emergency mitigation response.
        this.logger.warn(`Refresh token reuse detected! Revoking family=${stored.family} user=${stored.userId}`);
        await this.prisma.refreshToken.updateMany({
          where: { family: stored.family, isRevoked: false },
          data: {
            isRevoked: true,
            revokedReason: RevokeReason.THEFT_DETECTED,
            revokedAt: new Date(),
          },
        });
        throw new UnauthorizedException('Token reuse detected. All sessions revoked for security.');
      }

      // Legacy fallback for pre-existing rows revoked without a recorded reason
      throw new UnauthorizedException('Session has ended. Please log in again.');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Revoke current token (one-time use via normal rotation)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: {
        isRevoked: true,
        revokedReason: RevokeReason.ROTATED,
        revokedAt: new Date(),
      },
    });

    // Find latest active session to preserve sessionId in refreshed access token
    const activeSession = await this.prisma.userSession.findFirst({
      where: { userId: stored.user.id, isActive: true },
      orderBy: { lastActiveAt: 'desc' },
    });

    if (activeSession) {
      await this.prisma.userSession.update({
        where: { id: activeSession.id },
        data: { lastActiveAt: new Date() },
      });
    }

    // Issue new pair in same family
    return this.generateTokenPair(
      { id: stored.user.id, email: stored.user.email, phone: stored.user.phone, role: stored.user.role },
      { userAgent: meta?.userAgent, ipAddress: meta?.ipAddress, family: stored.family, sessionId: activeSession?.id },
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
  async revokeAllTokens(userId: string, reason: RevokeReason = RevokeReason.LOGOUT) {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: {
        isRevoked: true,
        revokedReason: reason,
        revokedAt: new Date(),
      },
    });
    this.logger.log(`Revoked ${result.count} tokens for user ${userId} (reason=${reason})`);
  }

  // ─── Revoke specific family ─────────────────
  async revokeTokenFamily(family: string, reason: RevokeReason = RevokeReason.THEFT_DETECTED) {
    await this.prisma.refreshToken.updateMany({
      where: { family, isRevoked: false },
      data: {
        isRevoked: true,
        revokedReason: reason,
        revokedAt: new Date(),
      },
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
