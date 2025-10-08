# 🚀 Quick Start - Vision Inspection System

## Run the Complete Application with ONE Command

```bash
npm run dev:all
```

That's it! Both frontend and backend will start automatically.

---

## 📍 Access Points

Once started, access the application at:

- **Frontend UI:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Monitoring:** http://localhost:5000/api/monitoring/health
- **Health Check:** http://localhost:5000/

---

## 🛑 Stop the Application

Press **CTRL+C** in the terminal

---

## 🔧 Alternative Methods

### Linux/macOS:
```bash
./start-app.sh
```

### Windows:
```cmd
start-app.bat
```

### Individual Services:
```bash
# Frontend only
npm run dev

# Backend only
npm run backend
```

---

## 📦 First Time Setup

If this is your first time running the application:

### 1. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 2. Verify Installation
```bash
# Check concurrently is installed
npm list concurrently

# Check psutil is installed
python -c "import psutil; print('psutil OK')"
```

### 3. Start Application
```bash
npm run dev:all
```

---

## ✅ What Runs

### Backend (Port 5000)
- ✅ Flask API server
- ✅ Database (SQLite)
- ✅ Monitoring system (collects metrics every 5s)
- ✅ Alert system (6 default rules)
- ✅ Backup/restore API
- ✅ WebSocket for real-time updates
- ✅ Camera & GPIO controllers

### Frontend (Port 3000)
- ✅ Next.js development server
- ✅ React UI components
- ✅ API integration
- ✅ Real-time WebSocket connection
- ✅ Migration utilities
- ✅ File upload functionality

---

## 🎯 Expected Output

When you run `npm run dev:all`:

```
[BACKEND] INFO: === Vision Inspection System Starting ===
[BACKEND] INFO: Database initialized successfully
[BACKEND] INFO: Monitoring system initialized successfully
[BACKEND] INFO: API available at: http://0.0.0.0:5000/api
[BACKEND]  * Running on http://127.0.0.1:5000
[FRONTEND] ▲ Next.js 15.5.4
[FRONTEND] - Local:        http://localhost:3000
[FRONTEND] ✓ Ready in 2.3s
```

---

## 🔍 Troubleshooting

### Port Already in Use

**Kill processes:**
```bash
# Linux/macOS
npx kill-port 3000 5000

# Or manually
kill $(lsof -ti:3000)
kill $(lsof -ti:5000)
```

### Backend Won't Start

1. Check Python dependencies: `pip install -r backend/requirements.txt`
2. Check database exists: `ls backend/database/vision.db`
3. Check logs: `tail backend/logs/app.log`

### Frontend Won't Start

1. Check Node modules: `npm install`
2. Clear cache: `rm -rf .next`
3. Check logs in terminal

### Services Start but Can't Connect

1. Check firewall settings
2. Try http://127.0.0.1:3000 instead of localhost
3. Check CORS settings in backend/config.yaml

---

## 📚 Additional Documentation

**For detailed guides:**
- Full guide: `docs/START_APPLICATION_GUIDE.md`
- Storage system: `docs/STORAGE_SOLUTION_README.md`
- Monitoring system: `docs/MONITORING_QUICK_START.md`
- Master image upload: `docs/MASTER_IMAGE_UPLOAD_FEATURE.md`

---

## 🎊 Summary

**Single Command to Run Everything:**
```bash
npm run dev:all
```

**Access Application:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

**Stop Everything:**
- Press CTRL+C

**That's it!** Your complete Vision Inspection System is now running! 🚀

---

## 💡 Pro Tips

1. **Keep terminal open** - You'll see real-time logs from both services
2. **Frontend auto-reloads** - Changes to frontend code reload automatically
3. **Backend requires restart** - Backend changes need manual restart
4. **Check monitoring** - Visit http://localhost:5000/api/monitoring/health to see system status
5. **Use browser DevTools** - F12 for frontend debugging

---

**Questions?** See `docs/START_APPLICATION_GUIDE.md` for detailed information.
