# Quick VM Deployment Guide

## 🚀 Pull and Deploy Changes

### 1. SSH into VM

```bash
ssh -i lungvm_key.pem azureuser@20.233.67.34
```

### 2. Pull Latest Changes

```bash
cd ~/healthbot-backend
git pull origin main
```

### 3. Update Environment Variables

```bash
# Copy production template
cp .env.production .env

# Edit with your actual secrets
nano .env
```

**Update these values in `.env`:**

```bash
# Change this to your VM IP
BASE_URL=http://20.233.67.34

# Add your actual Direct Line Secret
DIRECTLINE_SECRET=your_actual_secret_here

# If using Azure Blob Storage, uncomment and add:
# AZURE_STORAGE_ACCOUNT_NAME=lungprojectstorage
# AZURE_STORAGE_ACCOUNT_KEY=your_actual_key_here
# AZURE_STORAGE_CONTAINER_NAME=lungpdf

# Or keep local storage enabled (default)
USE_LOCAL_STORAGE=true
```

### 4. Restart Backend

```bash
pm2 restart healthbot-backend
pm2 logs healthbot-backend
```

### 5. Test PDF Generation

```bash
# Test English PDF
curl -X POST http://localhost:3000/api/html-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "lang": "en",
    "data": {
      "age": 62,
      "gender": "Male",
      "smoker": "Non-smoker",
      "caregiver": "Daughter: 20",
      "symptomsYes": ["Worsening cough", "Night sweats"],
      "symptomsNo": []
    }
  }'
```

**Expected Response:**

```json
{
  "url": "http://20.233.67.34/pdfs/health-report-en-1234567890.pdf",
  "fileName": "health-report-en-1234567890.pdf",
  "size": 45678,
  "lang": "en",
  "generatedAt": "2025-11-12T07:30:00.000Z",
  "storageType": "local"
}
```

### 6. Download and Verify PDF

```bash
# Copy the URL from the response above and test it
curl -I http://20.233.67.34/pdfs/health-report-en-1234567890.pdf

# Or download it
curl -o test.pdf http://20.233.67.34/pdfs/health-report-en-1234567890.pdf

# Check file size
ls -lh test.pdf
```

### 7. Test from External Browser

Open in your browser:
```
http://20.233.67.34/pdfs/health-report-en-1234567890.pdf
```

The PDF should display with the MSD logo visible in the header!

---

## 🔍 Troubleshooting

### Logo Not Showing

```bash
# 1. Check BASE_URL is set
grep BASE_URL ~/healthbot-backend/.env

# 2. Test logo is accessible
curl -I http://localhost:3000/assets/images/logo.png
curl -I http://20.233.67.34/assets/images/logo.png

# 3. Check Nginx config
sudo nginx -t
sudo systemctl status nginx

# 4. Check file permissions
ls -la ~/healthbot-backend/assets/images/
```

### PDF Generation Fails

```bash
# 1. Check PM2 logs
pm2 logs healthbot-backend --lines 50

# 2. Check Chromium is installed
which chromium-browser
chromium-browser --version

# 3. Test Puppeteer manually
cd ~/healthbot-backend
node -e 'const p = require("puppeteer-core"); p.launch({executablePath: "/usr/bin/chromium-browser", args: ["--no-sandbox"]}).then(b => { console.log("✅ Works!"); b.close(); });'
```

### Backend Not Starting

```bash
# Check PM2 status
pm2 status

# Restart backend
pm2 restart healthbot-backend

# Check logs
pm2 logs healthbot-backend

# If needed, delete and recreate PM2 process
pm2 delete healthbot-backend
cd ~/healthbot-backend
pm2 start server.js --name healthbot-backend
pm2 save
```

---

## 📋 What Changed

1. **HTML Templates** (`templates/report/en.html`, `templates/report/ar.html`)
   - Logo paths now use `{{BASE_URL}}` placeholder
   - Example: `<img src="{{BASE_URL}}/assets/images/logo.png" />`

2. **PDF Generator** (`utils/puppeteerPdf.js`)
   - Injects `BASE_URL` from environment variable
   - Defaults to `http://localhost:3000` if not set

3. **Environment Config** (`.env`)
   - New variable: `BASE_URL=http://20.233.67.34`
   - Set this to your VM IP or domain

4. **Documentation**
   - `PDF_SETUP.md` - Complete PDF setup guide
   - `DEPLOY_VM.md` - This quick deployment guide

---

## ✅ Success Checklist

- [ ] Pulled latest code: `git pull origin main`
- [ ] Updated `.env` with `BASE_URL=http://20.233.67.34`
- [ ] Added Direct Line Secret to `.env`
- [ ] Restarted backend: `pm2 restart healthbot-backend`
- [ ] Tested PDF generation: `curl -X POST http://localhost:3000/api/html-pdf ...`
- [ ] Downloaded and opened PDF - logo is visible ✅
- [ ] Tested from external browser - PDF accessible ✅

---

## 🎉 Next Steps

Once PDFs are working:

1. **Test Arabic PDFs:**
   ```bash
   curl -X POST http://localhost:3000/api/html-pdf \
     -H "Content-Type: application/json" \
     -d '{"lang": "ar", "data": {...}}'
   ```

2. **Test from WordPress:**
   - Update WordPress to call: `http://20.233.67.34/api/html-pdf`
   - Verify PDF download works from chat interface

3. **Optional: Enable HTTPS:**
   - See `PDF_SETUP.md` for HTTPS setup with Let's Encrypt
   - Update `BASE_URL=https://your-domain.com`

---

## 📞 Support

If you encounter issues:

1. Check PM2 logs: `pm2 logs healthbot-backend`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify logo access: `curl -I http://20.233.67.34/assets/images/logo.png`
4. Test Puppeteer: See troubleshooting section above

Good luck! 🚀

