# Base image: Node 20 on Debian bookworm (Chromium available via apt)
FROM node:20-bookworm-slim

# Install Chromium and fonts (Arabic support via Noto)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       chromium \
       curl \
       fontconfig \
       fonts-noto-core \
       fonts-noto-unhinted \
    && rm -rf /var/lib/apt/lists/*

# Environment
# - Skip Puppeteer downloading its own Chromium (we use @sparticuz/chromium)
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true

# App setup
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
# Use non-root user at runtime for best practice security
RUN chown -R node:node /app
USER node

COPY . .

# The app listens on 3000 by default (server reads PORT env var on Azure)
# Healthcheck for Azure to verify container is serving
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT:-3000}/health || exit 1

EXPOSE 3000

# Start the server
CMD ["node", "server.js"]

