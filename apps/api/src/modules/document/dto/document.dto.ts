// ============================================
// Document DTOs — Upload & Management
// ============================================

import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentTypeEnum {
  LAB_REPORT = 'LAB_REPORT',
  PRESCRIPTION = 'PRESCRIPTION',
  DISCHARGE_SUMMARY = 'DISCHARGE_SUMMARY',
  IMAGING = 'IMAGING',
  INSURANCE = 'INSURANCE',
  VACCINATION = 'VACCINATION',
  DOCTOR_NOTE = 'DOCTOR_NOTE',
  REFERRAL = 'REFERRAL',
  CONSENT_FORM = 'CONSENT_FORM',
  OTHER = 'OTHER',
}

export class GetUploadUrlDto {
  @ApiProperty({ example: 'blood_test.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @ApiProperty({ example: 1024576, description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  @Max(52428800) // 50MB
  fileSizeBytes!: number;

  @ApiProperty({ enum: DocumentTypeEnum })
  @IsEnum(DocumentTypeEnum)
  documentType!: DocumentTypeEnum;
}

export class ConfirmUploadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileKey!: string;

  @ApiProperty({ enum: DocumentTypeEnum })
  @IsEnum(DocumentTypeEnum)
  documentType!: DocumentTypeEnum;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  providerName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  doctorName?: string;
}
