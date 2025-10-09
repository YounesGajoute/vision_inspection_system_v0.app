# IMX477 Camera - Quick Start Guide

## 🚀 5-Minute Setup

### Prerequisites
- ✅ Raspberry Pi 5
- ✅ IMX477 HQ Camera connected
- ✅ Camera interface enabled

### Step 1: Install Dependencies (2 min)

```bash
cd /home/Bot/Desktop/vision_inspection_system_v0.app

# Install Python packages
pip install -r backend/requirements_imx477.txt

# Verify installation
python3 -c "import picamera2; import cv2; import fastapi; print('✅ All dependencies installed')"
```

### Step 2: Start Backend Service (30 sec)

```bash
# Quick start
./scripts/start_imx477_service.sh

# OR manually
cd backend
python3 -m uvicorn imx477_camera:app --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 3: Test Backend (30 sec)

```bash
# Check camera status
curl http://localhost:8000/api/camera/status

# Expected response:
{
  "initialized": true,
  "streaming": false,
  "sensor_config": null,
  "opencv_enabled": false,
  "performance": {...}
}
```

### Step 4: Configure Frontend (1 min)

```bash
# Add to .env.local
echo "NEXT_PUBLIC_CAMERA_API_URL=http://localhost:8000" >> .env.local

# Start Next.js
npm run dev
```

### Step 5: Test UI (1 min)

1. Open: http://localhost:3000/configure
2. Navigate to "Step 1: Image Optimization"
3. Select "Sensor Config" tab
4. Click "Auto Optimize"
5. Go to "Live Preview" tab
6. Click "Start Preview"

✅ **You should see live camera feed with metrics!**

---

## 📖 API Quick Reference

### Configuration

```bash
# Configure sensor
curl -X POST http://localhost:8000/api/camera/config/sensor \
  -H "Content-Type: application/json" \
  -d '{
    "lighting_mode": "normal",
    "exposure_time": 5000,
    "analog_gain": 2.0,
    "digital_gain": 1.0,
    "wb_mode": "auto"
  }'

# Configure OpenCV
curl -X POST http://localhost:8000/api/camera/config/opencv \
  -H "Content-Type: application/json" \
  -d '{
    "denoising": {"mode": "gaussian", "h_parameter": 5},
    "clahe": {"enabled": true, "clip_limit": 2.0, "tile_size": 8},
    "sharpen": {"enabled": true, "amount": 1.0, "sigma": 1.5}
  }'
```

### Camera Control

```bash
# Start camera
curl -X POST http://localhost:8000/api/camera/start

# Stop camera
curl -X POST http://localhost:8000/api/camera/stop

# Capture image
curl -X POST http://localhost:8000/api/camera/capture
```

### Monitoring

```bash
# Get metrics
curl http://localhost:8000/api/camera/metrics

# Get status
curl http://localhost:8000/api/camera/status

# View stream
firefox http://localhost:8000/api/camera/stream
```

---

## 🎯 Common Tasks

### Apply a Preset Configuration

```typescript
import { imx477API } from '@/lib/imx477-api'

// Get available presets
const presets = await imx477API.getPresets()

// Apply "realtime" preset (30+ FPS)
await imx477API.configureComplete(presets.realtime)
```

### Monitor Performance in Real-Time

```typescript
import { useIMX477Metrics } from '@/lib/imx477-api'

function MyComponent() {
  const { metrics, isConnected } = useIMX477Metrics(true)
  
  return (
    <div>
      <p>FPS: {metrics?.fps}</p>
      <p>CPU: {metrics?.cpu_usage}%</p>
      <p>Temp: {metrics?.temperature}°C</p>
    </div>
  )
}
```

### Optimize for Low Light

```typescript
await imx477API.configureSensor({
  lighting_mode: 'low',
  exposure_time: 33333,  // 33ms
  analog_gain: 8.0,      // ISO 800
  digital_gain: 1.0,
  wb_mode: 'manual',
  awb_red_gain: 1.5,
  awb_blue_gain: 1.8
})

await imx477API.configureOpenCV({
  denoising: {
    mode: 'bilateral',  // Better for low light
    h_parameter: 15     // Strong denoising
  },
  clahe: {
    enabled: true,
    clip_limit: 3.0,    // Aggressive contrast
    tile_size: 8
  },
  sharpen: {
    enabled: true,
    amount: 0.5,        // Gentle sharpening
    sigma: 1.5
  }
})
```

---

## 🔧 Troubleshooting

### Camera Not Working

```bash
# Check camera detection
vcgencmd get_camera
# Should show: supported=1 detected=1

# If not detected:
sudo raspi-config
# → Interface Options → Camera → Enable
sudo reboot
```

### Poor Performance

```bash
# Set performance mode
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Check temperature
vcgencmd measure_temp

# Check throttling
vcgencmd get_throttled
# 0x0 = good, anything else = throttled
```

### Backend Won't Start

```bash
# Check if port is in use
sudo lsof -i :8000

# Kill existing process
sudo kill $(sudo lsof -t -i :8000)

# Check Python version (need 3.9+)
python3 --version

# Reinstall dependencies
pip install --force-reinstall -r backend/requirements_imx477.txt
```

---

## 📚 Documentation Links

- **Full Integration Guide**: [IMX477_INTEGRATION_GUIDE.md](./IMX477_INTEGRATION_GUIDE.md)
- **Implementation Summary**: [IMX477_IMPLEMENTATION_SUMMARY.md](./IMX477_IMPLEMENTATION_SUMMARY.md)
- **Technical Analysis**: [IMX477_CONFIGURATION_WIZARD_ANALYSIS.md](./IMX477_CONFIGURATION_WIZARD_ANALYSIS.md)
- **API Documentation**: http://localhost:8000/docs

---

## 🎨 UI Navigation

```
Configuration Wizard → Step 1: Image Optimization
├── Tab 1: Sensor Config
│   ├── Lighting Scenarios (Bright/Normal/Low/Astro)
│   ├── Exposure Time Control
│   ├── Gain Control (Analog + Digital)
│   ├── White Balance Settings
│   └── Focus Adjustment
├── Tab 2: OpenCV Enhancement
│   ├── Noise Reduction Algorithms
│   ├── CLAHE Configuration
│   ├── Sharpening Controls
│   └── Pipeline Presets
├── Tab 3: Performance
│   ├── Resolution Selection
│   ├── Target FPS Setting
│   ├── Pi 5 Optimizations
│   └── Performance Estimates
└── Tab 4: Live Preview
    ├── Real-time Video Stream
    ├── Preview Modes
    ├── Performance Metrics
    └── Image Quality Indicators
```

---

## ⚡ Performance Presets

### Real-time (30+ FPS)
```typescript
{
  sensor: { exposure_time: 5000, analog_gain: 2.0 },
  opencv: {
    denoising: { mode: 'gaussian', h_parameter: 5 },
    clahe: { clip_limit: 2.0 },
    sharpen: { amount: 1.0 }
  },
  performance: { resolution: '1080p', target_fps: 30 }
}
```

### Balanced (15-20 FPS)
```typescript
{
  sensor: { exposure_time: 10000, analog_gain: 4.0 },
  opencv: {
    denoising: { mode: 'bilateral', h_parameter: 10 },
    clahe: { clip_limit: 2.5 },
    sharpen: { amount: 1.5 }
  },
  performance: { resolution: '1080p', target_fps: 30 }
}
```

### Maximum Quality (Offline)
```typescript
{
  sensor: { exposure_time: 33333, analog_gain: 8.0 },
  opencv: {
    denoising: { mode: 'nlmeans', h_parameter: 15 },
    clahe: { clip_limit: 3.0 },
    sharpen: { amount: 0.5 }
  },
  performance: { resolution: '4k', target_fps: 15 }
}
```

---

## 🎓 Key Concepts

### ISO Calculation
```
ISO = 100 × Analog Gain × Digital Gain

Examples:
- Gain 1.0x = ISO 100 (daylight)
- Gain 4.0x = ISO 400 (indoor)
- Gain 8.0x = ISO 800 (low light)
- Gain 16.0x = ISO 1600 (night)
```

### Processing Order (Critical!)
```
1. Denoise  → Remove sensor noise
2. CLAHE    → Enhance contrast
3. Sharpen  → Enhance edges

❌ NEVER sharpen before denoising!
```

### Dual-Stream Architecture
```
Main Stream (1920×1080)  → Recording/Capture
    ↓
Lores Stream (640×480)   → Real-time Processing
    ↓
Enhanced Output          → Live Preview
```

---

## ✅ Success Checklist

- [ ] Backend starts without errors
- [ ] Camera detected by system
- [ ] API status returns `initialized: true`
- [ ] Frontend connects to backend
- [ ] Auto-optimize applies settings
- [ ] Live preview shows camera feed
- [ ] Metrics update in real-time
- [ ] FPS ≥ 25 at 1080p
- [ ] Temperature < 70°C
- [ ] No throttling warnings

---

## 🚀 Next Steps

1. **Test on Real Hardware**: Connect IMX477 to Pi 5
2. **Benchmark Performance**: Measure actual FPS
3. **Optimize Pipeline**: Tune for your use case
4. **Deploy to Production**: Use systemd service
5. **Add Cooling**: For sustained high performance
6. **Calibrate Lens**: If using C/CS mount lens

---

## 💡 Pro Tips

1. **Start with 720p** for initial testing
2. **Use Gaussian denoising** for real-time applications
3. **Enable dual-stream** for better performance
4. **Monitor temperature** - add cooling if > 65°C
5. **Use manual white balance** for consistent colors
6. **Capture RAW (DNG)** for maximum flexibility
7. **Test under actual lighting** conditions

---

## 📞 Support

- **API Docs**: http://localhost:8000/docs
- **Frontend UI**: http://localhost:3000/configure
- **GitHub Issues**: [Your Repo]
- **Discord**: [Your Channel]

---

**Status**: ✅ Ready for Testing  
**Last Updated**: January 2025  
**Platform**: Raspberry Pi 5 + IMX477 HQ Camera

