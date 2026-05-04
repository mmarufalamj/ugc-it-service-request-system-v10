import { ValidationError } from './errors';

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate required fields
 */
export const validateRequired = (data: Record<string, any>, fields: string[]): void => {
  const missing = fields.filter((field) => !data[field]);
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
};

/**
 * Validate string length
 */
export const validateStringLength = (
  value: string,
  fieldName: string,
  minLength: number = 1,
  maxLength: number = 255
): void => {
  if (value.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters`);
  }
  if (value.length > maxLength) {
    throw new ValidationError(`${fieldName} must not exceed ${maxLength} characters`);
  }
};

/**
 * Validate email
 */
export const validateEmail = (email: string): void => {
  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email format');
  }
  validateStringLength(email, 'Email', 5, 255);
};

/**
 * Validate phone number (Bangladesh format)
 */
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(?:\+88|88)?01[3-9]\d{8}$/;
  return phoneRegex.test(phone.replace(/[\s\-]/g, ''));
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input: string, maxLength: number = 255): string => {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>\"'%;()&+]/g, ''); // Remove potentially dangerous characters
};

/**
 * Validate file upload
 */
export const validateFileUpload = (
  file: Express.Multer.File,
  options: {
    maxSize?: number; // in bytes
    allowedMimes?: string[];
    allowedExtensions?: string[];
  } = {}
): void => {
  const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB default
  const allowedMimes = options.allowedMimes || [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const allowedExtensions = options.allowedExtensions || ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];

  if (!file) {
    throw new ValidationError('No file provided');
  }

  if (file.size > maxSize) {
    throw new ValidationError(`File size must not exceed ${maxSize / 1024 / 1024}MB`);
  }

  if (!allowedMimes.includes(file.mimetype)) {
    throw new ValidationError(`File type ${file.mimetype} not allowed`);
  }

  const fileExt = file.originalname.split('.').pop()?.toLowerCase();
  if (!fileExt || !allowedExtensions.includes(fileExt)) {
    throw new ValidationError(`File extension .${fileExt} not allowed`);
  }
};

/**
 * Validate object structure
 */
export const validateObject = (
  data: any,
  schema: Record<string, { type: string; required?: boolean; minLength?: number; maxLength?: number }>
): void => {
  for (const [field, rules] of Object.entries(schema)) {
    if (rules.required && !data[field]) {
      throw new ValidationError(`${field} is required`);
    }

    if (data[field]) {
      if (rules.type === 'string' && typeof data[field] !== 'string') {
        throw new ValidationError(`${field} must be a string`);
      }

      if (rules.type === 'number' && typeof data[field] !== 'number') {
        throw new ValidationError(`${field} must be a number`);
      }

      if (rules.type === 'email' && !isValidEmail(data[field])) {
        throw new ValidationError(`${field} must be a valid email`);
      }

      if (rules.minLength && data[field].length < rules.minLength) {
        throw new ValidationError(`${field} must be at least ${rules.minLength} characters`);
      }

      if (rules.maxLength && data[field].length > rules.maxLength) {
        throw new ValidationError(`${field} must not exceed ${rules.maxLength} characters`);
      }
    }
  }
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const validateDate = (dateString: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Validate enum value
 */
export const validateEnum = (value: any, enumValues: any[]): void => {
  if (!enumValues.includes(value)) {
    throw new ValidationError(`Invalid value. Must be one of: ${enumValues.join(', ')}`);
  }
};
