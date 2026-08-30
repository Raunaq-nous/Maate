// ============================================
// Storage Service — S3/Supabase Object Storage
// Signed URLs, encryption, virus scanning hooks
// ============================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client, PutObjectCommand, GetObjectCommand,
  DeleteObjectCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomBytes } from 'crypto';

export interface UploadSignedUrlResult {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

export interface DownloadSignedUrlResult {
  downloadUrl: string;
  expiresIn: number;
}

export interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  checksum: string;
  encryptionKeyId?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly uploadExpiry: number;
  private readonly downloadExpiry: number;
  private readonly maxFileSizeBytes: number;

  // Allowed MIME types for medical documents
  private readonly ALLOWED_MIME_TYPES = new Set([
    // Documents
    'application/pdf',
    // Images
    'image/jpeg', 'image/png', 'image/webp', 'image/tiff',
    // DICOM
    'application/dicom', 'application/octet-stream',
    // Medical imaging
    'image/dicom-rle', 'image/jls',
  ]);

  private readonly ALLOWED_EXTENSIONS = new Set([
    '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif',
    '.dcm', '.dicom', '.nii', '.nii.gz',
  ]);

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get('S3_BUCKET', 'maate-medical-docs');
    this.uploadExpiry = parseInt(this.config.get('UPLOAD_URL_EXPIRY', '900')); // 15 min
    this.downloadExpiry = parseInt(this.config.get('DOWNLOAD_URL_EXPIRY', '3600')); // 1 hr
    this.maxFileSizeBytes = parseInt(this.config.get('MAX_FILE_SIZE_BYTES', '52428800')); // 50MB

    this.s3 = new S3Client({
      region: this.config.get('S3_REGION', 'ap-south-1'),
      endpoint: this.config.get('S3_ENDPOINT'), // Supabase/MinIO endpoint
      credentials: {
        accessKeyId: this.config.get('S3_ACCESS_KEY_ID', ''),
        secretAccessKey: this.config.get('S3_SECRET_ACCESS_KEY', ''),
      },
      forcePathStyle: !!this.config.get('S3_FORCE_PATH_STYLE'), // MinIO/Supabase
    });
  }

  // ─── Generate presigned upload URL ─────────
  async createUploadUrl(
    userId: string,
    fileName: string,
    contentType: string,
    fileSizeBytes: number,
  ): Promise<UploadSignedUrlResult> {
    // Validate
    this.validateFile(fileName, contentType, fileSizeBytes);

    // Build storage key: users/{userId}/documents/{year}/{month}/{uuid}_{sanitized_name}
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uniqueId = randomBytes(8).toString('hex');
    const sanitizedName = this.sanitizeFileName(fileName);
    const fileKey = `users/${userId}/documents/${year}/${month}/${uniqueId}_${sanitizedName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: contentType,
      ContentLength: fileSizeBytes,
      // Server-side encryption (when KMS key configured)
      ...(this.config.get('S3_KMS_KEY_ID')
        ? {
            ServerSideEncryption: 'aws:kms' as const,
            SSEKMSKeyId: this.config.get('S3_KMS_KEY_ID'),
          }
        : {}),
      // Metadata for audit
      Metadata: {
        'x-user-id': userId,
        'x-upload-timestamp': now.toISOString(),
        'x-original-name': fileName.slice(0, 200),
      },
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: this.uploadExpiry,
    });

    this.logger.log(`Upload URL generated: key=${fileKey} user=${userId}`);

    return {
      uploadUrl,
      fileKey,
      expiresIn: this.uploadExpiry,
    };
  }

  // ─── Generate presigned download URL ───────
  async createDownloadUrl(
    fileKey: string,
    originalName?: string,
  ): Promise<DownloadSignedUrlResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ResponseContentDisposition: originalName
        ? `attachment; filename="${encodeURIComponent(originalName)}"`
        : undefined,
    });
    const downloadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: this.downloadExpiry,
    });
    return { downloadUrl, expiresIn: this.downloadExpiry };
  }

  async getFileBuffer(fileKey: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });
    const response = await this.s3.send(command);
    if (!response.Body) throw new Error('Empty response body from S3');
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  // ─── Get file metadata from S3 ─────────────
  async getFileMetadata(fileKey: string): Promise<FileMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });
      const response = await this.s3.send(command);

      return {
        key: fileKey,
        size: response.ContentLength ?? 0,
        contentType: response.ContentType ?? 'application/octet-stream',
        checksum: response.ETag?.replace(/"/g, '') ?? '',
        encryptionKeyId: response.SSEKMSKeyId,
      };
    } catch {
      return null;
    }
  }

  // ─── Delete file from storage ──────────────
  async deleteFile(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });
    await this.s3.send(command);
    this.logger.log(`File deleted: ${fileKey}`);
  }

  // ─── Compute checksum of content ───────────
  computeChecksum(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  // ─── Validation ────────────────────────────
  private validateFile(
    fileName: string,
    contentType: string,
    fileSizeBytes: number,
  ): void {
    // Size check
    if (fileSizeBytes > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `File size ${(fileSizeBytes / 1048576).toFixed(1)}MB exceeds maximum ${(this.maxFileSizeBytes / 1048576).toFixed(0)}MB`,
      );
    }

    if (fileSizeBytes <= 0) {
      throw new BadRequestException('File cannot be empty');
    }

    // Extension check
    const ext = '.' + fileName.split('.').pop()?.toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `File type "${ext}" is not allowed. Accepted: ${[...this.ALLOWED_EXTENSIONS].join(', ')}`,
      );
    }

    // MIME type check
    if (!this.ALLOWED_MIME_TYPES.has(contentType)) {
      throw new BadRequestException(
        `Content type "${contentType}" is not allowed for medical documents`,
      );
    }
  }

  // ─── Sanitize file name ────────────────────
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/__+/g, '_')
      .slice(0, 100);
  }
}
