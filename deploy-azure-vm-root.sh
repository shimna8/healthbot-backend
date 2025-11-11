#!/bin/bash

# Azure VM Deployment Script for Health Bot Backend (Root-compatible version)
# This script works with or without sudo

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

# Detect if running as root or if sudo is available
if [ "$EUID" -eq 0 ]; then
    print_info "Running as root user"
    SUDO=""
elif command -v sudo &> /dev/null; then
    print_info "Running with sudo"
    SUDO="sudo"
else
    print_error "Not running as root and sudo not found. Please run as root or install sudo."
    exit 1
fi

# Check if running on Ubuntu/Debian
if [ ! -f /etc/os-release ]; then
    print_error "Cannot detect OS. This script is designed for Ubuntu/Debian."
    exit 1
fi

. /etc/os-release
print_success "Detected $ID $VERSION_ID"

# Step 1: Update system
echo ""
print_info "Step 1: Updating system packages..."
$SUDO apt-get update
$SUDO apt-get upgrade -y
print_success "System updated"

# Step 2: Install NVM and Node.js 20
echo ""
print_info "Step 2: Installing Node.js 20 via NVM..."

# Determine the home directory
if [ "$EUID" -eq 0 ]; then
    # If root, ask for target user or use root
    read -p "Enter username to install for (or press Enter for root): " TARGET_USER
    if [ -z "$TARGET_USER" ]; then
        TARGET_USER="root"
        USER_HOME="/root"
    else
        USER_HOME="/home/$TARGET_USER"
    fi
else
    TARGET_USER=$USER
    USER_HOME=$HOME
fi

print_info "Installing for user: $TARGET_USER (home: $USER_HOME)"

if [ -d "$USER_HOME/.nvm" ]; then
    print_info "NVM already installed"
else
    # Install NVM
    if [ "$EUID" -eq 0 ] && [ "$TARGET_USER" != "root" ]; then
        $SUDO -u $TARGET_USER bash -c 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash'
    else
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
    fi
    print_success "NVM installed"
fi

# Load NVM and install Node.js
export NVM_DIR="$USER_HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

NODE_VERSION=$(node --version)
print_success "Node.js installed: $NODE_VERSION"

# Step 3: Install system dependencies
echo ""
print_info "Step 3: Installing system dependencies..."
$SUDO apt-get install -y \
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

print_success "System dependencies installed"

# Step 4: Install PM2
echo ""
print_info "Step 4: Installing PM2 process manager..."
npm install -g pm2
print_success "PM2 installed"

# Step 5: Clone or update repository
echo ""
print_info "Step 5: Setting up application..."

APP_DIR="$USER_HOME/healthbot-backend"

if [ -d "$APP_DIR" ]; then
    print_info "Application directory exists. Pulling latest changes..."
    cd "$APP_DIR"
    git pull origin main
else
    print_info "Cloning repository..."
    cd "$USER_HOME"
    git clone https://github.com/shimna8/healthbot-backend.git
    cd "$APP_DIR"
fi

# Fix ownership if running as root
if [ "$EUID" -eq 0 ] && [ "$TARGET_USER" != "root" ]; then
    chown -R $TARGET_USER:$TARGET_USER "$APP_DIR"
fi

print_success "Application code ready"

# Step 6: Install dependencies
echo ""
print_info "Step 6: Installing Node.js dependencies..."
if [ "$EUID" -eq 0 ] && [ "$TARGET_USER" != "root" ]; then
    $SUDO -u $TARGET_USER bash -c "cd $APP_DIR && npm install"
else
    npm install
fi
print_success "Dependencies installed"

# Step 7: Setup environment file
echo ""
print_info "Step 7: Setting up environment configuration..."

if [ -f "$APP_DIR/.env" ]; then
    print_info ".env file already exists. Skipping creation."
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

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://your-wordpress-site.com
EOF
    
    if [ "$EUID" -eq 0 ] && [ "$TARGET_USER" != "root" ]; then
        chown $TARGET_USER:$TARGET_USER "$APP_DIR/.env"
    fi
    
    print_success ".env file created"
    print_error "⚠️  IMPORTANT: Edit $APP_DIR/.env with your actual credentials!"
fi

# Step 8: Setup PM2
echo ""
print_info "Step 8: Setting up PM2..."

cd "$APP_DIR"

# Stop existing instance if running
pm2 delete healthbot-backend 2>/dev/null || true

# Start application
if [ "$EUID" -eq 0 ] && [ "$TARGET_USER" != "root" ]; then
    $SUDO -u $TARGET_USER bash -c "cd $APP_DIR && pm2 start server.js --name healthbot-backend"
    $SUDO -u $TARGET_USER pm2 save
else
    pm2 start server.js --name healthbot-backend
    pm2 save
fi

# Setup PM2 startup
print_info "Setting up PM2 to start on boot..."
if [ "$EUID" -eq 0 ] && [ "$TARGET_USER" != "root" ]; then
    env PATH=$PATH:$USER_HOME/.nvm/versions/node/$(node --version)/bin pm2 startup systemd -u $TARGET_USER --hp $USER_HOME
else
    pm2 startup systemd
fi

print_success "PM2 configured"

# Step 9: Install and configure Nginx
echo ""
read -p "Do you want to install and configure Nginx as reverse proxy? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Step 9: Installing Nginx..."
    
    $SUDO apt-get install -y nginx
    
    read -p "Enter your domain name (or press Enter to skip): " DOMAIN_NAME
    
    if [ ! -z "$DOMAIN_NAME" ]; then
        $SUDO tee /etc/nginx/sites-available/healthbot-backend > /dev/null << EOF
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

    location /pdfs/ {
        alias $APP_DIR/pdfs/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
        
        $SUDO ln -sf /etc/nginx/sites-available/healthbot-backend /etc/nginx/sites-enabled/
        $SUDO nginx -t && $SUDO systemctl restart nginx
        $SUDO systemctl enable nginx
        
        print_success "Nginx configured for domain: $DOMAIN_NAME"
        
        # Ask about SSL
        read -p "Do you want to setup SSL with Let's Encrypt? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            $SUDO apt-get install -y certbot python3-certbot-nginx
            $SUDO certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME
            print_success "SSL certificate installed"
        fi
    fi
fi

# Final status
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

