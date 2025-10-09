# 🌐 Nginx Reverse Proxy - Quick Setup

## ⚡ Quick Install

```bash
cd /home/Bot/Desktop/vision_inspection_system_v0.app/nginx
sudo ./install_nginx.sh
```

**That's it!** Your application will be available at:
- **HTTP**: http://localhost
- **HTTPS**: https://localhost

---

## 📋 What Gets Installed

- ✅ Nginx web server
- ✅ Self-signed SSL certificate (default)
- ✅ Reverse proxy configuration
- ✅ WebSocket support
- ✅ Security headers
- ✅ Firewall rules

---

## 🎯 Installation Options

### Development (Self-Signed SSL)

```bash
sudo ./install_nginx.sh --ssl-type self-signed
```

### Production (Let's Encrypt SSL)

```bash
sudo ./install_nginx.sh \
    --ssl-type letsencrypt \
    --domain your-domain.com \
    --email your@email.com
```

---

## 🌐 Before vs After

### Before (Direct Access)

```
Browser → http://localhost:3000 (Frontend)
Browser → http://localhost:5000/api (Backend)
```

### After (Through Nginx)

```
Browser → https://localhost/ (Frontend via nginx)
Browser → https://localhost/api (Backend via nginx)
```

**Benefits**:
- ✅ Single entry point
- ✅ SSL/TLS encryption
- ✅ Better performance
- ✅ Security headers
- ✅ Professional setup

---

## 🔧 Management

```bash
# Status
sudo systemctl status nginx

# Reload config
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# Test config
sudo nginx -t

# Logs
sudo tail -f /var/log/nginx/vision-inspection-access.log
```

---

## 🐛 Troubleshooting

### 502 Bad Gateway

**Cause**: Backend/Frontend not running

**Fix**:
```bash
# Start backend
cd ../backend && ./start_production.sh &

# Start frontend
cd .. && npm run dev &
```

### Permission Denied

**Cause**: Not running as root

**Fix**:
```bash
sudo ./install_nginx.sh
```

### Port Already in Use

**Cause**: Another service using port 80/443

**Fix**:
```bash
# Find process
sudo lsof -i :80

# Stop it or change nginx port
```

---

## 📚 Documentation

- **Full Guide**: `NGINX_CONFIGURATION_GUIDE.md`
- **Production Deployment**: `PRODUCTION_DEPLOYMENT_GUIDE.md`

---

## ✅ Quick Reference

| Task | Command |
|------|---------|
| **Install** | `sudo ./install_nginx.sh` |
| **Status** | `sudo systemctl status nginx` |
| **Reload** | `sudo systemctl reload nginx` |
| **Test Config** | `sudo nginx -t` |
| **Access Logs** | `sudo tail -f /var/log/nginx/vision-inspection-access.log` |
| **Error Logs** | `sudo tail -f /var/log/nginx/vision-inspection-error.log` |

---

## 🎉 Ready to Install!

**Run**:
```bash
sudo ./install_nginx.sh
```

**Then access**:
```
https://localhost
```

---

**Files**:
- `vision-inspection.conf` - Main server config
- `vision-inspection-common.conf` - Common proxy settings
- `install_nginx.sh` - Automated installer

**Status**: ✅ Ready to Use

