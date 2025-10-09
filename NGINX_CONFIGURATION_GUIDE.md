# 🌐 Nginx Reverse Proxy Configuration Guide

## Overview

This guide explains how to set up **Nginx** as a reverse proxy for your Vision Inspection System, providing better performance, security, and SSL/TLS support.

**Date**: October 9, 2025  
**Status**: ✅ Configuration Ready  
**Server**: Nginx (Latest)

---

## 🎯 Why Use Nginx?

### Benefits

✅ **Performance**
- Static file serving
- Response caching
- Connection pooling
- Load balancing

✅ **Security**
- SSL/TLS termination
- Security headers
- DDoS protection
- Rate limiting

✅ **Features**
- WebSocket proxying
- HTTP/2 support
- Compression (gzip)
- Custom error pages

✅ **Production Ready**
- Battle-tested
- High performance
- Low resource usage
- Easy to configure

---

## 📦 Files Included

| File | Purpose |
|------|---------|
| `nginx/vision-inspection.conf` | Main nginx server configuration |
| `nginx/vision-inspection-common.conf` | Common proxy settings |
| `nginx/install_nginx.sh` | Automated installation script |

---

## 🚀 Quick Installation

### Automated Installation

```bash
# Navigate to nginx directory
cd /home/Bot/Desktop/vision_inspection_system_v0.app/nginx

# Run installation script
sudo ./install_nginx.sh
```

**That's it!** The script will:
- ✅ Install Nginx
- ✅ Generate SSL certificate
- ✅ Configure reverse proxy
- ✅ Enable and start Nginx
- ✅ Configure firewall

---

## 📋 Installation Options

### Option 1: Self-Signed Certificate (Development)

```bash
sudo ./install_nginx.sh --ssl-type self-signed
```

**Best for**:
- Local development
- Testing
- Internal networks

**Note**: Browsers will show security warning (expected)

---

### Option 2: Let's Encrypt (Production)

```bash
sudo ./install_nginx.sh \
    --ssl-type letsencrypt \
    --domain your-domain.com \
    --email your@email.com
```

**Best for**:
- Production deployment
- Public-facing applications
- Valid SSL certificate needed

**Requirements**:
- Public domain name
- Domain pointing to your server
- Port 80/443 accessible

---

### Option 3: Manual Installation

If you prefer manual setup, see [Manual Installation](#manual-installation) below.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Internet/LAN                        │
└─────────────────────┬──────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│             Nginx Reverse Proxy (Port 80/443)          │
│  - SSL/TLS Termination                                 │
│  - Security Headers                                     │
│  - Load Balancing                                       │
│  - Static Caching                                       │
│  - WebSocket Upgrade                                    │
└──────────────┬────────────────────┬─────────────────────┘
               │                    │
               ↓                    ↓
    ┌──────────────────┐  ┌─────────────────────┐
    │   Frontend       │  │   Backend API       │
    │   Next.js        │  │   Gunicorn          │
    │   Port 3000      │  │   Port 5000         │
    └──────────────────┘  └─────────────────────┘
```

---

## 🔧 Configuration Details

### Main Configuration

**File**: `nginx/vision-inspection.conf`

**Features**:
- HTTP server (port 80)
- HTTPS server (port 443)
- SSL configuration
- Upstream definitions
- Server blocks

### Common Configuration

**File**: `nginx/vision-inspection-common.conf`

**Features**:
- Security headers
- Proxy settings for API
- WebSocket proxy
- Static file caching
- Error handling
- Health checks

---

## 🌐 URL Routing

### After Nginx Setup

| Request | Nginx Routes To |
|---------|-----------------|
| `http://your-domain/` | Frontend (port 3000) |
| `http://your-domain/api/*` | Backend API (port 5000) |
| `http://your-domain/socket.io/*` | Backend WebSocket (port 5000) |
| `http://your-domain/_next/*` | Frontend static (port 3000) |
| `http://your-domain/nginx-health` | Nginx health check |

### Before Nginx (Direct Access)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5000 |

### After Nginx (Unified Access)

| Service | URL |
|---------|-----|
| Application | https://your-domain |
| API | https://your-domain/api |
| WebSocket | wss://your-domain/socket.io |

---

## 🔐 SSL/TLS Configuration

### Self-Signed Certificate (Development)

**Generated automatically by install script**

**Location**:
- Certificate: `/etc/nginx/ssl/vision-inspection.crt`
- Private Key: `/etc/nginx/ssl/vision-inspection.key`

**Valid for**: 365 days

**Browser Warning**: Expected (click "Advanced" → "Proceed")

---

### Let's Encrypt (Production)

**Generated automatically by install script**

**Location**:
- Certificate: `/etc/letsencrypt/live/your-domain/fullchain.pem`
- Private Key: `/etc/letsencrypt/live/your-domain/privkey.pem`

**Valid for**: 90 days (auto-renews)

**Browser Warning**: None (trusted certificate)

---

## 🛡️ Security Features

### Security Headers

```nginx
X-Frame-Options: SAMEORIGIN              # Prevent clickjacking
X-Content-Type-Options: nosniff          # Prevent MIME sniffing
X-XSS-Protection: 1; mode=block          # Enable XSS protection
Referrer-Policy: strict-origin           # Control referrer
Content-Security-Policy: ...             # CSP policy
```

### SSL Configuration

```nginx
TLS 1.2 and 1.3 only
Modern cipher suites
Session caching enabled
OCSP stapling (Let's Encrypt)
```

### Other Security

- Hidden file access denied
- Backup file access denied
- Custom error pages
- Request size limits

---

## ⚡ Performance Features

### Caching

```nginx
Static files:  30 days
Images:        30 days
Fonts:         1 year
API responses: No cache (dynamic)
```

### Optimization

- HTTP/2 enabled
- Keepalive connections
- Gzip compression
- Buffer optimization
- Connection pooling

---

## 📊 WebSocket Support

### Configuration

```nginx
location /socket.io {
    proxy_pass http://backend_api;
    proxy_http_version 1.1;
    
    # WebSocket upgrade
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # Long timeouts for persistent connections
    proxy_read_timeout 7d;
}
```

**Features**:
- ✅ Automatic WebSocket upgrade
- ✅ Long-lived connections (7 days)
- ✅ Proper header forwarding
- ✅ Works with Socket.IO

---

## 🔄 Management Commands

### Nginx Commands

```bash
# Check status
sudo systemctl status nginx

# Start nginx
sudo systemctl start nginx

# Stop nginx
sudo systemctl stop nginx

# Restart nginx (brief downtime)
sudo systemctl restart nginx

# Reload configuration (no downtime)
sudo systemctl reload nginx

# Test configuration
sudo nginx -t

# View logs
sudo tail -f /var/log/nginx/vision-inspection-access.log
sudo tail -f /var/log/nginx/vision-inspection-error.log
```

---

## 🧪 Testing

### Test Nginx is Running

```bash
# Check nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Check ports
sudo netstat -tulpn | grep nginx
```

### Test Application Access

```bash
# Test HTTP
curl -I http://localhost/

# Test HTTPS (self-signed)
curl -k -I https://localhost/

# Test API
curl http://localhost/api/programs

# Test WebSocket (using wscat)
wscat -c ws://localhost/socket.io/?transport=websocket
```

### Test From Browser

1. Open: `http://localhost` or `https://localhost`
2. Should see your application
3. Check DevTools → Network tab
4. Verify requests go through nginx

---

## 🐛 Troubleshooting

### Nginx Won't Start

```bash
# Check configuration
sudo nginx -t

# Check error logs
sudo tail -50 /var/log/nginx/error.log

# Check if port is in use
sudo lsof -i :80
sudo lsof -i :443

# Check service status
sudo systemctl status nginx
```

---

### 502 Bad Gateway

**Cause**: Backend services not running

**Solution**:
```bash
# Start backend
cd /home/Bot/Desktop/vision_inspection_system_v0.app/backend
./start_production.sh &

# Start frontend
cd /home/Bot/Desktop/vision_inspection_system_v0.app
npm run dev &

# Wait and test
sleep 5
curl http://localhost/
```

---

### SSL Certificate Errors

**Self-signed certificate**:
- Browser warning is normal
- Click "Advanced" → "Proceed to site"

**Let's Encrypt issues**:
```bash
# Check certbot logs
sudo journalctl -u certbot

# Renew manually
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

---

### WebSocket Not Connecting

**Check**:
1. Backend is running on port 5000
2. Nginx is running
3. Configuration includes WebSocket headers

**Test**:
```bash
# Check nginx config
sudo nginx -t

# View logs
sudo tail -f /var/log/nginx/vision-inspection-error.log

# Test WebSocket endpoint
curl -I http://localhost/socket.io/
```

---

## 📁 File Locations

### Nginx Configuration

```
/etc/nginx/sites-available/vision-inspection.conf    # Main config
/etc/nginx/conf.d/vision-inspection-common.conf      # Common settings
/etc/nginx/sites-enabled/vision-inspection.conf      # Symlink (enabled)
```

### SSL Certificates

```
# Self-signed
/etc/nginx/ssl/vision-inspection.crt
/etc/nginx/ssl/vision-inspection.key

# Let's Encrypt
/etc/letsencrypt/live/your-domain/fullchain.pem
/etc/letsencrypt/live/your-domain/privkey.pem
```

### Logs

```
/var/log/nginx/vision-inspection-access.log
/var/log/nginx/vision-inspection-error.log
/var/log/nginx/error.log
```

---

## 🔧 Advanced Configuration

### Load Balancing (Multiple Backends)

Edit `vision-inspection.conf`:

```nginx
upstream backend_api {
    # Round-robin load balancing
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
    
    # Sticky sessions for WebSocket
    ip_hash;
    
    # Keepalive
    keepalive 32;
}
```

### Rate Limiting

Add to `vision-inspection-common.conf`:

```nginx
# Define rate limit zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Apply to API
location /api {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://backend_api;
    ...
}
```

### Gzip Compression

Add to `vision-inspection.conf`:

```nginx
# Enable gzip
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript 
           application/json application/javascript 
           application/xml+rss application/rss+xml;
```

### Custom Error Pages

```nginx
error_page 404 /404.html;
error_page 500 502 503 504 /50x.html;

location = /404.html {
    root /var/www/vision-inspection/errors;
}

location = /50x.html {
    root /var/www/vision-inspection/errors;
}
```

---

## 🔄 Update Configuration

### After Editing Config Files

```bash
# 1. Test configuration
sudo nginx -t

# 2. If OK, reload nginx
sudo systemctl reload nginx

# 3. Check logs for errors
sudo tail -f /var/log/nginx/error.log
```

---

## 📊 Monitoring

### Access Logs

```bash
# Real-time access log
sudo tail -f /var/log/nginx/vision-inspection-access.log

# Find slow requests
sudo awk '$NF > 1000 {print $0}' /var/log/nginx/vision-inspection-access.log

# Count requests by endpoint
sudo awk '{print $7}' /var/log/nginx/vision-inspection-access.log | sort | uniq -c | sort -rn

# Count status codes
sudo awk '{print $9}' /var/log/nginx/vision-inspection-access.log | sort | uniq -c
```

### Error Logs

```bash
# Real-time error log
sudo tail -f /var/log/nginx/vision-inspection-error.log

# Last 50 errors
sudo tail -50 /var/log/nginx/vision-inspection-error.log

# Search for specific errors
sudo grep "upstream" /var/log/nginx/vision-inspection-error.log
```

### Status Monitoring

```bash
# Nginx status
sudo systemctl status nginx

# Active connections
sudo netstat -an | grep :80 | wc -l
sudo netstat -an | grep :443 | wc -l

# Worker processes
ps aux | grep nginx
```

---

## 🔐 SSL Certificate Management

### Self-Signed Certificate

**Renew certificate** (before 365 days):

```bash
# Regenerate certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/vision-inspection.key \
    -out /etc/nginx/ssl/vision-inspection.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=vision.local"

# Reload nginx
sudo systemctl reload nginx
```

---

### Let's Encrypt

**Auto-renewal** (enabled automatically):

```bash
# Check renewal status
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew

# View certificate info
sudo certbot certificates
```

**Renewal cron job**:
```bash
# Check if enabled
sudo systemctl status certbot.timer

# View renewal logs
sudo journalctl -u certbot
```

---

## 🌐 Domain Configuration

### For Local Development (vision.local)

**Add to `/etc/hosts`**:

```bash
sudo sh -c 'echo "127.0.0.1 vision.local" >> /etc/hosts'
```

**Access**:
- http://vision.local
- https://vision.local

---

### For Production Domain

**DNS Setup**:

1. **Point domain to your server IP**:
   ```
   A Record: your-domain.com → your.server.ip
   ```

2. **Update nginx config**:
   ```bash
   sudo nano /etc/nginx/sites-available/vision-inspection.conf
   
   # Change:
   server_name vision.local;
   # To:
   server_name your-domain.com;
   ```

3. **Get Let's Encrypt certificate**:
   ```bash
   sudo ./install_nginx.sh \
       --ssl-type letsencrypt \
       --domain your-domain.com \
       --email your@email.com
   ```

---

## 🎨 Configuration Structure

### Main Config (`vision-inspection.conf`)

```nginx
# Upstream servers
upstream backend_api { ... }
upstream frontend { ... }

# HTTP server (port 80)
server {
    listen 80;
    server_name vision.local;
    include vision-inspection-common.conf;
}

# HTTPS server (port 443)
server {
    listen 443 ssl http2;
    server_name vision.local;
    ssl_certificate ...
    ssl_certificate_key ...
    include vision-inspection-common.conf;
}
```

### Common Config (`vision-inspection-common.conf`)

```nginx
# Security headers
add_header X-Frame-Options ...
add_header X-Content-Type-Options ...

# API proxy
location /api { proxy_pass http://backend_api; }

# WebSocket proxy
location /socket.io { proxy_pass http://backend_api; }

# Frontend proxy
location / { proxy_pass http://frontend; }
```

---

## 📝 Manual Installation

### 1. Install Nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

### 2. Generate SSL Certificate

**Self-signed**:
```bash
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/vision-inspection.key \
    -out /etc/nginx/ssl/vision-inspection.crt
```

**Let's Encrypt**:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. Copy Configuration Files

```bash
sudo cp nginx/vision-inspection.conf /etc/nginx/sites-available/
sudo cp nginx/vision-inspection-common.conf /etc/nginx/conf.d/
```

### 4. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/vision-inspection.conf \
    /etc/nginx/sites-enabled/vision-inspection.conf
```

### 5. Test and Reload

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔍 Verification Checklist

### After Installation

- [ ] Nginx is running: `sudo systemctl status nginx`
- [ ] Configuration is valid: `sudo nginx -t`
- [ ] Ports are listening: `sudo netstat -tulpn | grep nginx`
- [ ] Backend is running: `curl http://localhost:5000/`
- [ ] Frontend is running: `curl http://localhost:3000/`
- [ ] Application accessible via nginx: `curl http://localhost/`
- [ ] API accessible via nginx: `curl http://localhost/api/programs`
- [ ] SSL working: `curl -k https://localhost/`
- [ ] WebSocket working: Check browser DevTools

---

## 📈 Performance Tuning

### Worker Processes

Edit `/etc/nginx/nginx.conf`:

```nginx
worker_processes auto;  # One per CPU core
worker_connections 1024;  # Per worker
```

### Buffer Sizes

```nginx
client_body_buffer_size 128k;
client_max_body_size 50M;
proxy_buffers 8 16k;
proxy_buffer_size 32k;
```

### Keepalive

```nginx
keepalive_timeout 65;
keepalive_requests 100;
```

---

## 🔄 Production Deployment Workflow

### 1. Development (Local)

```bash
# Use self-signed certificate
sudo ./install_nginx.sh --ssl-type self-signed

# Access
https://localhost/
```

### 2. Staging (Internal Network)

```bash
# Use self-signed certificate
sudo ./install_nginx.sh --ssl-type self-signed --domain vision.staging

# Add to /etc/hosts on client machines
# Access
https://vision.staging/
```

### 3. Production (Public)

```bash
# Use Let's Encrypt
sudo ./install_nginx.sh \
    --ssl-type letsencrypt \
    --domain vision.example.com \
    --email admin@example.com

# Access
https://vision.example.com/
```

---

## 🧪 Testing Guide

### Test Each Component

```bash
# 1. Test Nginx configuration
sudo nginx -t

# 2. Test backend is running
curl http://localhost:5000/
# Expected: {"name":"Vision Inspection System",...}

# 3. Test frontend is running
curl http://localhost:3000/
# Expected: HTML page

# 4. Test nginx proxy to backend
curl http://localhost/api/programs
# Expected: {"programs":[...]}

# 5. Test nginx proxy to frontend
curl http://localhost/
# Expected: HTML page

# 6. Test HTTPS
curl -k https://localhost/
# Expected: HTML page (with SSL)
```

---

## 📚 Additional Resources

### Official Documentation

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Nginx Reverse Proxy Guide](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Let's Encrypt Guide](https://letsencrypt.org/getting-started/)
- [Certbot Documentation](https://certbot.eff.org/)

### Best Practices

- [Nginx SSL Configuration](https://ssl-config.mozilla.org/)
- [Security Headers Guide](https://securityheaders.com/)
- [WebSocket Proxy Guide](https://nginx.org/en/docs/http/websocket.html)

---

## 🎉 Summary

**What's Included**:
- ✅ Complete nginx configuration
- ✅ Automated installation script
- ✅ SSL/TLS support (self-signed or Let's Encrypt)
- ✅ WebSocket proxying
- ✅ Security headers
- ✅ Performance optimization
- ✅ Comprehensive documentation

**Benefits**:
- 🚀 Better performance
- 🛡️ Enhanced security
- 🔐 SSL/TLS encryption
- ⚡ WebSocket support
- 📊 Better monitoring
- 🔄 Load balancing ready

**Next Steps**:
1. Run installation script: `sudo ./nginx/install_nginx.sh`
2. Ensure services are running
3. Access via nginx: `https://localhost`
4. Monitor logs and performance

---

**Status**: ✅ Ready to Install  
**Installation Time**: ~2 minutes  
**Difficulty**: Easy (automated script)  
**Production Ready**: Yes 🚀

