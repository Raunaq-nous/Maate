import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ShareService } from './share.service';
import { PrismaService } from '../../common/database/database.module';
import { AuditService } from '../../common/audit/audit.service';
import { NotificationService } from '../notification/notification.service';

describe('ShareService (Doctor Sharing Portal & Cryptographic Tokens)', () => {
  let service: ShareService;
  let prisma: any;
  let audit: any;
  let notificationService: any;

  beforeEach(async () => {
    prisma = {
      doctorShare: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'share-1', ...data })),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'share-1', ...data })),
      },
      user: {
        findUnique: jest.fn(),
      },
      document: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      vitalSign: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      timelineEvent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      medicineReminder: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    audit = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    notificationService = {
      sendPushNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<ShareService>(ShareService);
  });

  describe('createShare', () => {
    it('should generate secure 64-char hex token and record ACCESS_GRANTED audit log', async () => {
      const result = await service.createShare('priya-id', {
        doctorName: 'Dr. Aarav Mehta',
        doctorEmail: 'dr.mehta@example.com',
        expiresInDays: 7,
      });

      expect(result.shareToken).toBeDefined();
      expect(result.shareToken).toHaveLength(64);
      expect(result.shareUrl).toBe(`/shared/doctor/${result.shareToken}`);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'priya-id',
          action: 'ACCESS_GRANTED',
          resource: 'DoctorShare',
        }),
      );
    });
  });

  describe('viewSharedData', () => {
    it('should allow viewing active share and notify patient with doctor access alert', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      prisma.doctorShare.findUnique.mockResolvedValue({
        id: 'share-1',
        userId: 'priya-id',
        shareToken: 'valid-token',
        doctorName: 'Dr. Aarav Mehta',
        isRevoked: false,
        expiresAt: futureDate,
        sharedResources: ['lab_reports', 'vitals', 'timeline'],
        accessedCount: 0,
        user: { id: 'priya-id', fullName: 'Priya Sharma' },
      });

      const portal = await service.viewSharedData('valid-token');

      expect(portal.patient.fullName).toBe('Priya Sharma');
      expect(portal.shareInfo.doctorName).toBe('Dr. Aarav Mehta');

      // Patient alerted when doctor opens portal
      expect(notificationService.sendPushNotification).toHaveBeenCalledWith('priya-id', expect.objectContaining({
        title: 'Doctor Accessed Records',
        body: expect.stringContaining('Dr. Aarav Mehta viewed your shared medical profile'),
      }));

      // Audit recorded
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'priya-id',
          action: 'PHI_VIEW',
          resource: 'DoctorShare',
        }),
      );
    });

    it('should reject viewing when share token is revoked', async () => {
      prisma.doctorShare.findUnique.mockResolvedValue({
        id: 'share-1',
        userId: 'priya-id',
        shareToken: 'revoked-token',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(service.viewSharedData('revoked-token')).rejects.toThrow(ForbiddenException);
    });

    it('should reject viewing when share token is expired', async () => {
      prisma.doctorShare.findUnique.mockResolvedValue({
        id: 'share-1',
        userId: 'priya-id',
        shareToken: 'expired-token',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 86400000), // yesterday
      });

      await expect(service.viewSharedData('expired-token')).rejects.toThrow(ForbiddenException);
    });
  });
});
