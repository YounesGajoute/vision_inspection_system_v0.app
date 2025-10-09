# 🚀 Quick Start - Production Deployment Guide
## Get Your Vision Inspection System Running in 4 Steps

**For**: Production Engineers, Operators, QA Managers  
**Time Required**: 2-4 hours  
**Difficulty**: Beginner-Friendly

---

## ⚡ Quick Overview

This guide gets you from zero to production-ready in 4 main steps:

```
Step 1: Setup Environment (30-60 min)
   ↓
Step 2: Capture Master & Configure (30-60 min)
   ↓
Step 3: Calibrate Thresholds (30-60 min)
   ↓
Step 4: Validate & Start Production (30-60 min)
```

**Total**: 2-4 hours to production

---

## 📋 Prerequisites

Before you start, make sure you have:
- ✅ Vision inspection system installed and running
- ✅ Camera connected and working
- ✅ Good sample parts (20+ pieces)
- ✅ Bad sample parts (10+ pieces with known defects)
- ✅ Light meter (optional but recommended)

---

## 🎯 Step 1: Setup Environment (30-60 min)

### 1.1 Lighting Setup ⭐ MOST IMPORTANT

**Goal**: Create stable, consistent lighting

```
□ Install LED lights (no fluorescent - they flicker!)
□ Position lights to eliminate shadows
□ Block all windows/external light
□ Turn off other room lights if variable
```

**Quick Test**:
1. Capture 10 images of a white card, 30 seconds apart
2. Images should look identical
3. If they differ → lighting is not stable!

**Common Mistakes to Avoid**:
- ❌ Windows not covered (sunlight changes throughout day)
- ❌ Fluorescent lights (invisible flicker affects camera)
- ❌ Spotlights creating shadows
- ❌ Reflective surfaces causing glare

---

### 1.2 Camera Configuration ⭐ CRITICAL

**Goal**: Lock all camera settings to manual

```
□ Set focus to MANUAL, find best focus, lock it
□ Set exposure to MANUAL, lock it
□ Set white balance to MANUAL, lock it
□ Disable all AUTO modes
```

**Quick Test**:
1. Capture 10 images of the same scene
2. All images should be identical brightness
3. All images should have same color tone
4. If they differ → camera auto-mode still active!

**Settings Checklist**:
```
Focus Mode: MANUAL ✓
Focus Value: _____ (note this!)

Exposure Mode: MANUAL ✓
Exposure Time: _____ ms

White Balance: MANUAL ✓
WB Temperature: _____ K

Gain: FIXED ✓
Gain Value: _____ dB
```

---

### 1.3 Part Positioning

**Goal**: Ensure parts are placed consistently

```
□ Use a fixture or guide for part placement
□ Mark camera field of view boundaries
□ Test: Place same part 10 times, should be in same position ±2mm
```

---

### 1.4 System Check

**Quick Verification**:
```bash
# Check backend is running
curl http://localhost:5000/api/v1/health

# Check frontend is accessible
# Open browser: http://localhost:3000

# Should see: Vision Inspection System interface
```

**✅ Step 1 Complete!** Environment is stable and controlled.

---

## 📸 Step 2: Capture Master & Configure (30-60 min)

### 2.1 Select Reference Part

**Choose a GOOD part**:
- ✅ No defects or damage
- ✅ Clean (no dust/dirt)
- ✅ Representative of typical parts
- ❌ Don't use an "average" part - use a PERFECT one!

---

### 2.2 Capture Master Image

**In the Application**:

```
1. Go to "New Program" or "Create Program"
2. Navigate to "Step 2: Master Image"
3. Click "Capture from Camera"
4. Review captured image:
   - Is it sharp? (not blurry)
   - Is it well-lit? (not too dark/bright)
   - Can you see all details clearly?
5. If good → Click "Register Master Image"
6. Wait for green success message ✓
```

**Master Image Quality Check**:
```
✓ Sharp focus (zoom in to check details)
✓ Even lighting (no dark corners)
✓ No motion blur
✓ No glare or reflections
✓ Correct orientation
```

**⚠️ IMPORTANT**: Capture master under PRODUCTION lighting!
- Don't capture master at 8 AM if production runs at 2 PM
- Lighting MUST be the same

---

### 2.3 Configure Tools

**Go to "Step 3: Tool Configuration"**

#### Option A: Position Adjustment Tool (Recommended)

**Use this if**: Parts may not always be in exact same position

```
1. Select "Position Adjustment Tool"
2. Draw rectangle on a DISTINCTIVE feature:
   ✅ Select area with clear patterns/edges
   ✅ Make it at least 50×50 pixels
   ❌ Avoid uniform color areas
   ❌ Avoid repetitive patterns
3. Set threshold: 70-80% (typical)
4. Click "Add Tool"
```

**Position Tool Helps With**:
- Parts slightly shifted left/right
- Parts rotated a few degrees
- Conveyor position variation

---

#### Option B: Detection Tools

**Choose based on what you want to detect**:

**Outline Tool** - For shape inspection
```
Use for: Missing components, shape defects, wrong orientation
Example: Detecting missing mounting hole

1. Select "Outline Tool"
2. Draw rectangle around the feature
3. Set threshold: 90% (start conservative)
4. Click "Add Tool"
```

**Area Tool** - For size/area inspection
```
Use for: Holes, stains, material presence
Example: Detecting missing gasket

1. Select "Area Tool"
2. Draw rectangle around the area
3. Set threshold: 90% lower, 110% upper (for ±10% tolerance)
4. Click "Add Tool"
```

**Color Area Tool** - For color verification
```
Use for: Color presence, colored components
Example: Verifying red warning label present

1. Select "Color Area Tool"
2. Draw rectangle around colored area
3. Set threshold: 85% (start conservative)
4. Click "Add Tool"
```

**How Many Tools?**:
- ✅ Start with 1-2 tools
- ✅ Add more only if needed
- ❌ Don't add too many (slower inspection)

---

### 2.4 Save Program

```
1. Go to "Step 4: Output Assignment & Save"
2. Enter program name: "_____________"
3. Configure GPIO outputs (if using PLC):
   - OK signal: OUT1
   - NG signal: OUT2
   - BUSY signal: OUT3
4. Click "Save Program"
5. Wait for success message ✓
```

**✅ Step 2 Complete!** Master captured, tools configured.

---

## 🎯 Step 3: Calibrate Thresholds (30-60 min)

### 3.1 Test Good Samples

**You need 20-30 GOOD parts** (known good, no defects)

```
1. Load first good part
2. Click "Run Inspection" or start production mode
3. Record the matching rate for each tool
4. Repeat for all 20-30 parts
```

**Recording Results** (use spreadsheet or paper):
```
Part # | Tool 1 Match % | Tool 2 Match % | Tool 3 Match %
-------|----------------|----------------|----------------
   1   |      96        |      95        |      94
   2   |      97        |      96        |      95
   3   |      95        |      94        |      96
  ...  |     ...        |     ...        |     ...
  20   |      96        |      95        |      94
```

---

### 3.2 Calculate Threshold

**For each tool**, calculate:

```
Mean (Average): Sum of all rates ÷ Number of samples
Std Dev: Use calculator or Excel =STDEV() function
Minimum: Lowest rate observed

Threshold = Mean - (2 × Std Dev)
```

**Example Calculation**:
```
Tool 1 Results: [96, 97, 95, 96, 97, 95, 96, 98, 95, 94, ...]

Mean = 95.8%
Std Dev = 1.2%
Minimum = 94%

Threshold = 95.8 - (2 × 1.2) = 93.4%
Round down: Set threshold to 93%
```

**Rule of Thumb**:
- If Std Dev < 2%: Threshold = Mean - 3%
- If Std Dev 2-4%: Threshold = Mean - 5%
- If Std Dev > 4%: Something wrong! (check lighting/positioning)

---

### 3.3 Update Thresholds in System

```
1. Edit your program
2. For each tool, update the threshold value
3. Save program
```

---

### 3.4 Verify with Good Samples Again

**Run the 20 good samples again**:
```
Expected result: At least 19/20 should pass (95%+ pass rate)

If less than 95% pass:
→ Threshold is too tight, increase by 2-3%
→ OR check if those parts are actually defective

If 100% pass:
→ Good! But verify bad samples next...
```

---

### 3.5 Test Bad Samples ⚠️ CRITICAL

**You need 10-20 BAD parts** (known defects)

```
1. Run each defective part through inspection
2. EVERY SINGLE ONE must be rejected (NG)
3. Record results
```

**Expected result**: 100% rejection rate

**If any bad part passes (FALSE NEGATIVE)**:
```
⚠️ STOP! This is critical!

Options:
1. Increase threshold by 5%
2. Add additional tool to catch this defect
3. Use different tool type

DO NOT proceed to production until ALL bad parts are rejected!
```

**✅ Step 3 Complete!** Thresholds calibrated and validated.

---

## ✅ Step 4: Validate & Start Production (30-60 min)

### 4.1 Final Validation Test

**Mix good and bad parts, run 50-100 total**:

```
Test Batch:
- 50+ good parts
- 20+ bad parts
- Random order (don't tell operator which is which)

Record results:
- Good parts passed: _____ / _____ (should be ≥ 49/50)
- Bad parts failed: _____ / _____ (MUST be 20/20)
```

**Acceptance Criteria**:
```
✓ Good part pass rate: ≥ 98%
✓ Bad part rejection rate: 100%
✓ No false negatives (bad parts passing)
```

**If criteria not met**: Go back to Step 3 and adjust thresholds

---

### 4.2 Extended Stability Test

**Run system continuously for 1 hour**:

```
1. Start production mode
2. Run parts continuously
3. Monitor for:
   - System crashes (should be 0)
   - Consistent results
   - Stable cycle times
4. Record:
   - Total inspections: _____
   - OK count: _____
   - NG count: _____
   - Any errors: _____
```

---

### 4.3 Operator Training (15 min)

**Train operators on**:

```
□ How to start/stop production
□ How to load parts correctly
□ How to read OK/NG signals
□ What to do if many good parts fail (false NGs)
   → Check lighting
   → Check part positioning
   → Call supervisor
□ What to do if bad parts pass (false OKs)
   → STOP production immediately
   → Call quality manager
□ Emergency stop procedure
```

**Quick Training Checklist**:
```
Operator can:
□ Start system
□ Load part correctly
□ Understand OK/NG indication
□ Recognize when something is wrong
□ Know who to call for help
```

---

### 4.4 Start Production! 🚀

**First Day Monitoring**:

```
Hour 1:
- Monitor closely (stay nearby)
- Check every 10th part manually
- Verify OK/NG decisions are correct

Hour 2-4:
- Check every hour
- Review statistics
- OK rate should be > 95%

End of Day:
- Review total statistics
- Document any issues
- Plan adjustments if needed
```

**First Week Schedule**:
```
Day 1: Monitor every hour
Day 2: Monitor every 2 hours
Day 3: Monitor every 4 hours
Day 4-7: Monitor once per shift

After 1 week: System should be stable, routine monitoring only
```

**✅ Step 4 Complete!** System is in production!

---

## 📊 Quick Reference - Normal Operating Ranges

### Matching Rates
```
95-100%: Excellent match (typical for good parts)
90-95%:  Good match (acceptable variation)
85-90%:  Fair match (may need investigation)
80-85%:  Poor match (likely defective)
< 80%:   Very poor match (definitely defective)
```

### Inspection Results
```
OK Rate (Good Process):
> 95%:   Excellent - process stable
90-95%:  Good - minor variations
85-90%:  Fair - investigate causes
< 85%:   Poor - check system setup

⚠️ If OK rate suddenly drops: Check lighting and camera first!
```

### Performance
```
Cycle Time:
< 100ms:  Fast
100-150ms: Normal
150-200ms: Acceptable
> 200ms:   Slow - may need optimization
```

---

## 🚨 Troubleshooting Quick Guide

### Problem: Good parts failing (False NGs)

**Check in this order**:

1. **Lighting Changed?**
   - Compare brightness now vs. master capture
   - Look for shadows
   - → Solution: Adjust lighting to match master

2. **Camera Settings Changed?**
   - Check focus is still locked
   - Verify exposure hasn't changed
   - → Solution: Re-lock camera settings

3. **Part Positioning?**
   - Parts shifted from usual position?
   - → Solution: Add position adjustment tool

4. **Threshold Too Tight?**
   - Lower threshold by 2-3%
   - Re-test

---

### Problem: Bad parts passing (False OKs)

**THIS IS CRITICAL!**

```
⚠️ STOP PRODUCTION IMMEDIATELY

1. Verify part is actually defective
2. Check which tool should catch it
3. Run inspection and note matching rate
4. Options:
   a) Increase threshold by 5%
   b) Add additional tool for this defect type
   c) Adjust ROI to focus on defect area

5. Re-test with known bad samples
6. Only restart when 100% of bad parts are rejected
```

---

### Problem: Inconsistent results (same part, different results)

**Causes**:
1. Lighting flickering → Use LED lights only
2. Camera auto-mode active → Lock to manual
3. Part positioning varies → Use fixture or add position tool
4. Vibration during capture → Isolate from vibration sources

---

### Problem: System slow (> 200ms cycle time)

**Optimize**:
1. Reduce ROI sizes (smaller = faster)
2. Use simpler tools (Area faster than Outline)
3. Reduce number of tools
4. Lower camera resolution (if acceptable)

---

## 📈 Success Metrics

### After 1 Day:
```
□ No system crashes
□ OK rate > 90%
□ Operators comfortable with system
□ Cycle time stable
```

### After 1 Week:
```
□ OK rate > 95%
□ Consistent results day-to-day
□ Zero false negatives
□ Operators fully trained
```

### After 1 Month:
```
□ OK rate > 98%
□ Predictable performance
□ Minimal false positives
□ System fully integrated into production
```

---

## 💡 Pro Tips

### Lighting Tips
- ✅ LED ring lights work great for small parts
- ✅ Backlight works well for outline/shape inspection
- ✅ Diffused lighting reduces glare
- ❌ Never use sunlight or fluorescent lights

### Camera Tips
- ✅ Higher resolution = better accuracy but slower
- ✅ 640×480 is good for most applications
- ✅ 1280×720 for fine detail inspection
- ❌ Don't use compression (JPEG artifacts)

### Threshold Tips
- ✅ Start conservative (loose thresholds)
- ✅ Tighten gradually based on production data
- ✅ Different tools can have different thresholds
- ❌ Don't set threshold = minimum observed (too tight!)

### ROI Tips
- ✅ Draw ROI just around the feature of interest
- ✅ Smaller ROI = faster processing
- ✅ Include some margin around feature
- ❌ Don't make ROI too large (dilutes signal)

---

## 📞 Need Help?

### Common Questions

**Q: How many tools should I use?**
A: Start with 1-2 tools. Add more only if needed to catch specific defects.

**Q: What threshold should I set?**
A: Follow Step 3 calculation: Mean - (2 × Std Dev). Typically 85-95% for most tools.

**Q: How do I know if lighting is stable enough?**
A: Capture 10 images 1 minute apart. They should look identical.

**Q: Position tool or not?**
A: Use it if parts vary in position by > 5 pixels. Improves accuracy significantly.

**Q: System is slow, what to do?**
A: Reduce ROI sizes, use fewer tools, or lower camera resolution.

---

## 📚 Additional Resources

**Detailed Guides**:
- `MATCHING_INSPECTION_PRODUCTION_ANALYSIS.md` - Complete technical analysis (62 pages)
- `PRODUCTION_READINESS_CHECKLIST.md` - Detailed checklist (15 pages)
- `ANALYSIS_SUMMARY_AND_RECOMMENDATIONS.md` - Executive summary

**Code References**:
- Inspection engine: `backend/src/core/inspection_engine.py`
- Tool implementations: `backend/src/tools/`
- Database queries: `backend/src/database/db_manager.py`

---

## ✅ Quick Checklist Summary

### Before Starting Production:
```
□ Lighting stable and controlled
□ Camera locked to manual settings
□ Master image captured under production lighting
□ At least 1 tool configured
□ Thresholds calibrated with 20+ good samples
□ All bad samples rejected (100%)
□ 50+ validation test passed
□ 1 hour stability test passed
□ Operators trained
□ Backup created
```

### During Production:
```
□ Monitor OK rate (should be > 95%)
□ Check matching rates periodically
□ Log any issues
□ Adjust thresholds if needed
□ Verify no lighting changes
```

---

**Good luck with your production deployment!** 🚀

**Document Version**: 1.0  
**Last Updated**: October 9, 2025  
**For**: Vision Inspection System v0

---

**Remember**: The key to success is controlling the environment (lighting + camera). Get that right, and the system will work reliably! 💡

