# IMX477 Camera Integration Guide
**Raspberry Pi 5 + Next.js Frontend**

## Overview

This guide provides complete instructions for integrating the IMX477 camera backend with the Next.js frontend configuration wizard.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Step1ImageOptimization.tsx (React Component)        │   │
│  │  - 4 Tabs: Sensor, OpenCV, Performance, Preview     │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │  lib/imx477-api.ts (TypeScript API Client)          │   │
│  │  - HTTP REST calls                                   │   │
│  │  - WebSocket metrics streaming                       │   │
│  │  - React hooks (useIMX477Metrics, useCameraStatus)  │   │
│  └──────────────┬───────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  │ HTTP/WebSocket
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              FastAPI Backend (Python)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  backend/imx477_camera.py                            │   │
│  │  - Picamera2 control                                 │   │
│  │  - OpenCV enhancement pipeline                       │   │
│  │  - Performance monitoring                            │   │
│  │  - MJPEG streaming                                   │   │
│  └──────────────┬───────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  │ libcamera API
                  │
┌─────────────────▼───────────────────────────────────────────┐
│            IMX477 HQ Camera (Hardware)                       │
│  - 12.3MP Sony sensor                                        │
│  - 1.55μm pixel size                                         │
│  - 11.3 stops dynamic range                                 │
│  - 1.0-16.0x analog gain                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Setup Instructions

### 1. Backend Setup (Raspberry Pi 5)

#### Install Dependencies

```bash
cd /home/Bot/Desktop/vision_inspection_system_v0.app

# Install Python packages
pip install -r backend/requirements_imx477.txt

# For optimal performance, compile OpenCV with NEON support:
# (Optional - only if you want maximum performance)
git clone https://github.com/opencv/opencv.git
cd opencv && mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=RELEASE \
      -DENABLE_NEON=ON \
      -DENABLE_VFPV3=ON \
      -DWITH_TBB=ON \
      -DWITH_V4L=ON \
      -DWITH_QT=OFF \
      -DWITH_OPENGL=ON \
      -DOPENCV_EXTRA_MODULES_PATH=../../opencv_contrib/modules \
      ..
make -j4
sudo make install
```

#### Enable Camera Interface

```bash
# Add to /boot/config.txt
sudo nano /boot/config.txt

# Add these lines:
camera_auto_detect=1
dtoverlay=vc4-kms-v3d,cma-512  # 512MB CMA for 4K capture

# Reboot
sudo reboot
```

#### Start the Service

```bash
# Method 1: Using the startup script
./scripts/start_imx477_service.sh

# Method 2: Direct uvicorn
cd backend
python3 -m uvicorn imx477_camera:app --host 0.0.0.0 --port 8000

# Method 3: Systemd service (production)
sudo cp scripts/imx477-camera.service /etc/systemd/system/
sudo systemctl enable imx477-camera
sudo systemctl start imx477-camera
```

### 2. Frontend Integration

#### Environment Configuration

Create or update `.env.local`:

```bash
# Camera API endpoint
NEXT_PUBLIC_CAMERA_API_URL=http://localhost:8000

# For production (Pi IP address)
# NEXT_PUBLIC_CAMERA_API_URL=http://192.168.1.100:8000
```

#### Update Step1ImageOptimization Component

The component is already updated, but ensure these imports are added:

```typescript
import { imx477API, useIMX477Metrics, useCameraStatus } from '@/lib/imx477-api'
```

---

## API Integration Examples

### 1. Configure Sensor

```typescript
import { imx477API } from '@/lib/imx477-api'

const configureSensor = async () => {
  const response = await imx477API.configureSensor({
    lighting_mode: 'normal',
    exposure_time: 5000,  // 5ms
    analog_gain: 2.0,
    digital_gain: 1.0,
    wb_mode: 'auto'
  })
  
  if (response.success) {
    console.log(`ISO: ${response.data?.iso_equivalent}`)
  }
}
```

### 2. Configure OpenCV Enhancement

```typescript
const configureOpenCV = async () => {
  await imx477API.configureOpenCV({
    denoising: {
      mode: 'gaussian',
      h_parameter: 5
    },
    clahe: {
      enabled: true,
      clip_limit: 2.0,
      tile_size: 8
    },
    sharpen: {
      enabled: true,
      amount: 1.0,
      sigma: 1.5
    }
  })
}
```

### 3. Real-Time Metrics with React Hook

```typescript
import { useIMX477Metrics } from '@/lib/imx477-api'

function CameraMetrics() {
  const { metrics, isConnected } = useIMX477Metrics(true)
  
  if (!isConnected || !metrics) {
    return <div>Connecting...</div>
  }
  
  return (
    <div>
      <p>FPS: {metrics.fps.toFixed(1)}</p>
      <p>CPU: {metrics.cpu_usage.toFixed(1)}%</p>
      <p>Temperature: {metrics.temperature.toFixed(1)}°C</p>
      {metrics.throttled && <p className="text-red-500">⚠️ Throttled!</p>}
    </div>
  )
}
```

### 4. Live Video Stream

```tsx
function LivePreview() {
  const streamUrl = imx477API.getStreamUrl()
  
  return (
    <img 
      src={streamUrl} 
      alt="Live camera feed"
      className="w-full h-auto"
    />
  )
}
```

### 5. Apply Complete Configuration

```typescript
const applyCompleteConfig = async () => {
  await imx477API.configureComplete({
    sensor: {
      lighting_mode: 'normal',
      exposure_time: 5000,
      analog_gain: 2.0,
      digital_gain: 1.0,
      wb_mode: 'auto'
    },
    opencv: {
      denoising: { mode: 'gaussian', h_parameter: 5 },
      clahe: { enabled: true, clip_limit: 2.0, tile_size: 8 },
      sharpen: { enabled: true, amount: 1.0, sigma: 1.5 }
    },
    performance: {
      resolution: '1080p',
      target_fps: 30,
      neon_enabled: true,
      dual_stream_enabled: true
    }
  })
}
```

---

## Connecting Frontend to Backend

### Update Step1ImageOptimization.tsx

Add these functions to connect the UI controls to the backend:

```typescript
// Add to Step1ImageOptimization component
const { metrics, isConnected } = useIMX477Metrics(isPreviewActive)

// Apply sensor config when changed
useEffect(() => {
  if (!isPreviewActive) return
  
  const applyConfig = async () => {
    await imx477API.configureSensor({
      lighting_mode: lightingMode,
      exposure_time: exposureTime[0],
      analog_gain: analogGain[0],
      digital_gain: digitalGain[0],
      wb_mode: whiteBalanceMode,
      awb_red_gain: awbRedGain[0],
      awb_blue_gain: awbBlueGain[0]
    })
  }
  
  applyConfig()
}, [lightingMode, exposureTime, analogGain, digitalGain, whiteBalanceMode])

// Apply OpenCV config when changed
useEffect(() => {
  if (!isPreviewActive) return
  
  const applyConfig = async () => {
    await imx477API.configureOpenCV({
      denoising: {
        mode: denoisingMode,
        h_parameter: denoisingH[0]
      },
      clahe: {
        enabled: claheEnabled,
        clip_limit: claheClipLimit[0],
        tile_size: claheTileSize[0]
      },
      sharpen: {
        enabled: sharpenEnabled,
        amount: sharpenAmount[0],
        sigma: sharpenSigma[0]
      }
    })
  }
  
  applyConfig()
}, [denoisingMode, denoisingH, claheEnabled, claheClipLimit, claheTileSize, sharpenEnabled, sharpenAmount, sharpenSigma])

// Update preview to use real stream
const handleStartPreview = async () => {
  const response = await imx477API.startCamera()
  if (response.success) {
    setIsPreviewActive(true)
  }
}

const handleStopPreview = async () => {
  await imx477API.stopCamera()
  setIsPreviewActive(false)
}
```

### Replace Canvas Preview with Video Stream

```tsx
{/* Replace canvas with real stream */}
{isPreviewActive ? (
  <img
    src={imx477API.getStreamUrl()}
    alt="Live camera feed"
    className="w-full rounded-lg border-2 border-border bg-black"
    onError={(e) => {
      console.error('Stream error:', e)
      setIsPreviewActive(false)
    }}
  />
) : (
  <div className="w-full aspect-video rounded-lg border-2 border-border bg-black flex items-center justify-center">
    <p className="text-muted-foreground">Camera preview stopped</p>
  </div>
)}
```

### Use Real Metrics

```tsx
{/* Use real metrics from WebSocket */}
<div className="p-3 bg-accent rounded-lg">
  <div className="text-sm text-muted-foreground mb-1">Frame Rate</div>
  <div className="text-3xl font-mono font-bold text-green-500">
    {metrics?.fps.toFixed(1) || '0.0'}
  </div>
  <div className="text-sm text-muted-foreground">FPS</div>
</div>

<div className="p-3 bg-accent rounded-lg">
  <div className="text-sm text-muted-foreground mb-1">Processing Time</div>
  <div className="text-3xl font-mono font-bold text-blue-500">
    {metrics?.avg_processing_time.toFixed(1) || '0.0'}
  </div>
  <div className="text-sm text-muted-foreground">milliseconds</div>
</div>

<div className="p-3 bg-accent rounded-lg">
  <div className="text-sm text-muted-foreground mb-1">CPU Usage</div>
  <div className="text-3xl font-mono font-bold text-purple-500">
    {metrics?.cpu_usage.toFixed(1) || '0.0'}
  </div>
  <div className="text-sm text-muted-foreground">percent</div>
</div>

<div className="p-3 bg-accent rounded-lg">
  <div className="text-sm text-muted-foreground mb-1">Temperature</div>
  <div className={`text-3xl font-mono font-bold ${
    (metrics?.temperature || 0) > 70 ? 'text-red-500' : 'text-orange-500'
  }`}>
    {metrics?.temperature.toFixed(1) || '0.0'}
  </div>
  <div className="text-sm text-muted-foreground">°C</div>
</div>
```

---

## Testing

### 1. Backend Testing

```bash
# Test API is running
curl http://localhost:8000/api/camera/status

# Test sensor configuration
curl -X POST http://localhost:8000/api/camera/config/sensor \
  -H "Content-Type: application/json" \
  -d '{
    "lighting_mode": "normal",
    "exposure_time": 5000,
    "analog_gain": 2.0,
    "digital_gain": 1.0,
    "wb_mode": "auto"
  }'

# Test video stream
firefox http://localhost:8000/api/camera/stream
```

### 2. Frontend Testing

```bash
# Start Next.js dev server
npm run dev

# Navigate to configuration wizard
# http://localhost:3000/configure

# Test each tab:
# 1. Sensor Config - adjust exposure and gain
# 2. OpenCV Enhancement - toggle denoising
# 3. Performance - change resolution
# 4. Live Preview - start/stop stream
```

---

## Troubleshooting

### Camera Not Detected

```bash
# Check camera status
vcgencmd get_camera

# Should show: supported=1 detected=1

# If not, check connections and run:
sudo raspi-config
# Interface Options -> Camera -> Enable
```

### Poor Performance

```bash
# Check CPU governor
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Should be 'performance', if not:
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Check throttling
vcgencmd get_throttled
# 0x0 = no throttling, anything else = throttled

# Add cooling fan if temperature > 70°C
```

### Stream Not Loading

```bash
# Check if backend is running
curl http://localhost:8000/api/camera/status

# Check CORS settings (if frontend on different host)
# Add to imx477_camera.py:
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Production Deployment

### Systemd Service

Create `/etc/systemd/system/imx477-camera.service`:

```ini
[Unit]
Description=IMX477 Camera API Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/vision_inspection_system
Environment="PATH=/home/pi/vision_inspection_system/venv/bin"
ExecStart=/home/pi/vision_inspection_system/venv/bin/python3 -m uvicorn backend.imx477_camera:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable imx477-camera
sudo systemctl start imx477-camera
```

### Nginx Reverse Proxy

```nginx
location /camera-api/ {
    proxy_pass http://localhost:8000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## Performance Optimization Tips

1. **Use dual-stream mode** - Process low-res, save high-res
2. **Enable NEON SIMD** - 30-48% performance boost
3. **Adjust resolution** - Start with 720p for testing
4. **Choose appropriate denoising** - Gaussian for real-time
5. **Monitor temperature** - Add active cooling if needed
6. **Fix CPU frequency** - Use performance governor
7. **Increase CMA memory** - 512MB for 4K capture

---

## Next Steps

1. ✅ Backend API implemented
2. ✅ Frontend UI completed
3. 🔄 Integration in progress
4. ⏳ Testing on real hardware
5. ⏳ Production deployment
6. ⏳ Performance benchmarking

---

## Support & Documentation

- **API Documentation**: http://localhost:8000/docs
- **IMX477 Datasheet**: [Sony IMX477 Specifications](https://www.sony-semicon.co.jp/products/common/pdf/IMX477-AACK_Flyer.pdf)
- **Picamera2 Manual**: https://datasheets.raspberrypi.com/camera/picamera2-manual.pdf
- **FastAPI Docs**: https://fastapi.tiangolo.com/

---

**Status**: Backend complete, ready for hardware testing
**Last Updated**: 2024
**Author**: Vision Inspection System Team

