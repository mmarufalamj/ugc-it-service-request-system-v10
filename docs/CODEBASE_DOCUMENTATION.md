# Codebase Documentation — UGC IT Service Request System

Date: 2026-04-28
Author: OpenCode Assistant

Purpose
- This document provides a consolidated, high-quality reference for the codebase, suitable for PDF export and onboarding new contributors.

Overview
- Tech stack: React (Vite) frontend, Express backend (TypeScript), SQLite for local/dev data, PostgreSQL for production migrations.
- Key directories: src/ (frontend/backbone), server.ts, validation.ts, and docs/ with architectural and operational guidance.
- Run and deployment patterns described in README and docs/OPERATIONS.md.

Repository Layout (high level)
- src/: Frontend components, App.tsx, and React app bootstrap.
- server.ts: Express server entrypoint, API wiring, middleware, and route registration.
- src/server/: Validation, authentication, authorization, rate limiting, logging, and error handling.
- docs/: Architecture, workflows, API references, operational runbooks.
- migrations/: PostgreSQL migration scripts.
- data/: Local SQLite data store for development and testing.
- scripts/: Utility scripts for migrations, backups, and data import.
- tests/: Unit tests and test setups.
- deploy/: Runbooks and deployment notes.
- public/: Static assets for UI.

Constituent Documentation (existing docs)
- ARCHITECTURE.md: System architecture and component boundaries.
- WORKFLOWS.md: End-to-end request workflows across roles.
- DATABASE.md: PostgreSQL schema and relationships.
- API.md: Express routes, authentication, and permissions.
- OPERATIONS.md: Production operations, backups, migrations, monitoring.
- README.md: Quick start, environment variables, and local dev steps.

Key Code Modules (high level)
- src/server/validation.ts: Input validation utilities and error handling.
- src/server/auth.ts: Authentication and session management scaffolding.
- src/server/permissions.ts: Role-based access control utilities.
- server.ts: Main server bootstrap, middleware, routing, and error handling.
- docs/ARCHITECTURE.md, docs/OPERATIONS.md, docs/API.md, docs/DATABASE.md: Publicly consumed references for architecture and operations.

Data Model (local)
- The local SQLite database (data/database.sqlite) contains a users table with fields including id, name, email, role, status, and related metadata. Roles include admin, divisional_head, desk_officer_*, employee, etc.
- Production uses PostgreSQL with migrations in migrations/*.sql.

Build, Run, and Deploy (summary)
- Local development: npm i, copy .env.example to .env.local, npm run dev.
- Production: use PostgreSQL; run migrations (npm run db:migrate:pg), build (npm run build), then start (npm run start).
- Backups and health checks documented in docs/OPERATIONS.md and README.

Security and Quality Notes
- Secrets should NOT be committed (use .env.local or a secret manager).
- Validation and permissions exist; ensure ongoing reviews for new endpoints.
- Tests exist under tests/; run via npm test.

Exporting to PDF/Word
- This Markdown document can be exported to PDF/Word using Pandoc. See docs/REPORT_CONVERSION_GUIDE.md for detailed commands.

Appendix – References
- ARCHITECTURE.md, WORKFLOWS.md, DATABASE.md, API.md, OPERATIONS.md in the docs/ folder.
