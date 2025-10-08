# How to Start the Complete Application

This guide shows multiple ways to run both frontend and backend with a single command.

---

## 🚀 Method 1: NPM Script (Recommended)

### Single Command - Development Mode
```bash
npm run dev:all
```

This runs both:
- **Frontend:** Next.js dev server on http://localhost:3000
- **Backend:** Flask API server on http://localhost:5000

### Single Command - Production Mode
```bash
npm run start:all
```

This runs both:
- **Frontend:** Next.js production server
- **Backend:** Flask API server

### Features
- ✅ Color-coded output (Frontend in cyan, Backend in green)
- ✅ Named processes for easy identification
- ✅ Single CTRL+C stops both services
- ✅ Real-time logs from both servers

---

## 🐧 Method 2: Bash Script (Linux/macOS)

### Run the Script
```bash
./start-app.sh
```

Or with explicit bash:
```bash
bash start-app.sh
```

### Features
- ✅ Automatic validation checks
- ✅ Color-coded output
- ✅ PID tracking
- ✅ Graceful shutdown with CTRL+C
- ✅ Error detection

### First Time Setup
```bash
# Make script executable (only needed once)
chmod +x start-app.sh
```

---

## 🪟 Method 3: Batch Script (Windows)

### Run the Script
```cmd
start-app.bat
```

Or double-click `start-app.bat` in File Explorer.

### Features
- ✅ Opens separate windows for each service
- ✅ Easy to see logs independently
- ✅ Close windows to stop services
- ✅ Automatic timing

---

## 🔧 Method 4: tmux (Advanced - Linux/macOS)

### Create tmux Session
```bash
tmux new-session -d -s vision_app
tmux split-window -h
tmux select-pane -t 0
tmux send-keys "cd backend && python app.py" C-m
tmux select-pane -t 1
tmux send-keys "npm run dev" C-m
tmux attach-session -t vision_app
```

### Stop Services
Press `CTRL+C` in each pane, then:
```bash
tmux kill-session -t vision_app
```

### Features
- ✅ Split screen view
- ✅ Independent scrollback
- ✅ Persistent sessions
- ✅ Professional setup

---

## 🖥️ Method 5: screen (Alternative - Linux)

### Create screen Session
```bash
screen -dmS backend bash -c "cd backend && python app.py"
screen -dmS frontend bash -c "npm run dev"
```

### View Logs
```bash
# Attach to backend
screen -r backend

# Detach: CTRL+A, D
# Attach to frontend
screen -r frontend
```

### Stop Services
```bash
screen -S backend -X quit
screen -S frontend -X quit
```

---

## 📝 Method 6: Custom Bash Script (Simple)

Create a file `run.sh`:

```bash
#!/bin/bash

# Start backend in background
cd backend && python app.py &
BACKEND_PID=$!

# Return to root
cd ..

# Start frontend in background
npm run dev &
FRONTEND_PID=$!

echo "✓ Backend PID: $BACKEND_PID"
echo "✓ Frontend PID: $FRONTEND_PID"
echo ""
echo "Press CTRL+C to stop all services"

# Wait and cleanup on CTRL+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
```

Then run:
```bash
chmod +x run.sh
./run.sh
```

---

## 🎯 Comparison

| Method | Best For | Complexity | Platform |
|--------|----------|------------|----------|
| **npm run dev:all** | ✅ **Recommended** | Easy | All |
| **start-app.sh** | Linux/macOS users | Easy | Linux/macOS |
| **start-app.bat** | Windows users | Easy | Windows |
| **tmux** | Advanced users | Medium | Linux/macOS |
| **screen** | Server environments | Medium | Linux |
| **Custom script** | Customization | Easy | Linux/macOS |

---

## 🚀 Quick Start Guide

### Step 1: Choose Your Method

**For most users (any OS):**
```bash
npm run dev:all
```

**For Linux/macOS:**
```bash
./start-app.sh
```

**For Windows:**
```cmd
start-app.bat
```

### Step 2: Wait for Startup

You'll see:
```
[BACKEND] Starting backend server...
[FRONTEND] Starting frontend development server...
```

### Step 3: Access the Application

**Frontend:** http://localhost:3000  
**Backend API:** http://localhost:5000/api  
**Monitoring:** http://localhost:5000/api/monitoring/health

### Step 4: Stop the Application

Press **CTRL+C** once (npm run dev:all)

Or close the terminal windows (Windows batch file)

---

## 🔍 Troubleshooting

### Issue: Port Already in Use

**Frontend (port 3000):**
```bash
# Kill process using port 3000
kill $(lsof -ti:3000)
# Or
npx kill-port 3000
```

**Backend (port 5000):**
```bash
# Kill process using port 5000
kill $(lsof -ti:5000)
# Or
npx kill-port 5000
```

### Issue: Backend Fails to Start

Check:
1. Python virtual environment activated?
2. Dependencies installed? `pip install -r backend/requirements.txt`
3. Database accessible? Check `backend/database/`

### Issue: Frontend Fails to Start

Check:
1. Node modules installed? `npm install`
2. Port 3000 available?
3. `.next/` directory - try deleting and restarting

### Issue: concurrently Not Found

```bash
npm install --save-dev concurrently
```

---

## 📊 Process Management

### View Running Processes

```bash
# List all node processes
ps aux | grep node

# List Python processes
ps aux | grep python

# Or use
npm run dev:all  # Shows both in one terminal
```

### Stop Individual Services

```bash
# Stop frontend only
pkill -f "next dev"

# Stop backend only
pkill -f "python app.py"

# Stop all
pkill -f "next dev" && pkill -f "python app.py"
```

---

## 🎛️ Advanced Configuration

### Custom Ports

Edit `package.json`:
```json
"dev": "next dev -p 3001",
"backend": "cd backend && PORT=5001 python app.py"
```

### Environment-Specific Scripts

```json
"dev:all": "concurrently \"npm run dev\" \"npm run backend\"",
"prod:all": "concurrently \"npm run start\" \"npm run backend:prod\"",
"backend:prod": "cd backend && gunicorn -c gunicorn_config.py wsgi:application"
```

### With Logging

```json
"dev:all:log": "concurrently \"npm run dev\" \"npm run backend\" > app.log 2>&1"
```

---

## 🐳 Method 7: Docker Compose (Future)

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    volumes:
      - ./backend:/app
  
  frontend:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

Then run:
```bash
docker-compose up
```

---

## 📱 Systemd Service (Production - Linux)

Create `/etc/systemd/system/vision-inspection.service`:

```ini
[Unit]
Description=Vision Inspection System
After=network.target

[Service]
Type=forking
User=your-user
WorkingDirectory=/path/to/vision_inspection_system_v0.app
ExecStart=/path/to/start-app.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable vision-inspection
sudo systemctl start vision-inspection
sudo systemctl status vision-inspection
```

---

## 💡 Best Practices

### Development
1. Use `npm run dev:all` for development
2. Keep one terminal for output
3. Use CTRL+C to stop both services
4. Restart if you make backend config changes

### Production
1. Use production WSGI server (Gunicorn) for backend
2. Use `npm run build && npm start` for frontend
3. Consider process managers (PM2, systemd)
4. Set up monitoring and logging

### Debugging
1. Run services separately to see isolated logs
2. Check logs in `backend/logs/app.log`
3. Use browser DevTools for frontend
4. Check database with `sqlite3 backend/database/vision.db`

---

## 🎯 Quick Reference

### All Available Commands

```bash
# Development (both services)
npm run dev:all          # ← Recommended!

# Individual services
npm run dev              # Frontend only
npm run backend          # Backend only

# Production
npm run start:all        # Both services (production)
npm run start            # Frontend only
npm run backend          # Backend (same command)

# Alternative scripts
./start-app.sh           # Bash script (Linux/macOS)
start-app.bat            # Batch file (Windows)

# Build
npm run build            # Build frontend
npm run lint             # Lint frontend
```

---

## 🆘 Emergency Stop

If services don't respond to CTRL+C:

### Linux/macOS:
```bash
# Nuclear option - kill all
pkill -f "next dev"
pkill -f "python app.py"
pkill -f "node"
```

### Windows:
```cmd
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```

---

## ✅ Recommended Setup

**For Daily Development:**
```bash
npm run dev:all
```

**What You Get:**
- ✓ Both services start automatically
- ✓ Color-coded logs
- ✓ Easy to stop (one CTRL+C)
- ✓ Auto-restart on file changes (frontend)
- ✓ Clear process names

**Access Points:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Monitoring: http://localhost:5000/api/monitoring/health

---

## 📖 Summary

**Simplest Method:**
```bash
npm run dev:all
```

**Alternative Methods:**
- `./start-app.sh` (Linux/macOS)
- `start-app.bat` (Windows)
- tmux/screen (advanced)

**To Stop:**
Press `CTRL+C`

---

**That's it! Your application now starts with one command!** 🎉
