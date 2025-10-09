# ✅ Startup Script Fix & How to Stop Server

## 🐛 Issue Fixed

**Problem**: Server wouldn't start with error:
```
ValueError: invalid literal for int() with base 10: '/tmp/gunicorn_vision_inspection.pid'
```

**Root Cause**: The `GUNICORN_PID` environment variable was being set to a file path, but Gunicorn expected it to be a PID number.

**Solution**: ✅ Fixed! Removed incorrect environment variable and using `--pid` flag instead.

---

## 🚀 Server Now Works!

The production server is now fully functional:

```bash
cd /home/Bot/Desktop/vision_inspection_system_v0.app/backend
./start_production.sh
```

**Expected output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Vision Inspection System - Production Server  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

→ Activating virtual environment...
→ Creating required directories...

Configuration:
  Workers:     1
  Bind:        0.0.0.0:5000
  Config:      /path/to/config.yaml
  Log Level:   info
  Daemon:      false

✓ Starting server in foreground mode...
  Press Ctrl+C to stop

[2025-10-09 05:26:01 +0100] [297030] [INFO] Starting gunicorn 23.0.0
[2025-10-09 05:26:01 +0100] [297030] [INFO] Listening at: http://0.0.0.0:5000
[2025-10-09 05:26:01 +0100] [297030] [INFO] Using worker: eventlet
[2025-10-09 05:26:01 +0100] [297042] [INFO] Booting worker with pid: 297042
```

---

## 🛑 How to Stop the Server

### Method 1: Ctrl+C (Foreground Mode)

If you started with `./start_production.sh`:

```bash
# Just press Ctrl+C in the terminal
Press: Ctrl + C

# Server will gracefully shutdown
```

---

### Method 2: Kill Process (Any Mode)

**Find and kill Gunicorn:**

```bash
# Method A: Kill all Gunicorn processes
pkill -f "gunicorn.*wsgi:app"

# Method B: Find process and kill by PID
ps aux | grep gunicorn
kill <PID>

# Method C: Force kill if needed
pkill -9 -f "gunicorn.*wsgi:app"
```

---

### Method 3: Using PID File (Daemon Mode)

If you started with `--daemon`:

```bash
# Kill using PID file
kill $(cat /tmp/gunicorn_vision_inspection.pid)

# Or graceful reload
kill -HUP $(cat /tmp/gunicorn_vision_inspection.pid)
```

---

### Method 4: Systemd Service

If you installed the systemd service:

```bash
# Stop service
sudo systemctl stop vision-inspection

# Check status
sudo systemctl status vision-inspection

# Restart service
sudo systemctl restart vision-inspection
```

---

## ✅ Verify Server is Stopped

```bash
# Check processes
ps aux | grep gunicorn
# Should show nothing (or just the grep command)

# Check port
sudo lsof -i :5000
# Should show nothing

# Try to connect
curl http://localhost:5000/
# Should get "Connection refused"
```

---

## 🔧 What Was Fixed

### Before (Broken)

**In `start_production.sh`**:
```bash
export GUNICORN_PID="$PID_FILE"  # ❌ Wrong! File path, not PID
```

**In `gunicorn_config.py`**:
```python
pidfile = os.environ.get('GUNICORN_PID', '/tmp/gunicorn_vision_inspection.pid')
# ❌ Gunicorn tried to parse this as int
```

### After (Fixed)

**In `start_production.sh`**:
```bash
# Removed GUNICORN_PID from environment variables
# Using --pid flag directly in command
gunicorn --pid "$PID_FILE" ...
```

**In `gunicorn_config.py`**:
```python
pidfile = '/tmp/gunicorn_vision_inspection.pid'  # ✅ Simple and direct
```

---

## 📊 Quick Reference

| Scenario | Command |
|----------|---------|
| **Start server** | `./start_production.sh` |
| **Start as daemon** | `./start_production.sh --daemon` |
| **Stop (foreground)** | `Ctrl+C` |
| **Stop (any)** | `pkill -f "gunicorn.*wsgi:app"` |
| **Stop (daemon)** | `kill $(cat /tmp/gunicorn_vision_inspection.pid)` |
| **Stop (systemd)** | `sudo systemctl stop vision-inspection` |
| **Check if running** | `ps aux | grep gunicorn` |
| **Test server** | `curl http://localhost:5000/` |

---

## 🎯 Common Scenarios

### Start and Test

```bash
# 1. Start server
cd /home/Bot/Desktop/vision_inspection_system_v0.app/backend
./start_production.sh

# 2. In another terminal, test
curl http://localhost:5000/

# Expected: {"name":"Vision Inspection System","status":"running","version":"1.0.0"}

# 3. Stop server
# Press Ctrl+C in first terminal
```

---

### Start as Daemon

```bash
# Start in background
./start_production.sh --daemon

# Check if running
ps aux | grep gunicorn

# Test
curl http://localhost:5000/

# Stop
kill $(cat /tmp/gunicorn_vision_inspection.pid)
```

---

### Emergency Stop Everything

```bash
# Nuclear option - stops all Gunicorn processes
sudo systemctl stop vision-inspection 2>/dev/null
pkill -9 -f gunicorn
rm -f /tmp/gunicorn_vision_inspection.pid
echo "✓ Everything stopped"
```

---

## 🧪 Testing the Fix

**Verify the fix works:**

```bash
# 1. Navigate to backend
cd /home/Bot/Desktop/vision_inspection_system_v0.app/backend

# 2. Start server
./start_production.sh

# Should see successful startup with no errors

# 3. Test API
curl http://localhost:5000/

# Should return JSON response

# 4. Stop server
# Press Ctrl+C

# Should shutdown gracefully
```

---

## 📝 Commit Details

**Commit**: `d64bf7c`  
**Message**: "fix: Correct GUNICORN_PID environment variable usage"

**Changes**:
- ✅ Removed incorrect `GUNICORN_PID` export
- ✅ Simplified `pidfile` configuration
- ✅ Server now starts successfully
- ✅ Tested and verified working

---

## 🎉 Status

✅ **Bug Fixed**  
✅ **Server Starts Successfully**  
✅ **Tested and Working**  
✅ **Committed to GitHub**

---

## 💡 Tips

### Graceful vs Force Stop

**Graceful** (recommended):
```bash
kill $(cat /tmp/gunicorn_vision_inspection.pid)
# or
pkill -f "gunicorn.*wsgi:app"
```

**Force** (if unresponsive):
```bash
pkill -9 -f "gunicorn.*wsgi:app"
```

### Check Status

```bash
# Is it running?
ps aux | grep gunicorn | grep -v grep

# What port?
sudo lsof -i :5000

# Is it responding?
curl -v http://localhost:5000/
```

### Logs

```bash
# Watch logs in real-time
tail -f logs/error.log

# Or if using systemd
sudo journalctl -u vision-inspection -f
```

---

## 🔗 Related Documentation

- **PRODUCTION_DEPLOYMENT_GUIDE.md** - Full deployment guide
- **PRODUCTION_QUICK_START.md** - Quick commands
- **WSGI_SERVER_IMPLEMENTATION_COMPLETE.md** - Implementation details

---

**Fixed**: October 9, 2025  
**Status**: ✅ Production Ready  
**Server**: Gunicorn 23.0.0 with Eventlet  
**Stop Command**: `Ctrl+C` or `pkill -f "gunicorn.*wsgi:app"`

