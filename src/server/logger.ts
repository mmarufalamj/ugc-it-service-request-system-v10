import winston from 'winston';
import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Winston logger instance with console and file transports
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ugc-it-service-request' },
  transports: [
    // Console output (pretty for dev, JSON for prod)
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
              return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
          ),
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
});

/**
 * Log HTTP request
 */
export const logHttpRequest = (req: any, res: any, duration: number) => {
  logger.info('HTTP Request', {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
};

/**
 * Log authentication event
 */
export const logAuthEvent = (email: string, action: 'login' | 'logout' | 'failed', details: Record<string, any> = {}) => {
  logger.info('Auth Event', {
    action,
    email,
    ...details,
  });
};

/**
 * Log permission check
 */
export const logPermissionCheck = (email: string, resource: string, action: string, allowed: boolean) => {
  logger.info('Permission Check', {
    email,
    resource,
    action,
    allowed,
  });
};

/**
 * Log database operation
 */
export const logDatabaseOperation = (operation: string, table: string, duration: number, success: boolean, error?: string) => {
  const level = success ? 'debug' : 'error';
  logger[level as any]('Database Operation', {
    operation,
    table,
    duration: `${duration}ms`,
    success,
    error,
  });
};

/**
 * Log error
 */
export const logError = (error: Error, context: Record<string, any> = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

/**
 * Log audit trail (critical business actions)
 */
export const logAudit = (email: string, action: string, resource: string, details: Record<string, any> = {}) => {
  logger.warn('Audit Trail', {
    email,
    action,
    resource,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

export default logger;
