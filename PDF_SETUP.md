# PDF Generation Setup Guide

## Overview

This backend uses **Puppeteer** to generate PDFs from HTML templates with embedded logos and images.

## Logo Configuration

### Local Development

The logos are served from `/assets/images/` directory:
- `logo.png` - MSD logo (right side)
- `safe-lungs.png` - SafeLungs logo (left side)

### Production VM Setup

1. **Copy logos to web directory:**
   ```bash
   sudo mkdir -p /var/www/healthbot/assets/images
   sudo cp ~/healthbot-backend/assets/images/* /var/www/healthbot/assets/images/
   sudo chown -R www-data:www-data /var/www/healthbot
   sudo chmod -R 755 /var/www/healthbot
   ```

2. **Update Nginx configuration:**
   ```nginx
   location /assets/ {
       alias /home/azureuser/healthbot-backend/assets/;
       expires 30d;
       add_header Cache-Control "public, immutable";
       add_header Access-Control-Allow-Origin *;
   }
   ```

3. **Update `.env` file:**
   ```bash
   # Copy production env
   cp .env.production .env
   
   # Edit BASE_URL to match your VM
   nano .env
   # Change: BASE_URL=http://20.233.67.34
   # Or: BASE_URL=https://your-domain.com
   ```

## Environment Variables

### Required Variables

```bash
# Base URL for assets (IMPORTANT!)
BASE_URL=http://localhost:3000  # Development
BASE_URL=http://20.233.67.34    # Production VM
BASE_URL=https://yourdomain.com # Production with domain

# Puppeteer executable path
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### How BASE_URL Works

The `BASE_URL` is used in HTML templates to load logos:

```html
<img src="{{BASE_URL}}/assets/images/logo.png" alt="Logo" />
```

This gets replaced with:
```html
<img src="http://20.233.67.34/assets/images/logo.png" alt="Logo" />
```

## Installation

### 1. Install Puppeteer

```bash
npm install puppeteer-core
```

### 2. Install Chromium (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y chromium-browser fonts-liberation
```

### 3. Verify Installation

```bash
which chromium-browser
# Should output: /usr/bin/chromium-browser

node -e 'const p = require("puppeteer-core"); p.launch({executablePath: "/usr/bin/chromium-browser", args: ["--no-sandbox"]}).then(b => { console.log("✅ Works!"); b.close(); });'
```

## Testing PDF Generation

### Test Endpoint

```bash
# English PDF
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

# Arabic PDF
curl -X POST http://localhost:3000/api/html-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "lang": "ar",
    "data": {
      "age": 62,
      "gender": "ذكر",
      "smoker": "غير مدخن",
      "caregiver": "ابنة: 20",
      "symptomsYes": ["سعال متفاقم", "تعرق ليلي"],
      "symptomsNo": []
    }
  }'
```

### Response

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

## Troubleshooting

### Logo Not Showing in PDF

1. **Check BASE_URL is set correctly:**
   ```bash
   grep BASE_URL .env
   ```

2. **Test logo is accessible:**
   ```bash
   curl -I http://localhost:3000/assets/images/logo.png
   # Should return: HTTP/1.1 200 OK
   ```

3. **Check Nginx serves assets:**
   ```bash
   curl -I http://20.233.67.34/assets/images/logo.png
   # Should return: HTTP/1.1 200 OK
   ```

### Puppeteer Launch Failed

1. **Check Chromium is installed:**
   ```bash
   which chromium-browser
   chromium-browser --version
   ```

2. **Check permissions:**
   ```bash
   chmod 755 /home/azureuser
   chmod 755 /home/azureuser/healthbot-backend
   chmod -R 755 /home/azureuser/healthbot-backend/assets
   ```

3. **Check Puppeteer can access Chromium:**
   ```bash
   sudo -u www-data /usr/bin/chromium-browser --version
   ```

## VM Deployment Checklist

- [ ] Install Chromium: `sudo apt install -y chromium-browser`
- [ ] Copy `.env.production` to `.env`
- [ ] Update `BASE_URL` in `.env` to VM IP or domain
- [ ] Copy logos to `/var/www/healthbot/assets/images/`
- [ ] Configure Nginx to serve `/assets/` path
- [ ] Set proper permissions on assets directory
- [ ] Test logo access: `curl http://VM_IP/assets/images/logo.png`
- [ ] Restart backend: `pm2 restart healthbot-backend`
- [ ] Test PDF generation: `curl -X POST http://VM_IP/api/html-pdf ...`

## Production URLs

After deployment, your PDFs will be accessible at:

- **Local storage**: `http://20.233.67.34/pdfs/health-report-en-*.pdf`
- **Azure Blob**: `https://lungprojectstorage.blob.core.windows.net/lungpdf/health-report-en-*.pdf`

## Support

For issues, check:
1. PM2 logs: `pm2 logs healthbot-backend`
2. Nginx error log: `sudo tail -f /var/log/nginx/error.log`
3. System log: `journalctl -u nginx -f`

