# Image Quality Consistency - Quick Reference

## 🎯 Key Principle

**Master images and captured test images MUST have the same quality for accurate matching!**

---

## ✅ What the System Does Automatically

| Action | Implementation | Benefit |
|--------|---------------|---------|
| **Save master images as lossless PNG** | PNG compression level 1 | No artifacts, consistent quality |
| **Re-encode uploaded images** | Decode → Raw → Re-encode PNG | Removes JPEG compression |
| **Capture test images as raw arrays** | No compression during inspection | Maximum quality |
| **Validate consistency** | Automatic checks on first cycle | Early warning of issues |

---

## 📋 Pre-Production Checklist

Before starting inspection runs:

```
□ Master image quality score > 70
□ Same brightness mode for master and test
□ Same focus value for master and test  
□ Consistent lighting conditions
□ No compression artifacts (use PNG)
□ Resolution matches camera (640×480 default)
□ Brightness within ±20% of master
□ Sharpness within ±30% of master
```

---

## ⚙️ Recommended Settings

### Camera Settings (Step 1)
```javascript
brightnessMode: 'normal'    // Use same for master & test
focusValue: 50              // Adjust, then keep consistent
```

### Master Image Format
```python
format: 'png'               // Default (recommended)
compression: 1              // Lossless, fast
```

---

## 🚨 Common Issues & Quick Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| **Matching rate < 70%** | Lighting changed | Re-capture master |
| **Template matching fails** | Focus changed | Use same focus value |
| **Erratic edge detection** | Camera too noisy | Reduce gain, improve lighting |
| **Position offset errors** | Brightness mismatch | Check brightness mode |

---

## 📊 Quality Score Guide

| Score | Quality | Action |
|-------|---------|--------|
| **80-100** | Excellent ✅ | Ready for production |
| **70-79** | Good ⚠️ | Usable, monitor results |
| **50-69** | Acceptable ⚠️ | May affect accuracy |
| **< 50** | Poor ❌ | Re-capture required |

---

## 🔍 Consistency Thresholds

| Metric | Threshold | Impact |
|--------|-----------|--------|
| **Resolution** | Must match exactly | Critical - system error |
| **Brightness** | ±20% of master | Warning - affects matching |
| **Sharpness** | 70-130% of master | Warning - affects edges |
| **Overall quality** | Both > 50 | Warning - low accuracy |

---

## 💡 Best Practices

### ✅ DO:
- Lock camera settings between master and test runs
- Maintain consistent lighting
- Use PNG format (default)
- Verify quality before registering master
- Re-capture master if conditions change

### ❌ DON'T:
- Upload heavily compressed JPEGs
- Change brightness mode during production
- Allow auto-white-balance to drift
- Ignore quality warnings in logs

---

## 📖 Full Documentation

For detailed information, see: [IMAGE_QUALITY_CONSISTENCY_GUIDE.md](IMAGE_QUALITY_CONSISTENCY_GUIDE.md)

---

## 🆘 Emergency Troubleshooting

**System showing low matching rates?**

```bash
# 1. Check current image quality
# Look in logs/backend.log for warnings

# 2. Re-capture master image with current settings
# Go to Step 2: Master Image Registration
# Click "Capture" (not "Load File")

# 3. Verify quality score > 70
# Should see "Quality Score: XX/100" in UI

# 4. Re-run inspection
# If still failing, check lighting consistency
```

---

**Quick Command: Check Recent Logs**
```bash
tail -n 50 logs/backend.log | grep -i "quality\|consistency\|warning"
```

---

## 📞 Support

If matching issues persist after following this guide:
1. Check logs for specific warnings
2. Verify camera settings match between master and test
3. Ensure lighting hasn't changed
4. Consider re-optimizing camera (Step 1: Auto-Optimize)

