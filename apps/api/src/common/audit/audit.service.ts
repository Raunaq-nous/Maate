// ============================================
// Audit Service — HIPAA & DPDP Compliance
// Centralized Clinical Audit Trail
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/database.module';
import { Request } from 'express';

export enum AuditAction {
  PHI_VIEW = 'PHI_VIEW',
  PHI_CREATE = 'PHI_CREATE',
  PHI_UPDATE = 'PHI_UPDATE',
  PHI_DELETE = 'PHI_DELETE',
  PHI_EXPORT = 'PHI_EXPORT',
  AUTH_LOGIN = 'AUTH_LOGIN',
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_REVOKED = 'ACCESS_REVOKED',
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a compliance-grade audit log.
   * Tracks WHO accessed WHAT, WHEN, and FROM WHERE.
   */
  async record(params: {
    userId?: string;
    action: AuditAction | string;
    resource: string;
    resourceId?: string;
    oldData?: any;
    newData?: any;
    severity?: 'INFO' | 'WARN' | 'CRITICAL';
    req?: Request;
  }) {
    try {
      const ipAddress = params.req?.ip || params.req?.headers['x-forwarded-for']?.toString();
      const userAgent = params.req?.headers['user-agent'];

      const log = await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          oldData: params.oldData,
          newData: params.newData,
          ipAddress,
          userAgent,
          severity: params.severity || 'INFO',
        },
      });

      if (params.severity === 'CRITICAL') {
        this.logger.error(`CRITICAL AUDIT EVENT: ${params.action} on ${params.resource}`);
        // Trigger alert to Security Slack/OpsGenie
      }

      return log;
    } catch (err) {
      this.logger.error('Failed to write audit log', err);
      // In production: Fail-safe logic (write to secondary sink or fail the request if HIPAA-strict)
    }
  }
}
