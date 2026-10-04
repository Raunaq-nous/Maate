import { Test, TestingModule } from '@nestjs/testing';
import { ConsentService } from './consent.service';
import { PrismaService } from '../../common/database/database.module';

describe('ConsentService (DPDP Compliance)', () => {
  let service: ConsentService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      dataConsent: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ConsentService>(ConsentService);
  });

  describe('grantConsent', () => {
    it('should create new consent record and log audit when no existing record exists', async () => {
      prisma.dataConsent.findFirst.mockResolvedValue(null);
      prisma.dataConsent.create.mockResolvedValue({
        id: 'consent-1',
        userId: 'user-123',
        purpose: 'AI_SUMMARIZATION',
        isGranted: true,
        grantedAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Jest/Test',
      });

      const result = await service.grantConsent(
        'user-123',
        { purpose: 'AI_SUMMARIZATION' },
        { ipAddress: '127.0.0.1', userAgent: 'Jest/Test' },
      );

      expect(prisma.dataConsent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          purpose: 'AI_SUMMARIZATION',
          isGranted: true,
        }),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          action: 'CONSENT_GRANTED',
          resource: 'data_consent',
        }),
      });
      expect(result.isGranted).toBe(true);
    });

    it('should update existing record to granted when re-granted', async () => {
      prisma.dataConsent.findFirst.mockResolvedValue({
        id: 'consent-existing',
        userId: 'user-123',
        purpose: 'AI_SUMMARIZATION',
        isGranted: false,
        withdrawnAt: new Date(),
      });
      prisma.dataConsent.update.mockResolvedValue({
        id: 'consent-existing',
        userId: 'user-123',
        purpose: 'AI_SUMMARIZATION',
        isGranted: true,
        withdrawnAt: null,
      });

      const result = await service.grantConsent('user-123', { purpose: 'AI_SUMMARIZATION' });

      expect(prisma.dataConsent.update).toHaveBeenCalledWith({
        where: { id: 'consent-existing' },
        data: expect.objectContaining({
          isGranted: true,
          withdrawnAt: null,
        }),
      });
      expect(result.isGranted).toBe(true);
    });
  });

  describe('revokeConsent', () => {
    it('should update record to isGranted=false with withdrawnAt and log audit', async () => {
      prisma.dataConsent.findFirst.mockResolvedValue({
        id: 'consent-active',
        userId: 'user-123',
        purpose: 'AI_SUMMARIZATION',
        isGranted: true,
      });
      prisma.dataConsent.update.mockResolvedValue({
        id: 'consent-active',
        userId: 'user-123',
        purpose: 'AI_SUMMARIZATION',
        isGranted: false,
        withdrawnAt: new Date(),
      });

      const result = await service.revokeConsent('user-123', { purpose: 'AI_SUMMARIZATION' });

      expect(prisma.dataConsent.update).toHaveBeenCalledWith({
        where: { id: 'consent-active' },
        data: expect.objectContaining({
          isGranted: false,
        }),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          action: 'CONSENT_REVOKED',
          resource: 'data_consent',
        }),
      });
      expect(result.isGranted).toBe(false);
    });
  });

  describe('hasConsent', () => {
    it('should return true when active valid consent exists', async () => {
      prisma.dataConsent.findFirst.mockResolvedValue({
        id: 'consent-1',
        userId: 'user-123',
        purpose: 'AI_SUMMARIZATION',
        isGranted: true,
        withdrawnAt: null,
      });

      const hasConsent = await service.hasConsent('user-123', 'AI_SUMMARIZATION');
      expect(hasConsent).toBe(true);
    });

    it('should return false when consent is withdrawn or not found', async () => {
      prisma.dataConsent.findFirst.mockResolvedValue({
        id: 'consent-1',
        userId: 'user-123',
        purpose: 'AI_SUMMARIZATION',
        isGranted: false,
        withdrawnAt: new Date(),
      });

      expect(await service.hasConsent('user-123', 'AI_SUMMARIZATION')).toBe(false);

      prisma.dataConsent.findFirst.mockResolvedValue(null);
      expect(await service.hasConsent('user-123', 'UNKNOWN')).toBe(false);
    });
  });
});
