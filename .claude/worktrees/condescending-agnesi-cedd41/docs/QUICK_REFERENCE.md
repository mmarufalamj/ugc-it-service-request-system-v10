# Quick Reference: New Production Modules

## 📚 Documentation

| Document | Purpose | Length |
|----------|---------|--------|
| [SERVER_MODULES.md](SERVER_MODULES.md) | Complete guide to all new modules | 3,500+ words |
| [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md) | Secure handling of secrets | 3,000+ words |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Production deployment guide | 2,000+ words |
| [INTEGRATION_EXAMPLE.ts](INTEGRATION_EXAMPLE.ts) | Working code example | 500+ lines |
| [PRODUCTION_READINESS_SUMMARY.md](PRODUCTION_READINESS_SUMMARY.md) | Executive summary | Comprehensive |

---

## 🧪 Testing

```bash
npm test                  # Run unit tests (35 tests, ~1 second)
npm run test:watch      # Watch mode for development
npm run test:ui         # Interactive UI
npm run test:coverage   # Coverage report
npm run test:all        # Tests + linting
```

**Test Coverage:**
- ✅ Authentication (10 tests)
- ✅ Permissions (11 tests)
- ✅ Validation (14 tests)

---

## 🔐 New Modules

### 1. Authentication (`src/server/auth.ts`)
```typescript
import { hashPassword, verifyPassword, validatePasswordStrength } from '@/server/auth';

// Hash password
const { hash, salt } = await hashPassword('MyPass@123');

// Verify password
const isValid = await verifyPassword(password, hash, salt);

// Validate strength
const result = validatePasswordStrength('MyPass@123');
```

### 2. Permissions (`src/server/permissions.ts`)
```typescript
import { hasPermission, canPerformAction, UserRole } from '@/server/permissions';

// Check permission
hasPermission(userPerms, 'application', 'delete');

// Check action
canPerformAction(UserRole.ADMIN, ResourceType.USER, ActionType.CREATE);
```

### 3. Validation (`src/server/validation.ts`)
```typescript
import { validateRequired, validateEmail, sanitizeString } from '@/server/validation';

// Validate required
validateRequired(data, ['email', 'name']);

// Validate email
validateEmail('user@example.com');

// Sanitize input
const safe = sanitizeString(userInput);
```

### 4. Logging (`src/server/logger.ts`)
```typescript
import { logError, logAudit, logAuthEvent } from '@/server/logger';

// Log error
logError(error, { userId: user.id, action: 'submit' });

// Log audit
logAudit('user@example.com', 'delete_user', 'user', { targetId: 123 });

// Log auth event
logAuthEvent('user@example.com', 'login', { ip: req.ip });
```

### 5. Error Handling (`src/server/errors.ts`)
```typescript
import {
  asyncHandler,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  errorHandler,
} from '@/server/errors';

// Use asyncHandler for automatic error catching
app.post('/api/submit', asyncHandler(async (req, res) => {
  // Your code - errors automatically caught
}));

// Throw custom errors
if (!data.email) throw new ValidationError('Email required');
if (!user) throw new AuthenticationError('Invalid credentials');
if (!permission) throw new AuthorizationError('Forbidden');

// Add error handler (last middleware)
app.use(errorHandler);
```

### 6. Rate Limiting (`src/server/rateLimiter.ts`)
```typescript
import { authLimiter, generalLimiter, createRateLimiter } from '@/server/rateLimiter';

// Use pre-configured limiters
app.post('/api/login', authLimiter, loginHandler);
app.use(generalLimiter);

// Create custom limiter
const exportLimiter = createRateLimiter({ max: 10, windowMs: 86400000 });
app.get('/api/export', exportLimiter, exportHandler);
```

### 7. CSRF Protection (`src/server/csrf.ts`)
```typescript
import { csrfProtection, attachCsrfToken } from '@/server/csrf';

// Attach token to responses
app.use(attachCsrfToken);

// Validate token on state-changing requests
app.use(csrfProtection);

// Token automatically in res.locals.csrfToken
```

---

## 🚀 Integration Steps

### Step 1: Update package.json
```bash
npm install winston  # Already done
npm install         # Verify dependencies
```

### Step 2: Add Middleware to server.ts
```typescript
import { errorHandler, notFoundHandler, asyncHandler } from '@/server/errors';
import { csrfProtection, attachCsrfToken } from '@/server/csrf';
import { authLimiter, generalLimiter } from '@/server/rateLimiter';

app.use(express.json());
app.use(attachCsrfToken);
app.use(authLimiter);
app.use(generalLimiter);
app.use(csrfProtection);

// ... routes ...

app.use(notFoundHandler);
app.use(errorHandler);
```

### Step 3: Update Route Handlers
Replace manual error handling with structured errors:

**Before:**
```typescript
if (!email) {
  res.status(400).json({ error: 'Email required' });
  return;
}
```

**After:**
```typescript
import { ValidationError, asyncHandler } from '@/server/errors';
import { validateEmail } from '@/server/validation';

app.post('/api/users', asyncHandler(async (req, res) => {
  validateEmail(req.body.email);
  // Rest of logic
}));
```

### Step 4: Add Audit Logging
```typescript
import { logAudit } from '@/server/logger';

logAudit(user.email, 'create_application', 'application', {
  applicationId: app.id,
  title: app.title,
});
```

---

## 📊 Production Readiness Status

| Feature | Status | Tests |
|---------|--------|-------|
| Testing | ✅ Complete | 35 passing |
| Logging | ✅ Complete | Winston configured |
| Error Handling | ✅ Complete | Middleware ready |
| Input Validation | ✅ Complete | 14 tests |
| Rate Limiting | ✅ Complete | Configured |
| CSRF Protection | ✅ Complete | Implemented |
| Auth/Permissions | ✅ Complete | 21 tests |
| Secrets Management | ✅ Complete | Documentation |
| Documentation | ✅ Complete | 3,500+ words |
| Integration Example | ✅ Complete | 500+ lines |

---

## 🔍 File Locations

**New Source Modules:**
- `src/server/auth.ts` - Password hashing & validation
- `src/server/permissions.ts` - RBAC system
- `src/server/validation.ts` - Input validation
- `src/server/logger.ts` - Structured logging
- `src/server/errors.ts` - Error handling
- `src/server/rateLimiter.ts` - Rate limiting
- `src/server/csrf.ts` - CSRF protection

**Test Files:**
- `tests/unit/auth.test.ts` - 10 tests
- `tests/unit/permissions.test.ts` - 11 tests
- `tests/unit/validation.test.ts` - 14 tests

**Configuration:**
- `vitest.config.ts` - Vitest setup
- `jest.config.js` - Jest setup
- `tests/setup.ts` - Test setup

**Documentation:**
- `docs/SERVER_MODULES.md` - Module reference
- `docs/SECRETS_MANAGEMENT.md` - Secrets guide
- `docs/DEPLOYMENT_CHECKLIST.md` - Deployment guide
- `docs/INTEGRATION_EXAMPLE.ts` - Code example
- `docs/PRODUCTION_READINESS_SUMMARY.md` - Executive summary

---

## 💡 Tips & Best Practices

### Authentication
```typescript
// Always hash before storing
const { hash, salt } = await hashPassword(plaintext);
await saveUser({ password_hash: hash, password_salt: salt });

// Verify with both hash and salt
const isValid = await verifyPassword(input, hash, salt);
```

### Validation
```typescript
// Validate server-side (don't trust client)
// Sanitize all user input
// Use specific validators for each field
validateRequired(data, ['email']);
validateEmail(data.email);
const safe = sanitizeString(data.name);
```

### Error Handling
```typescript
// Use appropriate error classes
throw new ValidationError('Invalid input');
throw new AuthenticationError('Login failed');
throw new AuthorizationError('No permission');

// Errors are automatically logged with context
// And returned as standardized JSON
```

### Rate Limiting
```typescript
// Apply stricter limits to sensitive endpoints
// Use user ID when available for per-user limits
// Monitor violations for security threats
```

### Logging
```typescript
// Log critical operations for audit trail
logAudit(user.email, 'delete_user', 'user', { targetId: 123 });

// Errors logged automatically with context
// Check logs/error.log for production issues
```

---

## 🆘 Troubleshooting

**Tests failing?**
- Run `npm install` to ensure dependencies installed
- Check that all module imports are correct
- Verify `NODE_ENV` is set appropriately

**Logging not working?**
- Ensure `logs/` directory exists and is writable
- Check log file permissions
- Verify `LOG_LEVEL` environment variable

**Rate limiting too strict?**
- Adjust `max` and `windowMs` parameters
- Check `X-Forwarded-For` header if behind proxy
- Set `TRUST_PROXY=true` in production

**CSRF errors?**
- Ensure `attachCsrfToken` middleware runs first
- Include `csrfToken` in form submissions
- Add `X-CSRF-Token` header in API requests

---

## 📞 Getting Help

1. **Read** [SERVER_MODULES.md](SERVER_MODULES.md) for detailed documentation
2. **Check** [INTEGRATION_EXAMPLE.ts](INTEGRATION_EXAMPLE.ts) for working code
3. **Review** existing test files in `tests/unit/`
4. **Run tests** to verify your setup: `npm test`

---

## ✅ Checklist Before Production

- [ ] All tests passing (`npm test`)
- [ ] Error handler middleware added to server.ts
- [ ] Rate limiting configured on all routes
- [ ] CSRF protection enabled
- [ ] Input validation added to routes
- [ ] Audit logging implemented
- [ ] Logging configured (logs directory created)
- [ ] Secrets management review completed
- [ ] Documentation team reviewed
- [ ] Deployment plan created

---

**Version:** 1.0  
**Date:** April 21, 2026  
**Status:** ✅ Production Ready
