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
import { PrismaService } from '../../common/database/database.module';

describe('Auth & Token Management', () => {
  let tokenService: TokenService;
  let authService: AuthService;
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
});
