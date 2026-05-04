import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './errors';

/**
 * In-memory rate limiter store
 * In production, consider using Redis
 */
class RateLimiterStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  constructor(private windowMs: number = 15 * 60 * 1000) {} // 15 minutes

  isLimited(key: string, limit: number): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new window
      this.store.set(key, { count: 1, resetTime: now + this.windowMs });
      return false;
    }

    if (entry.count >= limit) {
      return true;
    }

    entry.count++;
    return false;
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  getRemaining(key: string, limit: number): number {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return limit;
    }
    return Math.max(0, limit - entry.count);
  }

  getResetTime(key: string): number {
    const entry = this.store.get(key);
    return entry?.resetTime || Date.now();
  }

  // Cleanup old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Global rate limiter store
 */
const globalLimiter = new RateLimiterStore(15 * 60 * 1000); // 15 minutes

// Cleanup every 5 minutes
setInterval(() => globalLimiter.cleanup(), 5 * 60 * 1000);

/**
 * Create a rate limit middleware
 */
export const createRateLimiter = (options: {
  windowMs?: number; // Time window in milliseconds
  max?: number; // Max requests per window
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  message?: string;
} = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 100;
  const keyGenerator = options.keyGenerator || ((req: Request) => req.ip || 'unknown');
  const skip = options.skip || (() => false);
  const message = options.message || 'Too many requests, please try again later';

  const limiter = new RateLimiterStore(windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);

    if (limiter.isLimited(key, max)) {
      const resetTime = limiter.getResetTime(key);
      res.setHeader('Retry-After', Math.ceil((resetTime - Date.now()) / 1000));
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', resetTime);

      return next(new RateLimitError(message));
    }

    const remaining = limiter.getRemaining(key, max);
    const resetTime = limiter.getResetTime(key);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    next();
  };
};

/**
 * General API rate limiter (100 req/15min per IP)
 */
export const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

/**
 * Strict rate limiter for auth endpoints (10 req/15min per IP)
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again after 15 minutes',
});

/**
 * Moderate rate limiter for data operations (50 req/15min per user)
 */
export const dataLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise fall back to IP
    const userId = (req as any).user?.id;
    return userId ? `user-${userId}` : `ip-${req.ip}`;
  },
});

/**
 * Create user-based rate limiter
 */
export const createUserLimiter = (max: number = 50, windowMs: number = 15 * 60 * 1000) => {
  return createRateLimiter({
    windowMs,
    max,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id;
      return userId ? `user-${userId}` : req.ip || 'unknown';
    },
  });
};

/**
 * Create path-based rate limiter
 */
export const createPathLimiter = (max: number = 50, windowMs: number = 15 * 60 * 1000) => {
  return createRateLimiter({
    windowMs,
    max,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id || req.ip || 'unknown';
      return `${userId}:${req.method}:${req.path}`;
    },
  });
};
