# Run Inspection Page - API Specification

## Overview

This document describes the API endpoints and WebSocket events used by the Run Inspection page.

---

## WebSocket Events

Base URL: `ws://localhost:5000`

### Connection Events

#### `connect`
Client connected to WebSocket server.

**Server → Client**
```json
{
  "type": "connected",
  "data": {
    "status": "connected",
    "timestamp": 1234567890
  }
}
```

#### `disconnect`
Client disconnected from server.

**Reason codes:**
- `io server disconnect` - Server initiated
- `io client disconnect` - Client initiated  
- `ping timeout` - Connection lost
- `transport close` - Network error

---

### Live Feed Events

#### `subscribe_live_feed`
Subscribe to live camera feed.

**Client → Server**
```json
{
  "fps": 10
}
```

**Response: `live_feed_started`**
```json
{
  "message": "Live feed started",
  "fps": 10,
  "timestamp": 1234567890
}
```

#### `live_frame`
Receive live camera frame.

**Server → Client**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "frameNumber": 123,
  "timestamp": 1234567890
}
```

**Rate**: Based on subscribed FPS (default: 10 FPS)

#### `unsubscribe_live_feed`
Unsubscribe from live camera feed.

**Client → Server**
```json
{}
```

**Response: `live_feed_stopped`**
```json
{
  "message": "Live feed stopped",
  "timestamp": 1234567890
}
```

---

### Inspection Events

#### `start_inspection`
Start continuous inspection.

**Client → Server**
```json
{
  "programId": 1,
  "continuous": true
}
```

**Response: `inspection_started`**
```json
{
  "message": "Inspection started",
  "programId": 1,
  "continuous": true,
  "timestamp": 1234567890
}
```

#### `inspection_result`
Receive inspection result.

**Server → Client**
```json
{
  "programId": 1,
  "status": "OK",
  "toolResults": [
    {
      "tool_type": "outline",
      "name": "Pattern Match",
      "status": "OK",
      "matching_rate": 92.5,
      "threshold": 85,
      "confidence": 95.0
    }
  ],
  "processingTime": 45.2,
  "inspectionCount": 123,
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "timestamp": 1234567890,
  "single": false
}
```

#### `stop_inspection`
Stop current inspection.

**Client → Server**
```json
{}
```

**Response: `inspection_stopped`**
```json
{
  "message": "Inspection stopped",
  "timestamp": 1234567890
}
```

---

### System Status Events

#### `request_system_status`
Request current system status.

**Client → Server**
```json
{}
```

**Response: `system_status`**
```json
{
  "activeInspections": 1,
  "activeLiveFeeds": 2,
  "timestamp": 1234567890
}
```

---

### Error Events

#### `error`
Error occurred on server.

**Server → Client**
```json
{
  "message": "Camera not available",
  "details": {
    "code": "CAMERA_ERROR",
    "device": "/dev/video0"
  }
}
```

#### `warning`
Warning from server.

**Server → Client**
```json
{
  "message": "High processing time detected",
  "details": {
    "processingTime": 150,
    "threshold": 100
  }
}
```

---

## REST API Endpoints

Base URL: `http://localhost:5000/api`

### Programs

#### GET `/programs`
Get all inspection programs.

**Response**
```json
{
  "programs": [
    {
      "id": 1,
      "name": "PCB Assembly Check",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z",
      "last_run": "2024-01-01T14:00:00Z",
      "total_inspections": 125,
      "ok_count": 118,
      "ng_count": 7,
      "is_active": true,
      "config": {
        "triggerType": "internal",
        "triggerInterval": 2000,
        "brightnessMode": "normal",
        "focusValue": 50,
        "masterImage": "data:image/jpeg;base64,...",
        "tools": [...],
        "outputs": {...}
      }
    }
  ]
}
```

#### GET `/programs/:id`
Get specific program by ID.

**Response**
```json
{
  "id": 1,
  "name": "PCB Assembly Check",
  ...
}
```

#### PATCH `/programs/:id/stats`
Update program statistics.

**Request**
```json
{
  "totalInspections": 126,
  "okCount": 119,
  "ngCount": 7,
  "lastRun": "2024-01-01T14:32:15Z"
}
```

**Response**
```json
{
  "message": "Statistics updated successfully",
  "programId": 1
}
```

---

### Camera

#### GET `/camera/capture`
Capture single frame from camera.

**Query Parameters**
- `brightnessMode` (optional): `normal`, `hdr`, `highgain`
- `focusValue` (optional): `0-100`

**Response**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "timestamp": "2024-01-01T14:32:15Z",
  "quality": {
    "brightness": 128,
    "sharpness": 85,
    "exposure": 100,
    "score": 92
  }
}
```

#### GET `/camera/status`
Get camera status.

**Response**
```json
{
  "connected": true,
  "device": "/dev/video0",
  "resolution": {
    "width": 640,
    "height": 480
  },
  "fps": 30,
  "format": "MJPEG"
}
```

---

### GPIO

#### POST `/gpio/write`
Write value to GPIO output.

**Request**
```json
{
  "pin": "OUT2",
  "value": true
}
```

**Response**
```json
{
  "message": "GPIO write successful",
  "pin": "OUT2",
  "value": true
}
```

#### GET `/gpio/read/:pin`
Read value from GPIO pin.

**Response**
```json
{
  "pin": "OUT2",
  "value": true
}
```

#### GET `/gpio/status`
Get all GPIO pin states.

**Response**
```json
{
  "outputs": {
    "OUT1": false,
    "OUT2": true,
    "OUT3": false,
    "OUT4": false,
    "OUT5": false,
    "OUT6": false,
    "OUT7": false,
    "OUT8": false
  },
  "inputs": {
    "IN1": false,
    "IN2": false
  }
}
```

---

### Inspections

#### POST `/inspections`
Save inspection result to database.

**Request**
```json
{
  "program_id": 1,
  "timestamp": "2024-01-01T14:32:15Z",
  "overall_status": "OK",
  "processing_time_ms": 45.2,
  "tool_results": [
    {
      "tool_type": "outline",
      "name": "Pattern Match",
      "status": "OK",
      "matching_rate": 92.5,
      "threshold": 85,
      "confidence": 95.0
    }
  ],
  "trigger_type": "internal",
  "notes": ""
}
```

**Response**
```json
{
  "message": "Inspection saved successfully",
  "id": 123
}
```

#### GET `/inspections`
Get inspection history.

**Query Parameters**
- `program_id` (optional): Filter by program
- `status` (optional): Filter by status (`OK`, `NG`)
- `limit` (optional): Limit results (default: 100)
- `offset` (optional): Pagination offset (default: 0)
- `start_date` (optional): Start date filter (ISO 8601)
- `end_date` (optional): End date filter (ISO 8601)

**Response**
```json
{
  "inspections": [
    {
      "id": 123,
      "program_id": 1,
      "timestamp": "2024-01-01T14:32:15Z",
      "overall_status": "OK",
      "processing_time_ms": 45.2,
      "tool_results": [...],
      "trigger_type": "internal"
    }
  ],
  "total": 125,
  "limit": 100,
  "offset": 0
}
```

#### GET `/inspections/:id`
Get specific inspection by ID.

**Response**
```json
{
  "id": 123,
  "program_id": 1,
  "timestamp": "2024-01-01T14:32:15Z",
  "overall_status": "OK",
  "processing_time_ms": 45.2,
  "tool_results": [...],
  "image_path": "/data/inspections/123.jpg",
  "trigger_type": "internal",
  "notes": ""
}
```

#### GET `/inspections/:id/image`
Get inspection image.

**Response**
```
Content-Type: image/jpeg
Binary image data
```

---

### System Health

#### GET `/health`
System health check.

**Response**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T14:32:15Z",
  "components": {
    "camera": "ok",
    "gpio": "ok",
    "database": "ok",
    "storage": "ok"
  },
  "uptime": 86400
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 404 | Not Found |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Error Response Format

```json
{
  "error": "CAMERA_NOT_AVAILABLE",
  "message": "Camera device not found",
  "details": {
    "device": "/dev/video0",
    "timestamp": "2024-01-01T14:32:15Z"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `CAMERA_NOT_AVAILABLE` | Camera not connected or accessible |
| `GPIO_ERROR` | GPIO operation failed |
| `PROGRAM_NOT_FOUND` | Program ID does not exist |
| `INVALID_REQUEST` | Request validation failed |
| `PROCESSING_ERROR` | Inspection processing failed |
| `DATABASE_ERROR` | Database operation failed |
| `STORAGE_ERROR` | File storage operation failed |

---

## Rate Limits

### WebSocket
- **Live Feed**: Max 30 FPS per connection
- **Inspection Results**: No limit (as fast as processing)

### REST API
- **General**: 100 requests per minute per IP
- **Camera Capture**: 10 requests per minute
- **GPIO Write**: 50 requests per minute

---

## Authentication

*(To be implemented in production)*

### JWT Token

**Request Header**
```
Authorization: Bearer <token>
```

**Token Payload**
```json
{
  "user_id": 1,
  "role": "operator",
  "exp": 1234567890
}
```

### API Key

**Request Header**
```
X-API-Key: <api_key>
```

---

## Data Types

### ToolResult

```typescript
interface ToolResult {
  tool_type: 'outline' | 'area' | 'color_area' | 'edge_detection' | 'position_adjust';
  name: string;
  status: 'OK' | 'NG';
  matching_rate: number;  // 0-100
  threshold: number;      // 0-100
  upper_limit?: number;   // 0-200
  confidence?: number;    // 0-100
  error?: string;
  offset?: {
    dx: number;
    dy: number;
  };
}
```

### Program

```typescript
interface Program {
  id: number;
  name: string;
  created_at: string;     // ISO 8601
  updated_at: string;     // ISO 8601
  last_run: string | null;
  total_inspections: number;
  ok_count: number;
  ng_count: number;
  is_active: boolean;
  config: ProgramConfig;
}
```

### ProgramConfig

```typescript
interface ProgramConfig {
  triggerType: 'internal' | 'external';
  triggerInterval?: number;  // 1-10000 ms
  triggerDelay?: number;     // 0-1000 ms
  brightnessMode: 'normal' | 'hdr' | 'highgain';
  focusValue: number;        // 0-100
  masterImage: string | null;
  tools: ToolConfig[];
  outputs: OutputAssignment;
}
```

---

## WebSocket Client Example

### TypeScript

```typescript
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

// Connect
socket.on('connect', () => {
  console.log('Connected');
  
  // Subscribe to live feed
  socket.emit('subscribe_live_feed', { fps: 10 });
});

// Receive frames
socket.on('live_frame', (data) => {
  console.log('Frame received:', data.frameNumber);
  displayImage(data.image);
});

// Receive inspection results
socket.on('inspection_result', (data) => {
  console.log('Result:', data.status);
  updateUI(data);
});

// Handle errors
socket.on('error', (data) => {
  console.error('Error:', data.message);
});

// Disconnect
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

### Python (Backend)

```python
from flask import Flask
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('subscribe_live_feed')
def handle_subscribe_live_feed(data):
    fps = data.get('fps', 10)
    # Start live feed thread
    emit('live_feed_started', {
        'message': 'Live feed started',
        'fps': fps,
        'timestamp': int(time.time())
    })

@socketio.on('start_inspection')
def handle_start_inspection(data):
    program_id = data.get('programId')
    continuous = data.get('continuous', True)
    # Start inspection thread
    emit('inspection_started', {
        'message': 'Inspection started',
        'programId': program_id,
        'continuous': continuous,
        'timestamp': int(time.time())
    })

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
```

---

## Testing

### Manual Testing with curl

**Capture Frame**
```bash
curl http://localhost:5000/api/camera/capture
```

**Write GPIO**
```bash
curl -X POST http://localhost:5000/api/gpio/write \
  -H "Content-Type: application/json" \
  -d '{"pin": "OUT2", "value": true}'
```

**Get Programs**
```bash
curl http://localhost:5000/api/programs
```

### Testing with Postman

Import the API collection:
1. Create new collection
2. Add environment variables:
   - `base_url`: `http://localhost:5000`
3. Add requests for each endpoint
4. Test WebSocket using Postman WebSocket feature

---

## Performance Benchmarks

### Expected Performance

| Operation | Target | Typical |
|-----------|--------|---------|
| Frame capture | < 50ms | 30-40ms |
| Single tool processing | < 20ms | 10-15ms |
| Full inspection (3 tools) | < 100ms | 50-80ms |
| GPIO write | < 5ms | 1-2ms |
| Database save | < 50ms | 20-30ms |

### Optimization Tips

1. **Use binary image format** - Faster than base64
2. **Batch GPIO writes** - Reduce API calls
3. **Cache program data** - Avoid repeated fetches
4. **Compress WebSocket data** - Reduce bandwidth
5. **Use connection pooling** - Faster database access

---

## Changelog

### v1.0.0 (2024-10-09)
- Initial API specification
- WebSocket events defined
- REST endpoints specified
- Data types documented

---

## Support

For API issues or questions:
- Review error codes
- Check server logs
- Test with curl/Postman
- Submit bug report with request/response data

