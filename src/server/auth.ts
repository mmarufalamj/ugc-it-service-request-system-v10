import crypto from 'crypto';

/**
 * Hash a password using scrypt
 */
export const hashPassword = async (password: string, salt?: Buffer): Promise<{ hash: string; salt: string }> => {
  const finalSalt = salt || crypto.randomBytes(32);
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, finalSalt, 64, (err, key) => {
      if (err) reject(err);
      resolve({
        hash: key.toString('hex'),
        salt: finalSalt.toString('hex'),
      });
    });
  });
};

/**
 * Verify a password against a hash
 */
export const verifyPassword = async (password: string, storedHash: string, storedSalt: string): Promise<boolean> => {
  try {
    const salt = Buffer.from(storedSalt, 'hex');
    return new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (err, key) => {
        if (err) {
          reject(err);
          return;
        }
        const hash = key.toString('hex');
        try {
          const match = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
          resolve(match);
        } catch {
          resolve(false);
        }
      });
    });
  } catch {
    return false;
  }
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
