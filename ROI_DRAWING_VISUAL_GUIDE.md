# ROI Drawing - Visual Guide

## 🎨 Visual States

### State 1: Ready to Draw
```
┌─────────────────────────────────────────┐
│ Draw ROI (Region of Interest)          │
├─────────────────────────────────────────┤
│                                         │
│        [Master Image Display]           │
│                                         │
│         Cursor: ✛ (crosshair)          │
│                                         │
└─────────────────────────────────────────┘

Tool Selection: ✅ ENABLED
Threshold Slider: 🔒 DISABLED (default: 65)
Save/Cancel: ⚪ HIDDEN
```

---

### State 2: Drawing ROI
```
┌─────────────────────────────────────────┐
│ Draw ROI (Region of Interest)          │
├─────────────────────────────────────────┤
│                                         │
│        [Master Image Display]           │
│                                         │
│         ┏ ━ ━ ━ ━ ━ ┓                   │
│         ┇           ┇  ← Dashed preview │
│         ┗ ━ ━ ━ ━ ━ ┛                   │
│                                         │
└─────────────────────────────────────────┘

Tool Selection: 🔒 DISABLED
Threshold Slider: 🔒 DISABLED
Save/Cancel: ⚪ HIDDEN
```

---

### State 3: Edit Mode (After Mouse Release)
```
┌─────────────────────────────────────────┐
│ Edit ROI - Drag handles to resize,     │
│           drag body to move             │
├─────────────────────────────────────────┤
│                                         │
│        [Master Image Display]           │
│                                         │
│         ■━━━━━■━━━━━■                   │
│         ┃           ┃  ← Solid line     │
│         ■           ■  ← Edge handles   │
│         ┃           ┃                   │
│         ■━━━━━■━━━━━■  ← Corner handles │
│                                         │
├─────────────────────────────────────────┤
│  [✓ Save Tool]   [✗ Cancel]            │
└─────────────────────────────────────────┘

Tool Selection: 🔒 DISABLED
Threshold Slider: ✅ ENABLED (adjustable)
Save/Cancel: ✅ VISIBLE
Cursor: 👆 (move)
```

---

## 🎯 Handle Types

### Corner Handles (4)
```
TL ━━━━━━━ TR
 ┃         ┃
 ┃         ┃
 ┃         ┃
BL ━━━━━━━ BR

TL = Top-Left     → Resize ↖↘
TR = Top-Right    → Resize ↗↙
BL = Bottom-Left  → Resize ↙↗
BR = Bottom-Right → Resize ↘↖
```

### Edge Handles (4)
```
    T
    ■
L ■   ■ R
    ■
    B

T = Top    → Resize ↕ (height)
B = Bottom → Resize ↕ (height)
L = Left   → Resize ↔ (width)
R = Right  → Resize ↔ (width)
```

### Move Handle
```
┏━━━━━━━━━┓
┃         ┃
┃    👆   ┃ ← Click anywhere inside
┃         ┃   to move entire ROI
┗━━━━━━━━━┛
```

---

## 📊 Side Panel States

### Normal Mode
```
┌─────────────────────────┐
│ Select Tool Type        │
├─────────────────────────┤
│ ⬜ Area Tool           │ ← Clickable
│ ⬜ Outline Tool        │ ← Clickable
│ ⬜ Color Area Tool     │ ← Clickable
└─────────────────────────┘

┌─────────────────────────┐
│ Threshold Setting       │
├─────────────────────────┤
│ Threshold:          65  │
│ ━━━━━━━○━━━━━━━━━━     │ ← Disabled
└─────────────────────────┘
```

### Edit Mode
```
┌─────────────────────────┐
│ Select Tool Type        │
├─────────────────────────┤
│ ⬜ Area Tool   (50%)   │ ← Disabled/Faded
│ ⬜ Outline Tool (50%)  │ ← Disabled/Faded
│ ⬜ Color Area Tool (50%)│ ← Disabled/Faded
└─────────────────────────┘

┌─────────────────────────┐
│ Adjust Threshold        │ ← Title changed
├─────────────────────────┤
│ Threshold:          75  │
│ ━━━━━━━━━○━━━━━━━━━     │ ← Enabled!
│                         │
│ ℹ Adjust the threshold  │
│   for the current ROI   │
└─────────────────────────┘
```

---

## 🔄 Complete Interaction Flow

### Flow Diagram
```
       START
         │
         ▼
   ┌──────────┐
   │  Select  │
   │   Tool   │
   │   Type   │
   └──────────┘
         │
         ▼
   ┌──────────┐
   │  Click & │  Mode: 'drawing'
   │   Drag   │  Preview: Dashed
   │          │
   └──────────┘
         │
         ▼
   ┌──────────┐
   │ Release  │  ✨ AUTOMATIC
   │  Mouse   │  Mode: 'editing'
   └──────────┘  Handles: Visible
         │
         ▼
   ┌──────────┐
   │  Adjust  │  • Resize with handles
   │    ROI   │  • Move by dragging body
   │          │  • Adjust threshold
   └──────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────┐  ┌──────┐
│ Save │  │Cancel│
│ Tool │  │      │
└──────┘  └──────┘
    │         │
    ▼         ▼
  Added    Discarded
    │         │
    └────┬────┘
         ▼
    Back to START
```

---

## 🎬 Animation Timeline

### Drawing Phase (0-2 seconds)
```
t=0.0s: Click down at (100, 100)
        ↓
t=0.5s: Drag to (200, 150)
        ┏ ━ ━ ━ ┓  ← 100x50 dashed preview
        ┗ ━ ━ ━ ┛
        ↓
t=1.0s: Drag to (300, 200)
        ┏ ━ ━ ━ ━ ━ ┓  ← 200x100 dashed preview
        ┗ ━ ━ ━ ━ ━ ┛
        ↓
t=2.0s: Release mouse
```

### Transition (2.0-2.1 seconds)
```
t=2.0s: Mouse released
        ↓
t=2.05s: ✨ Mode changes to 'editing'
        ↓
t=2.1s: Handles appear
        ■━━━━━■━━━━━■
        ┃           ┃
        ■           ■
        ┃           ┃
        ■━━━━━■━━━━━■
        
        Buttons appear:
        [✓ Save Tool] [✗ Cancel]
        
        Toast notification:
        "ROI Created - Adjust or click Save Tool"
```

### Edit Phase (2.1+ seconds)
```
t=2.1s+: User can:
         • Drag handles to resize
         • Drag body to move
         • Adjust threshold slider
         • Click Save Tool
         • Click Cancel
```

---

## 🎨 Color Coding

### Tool Colors
```
Area Tool:       🟦 #3b82f6 (Blue)
Outline Tool:    🟩 #10b981 (Green)
Color Area Tool: 🟪 #8b5cf6 (Purple)
Blob Tool:       🟧 #f59e0b (Orange)
Count Tool:      🟥 #ef4444 (Red)
Position Adjust: 🟨 #eab308 (Yellow)
```

### State Indicators
```
✅ Enabled:   Full opacity, interactive
🔒 Disabled:  50% opacity, not clickable
⚪ Hidden:    Not visible
✨ Active:    Highlighted with border
```

---

## 💡 User Tips

### Best Practices
```
✅ DO:
- Select tool type BEFORE drawing
- Draw ROI larger than 10x10 pixels
- Use corner handles for proportional resize
- Use edge handles for single-dimension resize
- Click inside ROI body to move it
- Adjust threshold in edit mode

❌ DON'T:
- Try to draw without selecting tool
- Draw ROI smaller than 10x10
- Try to select different tool during edit
- Forget to click Save Tool button
```

### Keyboard Shortcuts (Future)
```
ESC   → Cancel editing
ENTER → Save tool
←↑↓→  → Fine positioning (1px moves)
SHIFT+←↑↓→ → Fast positioning (10px moves)
```

---

## 📱 Responsive Behavior

### Desktop (1920x1080)
```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌──────────────┐  ┌────────────────────┐  │
│  │   Canvas     │  │  Tool Selection    │  │
│  │   640x480    │  │                    │  │
│  │              │  │  Threshold Panel   │  │
│  │              │  │                    │  │
│  └──────────────┘  │  Configured Tools  │  │
│                    └────────────────────┘  │
└─────────────────────────────────────────────┘
        Side-by-side layout
```

### Tablet/Mobile (< 1024px)
```
┌─────────────────────────┐
│  ┌──────────────────┐  │
│  │   Canvas         │  │
│  │   Full Width     │  │
│  └──────────────────┘  │
│                        │
│  ┌──────────────────┐  │
│  │ Tool Selection   │  │
│  └──────────────────┘  │
│                        │
│  ┌──────────────────┐  │
│  │ Threshold Panel  │  │
│  └──────────────────┘  │
│                        │
│  ┌──────────────────┐  │
│  │ Configured Tools │  │
│  └──────────────────┘  │
└─────────────────────────┘
     Stacked layout
```

---

**File**: ROI_DRAWING_VISUAL_GUIDE.md  
**Purpose**: Visual reference for ROI drawing interaction  
**Status**: ✅ Complete

