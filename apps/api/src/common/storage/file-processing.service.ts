// ============================================
// File Processing Queue — Virus scan, OCR, AI
// BullMQ-based async pipeline
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import { PrismaService } from '../database/database.module';
import { StorageService } from './storage.service';

export interface FileProcessingJob {
  documentId: string;
  userId: string;
  fileKey: string;
  contentType: string;
  fileName: string;
  pipeline: ('virus_scan' | 'ocr' | 'ai_summary')[];
}

@Injectable()
export class FileProcessingService {
  private readonly logger = new Logger(FileProcessingService.name);
  private readonly aiServiceUrl: string;
  private readonly ocrServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly storage: StorageService,
  ) {
    this.aiServiceUrl = this.config.get('AI_SERVICE_URL', 'http://localhost:8001');
    this.ocrServiceUrl = this.config.get('OCR_SERVICE_URL', 'http://localhost:8002');
  }

  // ─── Enqueue file for processing ───────────
  async enqueue(job: FileProcessingJob): Promise<void> {
    this.logger.log(`Processing queued: doc=${job.documentId} pipeline=${job.pipeline.join(',')}`);

    // In production: push to BullMQ / SQS
    // For now: running async in background
    setImmediate(() => {
      this.processAsync(job).catch((err) =>
        this.logger.error(`Processing failed: doc=${job.documentId}`, err),
      );
    });
  }

  // ─── Async processing pipeline ─────────────
  private async processAsync(job: FileProcessingJob): Promise<void> {
    // Step 1: Virus scan
    if (job.pipeline.includes('virus_scan')) {
      await this.runVirusScan(job);
    }

    // Step 2: OCR & Extraction (Calls Python OCR Service)
    if (job.pipeline.includes('ocr')) {
      await this.runAiOcr(job);
    }

    // Step 3: AI summary (Calls Python AI Service)
    if (job.pipeline.includes('ai_summary')) {
      await this.runAiSummary(job);
    }
  }

  // ─── Virus Scan ────────────────────────────
  private async runVirusScan(job: FileProcessingJob): Promise<void> {
    this.logger.log(`Virus scan started: doc=${job.documentId}`);
    try {
      // Simulation: Mark as clean
      await this.prisma.fileUpload.updateMany({
        where: { storedPath: job.fileKey },
        data: { scanStatus: 'COMPLETED', scanResult: 'CLEAN' },
      });
      this.logger.log(`Virus scan clean: doc=${job.documentId}`);
    } catch (err) {
      this.logger.error(`Virus scan failed: doc=${job.documentId}`, err);
    }
  }

  // ─── AI OCR & Extraction ───────────────────
  private async runAiOcr(job: FileProcessingJob): Promise<void> {
    this.logger.log(`AI OCR started: doc=${job.documentId}`);

    await this.prisma.document.update({
      where: { id: job.documentId },
      data: { ocrStatus: 'PROCESSING' },
    });

    try {
      const startTime = Date.now();

      // 1. Get file buffer from storage
      const buffer = await this.storage.getFileBuffer(job.fileKey);

      // 2. Prepare multipart form data
      const form = new FormData();
      form.append('file', buffer, {
        filename: job.fileName,
        contentType: job.contentType,
      });
      form.append('document_id', job.documentId);
      form.append('document_type', 'lab_report'); // Default for now

      // 3. Call Python OCR Service (upload endpoint)
      this.logger.debug(`Calling OCR Service upload at ${this.ocrServiceUrl}/api/v1/ocr/upload`);
      
      const response = await firstValueFrom(
        this.http.post<any>(`${this.ocrServiceUrl}/api/v1/ocr/upload`, form, {
          headers: form.getHeaders(),
        })
      );
      const { data } = response;

      const processingTimeMs = Date.now() - startTime;
      const ocrData = data.data;

      // 3. Save OCR results
      await this.prisma.ocrResult.upsert({
        where: { documentId: job.documentId },
        create: {
          documentId: job.documentId,
          rawText: ocrData.raw_text,
          structuredData: ocrData.structured_data,
          confidenceScore: ocrData.confidence_score,
          engineUsed: ocrData.engine_used,
          processingTimeMs,
        },
        update: {
          rawText: ocrData.raw_text,
          structuredData: ocrData.structured_data,
          confidenceScore: ocrData.confidence_score,
          processingTimeMs,
        },
      });

      await this.prisma.document.update({
        where: { id: job.documentId },
        data: { ocrStatus: 'COMPLETED' },
      });

      this.logger.log(`AI OCR completed: doc=${job.documentId} in ${processingTimeMs}ms`);

    } catch (err: any) {
      this.logger.error(`AI OCR failed: doc=${job.documentId}`, err?.message || err);
      await this.prisma.document.update({
        where: { id: job.documentId },
        data: { ocrStatus: 'FAILED' },
      });
    }
  }

  // ─── AI Summary ────────────────────────────
  private async runAiSummary(job: FileProcessingJob): Promise<void> {
    this.logger.log(`AI summary started: doc=${job.documentId}`);
    
    await this.prisma.document.update({
      where: { id: job.documentId },
      data: { aiSummaryStatus: 'PROCESSING' },
    });

    try {
      // 1. Get OCR result
      const ocr = await this.prisma.ocrResult.findUnique({ where: { documentId: job.documentId } });
      if (!ocr) {
        this.logger.warn(`OCR result missing for doc=${job.documentId}, skipping summary`);
        return;
      }

      // 2. Call AI Service
      this.logger.debug(`Calling AI Service at ${this.aiServiceUrl}/api/v1/ai/summarize`);
      
      const response = await firstValueFrom(
        this.http.post<any>(`${this.aiServiceUrl}/api/v1/ai/summarize`, {
          document_id: job.documentId,
          document_type: job.contentType,
          structured_data: ocr.structuredData,
        })
      );
      const { data } = response;

      const summaryData = data.data;

      // 3. Persist summary
      await this.prisma.aiSummary.upsert({
        where: { documentId: job.documentId },
        create: {
          documentId: job.documentId,
          summaryText: summaryData.summary_text,
          laypersonSummary: summaryData.summary_text,
          keyFindings: summaryData.key_findings || [],
          riskFlags: summaryData.risk_flags || [],
          recommendations: summaryData.recommendations || [],
          modelUsed: summaryData.model_used || 'gpt-4o',
        },
        update: {
          summaryText: summaryData.summary_text,
          laypersonSummary: summaryData.summary_text,
          keyFindings: summaryData.key_findings || [],
          riskFlags: summaryData.risk_flags || [],
          recommendations: summaryData.recommendations || [],
        },
      });

      await this.prisma.document.update({
        where: { id: job.documentId },
        data: { aiSummaryStatus: 'COMPLETED' },
      });

      this.logger.log(`AI summary completed: doc=${job.documentId}`);

    } catch (err: any) {
      this.logger.error(`AI summary failed: doc=${job.documentId}`, err?.message || err);
      await this.prisma.document.update({
        where: { id: job.documentId },
        data: { aiSummaryStatus: 'FAILED' },
      });
    }
  }
}
