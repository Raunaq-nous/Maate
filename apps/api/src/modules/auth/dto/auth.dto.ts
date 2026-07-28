// ============================================
// Auth DTOs — Full Validation Suite
// email/password, OAuth, OTP, password reset
// ============================================

import {
  IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString,
  IsStrongPassword, Length, Matches, MaxLength, MinLength, ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── OTP Flow ──────────────────────────────

export class SendOtpDto {
  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class VerifyOtpDto {
  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp!: string;
}

// ─── Email/Password Flow ───────────────────

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecureP@ss123' })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password!: string;

  @ApiProperty({ example: 'Priya Sharma' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecureP@ss123' })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiPropertyOptional({ description: 'Device name for session tracking', example: 'iPhone 15 Pro' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;

  @ApiPropertyOptional({ example: 'iOS 18.2' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  deviceOS?: string;
}

// ─── OAuth Flow ────────────────────────────

export class OAuthLoginDto {
  @ApiProperty({ enum: ['google', 'apple'], example: 'google' })
  @IsEnum(['google', 'apple'])
  provider!: 'google' | 'apple';

  @ApiProperty({ description: 'OAuth ID token from provider' })
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @ApiPropertyOptional({ description: 'Apple-only: authorization code' })
  @IsOptional()
  @IsString()
  authorizationCode?: string;

  @ApiPropertyOptional({ description: 'Apple-only: full name on first sign-in' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: 'iPhone 15 Pro' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

// ─── Token Management ──────────────────────

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

// ─── Password Reset ────────────────────────

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token from email' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'NewSecureP@ss456' })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  newPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({ example: 'NewSecureP@ss456' })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  newPassword!: string;
}

// ─── Biometric ─────────────────────────────

export class RegisterBiometricDto {
  @ApiProperty({ description: 'Public key from device biometric enrollment' })
  @IsString()
  @IsNotEmpty()
  biometricKey!: string;

  @ApiPropertyOptional({ example: 'iPhone 15 Pro' })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class BiometricLoginDto {
  @ApiProperty({ description: 'Biometric challenge signature' })
  @IsString()
  @IsNotEmpty()
  signature!: string;

  @ApiProperty({ description: 'Session ID from biometric registration' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}

// ─── Session ───────────────────────────────

export class RevokeSessionDto {
  @ApiProperty({ description: 'Session ID to revoke' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}
