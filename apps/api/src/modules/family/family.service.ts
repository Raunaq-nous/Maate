// ============================================
// Family Service — RBAC & Member Management
// Permission Matrix & Caregiver Access with Audit
// ============================================

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/database.module';
import { AuditService, AuditAction } from '../../common/audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { AccessLevel, RelationshipType, Gender } from '@maate/database';
import type { Request } from 'express';

@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Adds a new family member profile (e.g. Parent or Child).
   * Creates managed profile with a credential-less shadow user.
   */
  async addMember(
    primaryUserId: string,
    data: {
      fullName: string;
      relationship: RelationshipType;
      dateOfBirth?: Date;
      gender?: string;
    },
    req?: Request,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.familyMember.create({
        data: {
          userId: primaryUserId,
          fullName: data.fullName,
          relationship: data.relationship,
          dateOfBirth: data.dateOfBirth
            ? new Date(data.dateOfBirth)
            : undefined,
          gender: data.gender as Gender,
        },
      });

      // Shadow User: credential-less (no phone, email, passwordHash), strictly for data relations
      await tx.user.create({
        data: {
          id: member.id,
          fullName: data.fullName,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender as Gender,
          role: 'PATIENT',
          onboardingDone: true,
          isActive: true,
        },
      });

      // Write AuditLog
      await this.audit.record({
        userId: primaryUserId,
        action: AuditAction.PHI_CREATE,
        resource: 'FamilyMember',
        resourceId: member.id,
        newData: {
          fullName: data.fullName,
          relationship: data.relationship,
        },
        severity: 'INFO',
        req,
      });

      return member;
    });
  }

  /**
   * Grants access to a family member's records to another registered user (Caregiver/Spouse).
   */
  async shareAccess(
    ownerId: string,
    memberId: string,
    granteeEmail: string,
    level: AccessLevel,
    req?: Request,
  ) {
    // 1. Find the user to share with
    const grantee = await this.prisma.user.findUnique({
      where: { email: granteeEmail },
    });
    if (!grantee) throw new NotFoundException('User not found with this email');

    // 2. Verify ownership
    const member = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.userId !== ownerId) {
      throw new ForbiddenException('Not authorized to share this profile');
    }

    // 3. Create or update permission
    const permission = await this.prisma.accessPermission.upsert({
      where: {
        userId_familyMemberId: {
          userId: grantee.id,
          familyMemberId: memberId,
        },
      },
      create: {
        userId: grantee.id,
        familyMemberId: memberId,
        accessLevel: level,
        grantedById: ownerId,
      },
      update: {
        accessLevel: level,
      },
    });

    // Write AuditLog
    await this.audit.record({
      userId: ownerId,
      action: AuditAction.ACCESS_GRANTED,
      resource: 'AccessPermission',
      resourceId: permission.id,
      newData: {
        granteeUserId: grantee.id,
        granteeEmail,
        familyMemberId: memberId,
        accessLevel: level,
      },
      severity: 'INFO',
      req,
    });

    // Notify owner/patient and grantee
    try {
      await this.notificationService.sendPushNotification(ownerId, {
        title: 'Caregiver Access Granted',
        body: `${grantee.fullName || granteeEmail} has been granted ${level} access to ${member.fullName}'s health records.`,
        type: 'ALERT',
        data: {
          event: 'CAREGIVER_ACCESS_GRANTED',
          memberId,
          memberName: member.fullName,
          granteeId: grantee.id,
          level,
        },
      });

      await this.notificationService.sendPushNotification(grantee.id, {
        title: 'New Health Profile Shared',
        body: `You have been granted ${level} access to manage ${member.fullName}'s health records.`,
        type: 'INFO',
        data: {
          event: 'CAREGIVER_INVITATION',
          memberId,
          memberName: member.fullName,
          ownerId,
          level,
        },
      });
    } catch (notifErr: any) {
      this.logger.warn(
        `Failed to send family share notifications for member=${memberId}: ${notifErr?.message || notifErr}`,
      );
    }

    return permission;
  }

  /**
   * Lists all caregivers with access to a specific family member profile.
   */
  async getCaregivers(ownerId: string, memberId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.userId !== ownerId) {
      throw new ForbiddenException('Not authorized to view permissions for this profile');
    }

    const permissions = await this.prisma.accessPermission.findMany({
      where: { familyMemberId: memberId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return permissions.map((p) => ({
      id: p.id,
      granteeId: p.userId,
      granteeName: p.user.fullName,
      granteeEmail: p.user.email,
      granteeAvatar: p.user.avatarUrl,
      accessLevel: p.accessLevel,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Revokes caregiver access to a family member profile.
   */
  async revokeAccess(
    ownerId: string,
    memberId: string,
    granteeId: string,
    req?: Request,
  ) {
    const member = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.userId !== ownerId) {
      throw new ForbiddenException('Not authorized to manage this profile');
    }

    const deleted = await this.prisma.accessPermission.deleteMany({
      where: {
        familyMemberId: memberId,
        userId: granteeId,
      },
    });

    if (deleted.count > 0) {
      await this.audit.record({
        userId: ownerId,
        action: AuditAction.ACCESS_REVOKED,
        resource: 'AccessPermission',
        newData: { memberId, revokedGranteeId: granteeId },
        severity: 'WARN',
        req,
      });

      // Notify owner and revoked caregiver
      try {
        await this.notificationService.sendPushNotification(ownerId, {
          title: 'Caregiver Access Revoked',
          body: `Caregiver access to ${member.fullName}'s health profile was revoked.`,
          type: 'ALERT',
          data: {
            event: 'CAREGIVER_ACCESS_REVOKED',
            memberId,
            granteeId,
          },
        });

        await this.notificationService.sendPushNotification(granteeId, {
          title: 'Caregiver Access Revoked',
          body: `Your access to ${member.fullName}'s health records has been revoked.`,
          type: 'INFO',
          data: {
            event: 'CAREGIVER_ACCESS_REVOKED',
            memberId,
          },
        });
      } catch (notifErr: any) {
        this.logger.warn(
          `Failed to send revoke notification for member=${memberId}: ${notifErr?.message || notifErr}`,
        );
      }
    }

    return { success: deleted.count > 0 };
  }

  /**
   * Deletes a managed family member profile.
   */
  async deleteMember(primaryUserId: string, memberId: string, req?: Request) {
    const member = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.userId !== primaryUserId) {
      throw new ForbiddenException('Not authorized to delete this profile');
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete permissions and member
      await tx.accessPermission.deleteMany({ where: { familyMemberId: memberId } });
      await tx.familyMember.delete({ where: { id: memberId } });
      // Delete shadow user
      await tx.user.deleteMany({ where: { id: memberId } });
    });

    await this.audit.record({
      userId: primaryUserId,
      action: AuditAction.PHI_DELETE,
      resource: 'FamilyMember',
      resourceId: memberId,
      oldData: { fullName: member.fullName, relationship: member.relationship },
      severity: 'WARN',
      req,
    });

    return { success: true };
  }

  /**
   * Lists all profiles the current user has access to (owned + shared).
   */
  async getAuthorizedProfiles(userId: string) {
    const owned = await this.prisma.familyMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const shared = await this.prisma.accessPermission.findMany({
      where: { userId },
      include: { familyMember: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      owned,
      shared: shared.map((s) => ({
        ...s.familyMember,
        accessLevel: s.accessLevel,
      })),
    };
  }

  /**
   * Checks if a user has sufficient permission for a specific family member's resource.
   */
  async checkPermission(
    userId: string,
    memberId: string,
    requiredLevel: AccessLevel,
  ) {
    const member = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
    });
    if (member?.userId === userId) return true;

    const permission = await this.prisma.accessPermission.findUnique({
      where: {
        userId_familyMemberId: {
          userId,
          familyMemberId: memberId,
        },
      },
    });

    if (!permission) return false;

    const levels = [
      AccessLevel.EMERGENCY,
      AccessLevel.VIEW,
      AccessLevel.EDIT,
      AccessLevel.FULL,
    ];
    return levels.indexOf(permission.accessLevel) >= levels.indexOf(requiredLevel);
  }
}
