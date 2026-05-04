# UGC IT Service Request System (v5)

## Project Overview

A comprehensive digital IT service request management system for the **University Grants Commission (UGC) of Bangladesh ICT Division**. The system handles IT service requests from submission through approval, assignment, execution, and reporting with full audit logging.

**Live URL**: http://localhost:3000  
**Latest Commit**: Localize all numeric indicators to Bengali numerals  
**Last Updated**: May 2, 2026

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript + Tailwind CSS + Lucide Icons |
| **Backend** | Express 4 + TypeScript |
| **Database** | PostgreSQL 16 (prod) / SQLite 3 (dev) |
| **Build** | Vite 6 |
| **Testing** | Vitest + Jest |
| **Code Quality** | TypeScript strict mode |
| **Deployment** | Windows Service / PM2 / systemd |

---

## Key Features

### User Roles & Workflows
- **Employee**: Submit IT requests, track applications
- **Divisional Head**: Approve/forward applications
- **Desk Officer**: Assign approved items to service providers
- **Service Provider**: Execute services, update progress
- **Admin**: Manage users, roles, divisions, settings, audit logs

### Core Capabilities
- ✅ Multi-step application workflow (Submit → Approve → Assign → Execute → Report)
- ✅ Role-based access control with fine-grained permissions
- ✅ Real-time audit logging of all changes
- ✅ Print-friendly application forms and reports
- ✅ Data sharing API for approved external integrations
- ✅ Signature management and approval workflows
- ✅ Telephone directory with officer management
- ✅ PostgreSQL & SQLite dual-database support
- ✅ Automatic migration validation on startup

---

## Project Structure

```
ugc-it-service-request-system-v5/
├── src/
│   ├── App.tsx                    # Monolithic React UI (~11,000 lines)
│   ├── main.tsx                   # React entry point
│   ├── index.css                  # Tailwind styles
│   └── server/                    # Backend modules
│       ├── auth.ts                # Authentication logic
│       ├── csrf.ts                # CSRF protection
│       ├── permissions.ts         # Role-based permissions
│       ├── validation.ts          # Input validation
│       ├── rateLimiter.ts         # Rate limiting
│       ├── errors.ts              # Error handling
│       └── logger.ts              # Logging
├── server.ts                      # Express server & API
├── migrations/                    # PostgreSQL migrations
│   ├── 001_initial_postgres.sql
│   ├── 002_user_sessions.sql
│   ├── 003_assignment_normalization_and_tracking.sql
│   ├── 004_data_share_clients.sql
│   └── 005_data_share_access_logs.sql
├── scripts/
│   ├── db-migrate-postgres.mjs    # Run migrations
│   ├── db-backup.mjs              # Backup database
│   ├── pg-backup.mjs              # PostgreSQL backup
│   ├── prod-preflight.mjs         # Production checks
│   └── import_*.py                # Data import utilities
├── deploy/
│   ├── PRODUCTION_RUNBOOK.md      # Production deployment guide
│   └── windows-service-notes.md   # Windows Service setup
├── docs/                          # Comprehensive documentation
│   ├── ARCHITECTURE.md            # System architecture
│   ├── DATABASE.md                # Schema documentation
│   ├── API.md                     # API endpoints
│   ├── OPERATIONS.md              # Operational procedures
│   └── DEPLOYMENT_CHECKLIST.md    # Pre-deployment checks
├── tests/
│   └── unit/                      # Unit tests (Vitest)
├── .claude/
│   ├── launch.json                # Dev server configurations
│   └── worktrees/                 # Git worktrees
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript config
├── vite.config.ts                 # Vite configuration
└── .env.local                     # Local environment variables
```

---

## Getting Started

### Prerequisites
- **Node.js**: 22+
- **npm**: 10+
- **PostgreSQL**: 16+ (for production-like testing)
- **SQLite**: Built-in (for quick local testing)

### Installation

```powershell
# Install dependencies
npm install

# Copy environment template
Copy-Item .env.example .env.local

# Start dev server
npm run dev
```

Access the app at **http://localhost:3000**

### Environment Variables

Key variables in `.env.local`:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ugc_it_service
DATABASE_PATH=./data/database.sqlite

# Server
PORT=3000
NODE_ENV=development

# Session & Security
SESSION_TTL_HOURS=12
TRUST_PROXY=true

# Admin Account
SUPER_ADMIN_PASSWORD=<required-for-first-setup>

# Uploads & Backups
UPLOAD_DIR=./public/uploads
PG_BACKUP_DIR=./pg-backups
```

---

## Essential Commands

```powershell
# Development
npm run dev              # Start dev server with hot reload

# Building
npm run build           # Production build (Vite)
npm run preview         # Preview built app

# Testing
npm run test            # Run Vitest suite
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run test:integration # Integration tests (Jest)
npm run test:all        # lint + test + integration

# Code Quality
npm run lint            # TypeScript type checking

# Database
npm run db:migrate:pg   # Apply PostgreSQL migrations
npm run db:copy:pg      # Copy SQLite data to PostgreSQL
npm run db:backup       # Backup SQLite
npm run pg:backup       # Backup PostgreSQL
npm run pg:restore      # Restore PostgreSQL backup
npm run db:check-migrations # Validate migration status

# Production
npm run prod:prepare    # Build + migrate for production
npm run prod:preflight  # Pre-deployment checks
npm run start           # Start production server
npm run release         # Create release zip

# Documentation
npm run docs:pdf        # Generate PDF documentation
```

---

## Development Workflow

### Starting Dev Environment
```powershell
npm run dev
# Server starts on http://localhost:3000
# Automatic hot reload enabled
```

### Database Setup (PostgreSQL)

```powershell
# Create database & role first, then:
$env:DATABASE_URL="postgresql://user:pass@localhost:5432/ugc_it_service"

# Run migrations
npm run db:migrate:pg

# Copy existing SQLite data (one-time only)
$env:CONFIRM_PG_COPY="YES"
npm run db:copy:pg
```

### Making Changes

1. **Frontend**: Edit `src/App.tsx` (all React UI in one file)
2. **Backend**: Edit `server.ts` (Express routes & logic)
3. **Types**: Check type definitions at top of `src/App.tsx`
4. **Styles**: Use Tailwind classes in JSX
5. **Tests**: Add tests to `tests/unit/` directory

### Before Committing

```powershell
npm run lint            # Check for type errors
npm run test            # Run unit tests
npm run test:integration # Run integration tests
```

---

## Key Concepts

### Authentication
- **Session-based**: Database-backed HTTP-only cookies
- **Password hashing**: crypto.scrypt (secure, slow)
- **Rate limiting**: Per IP/email combination
- **Session TTL**: Configurable, default 12 hours

### Authorization
- **Role-based access control (RBAC)**: Multiple roles per user
- **Permission matrix**: Granular per-feature permissions
- **Extra permissions**: Can grant additional access
- **Denied permissions**: Can explicitly deny access
- **Admin override**: Super-admin can access everything

### Data Sharing
- **API tokens**: For external app integration
- **Scoped access**: Applications, reports, telephone directory, etc.
- **Read-only endpoints**: `/api/shared-data/*`
- **Access logging**: All external API calls logged
- **Rate limiting**: Prevents abuse

### Application Lifecycle
1. **Submitted**: Employee creates request
2. **Approved**: Divisional head approves
3. **Assigned**: Desk officer assigns to provider
4. **In Progress**: Service provider works on it
5. **Completed**: Marked as done
6. **Archived**: In reports

---

## Important Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | All React components, screens, and UI logic |
| `server.ts` | Express server, APIs, authentication, database adapter |
| `migrations/*.sql` | Database schema (PostgreSQL) |
| `.env.local` | Local environment configuration |
| `docs/ARCHITECTURE.md` | Detailed system architecture |
| `docs/API.md` | API endpoint documentation |
| `docs/DATABASE.md` | Database schema reference |

---

## Common Tasks

### Adding a New User Role

1. Update `AVAILABLE_FEATURES` in `src/App.tsx`
2. Define permissions in role management UI
3. Use `hasPermission()` to check access
4. Add role-specific UI screens

### Creating a Report

1. Define report layout in `src/App.tsx` ReportsPage component
2. Use `ApplicationList` or custom mapping
3. Format data for printing with CSS classes
4. Add export option (PDF via print dialog)

### Database Migration

1. Create `migrations/NNN_description.sql`
2. Use PostgreSQL syntax
3. Run `npm run db:migrate:pg`
4. Test with `npm run db:check-migrations`

### Deploying to Production

1. Run `npm run prod:preflight` to validate setup
2. Run `npm run prod:prepare` to build & migrate
3. Set `NODE_ENV=production`
4. Use process manager (PM2, systemd, Windows Service)
5. See `deploy/PRODUCTION_RUNBOOK.md` for full steps

---

## Localization

- **UI Language**: Bengali (Bangla) with English fallback
- **Numerals**: Bengali digits (०-९) used throughout
- **Dates**: dd/mm/yyyy format
- **Text**: All visible text hardcoded in Bengali in JSX

---

## Testing Strategy

- **Unit Tests**: Vitest for individual functions
- **Integration Tests**: Jest for API and database interactions
- **Coverage**: Focus on auth, permissions, validation
- **Manual Testing**: Forms, workflows, reports
- **Type Safety**: TypeScript strict mode catches errors

---

## Documentation

Comprehensive docs available in `docs/`:

- **ARCHITECTURE.md** - System design, data flow, auth model
- **DATABASE.md** - Schema, tables, relationships
- **API.md** - All endpoints, request/response formats
- **WORKFLOWS.md** - User journey, application lifecycle
- **OPERATIONS.md** - Maintenance, monitoring, troubleshooting
- **DEPLOYMENT_CHECKLIST.md** - Pre-deploy verification steps
- **SECRETS_MANAGEMENT.md** - Secure credential handling

Read these before making major changes!

---

## Performance Notes

- **Frontend**: Monolithic ~11KB file, can split components if needed
- **Database**: Optimize queries for 50M+ rows
- **Sessions**: Stored in DB, no in-memory cache (stateless)
- **Assets**: Served via Vite in dev, minified in prod
- **Rate limiting**: Prevents API abuse

---

## Support & References

- **Bug Reports**: Check existing issues in project
- **Questions**: Review `docs/QUICK_REFERENCE.md`
- **Code Style**: Follow existing patterns in App.tsx
- **Git History**: `git log` shows deployment patterns
- **Help**: Use `/help` in Claude Code

---

## Recent Changes

**Latest Commit**: Localize all numeric indicators to Bengali numerals
- Fixed `convertToBengaliNumeral()` function to use proper Bengali digits
- Applied conversion to 15+ locations where numbers are displayed
- Now shows Bengali numerals in System Settings, reports, and tables

**Previous**: Add automatic migration validation on server startup
- Validates PostgreSQL migrations on app start
- Prevents incompatible database state

---

## Quick Start Checklist

- [ ] Install Node 22+
- [ ] Run `npm install`
- [ ] Copy `.env.example` to `.env.local`
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Login with demo credentials
- [ ] Read `docs/ARCHITECTURE.md` for system overview
- [ ] Check `docs/API.md` for endpoint details

Good to go! 🚀
