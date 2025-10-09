# Run Inspection Page - Quick Reference

## 🚀 Quick Start

1. **Select Program** → Choose from dropdown
2. **Click Start** → Begin inspection
3. **Monitor Results** → Watch live feed and statistics
4. **Click Stop** → End inspection

---

## 📊 Interface Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header: Program Info | Status Badge | Statistics        │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│  Left (60%)              │  Right (40%)                 │
│  ┌────────────────────┐  │  ┌────────────────────────┐ │
│  │ Control Bar        │  │  │ Statistics             │ │
│  │ • Program Select   │  │  │ • Total/Pass/Fail      │ │
│  │ • Start/Stop/Pause │  │  │ • Pass Rate            │ │
│  │ • Export           │  │  │ • Processing Times     │ │
│  └────────────────────┘  │  └────────────────────────┘ │
│                          │                              │
│  ┌────────────────────┐  │  ┌────────────────────────┐ │
│  │ Live Camera View   │  │  │ Tool Results           │ │
│  │ • Real-time feed   │  │  │ • Each tool status     │ │
│  │ • Result overlays  │  │  │ • Match rates          │ │
│  │ • 640x480 canvas   │  │  │ • Pass/Fail indicators │ │
│  │                    │  │  └────────────────────────┘ │
│  │                    │  │                              │
│  └────────────────────┘  │  ┌────────────────────────┐ │
│                          │  │ GPIO Outputs           │ │
│                          │  │ • 8 output pins        │ │
│                          │  │ • Real-time states     │ │
│                          │  └────────────────────────┘ │
│                          │                              │
│                          │  ┌────────────────────────┐ │
│                          │  │ Recent Inspections     │ │
│                          │  │ • Last 20 results      │ │
│                          │  │ • Timestamps           │ │
│                          │  └────────────────────────┘ │
└──────────────────────────┴──────────────────────────────┘
```

---

## 🎮 Controls

### Status Badges

| Badge | Color | Meaning |
|-------|-------|---------|
| IDLE | Gray | Not running |
| RUNNING | Blue (pulsing) | Inspection in progress |
| PASS | Green | Last inspection passed |
| FAIL | Red | Last inspection failed |

### Buttons

| Button | Icon | Action | Available When |
|--------|------|--------|----------------|
| Start | ▶️ | Begin inspection | Stopped |
| Pause | ⏸️ | Pause inspection | Running |
| Resume | ▶️ | Continue inspection | Paused |
| Stop | ⏹️ | End inspection | Running/Paused |
| Trigger | 🎯 | Manual trigger inspection | Running (not paused) |
| Export | 📥 | Download results JSON | Anytime |

---

## 📈 Statistics Panel

### Main Metrics

```
┌─────────────┬─────────────┐
│ Total       │ Pass Rate   │
│    125      │   94.4%     │
├─────────────┼─────────────┤
│ Passed      │ Failed      │
│    118      │      7      │
└─────────────┴─────────────┘
```

### Performance Metrics

- **Avg Processing Time**: Average time per inspection (ms)
- **Current Cycle Time**: Last inspection time (ms)
- **Avg Confidence**: Average confidence score (%)

---

## 🔧 Tool Results

Each tool shows:

```
┌──────────────────────────────────┐
│ 🟢 Pattern Match            [OK] │
│ Match Rate: 92.5%                │
│ Threshold: 85%                   │
│ ████████████████░░░░ 92.5%       │
└──────────────────────────────────┘
```

- **Color Dot**: Tool's configured color
- **Name**: Tool name from configuration
- **Status**: OK (green) or NG (red)
- **Match Rate**: Calculated similarity (%)
- **Threshold**: Configured pass threshold (%)
- **Progress Bar**: Visual match rate indicator

---

## ⚡ GPIO Outputs

### Output Grid

```
┌─────────┬─────────┐
│ OUT1    │ OUT2    │
│ BUSY    │ OK Sig  │
│ 🟡 ON   │ 🟢 OFF  │
├─────────┼─────────┤
│ OUT3    │ OUT4    │
│ NG Sig  │ Custom  │
│ 🔴 OFF  │ 🔵 OFF  │
└─────────┴─────────┘
```

### Output States

- **ON**: Active (colored, glowing)
- **OFF**: Inactive (gray, dim)

### Fixed Outputs

| Pin | Name | Behavior |
|-----|------|----------|
| OUT1 | BUSY | ON during processing |
| OUT2 | OK Signal | Pulse (300ms) on PASS |
| OUT3 | NG Signal | Pulse (300ms) on FAIL |

### Configurable Outputs (OUT4-OUT8)

Set in program configuration:
- **OK**: Active when PASS
- **NG**: Active when FAIL
- **Always ON**: Constantly active
- **Always OFF**: Never active
- **Not Used**: Disabled

---

## 📋 Recent Inspections

Shows last 20 inspections:

```
┌────────────────────────────────────┐
│ ✅ PASS           14:32:15         │
│ Confidence: 92.3% | Time: 45.2ms   │
├────────────────────────────────────┤
│ ❌ FAIL           14:32:13         │
│ Confidence: 67.8% | Time: 48.1ms   │
└────────────────────────────────────┘
```

- Green: PASS results
- Red: FAIL results
- Time: Timestamp
- Confidence: Overall match confidence
- Processing time: Milliseconds

---

## 🎨 Canvas Visualization

### Live Feed
- Real-time camera stream (10 FPS)
- 640x480 resolution
- No overlays during idle/running

### Result Overlay
- **ROI Rectangles**: Tool regions highlighted
- **Labels**: Tool name + match rate
- **Status Overlay**: Overall PASS/FAIL indicator

### Color Coding
- 🟢 **Green**: PASS tools
- 🔴 **Red**: FAIL tools
- **Tool Colors**: Each tool has custom color

---

## 🔄 Inspection Flow

```
┌─────────────────────────────────────────────────┐
│ 1. Trigger (Timer or GPIO)                      │
│    ↓                                             │
│ 2. Set BUSY signal (OUT1 = ON)                  │
│    ↓                                             │
│ 3. Capture frame from camera                    │
│    ↓                                             │
│ 4. Position adjustment (if configured)          │
│    ↓                                             │
│ 5. Process each tool:                           │
│    • Extract ROI                                 │
│    • Run algorithm                               │
│    • Calculate match rate                        │
│    • Compare with threshold                      │
│    ↓                                             │
│ 6. Determine overall result (OK/NG)             │
│    ↓                                             │
│ 7. Update GPIO outputs                          │
│    • OUT2 pulse if PASS                          │
│    • OUT3 pulse if FAIL                          │
│    • Custom outputs per configuration            │
│    ↓                                             │
│ 8. Update statistics                             │
│    ↓                                             │
│ 9. Display result on canvas                      │
│    ↓                                             │
│ 10. Clear BUSY signal (OUT1 = OFF)              │
│    ↓                                             │
│ 11. Wait for next trigger                        │
└─────────────────────────────────────────────────┘
```

---

## ⏱️ Trigger Types

### Internal (Timer)
- Inspection runs automatically at fixed interval
- Configurable: 1-10000ms
- Default: 2000ms (2 seconds)
- Set in program Step 1

### External (GPIO)
- Inspection triggered by hardware signal
- Delay: 0-1000ms after trigger
- Requires GPIO input configuration
- Set in program Step 1

### Manual (Button)
- Click **Trigger** button to run inspection on-demand
- Available when inspection is running (not paused)
- Runs immediately, independent of automatic triggers
- Useful for testing and debugging
- Orange button with target icon 🎯

---

## 📤 Export Data

Click **Export** button to download JSON:

```json
{
  "program": "PCB Assembly Check",
  "statistics": {
    "totalInspected": 125,
    "passed": 118,
    "failed": 7,
    "passRate": 94.4,
    "avgProcessingTime": 45.2,
    "avgConfidence": 92.3
  },
  "recentResults": [
    {
      "id": "INS-1234567890",
      "timestamp": "2024-01-01T14:32:15Z",
      "status": "OK",
      "processingTime": 45.2,
      "confidence": 92.3
    }
  ],
  "exportedAt": "2024-01-01T14:35:00Z"
}
```

---

## 🎯 Processing Algorithms

### Outline Tool (Shape Matching)
- Grayscale conversion
- Otsu thresholding
- Contour detection
- Hu moment calculation
- Similarity comparison

### Area Tool (Brightness Detection)
- Grayscale conversion
- Otsu thresholding
- Bright pixel counting
- Area ratio comparison

### Color Area Tool (Color Detection)
- RGB to HSV conversion
- Color range masking
- Color pixel counting
- Deviation calculation

### Edge Detection Tool
- Grayscale conversion
- Sobel edge detection
- Edge pixel counting
- Density comparison

### Position Adjustment Tool
- Template matching
- Offset calculation
- ROI adjustment for other tools

---

## 🔧 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Start/Stop |
| P | Pause/Resume |
| E | Export results |
| Esc | Stop inspection |

*(To be implemented)*

---

## ⚠️ Common Issues

### No Camera Feed
- Check backend is running
- Verify WebSocket connection
- Ensure camera is connected

### Slow Processing
- Reduce ROI sizes
- Decrease tool count
- Increase trigger interval

### High Failure Rate
- Check master image quality
- Adjust thresholds
- Verify lighting conditions

### GPIO Not Working
- Check backend GPIO service
- Verify pin configuration
- Test hardware connections

---

## 💡 Best Practices

### For Best Performance
1. **Optimize ROI sizes** - Smaller = faster
2. **Limit tools** - Each adds processing time
3. **Set reasonable intervals** - Don't overload system
4. **Use position adjustment** - Only when needed

### For Accurate Results
1. **Good master image** - Clear, well-lit reference
2. **Proper thresholds** - Not too strict or loose
3. **Consistent lighting** - Same as master image
4. **Stable camera** - Fixed position and focus

### For Reliable Operation
1. **Monitor statistics** - Watch pass rate trends
2. **Check processing time** - Should be consistent
3. **Verify GPIO** - Test outputs regularly
4. **Save configurations** - Backup programs

---

## 📞 Quick Help

| Issue | Solution |
|-------|----------|
| Can't select program | Create program in setup wizard first |
| Start button disabled | Select a program |
| Camera not showing | Start backend: `npm run backend` |
| Slow inspection | Reduce ROI size or tool count |
| All results FAIL | Adjust thresholds in program config |
| GPIO not responding | Check backend GPIO service |
| WebSocket error | Restart backend server |

---

## 🎓 Learning Path

1. ✅ **Start with one tool** - Learn basics
2. ✅ **Add more tools gradually** - Build complexity
3. ✅ **Test with known samples** - Verify accuracy
4. ✅ **Adjust thresholds** - Fine-tune for production
5. ✅ **Monitor statistics** - Track performance
6. ✅ **Export data** - Analyze results

---

## 📚 Related Documentation

- [Complete Run Inspection Guide](./RUN_INSPECTION_GUIDE.md)
- [Setup Wizard Guide](./SETUP_WIZARD_GUIDE.md)
- [Tool Configuration Guide](./TOOL_CONFIGURATION_GUIDE.md)
- [GPIO Configuration Guide](./GPIO_CONFIGURATION_GUIDE.md)

---

**Version**: 1.0.0  
**Last Updated**: 2024-10-09  
**System**: Vision Inspection System v0

