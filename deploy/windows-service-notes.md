# Windows Production Service Notes

Use either PM2 or NSSM to keep the app running after reboot.

## PM2

```powershell
npm.cmd install -g pm2
npm.cmd run prod:prepare
pm2 start deploy/pm2.config.cjs
pm2 save
```

For Windows startup persistence, install a PM2 startup helper approved by the server administrator, or use NSSM.

## NSSM

Install service:

```powershell
nssm install UGCITService
```

Recommended fields:

- Application path: `C:\Program Files\nodejs\node.exe`
- Startup directory: project root
- Arguments: `scripts/start-production.mjs`
- Environment: load the same variables from `.env.local`

After installing:

```powershell
nssm start UGCITService
```

Use `/healthz` to confirm the app and database are reachable.
