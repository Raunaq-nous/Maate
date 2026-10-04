// ============================================
// Compliance DTOs — Data Export & Erasure (DPDP & HIPAA)
// ============================================

import { IsString, IsOptional, MaxLength, MinLength, Equals, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestExportDto {
  @ApiPropertyOptional({
    description: 'Export format (json or fhir)',
    default: 'json',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  format?: string;
}

export class DataErasureDto {
  @ApiProperty({
    description: 'Explicit confirmation string to prevent accidental erasure',
    example: 'DELETE MY ACCOUNT',
  })
  @IsString()
  @IsNotEmpty()
  @Equals('DELETE MY ACCOUNT', {
    message: 'confirmation must exactly match "DELETE MY ACCOUNT"',
  })
  confirmation!: string;

  @ApiProperty({
    description: 'Current account password for re-authentication before erasure',
    example: 'SecurePassword123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
