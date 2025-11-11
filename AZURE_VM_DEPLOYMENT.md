# Azure VM Deployment Guide

## Prerequisites
- Azure VM (Ubuntu 20.04 or 22.04 recommended)
- SSH access to the VM
- Domain/DNS configured (optional)
- Azure Storage Account credentials (already configured)

## Step 1: Connect to Your Azure VM

```bash
ssh your-username@your-vm-ip-or-domain
```

## Step 2: Install Node.js 20 using NVM

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

## Step 3: Install System Dependencies

```bash
# Update system packages
sudo apt-get update

# Install required system packages for Chromium
sudo apt-get install -y \
    chromium-browser \
    fonts-liberation \
    fonts-noto-core \
    fonts-noto-unhinted \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils

# Install PM2 for process management
npm install -g pm2
```

## Step 4: Clone and Setup the Application

```bash
# Navigate to your preferred directory
cd /home/your-username

# Clone the repository
git clone https://github.com/shimna8/healthbot-backend.git
cd healthbot-backend

# Install dependencies
npm install

# The postinstall script will automatically handle Chromium setup
```

## Step 5: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add the following content (replace with your actual values):

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Azure Health Bot
HEALTH_BOT_APP_SECRET=your-health-bot-secret
HEALTH_BOT_TENANT_NAME=your-tenant-name

# Azure Storage Account
AZURE_STORAGE_ACCOUNT_NAME=lungprojectstorage
AZURE_STORAGE_ACCOUNT_KEY=your-storage-account-key
AZURE_STORAGE_CONTAINER_NAME=lungpdf

# Azure Key Vault (Optional)
AZURE_KEY_VAULT_NAME=your-keyvault-name
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Local Storage (Optional - for development/testing)
# USE_LOCAL_STORAGE=true
# LOCAL_STORAGE_PATH=./pdfs
# LOCAL_STORAGE_BASE_URL=http://your-domain.com/pdfs

# CORS Configuration
ALLOWED_ORIGINS=https://your-wordpress-site.com,https://www.your-wordpress-site.com
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 6: Test the Application

```bash
# Test run
node server.js
```

You should see:
```
==================================================
🚀 Health Bot Backend Server Started
📍 Port: 3000
🌍 Environment: production
...
==================================================
```

Press Ctrl+C to stop the test run.

## Step 7: Setup PM2 for Production

```bash
# Start the application with PM2
pm2 start server.js --name healthbot-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Follow the command that PM2 outputs (it will be something like):
# sudo env PATH=$PATH:/home/username/.nvm/versions/node/v20.x.x/bin pm2 startup systemd -u username --hp /home/username
```

## Step 8: Configure Nginx as Reverse Proxy (Recommended)

```bash
# Install Nginx
sudo apt-get install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/healthbot-backend
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Increase timeouts for PDF generation
    proxy_connect_timeout 300;
    proxy_send_timeout 300;
    proxy_read_timeout 300;
    send_timeout 300;

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
    }

    # Serve static PDF files if using local storage
    location /pdfs/ {
        alias /home/your-username/healthbot-backend/pdfs/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

Save and exit, then:

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/healthbot-backend /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

## Step 9: Setup SSL with Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts and choose to redirect HTTP to HTTPS
```

Certbot will automatically configure Nginx for HTTPS and set up auto-renewal.

## Step 10: Configure Azure Network Security Group (NSG)

In Azure Portal:
1. Go to your VM → Networking → Network Security Group
2. Add inbound security rules:
   - **HTTP**: Port 80, Source: Any, Priority: 100
   - **HTTPS**: Port 443, Source: Any, Priority: 110
   - **SSH**: Port 22, Source: Your IP (for security), Priority: 120

## Step 11: Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs healthbot-backend

# Check Nginx status
sudo systemctl status nginx

# Test the API locally
curl http://localhost:3000/health

# Test from outside (replace with your domain/IP)
curl http://your-domain.com/health
```

## Step 12: Test PDF Generation

```bash
# Test HTML to PDF endpoint
curl -X POST http://localhost:3000/api/html-pdf \
  -H "Content-Type: application/json" \
  -d '{"lang":"en"}' \
  | jq
```

You should get a response with a PDF URL.

## Useful PM2 Commands

```bash
# View logs
pm2 logs healthbot-backend

# Restart application
pm2 restart healthbot-backend

# Stop application
pm2 stop healthbot-backend

# Delete from PM2
pm2 delete healthbot-backend

# Monitor resources
pm2 monit

# View detailed info
pm2 info healthbot-backend
```

## Updating the Application

```bash
# Navigate to app directory
cd /home/your-username/healthbot-backend

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Restart with PM2
pm2 restart healthbot-backend

# Check logs for any errors
pm2 logs healthbot-backend --lines 50
```

## Troubleshooting

### Issue: Chromium not found
```bash
# Check if @sparticuz/chromium is installed
ls -la node_modules/@sparticuz/chromium

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Permission errors
```bash
# Ensure correct ownership
sudo chown -R $USER:$USER /home/your-username/healthbot-backend

# Check PM2 is running as correct user
pm2 status
```

### Issue: Port 3000 already in use
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill -9 PID
```

### Issue: PDF generation fails
```bash
# Check Chromium installation
which chromium-browser

# Check logs
pm2 logs healthbot-backend --lines 100

# Test Chromium manually
chromium-browser --version
```

## Monitoring and Maintenance

### Setup Log Rotation
```bash
# PM2 handles log rotation automatically, but you can configure it:
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Monitor Disk Space
```bash
# Check disk usage
df -h

# Clean old PDFs if using local storage
find /home/your-username/healthbot-backend/pdfs -type f -mtime +7 -delete
```

### Setup Automated Backups
```bash
# Create backup script
nano ~/backup-healthbot.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/home/your-username/backups"
APP_DIR="/home/your-username/healthbot-backend"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/healthbot-backup-$DATE.tar.gz \
    $APP_DIR/.env \
    $APP_DIR/package.json \
    $APP_DIR/package-lock.json

# Keep only last 7 backups
ls -t $BACKUP_DIR/healthbot-backup-*.tar.gz | tail -n +8 | xargs rm -f
```

Make executable and add to crontab:
```bash
chmod +x ~/backup-healthbot.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line: 0 2 * * * /home/your-username/backup-healthbot.sh
```

## Security Best Practices

1. **Keep system updated**:
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   ```

2. **Setup firewall**:
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **Disable root login**:
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Set: PermitRootLogin no
   sudo systemctl restart sshd
   ```

4. **Use SSH keys instead of passwords**

5. **Regularly review logs**:
   ```bash
   pm2 logs healthbot-backend
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```

## Performance Optimization

1. **Enable Nginx caching** (add to Nginx config):
   ```nginx
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;
   
   location /api/ {
       proxy_cache api_cache;
       proxy_cache_valid 200 5m;
       # ... other proxy settings
   }
   ```

2. **Increase Node.js memory limit** (if needed):
   ```bash
   pm2 delete healthbot-backend
   pm2 start server.js --name healthbot-backend --node-args="--max-old-space-size=2048"
   pm2 save
   ```

3. **Enable PM2 cluster mode** (for multiple CPU cores):
   ```bash
   pm2 delete healthbot-backend
   pm2 start server.js --name healthbot-backend -i max
   pm2 save
   ```

## Support

For issues or questions:
- Check logs: `pm2 logs healthbot-backend`
- Review GitHub repository: https://github.com/shimna8/healthbot-backend
- Check Azure VM metrics in Azure Portal

