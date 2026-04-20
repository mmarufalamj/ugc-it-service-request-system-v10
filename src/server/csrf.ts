import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errors';

/**
 * CSRF token storage
 * In production, store in Redis or database with session ID
 */
const tokenStore = new Map<string, string>();

/**
 * Generate a CSRF token
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create CSRF protection middleware
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Allow GET requests without CSRF token
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    // Generate and store token for forms
    const token = generateCsrfToken();
    const sessionId = (req as any).session?.id || req.cookies?.sessionId || crypto.randomUUID();
    tokenStore.set(sessionId, token);

    res.locals.csrfToken = token;
    return next();
  }

  // For state-changing requests (POST, PUT, DELETE, PATCH)
  const token = req.body?.csrfToken || req.headers['x-csrf-token'] as string;
  const sessionId = (req as any).session?.id || req.cookies?.sessionId;

  if (!token || !sessionId) {
    return next(new ValidationError('CSRF token missing'));
  }

  const storedToken = tokenStore.get(sessionId);
  if (!storedToken || !constantTimeCompare(token, storedToken)) {
    return next(new ValidationError('Invalid CSRF token'));
  }

  // Token consumed, generate new one for next request
  const newToken = generateCsrfToken();
  tokenStore.set(sessionId, newToken);
  res.locals.csrfToken = newToken;

  next();
};

/**
 * Timing-safe string comparison
 */
const constantTimeCompare = (a: string, b: string): boolean => {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
};

/**
 * Middleware to attach CSRF token to response locals
 * Use this in your templates to render the token in forms
 */
export const attachCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  const token = generateCsrfToken();
  const sessionId = (req as any).session?.id || req.cookies?.sessionId || crypto.randomUUID();
  tokenStore.set(sessionId, token);

  res.locals.csrfToken = token;
  res.set('X-CSRF-Token', token);

  next();
};

/**
 * Cleanup expired tokens (run periodically)
 */
export const cleanupExpiredTokens = (maxAge: number = 24 * 60 * 60 * 1000) => {
  // In a real app, implement token expiration tracking
  // For now, tokens are kept in memory and cleared on server restart
};

/**
 * Validate CSRF token from request
 */
export const validateCsrfToken = (
  token: string | undefined,
  sessionId: string | undefined
): boolean => {
  if (!token || !sessionId) {
    return false;
  }

  const storedToken = tokenStore.get(sessionId);
  return !!storedToken && constantTimeCompare(token, storedToken);
};
