// ============================================
// Family Controller — Caregiver & Member APIs
// ============================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { FamilyService } from './family.service';
import { AccessLevel, RelationshipType } from '@maate/database';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import type { Request } from 'express';

class CreateMemberDto {
  @IsString() @IsNotEmpty() fullName!: string;
  @IsEnum(RelationshipType) relationship!: RelationshipType;
  @IsOptional() dateOfBirth?: Date;
  @IsOptional() gender?: string;
}

class ShareAccessDto {
  @IsEmail() granteeEmail!: string;
  @IsEnum(AccessLevel) level!: AccessLevel;
}

@ApiTags('family')
@ApiBearerAuth()
@Controller({ path: 'family', version: '1' })
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post('members')
  @ApiOperation({ summary: 'Add a new family member profile' })
  async addMember(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateMemberDto,
    @Req() req: Request,
  ) {
    const data = await this.familyService.addMember(userId, dto, req);
    return { success: true, data };
  }

  @Get('profiles')
  @ApiOperation({ summary: 'List all profiles you manage or have access to' })
  async getProfiles(@CurrentUser('sub') userId: string) {
    const data = await this.familyService.getAuthorizedProfiles(userId);
    return { data };
  }

  @Delete('members/:id')
  @ApiOperation({ summary: 'Delete a managed family member profile' })
  async deleteMember(
    @CurrentUser('sub') userId: string,
    @Param('id') memberId: string,
    @Req() req: Request,
  ) {
    return this.familyService.deleteMember(userId, memberId, req);
  }

  @Post('members/:id/share')
  @ApiOperation({ summary: 'Share access with a caregiver' })
  async shareAccess(
    @CurrentUser('sub') userId: string,
    @Param('id') memberId: string,
    @Body() dto: ShareAccessDto,
    @Req() req: Request,
  ) {
    const data = await this.familyService.shareAccess(
      userId,
      memberId,
      dto.granteeEmail,
      dto.level,
      req,
    );
    return { success: true, data };
  }

  @Get('members/:id/caregivers')
  @ApiOperation({ summary: 'List all caregivers with access to this profile' })
  async getCaregivers(
    @CurrentUser('sub') userId: string,
    @Param('id') memberId: string,
  ) {
    const data = await this.familyService.getCaregivers(userId, memberId);
    return { data };
  }

  @Delete('members/:id/caregivers/:granteeId')
  @ApiOperation({ summary: 'Revoke a caregiver access from this profile' })
  async revokeCaregiverAccess(
    @CurrentUser('sub') userId: string,
    @Param('id') memberId: string,
    @Param('granteeId') granteeId: string,
    @Req() req: Request,
  ) {
    return this.familyService.revokeAccess(userId, memberId, granteeId, req);
  }

  @Get('members/:id/permissions')
  @ApiOperation({ summary: 'Check current permissions for a member' })
  async getPermissions(
    @CurrentUser('sub') userId: string,
    @Param('id') memberId: string,
  ) {
    const isOwner = await this.familyService.checkPermission(
      userId,
      memberId,
      AccessLevel.FULL,
    );
    return { isOwner, memberId };
  }
}
