# Production Runbook

## Server Setup

1. Install Node.js 22 LTS or newer.
2. Install PostgreSQL 16 or newer.
3. Create the PostgreSQL role and database.
4. Copy the project to the server.
5. Copy `.env.production.example` to `.env.local` and replace every placeholder.
6. Keep `UPLOAD_DIR` and `PG_BACKUP_DIR` on durable storage outside temporary deploy folders.

## First Deployment

Run from the project folder in this exact order:

```powershell
npm.cmd ci
npm.cmd run db:migrate:pg
npm.cmd run db:check-migrations
npm.cmd run build
npm.cmd run prod:preflight
npm.cmd run pg:backup
npm.cmd start
```

Check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/healthz
```

Expected response should include `"schemaValid": true`.

## Deploy From Release Zip

On the development machine:

```powershell
npm.cmd run release
```

Copy the newest `releases/ugc-it-service-release-*.zip` file to the server, extract it, then create `.env.local` from `.env.production.example`.

**CRITICAL:** On the server, you MUST run migrations before starting:

```powershell
npm.cmd ci
npm.cmd run db:migrate:pg
npm.cmd run db:check-migrations
npm.cmd run start
```

Do not copy local `.env.local`, `data/`, `backups/`, `pg-backups/`, `node_modules/`, logs, or SQLite files to production.

## Database Migration Enforcement

**The server will refuse to start if PostgreSQL migrations are not applied.**

If you see an error like "Database schema validation failed", run:
```powershell
npm.cmd run db:migrate:pg
npm.cmd run db:check-migrations
```

Then try starting the server again.

## Process Manager

Use one of these for production:

- PM2 with `deploy/pm2.config.cjs`.
- NSSM or Windows Service using the notes in `deploy/windows-service-notes.md`.
- Hosting provider process manager.

The process must run `npm.cmd start` with `NODE_ENV=production`.

## Reverse Proxy And HTTPS

Terminate HTTPS in Nginx, IIS, Apache, or the hosting provider proxy.

Required production setting:

```env
TRUST_PROXY=true
```

Expose only the proxy publicly. Keep the Node.js port private to the server.

## Release Procedure

1. Take a PostgreSQL backup with `npm.cmd run pg:backup`.
2. Backup the `UPLOAD_DIR` folder.
3. Deploy the new code.
4. Run `npm.cmd ci`.
5. Run `npm.cmd run db:migrate:pg`.
6. Run `npm.cmd run build`.
7. Run `npm.cmd run prod:preflight`.
8. Restart the process manager.
9. Verify `/healthz` and login.

## Restore Procedure

Stop the app first, then restore the database:

```powershell
$env:CONFIRM_PG_RESTORE="YES"
npm.cmd run pg:restore -- D:\ugc-it-service\backups\backup-file.dump
```

Restore the matching `UPLOAD_DIR` backup before starting the app again.
