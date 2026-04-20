# Secrets Management Best Practices

This guide covers secure handling of secrets, API keys, and sensitive configuration in the UGC IT Service Request System.

## Overview

Secrets include:
- Database connection strings and passwords
- API keys and tokens
- Encryption keys
- Third-party service credentials
- Session secrets

**Golden Rule:** Never commit secrets to version control.

---

## Environment Variables

### Current Implementation

The project uses `.env` files with the following structure:

```
.env                 # Default/shared configuration
.env.local          # Local overrides (gitignored)
.env.production     # Production values (never commit!)
```

### Setup Instructions

#### Development

1. Create `.env.local`:
```bash
cp .env.production.example .env.local
```

2. Edit with your local values:
```
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost/ugc_dev
SUPER_ADMIN_PASSWORD=Dev@12345
UPLOAD_DIR=/tmp/uploads
```

#### Production

1. **Never use `.env.local` in production**
2. Set environment variables on the server directly:

```bash
export NODE_ENV=production
export DATABASE_URL=postgresql://prod_user:prod_pass@db.prod.example.com/ugc
export SUPER_ADMIN_PASSWORD=<secure-password>
export UPLOAD_DIR=/var/data/ugc-uploads
export TRUST_PROXY=true
```

Or via systemd service file:

```ini
[Service]
Environment="NODE_ENV=production"
Environment="DATABASE_URL=postgresql://..."
Environment="SUPER_ADMIN_PASSWORD=..."
```

Or PM2 ecosystem file:

```javascript
module.exports = {
  apps: [{
    name: 'ugc-service',
    script: './server.ts',
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: process.env.DATABASE_URL,
      SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD,
    }
  }]
};
```

---

## Secret Categories

### 1. Database Credentials

**What:** PostgreSQL connection string with password

**File:** `.env` → `DATABASE_URL`

**Example:**
```
DATABASE_URL=postgresql://ugc_user:Secure@Pass123@db.example.com:5432/ugc_prod
```

**Security:**
- ✅ Use strong passwords (20+ characters)
- ✅ Limit database user to only needed tables
- ✅ Use read-only replicas for reports
- ❌ Never hardcode in application code
- ❌ Never log connection strings

**Rotation:**
- Change password every 90 days
- Use automated rotation via database management tools

### 2. Admin Password

**What:** Scrypt-hashed password for super admin account

**File:** `.env` → `SUPER_ADMIN_PASSWORD`

**Example:**
```
SUPER_ADMIN_PASSWORD=SecureAdminP@ssw0rd!2024
```

**Security:**
- ✅ Use 20+ character password with mixed case, numbers, special chars
- ✅ Store in secrets vault in production
- ✅ Hash with scrypt before database storage
- ❌ Never use default or weak passwords
- ❌ Never email as plain text

**Handling:**
```bash
# Generate strong password
openssl rand -base64 16

# Use with environment variable
export SUPER_ADMIN_PASSWORD="Generated@Pass123"
```

### 3. Session Secrets

**What:** Keys for signing session cookies

**File:** Generated at runtime if not provided

**Example:**
```
SESSION_SECRET=your-256-bit-secret-key
```

**Security:**
- ✅ Generate cryptographically secure random keys
- ✅ Keep separate from other secrets
- ✅ Rotate on security incidents
- ❌ Don't share between environments

### 4. Third-party API Keys

**What:** Keys for external services (email, file storage, etc.)

**File:** `.env` → Service-specific variables

**Example:**
```
SENDGRID_API_KEY=SG.xxxx...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

**Security:**
- ✅ Store in environment variables
- ✅ Use scoped/limited API keys
- ✅ Regularly audit API key usage
- ✅ Rotate keys if exposed
- ❌ Commit API keys to Git
- ❌ Log API keys in requests/responses

### 5. Encryption Keys

**What:** Keys for encrypting sensitive data at rest

**File:** `.env` → `ENCRYPTION_KEY`

**Example:**
```
ENCRYPTION_KEY=<64-character-hex-string>
```

**Security:**
- ✅ Generate with `crypto.randomBytes(32).toString('hex')`
- ✅ Store securely, separate from application
- ✅ Back up and version control locally only
- ❌ Store alongside encrypted data
- ❌ Use weak or default keys

---

## Secret Management Strategies

### Strategy 1: Environment Variables (Current)

**When to use:** Small deployments, single server

**Pros:**
- Simple setup
- No additional tools
- Works with most deployment platforms

**Cons:**
- Visible in process list
- Logged in environment dumps
- Difficult to rotate
- No audit trail

**Implementation:**
```bash
# On Ubuntu/Linux
export DATABASE_URL="postgresql://..."

# On Windows
set DATABASE_URL=postgresql://...

# Verify (don't print secret!)
echo $DATABASE_URL | head -c 20

# Via systemd
sudo systemctl set-environment DATABASE_URL="..."
```

### Strategy 2: Secrets File (For Scaling)

**When to use:** Multiple servers, need rotation

**Implementation:**
```bash
# Create secrets file with restricted permissions
sudo mkdir -p /etc/ugc-service
sudo touch /etc/ugc-service/secrets.env
sudo chmod 600 /etc/ugc-service/secrets.env

# Load in systemd
[Service]
EnvironmentFile=/etc/ugc-service/secrets.env
```

**File format:**
```
DATABASE_URL=postgresql://...
SUPER_ADMIN_PASSWORD=...
SESSION_SECRET=...
```

### Strategy 3: Secrets Manager (Recommended for Production)

**When to use:** Enterprise deployment, compliance requirements

**Options:**

#### HashiCorp Vault
```bash
# Install and setup Vault
vault server -dev

# Store secret
vault kv put secret/ugc-service DATABASE_URL=postgresql://...

# Retrieve in application
vault kv get secret/ugc-service
```

#### AWS Secrets Manager
```bash
# Store secret
aws secretsmanager create-secret \
  --name ugc-service/database \
  --secret-string '{"username":"user","password":"pass"}'

# Retrieve in Node.js
const { SecretsManager } = require('@aws-sdk/client-secrets-manager');
const client = new SecretsManager();
const secret = await client.getSecretValue({ SecretId: 'ugc-service/database' });
```

#### Azure Key Vault
```bash
# Store secret
az keyvault secret set --vault-name ugc-vault --name database-url --value postgresql://...

# Retrieve in Node.js
const { SecretClient } = require('@azure/keyvault-secrets');
const client = new SecretClient(vaultUrl, new DefaultAzureCredential());
const secret = await client.getSecret('database-url');
```

#### Docker Secrets (if using Docker Swarm)
```bash
# Create secret
echo "postgresql://..." | docker secret create db-url -

# Use in compose
services:
  app:
    secrets:
      - db-url
secrets:
  db-url:
    external: true
```

---

## Secret Rotation

### Database Password Rotation

```bash
# 1. Generate new password
NEW_PASS=$(openssl rand -base64 16)

# 2. Update in database
psql -h db.example.com -U admin << EOF
ALTER USER ugc_user WITH PASSWORD '$NEW_PASS';
EOF

# 3. Update in vault/environment
vault kv put secret/ugc-service DATABASE_URL="postgresql://ugc_user:$NEW_PASS@..."

# 4. Restart application
systemctl restart ugc-service

# 5. Verify connectivity
curl https://app.example.com/api/health
```

### API Key Rotation

For third-party services:

```bash
# 1. Create new API key in external service
# 2. Update environment variable
export SENDGRID_API_KEY="new-key..."

# 3. Restart application
systemctl restart ugc-service

# 4. Verify service connectivity
# 5. Disable old API key
# 6. Document rotation in audit log
```

### Session Secret Rotation

```bash
# Generate new secret
NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Update environment
export SESSION_SECRET="$NEW_SECRET"

# Restart application (existing sessions will be invalidated)
systemctl restart ugc-service

# Users will need to log in again
```

---

## Preventing Secret Leaks

### 1. Git Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Prevent committing secrets

# Check for .env.local, .env.production
git diff --cached --name-only | grep -E '\.env|secrets' && {
    echo "ERROR: You are about to commit secrets!"
    echo "Refusing to commit files containing secrets"
    exit 1
}

# Check for common secret patterns
git diff --cached | grep -E 'password|api.?key|secret|token' && {
    echo "WARNING: Possible secrets detected"
    read -p "Continue anyway? (y/n) " -n 1 -r
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
}
```

### 2. .gitignore

```
# Secrets
.env
.env.local
.env.production
.env.*.local
secrets/
*.key
*.pem
```

### 3. Code Scanning

Use automated secret scanning:

```bash
# Install git-secrets
brew install git-secrets

# Add patterns
git secrets --add 'password\s*=.*'
git secrets --add 'api.?key\s*=.*'
git secrets --add 'secret\s*=.*'

# Scan repository
git secrets --scan
```

---

## Deployment Secrets Checklist

Before deploying to production:

- [ ] Database password is 20+ characters with mixed case, numbers, special chars
- [ ] All environment variables are set on the server
- [ ] No `.env.local` or `.env.production` files in Docker image or deployment
- [ ] Secrets are not logged in application or system logs
- [ ] Application can access all required secrets during startup
- [ ] Secret rotation policy is documented
- [ ] Audit log captures secret changes
- [ ] Team members have access to secrets vault/manager
- [ ] Secrets backup exists and is encrypted
- [ ] Emergency access procedures are documented

---

## Secret Access Policies

### Who Should Have Access

```
DATABASE_PASSWORD
├── Database administrators
├── DevOps engineers
├── Application developers (via vault)
└── CI/CD system

API_KEYS
├── Service owner
├── Backend engineers (via vault)
└── CI/CD system

ADMIN_PASSWORD
├── System administrator
├── DevOps engineer (emergency only)
└── (Not shared with individual users)
```

### Logging Secret Access

```typescript
import { logAudit } from '@/server/logger';

export const rotateSecret = async (secretName: string) => {
  logAudit('admin@example.com', 'rotate_secret', 'secrets', {
    secretName,
    timestamp: new Date().toISOString(),
    status: 'success'
  });
};
```

---

## Incident Response

### If a Secret is Exposed

1. **Immediately rotate** the compromised secret
2. **Revoke** any tokens or API keys associated with the secret
3. **Audit logs** to find if secret was used by unauthorized parties
4. **Update** all systems that use the secret
5. **Monitor** for suspicious activity
6. **Document** the incident and response
7. **Brief** the team on prevention

Example:

```bash
# If database password is exposed:
1. Change password in PostgreSQL
2. Update DATABASE_URL environment variable
3. Restart application
4. Check logs for unauthorized access
5. Document in incident tracker
6. Schedule post-mortem
```

---

## Testing Secrets Management

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('Secrets Loading', () => {
  it('should load required environment variables', () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.SUPER_ADMIN_PASSWORD).toBeDefined();
  });

  it('should fail if critical secret is missing', () => {
    delete process.env.SUPER_ADMIN_PASSWORD;
    expect(() => validateProductionEnvironment()).toThrow();
  });

  it('should not expose secrets in logs', () => {
    const log = JSON.stringify({ error: 'Auth failed', password: '...' });
    expect(log).not.toContain(process.env.SUPER_ADMIN_PASSWORD);
  });
});
```

### Integration Tests

```bash
# Test that application starts without .env.local
# Test that all required secrets are validated
# Test that invalid secrets are rejected
```

---

## References

- [OWASP: Secrets Management](https://owasp.org/www-project-web-security-testing-guide/)
- [12 Factor App: Config](https://12factor.net/config)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/nodejs-security/)
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
