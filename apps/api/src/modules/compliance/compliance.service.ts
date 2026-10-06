// ============================================
// Compliance Service — DPDP & HIPAA Data Export & Erasure
// ============================================

import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/database.module';
import { PasswordService } from '../auth/services/password.service';
import { TokenService } from '../auth/services/token.service';
import { StorageService } from '../../common/storage/storage.service';
import { RequestExportDto, DataErasureDto } from './dto/compliance.dto';
import { Prisma, RevokeReason } from '@maate/database';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    @Optional() private readonly storageService?: StorageService,
  ) {}

  // ─── DATA EXPORT (Right to Access / Portability) ────────────

  async requestExport(userId: string, dto?: RequestExportDto) {
    const format = dto?.format || 'json';

    // 1. Create PENDING DataExportRequest
    const exportRequest = await this.prisma.dataExportRequest.create({
      data: {
        userId,
        format,
        status: 'PROCESSING',
        requestedAt: new Date(),
      },
    });

    // 2. Compile complete export archive
    const payload = await this.compileUserData(userId);

    // 3. Mark request as COMPLETED with 7-day expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const completed = await this.prisma.dataExportRequest.update({
      where: { id: exportRequest.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        expiresAt,
        downloadUrl: `/api/v1/compliance/export/${exportRequest.id}/download`,
      },
    });

    await this.logAudit(userId, 'DATA_EXPORT_REQUESTED', 'data_export_request', exportRequest.id);
    this.logger.log(`Data export completed for user=${userId} req=${exportRequest.id}`);

    return {
      exportRequest: completed,
      data: payload,
    };
  }

  async getExportRequests(userId: string) {
    return this.prisma.dataExportRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async getExportData(userId: string, exportId: string) {
    const exportRequest = await this.prisma.dataExportRequest.findFirst({
      where: { id: exportId, userId },
    });

    if (!exportRequest) {
      throw new NotFoundException('Data export request not found or not owned by user');
    }

    if (exportRequest.status !== 'COMPLETED') {
      throw new BadRequestException(`Export is in status: ${exportRequest.status}`);
    }

    if (exportRequest.expiresAt && exportRequest.expiresAt < new Date()) {
      throw new BadRequestException('This data export has expired. Please request a fresh export.');
    }

    const payload = await this.compileUserData(userId);

    await this.logAudit(userId, 'DATA_EXPORT_DOWNLOADED', 'data_export_request', exportId);

    return {
      exportMeta: exportRequest,
      exportedAt: new Date(),
      payload,
    };
  }

  // ─── RIGHT TO ERASURE (Soft-Delete Cascade & Anonymization) ────────────

  async executeErasure(
    userId: string,
    dto: DataErasureDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Re-authenticate password before destructive erasure
    if (user.passwordHash && dto.password) {
      const isPasswordValid = await this.passwordService.verify(dto.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password. Erasure aborted.');
      }
    } else if (user.passwordHash && !dto.password) {
      throw new UnauthorizedException('Password is required to confirm account erasure.');
    }

    // 2. Comprehensive PHI Scrubbing & Deletion
    // A. Documents & S3 storage deletion
    const documents = await this.prisma.document.findMany({
      where: { userId },
      select: { id: true, fileUrl: true },
    });

    for (const doc of documents) {
      if (this.storageService && doc.fileUrl) {
        try {
          await this.storageService.deleteFile(doc.fileUrl);
        } catch (err: any) {
          this.logger.warn(`Failed to delete S3 file ${doc.fileUrl}: ${err?.message || err}`);
        }
      }
    }

    const docIds = documents.map((d) => d.id);
    if (docIds.length > 0) {
      await this.prisma.documentChunk.deleteMany({ where: { documentId: { in: docIds } } });
      await this.prisma.ocrResult.deleteMany({ where: { documentId: { in: docIds } } });
      await this.prisma.aiSummary.deleteMany({ where: { documentId: { in: docIds } } });
      await this.prisma.document.deleteMany({ where: { id: { in: docIds } } });
    }

    // B. AI Chat sessions & messages
    const chatSessions = await this.prisma.chatSession.findMany({
      where: { userId },
      select: { id: true },
    });
    const sessionIds = chatSessions.map((s) => s.id);
    if (sessionIds.length > 0) {
      await this.prisma.chatMessage.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await this.prisma.chatSession.deleteMany({ where: { id: { in: sessionIds } } });
    }

    // C. Clinical PHI & Health Data Records
    await this.prisma.timelineEvent.deleteMany({ where: { userId } });
    await this.prisma.vitalSign.deleteMany({ where: { userId } });
    await this.prisma.symptomEntry.deleteMany({ where: { userId } });
    await this.prisma.chronicCondition.deleteMany({ where: { userId } });
    await this.prisma.medication.deleteMany({ where: { userId } });
    await this.prisma.prescription.deleteMany({ where: { userId } });
    await this.prisma.doctorNote.deleteMany({ where: { patientId: userId } });
    await this.prisma.mealReminder.deleteMany({ where: { userId } });
    await this.prisma.medicineReminder.deleteMany({ where: { userId } });
    await this.prisma.waterReminder.deleteMany({ where: { userId } });
    await this.prisma.reminderLog.deleteMany({ where: { userId } });
    await this.prisma.notification.deleteMany({ where: { userId } });
    await this.prisma.doctorShare.deleteMany({ where: { userId } });
    await this.prisma.userDevice.deleteMany({ where: { userId } });
    await this.prisma.dataConsent.deleteMany({ where: { userId } });
    await this.prisma.dataExportRequest.deleteMany({ where: { userId } });
    await this.prisma.userMfa.deleteMany({ where: { userId } });

    // D. Family Members & Associated Shadow Users
    const familyMembers = await this.prisma.familyMember.findMany({
      where: { userId },
      select: { id: true },
    });
    const familyMemberIds = familyMembers.map((fm) => fm.id);
    if (familyMemberIds.length > 0) {
      await this.prisma.accessPermission.deleteMany({
        where: {
          OR: [
            { familyMemberId: { in: familyMemberIds } },
            { userId },
            { grantedById: userId },
          ],
        },
      });
      await this.prisma.familyMember.deleteMany({ where: { id: { in: familyMemberIds } } });
      // Delete shadow user rows created for managed family profiles
      await this.prisma.user.deleteMany({ where: { id: { in: familyMemberIds } } });
    }

    // 3. Anonymize PII and soft-delete primary user record
    const anonymizedEmail = `deleted-${userId.substring(0, 8)}@maate.internal`;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: 'Deleted User',
        email: anonymizedEmail,
        phone: null,
        emergencyContact: null,
        allergiesJson: Prisma.DbNull,
        avatarUrl: null,
        fcmToken: null,
        apnsToken: null,
        isActive: false,
        deletedAt: new Date(),
      },
    });

    // 4. Hard-delete user sessions and refresh tokens for total privacy hygiene
    await this.prisma.userSession.deleteMany({ where: { userId } });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    // 6. Audit log erasure (retained per HIPAA compliance)
    await this.logAudit(
      userId,
      'ACCOUNT_ERASURE',
      'user',
      userId,
      meta?.ipAddress,
      meta?.userAgent,
    );
    this.logger.warn(`User data erased and account soft-deleted: user=${userId}`);

    return {
      success: true,
      message: 'Account and personal clinical data erased successfully in compliance with DPDP Act.',
    };
  }

  // ─── PRIVATE COMPILATION HELPER ─────────────────────────────

  private async compileUserData(userId: string) {
    const [
      user,
      vitals,
      symptoms,
      conditions,
      doctorNotes,
      medications,
      prescriptions,
      medicineReminders,
      waterReminder,
      mealReminders,
      timelineEvents,
      documents,
      chatSessions,
      familyMembers,
      doctorShares,
      consents,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          bloodGroup: true,
          heightCm: true,
          weightKg: true,
          emergencyContact: true,
          allergiesJson: true,
          createdAt: true,
        },
      }),
      this.prisma.vitalSign.findMany({ where: { userId }, orderBy: { measuredAt: 'desc' } }),
      this.prisma.symptomEntry.findMany({ where: { userId }, orderBy: { startedAt: 'desc' } }),
      this.prisma.chronicCondition.findMany({ where: { userId }, orderBy: { diagnosedDate: 'desc' } }),
      this.prisma.doctorNote.findMany({ where: { patientId: userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.medication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.prescription.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.medicineReminder.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.waterReminder.findUnique({ where: { userId } }),
      this.prisma.mealReminder.findMany({ where: { userId }, orderBy: { scheduledTime: 'asc' } }),
      this.prisma.timelineEvent.findMany({ where: { userId }, orderBy: { occurredAt: 'desc' } }),
      this.prisma.document.findMany({
        where: { userId },
        include: {
          aiSummary: {
            select: {
              summaryText: true,
              laypersonSummary: true,
              keyFindings: true,
              riskFlags: true,
              recommendations: true,
              modelUsed: true,
            },
          },
          ocrResult: {
            select: {
              confidenceScore: true,
              engineUsed: true,
              structuredData: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.chatSession.findMany({
        where: { userId },
        include: {
          messages: {
            select: {
              id: true,
              role: true,
              content: true,
              metadata: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.familyMember.findMany({
        where: { userId },
        include: { permissions: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.doctorShare.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dataConsent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    ]);

    return {
      schemaVersion: '1.0.0-dpdp',
      exportedAt: new Date().toISOString(),
      profile: user,
      clinicalData: {
        vitals,
        symptoms,
        chronicConditions: conditions,
        medications,
        prescriptions,
        doctorNotes,
      },
      carePlan: {
        medicineReminders,
        waterReminder,
        mealReminders,
      },
      timeline: timelineEvents,
      documents,
      chatHistory: chatSessions,
      sharingAndFamily: {
        familyMembers,
        doctorShares,
      },
      consentHistory: consents,
    };
  }

  private async logAudit(
    userId: string,
    action: string,
    resource: string,
    resourceId: string | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          ipAddress,
          userAgent,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to log compliance audit for ${action}: ${err?.message || err}`);
    }
  }
}
