# 🚀 Production Quick Start - Gunicorn WSGI Server

## ⚡ Quick Commands

### Start Production Server

```bash
cd /home/Bot/Desktop/vision_inspection_system_v0.app/backend
./start_production.sh
```

### Start as Daemon (Background)

```bash
./start_production.sh --daemon
```

### Stop Server

```bash
# If running as daemon
kill $(cat /tmp/gunicorn_vision_inspection.pid)

# If running in foreground
# Press Ctrl+C
```

---

## 📦 Installation (First Time)

```bash
# 1. Navigate to project
cd /home/Bot/Desktop/vision_inspection_system_v0.app

# 2. Activate virtual environment
source venv/bin/activate

# 3. Install dependencies
pip install -r backend/requirements.txt

# 4. Start server
./backend/start_production.sh
```

---

## 🔧 Configuration Options

```bash
# Custom workers
./start_production.sh --workers 2

# Custom port
./start_production.sh --bind 0.0.0.0:8000

# Debug mode
./start_production.sh --log-level debug

# Daemon with custom settings
./start_production.sh --daemon --workers 2 --bind 0.0.0.0:8000
```

---

## 🐳 Systemd Service (Recommended for Production)

### Install Service

```bash
sudo cp backend/vision-inspection.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable vision-inspection
sudo systemctl start vision-inspection
```

### Manage Service

```bash
# Status
sudo systemctl status vision-inspection

# Logs
sudo journalctl -u vision-inspection -f

# Restart
sudo systemctl restart vision-inspection

# Stop
sudo systemctl stop vision-inspection
```

---

## ✅ Health Check

```bash
# Test API
curl http://localhost:5000/

# Expected response:
{
  "name": "Vision Inspection System",
  "version": "0.1.0",
  "status": "running"
}
```

---

## 📊 Comparison: Dev vs Production

| Feature | Development (`python app.py`) | Production (`gunicorn`) |
|---------|-------------------------------|-------------------------|
| Performance | ~100 req/s | ~1000+ req/s |
| Concurrency | Limited | 1000+ connections |
| Process Management | None | Built-in |
| Auto-restart | No | Yes (with systemd) |
| Logging | Basic | Advanced |
| Production Ready | ❌ No | ✅ Yes |

---

## 🎯 What's Different?

### Before (Development)

```bash
cd backend
python app.py
# or
python -m flask run
```

Problems:
- Single-threaded
- Poor performance
- No process management
- Not production-ready

### After (Production)

```bash
cd backend
./start_production.sh
# or
gunicorn -c gunicorn_config.py wsgi:app
```

Benefits:
- Multi-threaded with eventlet
- High performance
- Process management
- Production-ready
- WebSocket support
- Graceful reloads

---

## 📁 New Files

| File | Purpose |
|------|---------|
| `backend/wsgi.py` | WSGI entry point |
| `backend/gunicorn_config.py` | Gunicorn configuration |
| `backend/start_production.sh` | Startup script |
| `backend/vision-inspection.service` | Systemd service |
| `backend/requirements.txt` | Production dependencies |

---

## 🔄 Common Tasks

### Restart After Code Changes

```bash
# Using systemd
sudo systemctl restart vision-inspection

# Using script (daemon mode)
kill $(cat /tmp/gunicorn_vision_inspection.pid)
./start_production.sh --daemon

# Graceful reload (no downtime)
kill -HUP $(cat /tmp/gunicorn_vision_inspection.pid)
```

### View Logs

```bash
# Systemd logs
sudo journalctl -u vision-inspection -f

# Script logs (daemon mode)
tail -f backend/logs/error.log

# Script logs (foreground mode)
# Logs appear in terminal
```

### Check if Running

```bash
# Check process
ps aux | grep gunicorn

# Check port
netstat -tulpn | grep 5000

# Test API
curl http://localhost:5000/
```

---

## ⚠️ Important Notes

1. **Workers**: Keep at 1 for SocketIO (recommended)
2. **Port**: Default is 5000, change if needed
3. **Logs**: Check logs if server doesn't start
4. **Permissions**: Make sure user has write access to logs/ and storage/
5. **Virtual Environment**: Always activate venv before running

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill it
sudo kill -9 <PID>
```

### Permission Denied

```bash
# Make script executable
chmod +x backend/start_production.sh

# Fix log directory permissions
chmod -R 755 backend/logs
```

### Module Not Found

```bash
# Reinstall dependencies
source venv/bin/activate
pip install -r backend/requirements.txt
```

---

## 📚 Full Documentation

See **PRODUCTION_DEPLOYMENT_GUIDE.md** for:
- Detailed configuration
- Security best practices
- Nginx setup
- Monitoring
- Troubleshooting

---

## 🎉 You're Ready!

**Quick Start**:
```bash
./backend/start_production.sh
```

**Production Deploy**:
```bash
sudo systemctl start vision-inspection
```

**Test**:
```bash
curl http://localhost:5000/
```

---

**Status**: ✅ Production Ready  
**Server**: Gunicorn 21.2.0  
**Date**: October 9, 2025

