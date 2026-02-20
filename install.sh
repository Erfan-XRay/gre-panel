#!/bin/bash
# GRE/VXLAN Premium Web Panel - Manager Script (Dockerized)

set -e

echo "===================================================="
echo "    GRE/VXLAN Panel Manager (Docker Edition)        "
echo "===================================================="

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo -i)"
  exit 1
fi

APP_DIR="/root/GrePanel"
if [ -d "$PWD/docker-compose.yml" ]; then
    APP_DIR="$PWD"
fi

ensure_swap() {
    local swap_size=$(free -m | awk '/^Swap:/{print $2}')
    if [ "$swap_size" -lt 1500 ]; then
        echo "Insufficient swap space detected ($swap_size MB). Setting up 2GB swap to prevent out-of-memory errors during build..."
        fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile || true
        # Persist it if not already there
        if ! grep -q "/swapfile" /etc/fstab; then
            echo "/swapfile none swap sw 0 0" >> /etc/fstab
        fi
        echo "Swap setup complete."
    fi
}

install_docker() {
    if ! command -v docker &> /dev/null; then
        echo "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
        systemctl enable docker
        systemctl start docker
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
}

show_menu() {
    echo "Please choose an action:"
    echo "  1) Install Panel (Docker)"
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
    echo "[1/3] Updating system and installing prerequisites..."
    apt-get update -y
    apt-get install -y curl git sqlite3
    
    # Ensure swap before heavy Docker builds
    ensure_swap

    echo "[2/3] Installing Docker Environment..."
    install_docker
    
    if [ ! -d "$APP_DIR" ]; then
        echo "Cloning repository..."
        git clone https://github.com/Erfan-XRay/gre-panel.git "$APP_DIR"
    fi
    
    cd "$APP_DIR"

    echo "[3/3] Building & Starting Docker Container..."
    # Always prefer docker compose v2 if available, fallback to v1
    if docker compose version &> /dev/null; then
        docker compose up -d --build
    else
        docker-compose up -d --build
    fi

    echo "===================================================="
    echo "Installation Complete!"
    echo "Panel is running at http://$(curl -s ifconfig.me):3000"
    echo "Data is persisted safely in Docker Volume/Bind Mounts."
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

    echo "Rebuilding and restarting Docker container..."
    
    ensure_swap
    
    if docker compose version &> /dev/null; then
        docker compose up -d --build
    else
        docker-compose up -d --build
    fi
    
    echo "Update Complete without data loss!"
}

uninstall_panel() {
    echo "WARNING: This will completely remove the GRE/VXLAN panel from this server,"
    echo "including the SQLite database and all settings."
    read -p "Are you sure? (y/N): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        cd "$APP_DIR" || true
        echo "Stopping Docker containers..."
        
        if docker compose version &> /dev/null; then
            docker compose down -v || true
        else
            docker-compose down -v || true
        fi
        
        echo "Removing PM2 residuals (if migrating from old version)..."
        pm2 stop grepanel 2>/dev/null || true
        pm2 delete grepanel 2>/dev/null || true
        pm2 save --force 2>/dev/null || true
        
        echo "Removing Panel files..."
        cd /root
        rm -rf "$APP_DIR"
        
        echo "Successfully uninstalled GRE/VXLAN Panel."
    else
        echo "Uninstallation cancelled."
    fi
}

show_menu
