import { Request, Response, NextFunction } from 'express';
import { logError } from './logger';

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number = 500,
    public code: string = 'INTERNAL_SERVER_ERROR',
    message: string = 'An unexpected error occurred'
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Request validation error
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'Invalid request') {
    super(400, 'VALIDATION_ERROR', message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed') {
    super(401, 'AUTHENTICATION_ERROR', message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, 'AUTHORIZATION_ERROR', message);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict error
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict') {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests') {
    super(429, 'RATE_LIMIT_EXCEEDED', message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.get('X-Request-ID') || `req-${Date.now()}`;
  
  // Log the error
  if (err instanceof ApiError) {
    logError(err, {
      statusCode: err.statusCode,
      code: err.code,
      requestId,
      method: req.method,
      path: req.path,
    });
  } else {
    logError(err, {
      requestId,
      method: req.method,
      path: req.path,
    });
  }

  // Determine response details
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    code = err.code || 'ERROR';
    message = err.message || 'An error occurred';
  }

  // Hide sensitive details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An unexpected error occurred. Please try again later.';
  }

  const response: ApiErrorResponse = {
    error: {
      message,
      code,
      statusCode,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  res.status(statusCode).json(response);
};

/**
 * Async route handler wrapper to catch errors
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const response: ApiErrorResponse = {
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      statusCode: 404,
      timestamp: new Date().toISOString(),
    },
  };
  res.status(404).json(response);
};
