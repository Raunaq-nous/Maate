// ============================================
// Auth Controller — All Auth Endpoints
// Rate-limited, documented, validated
// ============================================

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Ip, Post, Headers, Req, Query, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import {
  SendOtpDto, VerifyOtpDto, RegisterDto, LoginDto, OAuthLoginDto,
  RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto,
  RegisterBiometricDto, BiometricLoginDto, RevokeSessionDto,
} from './dto/auth.dto';
import { Public, CurrentUser } from '../../common/auth/jwt-auth.guard';
import type { JwtPayload } from './services/token.service';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Email/Password ────────────────────────

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register with email and password' })
  async register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.authService.register(dto, { userAgent, ipAddress: ip });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.authService.loginWithPassword(dto, { userAgent, ipAddress: ip });
  }

  // ─── OTP ──────────────────────────────────

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Send OTP to phone or email' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify OTP and return tokens' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.authService.verifyOtp(dto, { userAgent, ipAddress: ip });
  }

  @Public()
  @Get('dev/last-otp')
  @ApiOperation({ summary: 'Development-only: Get the latest OTP for an email' })
  async getDevLastOtp(@Query('email') email: string) {
    if (process.env['NODE_ENV'] !== 'development') {
      throw new NotFoundException('Not found');
    }
    const otp = await this.authService.getDevLastOtp(email);
    return { otp };
  }

  // ─── OAuth ────────────────────────────────

  @Public()
  @Post('oauth')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login/register with Google or Apple' })
  async oauthLogin(
    @Body() dto: OAuthLoginDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.authService.oauthLogin(dto, { userAgent, ipAddress: ip });
  }

  // ─── Biometric ────────────────────────────

  @Post('biometric/register')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register device for biometric login' })
  async registerBiometric(
    @CurrentUser('sub') userId: string,
    @Body() dto: RegisterBiometricDto,
  ) {
    return this.authService.registerBiometric(userId, dto);
  }

  @Public()
  @Post('biometric/login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with biometric signature' })
  async biometricLogin(
    @Body() dto: BiometricLoginDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.authService.biometricLogin(dto, { userAgent, ipAddress: ip });
  }

  // ─── Token Management ────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.authService.refreshToken(dto.refreshToken, { userAgent, ipAddress: ip });
  }

  // ─── Password Management ─────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string) {
    return this.authService.forgotPassword(dto.email, ip);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (authenticated)' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  // ─── Session Management ──────────────────

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active sessions' })
  async getSessions(@CurrentUser('sub') userId: string) {
    return this.authService.getSessions(userId);
  }

  @Post('sessions/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(
    @CurrentUser('sub') userId: string,
    @Body() dto: RevokeSessionDto,
  ) {
    return this.authService.revokeSession(userId, dto.sessionId);
  }

  // ─── Logout ──────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  async logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.sub, user.sessionId);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions' })
  async logoutAll(@CurrentUser('sub') userId: string) {
    return this.authService.logoutAll(userId);
  }

  // ─── Account ─────────────────────────────

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete account (GDPR/DPDP compliance)' })
  async deleteAccount(@CurrentUser() user: JwtPayload) {
    return this.authService.deleteAccount(user.sub);
  }
}
