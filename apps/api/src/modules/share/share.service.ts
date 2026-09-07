// ============================================
// Share Service — Doctor Sharing & External Access
// Cryptographic token generation, scoping, audit
// ============================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/database.module';
import { AuditService, AuditAction } from '../../common/audit/audit.service';
import { CreateDoctorShareDto } from './dto/share.dto';
import * as crypto from 'crypto';
import type { Request } from 'express';

@Injectable()
export class ShareService {
  private readonly logger = new Logger(ShareService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Generates a secure, time-limited, revocable doctor share token.
   */
  async createShare(
    userId: string,
    dto: CreateDoctorShareDto,
    req?: Request,
  ) {
    // Generate 64-character cryptographically secure hex token
    const shareToken = crypto.randomBytes(32).toString('hex');

    const days = dto.expiresInDays || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const sharedResources = dto.sharedResources || [
      'lab_reports',
      'prescriptions',
      'vitals',
      'timeline',
    ];

    const share = await this.prisma.doctorShare.create({
      data: {
        userId,
        shareToken,
        doctorName: dto.doctorName,
        doctorEmail: dto.doctorEmail,
        doctorPhone: dto.doctorPhone,
        accessLevel: dto.accessLevel || 'read_only',
        sharedResources,
        expiresAt,
      },
    });

    // Write Compliance AuditLog
    await this.audit.record({
      userId,
      action: AuditAction.ACCESS_GRANTED,
      resource: 'DoctorShare',
      resourceId: share.id,
      newData: {
        doctorName: dto.doctorName,
        doctorEmail: dto.doctorEmail,
        sharedResources,
        expiresAt,
      },
      severity: 'INFO',
      req,
    });

    return {
      ...share,
      shareUrl: `/shared/doctor/${shareToken}`,
    };
  }

  /**
   * Lists all active and historical doctor shares for a user.
   */
  async getShares(userId: string) {
    const shares = await this.prisma.doctorShare.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return shares.map((s) => ({
      ...s,
      isExpired: new Date() > s.expiresAt,
      shareUrl: `/shared/doctor/${s.shareToken}`,
    }));
  }

  /**
   * Revokes an existing doctor share.
   */
  async revokeShare(userId: string, shareId: string, req?: Request) {
    const share = await this.prisma.doctorShare.findFirst({
      where: { id: shareId, userId },
    });

    if (!share) {
      throw new NotFoundException('Doctor share link not found');
    }

    const updated = await this.prisma.doctorShare.update({
      where: { id: shareId },
      data: { isRevoked: true },
    });

    // Write Compliance AuditLog
    await this.audit.record({
      userId,
      action: AuditAction.ACCESS_REVOKED,
      resource: 'DoctorShare',
      resourceId: share.id,
      oldData: { isRevoked: false },
      newData: { isRevoked: true },
      severity: 'WARN',
      req,
    });

    return { success: true, data: updated };
  }

  /**
   * Public Doctor Access: Validates token and returns scoped patient data bundle.
   */
  async viewSharedData(shareToken: string, req?: Request) {
    const share = await this.prisma.doctorShare.findUnique({
      where: { shareToken },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
          },
        },
      },
    });

    if (!share) {
      throw new NotFoundException('Invalid or non-existent share link');
    }

    if (share.isRevoked) {
      throw new ForbiddenException(
        'This share link has been revoked by the patient',
      );
    }

    if (new Date() > share.expiresAt) {
      throw new ForbiddenException(
        'This share link has expired. Please ask the patient for a new link.',
      );
    }

    // Update access metrics
    await this.prisma.doctorShare.update({
      where: { id: share.id },
      data: {
        accessedCount: { increment: 1 },
        lastAccessed: new Date(),
      },
    });

    // Write HIPAA/DPDP PHI_VIEW AuditLog
    await this.audit.record({
      userId: share.userId,
      action: AuditAction.PHI_VIEW,
      resource: 'DoctorShare',
      resourceId: share.id,
      newData: {
        tokenAccess: true,
        doctorName: share.doctorName,
        accessedCount: share.accessedCount + 1,
        sharedResources: share.sharedResources,
      },
      severity: 'INFO',
      req,
    });

    const result: any = {
      patient: {
        fullName: share.user.fullName,
        dateOfBirth: share.user.dateOfBirth,
        gender: share.user.gender,
        bloodGroup: share.user.bloodGroup,
      },
      shareInfo: {
        doctorName: share.doctorName,
        accessLevel: share.accessLevel,
        expiresAt: share.expiresAt,
        sharedResources: share.sharedResources,
      },
    };

    // 1. Scoped Documents / Lab Reports
    if (
      share.sharedResources.includes('lab_reports') ||
      share.sharedResources.includes('documents')
    ) {
      result.documents = await this.prisma.document.findMany({
        where: {
          userId: share.userId,
          deletedAt: null,
        },
        include: {
          ocrResult: {
            select: {
              rawText: true,
              structuredData: true,
              confidenceScore: true,
            },
          },
          aiSummary: {
            select: {
              summaryText: true,
              keyFindings: true,
              recommendations: true,
              riskFlags: true,
              isMock: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // 2. Scoped Vitals
    if (share.sharedResources.includes('vitals')) {
      result.vitals = await this.prisma.vitalSign.findMany({
        where: { userId: share.userId },
        orderBy: { measuredAt: 'desc' },
        take: 50,
      });
    }

    // 3. Scoped Prescriptions & Active Medications
    if (
      share.sharedResources.includes('prescriptions') ||
      share.sharedResources.includes('medications')
    ) {
      result.medications = await this.prisma.medicineReminder.findMany({
        where: {
          userId: share.userId,
          isActive: true,
          deletedAt: null,
        },
      });
    }

    // 4. Scoped Health Timeline
    if (share.sharedResources.includes('timeline')) {
      result.timeline = await this.prisma.timelineEvent.findMany({
        where: {
          userId: share.userId,
          isHidden: false,
        },
        orderBy: { occurredAt: 'desc' },
        take: 50,
      });
    }

    return result;
  }
}
