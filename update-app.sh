#!/bin/bash

# Quick update script for Health Bot Backend
# Run this script to pull latest changes and restart the application

set -e

echo "🔄 Updating Health Bot Backend..."

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Navigate to app directory
cd "$(dirname "$0")"

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Install/update dependencies
echo "📦 Installing dependencies..."
npm install

# Restart application with PM2
echo "🔄 Restarting application..."
pm2 restart healthbot-backend

# Show status
echo "✅ Update complete!"
echo ""
pm2 status
echo ""
echo "📋 View logs with: pm2 logs healthbot-backend"

