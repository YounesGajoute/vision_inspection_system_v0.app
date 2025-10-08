# Vision Inspection System - API Reference

## Base URL
```
http://localhost:5000/api
```

## Authentication
Currently, the API does not require authentication. For production deployment, implement proper authentication.

---

## Program Endpoints

### Create Program
```http
POST /api/programs
```

**Request Body:**
```json
{
  "name": "Assembly Inspection",
  "config": {
    "triggerType": "internal",
    "triggerInterval": 1000,
    "brightnessMode": "normal",
    "focusValue": 50,
    "masterImage": null,
    "tools": [],
    "outputs": {
      "OUT1": "Always ON",
      "OUT2": "OK",
      "OUT3": "NG",
      "OUT4": "Not Used",
      "OUT5": "Not Used",
      "OUT6": "Not Used",
      "OUT7": "Not Used",
      "OUT8": "Not Used"
    }
  }
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "name": "Assembly Inspection",
  "message": "Program created successfully"
}
```

### List Programs
```http
GET /api/programs?active_only=true
```

**Response:** `200 OK`
```json
{
  "programs": [
    {
      "id": 1,
      "name": "Assembly Inspection",
      "created_at": "2025-01-01T00:00:00",
      "total_inspections": 100,
      "ok_count": 95,
      "ng_count": 5,
      "success_rate": 95.0,
      "config": { ... }
    }
  ]
}
```

### Get Program
```http
GET /api/programs/:id
```

**Response:** `200 OK` or `404 Not Found`

### Update Program
```http
PUT /api/programs/:id
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "config": { ... }
}
```

**Response:** `200 OK`

### Delete Program
```http
DELETE /api/programs/:id
```

**Response:** `200 OK`

---

## Camera Endpoints

### Capture Image
```http
POST /api/camera/capture
```

**Request Body:**
```json
{
  "brightnessMode": "normal",
  "focusValue": 50
}
```

**Response:** `200 OK`
```json
{
  "image": "base64_encoded_image",
  "quality": {
    "brightness": 125.5,
    "sharpness": 250.3,
    "exposure": 95.2,
    "score": 85.7
  },
  "timestamp": "2025-01-01T00:00:00"
}
```

### Auto-Optimize Camera
```http
POST /api/camera/auto-optimize
```

**Response:** `200 OK`
```json
{
  "optimalBrightness": "hdr",
  "optimalFocus": 65,
  "brightnessScores": {
    "normal": 75.2,
    "hdr": 88.5,
    "highgain": 82.1
  },
  "focusScore": 320.5,
  "message": "Camera optimization complete"
}
```

---

## Master Image Endpoints

### Upload Master Image
```http
POST /api/master-image
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Image file (JPEG or PNG)
- `programId`: Program ID

**Response:** `200 OK`
```json
{
  "path": "/storage/master_images/program_1_20250101_120000.png",
  "quality": {
    "brightness": 128.3,
    "sharpness": 305.7,
    "exposure": 96.8,
    "score": 92.1
  },
  "message": "Master image uploaded successfully"
}
```

---

## GPIO Endpoints

### Get GPIO Outputs
```http
GET /api/gpio/outputs
```

**Response:** `200 OK`
```json
{
  "outputs": {
    "1": false,
    "2": false,
    "3": false,
    "4": false,
    "5": false,
    "6": false,
    "7": false,
    "8": false
  }
}
```

### Set GPIO Output
```http
POST /api/gpio/outputs/:number
```

**Request Body:**
```json
{
  "state": true
}
```

**Response:** `200 OK`

---

## Health Check
```http
GET /api/health
```

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00",
  "components": {
    "camera": "ok",
    "gpio": "ok",
    "database": "ok",
    "storage": "ok"
  }
}
```

---

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected');
});
```

### Start Inspection
```javascript
socket.emit('start_inspection', {
  programId: 1,
  continuous: true
});

socket.on('inspection_result', (data) => {
  console.log('Status:', data.status);
  console.log('Tool Results:', data.toolResults);
  console.log('Processing Time:', data.processingTime, 'ms');
});
```

### Stop Inspection
```javascript
socket.emit('stop_inspection');
```

### Live Feed
```javascript
socket.emit('subscribe_live_feed', { fps: 10 });

socket.on('live_frame', (data) => {
  // data.image is base64 encoded
  displayImage(data.image);
});

socket.emit('unsubscribe_live_feed');
```

---

## Error Responses

All error responses follow this format:
```json
{
  "error": "Error message description"
}
```

**Common Status Codes:**
- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (duplicate name)
- `500` - Internal Server Error

