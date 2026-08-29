// ============================================
// JWT Auth Guard + Role Guard + Decorators
// Production-grade authentication middleware
// ============================================

import {
  CanActivate, createParamDecorator, ExecutionContext,
  Injectable, SetMetadata, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { JwtPayload } from '../../modules/auth/services/token.service';
export type { JwtPayload };

import { PrismaService } from '../database/database.module';

// ─── JWT Auth Guard ─────────────────────────
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.sessionId) {
        const session = await this.prisma.userSession.findUnique({
          where: { id: payload.sessionId },
          select: { isActive: true },
        });
        if (!session || !session.isActive) {
          throw new UnauthorizedException('Session has been revoked or logged out');
        }
      }
      
      const patientIdHeader = request.headers['x-patient-id'];
      const patientId = Array.isArray(patientIdHeader) ? patientIdHeader[0] : patientIdHeader;

      if (patientId && patientId !== payload.sub) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(patientId)) {
          throw new ForbiddenException('Invalid family member profile ID');
        }

        const isOwner = await this.prisma.familyMember.findFirst({
          where: { id: patientId, userId: payload.sub },
        });

        if (!isOwner) {
          const hasSharedPermission = await this.prisma.accessPermission.findUnique({
            where: {
              userId_familyMemberId: {
                userId: payload.sub,
                familyMemberId: patientId,
              },
            },
          });

          if (!hasSharedPermission) {
            throw new ForbiddenException('You do not have access to this family member profile');
          }
        }

        payload.sub = patientId;
      }

      request['user'] = payload;
    } catch (err) {
      if (err instanceof ForbiddenException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

// ─── Role-Based Access Guard ────────────────
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user?.role) {
      throw new ForbiddenException('No role assigned');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Requires one of: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}

// ─── Family Permission Guard ────────────────
// Checks if user has permission to access a family member's data
@Injectable()
export class FamilyPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<string>('familyPermission', context.getHandler());
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const familyPermissions = request['familyPermissions'];

    if (!familyPermissions) return true; // Not a family-scoped request

    switch (requiredPermission) {
      case 'view': return familyPermissions.canView;
      case 'edit': return familyPermissions.canEdit;
      case 'manage_reminders': return familyPermissions.canManageReminders;
      default: return false;
    }
  }
}

// ─── Decorators ─────────────────────────────

export const Public = () => SetMetadata('isPublic', true);

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

export const FamilyPermission = (permission: 'view' | 'edit' | 'manage_reminders') =>
  SetMetadata('familyPermission', permission);

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
