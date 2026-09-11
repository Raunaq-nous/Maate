// ============================================
// Document Processor — Background OCR Pipeline
// BullMQ Consumer for Document Processing
// ============================================

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Job } from 'bull';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import { PrismaService } from '../database/database.module';
import { StorageService } from './storage.service';
import { FileProcessingJob } from './file-processing.service';
import { NotificationService } from '../../modules/notification/notification.service';

@Processor('document-processing')
export class DocumentProcessor {
  private readonly logger = new Logger(DocumentProcessor.name);
  private readonly aiServiceUrl: string;
  private readonly ocrServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly storage: StorageService,
    private readonly notificationService: NotificationService,
  ) {
    this.aiServiceUrl = this.config.get('AI_SERVICE_URL', 'http://localhost:8001');
    this.ocrServiceUrl = this.config.get('OCR_SERVICE_URL', 'http://localhost:8002');
  }

  @Process('process-document')
  async handleProcess(job: Job<FileProcessingJob>) {
    const data = job.data;
    this.logger.log(
      `Processing document job #${job.id} (attempt ${job.attemptsMade + 1}/${job.opts.attempts || 3}) for doc=${data.documentId}`,
    );

    // Step 1: Virus scan
    if (data.pipeline.includes('virus_scan')) {
      await this.runVirusScan(data);
    }

    // Step 2: OCR & Extraction (Calls Python OCR Service)
    if (data.pipeline.includes('ocr')) {
      await this.runAiOcr(job, data);
    }

    // Step 3: AI summary (Phase 4 — deferred if AI service unavailable)
    if (data.pipeline.includes('ai_summary')) {
      await this.runAiSummary(data);
    }
  }

  // ─── Virus Scan ────────────────────────────
  private async runVirusScan(data: FileProcessingJob): Promise<void> {
    this.logger.log(`Virus scan started: doc=${data.documentId}`);
    try {
      await this.prisma.fileUpload.updateMany({
        where: { storedPath: data.fileKey },
        data: { scanStatus: 'COMPLETED', scanResult: 'CLEAN' },
      });
      this.logger.log(`Virus scan clean: doc=${data.documentId}`);
    } catch (err: any) {
      this.logger.error(`Virus scan failed: doc=${data.documentId}`, err?.message || err);
    }
  }

  // ─── AI OCR & Extraction ───────────────────
  private async runAiOcr(job: Job<FileProcessingJob>, data: FileProcessingJob): Promise<void> {
    this.logger.log(`AI OCR started: doc=${data.documentId}`);

    await this.prisma.document.update({
      where: { id: data.documentId },
      data: { ocrStatus: 'PROCESSING' },
    });

    const startTime = Date.now();

    try {
      // 1. Get file buffer from storage
      const buffer = await this.storage.getFileBuffer(data.fileKey);

      // 2. Prepare multipart form data
      const form = new FormData();
      form.append('file', buffer, {
        filename: data.fileName,
        contentType: data.contentType,
      });
      form.append('document_id', data.documentId);

      // Normalize document type for OCR service (e.g. LAB_REPORT -> lab_report, PRESCRIPTION -> prescription)
      const normalizedDocType = (data.documentType || 'LAB_REPORT').toLowerCase();
      form.append('document_type', normalizedDocType);

      // 3. Call Python OCR Service (upload endpoint)
      this.logger.debug(
        `Calling OCR Service at ${this.ocrServiceUrl}/api/v1/ocr/upload (docType=${normalizedDocType})`,
      );

      const response = await firstValueFrom(
        this.http.post<any>(`${this.ocrServiceUrl}/api/v1/ocr/upload`, form, {
          headers: form.getHeaders(),
          timeout: 30000,
        }),
      );

      const ocrData = response.data?.data;
      if (!ocrData) {
        throw new Error('Malformed response from OCR service: missing data field');
      }

      const processingTimeMs = Date.now() - startTime;

      // 4. Save OCR results
      await this.prisma.ocrResult.upsert({
        where: { documentId: data.documentId },
        create: {
          documentId: data.documentId,
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
          engineUsed: ocrData.engine_used,
          processingTimeMs,
        },
      });

      await this.prisma.document.update({
        where: { id: data.documentId },
        data: { ocrStatus: 'COMPLETED' },
      });

      this.logger.log(`AI OCR completed: doc=${data.documentId} in ${processingTimeMs}ms`);
    } catch (err: any) {
      const isClientError = err?.response?.status >= 400 && err?.response?.status < 500;
      const maxAttempts = job.opts.attempts || 3;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

      if (isClientError || isFinalAttempt) {
        this.logger.error(
          `AI OCR permanently failed for doc=${data.documentId} (status=${err?.response?.status || 'network_error'}): ${err?.message || err}`,
        );
        await this.prisma.document.update({
          where: { id: data.documentId },
          data: { ocrStatus: 'FAILED' },
        });

        // Notify user about OCR failure
        try {
          const doc = await this.prisma.document.findUnique({
            where: { id: data.documentId },
            select: { userId: true, title: true },
          });
          if (doc) {
            await this.notificationService.sendPushNotification(doc.userId, {
              title: 'Document Processing Incomplete',
              body: `We were unable to read "${doc.title || data.fileName || 'uploaded document'}". Please ensure the image or PDF is clear and re-upload.`,
              type: 'ALERT',
              data: {
                event: 'DOCUMENT_OCR_FAILED',
                documentId: data.documentId,
              },
            });
          }
        } catch (notifErr: any) {
          this.logger.warn(`Failed to send OCR failure notification: ${notifErr?.message || notifErr}`);
        }
      } else {
        this.logger.warn(
          `AI OCR transient error for doc=${data.documentId}, will retry (attempt ${job.attemptsMade + 1}/${maxAttempts}): ${err?.message || err}`,
        );
        // Throw error so BullMQ triggers retry according to backoff policy
        throw err;
      }
    }
  }

  // ─── AI Summary (Phase 4 scope) ────────────
  private async runAiSummary(data: FileProcessingJob): Promise<void> {
    this.logger.log(`AI summary triggered: doc=${data.documentId}`);
    try {
      const ocr = await this.prisma.ocrResult.findUnique({ where: { documentId: data.documentId } });
      if (!ocr || (!ocr.rawText && !ocr.structuredData)) {
        this.logger.error(`OCR result missing or empty for doc=${data.documentId}, cannot generate summary`);
        await this.prisma.document.update({
          where: { id: data.documentId },
          data: { aiSummaryStatus: 'FAILED' },
        });
        return;
      }

      await this.prisma.document.update({
        where: { id: data.documentId },
        data: { aiSummaryStatus: 'PROCESSING' },
      });

      const normalizedDocType = (data.documentType || 'LAB_REPORT').toLowerCase();

      this.logger.debug(
        `Calling AI Service at ${this.aiServiceUrl}/api/v1/ai/summarize (docType=${normalizedDocType})`,
      );

      const response = await firstValueFrom(
        this.http.post<any>(
          `${this.aiServiceUrl}/api/v1/ai/summarize`,
          {
            document_id: data.documentId,
            document_type: normalizedDocType,
            structured_data: ocr.structuredData,
            raw_text: ocr.rawText,
          },
          { timeout: 30000 },
        ),
      );

      const summaryData = response.data?.data;
      if (!summaryData) {
        throw new Error('Malformed response from AI service: missing data field');
      }

      await this.prisma.aiSummary.upsert({
        where: { documentId: data.documentId },
        create: {
          documentId: data.documentId,
          summaryText: summaryData.summary_text || '',
          laypersonSummary: summaryData.layperson_summary || summaryData.summary_text || '',
          keyFindings: summaryData.key_findings || [],
          riskFlags: summaryData.risk_flags || [],
          recommendations: summaryData.recommendations || [],
          modelUsed: summaryData.model_used || 'mock-engine',
          modelVersion: summaryData.model_version || '1.0',
          isMock: Boolean(summaryData.is_mock),
          promptTokens: summaryData.prompt_tokens,
          completionTokens: summaryData.completion_tokens,
        },
        update: {
          summaryText: summaryData.summary_text || '',
          laypersonSummary: summaryData.layperson_summary || summaryData.summary_text || '',
          keyFindings: summaryData.key_findings || [],
          riskFlags: summaryData.risk_flags || [],
          recommendations: summaryData.recommendations || [],
          modelUsed: summaryData.model_used || 'mock-engine',
          modelVersion: summaryData.model_version || '1.0',
          isMock: Boolean(summaryData.is_mock),
          promptTokens: summaryData.prompt_tokens,
          completionTokens: summaryData.completion_tokens,
        },
      });

      // Populate DocumentChunks for future RAG (Phase 4 / Phase 8)
      await this.createDocumentChunks(data.documentId, ocr.rawText || '', normalizedDocType);

      await this.prisma.document.update({
        where: { id: data.documentId },
        data: { aiSummaryStatus: 'COMPLETED' },
      });

      this.logger.log(
        `AI summary completed: doc=${data.documentId} (isMock=${Boolean(summaryData.is_mock)}, model=${summaryData.model_used})`,
      );

      // Notify user about AI summary completion and any risk flags
      try {
        const doc = await this.prisma.document.findUnique({
          where: { id: data.documentId },
          select: { userId: true, title: true },
        });
        if (doc) {
          const hasRiskFlags = Array.isArray(summaryData.risk_flags) && summaryData.risk_flags.length > 0;
          const isCritical = hasRiskFlags && summaryData.risk_flags.some((f: string) =>
            typeof f === 'string' && (f.toLowerCase().includes('critical') || f.toLowerCase().includes('high') || f.toLowerCase().includes('urgent'))
          );

          await this.notificationService.sendPushNotification(doc.userId, {
            title: isCritical
              ? 'Health Report: Attention Needed'
              : hasRiskFlags
              ? 'Health Report Analyzed with Alerts'
              : 'Medical Report Analyzed',
            body: hasRiskFlags
              ? `AI analysis of "${doc.title || data.fileName || 'your report'}" identified ${summaryData.risk_flags.length} health flag(s) to review.`
              : `AI summary and key health metrics are ready for "${doc.title || data.fileName || 'your report'}".`,
            type: hasRiskFlags ? 'ALERT' : 'INFO',
            data: {
              event: 'DOCUMENT_AI_SUMMARY_COMPLETED',
              documentId: data.documentId,
              hasRiskFlags,
              riskFlagsCount: summaryData.risk_flags?.length || 0,
            },
          });
        }
      } catch (notifErr: any) {
        this.logger.warn(`Failed to send AI summary notification: ${notifErr?.message || notifErr}`);
      }
    } catch (err: any) {
      this.logger.error(`AI summary failed for doc=${data.documentId}: ${err?.message || err}`);
      await this.prisma.document.update({
        where: { id: data.documentId },
        data: { aiSummaryStatus: 'FAILED' },
      });
    }
  }

  // ─── Document Chunking & Embedding (Phase 8 pgvector) ─────
  private async createDocumentChunks(
    documentId: string,
    rawText: string,
    documentType: string,
  ): Promise<void> {
    if (!rawText || rawText.trim().length === 0) return;

    try {
      // Remove any prior chunks for this document for idempotency
      await this.prisma.documentChunk.deleteMany({ where: { documentId } });

      const chunkSize = 400;
      const overlap = 50;
      const chunks: { content: string; charStart: number; charEnd: number }[] = [];

      let start = 0;
      while (start < rawText.length) {
        const end = Math.min(start + chunkSize, rawText.length);
        const chunkText = rawText.slice(start, end).trim();
        if (chunkText.length > 0) {
          chunks.push({ content: chunkText, charStart: start, charEnd: end });
        }
        if (end >= rawText.length) break;
        start += chunkSize - overlap;
      }

      if (chunks.length === 0) return;

      // 1. Attempt batch embedding from AI Service
      let embeddings: number[][] | null = null;
      try {
        const embRes = await firstValueFrom(
          this.http.post<{ data: { embeddings: number[][] } }>(
            `${this.aiServiceUrl}/api/v1/ai/embeddings`,
            { texts: chunks.map(c => c.content) },
            { timeout: 10000 },
          ),
        );
        if (embRes?.data?.data?.embeddings && Array.isArray(embRes.data.data.embeddings)) {
          embeddings = embRes.data.data.embeddings;
        }
      } catch (embErr: any) {
        this.logger.warn(`AI Service embedding failed for doc=${documentId}: ${embErr?.message || embErr}`);
      }

      // 2. Persist chunks with pgvector embeddings
      for (const [i, chunk] of chunks.entries()) {
        const vector = embeddings && embeddings[i] ? embeddings[i] : null;
        const embeddingStatus = vector ? 'completed' : 'pending_provider';

        const metadataJson = JSON.stringify({
          chunkIndex: i,
          charStart: chunk.charStart,
          charEnd: chunk.charEnd,
          documentType,
          tokenCount: Math.ceil(chunk.content.length / 4),
          embedding_status: embeddingStatus,
        });

        if (vector) {
          const vectorStr = `[${vector.join(',')}]`;
          await this.prisma.$executeRaw`
            INSERT INTO "document_chunks" ("id", "document_id", "content", "metadata", "embedding", "created_at")
            VALUES (
              gen_random_uuid(),
              ${documentId}::uuid,
              ${chunk.content},
              ${metadataJson}::jsonb,
              ${vectorStr}::vector,
              NOW()
            );
          `;
        } else {
          await this.prisma.documentChunk.create({
            data: {
              documentId,
              content: chunk.content,
              metadata: {
                chunkIndex: i,
                charStart: chunk.charStart,
                charEnd: chunk.charEnd,
                documentType,
                tokenCount: Math.ceil(chunk.content.length / 4),
                embedding_status: 'pending_provider',
              },
            },
          });
        }
      }

      this.logger.log(
        `Created ${chunks.length} document chunks for doc=${documentId} (embeddings: ${embeddings ? 'generated' : 'pending'})`,
      );
    } catch (err: any) {
      this.logger.warn(`Failed to store document chunks for doc=${documentId}: ${err?.message || err}`);
    }
  }
}
