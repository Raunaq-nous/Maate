import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { DocumentProcessor } from '../../common/storage/document.processor';
import { StorageService } from '../../common/storage/storage.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../../common/database/database.module';

describe('DocumentProcessor (BullMQ OCR & AI Summarization Pipeline)', () => {
  let processor: DocumentProcessor;
  let prisma: any;
  let storage: any;
  let http: any;
  let notificationService: any;

  beforeEach(async () => {
    prisma = {
      fileUpload: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      document: {
        update: jest.fn().mockResolvedValue({ id: 'doc-1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'doc-1', userId: 'user-1', title: 'Metabolic Panel' }),
      },
      ocrResult: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ocr-1',
          documentId: 'doc-1',
          rawText: 'Fasting Blood Glucose 95 mg/dL',
          structuredData: {},
        }),
        upsert: jest.fn().mockResolvedValue({ id: 'ocr-1', documentId: 'doc-1' }),
        create: jest.fn().mockResolvedValue({ id: 'ocr-1', documentId: 'doc-1' }),
      },
      aiSummary: {
        upsert: jest.fn().mockResolvedValue({ id: 'sum-1', documentId: 'doc-1' }),
        create: jest.fn().mockResolvedValue({ id: 'sum-1', documentId: 'doc-1' }),
      },
      documentChunk: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    };

    storage = {
      getFileBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image-bytes')),
    };

    http = {
      post: jest.fn(),
    };

    notificationService = {
      sendPushNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    const configService = {
      get: jest.fn((key: string, defVal?: string) => defVal),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: HttpService, useValue: http },
        { provide: NotificationService, useValue: notificationService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    processor = module.get<DocumentProcessor>(DocumentProcessor);
  });

  describe('handleProcess & Pipeline Execution', () => {
    it('should correctly propagate normalized document_type and complete OCR & AI summary', async () => {
      const mockJob: any = {
        id: 'job-1',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          documentId: 'doc-1',
          userId: 'user-1',
          fileKey: 'uploads/test.png',
          fileName: 'test.png',
          contentType: 'image/png',
          documentType: 'LAB_REPORT',
          pipeline: ['virus_scan', 'ocr', 'ai_summary'],
        },
      };

      // Mock OCR response
      const ocrResponse: AxiosResponse = {
        data: {
          data: {
            status: 'success',
            raw_text: 'Fasting Blood Glucose 95 mg/dL',
            confidence_score: 0.98,
            engine_used: 'tesseract',
            structured_data: { parameters: [{ name: 'Glucose', value: '95', unit: 'mg/dL' }] },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Mock AI summarize response (Normal report, 0 risk flags)
      const summaryResponse: AxiosResponse = {
        data: {
          data: {
            status: 'success',
            summary_text: 'All parameters are within normal limits.',
            layperson_summary: 'Your blood test looks great.',
            key_findings: ['Normal blood glucose'],
            risk_flags: [],
            recommendations: ['Maintain balanced diet'],
            model_used: 'openai/gpt-oss-120b',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Mock Embedding response
      const embedResponse: AxiosResponse = {
        data: {
          data: {
            status: 'success',
            embeddings: [[0.12, 0.34, -0.56]],
            dimensions: 384,
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      http.post.mockImplementation((url: string) => {
        if (url.includes('/ocr/upload')) return of(ocrResponse);
        if (url.includes('/ai/summarize')) return of(summaryResponse);
        if (url.includes('/ai/embed')) return of(embedResponse);
        return of({ data: { data: {} } });
      });

      await processor.handleProcess(mockJob);

      // Verify virus scan
      expect(prisma.fileUpload.updateMany).toHaveBeenCalledWith({
        where: { storedPath: 'uploads/test.png' },
        data: { scanStatus: 'COMPLETED', scanResult: 'CLEAN' },
      });

      // Verify OCR status transitions
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { ocrStatus: 'PROCESSING' },
      });
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { ocrStatus: 'COMPLETED' },
      });

      // Verify AI summary completed
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { aiSummaryStatus: 'COMPLETED' },
      });

      // Normal report notification stays at INFO
      expect(notificationService.sendPushNotification).toHaveBeenCalledWith('user-1', expect.objectContaining({
        type: 'INFO',
        title: 'Medical Report Analyzed',
      }));
    });

    it('should escalate notification to ALERT when AI summary identifies critical risk flags', async () => {
      const mockJob: any = {
        id: 'job-critical',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          documentId: 'doc-crit',
          userId: 'user-1',
          fileKey: 'uploads/crit.png',
          fileName: 'crit.png',
          contentType: 'image/png',
          documentType: 'LAB_REPORT',
          pipeline: ['ocr', 'ai_summary'],
        },
      };

      prisma.document.findUnique.mockResolvedValue({ id: 'doc-crit', userId: 'user-1', title: 'Critical Panel' });
      prisma.ocrResult.findUnique.mockResolvedValue({
        id: 'ocr-crit',
        documentId: 'doc-crit',
        rawText: 'Fasting Blood Glucose 295 mg/dL\nHbA1c 11.8%',
        structuredData: {},
      });

      http.post.mockImplementation((url: string) => {
        if (url.includes('/ocr/upload')) {
          return of({
            data: {
              data: {
                status: 'success',
                raw_text: 'Fasting Blood Glucose 295 mg/dL\nHbA1c 11.8%',
                confidence_score: 0.95,
                engine_used: 'tesseract',
                structured_data: {},
              },
            },
          });
        }
        if (url.includes('/ai/summarize')) {
          return of({
            data: {
              data: {
                status: 'success',
                summary_text: 'Severe hyperglycemia detected.',
                risk_flags: [
                  { severity: 'critical', parameter: 'Fasting Blood Glucose', value: '295' },
                  { severity: 'critical', parameter: 'HbA1c', value: '11.8%' },
                ],
                recommendations: ['Consult endocrinologist immediately'],
              },
            },
          });
        }
        return of({ data: { data: { embeddings: [[0.1, 0.2]] } } });
      });

      await processor.handleProcess(mockJob);

      // Verify ALERT severity escalation
      expect(notificationService.sendPushNotification).toHaveBeenCalledWith('user-1', expect.objectContaining({
        type: 'ALERT',
        title: 'Health Report: Attention Needed',
        body: expect.stringContaining('2 health flag(s)'),
      }));
    });

    it('should send actionable re-upload ALERT notification on permanent OCR failure (422)', async () => {
      const mockJob: any = {
        id: 'job-fail',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          documentId: 'doc-corrupt',
          userId: 'user-1',
          fileKey: 'uploads/corrupt.png',
          fileName: 'corrupt.png',
          contentType: 'image/png',
          documentType: 'LAB_REPORT',
          pipeline: ['ocr'],
        },
      };

      prisma.document.findUnique.mockResolvedValue({ id: 'doc-corrupt', userId: 'user-1', title: 'Corrupted Lab Scan' });

      // Mock OCR HTTP 422 error
      http.post.mockReturnValue(throwError(() => ({
        response: { status: 422, data: { message: 'Unreadable image format' } },
        message: 'Request failed with status code 422',
      })));

      await processor.handleProcess(mockJob);

      // Verify document status marked as FAILED
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-corrupt' },
        data: { ocrStatus: 'FAILED' },
      });

      // Verify actionable re-upload ALERT notification sent
      expect(notificationService.sendPushNotification).toHaveBeenCalledWith('user-1', expect.objectContaining({
        type: 'ALERT',
        title: 'Document Processing Incomplete',
        body: expect.stringContaining('re-upload'),
      }));
    });

    it('should withhold AI summary when user consent for AI_SUMMARIZATION is withdrawn', async () => {
      const mockJob: any = {
        id: 'job-consent-withdrawn',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          documentId: 'doc-no-consent',
          userId: 'user-no-consent',
          fileKey: 'uploads/report.pdf',
          fileName: 'report.pdf',
          contentType: 'application/pdf',
          documentType: 'LAB_REPORT',
          pipeline: ['ai_summary'],
        },
      };

      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-no-consent',
        userId: 'user-no-consent',
        title: 'Blood Panel',
      });

      // User has explicitly withdrawn consent
      prisma.dataConsent = {
        findFirst: jest.fn().mockResolvedValue({
          id: 'consent-1',
          userId: 'user-no-consent',
          purpose: 'AI_SUMMARIZATION',
          isGranted: false,
          withdrawnAt: new Date(),
        }),
      };

      await processor.handleProcess(mockJob);

      // Verify AI service was NEVER called
      expect(http.post).not.toHaveBeenCalled();

      // Verify document summary marked WITHHELD
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-no-consent' },
        data: { aiSummaryStatus: 'WITHHELD' },
      });
    });
  });
});

