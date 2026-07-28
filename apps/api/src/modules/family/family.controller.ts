// ============================================
// Family Controller — Caregiver & Member APIs
// ============================================

import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { FamilyService } from './family.service';
import { AccessLevel, RelationshipType } from '@maate/database';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  async addMember(@CurrentUser('sub') userId: string, @Body() dto: CreateMemberDto) {
    return this.familyService.addMember(userId, dto);
  }

  @Get('profiles')
  @ApiOperation({ summary: 'List all profiles you manage or have access to' })
  async getProfiles(@CurrentUser('sub') userId: string) {
    return this.familyService.getAuthorizedProfiles(userId);
  }

  @Post('members/:id/share')
  @ApiOperation({ summary: 'Share access with a caregiver' })
  async shareAccess(
    @CurrentUser('sub') userId: string,
    @Param('id') memberId: string,
    @Body() dto: ShareAccessDto,
  ) {
    return this.familyService.shareAccess(userId, memberId, dto.granteeEmail, dto.level);
  }

  @Get('members/:id/permissions')
  @ApiOperation({ summary: 'Check current permissions for a member' })
  async getPermissions(
    @CurrentUser('sub') userId: string,
    @Param('id') memberId: string,
  ) {
    const isOwner = await this.familyService.checkPermission(userId, memberId, AccessLevel.FULL);
    return { isOwner, memberId };
  }
}
