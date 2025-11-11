#!/bin/bash

# Azure VM Deployment Script for Health Bot Backend
# This script automates the deployment process on Ubuntu 20.04/22.04

set -e  # Exit on error

echo "=================================================="
echo "🚀 Health Bot Backend - Azure VM Deployment"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running on Ubuntu
if [ ! -f /etc/os-release ]; then
    print_error "Cannot detect OS. This script is designed for Ubuntu."
    exit 1
fi

. /etc/os-release
if [ "$ID" != "ubuntu" ]; then
    print_error "This script is designed for Ubuntu. Detected: $ID"
    exit 1
fi

print_success "Detected Ubuntu $VERSION_ID"

# Step 1: Update system
echo ""
print_info "Step 1: Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y
print_success "System updated"

# Step 2: Install NVM and Node.js 20
echo ""
print_info "Step 2: Installing Node.js 20 via NVM..."

if [ -d "$HOME/.nvm" ]; then
    print_info "NVM already installed"
else
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
    print_success "NVM installed"
fi

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

NODE_VERSION=$(node --version)
print_success "Node.js installed: $NODE_VERSION"

# Step 3: Install system dependencies
echo ""
print_info "Step 3: Installing system dependencies for Chromium..."
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
    xdg-utils \
    curl \
    git

print_success "System dependencies installed"

# Step 4: Install PM2
echo ""
print_info "Step 4: Installing PM2 process manager..."
npm install -g pm2
print_success "PM2 installed"

# Step 5: Clone or update repository
echo ""
print_info "Step 5: Setting up application..."

APP_DIR="$HOME/healthbot-backend"

if [ -d "$APP_DIR" ]; then
    print_info "Application directory exists. Pulling latest changes..."
    cd "$APP_DIR"
    git pull origin main
else
    print_info "Cloning repository..."
    cd "$HOME"
    git clone https://github.com/shimna8/healthbot-backend.git
    cd "$APP_DIR"
fi

print_success "Application code ready"

# Step 6: Install dependencies
echo ""
print_info "Step 6: Installing Node.js dependencies..."
npm install
print_success "Dependencies installed"

# Step 7: Setup environment file
echo ""
print_info "Step 7: Setting up environment configuration..."

if [ -f "$APP_DIR/.env" ]; then
    print_info ".env file already exists. Skipping creation."
    print_info "Please review and update $APP_DIR/.env with your credentials"
else
    cat > "$APP_DIR/.env" << 'EOF'
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
# AZURE_KEY_VAULT_NAME=your-keyvault-name
# AZURE_TENANT_ID=your-tenant-id
# AZURE_CLIENT_ID=your-client-id
# AZURE_CLIENT_SECRET=your-client-secret

# Local Storage (Optional)
# USE_LOCAL_STORAGE=true
# LOCAL_STORAGE_PATH=./pdfs
# LOCAL_STORAGE_BASE_URL=http://your-domain.com/pdfs

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://your-wordpress-site.com
EOF
    print_success ".env file created"
    print_error "⚠️  IMPORTANT: Edit $APP_DIR/.env with your actual credentials!"
fi

# Step 8: Setup PM2
echo ""
print_info "Step 8: Setting up PM2..."

# Stop existing instance if running
pm2 delete healthbot-backend 2>/dev/null || true

# Start application
pm2 start server.js --name healthbot-backend

# Save PM2 configuration
pm2 save

# Setup PM2 startup
print_info "Setting up PM2 to start on boot..."
PM2_STARTUP_CMD=$(pm2 startup systemd -u $USER --hp $HOME | grep "sudo")
if [ ! -z "$PM2_STARTUP_CMD" ]; then
    eval $PM2_STARTUP_CMD
fi

print_success "PM2 configured"

# Step 9: Install and configure Nginx
echo ""
read -p "Do you want to install and configure Nginx as reverse proxy? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Step 9: Installing and configuring Nginx..."
    
    sudo apt-get install -y nginx
    
    read -p "Enter your domain name (or press Enter to skip): " DOMAIN_NAME
    
    if [ ! -z "$DOMAIN_NAME" ]; then
        sudo tee /etc/nginx/sites-available/healthbot-backend > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    # Increase timeouts for PDF generation
    proxy_connect_timeout 300;
    proxy_send_timeout 300;
    proxy_read_timeout 300;
    send_timeout 300;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Serve static PDF files if using local storage
    location /pdfs/ {
        alias $APP_DIR/pdfs/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
        
        sudo ln -sf /etc/nginx/sites-available/healthbot-backend /etc/nginx/sites-enabled/
        sudo nginx -t && sudo systemctl restart nginx
        sudo systemctl enable nginx
        
        print_success "Nginx configured for domain: $DOMAIN_NAME"
        
        # Ask about SSL
        read -p "Do you want to setup SSL with Let's Encrypt? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo apt-get install -y certbot python3-certbot-nginx
            sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME
            print_success "SSL certificate installed"
        fi
    else
        print_info "Skipping Nginx domain configuration"
    fi
else
    print_info "Skipping Nginx installation"
fi

# Step 10: Setup firewall
echo ""
read -p "Do you want to configure UFW firewall? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Configuring firewall..."
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
    print_success "Firewall configured"
fi

# Final status check
echo ""
echo "=================================================="
print_success "Deployment Complete!"
echo "=================================================="
echo ""
print_info "Application Status:"
pm2 status

echo ""
print_info "Next Steps:"
echo "1. Edit .env file with your credentials:"
echo "   nano $APP_DIR/.env"
echo ""
echo "2. Restart the application:"
echo "   pm2 restart healthbot-backend"
echo ""
echo "3. View logs:"
echo "   pm2 logs healthbot-backend"
echo ""
echo "4. Test the API:"
echo "   curl http://localhost:3000/health"
echo ""
echo "5. Configure Azure NSG to allow ports 80, 443, and 22"
echo ""
print_info "For detailed documentation, see: $APP_DIR/AZURE_VM_DEPLOYMENT.md"
echo ""

