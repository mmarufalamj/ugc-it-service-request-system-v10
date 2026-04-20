import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  validateRequired,
  validateStringLength,
  validateEmail,
  validatePhoneNumber,
  sanitizeString,
  ValidationError,
} from '../../src/server/validation';

describe('Validation Helpers', () => {
  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid.email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should pass when all required fields are present', () => {
      expect(() => {
        validateRequired({ name: 'John', email: 'john@example.com' }, ['name', 'email']);
      }).not.toThrow();
    });

    it('should throw when required fields are missing', () => {
      expect(() => {
        validateRequired({ name: 'John' }, ['name', 'email']);
      }).toThrow('Missing required fields: email');
    });
  });

  describe('validateStringLength', () => {
    it('should accept strings within range', () => {
      expect(() => {
        validateStringLength('hello', 'Test', 1, 10);
      }).not.toThrow();
    });

    it('should reject strings that are too short', () => {
      expect(() => {
        validateStringLength('hi', 'Test', 5, 10);
      }).toThrow('Test must be at least 5 characters');
    });

    it('should reject strings that are too long', () => {
      expect(() => {
        validateStringLength('this is a very long string', 'Test', 1, 10);
      }).toThrow('Test must not exceed 10 characters');
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(() => {
        validateEmail('user@example.com');
      }).not.toThrow();
    });

    it('should throw for invalid format', () => {
      expect(() => {
        validateEmail('invalid');
      }).toThrow('Invalid email format');
    });
  });

  describe('validatePhoneNumber', () => {
    it('should accept valid Bangladesh phone numbers', () => {
      expect(validatePhoneNumber('01312345678')).toBe(true);
      expect(validatePhoneNumber('+8801312345678')).toBe(true);
      expect(validatePhoneNumber('8801312345678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('123456')).toBe(false);
      expect(validatePhoneNumber('01012345678')).toBe(false); // Invalid prefix
    });
  });

  describe('sanitizeString', () => {
    it('should remove dangerous characters', () => {
      const sanitized = sanitizeString('<script>alert("xss")</script>');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should respect max length', () => {
      const result = sanitizeString('this is a very long string', 10);
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });
});
