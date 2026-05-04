# Operations And Deployment

## Required Runtime

- Node.js 22 LTS or newer.
- PostgreSQL 16 or newer.
- HTTPS reverse proxy in production.
- Durable storage for uploads and backups.

## Environment Variables

Use `.env.production.example` as the production template.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Production yes | PostgreSQL connection string. |
| `PORT` | No | Server port, default `3000`. |
| `SESSION_TTL_HOURS` | No | Session lifetime, default `12`. |
| `UPLOAD_DIR` | Production yes | Durable upload root, outside the app folder. |
| `PG_BACKUP_DIR` | Production yes | Durable backup folder, outside the app folder. |
| `PG_BIN_DIR` | Often on Windows | PostgreSQL bin folder containing `pg_dump` and `pg_restore`. |
| `SUPER_ADMIN_PASSWORD` | Production yes | Strong password for super admin creation/repair. |
| `SEED_USER_PASSWORD` | Optional | Initial seeded user password. |
| `PGSSLMODE` | Depends | Set `require` if database provider requires SSL. |
| `TRUST_PROXY` | Production yes | Must be `true` behind HTTPS reverse proxy. |
| `DATA_SHARE_ALLOWED_ORIGINS` | If browser clients use shared API | Comma-separated allowed origins for `/api/shared-data/*` CORS. |

Production-safe storage example:

```env
UPLOAD_DIR="C:/ugc-it-service/uploads"
PG_BACKUP_DIR="C:/ugc-it-service/backups"
PG_BIN_DIR="C:/Program Files/PostgreSQL/18/bin"
```

Do not use `./public`, `./pg-backups`, or any path inside the app/release folder for production data.

## First Deployment

```powershell
npm.cmd ci
npm.cmd run db:migrate:pg
npm.cmd run build
npm.cmd run prod:preflight
npm.cmd run pg:backup
npm.cmd start
```

Health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/healthz
```

## Production Preflight

Run:

```powershell
npm.cmd run prod:preflight
```

Checks include required env vars, strong super admin password placeholder checks, writable upload/backup directories, production build, `pg_dump`, PostgreSQL connection, required tables, required migrations, active admin user, and password hashes.

Preflight must pass before release.

## Backup

Create backup:

```powershell
npm.cmd run pg:backup
```

The script writes a custom-format PostgreSQL dump to `PG_BACKUP_DIR`. It refuses to write inside the application folder when `NODE_ENV=production`.

## Restore

Restore to PostgreSQL:

```powershell
$env:CONFIRM_PG_RESTORE="YES"
npm.cmd run pg:restore -- C:\path\to\backup.dump
```

Restore procedure:

1. Stop the app.
2. Restore the database dump.
3. Restore matching `UPLOAD_DIR` files.
4. Start the app.
5. Verify `/healthz`.
6. Verify login and a known application record.

## Release Build

Create release zip:

```powershell
npm.cmd run release
```

Do not copy `.env.local`, `node_modules`, `data`, `backups`, `pg-backups`, logs, SQLite files, or local uploaded files to production.

## Process Manager

Production command:

```powershell
npm.cmd start
```

`scripts/start-production.mjs` starts `server.ts` with `NODE_ENV=production`.

Recommended process managers:

- PM2
- NSSM / Windows Service
- systemd
- hosting provider process manager

## Reverse Proxy And HTTPS

Production should expose only the HTTPS proxy publicly.

Required:

```env
TRUST_PROXY=true
```

The app sets secure cookies only when `NODE_ENV=production`. HTTPS is required so browsers accept those cookies correctly.

## Operational Checks

Before go-live:

- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run prod:preflight`
- `npm.cmd run pg:backup`
- restore test into a separate database
- manual UAT workflow pass

For controlled API sharing:

- Create one API client per external app.
- Grant only the scopes that app actually needs.
- Store the generated token in the external app secret store immediately; it is shown once.
- If the external app calls from browser JavaScript, add its origin to `DATA_SHARE_ALLOWED_ORIGINS`.
- If the external app embeds `/shared/reports?token=...`, add its origin to `DATA_SHARE_ALLOWED_ORIGINS` so production CSP permits framing.
- Revoke unused or compromised clients from System Settings.
- Review `last_used_at` periodically for stale or unexpected usage.
- Treat the `applications` scope as sensitive because it includes applicant contact and problem details.
- Treat the `reports` scope as sensitive because it exposes the same report dataset shown in the Reports menu.

Daily/weekly operations:

- Verify scheduled PostgreSQL backups.
- Verify upload folder backup.
- Review audit logs for failed mutations or suspicious activity.
- Monitor disk usage for upload and backup folders.
- Confirm `/healthz` from monitoring.

## Manual UAT Checklist

1. Employee submits application.
2. Divisional head forwards application.
3. Desk officer assigns one item to another provider.
4. Desk officer self-assigns one item.
5. Provider updates service info and status.
6. Self-assigned desk officer updates status after no items remain.
7. Print/PDF hides provider selection and status update controls.
8. Admin creates user with service provider feature.
9. Admin edits legacy provider-role user and confirms feature migration.
10. Reports and audit logs load for authorized users only.

## Known Maintainability Risks

- `src/App.tsx` is large and contains many screens. Future refactoring should split by feature area.
- There is no automated test suite yet. Add smoke tests before expanding production usage.
- Legacy SQLite support remains. Keep production on PostgreSQL.
