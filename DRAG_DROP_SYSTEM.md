# 🎯 Enhanced Drag and Drop System - Documentation

## ✅ Successfully Implemented!

The Berry Game Builder now includes a powerful **Advanced Object Selection & Manipulation System** with professional-grade tools for level design.

---

## 🎨 Features Overview

### 1. **Multi-Selection System**
- **Single Selection**: Click on any object to select it
- **Multi-Selection**: Hold `Shift` + Click to add/remove objects from selection
- **Box Selection**: Hold `Shift` and drag to select multiple objects in a rectangular area
- **Select All**: `Ctrl/Cmd + A` to select all objects

### 2. **Drag and Drop**
- **Direct Manipulation**: Click and drag selected objects to move them
- **Snap to Grid**: Objects automatically snap to the grid while dragging
- **Multi-Object Dragging**: Move multiple selected objects together

### 3. **Object Manipulation**
- **Copy**: `Ctrl/Cmd + C` to copy selected objects
- **Paste**: `Ctrl/Cmd + V` to paste at offset position
- **Duplicate**: `Ctrl/Cmd + D` to duplicate selected objects
- **Delete**: `Delete` or `Backspace` to remove selected objects

### 4. **Alignment Tools**
- **Align Left**: Align all selected objects to the leftmost position
- **Align Right**: Align all selected objects to the rightmost position
- **Align Top**: Align all selected objects to the topmost position
- **Align Bottom**: Align all selected objects to the bottommost position
- **Center Horizontal**: Center objects horizontally
- **Center Vertical**: Center objects vertically

### 5. **Grouping System**
- **Create Group**: `G` key or click "Group" button to group selected objects
- **Ungroup**: `U` key or click "Ungroup" button to ungroup
- **Group Selection**: Click any object in a group to select the entire group

### 6. **Keyboard Shortcuts**
| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + A` | Select All |
| `Ctrl/Cmd + C` | Copy |
| `Ctrl/Cmd + V` | Paste |
| `Ctrl/Cmd + D` | Duplicate |
| `Delete` / `Backspace` | Delete Selected |
| `Arrow Keys` | Move Selected (fine control) |
| `Shift + Arrow Keys` | Move Selected (grid step) |
| `G` | Group Selected |
| `U` | Ungroup Selected |
| `Escape` | Deselect All |
| `Shift + Click` | Multi-Select |
| `Shift + Drag` | Box Select |

---

## 🎮 How to Use

### Basic Selection:
1. Click the **"Select"** tool (mouse pointer icon) in the toolbox
2. Click any object on the canvas to select it
3. Selected objects are highlighted with an **orange dashed border**

### Multi-Selection:
**Method 1: Shift+Click**
1. Select the first object
2. Hold `Shift` and click other objects to add them to selection
3. `Shift + Click` a selected object to deselect it

**Method 2: Box Selection**
1. Hold `Shift` and drag on empty canvas area
2. A **semi-transparent orange box** will appear
3. Release to select all objects within the box

### Moving Objects:
1. Select one or more objects
2. Click and drag to move them
3. Objects will snap to the grid automatically
4. **OR** use arrow keys for precise positioning:
   - `Arrow Keys`: Move 1/4 grid step (fine control)
   - `Shift + Arrow Keys`: Move 1 full grid step

### Alignment:
1. Select 2 or more objects
2. The **Selection Panel** appears showing alignment tools
3. Click any alignment button (Left, Right, Top, Bottom, Center)
4. All objects align instantly

### Grouping:
1. Select multiple objects
2. Press `G` or click **"Group"** button
3. Grouped objects move together as one unit
4. Press `U` or click **"Ungroup"** to separate them

### Copy & Paste:
1. Select objects to copy
2. Press `Ctrl/Cmd + C` to copy
3. Press `Ctrl/Cmd + V` to paste
4. Pasted objects appear offset from originals

### Duplicate:
1. Select objects to duplicate
2. Press `Ctrl/Cmd + D`
3. Duplicates appear offset and auto-selected

---

## 🎯 Selection Panel

When objects are selected, a **dynamic Selection Panel** appears showing:

### Information:
- **Number of selected objects**: "Selected: X objects"

### Quick Actions:
- **Copy Button**: Copy selected objects to clipboard
- **Delete Button**: Remove selected objects (red button)

### Alignment Tools (2+ objects):
- **3 Horizontal Alignment Buttons**: Left, Center, Right
- **2 Vertical Alignment Buttons**: Top, Bottom

### Grouping Controls (2+ objects):
- **Group Button**: Create a group (blue button)
- **Ungroup Button**: Dissolve group

### Keyboard Hints:
- Shows common shortcuts at the bottom

---

## 🖼️ Visual Feedback

### Selection Highlights:
- **Orange dashed border** (3px width, 5px dashes)
- Appears around ALL selected objects
- Animated dashes indicate active selection

### Selection Box:
- **Semi-transparent orange fill** (10% opacity)
- **Orange dashed border** (2px width, 5px dashes)
- Updates in real-time as you drag

### Cursor:
- **Crosshair cursor** over canvas
- Changes to move cursor when hovering over selected objects

---

## 🔧 Technical Implementation

### State Management:
```javascript
// Selection state
const [selectedObjects, setSelectedObjects] = useState([]);
const [selectionBox, setSelectionBox] = useState(null);
const [isDragging, setIsDragging] = useState(false);
const [isMultiSelecting, setIsMultiSelecting] = useState(false);

// Manipulation state
const [clipboard, setClipboard] = useState([]);
const [groups, setGroups] = useState([]);
const [dragStart, setDragStart] = useState(null);
const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
```

### Core Functions:
- `getAllObjects()`: Flattens all level objects into unified array
- `snapToGrid(x, y)`: Snaps coordinates to grid
- `alignSelected(alignment)`: Aligns multiple objects
- `applyObjectUpdates(updates)`: Applies position changes to objects
- `createGroup(objects)`: Groups objects together
- `ungroupSelected()`: Ungroups selected objects
- `generateId()`: Creates unique object IDs

### Event Handlers:
- `handleCanvasMouseDown`: Initiates selection/dragging
- `handleCanvasMouseMove`: Updates drag position and selection box
- `handleCanvasMouseUp`: Finalizes selection/drag operation
- `handleKeyDown`: Processes keyboard shortcuts

---

## 🎨 UI Components

### New Tool Added:
```jsx
{ id: 'select', icon: MousePointer2, label: 'Select' }
```

### Selection Panel:
- **Conditional rendering**: Only appears when objects are selected
- **Responsive design**: Adapts to different screen sizes
- **Color-coded actions**:
  - Orange: Selection info and primary actions
  - Blue: Grouping
  - Red: Destructive actions (delete)
  - Gray: Standard actions

---

## 📋 Workflow Examples

### Example 1: Align Platforms
1. Click **Select tool**
2. `Shift + Drag` to box-select multiple platforms
3. Click **"Align Top"** to align them horizontally
4. All platforms snap to the same Y position

### Example 2: Create Coin Pattern
1. Place one coin
2. Select it with **Select tool**
3. Press `Ctrl + D` multiple times to duplicate
4. Use arrow keys to position each coin
5. Select all coins with `Shift + Drag`
6. Press `G` to group them
7. Move the entire group as one unit

### Example 3: Mirror Level Section
1. Select all objects in one section
2. Press `Ctrl + C` to copy
3. Press `Ctrl + V` to paste
4. Use arrow keys to position the copy on the other side
5. Select individual objects and use alignment tools to adjust

---

## 🚀 Performance Notes

### Optimizations:
- **Grid snapping**: Reduces render updates by snapping to discrete positions
- **Unique IDs**: Every object gets a unique ID for efficient tracking
- **Batch updates**: Multiple changes applied in single state update
- **Lazy rendering**: Selection highlights only render in edit mode

### Best Practices:
- Use **Box Selection** for selecting many objects quickly
- Use **Grouping** for complex arrangements you'll reuse
- Use **Alignment tools** instead of manual positioning
- Use **Keyboard shortcuts** for faster workflow

---

## 🎯 Future Enhancements (Ideas)

- [ ] Rotation support (`R` key)
- [ ] Scale/resize support
- [ ] Snap to other objects (not just grid)
- [ ] Distribute objects evenly (horizontal/vertical)
- [ ] Layer system (bring to front/send to back)
- [ ] Lock/unlock objects
- [ ] Named groups with custom colors
- [ ] Undo/Redo system
- [ ] Selection history
- [ ] Smart guides (alignment lines)

---

## 🐛 Known Limitations

1. **Player & Goal**: Can only have one of each, so selection works differently
2. **Grouping**: Groups don't persist on page reload (add save/load later)
3. **Rotation**: Not yet implemented (sprites would need rotation support)
4. **Undo**: No undo system yet (use careful workflows)

---

## ✨ Summary

You now have a **professional-grade level editor** with:

✅ Multi-object selection (click, shift+click, box select)  
✅ Drag and drop with grid snapping  
✅ Copy, paste, duplicate, delete operations  
✅ Alignment tools (6 types)  
✅ Grouping system  
✅ Full keyboard shortcut support  
✅ Visual feedback (selection highlights, selection box)  
✅ Dynamic selection panel with context-aware controls  
✅ Responsive design for all screen sizes  

**Start building amazing levels faster than ever!** 🫐
