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

      // Verify immediate acceptance
      expect(totpService.verifyTotp(code, secret, 1, now)).toBe(true);

      // Verify acceptance within 30s window (drift)
      expect(totpService.verifyTotp(code, secret, 1, now + 25000)).toBe(true);

      // Verify rejection of incorrect code
      expect(totpService.verifyTotp('000000', secret, 1, now)).toBe(false);

      // Verify rejection of malformed tokens
      expect(totpService.verifyTotp('123', secret)).toBe(false);
      expect(totpService.verifyTotp('abcdef', secret)).toBe(false);
    });

    it('should format otpauth URI properly for authenticator apps', () => {
      const uri = totpService.generateOtpAuthUri('priya@example.com', 'JBSWY3DPEHPK3PXP');
      expect(uri).toContain('otpauth://totp/Maate%3Apriya%40example.com');
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
      expect(uri).toContain('issuer=Maate');
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
