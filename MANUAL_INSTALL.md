# Manual Installation Guide (Without sudo)

If you're running as root or don't have sudo, follow these manual steps:

## Step 1: Update System

```bash
apt-get update
apt-get upgrade -y
```

## Step 2: Install NVM and Node.js 20

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

## Step 3: Install System Dependencies

```bash
apt-get install -y \
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
    xdg-utils \
    curl \
    git \
    wget
```

## Step 4: Install PM2

```bash
npm install -g pm2
```

## Step 5: Clone Repository

```bash
cd ~
git clone https://github.com/shimna8/healthbot-backend.git
cd healthbot-backend
```

## Step 6: Install Dependencies

```bash
npm install
```

## Step 7: Create .env File

```bash
nano .env
```

Add this content (replace with your actual values):

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

# CORS Configuration
ALLOWED_ORIGINS=https://your-wordpress-site.com,https://www.your-wordpress-site.com
```

Save and exit (Ctrl+X, Y, Enter)

## Step 8: Start with PM2

```bash
pm2 start server.js --name healthbot-backend
pm2 save
pm2 startup
```

**Important**: Copy and run the command that PM2 outputs!

## Step 9: Test

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test PDF generation
curl -X POST http://localhost:3000/api/html-pdf \
  -H "Content-Type: application/json" \
  -d '{"lang":"en"}'
```

## Step 10: Install Nginx (Optional)

```bash
apt-get install -y nginx

# Create config
nano /etc/nginx/sites-available/healthbot-backend
```

Add:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

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
}
```

Enable and restart:

```bash
ln -s /etc/nginx/sites-available/healthbot-backend /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
systemctl enable nginx
```

## Step 11: Setup SSL (Optional)

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Done! 🎉

Your application should now be running. Check status:

```bash
pm2 status
pm2 logs healthbot-backend
```

## Useful Commands

```bash
# View logs
pm2 logs healthbot-backend

# Restart
pm2 restart healthbot-backend

# Stop
pm2 stop healthbot-backend

# Monitor
pm2 monit

# Update application
cd ~/healthbot-backend
git pull origin main
npm install
pm2 restart healthbot-backend
```

