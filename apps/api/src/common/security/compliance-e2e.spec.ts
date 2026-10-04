import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthService } from '../../modules/auth/auth.service';
import { AuthController } from '../../modules/auth/auth.controller';
import { TokenService } from '../../modules/auth/services/token.service';
import { PasswordService } from '../../modules/auth/services/password.service';
import { OtpService } from '../../modules/auth/services/otp.service';
import { OAuthService } from '../../modules/auth/services/oauth.service';
import { TotpService } from '../../modules/auth/services/totp.service';
import { MailService } from '../../modules/notification/mail.service';

import { ConsentService } from '../../modules/consent/consent.service';
import { ConsentController } from '../../modules/consent/consent.controller';

import { ComplianceService } from '../../modules/compliance/compliance.service';
import { ComplianceController } from '../../modules/compliance/compliance.controller';

import { DocumentProcessor } from '../../common/storage/document.processor';
import { StorageService } from '../../common/storage/storage.service';
import { NotificationService } from '../../modules/notification/notification.service';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../common/database/database.module';
import { of } from 'rxjs';

describe('Phase 11 Compliance & Security End-to-End Suite', () => {
  const TEST_USER_ID = 'aaaaaaaa-1111-2222-3333-444444444444';
  const TEST_EMAIL = 'priya.sharma@example.com';

  let authController: AuthController;
  let authService: AuthService;
  let consentController: ConsentController;
  let consentService: ConsentService;
  let complianceController: ComplianceController;
  let complianceService: ComplianceService;
  let totpService: TotpService;
  let documentProcessor: DocumentProcessor;
  let prisma: any;
  let http: any;

  // In-memory mock database state
  let mockConsents: any[] = [];
  let mockExportRequests: any[] = [];
  let mockUserMfa: any = null;
  let mockUser: any = null;
  let mockSessions: any[] = [];

  beforeEach(async () => {
    mockConsents = [];
    mockExportRequests = [];
    mockUserMfa = null;
    mockSessions = [];
    mockUser = {
      id: TEST_USER_ID,
      email: TEST_EMAIL,
      fullName: 'Priya Sharma',
      phone: '+919876543210',
      role: 'PATIENT',
      isActive: true,
      passwordHash: 'hashed-password-123',
      deletedAt: null,
    };

    prisma = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === TEST_USER_ID || where.email === TEST_EMAIL) return Promise.resolve(mockUser);
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          mockUser = { ...mockUser, ...data };
          return Promise.resolve(mockUser);
        }),
      },
      userSession: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const sess = { id: `sess-${Date.now()}`, ...data, isActive: true };
          mockSessions.push(sess);
          return Promise.resolve(sess);
        }),
        updateMany: jest.fn().mockImplementation(({ where, data }: any) => {
          mockSessions.forEach((s) => {
            if (s.userId === where.userId) Object.assign(s, data);
          });
          return Promise.resolve({ count: mockSessions.length });
        }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      dataConsent: {
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          const found = mockConsents.find(
            (c) => c.userId === where.userId && c.purpose === where.purpose,
          );
          return Promise.resolve(found || null);
        }),
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          return Promise.resolve(mockConsents.filter((c) => c.userId === where.userId));
        }),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const created = { id: `consent-${Date.now()}`, ...data, createdAt: new Date() };
          mockConsents.push(created);
          return Promise.resolve(created);
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = mockConsents.findIndex((c) => c.id === where.id);
          if (idx !== -1) {
            mockConsents[idx] = { ...mockConsents[idx], ...data };
            return Promise.resolve(mockConsents[idx]);
          }
          return Promise.resolve(null);
        }),
      },
      dataExportRequest: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const req = { id: `export-${Date.now()}`, ...data, requestedAt: new Date() };
          mockExportRequests.push(req);
          return Promise.resolve(req);
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = mockExportRequests.findIndex((r) => r.id === where.id);
          if (idx !== -1) {
            mockExportRequests[idx] = { ...mockExportRequests[idx], ...data };
            return Promise.resolve(mockExportRequests[idx]);
          }
          return Promise.resolve(null);
        }),
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          const found = mockExportRequests.find(
            (r) => r.id === where.id && r.userId === where.userId,
          );
          return Promise.resolve(found || null);
        }),
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          return Promise.resolve(mockExportRequests.filter((r) => r.userId === where.userId));
        }),
      },
      userMfa: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (mockUserMfa && mockUserMfa.userId === where.userId) return Promise.resolve(mockUserMfa);
          return Promise.resolve(null);
        }),
        upsert: jest.fn().mockImplementation(({ create, update }: any) => {
          if (!mockUserMfa) {
            mockUserMfa = { id: 'mfa-1', ...create, updatedAt: new Date() };
          } else {
            mockUserMfa = { ...mockUserMfa, ...update, updatedAt: new Date() };
          }
          return Promise.resolve(mockUserMfa);
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          if (mockUserMfa && mockUserMfa.userId === where.userId) {
            mockUserMfa = { ...mockUserMfa, ...data };
            return Promise.resolve(mockUserMfa);
          }
          return Promise.resolve(null);
        }),
      },
      document: {
        findUnique: jest.fn().mockResolvedValue({ id: 'doc-1', userId: TEST_USER_ID, title: 'Lipid Panel' }),
        update: jest.fn().mockResolvedValue({ id: 'doc-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      ocrResult: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ocr-1',
          documentId: 'doc-1',
          rawText: 'Cholesterol 240 mg/dL',
          structuredData: {},
        }),
      },
      aiSummary: {
        upsert: jest.fn().mockResolvedValue({ id: 'ai-1' }),
      },
      documentChunk: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      vitalSign: { findMany: jest.fn().mockResolvedValue([{ id: 'v1', type: 'HEART_RATE', value: 72 }]) },
      symptomEntry: { findMany: jest.fn().mockResolvedValue([]) },
      chronicCondition: { findMany: jest.fn().mockResolvedValue([]) },
      doctorNote: { findMany: jest.fn().mockResolvedValue([]) },
      medicineReminder: { findMany: jest.fn().mockResolvedValue([]) },
      waterReminder: { findUnique: jest.fn().mockResolvedValue(null) },
      mealReminder: { findMany: jest.fn().mockResolvedValue([]) },
      timelineEvent: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    };

    const passwordService = {
      hash: jest.fn().mockResolvedValue('hashed-password-123'),
      verify: jest.fn().mockImplementation((pwd: string, hash: string) => {
        return Promise.resolve(pwd === 'Password123!' && hash === 'hashed-password-123');
      }),
      checkLockout: jest.fn().mockResolvedValue(true),
      recordFailedAttempt: jest.fn().mockResolvedValue(1),
      resetFailedAttempts: jest.fn().mockResolvedValue(true),
    };

    const jwtService = {
      signAsync: jest.fn().mockImplementation((payload: any) => {
        return Promise.resolve(`jwt-${JSON.stringify(payload)}`);
      }),
      verifyAsync: jest.fn().mockImplementation((token: string) => {
        if (token.startsWith('jwt-')) {
          return Promise.resolve(JSON.parse(token.replace('jwt-', '')));
        }
        throw new Error('Invalid token');
      }),
    };

    const configService = {
      get: jest.fn((key: string, defVal?: string) => {
        if (key === 'JWT_SECRET') return 'test-key';
        return defVal;
      }),
    };

    http = {
      post: jest.fn().mockReturnValue(of({ data: { data: { summary_text: 'Healthy profile' } } })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        AuthController,
        TokenService,
        TotpService,
        ConsentService,
        ConsentController,
        ComplianceService,
        ComplianceController,
        DocumentProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: PasswordService, useValue: passwordService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: OtpService, useValue: { generate: jest.fn(), verify: jest.fn() } },
        { provide: OAuthService, useValue: {} },
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        { provide: StorageService, useValue: { getFileBuffer: jest.fn().mockResolvedValue(Buffer.from('bytes')) } },
        { provide: NotificationService, useValue: { sendPushNotification: jest.fn().mockResolvedValue({ id: 'n1' }) } },
        { provide: HttpService, useValue: http },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    consentController = module.get<ConsentController>(ConsentController);
    consentService = module.get<ConsentService>(ConsentService);
    complianceController = module.get<ComplianceController>(ComplianceController);
    complianceService = module.get<ComplianceService>(ComplianceService);
    totpService = module.get<TotpService>(TotpService);
    documentProcessor = module.get<DocumentProcessor>(DocumentProcessor);
  });

  // ─── 1. CONSENT LIFECYCLE & GATING ─────────────

  describe('1. DPDP Consent Management Flow', () => {
    it('should grant, query, revoke, and enforce consent gating on AI pipeline', async () => {
      // Step A: Initially no consent exists
      const initialStatus = await consentController.checkConsentStatus(TEST_USER_ID, 'AI_SUMMARIZATION');
      expect(initialStatus.isGranted).toBe(false);

      // Step B: Grant consent
      const granted = await consentController.grantConsent(
        TEST_USER_ID,
        { purpose: 'AI_SUMMARIZATION' },
        'Mozilla/5.0',
        '127.0.0.1',
      );
      expect(granted.isGranted).toBe(true);

      const checkGranted = await consentController.checkConsentStatus(TEST_USER_ID, 'AI_SUMMARIZATION');
      expect(checkGranted.isGranted).toBe(true);

      // Step C: Pipeline runs and succeeds with granted consent
      const mockJobGranted: any = {
        id: 'job-1',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          documentId: 'doc-1',
          userId: TEST_USER_ID,
          pipeline: ['ai_summary'],
        },
      };
      await documentProcessor.handleProcess(mockJobGranted);
      expect(http.post).toHaveBeenCalled(); // AI service was invoked

      // Step D: Revoke consent
      http.post.mockClear();
      const revoked = await consentController.revokeConsent(
        TEST_USER_ID,
        { purpose: 'AI_SUMMARIZATION' },
        'Mozilla/5.0',
        '127.0.0.1',
      );
      expect(revoked.isGranted).toBe(false);

      const checkRevoked = await consentController.checkConsentStatus(TEST_USER_ID, 'AI_SUMMARIZATION');
      expect(checkRevoked.isGranted).toBe(false);

      // Step E: Pipeline now halts and withholds AI summarization
      await documentProcessor.handleProcess(mockJobGranted);
      expect(http.post).not.toHaveBeenCalled(); // AI service was NOT called
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { aiSummaryStatus: 'FAILED' },
      });
    });
  });

  // ─── 2. DATA EXPORT & ERASURE ──────────────────

  describe('2. DPDP Data Portability & Right to Erasure', () => {
    it('should compile complete patient archive and download bundle', async () => {
      // Request export
      const exportRes = await complianceController.requestExport(TEST_USER_ID, { format: 'json' });
      expect(exportRes.exportRequest.status).toBe('COMPLETED');
      expect(exportRes.data.profile?.fullName).toBe('Priya Sharma');
      expect(exportRes.data.clinicalData.vitals).toHaveLength(1);

      // Download export by ID
      const downloaded = await complianceController.downloadExport(
        TEST_USER_ID,
        exportRes.exportRequest.id,
      );
      expect(downloaded.exportMeta.id).toBe(exportRes.exportRequest.id);
      expect(downloaded.payload.profile?.email).toBe(TEST_EMAIL);
    });

    it('should execute Right to Erasure with password verification and anonymize PII', async () => {
      // Attempt with bad password -> rejected
      await expect(
        complianceController.executeErasure(
          TEST_USER_ID,
          { confirmation: 'DELETE MY ACCOUNT', password: 'WrongPassword' },
          'Mozilla/5.0',
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);

      // Attempt with valid password -> executed
      const result = await complianceController.executeErasure(
        TEST_USER_ID,
        { confirmation: 'DELETE MY ACCOUNT', password: 'Password123!' },
        'Mozilla/5.0',
        '127.0.0.1',
      );
      expect(result.success).toBe(true);

      // Verify user state in DB
      expect(mockUser.fullName).toBe('Deleted User');
      expect(mockUser.phone).toBeNull();
      expect(mockUser.isActive).toBe(false);
      expect(mockUser.deletedAt).toBeInstanceOf(Date);
      expect(mockUser.email).toContain('deleted-');
    });
  });

  // ─── 3. MULTI-FACTOR AUTHENTICATION (TOTP) ─────

  describe('3. Multi-Factor Authentication (MFA / TOTP) Challenge Flow', () => {
    it('should complete full MFA lifecycle: setup -> enable -> challenge interception -> verify login -> backup codes -> disable', async () => {
      // 1. Initial login (MFA not yet enabled) -> standard token pair returned
      const directLogin: any = await authController.login(
        { email: TEST_EMAIL, password: 'Password123!' },
        'Mozilla/5.0',
        '127.0.0.1',
      );
      expect(directLogin.mfaRequired).toBeUndefined();
      expect(directLogin.accessToken).toBeDefined();

      // 2. Setup MFA -> returns secret and 8 backup recovery codes
      const setup = await authController.setupMfa(TEST_USER_ID);
      expect(setup.secret).toBeDefined();
      expect(setup.backupCodes).toHaveLength(8);
      expect(setup.otpAuthUrl).toContain('otpauth://totp/');

      // 3. Enable MFA using valid TOTP generated from secret
      const validCode = totpService.generateTotp(setup.secret);
      const enableRes = await authController.enableMfa(TEST_USER_ID, { code: validCode });
      expect(enableRes.message).toContain('enabled');

      const status = await authController.getMfaStatus(TEST_USER_ID);
      expect(status.isEnabled).toBe(true);
      expect(status.backupCodesRemaining).toBe(8);

      // 4. Subsequent login attempt is intercepted with MFA challenge
      const challengedLogin: any = await authController.login(
        { email: TEST_EMAIL, password: 'Password123!' },
        'Mozilla/5.0',
        '127.0.0.1',
      );
      expect(challengedLogin.mfaRequired).toBe(true);
      expect(challengedLogin.mfaToken).toBeDefined();
      expect(challengedLogin.mfaType).toBe('TOTP');
      expect(challengedLogin.accessToken).toBeUndefined();

      // 5. Submit valid TOTP code to complete challenge
      const loginTotpCode = totpService.generateTotp(setup.secret);
      const mfaVerifyRes: any = await authController.verifyMfa(
        { mfaToken: challengedLogin.mfaToken!, code: loginTotpCode },
        'Mozilla/5.0',
        '127.0.0.1',
      );
      expect(mfaVerifyRes.accessToken).toBeDefined();
      expect(mfaVerifyRes.user.email).toBe(TEST_EMAIL);

      // 6. Test login using a Backup Recovery Code
      const challengedLogin2: any = await authController.login(
        { email: TEST_EMAIL, password: 'Password123!' },
        'Mozilla/5.0',
        '127.0.0.1',
      );
      const backupCodeToUse = setup.backupCodes[0]!;
      const backupLoginRes: any = await authController.verifyMfa(
        { mfaToken: challengedLogin2.mfaToken!, code: backupCodeToUse },
        'Mozilla/5.0',
        '127.0.0.1',
      );
      expect(backupLoginRes.accessToken).toBeDefined();

      // Check remaining backup codes decreased to 7
      const statusAfterBackup = await authController.getMfaStatus(TEST_USER_ID);
      expect(statusAfterBackup.backupCodesRemaining).toBe(7);

      // Reusing the same backup code fails
      const challengedLogin3: any = await authController.login(
        { email: TEST_EMAIL, password: 'Password123!' },
        'Mozilla/5.0',
        '127.0.0.1',
      );
      await expect(
        authController.verifyMfa(
          { mfaToken: challengedLogin3.mfaToken!, code: backupCodeToUse },
          'Mozilla/5.0',
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);

      // 7. Disable MFA using password
      const disableRes = await authController.disableMfa(TEST_USER_ID, { password: 'Password123!' });
      expect(disableRes.message).toContain('disabled');

      const finalStatus = await authController.getMfaStatus(TEST_USER_ID);
      expect(finalStatus.isEnabled).toBe(false);

      // 8. Login now returns direct tokens without challenge
      const loginAfterDisable: any = await authController.login(
        { email: TEST_EMAIL, password: 'Password123!' },
        'Mozilla/5.0',
        '127.0.0.1',
      );
      expect(loginAfterDisable.mfaRequired).toBeUndefined();
      expect(loginAfterDisable.accessToken).toBeDefined();
    });
  });
});
