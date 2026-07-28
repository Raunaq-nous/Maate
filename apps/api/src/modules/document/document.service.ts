// ============================================
// Document Service — Medical Document Management
// Secure Uploads, OCR, AI Processing, Retrieval
// ============================================

import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/database.module';
import { StorageService } from '../../common/storage/storage.service';
import { FileProcessingService } from '../../common/storage/file-processing.service';
import { DocumentType } from '@maate/database';
import { GetUploadUrlDto, ConfirmUploadDto } from './dto/document.dto';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly processing: FileProcessingService,
  ) {}

  // ─── Generate Signed Upload URL ────────────
  async getUploadUrl(userId: string, dto: GetUploadUrlDto) {
    return this.storage.createUploadUrl(
      userId,
      dto.fileName,
      dto.contentType,
      dto.fileSizeBytes,
    );
  }

  // ─── Confirm Upload & Trigger Pipeline ─────
  async confirmUpload(userId: string, dto: ConfirmUploadDto) {
    // 1. Verify file exists in storage
    const metadata = await this.storage.getFileMetadata(dto.fileKey);
    if (!metadata) {
      throw new BadRequestException('File not found in storage. Please upload first.');
    }

    // 2. Create database records in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create Document entry
      const doc = await tx.document.create({
        data: {
          userId,
          title: dto.title || metadata.key.split('/').pop()?.split('_').pop(),
          documentType: dto.documentType as DocumentType,
          fileUrl: metadata.key,
          fileType: metadata.contentType.split('/').pop(),
          fileSizeBytes: BigInt(metadata.size),
          checksum: metadata.checksum,
          encryptionKeyId: metadata.encryptionKeyId,
          providerName: dto.providerName,
          doctorName: dto.doctorName,
          ocrStatus: 'PENDING',
          aiSummaryStatus: 'PENDING',
        },
      });

      // Create FileUpload entry for audit/tracking
      await tx.fileUpload.create({
        data: {
          userId,
          originalName: metadata.key.split('/').pop()?.split('_').pop() || 'unknown',
          storedPath: metadata.key,
          mimeType: metadata.contentType,
          sizeBytes: BigInt(metadata.size),
          checksum: metadata.checksum,
          encryptionKeyId: metadata.encryptionKeyId,
          scanStatus: 'PENDING',
        },
      });

      // Create Timeline event
      await tx.timelineEvent.create({
        data: {
          userId,
          eventType: 'DOCUMENT_UPLOADED',
          title: `Uploaded ${dto.documentType.replace('_', ' ')}`,
          description: `New ${dto.documentType.toLowerCase().replace('_', ' ')} added to records.`,
          refResourceType: 'Document',
          refResourceId: doc.id,
          occurredAt: new Date(),
        },
      });

      return doc;
    });

    // 3. Enqueue for async processing (Virus Scan -> OCR -> AI)
    await this.processing.enqueue({
      documentId: result.id,
      userId,
      fileKey: metadata.key,
      contentType: metadata.contentType,
      fileName: result.title || 'unknown',
      pipeline: ['virus_scan', 'ocr', 'ai_summary'],
    });

    this.logger.log(`Document upload confirmed: ${result.id} for user ${userId}`);

    return {
      message: 'Upload confirmed. Processing started.',
      documentId: result.id,
    };
  }

  // ─── Querying ──────────────────────────────
  async findByUser(userId: string, query: Record<string, any>) {
    const page = Number(query['page']) || 1;
    const limit = Math.min(Number(query['limit']) || 20, 50);
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: { userId, isArchived: false },
        include: { aiSummary: true },
        orderBy: { documentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.document.count({ where: { userId, isArchived: false } }),
    ]);

    return {
      data: documents,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findById(userId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId },
      include: { ocrResult: true, aiSummary: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return { data: doc };
  }

  async getOcrResult(documentId: string) {
    const result = await this.prisma.ocrResult.findUnique({ where: { documentId } });
    if (!result) throw new NotFoundException('OCR result not found');
    return { data: result };
  }

  async getAiSummary(documentId: string) {
    const summary = await this.prisma.aiSummary.findUnique({ where: { documentId } });
    if (!summary) throw new NotFoundException('AI summary not found');
    return { data: summary };
  }

  async archive(userId: string, id: string) {
    await this.prisma.document.updateMany({
      where: { id, userId },
      data: { isArchived: true, deletedAt: new Date() },
    });
    return { message: 'Document archived' };
  }
}
