// ============================================
// DPDP Consent Service — Purpose-based consent tracking
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/database.module';
import { GrantConsentDto, RevokeConsentDto } from './dto/consent.dto';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async grantConsent(
    userId: string,
    dto: GrantConsentDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const ipAddress = dto.ipAddress || meta?.ipAddress;
    const userAgent = dto.userAgent || meta?.userAgent;

    const existing = await this.prisma.dataConsent.findFirst({
      where: { userId, purpose: dto.purpose },
    });

    let consent;
    if (existing) {
      consent = await this.prisma.dataConsent.update({
        where: { id: existing.id },
        data: {
          isGranted: true,
          grantedAt: new Date(),
          withdrawnAt: null,
          ipAddress: ipAddress || existing.ipAddress,
          userAgent: userAgent || existing.userAgent,
        },
      });
    } else {
      consent = await this.prisma.dataConsent.create({
        data: {
          userId,
          purpose: dto.purpose,
          isGranted: true,
          grantedAt: new Date(),
          ipAddress,
          userAgent,
        },
      });
    }

    await this.logAudit(userId, 'CONSENT_GRANTED', 'data_consent', consent.id, ipAddress, userAgent);
    this.logger.log(`Consent granted for purpose=${dto.purpose} user=${userId}`);

    return consent;
  }

  async revokeConsent(
    userId: string,
    dto: RevokeConsentDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const ipAddress = meta?.ipAddress;
    const userAgent = meta?.userAgent;

    const existing = await this.prisma.dataConsent.findFirst({
      where: { userId, purpose: dto.purpose },
    });

    let consent;
    if (existing) {
      consent = await this.prisma.dataConsent.update({
        where: { id: existing.id },
        data: {
          isGranted: false,
          withdrawnAt: new Date(),
          ipAddress: ipAddress || existing.ipAddress,
          userAgent: userAgent || existing.userAgent,
        },
      });
    } else {
      consent = await this.prisma.dataConsent.create({
        data: {
          userId,
          purpose: dto.purpose,
          isGranted: false,
          withdrawnAt: new Date(),
          ipAddress,
          userAgent,
        },
      });
    }

    await this.logAudit(userId, 'CONSENT_REVOKED', 'data_consent', consent.id, ipAddress, userAgent);
    this.logger.log(`Consent revoked for purpose=${dto.purpose} user=${userId}`);

    return consent;
  }

  async getConsents(userId: string) {
    return this.prisma.dataConsent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async hasConsent(userId: string, purpose: string): Promise<boolean> {
    const record = await this.prisma.dataConsent.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: 'desc' },
    });

    return !!(record && record.isGranted && !record.withdrawnAt);
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
      this.logger.error(`Failed to log audit for ${action}: ${err?.message || err}`);
    }
  }
}
