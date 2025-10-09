# Troubleshooting - Cannot Save Inspection Program

## 🔍 Issue: Cannot Save Program

If you're unable to save your inspection program, follow this guide.

---

## ✅ Required Before Saving

To save a program, you must complete ALL steps:

### Step 1: Image Optimization ✓
- Configure trigger type (internal/external)
- Set trigger interval or delay
- Configure brightness mode (normal/hdr/highgain)
- Set focus value (0-100)

### Step 2: Master Image ✓
- **Capture image from camera** OR **Load from computer**
- Click "Register" button
- See green "Master image successfully registered!" message

### Step 3: Tool Configuration ✓ **REQUIRED!**
- **Configure at least ONE tool** (this is required!)
- Draw ROI (region of interest) on master image
- Set tool parameters (threshold, limits, etc.)
- See tool appear in configured tools list

### Step 4: Output Assignment & Save
- Enter program name
- Configure GPIO outputs
- Click "Save Program"

---

## ⚠️ Common Issues & Solutions

### Issue 1: "At least one inspection tool must be configured"

**Problem:** No tools configured in Step 3

**Solution:**
1. Go back to Step 3
2. Select a tool type (Outline, Area, Color Area, etc.)
3. Draw a rectangle on the master image to define ROI
4. Set threshold and other parameters
5. Click "Add Tool"
6. Verify tool appears in the list
7. Proceed to Step 4

**Validation Check:**
```
Step 3 screen should show:
"Configured Tools (X)" where X > 0
```

---

### Issue 2: "Master image must be registered"

**Problem:** Master image not registered in Step 2

**Solution:**
1. Go back to Step 2
2. Either:
   - Click "Capture" to take photo from camera, then "Register"
   - Click "Load File" to upload from computer, then "Register"
3. Look for green success message: "Master image successfully registered!"
4. Proceed to Step 3

---

### Issue 3: "Program name is required"

**Problem:** No program name entered in Step 4

**Solution:**
1. In Step 4, enter a unique program name
2. Name must be non-empty
3. Name must be unique (not already exist)

---

### Issue 4: Backend API Error

**Problem:** API returns validation error

**Check these common issues:**

1. **Brightness Mode Missing/Invalid:**
   - Must be: `normal`, `hdr`, or `highgain`
   - Check Step 1 settings

2. **Trigger Type Missing:**
   - Must be: `internal` or `external`
   - Check Step 1 settings

3. **Focus Value Out of Range:**
   - Must be: 0-100
   - Check Step 1 settings

4. **Invalid Tool Configuration:**
   - Tool ROI must have x, y, width, height
   - Threshold must be within valid range
   - Tool type must be valid

---

## 🔧 Quick Diagnosis

### Run These Checks:

**1. Check Browser Console**
```
Press F12 in browser
Go to Console tab
Look for red error messages
```

**2. Check Backend Logs**
```bash
tail -f backend/logs/app.log
# Look for errors when you click Save
```

**3. Test API Directly**
```bash
# Test if backend can create programs
curl -X POST http://localhost:5000/api/programs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Program",
    "config": {
      "triggerType": "internal",
      "triggerInterval": 1000,
      "brightnessMode": "normal",
      "focusValue": 50,
      "tools": [{
        "type": "area",
        "name": "Tool 1",
        "color": "#FF0000",
        "roi": {"x": 100, "y": 100, "width": 200, "height": 200},
        "threshold": 50
      }],
      "outputs": {}
    }
  }'
```

**4. Check Network Tab**
```
Press F12 in browser
Go to Network tab
Click Save Program
Look for POST request to /api/programs
Check Response tab for error message
```

---

## 💡 Step-by-Step Solution

### Ensure You Have at Least One Tool:

**In Step 3:**

1. Select tool type from dropdown
2. **Draw ROI on master image** (click and drag rectangle)
3. Set threshold value
4. Click "Add Tool" button
5. **Verify tool appears in "Configured Tools" list below**
6. Should see: "Configured Tools (1)" or higher

**Example tool configuration:**
- Type: Area Tool
- Name: Area Check 1
- ROI: Drawn rectangle on image
- Threshold: 50
- Upper Limit: (optional)

---

## 🐛 Debug Information

### Check Step 3 State

In browser console (F12 → Console), type:
```javascript
// Check if tools are configured
console.log('Tools:', configuredTools);
```

### Check Complete Config

In configure/page.tsx, the config being sent should look like:
```typescript
{
  triggerType: "internal",
  triggerInterval: 1000,
  brightnessMode: "normal",
  focusValue: 50,
  masterImage: "base64...",
  tools: [
    {
      type: "area",
      name: "Tool 1",
      roi: { x: 100, y: 100, width: 200, height: 200 },
      threshold: 50,
      // ... other fields
    }
  ],
  outputs: { ... }
}
```

---

## 🎯 Most Likely Solution

**The most common issue is missing tools in Step 3.**

### Quick Fix:

1. **Go to Step 3** in the wizard
2. **Select a tool type** (e.g., "Area Tool")
3. **Draw a rectangle** on the master image by click-and-drag
4. **Click "Add Tool"** button
5. **Verify** you see "Configured Tools (1)"
6. **Go to Step 4** (Next button should now be enabled)
7. **Enter program name**
8. **Click "Save Program"**

---

## 📝 Backend Validation Rules

The backend requires:
- ✓ Program name (non-empty, unique)
- ✓ Trigger type (internal or external)
- ✓ Trigger interval (1-10000ms) or delay (0-1000ms)
- ✓ Brightness mode (normal, hdr, highgain)
- ✓ Focus value (0-100)
- ✓ **At least one tool** ← **REQUIRED!**
- ✓ Valid tool configurations
- ✓ Valid output assignments

---

## 🆘 Still Having Issues?

### Temporary Workaround: Allow Empty Tools (Development Only)

If you want to test without tools temporarily, you can modify the backend validation:

**File:** `backend/src/core/program_manager.py`

**Find line ~268:**
```python
if not tools:
    raise ValueError("At least one tool is required")
```

**Change to:**
```python
if not tools:
    logger.warning("Creating program without tools (development mode)")
    # Allow empty tools for testing
```

**Restart backend:**
```bash
# Stop current process (CTRL+C)
npm run dev:all
```

**Note:** This is only for testing. Production programs should always have tools.

---

## ✅ Verification Checklist

Before clicking "Save Program":

- [ ] Step 1: Camera settings configured
- [ ] Step 2: Master image registered (green checkmark visible)
- [ ] Step 3: **At least 1 tool configured** (shows "Configured Tools (X)" where X > 0)
- [ ] Step 4: Program name entered
- [ ] Step 4: Outputs assigned (optional)

If all checkboxes are checked, save should work!

---

## 📞 Need More Help?

**Check:**
1. Browser console (F12) for JavaScript errors
2. Backend logs: `backend/logs/app.log`
3. Network tab in browser DevTools
4. Backend terminal output for errors

**Test API:**
```bash
# Check if backend is responding
curl http://localhost:5000/api/health

# Check if programs endpoint works
curl http://localhost:5000/api/programs
```

---

**Most Common Fix:** Configure at least one tool in Step 3! ✨
