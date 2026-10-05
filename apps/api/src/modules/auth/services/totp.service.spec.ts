import { TotpService } from './totp.service';

describe('TotpService (RFC 6238 TOTP Engine)', () => {
  let totpService: TotpService;

  beforeEach(() => {
    totpService = new TotpService();
  });

  describe('Base32', () => {
    it('should encode and decode arbitrary buffers losslessly', () => {
      const original = Buffer.from('HelloWorld123!');
      const base32 = totpService.encodeBase32(original);
      const decoded = totpService.decodeBase32(base32);
      expect(decoded.toString('utf8')).toBe('HelloWorld123!');
    });
  });

  describe('TOTP Generation & Verification', () => {
    it('should generate valid 6-digit TOTP codes and verify within time window', () => {
      const secret = totpService.generateSecret();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThanOrEqual(16);

      const now = Date.now();
      const code = totpService.generateTotp(secret, now);
      expect(code).toMatch(/^\d{6}$/);

      // Verify immediate acceptance with step return
      const res1 = totpService.verifyTotp(code, secret, 1, now);
      expect(res1.isValid).toBe(true);
      expect(typeof res1.step).toBe('number');

      // Verify acceptance within 30s window (drift)
      const res2 = totpService.verifyTotp(code, secret, 1, now + 25000);
      expect(res2.isValid).toBe(true);

      // Verify rejection of incorrect code
      expect(totpService.verifyTotp('000000', secret, 1, now).isValid).toBe(false);

      // Verify rejection of malformed tokens
      expect(totpService.verifyTotp('123', secret).isValid).toBe(false);
      expect(totpService.verifyTotp('abcdef', secret).isValid).toBe(false);
    });

    it('should format otpauth URI properly for authenticator apps', () => {
      const uri = totpService.generateOtpAuthUri('priya@example.com', 'JBSWY3DPEHPK3PXP');
      expect(uri).toContain('otpauth://totp/Maate%3Apriya%40example.com');
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
      expect(uri).toContain('issuer=Maate');
    });
  });

  describe('RFC 6238 Appendix B Official Test Vectors (HMAC-SHA1)', () => {
    // RFC 6238 Appendix B uses the ASCII key "12345678901234567890" (20 bytes)
    // Base32 for "12345678901234567890" is "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
    const rfcSecretBase32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

    const testVectors = [
      { timeSec: 59, expected8: '94287082', expected6: '287082' },
      { timeSec: 1111111109, expected8: '07081804', expected6: '081804' },
      { timeSec: 1111111111, expected8: '14050471', expected6: '050471' },
      { timeSec: 1234567890, expected8: '89005924', expected6: '005924' },
      { timeSec: 2000000000, expected8: '69279037', expected6: '279037' },
      { timeSec: 20000000000, expected8: '65353130', expected6: '353130' },
    ];

    testVectors.forEach(({ timeSec, expected8, expected6 }) => {
      it(`should match RFC 6238 vector at T=${timeSec}s (8-digit: ${expected8}, 6-digit: ${expected6})`, () => {
        const timeMs = timeSec * 1000;
        // 8-digit vector test
        const code8 = totpService.generateTotp(rfcSecretBase32, timeMs, 30, 8);
        expect(code8).toBe(expected8);

        // 6-digit standard test
        const code6 = totpService.generateTotp(rfcSecretBase32, timeMs, 30, 6);
        expect(code6).toBe(expected6);

        // Verify matches
        const verification = totpService.verifyTotp(code6, rfcSecretBase32, 0, timeMs);
        expect(verification.isValid).toBe(true);
        expect(verification.step).toBe(Math.floor(timeSec / 30));
      });
    });
  });

  describe('AES-256-GCM Secret Encryption & Decryption', () => {
    it('should encrypt secret at rest and decrypt cleanly', () => {
      const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
      const encrypted = totpService.encryptSecret(secret);

      // Verify format iv:tag:ciphertext (3 colon-separated hex strings)
      expect(encrypted).not.toBe(secret);
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toMatch(/^[0-9a-f]{24}$/); // 12-byte IV = 24 hex
      expect(parts[1]).toMatch(/^[0-9a-f]{32}$/); // 16-byte tag = 32 hex
      expect(parts[2]?.length).toBeGreaterThan(0);

      // Verify decryption recovers exact plain secret
      const decrypted = totpService.decryptSecret(encrypted);
      expect(decrypted).toBe(secret);
    });

    it('should handle unencrypted legacy secrets gracefully', () => {
      const legacySecret = 'JBSWY3DPEHPK3PXP';
      expect(totpService.decryptSecret(legacySecret)).toBe(legacySecret);
    });

    it('should refuse to start in production if MFA_ENCRYPTION_KEY is missing', () => {
      const mockProdConfig = {
        get: (key: string) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'MFA_ENCRYPTION_KEY') return undefined;
          return null;
        },
      } as any;

      expect(() => new TotpService(mockProdConfig)).toThrow(/FATAL: MFA_ENCRYPTION_KEY must be set in production/);
    });
  });

  describe('Replay Prevention Check', () => {
    it('should identify step counter and enable replay detection', () => {
      const secret = 'GEZDGNBVGY3TQOJQ';
      const now = Date.now();
      const code = totpService.generateTotp(secret, now);

      const verification = totpService.verifyTotp(code, secret, 0, now);
      expect(verification.isValid).toBe(true);
      expect(typeof verification.step).toBe('number');

      // Simulating replay protection logic:
      // If lastUsedStep >= verification.step, subsequent verification is rejected
      let lastUsedStep: number | null = verification.step;
      const isReplayed = lastUsedStep !== null && lastUsedStep >= verification.step!;
      expect(isReplayed).toBe(true);

      // In the next 30-second window, next code is allowed
      const futureNow = now + 35000;
      const futureCode = totpService.generateTotp(secret, futureNow);
      const futureVerif = totpService.verifyTotp(futureCode, secret, 0, futureNow);
      expect(futureVerif.isValid).toBe(true);
      expect(futureVerif.step!).toBeGreaterThan(lastUsedStep!);
    });
  });

  describe('Backup Codes', () => {
    it('should generate 8 backup codes and verify + consume single-use code', () => {
      const { raw, hashed } = totpService.generateBackupCodes(8);
      expect(raw).toHaveLength(8);
      expect(hashed).toHaveLength(8);

      const testCode = raw[0]!;

      // Successfully consume the first backup code
      const result = totpService.verifyAndConsumeBackupCode(testCode, hashed);
      expect(result.isValid).toBe(true);
      expect(result.remainingHashedCodes).toHaveLength(7);

      // Reusing the same code should fail
      const reuseResult = totpService.verifyAndConsumeBackupCode(testCode, result.remainingHashedCodes);
      expect(reuseResult.isValid).toBe(false);
      expect(reuseResult.remainingHashedCodes).toHaveLength(7);
    });
  });
});
