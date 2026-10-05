// ============================================
// TOTP Service — RFC 6238 Time-Based One-Time Password Engine
// Zero-dependency pure Node.js crypto implementation
// AES-256-GCM encryption for stored TOTP secrets
// Compatible with Google Authenticator, 1Password, Authy
// ============================================

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export interface TotpVerificationResult {
  isValid: boolean;
  step: number | null;
}

@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);
  private readonly encryptionKey: Buffer;

  constructor(@Optional() private readonly config?: ConfigService) {
    const rawKey = this.config?.get<string>('MFA_ENCRYPTION_KEY') || process.env['MFA_ENCRYPTION_KEY'];
    const isProduction = (this.config?.get<string>('NODE_ENV') || process.env['NODE_ENV']) === 'production';

    if (!rawKey) {
      if (isProduction) {
        throw new Error(
          'FATAL: MFA_ENCRYPTION_KEY must be set in production to a secure 256-bit key (e.g. openssl rand -base64 32)',
        );
      }
      // Deterministic dev/test fallback 32-byte key
      this.encryptionKey = crypto.createHash('sha256').update('maate-dev-mfa-encryption-fallback-key-32b').digest();
    } else {
      if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
        this.encryptionKey = Buffer.from(rawKey, 'hex');
      } else {
        const b64 = Buffer.from(rawKey, 'base64');
        if (b64.length === 32) {
          this.encryptionKey = b64;
        } else {
          this.encryptionKey = crypto.createHash('sha256').update(rawKey).digest();
        }
      }
    }
  }

  // ─── AES-256-GCM ENCRYPTION / DECRYPTION ───

  encryptSecret(plainSecret: string): string {
    const iv = crypto.randomBytes(12); // 96-bit IV standard for AES-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plainSecret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
  }

  decryptSecret(encryptedPayload: string): string {
    if (!encryptedPayload) return '';
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      // Legacy unencrypted plaintext fallback
      return encryptedPayload;
    }
    const [ivHex, tagHex, dataHex] = parts;
    if (!ivHex || !tagHex || !dataHex) {
      return encryptedPayload;
    }
    try {
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const data = Buffer.from(dataHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      return decipher.update(data, undefined, 'utf8') + decipher.final('utf8');
    } catch (err: any) {
      this.logger.warn(`Failed to decrypt MFA secret via AES-256-GCM: ${err?.message || err}. Returning as-is.`);
      return encryptedPayload;
    }
  }

  // ─── BASE32 ENCODING / DECODING ─────────────

  encodeBase32(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i]!;
      bits += 8;

      while (bits >= 5) {
        output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
  }

  decodeBase32(input: string): Buffer {
    const cleaned = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const idx = BASE32_ALPHABET.indexOf(cleaned[i]!);
      if (idx === -1) {
        throw new Error(`Invalid Base32 character: ${cleaned[i]}`);
      }
      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }

  // ─── TOTP GENERATION & VERIFICATION ─────────

  generateSecret(byteLength = 20): string {
    const randomBuffer = crypto.randomBytes(byteLength);
    return this.encodeBase32(randomBuffer);
  }

  generateTotpFromCounter(secretBase32: string, counter: number | bigint, digits = 6): string {
    const key = this.decodeBase32(secretBase32);
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter), 0);

    const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
    const offset = hmac[hmac.length - 1]! & 0x0f;
    const binary =
      ((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff);

    const modulo = Math.pow(10, digits);
    const otp = binary % modulo;
    return otp.toString().padStart(digits, '0');
  }

  generateTotp(secretBase32: string, timestampMs = Date.now(), stepSeconds = 30, digits = 6): string {
    const counter = Math.floor(timestampMs / 1000 / stepSeconds);
    return this.generateTotpFromCounter(secretBase32, counter, digits);
  }

  verifyTotp(
    token: string,
    secretBase32: string,
    window = 1,
    timestampMs = Date.now(),
    stepSeconds = 30,
  ): TotpVerificationResult {
    if (!token || !/^\d{6,8}$/.test(token)) {
      return { isValid: false, step: null };
    }

    try {
      const digits = token.length;
      const currentStep = Math.floor(timestampMs / 1000 / stepSeconds);

      // Check current, past (-window), and future (+window) time steps for drift tolerance
      for (let errorStep = -window; errorStep <= window; errorStep++) {
        const candidateStep = currentStep + errorStep;
        const candidate = this.generateTotpFromCounter(secretBase32, candidateStep, digits);
        if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(token))) {
          return { isValid: true, step: candidateStep };
        }
      }
      return { isValid: false, step: null };
    } catch (err: any) {
      this.logger.error(`Error verifying TOTP: ${err?.message || err}`);
      return { isValid: false, step: null };
    }
  }

  generateOtpAuthUri(email: string, secretBase32: string, issuer = 'Maate'): string {
    const label = encodeURIComponent(`${issuer}:${email}`);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  // ─── BACKUP RECOVERY CODES ──────────────────

  generateBackupCodes(count = 8): { raw: string[]; hashed: string[] } {
    const raw: string[] = [];
    const hashed: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars e.g. A1B2C3D4
      raw.push(code);
      const hash = crypto.createHash('sha256').update(code).digest('hex');
      hashed.push(hash);
    }

    return { raw, hashed };
  }

  verifyAndConsumeBackupCode(
    code: string,
    hashedCodes: string[],
  ): { isValid: boolean; remainingHashedCodes: string[] } {
    const candidateHash = crypto
      .createHash('sha256')
      .update(code.trim().toUpperCase())
      .digest('hex');

    const index = hashedCodes.findIndex((h) => h === candidateHash);
    if (index === -1) {
      return { isValid: false, remainingHashedCodes: hashedCodes };
    }

    const remaining = [...hashedCodes];
    remaining.splice(index, 1);
    return { isValid: true, remainingHashedCodes: remaining };
  }
}
