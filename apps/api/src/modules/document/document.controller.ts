// ============================================
// Document Controller — REST Endpoints
// Secure Uploads, Retrieval, and Archiving
// ============================================

import { Controller, Get, Post, Delete, Param, Query, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser, type JwtPayload } from '../../common/auth/jwt-auth.guard';
import { DocumentService } from './document.service';
import { GetUploadUrlDto, ConfirmUploadDto } from './dto/document.dto';
import { AuditService, AuditAction } from '../../common/audit/audit.service';

@ApiTags('documents')
@ApiBearerAuth()
@Controller({ path: 'documents', version: '1' })
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly audit: AuditService,
  ) {}

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a signed S3 URL for document upload' })
  @ApiResponse({ status: 200, description: 'Returns signed URL and file key' })
  async getUploadUrl(
    @CurrentUser('sub') userId: string,
    @Body() dto: GetUploadUrlDto,
  ) {
    return this.documentService.getUploadUrl(userId, dto);
  }

  @Post('confirm-upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Confirm file upload and start processing pipeline' })
  async confirmUpload(
    @CurrentUser('sub') userId: string,
    @Body() dto: ConfirmUploadDto,
  ) {
    const doc = await this.documentService.confirmUpload(userId, dto);
    await this.audit.record({
      userId,
      action: AuditAction.PHI_CREATE,
      resource: 'Document',
      resourceId: doc.documentId,
    });
    return doc;
  }

  @Get()
  @ApiOperation({ summary: 'List user documents with pagination' })
  async list(@CurrentUser() user: JwtPayload, @Query() query: Record<string, unknown>) {
    return this.documentService.findByUser(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details' })
  async getById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const doc = await this.documentService.findById(user.sub, id);
    await this.audit.record({
      userId: user.sub,
      action: AuditAction.PHI_VIEW,
      resource: 'Document',
      resourceId: id,
      req,
    });
    return doc;
  }

  @Get(':id/ocr')
  @ApiOperation({ summary: 'Get OCR extraction result' })
  async getOcrResult(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const result = await this.documentService.getOcrResult(id);
    await this.audit.record({
      userId: user.sub,
      action: AuditAction.PHI_VIEW,
      resource: 'DocumentOCR',
      resourceId: id,
      req,
    });
    return result;
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get AI-generated summary' })
  async getSummary(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const summary = await this.documentService.getAiSummary(id);
    await this.audit.record({
      userId: user.sub,
      action: AuditAction.PHI_VIEW,
      resource: 'DocumentSummary',
      resourceId: id,
      req,
    });
    return summary;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive document (soft delete)' })
  async archive(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.audit.record({
      userId: user.sub,
      action: AuditAction.PHI_DELETE,
      resource: 'Document',
      resourceId: id,
    });
    return this.documentService.archive(user.sub, id);
  }
}
