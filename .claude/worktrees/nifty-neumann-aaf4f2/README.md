# UGC IT Service Request System

A digital IT service request system for the University Grants Commission of Bangladesh ICT Division.

## Documentation

Full codebase and database documentation is available in `docs/`:

- `docs/ARCHITECTURE.md`
- `docs/WORKFLOWS.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/OPERATIONS.md`

## Local Development

Prerequisites:

- Node.js 22+
- PostgreSQL 16+ for production-like testing, or SQLite for quick local-only testing

Setup:

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open `http://localhost:3000`.

## Environment

Important production variables:

- `DATABASE_URL`: PostgreSQL connection string. Required for production.
- `PORT`: server port. Defaults to `3000`.
- `SESSION_TTL_HOURS`: login session lifetime. Defaults to `12`.
- `UPLOAD_DIR`: persistent upload root. Defaults to `./public`.
- `PG_BACKUP_DIR`: PostgreSQL backup output folder. Defaults to `./pg-backups`.
- `PG_BIN_DIR`: optional PostgreSQL `bin` folder when `pg_dump` is not in PATH.
- `SUPER_ADMIN_PASSWORD`: required before creating or repairing the super-admin account.
- `SEED_USER_PASSWORD`: optional password for initial seeded users.
- `PGSSLMODE=require`: enable when the PostgreSQL provider requires SSL.
- `TRUST_PROXY=true`: enable only when the app runs behind a trusted HTTPS reverse proxy.

Do not commit `.env.local`, database files, backups, logs, or uploaded production files.

## PostgreSQL Migration

Create the database and app role first, then set `DATABASE_URL` in `.env.local`.

Run migrations:

```powershell
npm.cmd run db:migrate:pg
```

Copy existing SQLite data into PostgreSQL only once:

```powershell
$env:CONFIRM_PG_COPY="YES"
npm.cmd run db:copy:pg
```

`db:copy:pg` truncates the target PostgreSQL tables before importing. Do not run it against a live production database unless you intentionally want to replace the data.

## Production Build And Start

Prepare the app:

```powershell
npm.cmd run prod:prepare
```

Start the production server:

```powershell
npm.cmd start
```

In production, run the app behind a reverse proxy such as Nginx, IIS, or Apache with HTTPS enabled. Set `NODE_ENV=production` if your process manager does not use `npm.cmd start`.

Health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/healthz
```

Deployment templates are available in `deploy/`.

Production checklist:

```powershell
npm.cmd ci
npm.cmd run db:migrate:pg
npm.cmd run build
npm.cmd run prod:preflight
npm.cmd run pg:backup
```

Use `deploy/PRODUCTION_RUNBOOK.md` for the full server runbook.

Create a clean release zip:

```powershell
npm.cmd run release
```

## Production Storage

PostgreSQL is required for production traffic. SQLite should only be used for local testing.

Use a durable directory for uploads:

```env
UPLOAD_DIR="D:/ugc-it-service/uploads"
```

The app serves quick-link files from `/quick-links`. If the host recreates deploy folders on each release, keep `UPLOAD_DIR` outside the deploy folder.

## Backups

Production backups should use PostgreSQL tools, not the SQLite backup scripts:

```powershell
npm.cmd run pg:backup
```

Restore requires an explicit confirmation variable:

```powershell
$env:CONFIRM_PG_RESTORE="YES"
npm.cmd run pg:restore -- C:\path\to\backup.dump
```

Keep database backups and upload-directory backups together, because database records can reference uploaded files.

## Security Notes

- Sessions are stored in the database and expire according to `SESSION_TTL_HOURS`.
- Login attempts are throttled per IP/email combination.
- Basic production security headers are enabled by the server.
- Use HTTPS in production so secure cookies are accepted by browsers.
- Use a process manager such as PM2, Windows Service, systemd, or the hosting provider's process manager.
