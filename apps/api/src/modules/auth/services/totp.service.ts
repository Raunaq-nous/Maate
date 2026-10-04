// ============================================
// TOTP Service — RFC 6238 Time-Based One-Time Password Engine
// Zero-dependency pure Node.js crypto implementation
// Compatible with Google Authenticator, 1Password, Authy
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);

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

  generateTotp(secretBase32: string, timestampMs = Date.now(), stepSeconds = 30): string {
    const key = this.decodeBase32(secretBase32);
    const counter = Math.floor(timestampMs / 1000 / stepSeconds);

    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter), 0);

    const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
    const offset = hmac[hmac.length - 1]! & 0x0f;
    const binary =
      ((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff);

    const otp = binary % 1_000_000;
    return otp.toString().padStart(6, '0');
  }

  verifyTotp(
    token: string,
    secretBase32: string,
    window = 1,
    timestampMs = Date.now(),
    stepSeconds = 30,
  ): boolean {
    if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
      return false;
    }

    try {
      // Check current, past (-1), and future (+1) time steps for drift tolerance
      for (let errorStep = -window; errorStep <= window; errorStep++) {
        const checkTime = timestampMs + errorStep * stepSeconds * 1000;
        const candidate = this.generateTotp(secretBase32, checkTime, stepSeconds);
        if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(token))) {
          return true;
        }
      }
      return false;
    } catch (err: any) {
      this.logger.error(`Error verifying TOTP: ${err?.message || err}`);
      return false;
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
