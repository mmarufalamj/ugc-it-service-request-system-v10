// This file demonstrates how to integrate all the new production-ready modules
// into your Express application.

import express, { Express, Request, Response, NextFunction } from 'express';
import logger, { logHttpRequest, logAuthEvent, logError, logAudit } from '../src/server/logger';
import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
} from '../src/server/errors';
import { csrfProtection, attachCsrfToken } from '../src/server/csrf';
import { authLimiter, generalLimiter, dataLimiter } from '../src/server/rateLimiter';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from '../src/server/auth';
import {
  hasPermission,
  canPerformAction,
  UserRole,
  ResourceType,
  ActionType,
} from '../src/server/permissions';
import {
  validateRequired,
  validateEmail,
  validateStringLength,
  sanitizeString,
} from '../src/server/validation';

// ============================================================================
// SETUP
// ============================================================================

const app: Express = express();

// Middleware order is important!

// 1. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. CSRF token attachment (before routes)
app.use(attachCsrfToken);

// 3. Rate limiting
app.use(authLimiter);        // Strict for auth endpoints
app.use(dataLimiter);        // Moderate for data endpoints
app.use(generalLimiter);     // General fallback

// 4. Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logHttpRequest(req, res, duration);
  });
  next();
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user is authenticated
 */
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) {
    throw new AuthenticationError('Please log in');
  }
  next();
};

/**
 * Check if user has permission
 */
const requirePermission = (resource: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      throw new AuthenticationError('Please log in');
    }

    if (!hasPermission(user.permissions, resource, action)) {
      throw new AuthorizationError(
        `You don't have permission to ${action} ${resource}`
      );
    }

    next();
  };
};

// ============================================================================
// EXAMPLE ROUTES
// ============================================================================

// Public route - no authentication required
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/auth/register
 * Register a new user
 */
app.post(
  '/api/auth/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    // 1. Validate required fields
    validateRequired(
      { email, password, name },
      ['email', 'password', 'name']
    );

    // 2. Validate individual fields
    validateEmail(email);
    validateStringLength(name, 'Name', 1, 100);

    // 3. Validate password strength
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      throw new ValidationError(
        `Password is too weak: ${passwordCheck.errors[0]}`
      );
    }

    // 4. Sanitize input
    const sanitizedName = sanitizeString(name);

    // 5. Check if user already exists (example - implement actual DB check)
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    // 6. Hash password
    const { hash, salt } = await hashPassword(password);

    // 7. Create user (example implementation)
    const newUser = await createUser({
      email: email.toLowerCase(),
      name: sanitizedName,
      password_hash: hash,
      password_salt: salt,
      role: UserRole.APPLICANT,
    });

    // 8. Log audit event
    logAudit('system', 'user_registered', 'user', {
      userId: newUser.id,
      email: newUser.email,
    });

    res.status(201).json({
      message: 'User registered successfully',
      userId: newUser.id,
    });
  })
);

/**
 * POST /api/auth/login
 * User login (requires CSRF token and rate limiting)
 */
app.post(
  '/api/auth/login',
  authLimiter, // Strict rate limit for login
  csrfProtection, // Validate CSRF token
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // 1. Validate input
    validateRequired({ email, password }, ['email', 'password']);
    validateEmail(email);

    // 2. Find user
    const user = await findUserByEmail(email.toLowerCase());
    if (!user) {
      logAuthEvent(email, 'failed', { reason: 'user_not_found' });
      throw new AuthenticationError('Invalid email or password');
    }

    // 3. Verify password
    const isValidPassword = await verifyPassword(
      password,
      user.password_hash,
      user.password_salt
    );

    if (!isValidPassword) {
      logAuthEvent(email, 'failed', { reason: 'invalid_password' });
      throw new AuthenticationError('Invalid email or password');
    }

    // 4. Create session (example - implement actual session creation)
    const sessionToken = createSession(user);

    // 5. Log successful login
    logAuthEvent(email, 'login', { userId: user.id });

    // 6. Return session token
    res.json({
      message: 'Logged in successfully',
      token: sessionToken,
      csrfToken: res.locals.csrfToken, // New CSRF token for next request
    });
  })
);

/**
 * GET /api/applications
 * Get all applications (requires authentication)
 */
app.get(
  '/api/applications',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;

    // Check permission
    if (!canPerformAction(user.role, ResourceType.APPLICATION, ActionType.READ)) {
      throw new AuthorizationError(
        'You do not have permission to view applications'
      );
    }

    // Fetch applications based on user role
    let applications = [];
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
      applications = await getAllApplications();
    } else if (user.role === UserRole.APPLICANT) {
      applications = await getApplicationsByUser(user.id);
    } else {
      applications = await getApplicationsByDivision(user.division);
    }

    res.json(applications);
  })
);

/**
 * POST /api/applications
 * Submit a new application (requires authentication and CSRF token)
 */
app.post(
  '/api/applications',
  requireAuth,
  csrfProtection, // Validate CSRF token
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { title, description, category } = req.body;

    // Check permission
    if (!canPerformAction(user.role, ResourceType.APPLICATION, ActionType.CREATE)) {
      throw new AuthorizationError('You cannot submit applications');
    }

    // Validate required fields
    validateRequired({ title, description }, ['title', 'description']);

    // Validate field values
    validateStringLength(title, 'Title', 1, 200);
    validateStringLength(description, 'Description', 10, 5000);

    // Sanitize input
    const sanitizedTitle = sanitizeString(title);
    const sanitizedDescription = sanitizeString(description);

    // Create application
    const application = await createApplication({
      title: sanitizedTitle,
      description: sanitizedDescription,
      category,
      user_id: user.id,
      status: 'pending',
      created_at: new Date(),
    });

    // Log audit event
    logAudit(user.email, 'create_application', 'application', {
      applicationId: application.id,
      title: application.title,
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      application,
      csrfToken: res.locals.csrfToken, // New CSRF token
    });
  })
);

/**
 * PUT /api/applications/:id
 * Update an application
 */
app.put(
  '/api/applications/:id',
  requireAuth,
  csrfProtection,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { status, assignedTo, notes } = req.body;

    // Fetch application
    const application = await getApplicationById(id);
    if (!application) {
      throw new ValidationError('Application not found');
    }

    // Check permission based on action
    if (status === 'approved' || status === 'rejected') {
      if (!canPerformAction(user.role, ResourceType.APPLICATION, ActionType.APPROVE)) {
        throw new AuthorizationError('You cannot approve applications');
      }
    }

    if (assignedTo) {
      if (!canPerformAction(user.role, ResourceType.APPLICATION, ActionType.ASSIGN)) {
        throw new AuthorizationError('You cannot assign applications');
      }
    }

    // Update application
    const updated = await updateApplication(id, {
      status,
      assigned_to: assignedTo,
      notes,
      updated_at: new Date(),
    });

    // Log audit event
    logAudit(user.email, 'update_application', 'application', {
      applicationId: id,
      changes: { status, assignedTo },
    });

    res.json({
      message: 'Application updated successfully',
      application: updated,
      csrfToken: res.locals.csrfToken,
    });
  })
);

/**
 * DELETE /api/applications/:id
 * Delete an application (admin only)
 */
app.delete(
  '/api/applications/:id',
  requireAuth,
  requirePermission('application', 'delete'),
  csrfProtection,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;

    // Delete application
    await deleteApplication(id);

    // Log audit event
    logAudit(user.email, 'delete_application', 'application', {
      applicationId: id,
    });

    res.json({
      message: 'Application deleted successfully',
      csrfToken: res.locals.csrfToken,
    });
  })
);

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
app.get(
  '/api/admin/users',
  requireAuth,
  requirePermission('user', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const users = await getAllUsers();
    res.json(users);
  })
);

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
app.post(
  '/api/admin/users',
  requireAuth,
  requirePermission('user', 'create'),
  csrfProtection,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { email, name, role } = req.body;

    validateRequired({ email, name, role }, ['email', 'name', 'role']);
    validateEmail(email);

    const newUser = await createUser({
      email: email.toLowerCase(),
      name: sanitizeString(name),
      role,
    });

    logAudit(user.email, 'create_user', 'user', {
      userId: newUser.id,
      email: newUser.email,
      role,
    });

    res.status(201).json({
      message: 'User created successfully',
      user: newUser,
      csrfToken: res.locals.csrfToken,
    });
  })
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Global error handler (must be last middleware)
app.use(errorHandler);

// ============================================================================
// HELPER FUNCTIONS (Mock implementations)
// ============================================================================

async function findUserByEmail(email: string): Promise<any> {
  // Implementation: query database for user
  return null;
}

async function createUser(userData: any): Promise<any> {
  // Implementation: save to database
  return userData;
}

async function createSession(user: any): Promise<string> {
  // Implementation: create session token
  return 'session-token';
}

async function getAllApplications(): Promise<any[]> {
  // Implementation: query database
  return [];
}

async function getApplicationsByUser(userId: string): Promise<any[]> {
  // Implementation: query database
  return [];
}

async function getApplicationsByDivision(division: string): Promise<any[]> {
  // Implementation: query database
  return [];
}

async function createApplication(appData: any): Promise<any> {
  // Implementation: save to database
  return appData;
}

async function getApplicationById(id: string): Promise<any> {
  // Implementation: query database
  return null;
}

async function updateApplication(id: string, updates: any): Promise<any> {
  // Implementation: update in database
  return updates;
}

async function deleteApplication(id: string): Promise<void> {
  // Implementation: delete from database
}

async function getAllUsers(): Promise<any[]> {
  // Implementation: query database
  return [];
}

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`, { environment: process.env.NODE_ENV });
});

export default app;
