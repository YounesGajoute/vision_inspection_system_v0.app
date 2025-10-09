# Run Inspection Program - Production Guide

## Overview

The **Run Inspection Program** page is the production interface for real-time vision inspection. It provides live camera feed, automatic inspection processing, GPIO output control, and comprehensive statistics monitoring.

---

## Features

### ✅ Real-Time Inspection System
- **Live camera feed** via WebSocket streaming (10 FPS)
- **Automatic inspection** triggered by internal timer or external GPIO
- **Real-time processing** of all configured tools
- **Immediate visual feedback** with results overlay on canvas
- **GPIO output control** based on inspection results

### ✅ Program Management
- Load and select saved inspection programs
- Display program details (tools, thresholds, master image)
- Start/Stop/Pause inspection cycles
- Program switching (when stopped)

### ✅ Statistics & Monitoring
- **Live counters**: Total inspected, Pass, Fail, Pass rate
- **Performance metrics**: Processing time, cycle time, confidence
- **Recent results history**: Last 20 inspections
- **GPIO status**: Real-time output state visualization

---

## Architecture

### File Structure

```
app/run/page.tsx                 - Main run page component
lib/inspection-engine.ts          - Core inspection processing logic
lib/websocket.ts                  - WebSocket client for live feed
lib/storage.ts                    - Program storage management
```

### Key Components

#### 1. Inspection Engine (`lib/inspection-engine.ts`)

**Main Functions:**

- `processInspection()` - Main inspection processor
- `extractMasterFeatures()` - Extract reference features from master image
- Tool-specific processors:
  - `processOutlineTool()` - Shape matching with Hu moments
  - `processAreaTool()` - Monochrome area detection with Otsu thresholding
  - `processColorAreaTool()` - Color-based area detection (HSV)
  - `processEdgeDetectionTool()` - Sobel edge detection
  - `processPositionAdjustment()` - Template matching for position correction

**Image Processing Utilities:**

- Grayscale conversion
- Otsu's thresholding
- Contour detection (flood fill)
- Hu moment calculation
- RGB to HSV conversion
- Sobel edge detection

#### 2. Run Page (`app/run/page.tsx`)

**State Management:**

```typescript
- programs[]                    // Available programs
- selectedProgram              // Current program
- isRunning, isPaused          // Control state
- currentFrame                 // Live camera frame
- currentResult                // Latest inspection result
- recentResults[]              // History of last 20 inspections
- statistics                   // Real-time statistics
- gpioOutputs[]                // GPIO state
- masterFeatures               // Reference features
```

**Core Functions:**

- `performInspection()` - Execute inspection cycle
- `updateStatistics()` - Update live statistics
- `updateGPIOFromResult()` - Control GPIO based on results
- `drawInspectionResult()` - Render results on canvas
- `handleStart/Stop/Pause()` - Control functions

---

## Usage Guide

### 1. Starting an Inspection

1. **Select Program**: Choose an inspection program from dropdown
2. **Click Start**: Begins inspection cycle
3. **Monitor**: Watch live feed and statistics

```typescript
// Program must have:
- Master image registered
- Tools configured with ROIs
- GPIO outputs assigned
```

### 2. Trigger Types

**Internal Trigger (Timer-based)**
- Inspection runs at fixed intervals (1-10000ms)
- Configured in Step 1 of setup wizard
- Default: 2000ms (2 seconds)

**External Trigger (GPIO-based)**
- Inspection triggered by external signal
- Requires GPIO input configuration
- Delay configurable (0-1000ms)

**Manual Trigger (Button)**
- Click the **Trigger** button to run inspection on-demand
- Available when inspection is running (not paused)
- Runs immediately, independent of automatic triggers
- Useful for testing and debugging production setups
- Orange button with target icon

### 3. Tool Processing Flow

```
1. Load current camera frame
2. Position Adjustment (if configured)
   - Template matching to find offset
   - Apply offset to all tool ROIs
3. Process each tool:
   - Extract ROI from image
   - Apply tool-specific algorithm
   - Calculate matching rate
   - Compare with threshold
   - Determine OK/NG status
4. Calculate overall result
5. Update GPIO outputs
6. Update statistics
7. Display results
```

### 4. GPIO Output Control

**Fixed Outputs:**
- **OUT1 (BUSY)**: Active during inspection processing
- **OUT2 (OK Signal)**: Pulses when inspection passes (300ms)
- **OUT3 (NG Signal)**: Pulses when inspection fails (300ms)

**Configurable Outputs (OUT4-OUT8):**
- **OK**: Active when result is PASS
- **NG**: Active when result is FAIL
- **Always ON**: Constantly active
- **Always OFF**: Always inactive
- **Not Used**: Disabled

### 5. Statistics Tracking

**Real-time Metrics:**

```typescript
totalInspected    // Total number of inspections
passed            // Number of PASS results
failed            // Number of FAIL results
passRate          // (passed / total) * 100
avgProcessingTime // Average processing time (ms)
currentCycleTime  // Last inspection processing time (ms)
avgConfidence     // Average confidence score (%)
uptime            // Total running time (ms)
```

---

## WebSocket Integration

### Connection

```typescript
// Automatic connection when inspection starts
ws.connect()
ws.subscribeLiveFeed(10) // 10 FPS

// Events
ws.on("live_frame", handleLiveFrame)
ws.on("inspection_result", handleInspectionResult)
ws.on("error", handleWSError)
```

### Live Frame Event

```typescript
interface LiveFrameEvent {
  image: string;        // Base64 encoded JPEG
  frameNumber: number;  // Sequential frame number
  timestamp: number;    // Unix timestamp
}
```

### Auto-reconnection

- Automatically reconnects on disconnect
- Retry interval: 3 seconds
- Infinite retry attempts

---

## Inspection Result Format

```typescript
interface InspectionResult {
  id: string;                    // "INS-{timestamp}"
  timestamp: Date;               // Inspection time
  programId: string | number;    // Program ID
  status: "OK" | "NG";          // Overall result
  overallConfidence: number;     // 0-100
  processingTime: number;        // ms
  toolResults: ToolResult[];     // Individual tool results
  image: string;                 // Base64 image
  positionOffset?: {             // Position adjustment
    x: number;
    y: number;
  };
}
```

### Tool Result Format

```typescript
interface ToolResult {
  tool_type: ToolType;           // Tool type
  name: string;                  // Tool name
  status: "OK" | "NG";          // Result
  matching_rate: number;         // 0-100
  threshold: number;             // Configured threshold
  upper_limit?: number;          // Range upper limit
  confidence?: number;           // Processing confidence
  error?: string;                // Error message (if failed)
}
```

---

## Canvas Rendering

### Live Feed Display

- Camera frames drawn in real-time
- Resolution: 640x480 (default)
- Automatic scaling to fit container

### Result Overlay

When inspection completes:

1. **ROI Rectangles**
   - Green border: PASS
   - Red border: FAIL
   - Line width: 3px

2. **Tool Labels**
   - Background: Match tool color
   - Text: Tool name + match rate
   - Position: Above ROI

3. **Overall Status**
   - Top-left corner
   - Large text: "OK" or "NG"
   - Background: Semi-transparent color

### Position Offset Visualization

If position adjustment tool is used:
- All ROIs shifted by offset (x, y)
- Original position not shown
- Offset displayed in result data

---

## Performance Optimization

### Target Performance

- **Processing Time**: < 50ms per inspection
- **Frame Rate**: 10 FPS live feed
- **GPU Acceleration**: Use when available
- **Memory Management**: Cleanup after each cycle

### Bottlenecks

**Image Processing:**
- Grayscale conversion: ~2ms
- Otsu thresholding: ~5ms
- Contour detection: ~10ms
- Edge detection: ~15ms

**Optimization Tips:**

1. **Reduce ROI size** - Smaller regions process faster
2. **Limit tool count** - Each tool adds processing time
3. **Use position adjustment wisely** - Adds ~20ms overhead
4. **Enable hardware acceleration** - Use WebGL/GPU when possible
5. **Optimize canvas rendering** - Use offscreen canvas for processing

---

## Error Handling

### Common Errors

**1. No Camera Frame**
```
Error: Cannot perform inspection: no program or frame
Fix: Ensure camera is connected and WebSocket is active
```

**2. WebSocket Connection Failed**
```
Error: WebSocket connection failed
Fix: Check backend is running (port 5000)
Command: npm run backend
```

**3. GPIO Write Failed**
```
Error: GPIO write failed
Fix: Check backend GPIO service is running
```

**4. Inspection Processing Error**
```
Error: Tool processing failed
Fix: Check master image is registered and ROIs are valid
```

### Recovery Mechanisms

- **Auto-reconnect**: WebSocket reconnects automatically
- **Graceful degradation**: Inspection continues even if GPIO fails
- **Error logging**: All errors logged to console
- **Status indicators**: Visual feedback on connection state

---

## API Integration

### Save Inspection Result

```typescript
// POST /api/inspections
{
  "id": "INS-1234567890",
  "program_id": "PRG-001",
  "timestamp": "2024-01-01T12:00:00Z",
  "overall_status": "OK",
  "processing_time_ms": 45.2,
  "tool_results": [...],
  "trigger_type": "internal"
}
```

### Update Program Statistics

```typescript
// PATCH /api/programs/{id}/stats
{
  "totalInspections": 100,
  "okCount": 95,
  "ngCount": 5,
  "lastRun": "2024-01-01T12:00:00Z"
}
```

### GPIO Control

```typescript
// POST /api/gpio/write
{
  "pin": "OUT2",
  "value": true
}
```

---

## Testing Checklist

### Basic Functionality
- [x] Program selection loads correctly
- [x] Start/Stop/Pause controls work
- [x] Live camera feed displays
- [x] Inspection triggers correctly (internal timer)
- [x] Inspection triggers correctly (external GPIO)

### Tool Processing
- [x] Outline tool processes correctly
- [x] Area tool processes correctly
- [x] Color area tool processes correctly
- [x] Edge detection tool processes correctly
- [x] Position adjustment tool works

### Results & Display
- [x] Results display on canvas with overlays
- [x] Statistics update in real-time
- [x] GPIO outputs change based on results
- [x] Recent results list updates
- [x] Processing time is accurate
- [x] Pass/Fail logic works correctly

### Integration
- [x] WebSocket connects and reconnects
- [x] Live feed streams at target FPS
- [x] Backend API communication works
- [x] GPIO hardware control works
- [x] Export functionality works

---

## Production Deployment

### Pre-deployment Steps

1. **Configure Backend URL**
   ```typescript
   // lib/websocket.ts
   const ws = new WebSocketClient('ws://YOUR_IP:5000');
   ```

2. **Set Camera Parameters**
   ```python
   # backend/camera_service.py
   CAMERA_WIDTH = 640
   CAMERA_HEIGHT = 480
   CAMERA_FPS = 10
   ```

3. **Configure GPIO Pins**
   ```python
   # backend/gpio_service.py
   GPIO_OUTPUTS = {
       'OUT1': 17,  # GPIO pin numbers
       'OUT2': 18,
       'OUT3': 27,
       ...
   }
   ```

4. **Optimize Performance**
   - Enable hardware acceleration
   - Reduce canvas resolution if needed
   - Adjust trigger intervals
   - Limit recent results history

### Monitoring

**Health Checks:**
- Camera connection status
- WebSocket connection status
- GPIO service status
- Processing time trends
- Error rates

**Logging:**
- All inspection results saved to database
- GPIO state changes logged
- Performance metrics tracked
- Errors logged with timestamps

---

## Troubleshooting

### Camera Not Showing

**Check:**
1. Backend is running: `npm run backend`
2. Camera is connected: `/dev/video0` exists
3. WebSocket URL is correct
4. Browser allows camera access

### Slow Processing

**Optimize:**
1. Reduce ROI sizes
2. Limit number of tools
3. Increase trigger interval
4. Use hardware acceleration

### GPIO Not Working

**Check:**
1. GPIO service is running
2. Correct pin numbers configured
3. Permissions set correctly
4. Hardware connections verified

### High Failure Rate

**Investigate:**
1. Master image quality
2. Threshold settings too strict
3. Lighting conditions changed
4. Camera focus/position shifted

---

## Advanced Features

### Custom Tool Development

To add a new tool type:

1. **Define tool in types**
   ```typescript
   // types/index.ts
   export type ToolType = 'outline' | 'area' | 'color_area' | 'edge_detection' | 'position_adjust' | 'YOUR_TOOL';
   ```

2. **Implement processor**
   ```typescript
   // lib/inspection-engine.ts
   async function processYourTool(canvas, tool, options) {
     // Your algorithm here
     return { matchingRate, confidence };
   }
   ```

3. **Add to router**
   ```typescript
   case 'YOUR_TOOL':
     result = await processYourTool(roiCanvas, tool, options);
     break;
   ```

### Backend Integration

For hardware-accelerated processing:

1. **Send frame to backend**
   ```typescript
   const response = await fetch('/api/inspect', {
     method: 'POST',
     body: JSON.stringify({ image: frame, tools })
   });
   const result = await response.json();
   ```

2. **Backend processes with OpenCV**
   ```python
   @app.route('/api/inspect', methods=['POST'])
   def inspect():
       data = request.json
       image = decode_base64(data['image'])
       tools = data['tools']
       result = process_inspection(image, tools)
       return jsonify(result)
   ```

---

## License

Part of Vision Inspection System v0
© 2024 All Rights Reserved

---

## Support

For issues or questions:
- Check troubleshooting section
- Review error logs
- Contact system administrator
- Submit bug report with logs and screenshots

