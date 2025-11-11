# 🚀 Deployment Summary - Health Bot Backend

## ✅ What Was Done

### 1. **Upgraded Node.js**
- ✅ Upgraded from Node.js v18.18.2 to v20.19.5
- ✅ Installed NVM (Node Version Manager) for easy version management
- ✅ Updated `package.json` to require Node.js >=20.0.0

### 2. **Fixed Puppeteer/Chromium Issues**
- ✅ Replaced `puppeteer` with `puppeteer-core` (lighter, serverless-friendly)
- ✅ Added `@sparticuz/chromium` (modern replacement for deprecated `chrome-aws-lambda`)
- ✅ Updated code to prioritize `puppeteer-core` and `@sparticuz/chromium`
- ✅ Simplified Chromium detection logic
- ✅ Tested successfully - PDF generation working!

### 3. **Code Pushed to GitHub**
- ✅ All changes committed and pushed to: https://github.com/shimna8/healthbot-backend
- ✅ Latest commit includes:
  - Node 20 upgrade
  - Puppeteer-core implementation
  - Azure VM deployment scripts
  - Comprehensive documentation

### 4. **Created Deployment Resources**
- ✅ **AZURE_VM_DEPLOYMENT.md** - Comprehensive deployment guide (300+ lines)
- ✅ **deploy-azure-vm.sh** - Automated deployment script
- ✅ **update-app.sh** - Quick update script
- ✅ **QUICK_START.md** - Fast deployment reference

---

## 📋 Deployment Steps for Azure VM

### Option 1: Automated Deployment (Recommended - 5 Minutes)

1. **SSH into your Azure VM**:
   ```bash
   ssh your-username@your-vm-ip
   ```

2. **Run the automated deployment script**:
   ```bash
   curl -o- https://raw.githubusercontent.com/shimna8/healthbot-backend/main/deploy-azure-vm.sh | bash
   ```

3. **Configure environment variables**:
   ```bash
   cd ~/healthbot-backend
   nano .env
   ```
   Update with your actual credentials:
   - `HEALTH_BOT_APP_SECRET`
   - `AZURE_STORAGE_ACCOUNT_KEY`
   - `ALLOWED_ORIGINS`

4. **Restart the application**:
   ```bash
   pm2 restart healthbot-backend
   ```

5. **Configure Azure NSG** (in Azure Portal):
   - Allow port 80 (HTTP)
   - Allow port 443 (HTTPS)
   - Allow port 22 (SSH)

6. **Test**:
   ```bash
   curl http://localhost:3000/health
   ```

### Option 2: Manual Deployment (15-20 Minutes)

Follow the detailed steps in `AZURE_VM_DEPLOYMENT.md`

---

## 🔑 Required Environment Variables

Create/update `.env` file with these values:

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

---

## 🌐 Architecture Overview

```
Internet
    ↓
Azure NSG (Firewall)
    ↓
Nginx (Reverse Proxy) - Port 80/443
    ↓
Node.js Application - Port 3000
    ↓
PM2 (Process Manager)
    ↓
├── Puppeteer-core
│   └── @sparticuz/chromium (PDF Generation)
└── Azure Blob Storage (PDF Storage)
```

---

## 📦 What Gets Installed

### System Packages
- Node.js 20 (via NVM)
- Chromium browser
- Noto fonts (Arabic support)
- PM2 (process manager)
- Nginx (optional, reverse proxy)
- Certbot (optional, SSL certificates)

### Node.js Packages
- `puppeteer-core` - Headless browser control
- `@sparticuz/chromium` - Chromium binary for serverless
- `express` - Web framework
- `@azure/storage-blob` - Azure Blob Storage SDK
- `pdfkit` - PDF generation library
- Other dependencies (see package.json)

---

## 🔧 Post-Deployment Configuration

### 1. Setup Nginx (Recommended)
```bash
sudo apt-get install -y nginx
```
Follow the guide in `AZURE_VM_DEPLOYMENT.md` section 8

### 2. Setup SSL Certificate (Recommended)
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. Configure Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 4. Setup Monitoring
```bash
pm2 monit  # Real-time monitoring
pm2 logs healthbot-backend  # View logs
```

---

## 🧪 Testing the Deployment

### 1. Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-11T17:22:14.055Z"
}
```

### 2. Test PDF Generation (English)
```bash
curl -X POST http://localhost:3000/api/html-pdf \
  -H "Content-Type: application/json" \
  -d '{"lang":"en"}' | jq
```

### 3. Test PDF Generation (Arabic)
```bash
curl -X POST http://localhost:3000/api/html-pdf \
  -H "Content-Type: application/json" \
  -d '{"lang":"ar"}' | jq
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

---

## 📊 Monitoring & Maintenance

### View Application Status
```bash
pm2 status
```

### View Logs
```bash
pm2 logs healthbot-backend
pm2 logs healthbot-backend --lines 100
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

### Check Resource Usage
```bash
pm2 monit
pm2 info healthbot-backend
```

---

## 🔄 Updating the Application

When you make changes and push to GitHub:

1. **SSH into VM**:
   ```bash
   ssh your-username@your-vm-ip
   ```

2. **Run update script**:
   ```bash
   cd ~/healthbot-backend
   ./update-app.sh
   ```

Or manually:
```bash
cd ~/healthbot-backend
git pull origin main
npm install
pm2 restart healthbot-backend
pm2 logs healthbot-backend
```

---

## 🐛 Troubleshooting

### Application won't start
```bash
pm2 logs healthbot-backend --lines 50
node --version  # Should be v20.x.x
cd ~/healthbot-backend && npm install
pm2 restart healthbot-backend
```

### PDF generation fails
```bash
# Check Chromium
which chromium-browser

# Check @sparticuz/chromium
ls -la ~/healthbot-backend/node_modules/@sparticuz/chromium

# Check logs
pm2 logs healthbot-backend | grep -i chromium
```

### Can't access from outside
1. Check Azure NSG rules (ports 80, 443 open)
2. Check firewall: `sudo ufw status`
3. Check Nginx: `sudo systemctl status nginx`
4. Check application: `pm2 status`

---

## 📚 Documentation Files

1. **QUICK_START.md** - Fast deployment guide (5 minutes)
2. **AZURE_VM_DEPLOYMENT.md** - Comprehensive deployment guide
3. **deploy-azure-vm.sh** - Automated deployment script
4. **update-app.sh** - Quick update script
5. **DEPLOYMENT_SUMMARY.md** - This file

---

## 🎯 API Endpoints

Once deployed, your API will be available at:

- **Health Check**: `GET /health`
- **Token Generation**: `POST /api/token`
- **PDF Generation (PDFKit)**: `POST /api/pdf`
- **HTML to PDF (Puppeteer)**: `POST /api/html-pdf`

---

## ✅ Deployment Checklist

- [ ] Azure VM created and accessible via SSH
- [ ] Node.js 20 installed (via NVM)
- [ ] Application cloned from GitHub
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured with credentials
- [ ] PM2 configured and application running
- [ ] Azure NSG rules configured (ports 80, 443, 22)
- [ ] Nginx installed and configured (optional)
- [ ] SSL certificate installed (optional)
- [ ] Firewall configured (UFW)
- [ ] Health check endpoint tested
- [ ] PDF generation tested (English & Arabic)
- [ ] Monitoring setup (PM2)

---

## 🔐 Security Recommendations

1. ✅ Use SSH keys instead of passwords
2. ✅ Configure Azure NSG to restrict SSH to your IP
3. ✅ Enable UFW firewall
4. ✅ Setup SSL certificate (Let's Encrypt)
5. ✅ Keep system updated: `sudo apt-get update && sudo apt-get upgrade`
6. ✅ Review logs regularly: `pm2 logs`
7. ✅ Use strong passwords for Azure resources
8. ✅ Enable Azure VM backup
9. ✅ Setup monitoring alerts in Azure Portal

---

## 📞 Support & Resources

- **GitHub Repository**: https://github.com/shimna8/healthbot-backend
- **Documentation**: See `AZURE_VM_DEPLOYMENT.md`
- **Quick Start**: See `QUICK_START.md`
- **Logs**: `pm2 logs healthbot-backend`

---

## 🎉 Success Criteria

Your deployment is successful when:

✅ Application is running: `pm2 status` shows "online"
✅ Health check works: `curl http://localhost:3000/health` returns 200
✅ PDF generation works: API returns PDF URL
✅ PDFs are uploaded to Azure Blob Storage
✅ Application accessible from internet (if Nginx configured)
✅ SSL certificate installed (if configured)
✅ Application restarts automatically on reboot

---

**Ready to deploy? Start with `QUICK_START.md` for the fastest path to production!**

