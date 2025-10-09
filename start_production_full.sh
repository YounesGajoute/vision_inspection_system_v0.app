#!/bin/bash

################################################################################
# Vision Inspection System - Full Production Startup
################################################################################
#
# This script starts the complete Vision Inspection System in production mode:
# - Backend (Gunicorn systemd service)
# - Frontend (Next.js production build)
# - Nginx reverse proxy
#
# Usage:
#   sudo ./start_production_full.sh [--build]
#
# Options:
#   --build    Rebuild frontend before starting (takes ~2 minutes)
#   --help     Show this help
#
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Options
BUILD_FRONTEND=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --build)
            BUILD_FRONTEND=true
            shift
            ;;
        --help)
            head -n 20 "$0" | tail -n +3 | sed 's/^# //'
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Vision Inspection System - Production Startup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# ==================== STOP DEVELOPMENT SERVICES ====================

echo -e "${YELLOW}→ Stopping development services...${NC}"

# Stop development servers
pkill -f "next dev" 2>/dev/null || true
pkill -f "gunicorn.*wsgi:app" 2>/dev/null || true

sleep 2
echo -e "${GREEN}✓ Development services stopped${NC}"

# ==================== BUILD FRONTEND (Optional) ====================

if [ "$BUILD_FRONTEND" = true ]; then
    echo -e "${YELLOW}→ Building frontend for production...${NC}"
    echo -e "${BLUE}  This may take 1-2 minutes...${NC}"
    
    cd "$SCRIPT_DIR"
    npm run build
    
    echo -e "${GREEN}✓ Frontend build complete${NC}"
fi

# ==================== INSTALL BACKEND SERVICE ====================

echo -e "${YELLOW}→ Installing backend systemd service...${NC}"

# Copy service file
sudo cp "$SCRIPT_DIR/backend/vision-inspection.service" /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable vision-inspection

echo -e "${GREEN}✓ Backend service installed${NC}"

# ==================== START BACKEND ====================

echo -e "${YELLOW}→ Starting backend service...${NC}"

# Start backend service
sudo systemctl start vision-inspection

# Wait for backend to be ready
sleep 3

# Check if backend is running
if sudo systemctl is-active --quiet vision-inspection; then
    echo -e "${GREEN}✓ Backend service started${NC}"
else
    echo -e "${RED}✗ Backend service failed to start${NC}"
    sudo systemctl status vision-inspection
    exit 1
fi

# Test backend API
if curl -s http://localhost:5000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend API responding${NC}"
else
    echo -e "${RED}✗ Backend API not responding${NC}"
    exit 1
fi

# ==================== START FRONTEND ====================

echo -e "${YELLOW}→ Starting frontend (production mode)...${NC}"

cd "$SCRIPT_DIR"

# Kill any existing frontend
pkill -f "next start" 2>/dev/null || true

# Start frontend in production mode
if [ -d ".next" ]; then
    nohup npm start > /tmp/nextjs-prod.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > /tmp/frontend-prod.pid
    echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${YELLOW}⚠ Frontend not built yet${NC}"
    echo -e "${BLUE}  Building frontend...${NC}"
    npm run build
    nohup npm start > /tmp/nextjs-prod.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > /tmp/frontend-prod.pid
    echo -e "${GREEN}✓ Frontend built and started (PID: $FRONTEND_PID)${NC}"
fi

# Wait for frontend to be ready
sleep 5

# Test frontend
if curl -s http://localhost:3000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend responding${NC}"
else
    echo -e "${YELLOW}⚠ Frontend may still be starting...${NC}"
fi

# ==================== VERIFY NGINX ====================

echo -e "${YELLOW}→ Verifying nginx...${NC}"

# Check if nginx is running
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx is running${NC}"
else
    echo -e "${YELLOW}⚠ Nginx not running, starting...${NC}"
    sudo systemctl start nginx
fi

# Test nginx configuration
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✓ Nginx configuration valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration invalid${NC}"
    sudo nginx -t
    exit 1
fi

# ==================== FINAL VERIFICATION ====================

echo -e "${YELLOW}→ Running final tests...${NC}"

sleep 3

# Test nginx HTTP
if curl -s http://localhost/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ HTTP accessible${NC}"
else
    echo -e "${RED}✗ HTTP not accessible${NC}"
fi

# Test nginx HTTPS
if curl -k -s https://localhost/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ HTTPS accessible${NC}"
else
    echo -e "${RED}✗ HTTPS not accessible${NC}"
fi

# Test API through nginx
if curl -s http://localhost/api/programs > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API accessible through nginx${NC}"
else
    echo -e "${RED}✗ API not accessible through nginx${NC}"
fi

# ==================== SUCCESS ====================

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ Production Startup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${BLUE}Service Status:${NC}"
echo -e "  Backend:   ${GREEN}✓ Running${NC} (systemd service)"
echo -e "  Frontend:  ${GREEN}✓ Running${NC} (production mode)"
echo -e "  Nginx:     ${GREEN}✓ Running${NC} (reverse proxy)"
echo
echo -e "${BLUE}Access URLs:${NC}"
echo -e "  HTTP:      ${YELLOW}http://localhost/${NC}"
echo -e "  HTTPS:     ${YELLOW}https://localhost/${NC}"
echo -e "  Network:   ${YELLOW}http://192.168.11.123/${NC}"
echo
echo -e "${BLUE}Management Commands:${NC}"
echo -e "  Backend:   ${YELLOW}sudo systemctl status vision-inspection${NC}"
echo -e "  Frontend:  ${YELLOW}kill \$(cat /tmp/frontend-prod.pid)${NC}"
echo -e "  Nginx:     ${YELLOW}sudo systemctl status nginx${NC}"
echo -e "  Logs:      ${YELLOW}sudo journalctl -u vision-inspection -f${NC}"
echo
echo -e "${BLUE}Stop All Services:${NC}"
echo -e "  ${YELLOW}sudo systemctl stop vision-inspection nginx${NC}"
echo -e "  ${YELLOW}kill \$(cat /tmp/frontend-prod.pid)${NC}"
echo
echo -e "${GREEN}✓ System ready for production use!${NC}"
echo

