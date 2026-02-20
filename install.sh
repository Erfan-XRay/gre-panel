#!/bin/bash
# GRE/VXLAN Premium Web Panel - Manager Script

set -e

echo "===================================================="
echo "    GRE/VXLAN Panel Manager (Install & Update)      "
echo "===================================================="

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo -i)"
  exit 1
fi

APP_DIR="/root/GrePanel"
if [ -d "$PWD/package.json" ]; then
    APP_DIR="$PWD"
fi

show_menu() {
    echo "Please choose an action:"
    echo "  1) Install Panel (Fresh Setup)"
    echo "  2) Update Panel (Keep Database & Configs)"
    echo "  3) Uninstall Panel Completely"
    echo "  4) Exit"
    echo "===================================================="
    read -p "Select option [1-4]: " choice

    case $choice in
        1) install_panel ;;
        2) update_panel ;;
        3) uninstall_panel ;;
        4) exit 0 ;;
        *) echo "Invalid option." && show_menu ;;
    esac
}

install_panel() {
    echo "[1/4] Updating system and installing prerequisites..."
    apt-get update -y
    apt-get install -y curl build-essential sqlite3 git

    echo "[2/4] Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs

    echo "[3/4] Installing PM2 and application dependencies..."
    npm install -g pm2
    
    if [ ! -d "$APP_DIR" ]; then
        echo "Cloning repository..."
        git clone https://github.com/Erfan-XRay/gre-panel.git "$APP_DIR"
    fi
    
    cd "$APP_DIR"
    npm install

    echo "[4/4] Building the application and DB schema..."
    npx prisma generate
    npx prisma db push
    npm run build

    echo "===================================================="
    echo "Starting GRE/VXLAN Panel service..."
    pm2 start npm --name "grepanel" -- start
    pm2 save
    pm2 startup | tail -n 1 | bash -

    echo "===================================================="
    echo "Installation Complete!"
    echo "Panel is running target http://$(curl -s ifconfig.me):3000"
    echo "===================================================="
}

update_panel() {
    echo "Updating GRE/VXLAN Panel..."
    cd "$APP_DIR"
    
    if [ -d ".git" ]; then
        echo "Pulling latest changes from Git..."
        git fetch --all
        git reset --hard origin/main
    fi

    echo "Installing new dependencies..."
    npm install
    
    echo "Migrating DB Schema & Rebuilding Application..."
    npx prisma generate
    npx prisma db push
    npm run build
    
    echo "Restarting service..."
    pm2 restart grepanel
    pm2 save
    
    echo "Update Complete without data loss!"
}

uninstall_panel() {
    echo "WARNING: This will completely remove the GRE/VXLAN panel from this server,"
    echo "including the SQLite database and all settings."
    read -p "Are you sure? (y/N): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo "Stopping PM2 service..."
        pm2 stop grepanel || true
        pm2 delete grepanel || true
        pm2 save --force || true
        
        echo "Removing Panel files..."
        rm -rf "$APP_DIR"
        
        echo "Successfully uninstalled GRE/VXLAN Panel."
    else
        echo "Uninstallation cancelled."
    fi
}

show_menu
