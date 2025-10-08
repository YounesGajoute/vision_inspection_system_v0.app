# Vision Inspection System - Quick Start Guide

Get the Vision Inspection System running in production in 15 minutes!

## Prerequisites

- Raspberry Pi 4 with Raspberry Pi OS
- Python 3.9+
- Internet connection

## Quick Installation

### 1. Clone and Navigate

```bash
cd /home/pi/Desktop/vision_inspection_system_v0.app/backend
```

### 2. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configure Environment

```bash
# Create .env file
cat > .env << 'EOF'
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
DATABASE_URL=sqlite:///./database/vision.db
API_HOST=0.0.0.0
API_PORT=5000
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
EOF

# Generate secure keys
python3 << 'PYTHON'
import secrets
with open('.env', 'r') as f:
    content = f.read()
content = content.replace('$(python3 -c "import secrets; print(secrets.token_hex(32))")', secrets.token_hex(32), 1)
content = content.replace('$(python3 -c "import secrets; print(secrets.token_hex(32))")', secrets.token_hex(32), 1)
with open('.env', 'w') as f:
    f.write(content)
PYTHON
```

### 5. Create Required Directories

```bash
mkdir -p logs database storage/{master_images,inspection_history,backups}
chmod 750 logs database storage
```

### 6. Create Admin User

```bash
python3 scripts/setup_admin.py
```

Follow the prompts to create your admin user.

### 7. Test Run (Development)

```bash
# Test that everything works
python3 app_production.py
```

Visit `http://localhost:5000/api/v1/health` to verify.

Press `Ctrl+C` to stop.

### 8. Install as Service

```bash
# Update paths in service file if needed
sudo cp systemd/vision-inspection.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable vision-inspection
sudo systemctl start vision-inspection

# Check status
sudo systemctl status vision-inspection
```

## Verify Installation

### 1. Check Service

```bash
sudo systemctl status vision-inspection
```

Should show "active (running)".

### 2. Check Health

```bash
curl http://localhost:5000/api/v1/health
```

Should return JSON with `"status": "healthy"` (or "degraded" if camera not available).

### 3. Test Authentication

```bash
# Login (replace with your admin credentials)
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password"}'
```

Should return access token and user info.

### 4. Check Logs

```bash
# Service logs
sudo journalctl -u vision-inspection -n 50

# Application logs
tail -f logs/app.log
```

## Quick Configuration

### Change API Port

Edit `.env`:
```bash
API_PORT=8080
```

Restart service:
```bash
sudo systemctl restart vision-inspection
```

### Enable Debug Mode (Development Only)

Edit `.env`:
```bash
FLASK_ENV=development
FLASK_DEBUG=True
```

### Add CORS Origin

Edit `.env`:
```bash
CORS_ORIGINS=http://localhost:3000,http://your-domain.com
```

## Common Commands

```bash
# Start service
sudo systemctl start vision-inspection

# Stop service
sudo systemctl stop vision-inspection

# Restart service
sudo systemctl restart vision-inspection

# View logs
sudo journalctl -u vision-inspection -f

# Application logs
tail -f logs/app.log

# Health check
curl http://localhost:5000/api/v1/health

# Create backup
./scripts/backup.sh
```

## API Quick Reference

### Authentication

```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Get current user
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Programs

```bash
# List programs
curl -X GET http://localhost:5000/api/v1/programs \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create program
curl -X POST http://localhost:5000/api/v1/programs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @program_config.json
```

### Camera

```bash
# Capture image
curl -X POST http://localhost:5000/api/v1/camera/capture \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"brightnessMode": "normal", "focusValue": 50}'
```

### Health

```bash
# Full health check
curl http://localhost:5000/api/v1/health

# Readiness probe
curl http://localhost:5000/api/v1/health/ready

# Liveness probe
curl http://localhost:5000/api/v1/health/live
```

## Troubleshooting

### Service won't start

```bash
# Check service status
sudo systemctl status vision-inspection

# Check logs
sudo journalctl -u vision-inspection -n 100

# Check configuration
cat .env

# Test manually
source venv/bin/activate
python3 app_production.py
```

### Port already in use

```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill process (if needed)
sudo kill -9 <PID>

# Or change port in .env
```

### Camera not found

```bash
# Check camera detection
libcamera-hello --list-cameras

# Enable camera (if needed)
sudo raspi-config
# Navigate to Interface Options -> Camera -> Enable

# Reboot
sudo reboot
```

### Permission denied

```bash
# Fix file permissions
chmod 750 logs database storage
chmod +x scripts/*.sh

# Add user to video group (for camera)
sudo usermod -a -G video $USER

# Reboot
sudo reboot
```

## Next Steps

1. **Configure Frontend**: Update frontend to use the API
2. **Create Programs**: Use the web interface to create inspection programs
3. **Set Up Backups**: Configure automated backups
4. **Enable HTTPS**: Set up SSL certificate for production
5. **Monitor Logs**: Set up log monitoring and alerts

## Development vs Production

### Development Mode

```bash
# .env
FLASK_ENV=development
FLASK_DEBUG=True

# Run directly
python3 app_production.py
```

### Production Mode

```bash
# .env
FLASK_ENV=production
FLASK_DEBUG=False

# Run as service
sudo systemctl start vision-inspection
```

## Getting Help

- **Logs**: Always check logs first
  ```bash
  sudo journalctl -u vision-inspection -f
  tail -f logs/app.log
  ```

- **Health Check**: Verify components
  ```bash
  curl http://localhost:5000/api/v1/health | jq
  ```

- **Documentation**: 
  - Full deployment guide: `PRODUCTION_DEPLOYMENT.md`
  - Implementation details: `IMPLEMENTATION_SUMMARY.md`

## Quick Tips

1. **Use deployment script** for updates:
   ```bash
   ./scripts/deploy.sh
   ```

2. **Backup before changes**:
   ```bash
   ./scripts/backup.sh
   ```

3. **Monitor disk space**:
   ```bash
   df -h
   ```

4. **Check system resources**:
   ```bash
   htop
   ```

5. **Test API with curl or Postman**

## Success Indicators

✅ Service is running (`systemctl status vision-inspection`)  
✅ Health check returns 200 (`curl http://localhost:5000/api/v1/health`)  
✅ Can login and get token  
✅ Logs are being written  
✅ No errors in logs  

## Production Checklist

- [ ] Secret keys generated
- [ ] Admin user created
- [ ] Service installed and running
- [ ] Health check passing
- [ ] Logs being written
- [ ] Backups configured
- [ ] Firewall configured
- [ ] HTTPS enabled (recommended)
- [ ] Frontend connected
- [ ] Test inspection run

---

**You're all set!** The Vision Inspection System is now running in production mode.

For detailed information, see:
- `PRODUCTION_DEPLOYMENT.md` - Complete deployment guide
- `IMPLEMENTATION_SUMMARY.md` - Feature documentation
