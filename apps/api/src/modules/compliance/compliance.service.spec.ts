import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../../common/database/database.module';
import { PasswordService } from '../auth/services/password.service';
import { TokenService } from '../auth/services/token.service';
import { StorageService } from '../../common/storage/storage.service';
import { RevokeReason } from '@maate/database';

describe('ComplianceService (DPDP Right to Access & Erasure)', () => {
  let service: ComplianceService;
  let prisma: any;
  let passwordService: any;
  let tokenService: any;

  beforeEach(async () => {
    prisma = {
      dataExportRequest: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      vitalSign: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      symptomEntry: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      chronicCondition: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      doctorNote: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      medicineReminder: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      waterReminder: { findUnique: jest.fn().mockResolvedValue(null), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      mealReminder: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      timelineEvent: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      document: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      documentChunk: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      ocrResult: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      aiSummary: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      chatSession: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      chatMessage: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      medication: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      prescription: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      notification: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      doctorShare: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      familyMember: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      accessPermission: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      userDevice: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      reminderLog: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      dataConsent: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      userMfa: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      userSession: { updateMany: jest.fn().mockResolvedValue({ count: 2 }), deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      refreshToken: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };

    passwordService = {
      verify: jest.fn(),
    };

    tokenService = {
      revokeAllTokens: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: PrismaService, useValue: prisma },
        { provide: PasswordService, useValue: passwordService },
        { provide: TokenService, useValue: tokenService },
        { provide: StorageService, useValue: { deleteFile: jest.fn().mockResolvedValue(true) } },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
  });

  describe('requestExport', () => {
    it('should create export request, compile user data, and mark completed with download URL', async () => {
      prisma.dataExportRequest.create.mockResolvedValue({
        id: 'export-1',
        userId: 'user-123',
        status: 'PROCESSING',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        fullName: 'Priya Sharma',
        email: 'priya@example.com',
      });
      prisma.vitalSign.findMany.mockResolvedValue([
        { id: 'vital-1', type: 'BLOOD_PRESSURE', value: '120/80' },
      ]);
      prisma.dataExportRequest.update.mockResolvedValue({
        id: 'export-1',
        status: 'COMPLETED',
        downloadUrl: '/api/v1/compliance/export/export-1/download',
      });

      const result = await service.requestExport('user-123');

      expect(prisma.dataExportRequest.create).toHaveBeenCalled();
      expect(prisma.dataExportRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'export-1' },
          data: expect.objectContaining({
            status: 'COMPLETED',
            downloadUrl: '/api/v1/compliance/export/export-1/download',
          }),
        }),
      );
      expect(result.data.profile?.fullName).toBe('Priya Sharma');
      expect(result.data.clinicalData.vitals).toHaveLength(1);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'DATA_EXPORT_REQUESTED',
          }),
        }),
      );
    });
  });

  describe('getExportData', () => {
    it('should throw NotFoundException if export does not exist or belong to user', async () => {
      prisma.dataExportRequest.findFirst.mockResolvedValue(null);

      await expect(service.getExportData('user-123', 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return compiled payload and log audit when valid', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);

      prisma.dataExportRequest.findFirst.mockResolvedValue({
        id: 'export-1',
        userId: 'user-123',
        status: 'COMPLETED',
        expiresAt: future,
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-123', fullName: 'Priya Sharma' });

      const result = await service.getExportData('user-123', 'export-1');

      expect(result.exportMeta.id).toBe('export-1');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'DATA_EXPORT_DOWNLOADED',
          }),
        }),
      );
    });
  });

  describe('executeErasure', () => {
    it('should reject erasure with UnauthorizedException if password is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashed-pwd',
      });
      passwordService.verify.mockResolvedValue(false);

      await expect(
        service.executeErasure('user-123', {
          confirmation: 'DELETE MY ACCOUNT',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should anonymize PII, set deletedAt, revoke sessions and tokens on valid password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '12345678-aaaa-bbbb-cccc-dddddddddddd',
        fullName: 'Priya Sharma',
        passwordHash: 'hashed-pwd',
      });
      passwordService.verify.mockResolvedValue(true);

      const result = await service.executeErasure(
        '12345678-aaaa-bbbb-cccc-dddddddddddd',
        {
          confirmation: 'DELETE MY ACCOUNT',
          password: 'CorrectPassword123!',
        },
        { ipAddress: '127.0.0.1', userAgent: 'Jest/Test' },
      );

      // Verify PII anonymized & deletedAt set
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '12345678-aaaa-bbbb-cccc-dddddddddddd' },
        data: expect.objectContaining({
          fullName: 'Deleted User',
          email: 'deleted-12345678@maate.internal',
          phone: null,
          isActive: false,
          deletedAt: expect.any(Date),
        }),
      });

      // Verify sessions hard-deleted for total privacy hygiene
      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: '12345678-aaaa-bbbb-cccc-dddddddddddd' },
      });

      // Verify refresh tokens hard-deleted for total privacy hygiene
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: '12345678-aaaa-bbbb-cccc-dddddddddddd' },
      });

      // Verify audit log created
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ACCOUNT_ERASURE',
            resource: 'user',
          }),
        }),
      );

      expect(result.success).toBe(true);
    });
  });
});
