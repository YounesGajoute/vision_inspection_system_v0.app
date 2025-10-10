# Image Quality Consistency Guide

## Overview

For accurate template matching and inspection, **master images and captured test images MUST have consistent quality**. This guide explains how the system ensures quality consistency and best practices.

---

## Why Image Quality Consistency Matters

### Template Matching Algorithms

The vision inspection system uses several matching algorithms that are sensitive to image quality:

1. **Template Matching (cv2.matchTemplate)**
   - Used in position adjustment
   - Sensitive to compression artifacts
   - Requires pixel-level consistency

2. **Hu Moments (Shape Matching)**
   - Used in outline detection
   - Sensitive to edge quality
   - Affected by JPEG artifacts

3. **Edge Detection (Canny)**
   - Used in edge detection tool
   - Highly sensitive to noise
   - Compression artifacts create false edges

4. **Color Matching (HSV)**
   - Used in color matching tool
   - Sensitive to color space differences
   - JPEG compression distorts colors

### Impact of Quality Mismatch

| Issue | Impact on Matching | Example |
|-------|-------------------|---------|
| JPEG compression artifacts | False edges detected | 5-10% matching rate error |
| Different brightness | Template matching fails | Position offset errors |
| Different sharpness | Edge count mismatch | 10-20% detection errors |
| Resolution mismatch | Complete matching failure | System errors |

---

## How the System Ensures Consistency

### 1. Master Image Storage (Lossless PNG)

**All master images are saved with consistent quality parameters:**

```python
# In program_manager.py - save_master_image()

if format == 'png':
    # PNG: Lossless compression, level 1 (fast, high quality)
    compression_params = [cv2.IMWRITE_PNG_COMPRESSION, 1]
elif format == 'jpg':
    # JPEG: Quality 100 (maximum quality, minimal artifacts)
    compression_params = [cv2.IMWRITE_JPEG_QUALITY, 100]

cv2.imwrite(file_path, image_bgr, compression_params)
```

**Benefits:**
- ✅ Lossless storage (PNG default)
- ✅ No compression artifacts
- ✅ Consistent quality across sessions
- ✅ Fast compression (level 1)

### 2. Uploaded Image Re-encoding

**When you upload a master image from your computer, the system automatically re-encodes it:**

```
User uploads image (may have JPEG compression)
    ↓
System decodes image to raw numpy array
    ↓
System re-encodes with consistent parameters (PNG lossless)
    ↓
Saved as master image
```

**This ensures:**
- ✅ Uploaded images match camera-captured quality
- ✅ Removes original compression artifacts
- ✅ Standardizes all master images

### 3. Runtime Image Capture

**During test runs, images are captured as raw numpy arrays:**

```python
# In inspection_engine.py - run_inspection_cycle()

image = self.camera.capture_image(
    brightness_mode=self.brightness_mode,
    focus_value=self.focus_value
)
# Returns: Raw numpy array (no compression)
```

**Benefits:**
- ✅ No compression artifacts
- ✅ Maximum quality
- ✅ Matches master image quality

---

## Quality Validation Tools

### 1. Image Quality Validation

**Single Image Quality Check:**

```python
quality = camera_controller.validate_image_quality(image)

# Returns:
{
    'brightness': 125.5,      # Average brightness (target: 100-150)
    'sharpness': 250.3,       # Laplacian variance (higher = sharper)
    'exposure': 98.5,         # Exposure quality (0-100)
    'score': 85.7             # Overall quality score (0-100)
}
```

**Quality Score Interpretation:**
- **80-100**: Excellent quality
- **70-79**: Good quality
- **50-69**: Acceptable quality (may affect accuracy)
- **< 50**: Poor quality (inspect manually)

### 2. Image Consistency Validation

**Compare Master vs Captured Image:**

```python
consistency = camera_controller.validate_image_consistency(
    master_image,
    captured_image
)

# Returns:
{
    'consistent': True,
    'issues': [],  # Critical issues (resolution mismatch, etc.)
    'warnings': [  # Non-critical warnings
        'Brightness difference: 15.2 (Master: 120.5, Captured: 135.7)'
    ],
    'master_quality': {...},
    'captured_quality': {...},
    'recommendation': 'Check warnings - may affect matching accuracy'
}
```

**Consistency Checks:**

| Check | Threshold | Impact |
|-------|-----------|--------|
| Resolution | Must match exactly | Critical |
| Brightness | Within 20% | Warning |
| Sharpness | Within 30% (0.7-1.3x) | Warning |
| Overall quality | Both > 50 | Warning |

---

## Best Practices

### 1. Master Image Registration

✅ **DO:**
- Use same camera settings (brightness mode, focus) for master and test runs
- Capture master image under same lighting conditions as production
- Verify image quality score > 70 before registering
- Use camera auto-optimization if unsure of settings

❌ **DON'T:**
- Upload heavily compressed JPEG images
- Use images from different cameras/resolutions
- Register master images with poor quality (score < 50)
- Change lighting conditions between master and test runs

### 2. Uploaded Images

If you must upload a master image from your computer:

✅ **DO:**
- Use high-resolution images (same as camera resolution)
- Prefer PNG or uncompressed formats
- Verify image quality after upload
- Re-capture from camera if quality is poor

❌ **DON'T:**
- Upload low-resolution images
- Use heavily compressed JPEGs
- Upload images with watermarks or overlays
- Use images with different aspect ratios

### 3. Production Environment

✅ **DO:**
- Lock camera settings (white balance, exposure) for consistency
- Maintain consistent lighting conditions
- Periodically verify image quality
- Re-capture master image if conditions change

❌ **DON'T:**
- Allow auto-white-balance to drift over time
- Change lighting without re-capturing master
- Ignore quality warnings in logs
- Mix camera settings between master and test runs

---

## Configuration Reference

### Camera Settings (Step 1: Image Optimization)

```javascript
// Brightness Modes
const brightnessMode = {
  normal: { gain: 1.0, exposure: 10000 },  // Standard lighting
  hdr: { gain: 1.0, exposure: 20000 },     // High dynamic range
  highgain: { gain: 8.0, exposure: 30000 } // Low light conditions
};

// Focus Value
const focusValue = 50; // 0-100, where 0=infinity, 100=close
```

**Recommendation:** Use same settings for master and test runs!

### Image Storage Format

```python
# Default: PNG with compression level 1 (lossless, fast)
format = 'png'
compression_level = 1

# Alternative: JPEG quality 100 (minimal artifacts)
format = 'jpg'
jpeg_quality = 100
```

**Recommendation:** Use PNG (default) for maximum quality consistency.

---

## Troubleshooting

### Issue: Low Matching Rates (< 70%)

**Possible Causes:**
1. Brightness/lighting changed between master and test runs
2. Camera settings changed (focus, brightness mode)
3. Master image has compression artifacts
4. Camera lens dirty or out of focus

**Solutions:**
1. Check consistency validation logs
2. Re-capture master image with current conditions
3. Use camera auto-optimization
4. Clean camera lens

### Issue: Template Matching Fails

**Symptoms:**
- Position adjustment tool fails
- "Template not found" errors
- Matching confidence < 50%

**Solutions:**
1. Verify resolution consistency
2. Check if brightness difference > 20%
3. Re-capture master image
4. Increase position tool search margin

### Issue: Edge Detection Inconsistent

**Symptoms:**
- Edge tool shows erratic results
- Edge count varies widely (±20%)

**Solutions:**
1. Check sharpness consistency
2. Reduce camera gain (may be too noisy)
3. Improve lighting consistency
4. Use Gaussian blur preprocessing

---

## API Reference

### Validate Image Quality

**Endpoint:** Internal API (camera_controller)

```python
from src.hardware.camera import CameraController

camera = CameraController()
quality = camera.validate_image_quality(image)

print(f"Quality Score: {quality['score']:.1f}/100")
```

### Validate Image Consistency

**Endpoint:** Internal API (camera_controller)

```python
consistency = camera.validate_image_consistency(
    master_image,
    captured_image
)

if not consistency['consistent']:
    print("Critical issues:", consistency['issues'])
if consistency['warnings']:
    print("Warnings:", consistency['warnings'])
```

### Save Master Image with Quality

**Endpoint:** POST /api/master-image

```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('programId', programId);

const response = await fetch('/api/master-image', {
  method: 'POST',
  body: formData
});

// Response includes quality validation
const result = await response.json();
console.log('Quality:', result.quality);
```

---

## Logging and Monitoring

### Quality Logs

**Location:** `logs/backend.log`

**Example Log Entries:**

```
[INFO] Master image saved with high quality: /storage/master_images/program_1_20251010_143022.png (format=png)
[INFO] Image captured: (640, 480, 3), mode: normal, focus: 50
[WARNING] Brightness difference: 18.5 (Master: 122.3, Captured: 140.8)
```

### Inspection Logs

**During inspection runs:**

```
[DEBUG] Capturing image...
[INFO] Image captured: (640, 480, 3), mode: normal, focus: 50
[DEBUG] Running position adjustment tool...
[INFO] Template matching confidence: 95.2%
```

---

## Summary

### Key Takeaways

1. ✅ **Master images are saved as lossless PNG** (compression level 1)
2. ✅ **Uploaded images are automatically re-encoded** for consistency
3. ✅ **Captured test images are raw numpy arrays** (no compression)
4. ✅ **System validates consistency** and logs warnings
5. ✅ **Use same camera settings** for master and test runs

### Quick Checklist

Before starting production:
- [ ] Master image quality score > 70
- [ ] Same camera settings for master and test
- [ ] Consistent lighting conditions
- [ ] No compression artifacts (PNG format)
- [ ] Resolution matches camera resolution
- [ ] Brightness within 20%, sharpness within 30%

---

## Related Documentation

- [Camera Integration Guide](CAMERA_INTEGRATION_SUMMARY.md)
- [Matching & Inspection Analysis](MATCHING_INSPECTION_PRODUCTION_ANALYSIS.md)
- [Production Deployment Guide](PRODUCTION_DEPLOYMENT_GUIDE.md)
- [API Reference](docs/API_REFERENCE.md)

