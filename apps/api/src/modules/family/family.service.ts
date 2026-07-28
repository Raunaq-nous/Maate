// ============================================
// Family Service — RBAC & Member Management
// Permission Matrix & Caregiver Access
// ============================================

import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/database.module';
import { AccessLevel, RelationshipType, Gender } from '@maate/database';

@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Adds a new family member profile (e.g. Parent or Child).
   * This can be a standalone profile managed by the primary user.
   */
  async addMember(primaryUserId: string, data: {
    fullName: string;
    relationship: RelationshipType;
    dateOfBirth?: Date;
    gender?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.familyMember.create({
        data: {
          userId: primaryUserId,
          fullName: data.fullName,
          relationship: data.relationship,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender as Gender,
        },
      });

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

      return member;
    });
  }

  /**
   * Grants access to a family member's records to another registered user (Caregiver/Spouse).
   */
  async shareAccess(ownerId: string, memberId: string, granteeEmail: string, level: AccessLevel) {
    // 1. Find the user to share with
    const grantee = await this.prisma.user.findUnique({ where: { email: granteeEmail } });
    if (!grantee) throw new Error('User not found with this email');

    // 2. Verify ownership
    const member = await this.prisma.familyMember.findUnique({ where: { id: memberId } });
    if (member?.userId !== ownerId) throw new ForbiddenException('Not authorized to share this profile');

    // 3. Create permission
    return this.prisma.accessPermission.upsert({
      where: {
        userId_familyMemberId: {
          userId: grantee.id,
          familyMemberId: memberId,
        }
      },
      create: {
        userId: grantee.id,
        familyMemberId: memberId,
        accessLevel: level,
        grantedById: ownerId,
      },
      update: {
        accessLevel: level,
      }
    });
  }

  /**
   * Lists all profiles the current user has access to (owned + shared).
   */
  async getAuthorizedProfiles(userId: string) {
    const owned = await this.prisma.familyMember.findMany({ where: { userId } });
    
    const shared = await this.prisma.accessPermission.findMany({
      where: { userId },
      include: { familyMember: true },
    });

    return {
      owned,
      shared: shared.map(s => ({
        ...s.familyMember,
        accessLevel: s.accessLevel,
      })),
    };
  }

  /**
   * Checks if a user has sufficient permission for a specific family member's resource.
   */
  async checkPermission(userId: string, memberId: string, requiredLevel: AccessLevel) {
    // 1. Check if owner
    const member = await this.prisma.familyMember.findUnique({ where: { id: memberId } });
    if (member?.userId === userId) return true;

    // 2. Check shared permissions
    const permission = await this.prisma.accessPermission.findUnique({
      where: {
        userId_familyMemberId: {
          userId,
          familyMemberId: memberId,
        }
      }
    });

    if (!permission) return false;

    // Access Level Hierarchy: FULL > EDIT > VIEW > EMERGENCY
    const levels = [AccessLevel.EMERGENCY, AccessLevel.VIEW, AccessLevel.EDIT, AccessLevel.FULL];
    return levels.indexOf(permission.accessLevel) >= levels.indexOf(requiredLevel);
  }
}
