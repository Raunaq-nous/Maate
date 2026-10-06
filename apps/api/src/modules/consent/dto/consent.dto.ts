import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ConsentPurpose {
  AI_SUMMARIZATION = 'AI_SUMMARIZATION',
  AI_CHAT = 'AI_CHAT',
  DATA_PROCESSING = 'DATA_PROCESSING',
  FAMILY_SHARING = 'FAMILY_SHARING',
  ANALYTICS = 'ANALYTICS',
}

export class GrantConsentDto {
  @ApiProperty({
    description: 'Specific purpose for data processing consent',
    example: 'AI_SUMMARIZATION',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  purpose!: string;

  @ApiPropertyOptional({
    description: 'Client IP address recorded at time of grant',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'User Agent recorded at time of grant',
    example: 'Maate-iOS/1.0.0',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;
}

export class RevokeConsentDto {
  @ApiProperty({
    description: 'Specific purpose to revoke consent for',
    example: 'AI_SUMMARIZATION',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  purpose!: string;
}
