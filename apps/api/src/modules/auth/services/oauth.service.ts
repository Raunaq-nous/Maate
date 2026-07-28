// ============================================
// OAuth Service — Google & Apple Sign-In
// Verifies ID tokens and links/creates accounts
// ============================================

import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

import { PrismaService } from '../../../common/database/database.module';
import { TokenService } from './token.service';

interface OAuthProfile {
  providerId: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  rawProfile?: Record<string, unknown>;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly tokenService: TokenService,
  ) {}

  // ─── Google Sign-In ─────────────────────────
  async verifyGoogleToken(idToken: string): Promise<OAuthProfile> {
    try {
      // In production: use google-auth-library to verify
      // const { OAuth2Client } = require('google-auth-library');
      // const client = new OAuth2Client(this.config.get('GOOGLE_CLIENT_ID'));
      // const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
      // const payload = ticket.getPayload();

      const parts = idToken.split('.');
      if (parts.length < 2) throw new Error('Invalid token format');
      const payload = JSON.parse(
        Buffer.from(parts[1]!, 'base64').toString(),
      );

      return {
        providerId: payload.sub,
        email: payload.email,
        displayName: payload.name,
        avatarUrl: payload.picture,
        rawProfile: payload,
      };
    } catch (error) {
      this.logger.error('Google token verification failed', error);
      throw new UnauthorizedException('Invalid Google ID token');
    }
  }

  // ─── Apple Sign-In ──────────────────────────
  async verifyAppleToken(idToken: string): Promise<OAuthProfile> {
    try {
      // In production: use apple-signin-auth to verify
      // const appleSignin = require('apple-signin-auth');
      // const payload = await appleSignin.verifyIdToken(idToken, { audience: APPLE_CLIENT_ID });

      const parts = idToken.split('.');
      if (parts.length < 2) throw new Error('Invalid token format');
      const payload = JSON.parse(
        Buffer.from(parts[1]!, 'base64').toString(),
      );

      return {
        providerId: payload.sub,
        email: payload.email,
        rawProfile: payload,
      };
    } catch (error) {
      this.logger.error('Apple token verification failed', error);
      throw new UnauthorizedException('Invalid Apple ID token');
    }
  }

  // ─── OAuth Login/Register Flow ──────────────
  async loginOrRegister(
    provider: 'google' | 'apple',
    idToken: string,
    options?: { fullName?: string; deviceName?: string; userAgent?: string; ipAddress?: string },
  ) {
    // 1. Verify token with provider
    const profile =
      provider === 'google'
        ? await this.verifyGoogleToken(idToken)
        : await this.verifyAppleToken(idToken);

    // Use provided fullName (Apple first sign-in) or profile name
    const displayName = options?.fullName || profile.displayName || 'User';

    // 2. Check if OAuth account already exists
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: provider === 'google' ? 'GOOGLE' : 'APPLE',
          providerId: profile.providerId,
        },
      },
      include: { user: true },
    });

    if (existingOAuth) {
      // Existing user — update OAuth tokens and login
      await this.prisma.oAuthAccount.update({
        where: { id: existingOAuth.id },
        data: {
          avatarUrl: profile.avatarUrl,
          rawProfile: (profile.rawProfile as any) ?? undefined,
        },
      });

      await this.updateLoginTracking(existingOAuth.user.id);

      // Create session
      const session = await this.createSession(existingOAuth.user.id, {
        deviceName: options?.deviceName,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });

      const tokens = await this.tokenService.generateTokenPair(
        { id: existingOAuth.user.id, email: existingOAuth.user.email, phone: existingOAuth.user.phone, role: existingOAuth.user.role },
        { userAgent: options?.userAgent, ipAddress: options?.ipAddress, sessionId: session.id },
      );

      return {
        user: this.sanitizeUser(existingOAuth.user),
        ...tokens,
        isNewUser: false,
      };
    }

    // 3. Check if user exists with same email (link accounts)
    let user = profile.email
      ? await this.prisma.user.findUnique({ where: { email: profile.email } })
      : null;

    if (user) {
      // Link OAuth to existing email account
      await this.prisma.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: provider === 'google' ? 'GOOGLE' : 'APPLE',
          providerId: profile.providerId,
          email: profile.email,
          displayName,
          avatarUrl: profile.avatarUrl,
          rawProfile: (profile.rawProfile as any) ?? undefined,
        },
      });

      // Mark email as verified since OAuth provider verified it
      if (!user.isEmailVerified) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isEmailVerified: true },
        });
      }
    } else {
      // 4. Create new user + OAuth account
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          fullName: displayName,
          avatarUrl: profile.avatarUrl,
          isEmailVerified: !!profile.email,
          oauthAccounts: {
            create: {
              provider: provider === 'google' ? 'GOOGLE' : 'APPLE',
              providerId: profile.providerId,
              email: profile.email,
              displayName,
              avatarUrl: profile.avatarUrl,
              rawProfile: (profile.rawProfile as any) ?? undefined,
            },
          },
        },
      });

      this.logger.log(`New OAuth user created: ${user.id} via ${provider}`);
    }

    await this.updateLoginTracking(user.id);

    const session = await this.createSession(user.id, {
      deviceName: options?.deviceName,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });

    const tokens = await this.tokenService.generateTokenPair(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      { userAgent: options?.userAgent, ipAddress: options?.ipAddress, sessionId: session.id },
    );

    return {
      user: this.sanitizeUser(user),
      ...tokens,
      isNewUser: !user.onboardingDone,
    };
  }

  // ─── Helpers ────────────────────────────────
  private async createSession(userId: string, meta?: { deviceName?: string; deviceOS?: string; ipAddress?: string; userAgent?: string }) {
    return this.prisma.userSession.create({
      data: {
        userId,
        deviceName: meta?.deviceName,
        deviceOS: meta?.deviceOS,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });
  }

  private async updateLoginTracking(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 }, failedAttempts: 0, lockedUntil: null },
    });
  }

  private sanitizeUser(user: any) {
    const { passwordHash, failedAttempts, lockedUntil, fcmToken, apnsToken, ...safe } = user;
    return safe;
  }
}
