# Vision Inspection System - Production Deployment Guide

Complete guide for deploying the Vision Inspection System in a production environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Authentication Setup](#authentication-setup)
- [Service Configuration](#service-configuration)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Backup and Recovery](#backup-and-recovery)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Hardware Requirements
- **Raspberry Pi 4** (4GB+ RAM recommended)
- **Raspberry Pi HQ Camera** or compatible camera module
- **8+ GB microSD card** (16GB+ recommended)
- **Stable power supply** (official Raspberry Pi power supply recommended)

### Software Requirements
- **Raspberry Pi OS** (64-bit recommended)
- **Python 3.9+**
- **Git**
- **PostgreSQL** (optional, SQLite included)

## Installation

### 1. System Update

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Install System Dependencies

```bash
sudo apt install -y \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    libpq-dev \
    nginx \
    git \
    cmake \
    libjpeg-dev \
    libpng-dev \
    libopencv-dev
```

### 3. Clone Repository

```bash
cd /home/pi
git clone <your-repository-url> vision_inspection_system
cd vision_inspection_system
```

### 4. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 5. Install Python Dependencies

```bash
cd backend
pip install --upgrade pip
pip install -r requirements.txt
```

## Configuration

### 1. Create Environment File

```bash
cp .env.example .env
nano .env
```

### 2. Configure Environment Variables

Edit `.env` with production settings:

```bash
# Application Environment
FLASK_ENV=production
FLASK_DEBUG=False

# Security - IMPORTANT: Generate secure random keys!
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# Database
DATABASE_URL=sqlite:///./database/vision.db
# For PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/vision_inspection

# API Configuration
API_HOST=0.0.0.0
API_PORT=5000
API_VERSION=v1

# CORS - Update with your frontend URL
CORS_ORIGINS=http://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_ENABLED=True
RATE_LIMIT_DEFAULT=100 per minute
RATE_LIMIT_AUTH=5 per minute
RATE_LIMIT_INSPECTION=10 per minute

# Logging
LOG_LEVEL=INFO
LOG_FILE=./logs/app.log
LOG_JSON_FORMAT=True
LOG_MAX_BYTES=10485760
LOG_BACKUP_COUNT=30

# Camera Configuration
CAMERA_RESOLUTION_WIDTH=640
CAMERA_RESOLUTION_HEIGHT=480
CAMERA_FPS=30
CAMERA_SIMULATED=False

# GPIO Configuration
GPIO_PINS=17,18,27,22,23,24,25,8

# Storage
STORAGE_MASTER_IMAGES=./storage/master_images
STORAGE_INSPECTION_IMAGES=./storage/inspection_history
STORAGE_BACKUP=./storage/backups

# Performance
WORKERS=4
WORKER_TIMEOUT=120
```

### 3. Set Secure Permissions

```bash
chmod 600 .env
```

## Database Setup

### 1. Initialize Database

```bash
# Database will be created automatically on first run
# Or manually initialize:
python3 -c "from app_production import create_app; app = create_app('production'); print('Database initialized')"
```

### 2. Create Admin User

```bash
./scripts/setup_admin.py
```

Follow the prompts to create the initial admin user.

## Authentication Setup

### Default Roles

- **ADMIN**: Full system access (create/edit/delete programs, manage users)
- **OPERATOR**: Run inspections, adjust parameters
- **VIEWER**: Read-only access to results

### Create Additional Users

Use the admin user to create additional users via the API:

```bash
curl -X POST http://localhost:5000/api/v1/auth/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "operator1",
    "password": "SecurePass123",
    "role": "OPERATOR"
  }'
```

## Service Configuration

### 1. Install Systemd Service

```bash
# Update paths in service file if needed
sudo nano systemd/vision-inspection.service

# Install service
sudo cp systemd/vision-inspection.service /etc/systemd/system/
sudo systemctl daemon-reload
```

### 2. Enable and Start Service

```bash
# Enable service to start on boot
sudo systemctl enable vision-inspection

# Start service
sudo systemctl start vision-inspection

# Check status
sudo systemctl status vision-inspection
```

### 3. View Logs

```bash
# Real-time logs
sudo journalctl -u vision-inspection -f

# Last 100 lines
sudo journalctl -u vision-inspection -n 100

# Application logs
tail -f logs/app.log
```

## Deployment

### Automated Deployment

Use the deployment script for updates:

```bash
cd /home/pi/vision_inspection_system/backend
./scripts/deploy.sh
```

The script will:
1. Pull latest code
2. Install dependencies
3. Run database migrations
4. Create backup
5. Run tests
6. Restart service
7. Perform health check

### Manual Deployment

```bash
# 1. Stop service
sudo systemctl stop vision-inspection

# 2. Pull updates
git pull

# 3. Update dependencies
source venv/bin/activate
pip install -r backend/requirements.txt

# 4. Run migrations (if any)
cd backend
# alembic upgrade head

# 5. Start service
sudo systemctl start vision-inspection

# 6. Check status
sudo systemctl status vision-inspection
```

## Monitoring

### Health Check

```bash
# Basic health check
curl http://localhost:5000/api/v1/health

# Readiness probe
curl http://localhost:5000/api/v1/health/ready

# Liveness probe
curl http://localhost:5000/api/v1/health/live
```

### Metrics

```bash
# Prometheus-style metrics
curl http://localhost:5000/api/v1/metrics
```

### System Status

```bash
# Service status
sudo systemctl status vision-inspection

# Application logs
tail -f /home/pi/vision_inspection_system/backend/logs/app.log

# Error logs
tail -f /home/pi/vision_inspection_system/backend/logs/app_error.log

# Access logs
tail -f /home/pi/vision_inspection_system/backend/logs/access.log

# System journal
sudo journalctl -u vision-inspection -f
```

## Backup and Recovery

### Automated Backup

```bash
# Run backup script
./scripts/backup.sh
```

Backups include:
- Database
- Master images
- Configuration files

### Schedule Automatic Backups

Add to crontab:

```bash
crontab -e

# Add line for daily backup at 2 AM
0 2 * * * /home/pi/vision_inspection_system/backend/scripts/backup.sh
```

### Restore from Backup

```bash
# List available backups
ls -lh storage/backups/

# Restore from backup
./scripts/restore.sh storage/backups/backup_YYYYMMDD_HHMMSS.tar.gz
```

## Security

### 1. Firewall Configuration

```bash
# Install UFW
sudo apt install ufw

# Allow SSH
sudo ufw allow 22

# Allow API port
sudo ufw allow 5000

# Enable firewall
sudo ufw enable
```

### 2. HTTPS Setup (Optional but Recommended)

#### Using Nginx as Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/vision-inspection
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:5000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/vision-inspection /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

### 4. Security Checklist

- [ ] Change default SECRET_KEY and JWT_SECRET_KEY
- [ ] Create strong admin password
- [ ] Enable firewall (UFW)
- [ ] Configure HTTPS
- [ ] Limit SSH access
- [ ] Keep system updated
- [ ] Monitor logs regularly
- [ ] Set up automated backups
- [ ] Restrict database access
- [ ] Use strong passwords for all users

## Troubleshooting

### Service Won't Start

```bash
# Check service status
sudo systemctl status vision-inspection

# Check logs
sudo journalctl -u vision-inspection -n 100

# Check application logs
tail -n 100 logs/app_error.log

# Test configuration
source venv/bin/activate
python3 -c "from app_production import create_app; app = create_app('production')"
```

### Database Errors

```bash
# Check database file permissions
ls -l database/vision.db

# Verify database integrity
sqlite3 database/vision.db "PRAGMA integrity_check;"

# Reset database (WARNING: destroys data)
rm database/vision.db
python3 -c "from app_production import create_app; app = create_app('production')"
./scripts/setup_admin.py
```

### Camera Not Working

```bash
# Check camera detection
libcamera-hello --list-cameras

# Test camera capture
libcamera-still -o test.jpg

# Check permissions
sudo usermod -a -G video $USER

# Reboot if needed
sudo reboot
```

### High Memory Usage

```bash
# Check system resources
htop

# Reduce worker count in .env
WORKERS=2

# Restart service
sudo systemctl restart vision-inspection
```

### API Not Responding

```bash
# Check if service is running
sudo systemctl status vision-inspection

# Check port binding
sudo netstat -tulpn | grep 5000

# Test locally
curl http://localhost:5000/api/v1/health

# Check firewall
sudo ufw status
```

## Performance Tuning

### Gunicorn Configuration

Edit `gunicorn_config.py`:

```python
# Adjust workers based on CPU cores
workers = multiprocessing.cpu_count() * 2 + 1

# Adjust timeout for slow operations
timeout = 120

# Enable keep-alive
keepalive = 5
```

### Database Optimization

For high-volume operations, consider PostgreSQL:

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb vision_inspection
sudo -u postgres createuser vision_user -P

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://vision_user:password@localhost:5432/vision_inspection
```

## Maintenance

### Regular Tasks

1. **Daily**: Monitor logs for errors
2. **Weekly**: Review system metrics
3. **Monthly**: Update system packages
4. **Monthly**: Review and cleanup old backups
5. **Quarterly**: Security audit
6. **Quarterly**: Performance review

### Update System

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Python dependencies
source venv/bin/activate
pip install --upgrade -r requirements.txt

# Restart service
sudo systemctl restart vision-inspection
```

## Support

For issues and questions:
- Check logs first
- Review this documentation
- Check GitHub issues
- Contact support team

---

## Quick Reference

### Common Commands

```bash
# Start service
sudo systemctl start vision-inspection

# Stop service
sudo systemctl stop vision-inspection

# Restart service
sudo systemctl restart vision-inspection

# Check status
sudo systemctl status vision-inspection

# View logs
sudo journalctl -u vision-inspection -f

# Create backup
./scripts/backup.sh

# Deploy update
./scripts/deploy.sh

# Health check
curl http://localhost:5000/api/v1/health
```

### File Locations

- Application: `/home/pi/vision_inspection_system/backend`
- Logs: `/home/pi/vision_inspection_system/backend/logs`
- Database: `/home/pi/vision_inspection_system/backend/database/vision.db`
- Backups: `/home/pi/vision_inspection_system/backend/storage/backups`
- Service: `/etc/systemd/system/vision-inspection.service`
- Configuration: `/home/pi/vision_inspection_system/backend/.env`
