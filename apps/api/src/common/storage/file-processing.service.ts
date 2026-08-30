// ============================================
// File Processing Queue — Virus scan, OCR, AI
// BullMQ-based async pipeline
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface FileProcessingJob {
  documentId: string;
  userId: string;
  fileKey: string;
  contentType: string;
  fileName: string;
  documentType?: string;
  pipeline: ('virus_scan' | 'ocr' | 'ai_summary')[];
}

@Injectable()
export class FileProcessingService {
  private readonly logger = new Logger(FileProcessingService.name);

  constructor(
    @InjectQueue('document-processing') private readonly processingQueue: Queue<FileProcessingJob>,
  ) {}

  // ─── Enqueue file for BullMQ processing ────
  async enqueue(job: FileProcessingJob): Promise<void> {
    this.logger.log(
      `Enqueuing document processing job: doc=${job.documentId} type=${job.documentType || 'unknown'} pipeline=${job.pipeline.join(',')}`,
    );

    await this.processingQueue.add('process-document', job, {
      jobId: `doc-${job.documentId}`,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: false,
    });
  }

  // ─── Query job status from Bull queue ──────
  async getJob(documentId: string) {
    return this.processingQueue.getJob(`doc-${documentId}`);
  }

  async getQueueStatus() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.processingQueue.getWaitingCount(),
      this.processingQueue.getActiveCount(),
      this.processingQueue.getCompletedCount(),
      this.processingQueue.getFailedCount(),
      this.processingQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}
