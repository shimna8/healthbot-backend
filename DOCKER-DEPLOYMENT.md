# Deploying the existing App Service using a Docker container (same app, no new App Service)

This guide switches your current Azure App Service (Linux) from "code" to "container" without creating a new App Service.
It keeps your endpoints the same and only requires a brief restart during the switch.

---

## 1) Build and push your image

Choose either Docker Hub or Azure Container Registry (ACR).

### Option A: Docker Hub
1. docker login
2. docker build -t <dockerhub_user>/healthbot-backend:dev .
3. docker push <dockerhub_user>/healthbot-backend:dev

### Option B: Azure Container Registry (ACR)
1. az acr login -n <MY_ACR_NAME>
2. docker build -t healthbot-backend:dev .
3. docker tag healthbot-backend:dev <MY_ACR_NAME>.azurecr.io/healthbot-backend:dev
4. docker push <MY_ACR_NAME>.azurecr.io/healthbot-backend:dev

Notes
- The provided Dockerfile installs Chromium, curl (for HEALTHCHECK), and Noto Arabic fonts.
- Runs as non-root user (`node`) at runtime.
- Adds a HEALTHCHECK against `/health`.
- A `.dockerignore` file is included to keep the image small.
- Your server listens on `process.env.PORT` (defaults to 3000).

---

## 2) Switch the existing App Service to run your container

Azure Portal → Your App Service → (Linux)

- Deployment (or Deployment Center) → Container / Container settings:
  - Image source: Docker Hub or Azure Container Registry
  - Image: `<dockerhub_user>/healthbot-backend` or `<MY_ACR_NAME>.azurecr.io/healthbot-backend`
  - Tag: `dev` (or `prod` when ready)

- Configuration → Application settings (env vars):
  - WEBSITES_PORT = 3000
  - PUPPETEER_EXECUTABLE_PATH = /usr/bin/chromium
  - PUPPETEER_SKIP_DOWNLOAD = true  # harmless if you are not yet using Puppeteer
  - Keep your existing settings (e.g., DIRECT_LINE_SECRET, ALLOWED_ORIGINS, AZURE_* vars)

- General settings:
  - Always On = On (recommended)

- Logs (optional but useful):
  - Enable Container logging so stdout/stderr appears in Log stream.

Click Save/Apply. The app will restart and pull the image.

---

## 3) Validate

- Log stream: confirm the container started (you should see your Express boot logs)
- GET https://<your-app>.azurewebsites.net/health
- Exercise the existing endpoints:
  - /api/token → Direct Line token creation
  - /api/pdf → PDF generation

---

## 4) Rollback

If needed, revert in Azure Portal:
- Go back to “Code” in Deployment Center and redeploy your original code.
- The app will restart again.

---

## 5) Puppeteer (optional next step)

If/when you add Puppeteer for HTML→PDF with Arabic:
- Use the system Chromium inside the container and launch with safe flags:

```js
const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
});
```

- For best Arabic rendering, either:
  - Use webfonts via `@font-face` in your HTML templates, or
  - Rely on the preinstalled Noto Arabic fonts in the container.

---

## 6) Notes about filesystem and persistence

- The container layer is ephemeral. If you write files, prefer:
  - Stream PDFs directly to the HTTP response, or
  - Write to `/home` (persistent storage on App Service), or
  - Upload to Azure Blob Storage.

---

That’s it. After you push a new image tag, update the tag in Container settings and Save to deploy the new version.

