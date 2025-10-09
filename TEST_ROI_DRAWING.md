# Testing ROI Drawing Process

## 🧪 Test Scenarios

### Test 1: Basic ROI Creation
**Steps:**
1. Navigate to Step 3 (Tool Configuration)
2. Click "Area Tool" in tool selection panel
3. Click and drag on canvas to draw a rectangle (e.g., 100x100 pixels)
4. Release mouse

**Expected Results:**
- ✅ Dashed preview appears during drag
- ✅ Solid rectangle with 8 handles appears after release
- ✅ Title changes to "Edit ROI - Drag handles to resize, drag body to move"
- ✅ "Save Tool" and "Cancel" buttons appear below canvas
- ✅ Threshold slider becomes enabled
- ✅ Toast notification: "ROI Created - Adjust the ROI or click 'Save Tool' to confirm"

---

### Test 2: Resize with Corner Handles
**Steps:**
1. Complete Test 1 (ROI in edit mode)
2. Click and drag the bottom-right corner handle
3. Move mouse to expand/shrink ROI
4. Release mouse

**Expected Results:**
- ✅ ROI resizes in both width and height
- ✅ Handles stay attached to ROI edges/corners
- ✅ Rectangle dimensions update smoothly
- ✅ Negative dimensions handled (can drag backwards)

---

### Test 3: Resize with Edge Handles
**Steps:**
1. Complete Test 1 (ROI in edit mode)
2. Click and drag the right edge handle
3. Move mouse left/right
4. Release mouse

**Expected Results:**
- ✅ ROI resizes only in width
- ✅ Height remains unchanged
- ✅ Other dimension locks during resize

**Repeat for:**
- Top edge (height only)
- Bottom edge (height only)
- Left edge (width only)

---

### Test 4: Move ROI
**Steps:**
1. Complete Test 1 (ROI in edit mode)
2. Click inside the ROI body (not on handles)
3. Drag to new position
4. Release mouse

**Expected Results:**
- ✅ Entire ROI moves as a unit
- ✅ Width and height remain constant
- ✅ Handles move with ROI
- ✅ Smooth movement tracking

---

### Test 5: Adjust Threshold in Edit Mode
**Steps:**
1. Complete Test 1 (ROI in edit mode)
2. Locate "Adjust Threshold" panel on right side
3. Drag the threshold slider
4. Observe value changes

**Expected Results:**
- ✅ Slider is enabled (not grayed out)
- ✅ Number updates in real-time
- ✅ Helper text visible: "Adjust the threshold for the current ROI"
- ✅ Value range: 0-100

---

### Test 6: Save Tool
**Steps:**
1. Complete Test 1 (ROI in edit mode)
2. Optionally adjust ROI size, position, and threshold
3. Click "Save Tool" button

**Expected Results:**
- ✅ Tool appears in "Configured Tools" list
- ✅ Shows tool name (e.g., "1. Area Tool")
- ✅ Shows threshold value badge
- ✅ ROI drawn on canvas with label
- ✅ Edit mode exits
- ✅ Handles disappear
- ✅ Save/Cancel buttons hide
- ✅ Threshold slider disabled and resets to 65
- ✅ Tool selection re-enabled
- ✅ Toast: "Tool Added - Area Tool configured successfully"

---

### Test 7: Cancel Tool
**Steps:**
1. Complete Test 1 (ROI in edit mode)
2. Optionally make some adjustments
3. Click "Cancel" button

**Expected Results:**
- ✅ ROI disappears from canvas
- ✅ Tool NOT added to configured list
- ✅ Edit mode exits
- ✅ Handles disappear
- ✅ Save/Cancel buttons hide
- ✅ Tool selection re-enabled
- ✅ Canvas returns to normal state
- ✅ Toast: "Cancelled - Tool creation cancelled"

---

### Test 8: Multiple Tools
**Steps:**
1. Complete Test 6 (save first tool)
2. Select "Outline Tool"
3. Draw another ROI in different location
4. Enter edit mode automatically
5. Click "Save Tool"
6. Repeat for "Color Area Tool"

**Expected Results:**
- ✅ Each tool has different color
- ✅ All ROIs visible on canvas
- ✅ Each has numbered label (1, 2, 3, etc.)
- ✅ Counter updates: "Configured Tools (3/16)"
- ✅ Can draw up to 16 tools

---

### Test 9: Small ROI Rejection
**Steps:**
1. Select any tool type
2. Click and drag very small rectangle (< 10x10 pixels)
3. Release mouse

**Expected Results:**
- ✅ ROI is NOT accepted
- ✅ Edit mode NOT entered
- ✅ No handles appear
- ✅ Canvas clears
- ✅ Returns to normal state
- ✅ Can try drawing again

---

### Test 10: Tool Selection During Edit
**Steps:**
1. Complete Test 1 (ROI in edit mode)
2. Try clicking different tool type buttons

**Expected Results:**
- ✅ Tool buttons are disabled (50% opacity)
- ✅ Clicks have no effect
- ✅ Current tool type remains selected
- ✅ Cursor shows not-allowed

---

### Test 11: Delete Tool During Edit
**Steps:**
1. Add at least one tool to configured list
2. Start drawing a new tool
3. Enter edit mode
4. Try clicking delete button on existing tool

**Expected Results:**
- ✅ Delete button is disabled
- ✅ Click has no effect
- ✅ Must save or cancel current tool first

---

### Test 12: Position Adjust Limit
**Steps:**
1. Select "Position Adjustment Tool"
2. Draw ROI and save
3. Try to draw another Position Adjustment Tool

**Expected Results:**
- ✅ Toast error: "Limit Reached - Maximum 1 position adjustment tool allowed"
- ✅ Cannot start drawing
- ✅ Cursor remains not-allowed

---

### Test 13: Maximum Tools Limit
**Steps:**
1. Add 16 tools to configured list
2. Select any tool type
3. Try to draw another ROI

**Expected Results:**
- ✅ Toast error: "Limit Reached - Maximum 16 tools allowed per program"
- ✅ Cannot start drawing

---

### Test 14: Negative Dimension Drawing
**Steps:**
1. Select any tool type
2. Click at point A
3. Drag to point B that is left and above point A
4. Release mouse

**Expected Results:**
- ✅ ROI normalizes to positive dimensions
- ✅ Top-left corner at minimum x,y
- ✅ Width and height are positive
- ✅ Edit mode works normally

---

### Test 15: No Tool Selected Warning
**Steps:**
1. Ensure no tool type is selected
2. Try clicking on canvas

**Expected Results:**
- ✅ Toast warning: "No Tool Selected - Please select a tool type first"
- ✅ Nothing drawn on canvas
- ✅ Cursor shows not-allowed

---

### Test 16: Mouse Leave During Draw
**Steps:**
1. Select any tool type
2. Start drawing ROI
3. While dragging, move mouse outside canvas bounds
4. Canvas loses mouse event

**Expected Results:**
- ✅ Drawing stops
- ✅ Partial ROI is evaluated
- ✅ If size > 10x10, enters edit mode
- ✅ If size < 10x10, discards ROI

---

### Test 17: Mouse Leave During Edit
**Steps:**
1. Complete Test 1 (ROI in edit mode)
2. Start dragging a handle
3. Move mouse outside canvas
4. Release mouse outside

**Expected Results:**
- ✅ Resize/move operation completes
- ✅ ROI remains in edit mode
- ✅ Can continue editing

---

### Test 18: Rapid Clicks
**Steps:**
1. Select any tool type
2. Rapidly click and release without dragging
3. Repeat multiple times

**Expected Results:**
- ✅ Small ROIs are rejected (< 10x10)
- ✅ No edit mode entered
- ✅ System remains stable
- ✅ No frozen states

---

### Test 19: Delete Configured Tool
**Steps:**
1. Add several tools to configured list
2. Exit edit mode
3. Click delete button on tool #2

**Expected Results:**
- ✅ Tool #2 removed from list
- ✅ Numbering updates (3 becomes 2, 4 becomes 3, etc.)
- ✅ ROI removed from canvas
- ✅ Toast: "Tool Removed - Tool configuration deleted"
- ✅ Can draw new tools

---

### Test 20: End-to-End Workflow
**Steps:**
1. Start at Step 1 (Image Optimization)
2. Configure brightness and focus
3. Proceed to Step 2 (Master Image)
4. Capture master image
5. Proceed to Step 3 (Tool Configuration)
6. Add 3 different tool types with custom thresholds
7. Verify all tools in configured list
8. Proceed to Step 4 (Output Assignment)
9. Go back to Step 3
10. Verify tools still present

**Expected Results:**
- ✅ All tools persist through navigation
- ✅ Threshold values preserved
- ✅ ROI positions and sizes preserved
- ✅ Can add/remove tools after navigation
- ✅ Master image still displays

---

## 🐛 Bug Scenarios to Check

### Bug Check 1: Handle Collision
**Issue**: What if handles overlap on very small ROI?
**Test**: Draw 15x15 pixel ROI
**Expected**: Handles render, clickable areas work

### Bug Check 2: ROI Outside Bounds
**Issue**: What if user drags ROI partially off canvas?
**Test**: Move ROI to edge, handles partially outside
**Expected**: Still editable, save works

### Bug Check 3: Threshold Not Applied
**Issue**: Does threshold in edit mode apply to saved tool?
**Test**: Set threshold to 85, save tool, check configured list
**Expected**: Badge shows "85"

### Bug Check 4: State Corruption
**Issue**: What if page reloads during edit mode?
**Test**: Enter edit mode, refresh browser
**Expected**: Clean state on reload

### Bug Check 5: Master Image Missing
**Issue**: What if user skips Step 2?
**Test**: Go directly to Step 3 without master image
**Expected**: Placeholder shown, can still draw ROIs

---

## ✅ Checklist Summary

Run all tests and check results:

- [ ] Test 1: Basic ROI Creation
- [ ] Test 2: Resize with Corner Handles
- [ ] Test 3: Resize with Edge Handles
- [ ] Test 4: Move ROI
- [ ] Test 5: Adjust Threshold in Edit Mode
- [ ] Test 6: Save Tool
- [ ] Test 7: Cancel Tool
- [ ] Test 8: Multiple Tools
- [ ] Test 9: Small ROI Rejection
- [ ] Test 10: Tool Selection During Edit
- [ ] Test 11: Delete Tool During Edit
- [ ] Test 12: Position Adjust Limit
- [ ] Test 13: Maximum Tools Limit
- [ ] Test 14: Negative Dimension Drawing
- [ ] Test 15: No Tool Selected Warning
- [ ] Test 16: Mouse Leave During Draw
- [ ] Test 17: Mouse Leave During Edit
- [ ] Test 18: Rapid Clicks
- [ ] Test 19: Delete Configured Tool
- [ ] Test 20: End-to-End Workflow

### Bug Checks
- [ ] Bug Check 1: Handle Collision
- [ ] Bug Check 2: ROI Outside Bounds
- [ ] Bug Check 3: Threshold Not Applied
- [ ] Bug Check 4: State Corruption
- [ ] Bug Check 5: Master Image Missing

---

## 🚀 Quick Start Testing

### Automated Test Script (Coming Soon)
```bash
# Not implemented yet - manual testing required
npm run test:roi
```

### Manual Testing
```bash
# 1. Start application
npm run dev:all

# 2. Open browser
# Navigate to: http://localhost:3000/configure

# 3. Complete steps 1-2

# 4. Test Step 3 using scenarios above
```

---

## 📊 Test Results Template

```
Test Date: ___________
Tester: ___________
Browser: ___________
OS: ___________

Test 1: ✅ / ❌  Notes: ________________
Test 2: ✅ / ❌  Notes: ________________
Test 3: ✅ / ❌  Notes: ________________
...
Test 20: ✅ / ❌  Notes: ________________

Bugs Found:
1. ___________
2. ___________
3. ___________

Overall: ✅ PASS / ❌ FAIL
```

---

**File**: TEST_ROI_DRAWING.md  
**Purpose**: Comprehensive test plan for ROI drawing functionality  
**Status**: Ready for testing

