// ============================================
// MFA DTOs — Two-Factor Authentication (TOTP & Backup Codes)
// ============================================

import { IsString, IsNotEmpty, Length, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnableMfaDto {
  @ApiProperty({
    description: '6-digit verification code from authenticator app to confirm setup',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;
}

export class VerifyMfaDto {
  @ApiProperty({
    description: 'Temporary MFA challenge token received during initial password login',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  mfaToken!: string;

  @ApiProperty({
    description: '6-digit TOTP code or 8-character backup recovery code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({
    description: 'Device name for session registration',
    example: 'iPhone 15 Pro',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'Device OS for session registration',
    example: 'iOS 17.4',
  })
  @IsOptional()
  @IsString()
  deviceOS?: string;
}

export class DisableMfaDto {
  @ApiProperty({
    description: 'Account password required to authorize disabling MFA',
    example: 'CurrentPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    description: 'Current 6-digit TOTP code for extra confirmation',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  code?: string;
}
