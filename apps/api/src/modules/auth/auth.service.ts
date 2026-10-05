// ============================================
// Auth Service — Full Business Logic
// Email/password, OTP, OAuth, biometric, sessions
// ============================================

import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../common/database/database.module';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { OAuthService } from './services/oauth.service';
import { MailService } from '../notification/mail.service';
import { TotpService } from './services/totp.service';
import { EnableMfaDto, VerifyMfaDto, DisableMfaDto } from './dto/mfa.dto';
import { Prisma } from '@maate/database';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly oauthService: OAuthService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly totpService: TotpService,
  ) {}

  // ─── EMAIL/PASSWORD REGISTER ───────────────
  async register(dto: { email: string; password: string; fullName: string; phone?: string }, meta?: { userAgent?: string; ipAddress?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    if (dto.phone) {
      const phoneExists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (phoneExists) throw new ConflictException('Phone number already in use');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        fullName: dto.fullName,
        loginCount: 1,
        lastLoginAt: new Date(),
      },
    });

    const session = await this.prisma.userSession.create({
      data: { userId: user.id, userAgent: meta?.userAgent, ipAddress: meta?.ipAddress },
    });

    const tokens = await this.tokenService.generateTokenPair(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      { userAgent: meta?.userAgent, ipAddress: meta?.ipAddress, sessionId: session.id },
    );

    this.logger.log(`New user registered: ${user.id}`);

    if (user.email) {
      const otp = await this.otpService.generate(user.email);
      this.logger.log(`[Registration] OTP generated for ${user.email}: ${otp}`);

      await this.mailService.sendMail(
        user.email,
        'Verify your Maate account',
        `Welcome to Maate Health! Your verification code is: ${otp}. This code is valid for 5 minutes.`,
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-bottom: 8px;">Verify your Maate account</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">Welcome to Maate Health. Please use the following 6-digit verification code to complete your registration:</p>
          <div style="display: inline-block; padding: 12px 24px; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1e40af; background-color: #eff6ff; border-radius: 8px; margin-bottom: 24px;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 14px; margin-top: 0; margin-bottom: 16px;">This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2026 Maate Health. HIPAA & DPDP Compliant.</p>
        </div>
        `
      );
    }

    await this.logAudit(user.id, 'REGISTER', 'user', user.id, meta?.ipAddress, meta?.userAgent);

    return { user: this.sanitizeUser(user), ...tokens, isNewUser: true };
  }

  // ─── EMAIL/PASSWORD LOGIN ──────────────────
  async loginWithPassword(dto: { email: string; password: string; deviceName?: string; deviceOS?: string }, meta?: { userAgent?: string; ipAddress?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Check lockout
    await this.passwordService.checkLockout(user.id);

    const isValid = await this.passwordService.verify(dto.password, user.passwordHash);
    if (!isValid) {
      await this.passwordService.recordFailedAttempt(user.id);
      await this.logAudit(user.id, 'LOGIN_FAILED', 'auth', null, meta?.ipAddress, meta?.userAgent);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed attempts on success
    await this.passwordService.resetFailedAttempts(user.id);

    // Check if MFA is enabled (Step 3: Two-Factor Authentication)
    if (this.prisma.userMfa) {
      const userMfa = await this.prisma.userMfa.findUnique({
        where: { userId: user.id },
      });

      if (userMfa && userMfa.isEnabled && userMfa.type === 'TOTP') {
        const mfaToken = await this.jwtService.signAsync(
          { sub: user.id, email: user.email, scope: 'mfa_challenge' },
          { expiresIn: '5m' },
        );
        await this.logAudit(user.id, 'MFA_CHALLENGE_ISSUED', 'auth', null, meta?.ipAddress, meta?.userAgent);
        return {
          mfaRequired: true,
          mfaToken,
          mfaType: 'TOTP',
        };
      }
    }

    // Update login tracking
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });

    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        deviceName: dto.deviceName,
        deviceOS: dto.deviceOS,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
    });

    const tokens = await this.tokenService.generateTokenPair(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      { userAgent: meta?.userAgent, ipAddress: meta?.ipAddress, sessionId: session.id },
    );

    await this.logAudit(user.id, 'LOGIN', 'auth', session.id, meta?.ipAddress, meta?.userAgent);

    return { user: this.sanitizeUser(user), ...tokens, isNewUser: false };
  }

  // ─── OTP FLOW ──────────────────────────────
  async sendOtp(dto: { phone?: string; email?: string }) {
    const identifier = dto.phone || dto.email;
    if (!identifier) throw new UnauthorizedException('Phone or email is required');

    const otp = await this.otpService.generate(identifier);
    this.logger.log(`OTP generated for ${identifier}: ${otp}`);

    if (dto.email) {
      await this.mailService.sendMail(
        dto.email,
        'Your Maate Verification Code',
        `Your Maate verification code is: ${otp}. This code is valid for 5 minutes.`,
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-bottom: 8px;">Your Verification Code</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">Please use the following 6-digit verification code to sign in or verify your account:</p>
          <div style="display: inline-block; padding: 12px 24px; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1e40af; background-color: #eff6ff; border-radius: 8px; margin-bottom: 24px;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 14px; margin-top: 0; margin-bottom: 16px;">This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2026 Maate Health. HIPAA & DPDP Compliant.</p>
        </div>
        `
      );
    } else {
      // TODO: Send via Twilio SMS
    }

    return { message: 'OTP sent successfully', expiresIn: 300 };
  }

  async getDevLastOtp(email: string): Promise<string | null> {
    return this.otpService.getOtpForDev(email);
  }

  async verifyOtp(dto: { phone?: string; email?: string; otp: string }, meta?: { userAgent?: string; ipAddress?: string }) {
    const identifier = dto.phone || dto.email;
    if (!identifier) throw new UnauthorizedException('Phone or email is required');

    const isValid = await this.otpService.verify(identifier, dto.otp);
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP');

    let user = await this.prisma.user.findFirst({
      where: dto.phone ? { phone: dto.phone } : { email: dto.email },
    });

    const isNewUser = !user;

    if (!user) {
      user = await this.prisma.user.create({
        data: { phone: dto.phone, email: dto.email, fullName: dto.phone || dto.email || 'New User' },
      });
      this.logger.log(`New user created via OTP: ${user.id}`);
    }

    user = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
        ...(dto.email ? { isEmailVerified: true } : {}),
        ...(dto.phone ? { isPhoneVerified: true } : {}),
      },
    });

    const session = await this.prisma.userSession.create({
      data: { userId: user.id, userAgent: meta?.userAgent, ipAddress: meta?.ipAddress },
    });

    const tokens = await this.tokenService.generateTokenPair(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      { userAgent: meta?.userAgent, ipAddress: meta?.ipAddress, sessionId: session.id },
    );

    return { user: this.sanitizeUser(user), ...tokens, isNewUser };
  }

  // ─── OAUTH FLOW ────────────────────────────
  async oauthLogin(dto: { provider: 'google' | 'apple'; idToken: string; fullName?: string; deviceName?: string }, meta?: { userAgent?: string; ipAddress?: string }) {
    return this.oauthService.loginOrRegister(dto.provider, dto.idToken, {
      fullName: dto.fullName,
      deviceName: dto.deviceName,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    });
  }

  // ─── BIOMETRIC REGISTRATION ────────────────
  async registerBiometric(userId: string, dto: { biometricKey: string; deviceName?: string }) {
    const session = await this.prisma.userSession.create({
      data: {
        userId,
        biometricKey: dto.biometricKey,
        deviceName: dto.deviceName,
        isActive: true,
      },
    });

    this.logger.log(`Biometric registered for user ${userId}, session ${session.id}`);
    return { sessionId: session.id, message: 'Biometric registered successfully' };
  }

  // ─── BIOMETRIC LOGIN ──────────────────────
  async biometricLogin(dto: { sessionId: string; signature: string }, meta?: { userAgent?: string; ipAddress?: string }) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: dto.sessionId },
      include: { user: true },
    });

    if (!session || !session.isActive || !session.biometricKey) {
      throw new UnauthorizedException('Invalid biometric session');
    }

    // In production: verify signature against stored public key
    // For now: verify session exists and is active
    if (!session.user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    await this.prisma.user.update({
      where: { id: session.userId },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });

    const tokens = await this.tokenService.generateTokenPair(
      { id: session.user.id, email: session.user.email, phone: session.user.phone, role: session.user.role },
      { userAgent: meta?.userAgent, ipAddress: meta?.ipAddress, sessionId: session.id },
    );

    return { user: this.sanitizeUser(session.user), ...tokens };
  }

  // ─── PASSWORD RESET FLOW ──────────────────
  async forgotPassword(email: string, ipAddress?: string) {
    const token = await this.passwordService.createResetToken(email, ipAddress);
    // Always return success to prevent email enumeration
    // TODO: Send email with reset link containing token
    if (token) {
      this.logger.log(`Password reset token generated for ${email}`);
    }
    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    await this.passwordService.resetPassword(token, newPassword);
    return { message: 'Password reset successfully. Please log in.' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    await this.passwordService.changePassword(userId, currentPassword, newPassword);
    return { message: 'Password changed. All other sessions have been revoked.' };
  }

  // ─── TOKEN MANAGEMENT ─────────────────────
  async refreshToken(refreshToken: string, meta?: { userAgent?: string; ipAddress?: string }) {
    return this.tokenService.refreshAccessToken(refreshToken, meta);
  }

  // ─── SESSION MANAGEMENT ────────────────────
  async getSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true, deviceName: true, deviceOS: true, ipAddress: true,
        lastActiveAt: true, biometricKey: false, createdAt: true,
      },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new BadRequestException('Session not found');

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
    return { message: 'Session revoked' };
  }

  // ─── LOGOUT ────────────────────────────────
  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.prisma.userSession.updateMany({
        where: { id: sessionId, userId },
        data: { isActive: false },
      });
    }
    await this.tokenService.revokeAllTokens(userId);
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId }, data: { isActive: false },
    });
    await this.tokenService.revokeAllTokens(userId);
    return { message: 'All sessions revoked' };
  }

  // ─── MFA (TOTP) MANAGEMENT ────────────────
  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const plainSecret = this.totpService.generateSecret();
    const encryptedSecret = this.totpService.encryptSecret(plainSecret);
    const { raw, hashed } = this.totpService.generateBackupCodes(8);
    const otpAuthUrl = this.totpService.generateOtpAuthUri(user.email || user.id, plainSecret);

    await this.prisma.userMfa.upsert({
      where: { userId },
      create: {
        userId,
        type: 'TOTP',
        secret: encryptedSecret,
        backupCodes: hashed,
        isEnabled: false,
        lastUsedStep: null,
      },
      update: {
        type: 'TOTP',
        secret: encryptedSecret,
        backupCodes: hashed,
        isEnabled: false,
        lastUsedStep: null,
      },
    });

    await this.logAudit(userId, 'MFA_SETUP_INITIATED', 'user_mfa', null);
    return {
      secret: plainSecret,
      otpAuthUrl,
      backupCodes: raw,
    };
  }

  async enableMfa(userId: string, dto: EnableMfaDto) {
    const userMfa = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!userMfa || !userMfa.secret) {
      throw new BadRequestException('MFA setup has not been initiated. Call /auth/mfa/setup first.');
    }

    const plainSecret = this.totpService.decryptSecret(userMfa.secret);
    const result = this.totpService.verifyTotp(dto.code, plainSecret);
    if (!result.isValid || result.step === null) {
      throw new BadRequestException('Invalid verification code. Please check your authenticator app.');
    }

    if (userMfa.lastUsedStep !== null && userMfa.lastUsedStep !== undefined && userMfa.lastUsedStep >= result.step) {
      throw new BadRequestException('TOTP code has already been used. Please wait for the next time-step.');
    }

    await this.prisma.userMfa.update({
      where: { userId },
      data: {
        isEnabled: true,
        verifiedAt: new Date(),
        lastUsedStep: result.step,
      },
    });

    await this.logAudit(userId, 'MFA_ENABLED', 'user_mfa', userMfa.id);
    return { message: 'Two-factor authentication successfully enabled' };
  }

  async verifyMfaLogin(dto: VerifyMfaDto, meta?: { userAgent?: string; ipAddress?: string }) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(dto.mfaToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA token');
    }

    if (payload.scope !== 'mfa_challenge' || !payload.sub) {
      throw new UnauthorizedException('Invalid MFA token scope');
    }

    const userId = payload.sub;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account not found or disabled');
    }

    const userMfa = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!userMfa || !userMfa.isEnabled || !userMfa.secret) {
      throw new UnauthorizedException('Two-factor authentication is not active for this account');
    }

    // Try TOTP code first
    const plainSecret = this.totpService.decryptSecret(userMfa.secret);
    const totpResult = this.totpService.verifyTotp(dto.code, plainSecret);
    if (totpResult.isValid && totpResult.step !== null) {
      // Replay check: reject reuse of the same TOTP within the current time step
      if (userMfa.lastUsedStep !== null && userMfa.lastUsedStep !== undefined && userMfa.lastUsedStep >= totpResult.step) {
        await this.logAudit(userId, 'MFA_REPLAY_REJECTED', 'user_mfa', userMfa.id, meta?.ipAddress, meta?.userAgent);
        throw new BadRequestException('TOTP code has already been used. Please wait for the next 30-second time-step.');
      }

      await this.prisma.userMfa.update({
        where: { userId },
        data: { lastUsedStep: totpResult.step },
      });
    } else {
      // Try backup code
      const backupResult = this.totpService.verifyAndConsumeBackupCode(dto.code, userMfa.backupCodes);
      if (!backupResult.isValid) {
        await this.logAudit(userId, 'MFA_VERIFY_FAILED', 'auth', null, meta?.ipAddress, meta?.userAgent);
        throw new UnauthorizedException('Invalid MFA code or backup code');
      }

      // Update remaining backup codes
      await this.prisma.userMfa.update({
        where: { userId },
        data: { backupCodes: backupResult.remainingHashedCodes },
      });
      await this.logAudit(userId, 'MFA_BACKUP_CODE_USED', 'user_mfa', userMfa.id, meta?.ipAddress, meta?.userAgent);
    }

    // Update login tracking
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });

    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        deviceName: dto.deviceName,
        deviceOS: dto.deviceOS,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
    });

    const tokens = await this.tokenService.generateTokenPair(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      { userAgent: meta?.userAgent, ipAddress: meta?.ipAddress, sessionId: session.id },
    );

    await this.logAudit(user.id, 'LOGIN_MFA_SUCCESS', 'auth', session.id, meta?.ipAddress, meta?.userAgent);
    return { user: this.sanitizeUser(user), ...tokens, isNewUser: false };
  }

  async disableMfa(userId: string, dto: DisableMfaDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = await this.passwordService.verify(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    await this.prisma.userMfa.update({
      where: { userId },
      data: { isEnabled: false },
    });

    await this.logAudit(userId, 'MFA_DISABLED', 'user_mfa', null);
    return { message: 'Two-factor authentication disabled' };
  }

  async getMfaStatus(userId: string) {
    const userMfa = await this.prisma.userMfa.findUnique({ where: { userId } });
    return {
      isEnabled: !!userMfa?.isEnabled,
      type: userMfa?.type || 'NONE',
      verifiedAt: userMfa?.verifiedAt || null,
      backupCodesRemaining: userMfa?.backupCodes ? userMfa.backupCodes.length : 0,
    };
  }

  // ─── ACCOUNT DELETION (DPDP / HIPAA Soft-Delete & Clinical Scrubbing) ─────
  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // 1. Scrub Documents & related extracts
    const documents = await this.prisma.document.findMany({
      where: { userId },
      select: { id: true },
    });
    const docIds = documents.map((d) => d.id);
    if (docIds.length > 0) {
      await this.prisma.documentChunk.deleteMany({ where: { documentId: { in: docIds } } });
      await this.prisma.ocrResult.deleteMany({ where: { documentId: { in: docIds } } });
      await this.prisma.aiSummary.deleteMany({ where: { documentId: { in: docIds } } });
      await this.prisma.document.deleteMany({ where: { id: { in: docIds } } });
    }

    // 2. Scrub AI Chat sessions & messages
    const chatSessions = await this.prisma.chatSession.findMany({
      where: { userId },
      select: { id: true },
    });
    const chatSessionIds = chatSessions.map((s) => s.id);
    if (chatSessionIds.length > 0) {
      await this.prisma.chatMessage.deleteMany({ where: { sessionId: { in: chatSessionIds } } });
      await this.prisma.chatSession.deleteMany({ where: { id: { in: chatSessionIds } } });
    }

    // 3. Scrub Clinical Records & Data Consents
    await this.prisma.timelineEvent.deleteMany({ where: { userId } });
    await this.prisma.vitalSign.deleteMany({ where: { userId } });
    await this.prisma.symptomEntry.deleteMany({ where: { userId } });
    await this.prisma.chronicCondition.deleteMany({ where: { userId } });
    await this.prisma.medication.deleteMany({ where: { userId } });
    await this.prisma.doctorNote.deleteMany({ where: { patientId: userId } });
    await this.prisma.mealReminder.deleteMany({ where: { userId } });
    await this.prisma.medicineReminder.deleteMany({ where: { userId } });
    await this.prisma.waterReminder.deleteMany({ where: { userId } });
    await this.prisma.notification.deleteMany({ where: { userId } });
    await this.prisma.doctorShare.deleteMany({ where: { userId } });
    await this.prisma.familyMember.deleteMany({ where: { userId } });
    await this.prisma.dataConsent.deleteMany({ where: { userId } });
    await this.prisma.dataExportRequest.deleteMany({ where: { userId } });
    await this.prisma.userMfa.deleteMany({ where: { userId } });

    // 4. Anonymize user record
    const anonymizedEmail = `deleted-${userId.substring(0, 8)}@maate.internal`;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: 'Deleted User',
        email: anonymizedEmail,
        phone: null,
        emergencyContact: null,
        allergiesJson: Prisma.DbNull,
        avatarUrl: null,
        fcmToken: null,
        apnsToken: null,
        isActive: false,
        deletedAt: new Date(),
      },
    });

    await this.prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    await this.tokenService.revokeAllTokens(userId);
    await this.logAudit(userId, 'ACCOUNT_ERASURE', 'user', userId);
    this.logger.warn(`Account soft-deleted, anonymized and clinical PHI erased: ${userId}`);
    return { message: 'Account deleted and personal clinical data erased successfully' };
  }

  // ─── HELPERS ──────────────────────────────
  private sanitizeUser(user: any) {
    const { passwordHash, failedAttempts, lockedUntil, fcmToken, apnsToken, ...safe } = user;
    return safe;
  }

  private async logAudit(userId: string | null, action: string, resource: string, resourceId: string | null, ipAddress?: string, userAgent?: string) {
    await this.prisma.auditLog.create({
      data: { userId, action, resource, resourceId, ipAddress, userAgent },
    }).catch((err) => this.logger.error('Audit log failed', err));
  }
}
