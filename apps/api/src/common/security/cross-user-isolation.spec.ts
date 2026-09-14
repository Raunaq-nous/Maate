import { NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { DocumentService } from '../../modules/document/document.service';
import { TimelineService } from '../../modules/timeline/timeline.service';
import { ChatService } from '../../modules/chat/chat.service';
import { FamilyService } from '../../modules/family/family.service';
import { ShareService } from '../../modules/share/share.service';

describe('Cross-User Data Isolation (Security & HIPAA Partitioning)', () => {
  const USER_A = '11111111-1111-1111-1111-111111111111'; // Priya
  const USER_B = '22222222-2222-2222-2222-222222222222'; // Unauthorized Attacker/User

  let prisma: any;
  let redis: any;
  let documentService: DocumentService;
  let timelineService: TimelineService;
  let chatService: ChatService;
  let familyService: FamilyService;
  let shareService: ShareService;

  beforeEach(() => {
    prisma = {
      document: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      timelineEvent: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      chatSession: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      chatMessage: {
        findMany: jest.fn(),
      },
      documentChunk: {
        findMany: jest.fn(),
      },
      familyMember: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      accessPermission: {
        findFirst: jest.fn(),
      },
      doctorShare: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      delByPrefix: jest.fn().mockResolvedValue(1),
    };

    const mockStorageService: any = {
      getUploadUrl: jest.fn(),
      getDownloadUrl: jest.fn(),
      getFileMetadata: jest.fn(),
    };

    const mockProcessingService: any = {
      enqueue: jest.fn(),
    };

    const mockAuditService: any = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const mockNotificationService: any = {
      sendPushNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    documentService = new DocumentService(
      prisma,
      mockStorageService,
      mockProcessingService,
    );

    timelineService = new TimelineService(
      prisma,
      redis,
    );

    chatService = new ChatService(
      prisma,
      { get: jest.fn().mockReturnValue('http://localhost:8001') } as any,
      { post: jest.fn() } as any,
    );

    familyService = new FamilyService(
      prisma,
      mockAuditService,
      mockNotificationService,
    );

    shareService = new ShareService(
      prisma,
      mockAuditService,
      mockNotificationService,
    );
  });

  describe('Document Isolation', () => {
    it('should reject User B from viewing User A document with NotFoundException', async () => {
      // Document belongs to USER_A. When USER_B requests it, findFirst with { id, userId: USER_B } returns null
      prisma.document.findFirst.mockImplementation(({ where }: any) => {
        if (where.userId === USER_A && where.id === 'doc-priya-1') {
          return Promise.resolve({ id: 'doc-priya-1', userId: USER_A, title: 'Priya Lab Report' });
        }
        return Promise.resolve(null);
      });

      await expect(documentService.findById(USER_B, 'doc-priya-1')).rejects.toThrow(NotFoundException);
    });

    it('should only return User A documents in findByUser list query', async () => {
      prisma.document.findMany.mockImplementation(({ where }: any) => {
        expect(where.userId).toBe(USER_A);
        return Promise.resolve([{ id: 'doc-priya-1', userId: USER_A }]);
      });
      prisma.document.count.mockResolvedValue(1);

      const result = await documentService.findByUser(USER_A, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.userId).toBe(USER_A);
    });

    it('should prevent User B from archiving User A document', async () => {
      prisma.document.updateMany.mockImplementation(({ where }: any) => {
        if (where.userId === USER_B && where.id === 'doc-priya-1') {
          return Promise.resolve({ count: 0 });
        }
        return Promise.resolve({ count: 1 });
      });

      const res = await documentService.archive(USER_B, 'doc-priya-1');
      // updateMany ensures where.userId matches, resulting in 0 rows updated
      expect(prisma.document.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc-priya-1', userId: USER_B },
        }),
      );
    });
  });

  describe('Timeline & Clinical Events Isolation', () => {
    it('should strictly query timeline events by requesting user ID', async () => {
      prisma.timelineEvent.findMany.mockImplementation(({ where }: any) => {
        expect(where.userId).toBe(USER_A);
        return Promise.resolve([
          { id: 'event-1', userId: USER_A, title: 'Glucose logged' },
        ]);
      });
      prisma.timelineEvent.count.mockResolvedValue(1);

      const result = await timelineService.getTimeline(USER_A, { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe(USER_A);
    });

    it('should prevent User B from pinning User A timeline event (scoped updateMany returns count 0)', async () => {
      prisma.timelineEvent.updateMany.mockImplementation(({ where }: any) => {
        if (where.id === 'event-priya-1' && where.userId === USER_B) {
          return Promise.resolve({ count: 0 });
        }
        return Promise.resolve({ count: 1 });
      });

      const res = await timelineService.togglePin(USER_B, 'event-priya-1', true);
      expect(res.success).toBe(false);
      expect(prisma.timelineEvent.updateMany).toHaveBeenCalledWith({
        where: { id: 'event-priya-1', userId: USER_B },
        data: { isPinned: true },
      });
    });
  });

  describe('Chat & RAG Context Isolation', () => {
    it('should isolate chat session history and return empty array for non-owned session', async () => {
      prisma.chatSession.findFirst.mockImplementation(({ where }: any) => {
        if (where.id === 'sess-priya-1' && where.userId === USER_B) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ id: 'sess-priya-1', userId: USER_A });
      });

      const history = await chatService.getHistory(USER_B, 'sess-priya-1');
      expect(history).toEqual([]);
    });

    it('should reject User B from deleting User A chat session with NotFoundException', async () => {
      prisma.chatSession.findFirst.mockImplementation(({ where }: any) => {
        if (where.id === 'sess-priya-1' && where.userId === USER_B) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ id: 'sess-priya-1', userId: USER_A });
      });

      await expect(chatService.deleteSession(USER_B, 'sess-priya-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Family & Doctor Share Isolation', () => {
    it('should prevent User B from deleting User A family member profile with ForbiddenException', async () => {
      prisma.familyMember.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === 'fam-kamla') {
          return Promise.resolve({ id: 'fam-kamla', userId: USER_A, fullName: 'Kamla Devi' });
        }
        return Promise.resolve(null);
      });

      await expect(familyService.deleteMember(USER_B, 'fam-kamla')).rejects.toThrow(ForbiddenException);
    });

    it('should prevent User B from revoking User A doctor share with NotFoundException', async () => {
      prisma.doctorShare.findFirst.mockImplementation(({ where }: any) => {
        if (where.id === 'share-priya' && where.userId === USER_B) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ id: 'share-priya', userId: USER_A });
      });

      await expect(shareService.revokeShare(USER_B, 'share-priya')).rejects.toThrow(NotFoundException);
    });
  });
});
