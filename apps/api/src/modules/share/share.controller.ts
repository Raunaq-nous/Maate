// ============================================
// Share Controller — Doctor Share APIs
// External time-limited clinician portal
// ============================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public } from '../../common/auth/jwt-auth.guard';
import { ShareService } from './share.service';
import { CreateDoctorShareDto } from './dto/share.dto';
import type { Request } from 'express';

@ApiTags('share')
@Controller({ path: 'share', version: '1' })
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post('doctor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a time-limited doctor share link' })
  async createDoctorShare(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateDoctorShareDto,
    @Req() req: Request,
  ) {
    const data = await this.shareService.createShare(userId, dto, req);
    return { success: true, data };
  }

  @Get('doctor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all doctor share links for current user' })
  async getDoctorShares(@CurrentUser('sub') userId: string) {
    const data = await this.shareService.getShares(userId);
    return { data };
  }

  @Patch('doctor/:id/revoke')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an active doctor share link' })
  async revokeDoctorShare(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.shareService.revokeShare(userId, id, req);
  }

  @Delete('doctor/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete/Revoke doctor share link' })
  async deleteDoctorShare(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.shareService.revokeShare(userId, id, req);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get('doctor/view/:token')
  @ApiOperation({
    summary:
      'Public doctor portal endpoint to view patient records via token (Rate-limited, Audited)',
  })
  async viewSharedRecords(
    @Param('token') token: string,
    @Req() req: Request,
  ) {
    const data = await this.shareService.viewSharedData(token, req);
    return { success: true, data };
  }
}
