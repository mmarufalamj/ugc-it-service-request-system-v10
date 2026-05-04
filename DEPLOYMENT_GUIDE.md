# UGC IT Service Request System - Ubuntu VM Deployment Guide

**VM Details:**
- IP: 203.96.189.60
- Username: bdren
- OS: Ubuntu

---

## Phase 1: System Setup (Run on VM)

### Step 1: Connect to your VM
```bash
ssh bdren@203.96.189.60
# Password: @dmin@User@Ugc
```

### Step 2: Update system packages
```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### Step 3: Install Node.js 22+ and npm
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # Verify (should be v22+)
npm -v   # Verify (should be v10+)
```

### Step 4: Install PostgreSQL 16
```bash
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get install -y postgresql-16

# Start PostgreSQL and enable at boot
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### Step 5: Install Nginx
```bash
sudo apt-get install -y nginx

# Start Nginx and enable at boot
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Step 6: Install additional tools
```bash
sudo apt-get install -y git curl wget build-essential python3 certbot python3-certbot-nginx
```

---

## Phase 2: Project Setup (Run on VM)

### Step 7: Create application directory and clone project
```bash
# Create directory
sudo mkdir -p /var/www/ugc-it-service
sudo chown -R bdren:bdren /var/www/ugc-it-service
cd /var/www/ugc-it-service

# Clone the project (replace with your actual repo URL)
git clone <YOUR_REPO_URL> .
# OR if you have a zip file, upload and extract it
```

### Step 8: Install dependencies
```bash
npm install
```

### Step 9: Set up PostgreSQL database and user
```bash
# Connect to PostgreSQL as the default postgres user
sudo -u postgres psql

# Run these commands in the PostgreSQL prompt:
CREATE USER ugc_app WITH ENCRYPTED PASSWORD 'ugc@2026';
CREATE DATABASE ugc_it_service OWNER ugc_app;
GRANT ALL PRIVILEGES ON DATABASE ugc_it_service TO ugc_app;
\q  # Exit PostgreSQL
```

### Step 10: Create .env.local for production
```bash
cd /var/www/ugc-it-service

# Create the .env.local file
cat > .env.local << 'ENVFILE'
# Database (Production - PostgreSQL)
DATABASE_URL="postgresql://ugc_app:ugc%402026@localhost:5432/ugc_it_service"
PORT=3000
NODE_ENV=production
SESSION_TTL_HOURS=12

# Security & Admin
SUPER_ADMIN_PASSWORD="GqmZAaujV_xL%FiosUyz8P4hD-Qf"
SEED_USER_PASSWORD=""
TRUST_PROXY=true

# Uploads & Backups (use /var/www paths on production)
UPLOAD_DIR="/var/www/ugc-it-service/public/uploads"
PG_BACKUP_DIR="/var/www/ugc-it-service/backups"

# SSL Mode
PGSSLMODE=""
ENVFILE

# Create necessary directories
mkdir -p public/uploads backups
```

### Step 11: Restore database from dump
```bash
# Restore the PostgreSQL database from the dump file
npm run pg:restore

# Or manually with psql:
sudo -u postgres psql ugc_it_service < pg-backups/ugc-it-service-latest.sql
```

### Step 12: Build the application
```bash
npm run build
```

### Step 13: Install PM2 (Process Manager)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem config
cat > ecosystem.config.cjs << 'PMFILE'
module.exports = {
  apps: [{
    name: 'ugc-it-service',
    script: './server.ts',
    exec_interpreter: 'node',
    exec_mode: 'fork',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/ugc-it-service/logs/error.log',
    out_file: '/var/www/ugc-it-service/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
PMFILE

# Create logs directory
mkdir -p logs

# Start the application with PM2
pm2 start ecosystem.config.cjs
pm2 save
sudo env PATH=$PATH:/usr/local/bin pm2 startup systemd -u bdren --hp /home/bdren
```

---

## Phase 3: Nginx Configuration (Run on VM)

### Step 14: Configure Nginx as reverse proxy
```bash
# Backup original config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak

# Create new Nginx config
sudo tee /etc/nginx/sites-available/default > /dev/null << 'NGINXFILE'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 203.96.189.60;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINXFILE

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Phase 4: SSL/TLS Setup (Optional but Recommended)

### Step 15: Set up SSL with Let's Encrypt (if you have a domain)
```bash
# If you have a domain pointing to 203.96.189.60, run:
sudo certbot --nginx -d your-domain.com

# If you don't have a domain yet, skip this and use IP-based access for now
```

### To enable SSL after obtaining certificate:
```bash
# Update Nginx config to redirect HTTP to HTTPS
sudo sed -i 's/# return 301/return 301/g' /etc/nginx/sites-available/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## Phase 5: Verification & Testing

### Step 16: Verify the application is running
```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs ugc-it-service

# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t
```

### Step 17: Access the application
Open your browser and go to:
```
http://203.96.189.60
```

You should see the login page with Bengali text.

---

## Phase 6: Backup and Maintenance

### Step 18: Set up automated backups
```bash
# Create backup script
cat > /var/www/ugc-it-service/backup.sh << 'BACKUPFILE'
#!/bin/bash
BACKUP_DIR="/var/www/ugc-it-service/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/ugc-it-service_$TIMESTAMP.dump"

mkdir -p $BACKUP_DIR
pg_dump postgresql://ugc_app:ugc@2026@localhost:5432/ugc_it_service --format=custom > $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
BACKUPFILE

chmod +x /var/www/ugc-it-service/backup.sh

# Add cron job for daily backups (run at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/ugc-it-service/backup.sh") | crontab -
```

### Step 19: Monitor the application
```bash
# View real-time logs
pm2 logs ugc-it-service --lines 100

# Monitor system resources
pm2 monit
```

---

## Troubleshooting

### If the application won't start:
```bash
# Check PM2 logs
pm2 logs ugc-it-service

# Restart the application
pm2 restart ugc-it-service

# Stop and start fresh
pm2 stop ugc-it-service
pm2 delete ugc-it-service
pm2 start ecosystem.config.cjs
```

### If Nginx isn't proxying correctly:
```bash
# Check Nginx syntax
sudo nginx -t

# View Nginx error log
sudo tail -f /var/log/nginx/error.log

# View Nginx access log
sudo tail -f /var/log/nginx/access.log
```

### If PostgreSQL connection fails:
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U ugc_app -h localhost -d ugc_it_service -c "SELECT version();"
```

---

## Important Security Notes

1. **Change default passwords** - Update the SUPER_ADMIN_PASSWORD in .env.local
2. **Enable firewall**:
   ```bash
   sudo ufw enable
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp   # HTTP
   sudo ufw allow 443/tcp  # HTTPS
   ```
3. **Use SSH keys** instead of password authentication
4. **Set up SSL/TLS** with a proper domain and certificate
5. **Regular backups** - The cron job above does this
6. **Update system regularly**:
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   ```

---

## Quick Command Reference

```bash
# View application logs
pm2 logs ugc-it-service

# Restart application
pm2 restart ugc-it-service

# Check database connection
psql -U ugc_app -d ugc_it_service

# Backup database
npm run pg:backup

# Check Nginx status
sudo systemctl status nginx

# Reload Nginx after config changes
sudo systemctl reload nginx
```

---

**Your application should now be running at: http://203.96.189.60**

For production domains, configure DNS and SSL after obtaining a certificate.
