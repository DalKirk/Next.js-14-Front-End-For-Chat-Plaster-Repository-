# How to Test Animated Sprites in Pluto Game Builder

## Quick Start Guide

### Step 1: Upload a Sprite Sheet

1. **Open the game builder** at `http://localhost:3000/game-builder`
2. **Look at the bottom panel** - You should see tabs: Assets | Scenes | Audio | Events | Console
3. **Click the "Assets" tab** (should be active by default)
4. **Click the blue "Import" button** (top right of bottom panel)
5. **Select your sprite sheet image** (PNG recommended, e.g., 256x256 with 32x32 frames)
6. The asset will appear in the Assets grid

### Step 2: Create an Entity

You have two options:

**Option A: Use Existing Entities**
- The editor starts with pre-made entities (Player, Enemy 1, Enemy 2, etc.)
- Click any entity in the scene to select it
- Skip to Step 3

**Option B: Add Asset to Scene**
1. In the **Assets tab**, find your uploaded sprite sheet
2. **Hover over the asset card**
3. Look for an **"Add to Scene"** button (appears on hover)
4. Click it - this creates a new entity at position (400, 300)
5. The entity will appear in the scene canvas (center panel)

### Step 3: Add Animated Sprite Behavior

1. **Select an entity** by clicking it in the scene (it will get a selection outline)
2. **Look at the right sidebar** - "Inspector" panel
3. Scroll down to the **"Behaviors"** section
4. Click **"Add Behavior"** button
5. A dropdown appears with behavior categories
6. Look for **"Visual"** category
7. Find **"🎬 Animated Sprite"**
8. Click it to add the behavior

### Step 4: Configure the Animation

The Animated Sprite behavior config will appear:

1. **Sprite Sheet** dropdown:
   - Select your uploaded sprite sheet

2. **Frame Width** & **Frame Height**:
   - Enter the size of each frame (e.g., 32 for 32x32 frames)
   - This tells the system how to slice your sprite sheet

3. **Default Animation**:
   - Type a name (e.g., "idle")

4. **Animations** section:
   - You'll see a canvas showing your sprite sheet with a grid overlay
   - **Add animation**: Click "+ Add" button
   - **Rename**: Click the animation name and type a new one (e.g., "walk", "jump")
   - **Select frames**: Click frames on the sprite sheet to add them to the animation
   - **Frame order**: Numbers appear on selected frames (0, 1, 2...)
   - **Speed**: Set milliseconds per frame (150 = ~6.6 fps)
   - **Loop**: Choose "Yes" for looping animations, "No" to hold last frame

5. **Preview**: Click the Play button to preview your animation

### Step 5: Test in Play Mode

1. Click the **Play ▶** button (top toolbar)
2. Your animated entity should now display with cycling frames!
3. If you added a **Platform Character** behavior, use arrow keys to move
4. The animation should auto-flip direction when moving left/right

## Troubleshooting

### "I don't see the Assets tab"
- Make sure you're at `/game-builder` (not `/advanced-features-demo`)
- The bottom panel should have tabs - click "Assets"

### "I don't see the Import button"
- Click the "Assets" tab first
- The Import button is at the top-right of the bottom panel (blue button)

### "I can't click entities"
- Make sure you're in **Edit mode** (not Play mode)
- Look for Edit/Play toggle in the top toolbar

### "I don't see the Behaviors section"
- You must **select an entity first** (click it in the scene)
- Look at the **right sidebar** (Inspector panel)
- Scroll down if needed

### "Animated Sprite behavior doesn't appear"
- Make sure the build completed successfully (check terminal)
- Refresh the page (Ctrl+R or F5)
- Check browser console for errors (F12)

### "Animation shows red question mark"
- Make sure you selected a sprite sheet in the dropdown
- Verify Frame Width/Height match your sprite sheet's tile size
- Check that you clicked frames to add them to the animation

## Example Workflow

Here's a complete example with a 256x256 sprite sheet containing 8x8 frames (32x32 each):

1. **Upload**: Import `player-spritesheet.png` (256x256)
2. **Create**: Select the existing "Player" entity
3. **Add Behavior**: Behaviors → Add Behavior → Visual → Animated Sprite
4. **Configure**:
   - Sprite Sheet: `player-spritesheet.png`
   - Frame Width: `32`
   - Frame Height: `32`
   - Default Animation: `idle`
5. **Define Animations**:
   - **Add animation** → rename to "idle"
   - Click frames 0, 1, 2, 3 (first row)
   - Speed: 150, Loop: Yes
   - **Add animation** → rename to "walk"
   - Click frames 8, 9, 10, 11 (second row)
   - Speed: 100, Loop: Yes
6. **Test**: Click Play ▶ - character animates!
7. **Add Movement**: Add "Platform Character" behavior
8. **Test Again**: Press arrow keys - character walks with animation!

## Advanced: Multiple Entities

You can have many entities with different animations:

1. **Player**: With walk/idle/jump animations
2. **Enemy 1**: With patrol/attack animations  
3. **Enemy 2**: With different sprite sheet entirely
4. All animate independently!

## Next Steps

Once animations work, you can:
- **Trigger animations from Events**: "When player jumps → play 'jump' animation"
- **Add more behaviors**: Combine with Health, Patrol, etc.
- **Create more animations**: Add attack, hurt, death sequences
- **Optimize**: Animations use the same texture in GPU memory (efficient!)
