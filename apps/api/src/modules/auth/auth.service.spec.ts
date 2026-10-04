import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RevokeReason } from '@maate/database';

import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { OtpService } from './services/otp.service';
import { OAuthService } from './services/oauth.service';
import { MailService } from '../notification/mail.service';
import { TotpService } from './services/totp.service';
import { PrismaService } from '../../common/database/database.module';

describe('Auth & Token Management', () => {
  let tokenService: TokenService;
  let authService: AuthService;
  let totpService: TotpService;
  let prisma: any;
  let jwtService: any;
  let configService: any;
  let passwordService: any;
  let otpService: any;
  let mailService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userMfa: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      userSession: {
        create: jest.fn().mockResolvedValue({ id: 'sess-1' }),
        findFirst: jest.fn().mockResolvedValue({ id: 'sess-1', isActive: true }),
        update: jest.fn().mockResolvedValue({ id: 'sess-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'rt-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-access-token'),
      verifyAsync: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'JWT_REFRESH_DAYS') return '30';
        if (key === 'JWT_ACCESS_EXPIRY_SECONDS') return '900';
        return defaultVal;
      }),
    };

    passwordService = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
      verify: jest.fn(),
    };

    otpService = {
      generate: jest.fn().mockResolvedValue('123456'),
      verify: jest.fn(),
    };

    mailService = {
      sendMail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        TokenService,
        TotpService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: PasswordService, useValue: passwordService },
        { provide: OtpService, useValue: otpService },
        { provide: OAuthService, useValue: {} },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    tokenService = module.get<TokenService>(TokenService);
    authService = module.get<AuthService>(AuthService);
    totpService = module.get<TotpService>(TotpService);
  });

  describe('TokenService.generateTokenPair', () => {
    it('should generate valid access token and refresh token with metadata', async () => {
      const user = { id: 'user-123', email: 'priya@example.com', role: 'PATIENT' };
      const pair = await tokenService.generateTokenPair(user, { userAgent: 'Jest/Node', ipAddress: '127.0.0.1' });

      expect(pair.accessToken).toBe('mock-jwt-access-token');
      expect(typeof pair.refreshToken).toBe('string');
      expect(pair.expiresIn).toBe(900);
      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            userAgent: 'Jest/Node',
            ipAddress: '127.0.0.1',
          }),
        }),
      );
    });
  });

  describe('TokenService.refreshAccessToken — Rotation & Theft Detection', () => {
    it('should rotate token successfully on valid unrevoked refresh token', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-active',
        token: 'valid-refresh-token',
        userId: 'user-123',
        family: 'fam-1',
        isRevoked: false,
        expiresAt: futureDate,
        user: { id: 'user-123', email: 'priya@example.com', role: 'PATIENT', isActive: true },
      });

      const newPair = await tokenService.refreshAccessToken('valid-refresh-token');

      // 1. Current token revoked with ROTATED reason
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-active' },
        data: expect.objectContaining({
          isRevoked: true,
          revokedReason: RevokeReason.ROTATED,
        }),
      });

      // 2. New token issued in same family
      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            family: 'fam-1',
            userId: 'user-123',
          }),
        }),
      );
      expect(newPair.accessToken).toBe('mock-jwt-access-token');
    });

    it('should reject and detect THEFT when a ROTATED token is reused', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-already-used',
        token: 'stale-token',
        userId: 'user-123',
        family: 'fam-compromised',
        isRevoked: true,
        revokedReason: RevokeReason.ROTATED,
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'user-123', email: 'priya@example.com', role: 'PATIENT', isActive: true },
      });

      await expect(tokenService.refreshAccessToken('stale-token')).rejects.toThrow(
        new UnauthorizedException('Token reuse detected. All sessions revoked for security.'),
      );

      // Verify emergency family-wide cascade revocation
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { family: 'fam-compromised', isRevoked: false },
        data: expect.objectContaining({
          isRevoked: true,
          revokedReason: RevokeReason.THEFT_DETECTED,
        }),
      });
    });

    it('should differentiate LOGOUT revocation reason with distinct user message', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-logged-out',
        token: 'logout-token',
        userId: 'user-123',
        family: 'fam-1',
        isRevoked: true,
        revokedReason: RevokeReason.LOGOUT,
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'user-123', email: 'priya@example.com', role: 'PATIENT', isActive: true },
      });

      await expect(tokenService.refreshAccessToken('logout-token')).rejects.toThrow(
        new UnauthorizedException('Session has ended. Please log in again.'),
      );
    });

    it('should reject expired refresh token', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-expired',
        token: 'expired-token',
        userId: 'user-123',
        family: 'fam-1',
        isRevoked: false,
        expiresAt: pastDate,
        user: { id: 'user-123', email: 'priya@example.com', role: 'PATIENT', isActive: true },
      });

      await expect(tokenService.refreshAccessToken('expired-token')).rejects.toThrow(
        new UnauthorizedException('Refresh token expired'),
      );
    });
  });

  describe('AuthService.register & loginWithPassword', () => {
    it('should register new user and return tokens with sanitized profile', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-new',
        email: 'rajesh@example.com',
        fullName: 'Rajesh Sharma',
        role: 'PATIENT',
        isActive: true,
        passwordHash: 'hashed-pwd',
      });

      const result = await authService.register({
        email: 'rajesh@example.com',
        password: 'Password123!',
        fullName: 'Rajesh Sharma',
      });

      expect(result.user.email).toBe('rajesh@example.com');
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.accessToken).toBe('mock-jwt-access-token');
      expect(result.isNewUser).toBe(true);
    });

    it('should prevent registration with duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user', email: 'priya@example.com' });

      await expect(
        authService.register({
          email: 'priya@example.com',
          password: 'Password123!',
          fullName: 'Priya Sharma',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Multi-Factor Authentication (MFA / TOTP)', () => {
    it('should challenge user with mfaRequired when user has enabled TOTP', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-mfa-1',
        email: 'priya@example.com',
        isActive: true,
        passwordHash: 'hashed-pwd',
      });
      passwordService.checkLockout = jest.fn().mockResolvedValue(true);
      passwordService.verify.mockResolvedValue(true);
      passwordService.resetFailedAttempts = jest.fn().mockResolvedValue(true);

      prisma.userMfa.findUnique.mockResolvedValue({
        id: 'mfa-1',
        userId: 'user-mfa-1',
        isEnabled: true,
        type: 'TOTP',
      });

      jwtService.signAsync.mockResolvedValue('mfa-challenge-jwt-token');
      const tokenSpy = jest.spyOn(tokenService, 'generateTokenPair');

      const result = await authService.loginWithPassword({
        email: 'priya@example.com',
        password: 'Password123!',
      });

      expect(result.mfaRequired).toBe(true);
      expect(result.mfaToken).toBe('mfa-challenge-jwt-token');
      expect(result.mfaType).toBe('TOTP');
      expect(tokenSpy).not.toHaveBeenCalled();
    });

    it('should setup MFA with fresh secret and backup recovery codes', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'priya@example.com',
      });
      prisma.userMfa.upsert.mockResolvedValue({ id: 'mfa-1', userId: 'user-123' });

      const result = await authService.setupMfa('user-123');

      expect(result.secret).toBeDefined();
      expect(result.otpAuthUrl).toContain('otpauth://totp/');
      expect(result.backupCodes).toHaveLength(8);
      expect(prisma.userMfa.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          create: expect.objectContaining({
            userId: 'user-123',
            type: 'TOTP',
            isEnabled: false,
          }),
        }),
      );
    });

    it('should enable MFA when provided valid verification code', async () => {
      const secret = totpService.generateSecret();
      const validCode = totpService.generateTotp(secret);

      prisma.userMfa.findUnique.mockResolvedValue({
        id: 'mfa-1',
        userId: 'user-123',
        secret,
        isEnabled: false,
      });
      prisma.userMfa.update.mockResolvedValue({ id: 'mfa-1', isEnabled: true });

      const result = await authService.enableMfa('user-123', { code: validCode });

      expect(prisma.userMfa.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          data: expect.objectContaining({
            isEnabled: true,
          }),
        }),
      );
      expect(result.message).toContain('Two-factor authentication successfully enabled');
    });

    it('should complete login verification when correct TOTP code is provided for challenge', async () => {
      const secret = totpService.generateSecret();
      const validCode = totpService.generateTotp(secret);

      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-123',
        email: 'priya@example.com',
        scope: 'mfa_challenge',
      });

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'priya@example.com',
        role: 'PATIENT',
        isActive: true,
      });

      prisma.userMfa.findUnique.mockResolvedValue({
        id: 'mfa-1',
        userId: 'user-123',
        secret,
        isEnabled: true,
        backupCodes: [],
      });

      const result = await authService.verifyMfaLogin({
        mfaToken: 'valid-challenge-token',
        code: validCode,
      });

      expect(result.user.email).toBe('priya@example.com');
      expect(result.accessToken).toBe('mock-jwt-access-token');
      expect(prisma.userSession.create).toHaveBeenCalled();
    });
  });

  describe('DPDP / HIPAA Account Erasure & Soft Deletion', () => {
    it('should soft-delete user, anonymize PII, and revoke sessions', async () => {
      prisma.user.update.mockResolvedValue({ id: 'user-123' });
      const revokeSpy = jest.spyOn(tokenService, 'revokeAllTokens').mockResolvedValue(true as any);

      const result = await authService.deleteAccount('user-123');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          fullName: 'Deleted User',
          phone: null,
          isActive: false,
          deletedAt: expect.any(Date),
        }),
      });
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isActive: true },
        data: { isActive: false },
      });
      expect(revokeSpy).toHaveBeenCalledWith('user-123');
      expect(result.message).toBe('Account deleted successfully');
    });
  });
});

