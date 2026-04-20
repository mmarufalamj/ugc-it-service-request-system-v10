# Production Deployment Checklist

This checklist ensures the application is production-ready and follows security and operational best practices.

## Pre-Deployment (1-2 weeks before)

### Code Quality
- [ ] All tests passing (`npm run test:all`)
- [ ] No TypeScript errors (`npm run lint`)
- [ ] Code review completed by 2+ team members
- [ ] No security vulnerabilities (`npm audit`)
- [ ] Test coverage >80% for critical paths

### Documentation
- [ ] [SERVER_MODULES.md](SERVER_MODULES.md) reviewed
- [ ] [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md) reviewed
- [ ] [ARCHITECTURE.md](ARCHITECTURE.md) updated
- [ ] API documentation current
- [ ] Runbook updated with new error codes

### Database
- [ ] All migrations tested on staging database
- [ ] Backup strategy verified
- [ ] Rollback plan documented
- [ ] Database user created with minimal required privileges
- [ ] Indexes created for performance-critical queries

### Security
- [ ] SSL/TLS certificates obtained and installed
- [ ] Firewall rules configured
- [ ] VPN/IP whitelist configured
- [ ] HTTPS enforced (no HTTP)
- [ ] Security headers tested ([Wormhole](https://wormhole.app))
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] File upload restrictions verified

### Infrastructure
- [ ] Server provisioned with latest security patches
- [ ] Node.js version confirmed (v18+ recommended)
- [ ] Log directory created with proper permissions
- [ ] Upload directory created with proper permissions
- [ ] Disk space verified (>10GB free)
- [ ] Memory verified (>2GB available)

---

## Deployment Day

### Pre-Deployment Checks (30 minutes before)

#### Environment Validation
- [ ] Production `.env` variables set
  - `NODE_ENV=production`
  - `DATABASE_URL` pointing to production database
  - `SUPER_ADMIN_PASSWORD` secure and unique
  - `UPLOAD_DIR` pointing to production storage
  - `TRUST_PROXY=true`
  - `LOG_LEVEL=info` (or appropriate level)

- [ ] Secrets validation
  ```bash
  npm run prod:preflight
  ```

#### Database Backup
- [ ] Full backup created
  ```bash
  npm run pg:backup
  ```
- [ ] Backup file verified and stored safely
- [ ] Restore procedure tested on separate server

#### Service Health Check
- [ ] Database connectivity verified
  ```bash
  psql $DATABASE_URL -c "SELECT 1"
  ```
- [ ] File upload directory writable
  ```bash
  touch /var/data/ugc-uploads/.test && rm /var/data/ugc-uploads/.test
  ```
- [ ] Internet connectivity for any external services

### Deployment Steps

#### 1. Build Application
```bash
npm ci --production
npm run build
```

#### 2. Migrate Database
```bash
npm run db:migrate:pg
```

#### 3. Start Application
```bash
# Using PM2
pm2 start deploy/pm2.config.cjs --env production

# Or using systemd
sudo systemctl start ugc-service
```

#### 4. Health Checks
```bash
# Wait 10 seconds for startup
sleep 10

# Check application is responding
curl -s https://app.example.com/api/health | jq .

# Check logs for errors
sudo journalctl -u ugc-service -n 50

# Check process is running
pm2 list
```

---

## Post-Deployment (1 hour after)

### Monitoring

- [ ] Application responding to requests (no 500 errors)
- [ ] Database queries executing normally
- [ ] Log files being created and rotated
- [ ] No spike in error rate
- [ ] Response times normal (<200ms)
- [ ] Memory usage stable
- [ ] CPU usage <30%

### Functional Testing

- [ ] Super admin can log in
- [ ] Users can view applications
- [ ] Users can submit applications
- [ ] Users can edit own applications
- [ ] Admins can approve/reject applications
- [ ] Officers can assign applications
- [ ] File uploads working
- [ ] Workflow transitions working
- [ ] Audit logs being recorded

### Security Testing

- [ ] HTTPS redirect working
- [ ] CSRF tokens generated
- [ ] Rate limiting working (test with ab/wrk)
- [ ] Invalid input rejected
- [ ] Session cookies HttpOnly and Secure
- [ ] No secrets in logs
- [ ] Security headers present

### Integration Testing

- [ ] Data sharing API working (if applicable)
- [ ] Email notifications sending (if applicable)
- [ ] File exports working
- [ ] Reports generating

---

## Monitoring (Ongoing)

### Daily

- [ ] No critical errors in logs
- [ ] Application uptime >99.9%
- [ ] Database size within limits
- [ ] Response times <200ms median

### Weekly

- [ ] Review error logs for patterns
- [ ] Check disk usage
- [ ] Verify backups completed
- [ ] Check rate limit violations (possible attack?)

### Monthly

- [ ] Rotate secrets/passwords
- [ ] Review access logs
- [ ] Performance optimization (slow queries)
- [ ] Update dependencies (security patches)
- [ ] Review security incidents

### Quarterly

- [ ] Load testing (simulate peak traffic)
- [ ] Disaster recovery drill
- [ ] Security audit
- [ ] Architecture review

---

## Rollback Procedure (If Problems)

### Quick Rollback (< 5 minutes)

If application won't start or has critical errors:

```bash
# 1. Stop current deployment
pm2 stop ugc-service

# 2. Restore previous version from deployment backup
cd /var/www/ugc-service
git checkout HEAD~1

# 3. Rebuild and restart
npm ci --production
npm run build
pm2 start deploy/pm2.config.cjs

# 4. Verify
curl -s https://app.example.com/api/health
```

### Database Rollback (If migration failed)

```bash
# 1. Restore from backup
npm run pg:restore

# 2. Verify schema
psql $DATABASE_URL -c "\dt"

# 3. Restart application
pm2 restart ugc-service
```

### Full System Rollback (Major issues)

```bash
# 1. Restore previous application version entirely
# 2. Restore previous database from backup
# 3. Test all critical functionality
# 4. Document what went wrong
# 5. Schedule postmortem
```

**Post-Rollback:** Do NOT immediately re-deploy. Investigate root cause first.

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
journalctl -u ugc-service -n 100

# Common issues:
# - Missing environment variables
# - Database connection failure
# - File permissions on logs/uploads directory
# - Port already in use
```

### High Error Rate

```bash
# Check latest errors
tail -f logs/error.log

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM applications;"

# Check disk space
df -h

# Check memory
free -h
```

### Slow Performance

```bash
# Check slow queries
psql $DATABASE_URL -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Check connections
psql $DATABASE_URL -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Check process
ps aux | grep node
```

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check firewall
telnet db.example.com 5432

# Check connection string format
# postgresql://user:password@host:5432/database
```

---

## Success Criteria

✅ Deployment is successful when:

1. Application is responding to requests
2. All critical functionality working
3. No unexpected errors in logs
4. Monitoring shows normal metrics
5. Team can log in and perform basic tasks
6. Database is accessible and responsive
7. File uploads and downloads working
8. Audit logs recording events

❌ Rollback if:

1. Critical routes returning 500 errors
2. Cannot connect to database
3. Error rate >1% (for >1 minute)
4. Response time >2000ms median
5. File uploads not working
6. Users cannot authenticate
7. Application memory growing unbounded

---

## Post-Deployment Communication

### To Users
- [ ] Application is now live
- [ ] What's new (features, fixes)
- [ ] Any known limitations
- [ ] Support contact

### To Team
- [ ] Deployment completed successfully
- [ ] Monitoring dashboard URL
- [ ] On-call contacts
- [ ] Escalation procedures

### To Stakeholders
- [ ] Deployment completed
- [ ] System uptime
- [ ] User feedback/metrics
- [ ] Next planned updates

---

## Reference Documentation

- [SERVER_MODULES.md](SERVER_MODULES.md) - New production modules
- [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md) - Handling secrets
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [OPERATIONS.md](OPERATIONS.md) - Operational procedures
- [PRODUCTION_RUNBOOK.md](PRODUCTION_RUNBOOK.md) - Operational tasks

---

## Sign-Off

- [ ] DevOps Engineer: __________________ Date: __________
- [ ] Technical Lead: __________________ Date: __________
- [ ] Product Owner: __________________ Date: __________

**Deployment completed at:** ___________  
**Deployed by:** ___________  
**Approved by:** ___________
