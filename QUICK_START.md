# Quick Start Guide - Azure VM Deployment

## 🚀 Fast Deployment (5 Minutes)

### Step 1: Connect to Your Azure VM
```bash
ssh your-username@your-vm-ip
```

### Step 2: Run the Automated Deployment Script
```bash
# Download and run the deployment script
curl -o- https://raw.githubusercontent.com/shimna8/healthbot-backend/main/deploy-azure-vm.sh | bash
```

**OR** if you prefer to review the script first:
```bash
# Clone the repository
git clone https://github.com/shimna8/healthbot-backend.git
cd healthbot-backend

# Review the script
cat deploy-azure-vm.sh

# Run it
./deploy-azure-vm.sh
```

### Step 3: Configure Environment Variables
```bash
cd ~/healthbot-backend
nano .env
```

Update these values:
```env
HEALTH_BOT_APP_SECRET=your-actual-secret
HEALTH_BOT_TENANT_NAME=your-tenant-name
AZURE_STORAGE_ACCOUNT_KEY=your-storage-key
ALLOWED_ORIGINS=https://your-wordpress-site.com
```

Save and exit (Ctrl+X, Y, Enter)

### Step 4: Restart the Application
```bash
pm2 restart healthbot-backend
```

### Step 5: Test the Deployment
```bash
# Test locally
curl http://localhost:3000/health

# Test PDF generation
curl -X POST http://localhost:3000/api/html-pdf \
  -H "Content-Type: application/json" \
  -d '{"lang":"en"}'
```

### Step 6: Configure Azure Network Security Group
In Azure Portal:
1. Go to your VM → **Networking**
2. Click **Add inbound port rule**
3. Add these rules:
   - **HTTP**: Port 80, Source: Any
   - **HTTPS**: Port 443, Source: Any
   - **SSH**: Port 22, Source: Your IP (recommended)

### Step 7: Access Your Application
- **Without domain**: `http://your-vm-ip:3000`
- **With Nginx**: `http://your-domain.com`
- **With SSL**: `https://your-domain.com`

---

## 📋 Common Commands

### View Application Status
```bash
pm2 status
```

### View Logs
```bash
pm2 logs healthbot-backend
```

### Restart Application
```bash
pm2 restart healthbot-backend
```

### Update Application
```bash
cd ~/healthbot-backend
./update-app.sh
```

### Stop Application
```bash
pm2 stop healthbot-backend
```

### Start Application
```bash
pm2 start healthbot-backend
```

---

## 🔧 Manual Deployment Steps

If you prefer manual deployment, follow these steps:

### 1. Install Node.js 20
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20
```

### 2. Install System Dependencies
```bash
sudo apt-get update
sudo apt-get install -y chromium-browser fonts-noto-core fonts-noto-unhinted
npm install -g pm2
```

### 3. Clone and Setup
```bash
git clone https://github.com/shimna8/healthbot-backend.git
cd healthbot-backend
npm install
```

### 4. Configure Environment
```bash
cp .env.example .env  # If exists, otherwise create new
nano .env
# Add your configuration
```

### 5. Start with PM2
```bash
pm2 start server.js --name healthbot-backend
pm2 save
pm2 startup
```

---

## 🌐 Setup Nginx (Optional but Recommended)

### Install Nginx
```bash
sudo apt-get install -y nginx
```

### Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/healthbot-backend
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable and Restart
```bash
sudo ln -s /etc/nginx/sites-available/healthbot-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Setup SSL (Optional)
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔍 Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs healthbot-backend --lines 50

# Check Node version
node --version  # Should be v20.x.x

# Reinstall dependencies
cd ~/healthbot-backend
rm -rf node_modules package-lock.json
npm install
pm2 restart healthbot-backend
```

### PDF generation fails
```bash
# Check Chromium
which chromium-browser

# Check @sparticuz/chromium
ls -la node_modules/@sparticuz/chromium

# Check logs for specific error
pm2 logs healthbot-backend | grep -i chromium
```

### Port 3000 already in use
```bash
# Find process
sudo lsof -i :3000

# Kill it
sudo kill -9 <PID>

# Or change port in .env
echo "PORT=3001" >> .env
pm2 restart healthbot-backend
```

### Can't access from outside
1. Check Azure NSG rules (ports 80, 443 open)
2. Check firewall: `sudo ufw status`
3. Check Nginx: `sudo systemctl status nginx`
4. Check application: `pm2 status`

---

## 📊 Monitoring

### Real-time Monitoring
```bash
pm2 monit
```

### Check Resource Usage
```bash
pm2 info healthbot-backend
```

### View All Logs
```bash
pm2 logs
```

### Check Disk Space
```bash
df -h
```

---

## 🔄 Updating the Application

### Quick Update
```bash
cd ~/healthbot-backend
./update-app.sh
```

### Manual Update
```bash
cd ~/healthbot-backend
git pull origin main
npm install
pm2 restart healthbot-backend
pm2 logs healthbot-backend
```

---

## 🔐 Security Checklist

- [ ] Change default SSH port (optional)
- [ ] Disable root login
- [ ] Setup SSH key authentication
- [ ] Enable UFW firewall
- [ ] Setup SSL certificate
- [ ] Configure Azure NSG properly
- [ ] Keep system updated: `sudo apt-get update && sudo apt-get upgrade`
- [ ] Review logs regularly: `pm2 logs`
- [ ] Setup automated backups

---

## 📞 Support

- **Documentation**: See `AZURE_VM_DEPLOYMENT.md` for detailed guide
- **Repository**: https://github.com/shimna8/healthbot-backend
- **Logs**: `pm2 logs healthbot-backend`

---

## 🎯 API Endpoints

Once deployed, your API will be available at:

- **Health Check**: `GET /health`
- **Token Generation**: `POST /api/token`
- **PDF Generation (PDFKit)**: `POST /api/pdf`
- **HTML to PDF (Puppeteer)**: `POST /api/html-pdf`

### Test PDF Generation
```bash
curl -X POST http://your-domain.com/api/html-pdf \
  -H "Content-Type: application/json" \
  -d '{"lang":"en","data":{"age":60,"gender":"Male"}}' \
  | jq
```

Expected response:
```json
{
  "url": "https://lungprojectstorage.blob.core.windows.net/lungpdf/health-report-en-xxx.pdf",
  "fileName": "health-report-en-xxx.pdf",
  "size": 1772292,
  "lang": "en",
  "generatedAt": "2025-11-11T17:22:44.514Z",
  "storageType": "azure"
}
```

