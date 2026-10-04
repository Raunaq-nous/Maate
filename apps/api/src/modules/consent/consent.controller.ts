// ============================================
// DPDP Consent Controller — Endpoints for Consent Lifecycle
// ============================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Query,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { ConsentService } from './consent.service';
import { GrantConsentDto, RevokeConsentDto } from './dto/consent.dto';

@ApiTags('consent')
@ApiBearerAuth()
@Controller({ path: 'consents', version: '1' })
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grant consent for a specific data processing purpose' })
  async grantConsent(
    @CurrentUser('sub') userId: string,
    @Body() dto: GrantConsentDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.consentService.grantConsent(userId, dto, { ipAddress: ip, userAgent });
  }

  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke previously granted consent' })
  async revokeConsent(
    @CurrentUser('sub') userId: string,
    @Body() dto: RevokeConsentDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.consentService.revokeConsent(userId, dto, { ipAddress: ip, userAgent });
  }

  @Get()
  @ApiOperation({ summary: 'Get all consent records for current user' })
  async getConsents(@CurrentUser('sub') userId: string) {
    return this.consentService.getConsents(userId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Check if user has granted consent for a specific purpose' })
  @ApiQuery({ name: 'purpose', required: true, type: String })
  async checkConsentStatus(
    @CurrentUser('sub') userId: string,
    @Query('purpose') purpose: string,
  ) {
    const granted = await this.consentService.hasConsent(userId, purpose);
    return { purpose, isGranted: granted };
  }
}
