import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AccessLevel, RelationshipType } from '@maate/database';
import { FamilyService } from './family.service';
import { PrismaService } from '../../common/database/database.module';
import { AuditService } from '../../common/audit/audit.service';
import { NotificationService } from '../notification/notification.service';

describe('FamilyService (Family Caregiving & RBAC Matrix)', () => {
  let service: FamilyService;
  let prisma: any;
  let audit: any;
  let notificationService: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((cb) => cb(prisma)),
      familyMember: {
        create: jest.fn().mockResolvedValue({ id: 'kamla-1', fullName: 'Kamla Devi', relationship: RelationshipType.PARENT }),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      user: {
        create: jest.fn().mockResolvedValue({ id: 'kamla-1', fullName: 'Kamla Devi', role: 'PATIENT' }),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
      },
      accessPermission: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
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
        FamilyService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<FamilyService>(FamilyService);
  });

  describe('addMember', () => {
    it('should create family member profile and shadow user in a transaction', async () => {
      const result = await service.addMember('priya-id', {
        fullName: 'Kamla Devi',
        relationship: RelationshipType.PARENT,
        gender: 'FEMALE',
      });

      expect(prisma.familyMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'priya-id',
          fullName: 'Kamla Devi',
          relationship: RelationshipType.PARENT,
        }),
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'kamla-1',
          fullName: 'Kamla Devi',
          role: 'PATIENT',
          isActive: true,
        }),
      });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'priya-id',
          action: 'PHI_CREATE',
          resource: 'FamilyMember',
        }),
      );
    });
  });

  describe('shareAccess & Permission Hierarchy', () => {
    it('should grant FULL access to caregiver and notify both patient and caregiver', async () => {
      prisma.user.findUnique.mockImplementation(({ where }: any) => {
        if (where.email === 'rajesh@example.com') {
          return Promise.resolve({ id: 'rajesh-id', fullName: 'Rajesh Sharma', email: 'rajesh@example.com' });
        }
        if (where.id === 'priya-id') {
          return Promise.resolve({ id: 'priya-id', fullName: 'Priya Sharma' });
        }
        return Promise.resolve(null);
      });

      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'kamla-1',
        userId: 'priya-id',
        fullName: 'Kamla Devi',
      });

      prisma.accessPermission.upsert.mockResolvedValue({
        id: 'perm-1',
        userId: 'rajesh-id',
        familyMemberId: 'kamla-1',
        accessLevel: AccessLevel.FULL,
      });

      const perm = await service.shareAccess('priya-id', 'kamla-1', 'rajesh@example.com', AccessLevel.FULL);

      expect(perm.accessLevel).toBe(AccessLevel.FULL);
      expect(prisma.accessPermission.upsert).toHaveBeenCalled();

      // Verify bidirectional notifications
      expect(notificationService.sendPushNotification).toHaveBeenCalledWith('priya-id', expect.objectContaining({
        title: 'Caregiver Access Granted',
        body: expect.stringContaining('Rajesh Sharma has been granted FULL access'),
      }));
      expect(notificationService.sendPushNotification).toHaveBeenCalledWith('rajesh-id', expect.objectContaining({
        title: 'New Health Profile Shared',
      }));
    });

    it('should revoke caregiver access and notify both parties', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'kamla-1',
        userId: 'priya-id',
        fullName: 'Kamla Devi',
      });

      prisma.accessPermission.deleteMany.mockResolvedValue({
        count: 1,
      });

      const res = await service.revokeAccess('priya-id', 'kamla-1', 'rajesh-id');

      expect(res.success).toBe(true);
      expect(prisma.accessPermission.deleteMany).toHaveBeenCalledWith({
        where: { familyMemberId: 'kamla-1', userId: 'rajesh-id' },
      });

      expect(notificationService.sendPushNotification).toHaveBeenCalledWith('priya-id', expect.objectContaining({
        title: 'Caregiver Access Revoked',
      }));
      expect(notificationService.sendPushNotification).toHaveBeenCalledWith('rajesh-id', expect.objectContaining({
        title: 'Caregiver Access Revoked',
      }));
    });
  });
});
