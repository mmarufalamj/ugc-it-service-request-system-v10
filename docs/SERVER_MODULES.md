# Server Modules Documentation

This document describes the new production-ready server modules added to the UGC IT Service Request System.

## Table of Contents

1. [Testing](#testing)
2. [Authentication & Passwords](#authentication--passwords)
3. [Permissions & Authorization](#permissions--authorization)
4. [Input Validation](#input-validation)
5. [Logging](#logging)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [CSRF Protection](#csrf-protection)

---

## Testing

### Overview
Unit tests have been set up using **Vitest** (fast unit testing) and **Jest** (integration testing).

### Running Tests
```bash
npm test                # Run all unit tests
npm run test:watch     # Watch mode for development
npm run test:ui        # Interactive test UI
npm run test:coverage  # Generate coverage report
npm run test:all       # Run lint + unit + integration tests
```

### Test Structure
```
tests/
├── unit/              # Unit tests (Vitest)
│   ├── auth.test.ts
│   ├── permissions.test.ts
│   └── validation.test.ts
└── integration/       # Integration tests (Jest)
    └── (examples)
```

### Key Test Files

#### `tests/unit/auth.test.ts`
Tests password hashing, verification, and strength validation.

#### `tests/unit/permissions.test.ts`
Tests role-based access control (RBAC) and permission checking.

#### `tests/unit/validation.test.ts`
Tests input validation, email validation, phone numbers, etc.

---

## Authentication & Passwords

### Module: `src/server/auth.ts`

#### Functions

##### `hashPassword(password: string, salt?: Buffer)`
Hash a password using scrypt with a random salt.

```typescript
import { hashPassword } from '@/server/auth';

const { hash, salt } = await hashPassword('MyPassword@123');
// Store both hash and salt in database
```

##### `verifyPassword(password: string, hash: string, salt: string)`
Verify a password against a stored hash.

```typescript
import { verifyPassword } from '@/server/auth';

const isValid = await verifyPassword(
  userInputPassword,
  storedHash,
  storedSalt
);
```

##### `validatePasswordStrength(password: string)`
Validate password meets minimum strength requirements.

```typescript
import { validatePasswordStrength } from '@/server/auth';

const result = validatePasswordStrength(password);
if (!result.valid) {
  console.error(result.errors); // ['Password must contain...' ]
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (!@#$%^&*)

---

## Permissions & Authorization

### Module: `src/server/permissions.ts`

#### Concepts

**User Roles** (hierarchy, highest to lowest):
1. `SUPER_ADMIN` - Full system access
2. `ADMIN` - Administrative access
3. `DEPARTMENT_HEAD` - Department management
4. `OFFICER` - Standard operations
5. `APPLICANT` - Limited to own submissions

**Resources:**
- `APPLICATION` - Service requests
- `USER` - User management
- `DIVISION` - Division management
- `SETTINGS` - System settings
- `REPORTS` - Analytics and reports
- `DATA_SHARE` - Data sharing API

**Actions:**
- `CREATE`, `READ`, `UPDATE`, `DELETE`
- `APPROVE`, `REJECT`, `ASSIGN`, `EXPORT`

#### Key Functions

##### `hasPermission(userPermissions, resource, action)`
Check if a user has a specific permission.

```typescript
import { hasPermission } from '@/server/permissions';

const canDelete = hasPermission(userPerms, 'application', 'delete');
```

##### `canPerformAction(role, resource, action, userPermissions?)`
Check if a role can perform an action on a resource.

```typescript
import { canPerformAction, UserRole, ResourceType, ActionType } from '@/server/permissions';

const canApprove = canPerformAction(
  UserRole.DEPARTMENT_HEAD,
  ResourceType.APPLICATION,
  ActionType.APPROVE
);
```

##### `hasHigherPrivilege(role1, role2)`
Compare role hierarchy.

```typescript
import { hasHigherPrivilege, UserRole } from '@/server/permissions';

if (hasHigherPrivilege(UserRole.ADMIN, UserRole.OFFICER)) {
  // ADMIN has higher privilege
}
```

---

## Input Validation

### Module: `src/server/validation.ts`

Comprehensive input validation utilities for form data, files, and API payloads.

#### Common Validators

##### `validateRequired(data, fields)`
Ensure required fields are present.

```typescript
import { validateRequired } from '@/server/validation';

validateRequired(formData, ['email', 'name']); // Throws if missing
```

##### `validateEmail(email)`
Validate email format.

```typescript
import { validateEmail } from '@/server/validation';

validateEmail('user@example.com'); // OK
validateEmail('invalid'); // Throws ValidationError
```

##### `validateStringLength(value, fieldName, min, max)`
Validate string length bounds.

```typescript
import { validateStringLength } from '@/server/validation';

validateStringLength(title, 'Title', 1, 100);
```

##### `validatePhoneNumber(phone)`
Validate Bangladesh phone numbers.

```typescript
import { validatePhoneNumber } from '@/server/validation';

validatePhoneNumber('01312345678');      // true
validatePhoneNumber('+8801312345678');   // true
```

##### `sanitizeString(input, maxLength)`
Remove dangerous characters from user input.

```typescript
import { sanitizeString } from '@/server/validation';

const safe = sanitizeString('<script>alert("xss")</script>');
// Returns: 'scriptalertxssscript'
```

##### `validateFileUpload(file, options)`
Validate file uploads.

```typescript
import { validateFileUpload } from '@/server/validation';

validateFileUpload(req.file, {
  maxSize: 5 * 1024 * 1024,           // 5MB
  allowedMimes: ['application/pdf', 'image/png'],
  allowedExtensions: ['pdf', 'png']
});
```

---

## Logging

### Module: `src/server/logger.ts`

Structured logging with Winston for production-grade observability.

### Features
- **Console output** (pretty in dev, JSON in prod)
- **File rotation** (5MB per file, 10 files max)
- **Error tracking** with stack traces
- **Metadata** for context

### Usage

```typescript
import { logHttpRequest, logAuthEvent, logError, logAudit } from '@/server/logger';

// Log HTTP requests
logHttpRequest(req, res, 45); // 45ms duration

// Log authentication events
logAuthEvent('user@example.com', 'login', { ip: req.ip });

// Log errors with context
logError(error, { userId: user.id, action: 'submit_application' });

// Audit critical operations
logAudit('admin@example.com', 'delete_user', 'user', { userId: 123 });
```

### Log Files
```
logs/
├── combined.log    # All logs
└── error.log       # Errors only
```

---

## Error Handling

### Module: `src/server/errors.ts`

Standardized error handling and custom error classes.

#### Error Classes

```typescript
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ApiError
} from '@/server/errors';

throw new ValidationError('Email is required');
throw new AuthenticationError('Invalid credentials');
throw new AuthorizationError('You do not have permission');
throw new NotFoundError('User not found');
throw new ConflictError('Email already exists');
throw new RateLimitError('Too many requests');
```

#### Global Error Handler

Add to your Express app:

```typescript
import { errorHandler, notFoundHandler } from '@/server/errors';

// ... route definitions ...

// Catch 404
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);
```

#### Response Format

All errors return a standard JSON format:

```json
{
  "error": {
    "message": "Invalid email format",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "timestamp": "2026-04-21T10:30:45.123Z",
    "requestId": "req-1713667445123"
  }
}
```

#### Async Handler Wrapper

Wrap async route handlers to automatically catch errors:

```typescript
import { asyncHandler } from '@/server/errors';

app.post('/api/users', asyncHandler(async (req, res) => {
  const user = await createUser(req.body);
  res.json(user);
})); // Errors automatically caught and passed to error handler
```

---

## Rate Limiting

### Module: `src/server/rateLimiter.ts`

Prevent abuse and DoS attacks with configurable rate limiters.

#### Pre-configured Limiters

```typescript
import {
  generalLimiter,      // 100 req/15min per IP
  authLimiter,         // 10 req/15min per IP
  dataLimiter          // 50 req/15min per user
} from '@/server/rateLimiter';

// Apply to routes
app.post('/api/login', authLimiter, loginHandler);
app.post('/api/applications', dataLimiter, submitHandler);
app.use(generalLimiter); // Fallback for all routes
```

#### Custom Rate Limiters

```typescript
import { createRateLimiter, createUserLimiter } from '@/server/rateLimiter';

// Custom limiter
const exportLimiter = createUserLimiter(
  10,                    // 10 requests
  24 * 60 * 60 * 1000    // per 24 hours
);

app.get('/api/reports/export', exportLimiter, exportHandler);
```

#### Response Headers

Rate limit information is added to response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1713667445000
```

When limit exceeded (429 status):

```
Retry-After: 450
X-RateLimit-Remaining: 0
```

---

## CSRF Protection

### Module: `src/server/csrf.ts`

Cross-Site Request Forgery protection using token validation.

#### Setup

```typescript
import { csrfProtection, attachCsrfToken } from '@/server/csrf';

// Attach token to responses
app.use(attachCsrfToken);

// Validate token on state-changing requests
app.use(csrfProtection);
```

#### Using in Forms

```html
<!-- HTML form -->
<form method="POST" action="/api/applications">
  <input type="hidden" name="csrfToken" value="<%= csrfToken %>">
  <input type="text" name="title" required>
  <button type="submit">Submit</button>
</form>
```

#### Using in API Requests

```javascript
// JavaScript fetch
const response = await fetch('/api/applications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({ title: 'My Request' })
});
```

---

## Integration Example

### Complete Setup

```typescript
import express from 'express';
import { csrfProtection, attachCsrfToken } from '@/server/csrf';
import { errorHandler, notFoundHandler, asyncHandler } from '@/server/errors';
import { authLimiter, generalLimiter } from '@/server/rateLimiter';
import { logHttpRequest, logError } from '@/server/logger';
import { validateRequired, validateEmail } from '@/server/validation';
import { hasPermission, UserPermissions } from '@/server/permissions';

const app = express();

// Middleware
app.use(express.json());
app.use(attachCsrfToken);
app.use(authLimiter);
app.use(generalLimiter);

// Routes
app.post('/api/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Validate input
  validateRequired({ email, password }, ['email', 'password']);
  validateEmail(email);
  
  // Authenticate user
  const user = await authenticateUser(email, password);
  if (!user) {
    throw new AuthenticationError('Invalid credentials');
  }
  
  res.json(user);
}));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
```

---

## Best Practices

### Authentication
1. **Always hash passwords** with `hashPassword()` before storing
2. **Use secure sessions** with HttpOnly, SameSite cookies
3. **Validate password strength** before accepting new passwords
4. **Log authentication events** for security auditing

### Authorization
1. **Check permissions** on every protected route
2. **Use the principle of least privilege**
3. **Regularly audit permissions**
4. **Log permission changes**

### Input Validation
1. **Validate on the server** (never trust client validation)
2. **Sanitize user input** to prevent XSS
3. **Use type checking** for API contracts
4. **Return clear validation errors** to users

### Error Handling
1. **Never expose sensitive information** in error messages (especially in production)
2. **Log all errors** with context for debugging
3. **Use appropriate HTTP status codes**
4. **Return consistent error format**

### Rate Limiting
1. **Apply rate limits** to all public endpoints
2. **Use stricter limits** for sensitive operations (login, exports)
3. **Monitor rate limit violations** for security threats
4. **Implement exponential backoff** on the client side

### CSRF Protection
1. **Generate tokens** for every page load
2. **Validate tokens** on all state-changing requests
3. **Use double-submit cookies** for additional protection
4. **Implement SameSite cookie** attribute

---

## Testing the Modules

All modules include comprehensive unit tests:

```bash
npm test                           # Run all tests
npm run test:coverage              # See test coverage
```

Test coverage currently includes:
- ✅ Authentication (password hashing, verification, validation)
- ✅ Permissions (RBAC, privilege hierarchy, permission checking)
- ✅ Validation (email, phone, string length, sanitization)
- ⏳ Rate limiting (in progress)
- ⏳ Error handling (in progress)
- ⏳ CSRF protection (in progress)

---

## Migration Guide

To integrate these modules into your existing code:

### Step 1: Install Dependencies
```bash
npm install winston
```

### Step 2: Update server.ts
```typescript
// Add imports
import { errorHandler, notFoundHandler } from '@/server/errors';
import { csrfProtection, attachCsrfToken } from '@/server/csrf';
import { generalLimiter, authLimiter } from '@/server/rateLimiter';

// Add middleware (in order)
app.use(express.json());
app.use(attachCsrfToken);
app.use(authLimiter);
app.use(generalLimiter);
app.use(csrfProtection);

// ... your routes ...

app.use(notFoundHandler);
app.use(errorHandler);
```

### Step 3: Update Route Handlers
Replace direct error throwing with structured errors:

```typescript
// Before
if (!email) {
  res.status(400).json({ error: 'Email required' });
  return;
}

// After
import { ValidationError } from '@/server/errors';
validateRequired({ email }, ['email']);
```

### Step 4: Update Tests
Add test cases for your routes using the testing infrastructure:

```typescript
import { describe, it, expect } from 'vitest';

describe('POST /api/login', () => {
  it('should reject missing email', () => {
    // Test implementation
  });
});
```

---

## Support & Troubleshooting

### Tests failing?
1. Ensure all modules are imported correctly
2. Check that `NODE_ENV` is set appropriately
3. Run `npm install` to ensure dependencies are installed
4. Check test file paths match the configuration

### Logging not working?
1. Ensure `logs/` directory is writable
2. Check `LOG_LEVEL` environment variable
3. Verify Winston transport configuration

### Rate limiting not working?
1. Ensure middleware is applied before routes
2. Check that requests have `X-Forwarded-For` header if behind proxy
3. Verify `TRUST_PROXY=true` is set in production

---

## Next Steps

1. **Integrate modules into server.ts** - Update the main server file with new middleware
2. **Add integration tests** - Create test cases for API endpoints
3. **Update deployment documentation** - Include new environment variables
4. **Monitor in production** - Set up log aggregation and alerting
5. **Implement Redis** - For distributed rate limiting in multi-server deployments
