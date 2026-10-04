// ============================================
// Compliance Controller — DPDP & HIPAA Compliance Endpoints
// ============================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { ComplianceService } from './compliance.service';
import { RequestExportDto, DataErasureDto } from './dto/compliance.dto';

@ApiTags('compliance')
@ApiBearerAuth()
@Controller({ path: 'compliance', version: '1' })
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('export')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request complete clinical and personal data export (DPDP Right to Access)' })
  async requestExport(
    @CurrentUser('sub') userId: string,
    @Body() dto: RequestExportDto,
  ) {
    return this.complianceService.requestExport(userId, dto);
  }

  @Get('export')
  @ApiOperation({ summary: 'List data export requests for current user' })
  async getExportRequests(@CurrentUser('sub') userId: string) {
    return this.complianceService.getExportRequests(userId);
  }

  @Get('export/:id/download')
  @ApiOperation({ summary: 'Download compiled data export bundle' })
  @ApiParam({ name: 'id', description: 'DataExportRequest ID' })
  async downloadExport(
    @CurrentUser('sub') userId: string,
    @Param('id') exportId: string,
  ) {
    return this.complianceService.getExportData(userId, exportId);
  }

  @Post('erasure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute Right to Erasure (anonymizes PII, soft-deletes user, revokes sessions)' })
  async executeErasure(
    @CurrentUser('sub') userId: string,
    @Body() dto: DataErasureDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.complianceService.executeErasure(userId, dto, { ipAddress: ip, userAgent });
  }
}
