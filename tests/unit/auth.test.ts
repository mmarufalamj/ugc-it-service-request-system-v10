import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../../src/server/auth';

describe('Authentication Helpers', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'Test@1234';
      const result = await hashPassword(password);

      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.hash).not.toBe(password);
    });

    it('should generate different hashes for same password (different salts)', async () => {
      const password = 'Test@1234';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1.hash).not.toBe(hash2.hash);
      expect(hash1.salt).not.toBe(hash2.salt);
    });
  });

  describe('Password Verification', () => {
    it('should verify correct password', async () => {
      const password = 'Test@1234';
      const { hash, salt } = await hashPassword(password);

      const isValid = await verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'Test@1234';
      const { hash, salt } = await hashPassword(password);

      const isValid = await verifyPassword('Wrong@1234', hash, salt);
      expect(isValid).toBe(false);
    });
  });

  describe('Password Strength Validation', () => {
    it('should accept strong password', () => {
      const result = validatePasswordStrength('Strong@Pass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const result = validatePasswordStrength('Test@1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should reject password without uppercase', () => {
      const result = validatePasswordStrength('test@1234');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validatePasswordStrength('TEST@1234');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without digit', () => {
      const result = validatePasswordStrength('Test@abcd');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one digit');
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('Test1234');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character (!@#$%^&*)');
    });
  });
});
