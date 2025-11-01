# 🎮 Berry GameBuilder - Quick Reference Card

## 🚀 Access
- **Main GameBuilder**: `http://localhost:3000/game-builder`
- **Advanced Demo**: `http://localhost:3000/advanced-features-demo`

---

## 🛠️ Tools Overview

### Original Tools
| Tool | Icon | Purpose | Click Action |
|------|------|---------|--------------|
| Select | 🖱️ | Select & move objects | Click object to select |
| Player | 👤 | Place player start | Click to place player |
| Platform | 📦 | Add platforms | Click to add platform |
| Coin | 🪙 | Add coins | Click to add coin |
| Enemy | ⚡ | Add enemies | Click to add enemy |
| Goal | 🏁 | Place goal | Click to place goal |
| Eraser | 🗑️ | Remove objects | Click to erase |

### New Advanced Tools
| Tool | Icon | Purpose | How to Access |
|------|------|---------|---------------|
| Brush | 🖌️ | Paint tiles | Click Brush tool |
| Brush Controls | ⚙️ | Configure brush | Click "Brush Controls" button |
| Layer Panel | 🎨 | Manage layers | Click "Layer Panel" button |
| Tile Palette | 🎨 | Select tiles | Click "Tile Palette" button |

---

## ⌨️ Keyboard Shortcuts

### Brush Tool Shortcuts (when Brush is active)
```
B ............. Paint mode
E ............. Erase mode
F ............. Fill mode
I ............. Eyedropper mode
[ ............. Decrease brush size
] ............. Increase brush size
```

### Selection Shortcuts (when Select is active)
```
Ctrl/Cmd + A .. Select all
Ctrl/Cmd + C .. Copy
Ctrl/Cmd + V .. Paste
Ctrl/Cmd + D .. Duplicate
Delete/Backspace Delete
Arrow Keys .... Move (Shift for fine control)
G ............. Group
U ............. Ungroup
Escape ........ Deselect all
```

### Play Mode Shortcuts
```
Arrow Keys / WASD .. Move player
Space / Up Arrow .. Jump
```

---

## 🖌️ Brush Tool Modes

| Mode | Key | Color | Description |
|------|-----|-------|-------------|
| **Paint** | B | 🟢 Green | Apply selected tile |
| **Erase** | E | 🔴 Red | Remove tiles |
| **Fill** | F | 🔵 Blue | Flood fill area |
| **Eyedropper** | I | 🟡 Yellow | Pick tile from canvas |

### Brush Sizes
- **Range**: 1-10 tiles
- **Control**: Slider or `[` / `]` keys
- **Display**: "1x1", "3x3", "5x5", etc.

### Brush Shapes
- **Square**: Rectangle brush (default)
- **Circle**: Circular brush
- **Line**: Smooth line drawing

---

## 🎨 Layer System

### Default Layers
1. **Background** (Order 0) - Bottom layer
2. **Main** (Order 1) - Primary gameplay
3. **Foreground** (Order 2) - Front elements
4. **UI** (Order 3) - Top layer

### Layer Controls
| Control | Icon | Action |
|---------|------|--------|
| Visibility | 👁️/🚫 | Show/hide layer |
| Lock | 🔒/🔓 | Prevent/allow editing |
| Opacity | Slider | 0-100% transparency |
| Up/Down | ⬆️⬇️ | Reorder layers |
| Rename | ✏️ | Change layer name |
| Delete | 🗑️ | Remove layer |

---

## 💾 Save/Load System

### Save Level
1. Click **"Save Level"** button
2. Downloads `berry-level-[timestamp].json`
3. Includes: config, level, tiles, layers, background

### Load Level
1. Click **"Load Level"** button
2. Select `.json` file
3. Restores complete level state

### Save Format
```json
{
  "config": { ... },      // Game settings
  "level": { ... },       // Game objects
  "tiles": { ... },       // Tile system data
  "layers": { ... },      // Layer system data
  "background": "..."     // Background preset
}
```

---

## 🎯 Workflow Cheat Sheet

### Quick Level Creation
```
1. Select background preset
2. Use Brush tool to paint terrain
3. Add platforms with Platform tool
4. Place coins with Coin tool
5. Add enemies with Enemy tool
6. Place goal with Goal tool
7. Test in Play Mode
8. Save level
```

### Tile-Based Level
```
1. Click "Tile Palette" button
2. Select tile
3. Click "Brush" tool
4. Paint with brush
5. Use Fill mode (F) for large areas
6. Use Erase mode (E) for corrections
7. Save level
```

### Layer-Based Level
```
1. Click "Layer Panel" button
2. Create layers: Terrain, Objects, Effects
3. Set active layer to Terrain
4. Paint base terrain
5. Switch to Objects layer
6. Add platforms and coins
7. Switch to Effects layer
8. Add foreground elements at 50% opacity
9. Save level
```

---

## 🎨 Visual Indicators

### Brush Preview Colors
- 🟢 **Green** = Paint mode
- 🔴 **Red** = Erase mode
- 🔵 **Blue** = Fill mode
- 🟡 **Yellow** = Eyedropper mode

### Selection Highlights
- 🟠 **Orange dashed outline** = Selected object
- 🟠 **Orange box** = Selection area

### Layer Indicators
- 🔵 **Blue ring** = Active layer
- 👁️ **Eye** = Visible layer
- 🚫 **Crossed eye** = Hidden layer
- 🔒 **Lock** = Locked layer
- 🔓 **Unlock** = Unlocked layer

---

## 🚀 Performance Tips

### Optimization Guidelines
- ✅ Use Fill mode for large areas (faster than painting)
- ✅ Limit layers to 4-8 for best performance
- ✅ Hide unused layers while editing
- ✅ Keep brush size ≤ 10 tiles
- ✅ Lock finished layers to prevent re-rendering
- ✅ Save frequently to avoid data loss

### Recommended Limits
- **Grid Size**: 20x12 to 40x24
- **Layers**: 4-8 layers
- **Objects per Layer**: 100-500
- **Brush Size**: 1-10 tiles
- **Tiles**: Unlimited

---

## 🎓 Common Tasks

### Copy Object Pattern
```
1. Select tool: Click "Select"
2. Multi-select: Shift+Click objects
3. Copy: Ctrl/Cmd+C
4. Paste: Ctrl/Cmd+V (repeats 1 grid offset)
```

### Align Multiple Objects
```
1. Select multiple objects (Shift+Click)
2. Alignment buttons appear in toolbar
3. Click desired alignment (Left, Right, Top, Bottom, Center)
```

### Group Objects
```
1. Select multiple objects
2. Press G key (or click "Group" button)
3. Objects move together when selected
4. Press U to ungroup
```

### Pick Tile Color
```
1. Activate Brush tool
2. Press I key (Eyedropper mode)
3. Click tile on canvas
4. Automatically switches back to Paint mode
5. Paint with picked tile
```

### Create Layer Effect
```
1. Create new layer: Click "+" in Layer Panel
2. Set opacity: Adjust slider to 30-50%
3. Add objects to layer
4. Result: Transparent effect layer
```

---

## 🐛 Troubleshooting

### Issue: Can't paint with brush
✅ **Solution**: 
1. Select a tile from Tile Palette
2. Ensure Brush tool is active
3. Check brush mode is Paint (B key)

### Issue: Objects not showing
✅ **Solution**:
1. Check layer visibility (👁️ icon)
2. Ensure layer opacity > 0%
3. Verify object is on active layer

### Issue: Can't select objects
✅ **Solution**:
1. Switch to Select tool
2. Unlock layer (🔓 icon)
3. Click directly on object

### Issue: Brush not drawing
✅ **Solution**:
1. Check brush size > 0
2. Verify layer is not locked
3. Ensure mouse is down while painting

### Issue: Changes not saving
✅ **Solution**:
1. Click "Save Level" (not "Save Game")
2. Check browser downloads folder
3. Verify JSON file was created

---

## 📚 Documentation Links

### Full Documentation
- **COMPLETE_INTEGRATION_SUMMARY.md** - Complete integration guide
- **BRUSH_LAYER_GUIDE.md** - Brush & Layer API reference
- **BRUSH_LAYER_SUMMARY.md** - Features summary
- **ADVANCED_FEATURES_GUIDE.md** - All features documentation

### Examples
- **app/advanced-features-demo/page.tsx** - Standalone demo
- **components/GameBuilder.jsx** - Integrated implementation

---

## 🎯 Power User Shortcuts

### Speed Building
```
Workflow: Terrain → Objects → Details → Test
Time: 5-10 minutes per level
Tools: Brush (terrain), Select (objects), Layer (organization)
```

### Quick Tile Painting
```
1. Open Tile Palette (once)
2. Brush size to 5 (press ] key 4 times)
3. Paint mode (press B)
4. Drag-paint terrain (hold mouse down)
5. Fill mode (press F)
6. Click to fill large areas
Time: 1-2 minutes for base terrain
```

### Efficient Object Placement
```
1. Place one platform
2. Copy (Ctrl+C)
3. Paste multiple times (Ctrl+V)
4. Select all copies (Shift+Click)
5. Align (click alignment button)
6. Adjust spacing with arrow keys
Time: 30 seconds for 10 aligned platforms
```

---

## 🎉 Quick Start: 30-Second Level

```
1. Click "Brush" tool
2. Click "Tile Palette", select green tile
3. Paint ground along bottom
4. Click "Platform" tool, place 3 platforms
5. Click "Coin" tool, place 3 coins
6. Click "Goal" tool, place goal
7. Click "Play Test" button
8. Win! 🎉
```

---

## 🔥 Hot Tips

1. **Always select a tile before brushing**
2. **Use keyboard shortcuts for 10x speed**
3. **Save before major edits (no undo yet)**
4. **Test in Play Mode frequently**
5. **Lock layers when finished with them**
6. **Name layers descriptively**
7. **Use Fill mode for large areas**
8. **Eyedropper (I key) is your friend**
9. **Group related objects together**
10. **Keep brush size small for details**

---

## 📞 Need Help?

### Resources
- 📖 Read full documentation files
- 🎮 Try the advanced-features-demo
- 💻 Check component source code
- 🎨 Experiment with each tool

### Common Questions
**Q: Where's undo?**
A: Not yet implemented. Save often!

**Q: How do I add custom tiles?**
A: Currently uses preset colors. Custom sprites coming soon.

**Q: Can I import images?**
A: Not yet. Focus on tile-based design for now.

**Q: How many layers can I have?**
A: Unlimited, but 4-8 is optimal for performance.

---

**🫐 Enjoy building with Berry!**

Print this page for quick reference while building! ✨
