# Vision Inspection System - Deployment Checklist

## Pre-Deployment

### Hardware Requirements
- [ ] Raspberry Pi 4 or 5 (4GB+ RAM recommended)
- [ ] Raspberry Pi HQ Camera Module
- [ ] Power supply (5V 3A minimum)
- [ ] MicroSD card (32GB+ recommended)
- [ ] GPIO outputs properly wired
- [ ] LED lighting system connected
- [ ] Network connection (Ethernet or WiFi)

### Software Prerequisites
- [ ] Raspberry Pi OS (64-bit recommended)
- [ ] Python 3.9 or higher
- [ ] Node.js 20.x or higher
- [ ] Git installed

## Installation Steps

### 1. System Preparation
```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Git
sudo apt-get install git -y
```

### 2. Clone Repository
```bash
cd /home/pi
git clone <repository-url> vision-inspection-system
cd vision-inspection-system
```

### 3. Run Setup Script
```bash
chmod +x scripts/setup_system.sh
./scripts/setup_system.sh
```

### 4. Verify Installation
```bash
# Test hardware
cd backend
python3 ../scripts/test_hardware.py

# Check services
sudo systemctl status vision-inspection-backend
sudo systemctl status vision-inspection-frontend
```

## Configuration

### Backend Configuration
Edit `backend/config.yaml`:

```yaml
api:
  host: "0.0.0.0"
  port: 5000
  cors_origins: ["http://localhost:3000", "http://<raspberry-pi-ip>:3000"]

camera:
  resolution: [640, 480]
  framerate: 30

gpio:
  outputs: [17, 18, 27, 22, 23, 24, 25, 8]

storage:
  master_images: "./storage/master_images"
  image_history: "./storage/image_history"
  history_limit: 100

logging:
  level: "INFO"
  file: "./logs/vision.log"
```

### Frontend Configuration
Update `next.config.mjs` if deploying to different host.

## Security Checklist

### Production Security
- [ ] Change default secret keys
- [ ] Implement authentication (JWT recommended)
- [ ] Enable HTTPS with SSL certificates
- [ ] Set up firewall rules
- [ ] Disable debug mode
- [ ] Implement rate limiting
- [ ] Set up regular backups

### Firewall Configuration
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 3000/tcp # Frontend
sudo ufw allow 5000/tcp # Backend API
sudo ufw enable
```

## Starting the System

### Manual Start
```bash
# Start backend
cd backend
python3 app.py

# Start frontend (in new terminal)
cd vision_inspection_system_v0.app
npm run build
npm start
```

### Using Systemd Services
```bash
# Start services
sudo systemctl start vision-inspection-backend
sudo systemctl start vision-inspection-frontend

# Enable auto-start on boot
sudo systemctl enable vision-inspection-backend
sudo systemctl enable vision-inspection-frontend

# Check status
sudo systemctl status vision-inspection-backend
sudo systemctl status vision-inspection-frontend
```

## Accessing the System

- **Frontend (Web UI):** `http://<raspberry-pi-ip>:3000`
- **Backend API:** `http://<raspberry-pi-ip>:5000/api`
- **Health Check:** `http://<raspberry-pi-ip>:5000/api/health`

## Monitoring & Maintenance

### Log Files
- Backend logs: `backend/logs/vision.log`
- System logs: `journalctl -u vision-inspection-backend -f`
- Frontend logs: `journalctl -u vision-inspection-frontend -f`

### Database Backup
```bash
# Backup database
cp backend/database/vision.db backup/vision_$(date +%Y%m%d).db

# Schedule daily backups with cron
crontab -e
# Add: 0 2 * * * cp /home/pi/vision-inspection-system/backend/database/vision.db /home/pi/backups/vision_$(date +\%Y\%m\%d).db
```

### Disk Space Management
```bash
# Check disk usage
df -h

# Clean old images if space is low
cd backend/storage/image_history
find . -type f -mtime +30 -delete  # Delete files older than 30 days
```

## Troubleshooting

### Camera Not Working
```bash
# Check camera is enabled
sudo raspi-config
# Navigate to Interface Options > Camera > Enable

# Test camera
libcamera-hello

# Check permissions
sudo usermod -a -G video pi
```

### GPIO Not Working
```bash
# Check GPIO permissions
sudo usermod -a -G gpio pi

# Test GPIO
python3 scripts/test_hardware.py
```

### Service Won't Start
```bash
# Check logs
sudo journalctl -u vision-inspection-backend -n 50

# Check for port conflicts
sudo netstat -tulpn | grep :5000
sudo netstat -tulpn | grep :3000

# Restart services
sudo systemctl restart vision-inspection-backend
sudo systemctl restart vision-inspection-frontend
```

### Performance Issues
- Reduce camera resolution in config.yaml
- Limit history size
- Increase swap size (for low RAM systems)
- Use lighter inspection tools

## Performance Tuning

### For Faster Inspections
1. Reduce camera resolution to 320x240 for testing
2. Limit number of tools per program (recommended: 4-8)
3. Use internal trigger with appropriate intervals
4. Optimize tool ROI sizes (smaller is faster)

### For Better Image Quality
1. Use HQ Camera Module (not standard camera)
2. Ensure proper lighting
3. Use auto-optimize before capturing master image
4. Set higher resolution (up to 640x480)

## Backup & Recovery

### Full System Backup
```bash
# Backup entire system
sudo dd if=/dev/mmcblk0 of=/path/to/backup.img bs=4M status=progress

# Or use rpi-clone
sudo rpi-clone sda
```

### Configuration Backup
```bash
# Export programs
cd backend
python3 << EOF
from src.core.program_manager import ProgramManager
from src.database.db_manager import DatabaseManager
import yaml

with open('config.yaml') as f:
    config = yaml.safe_load(f)

db = DatabaseManager(config['database']['path'])
pm = ProgramManager(db, config['storage'])

programs = pm.list_programs()
for prog in programs:
    pm.export_program(prog['id'], f"backup/program_{prog['id']}.json")
EOF
```

## Support & Documentation

- **User Manual:** See `docs/USER_MANUAL.md` (to be created)
- **API Reference:** See `docs/API_REFERENCE.md`
- **Troubleshooting:** See `docs/TROUBLESHOOTING.md` (to be created)

## Post-Deployment Checklist

- [ ] System boots automatically
- [ ] Services start on boot
- [ ] Camera captures images successfully
- [ ] GPIO outputs respond correctly
- [ ] Web interface accessible from network
- [ ] Can create and save programs
- [ ] Inspections run successfully
- [ ] Backups configured
- [ ] Logs are being written
- [ ] System monitoring in place
- [ ] Documentation available to operators

## Regular Maintenance Schedule

**Daily:**
- Check system logs for errors
- Verify inspection programs are running

**Weekly:**
- Review inspection statistics
- Check disk space usage
- Verify backup integrity

**Monthly:**
- Update system packages
- Review and clean old image history
- Test hardware with test script
- Verify all programs still work correctly

**Quarterly:**
- Full system backup
- Review and update documentation
- Performance optimization review

