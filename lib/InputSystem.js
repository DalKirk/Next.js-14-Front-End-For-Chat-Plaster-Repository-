/**
 * InputSystem - Comprehensive input handling for game engine
 * 
 * Features:
 * - Keyboard input with key states (pressed, held, released)
 * - Mouse tracking (position, buttons, wheel)
 * - Gamepad support with button mapping
 * - Touch input for mobile
 * - Named action bindings (rebindable)
 * - Input buffering for responsive controls
 */

// Default key bindings
export const DefaultBindings = {
  // Movement
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  
  // Actions
  jump: ['Space'],
  attack: ['KeyJ', 'MouseLeft'],
  interact: ['KeyE', 'KeyF'],
  dash: ['ShiftLeft', 'ShiftRight'],
  
  // UI
  pause: ['Escape'],
  inventory: ['KeyI', 'Tab'],
  confirm: ['Enter', 'Space'],
  cancel: ['Escape', 'Backspace'],
  
  // Debug
  debug: ['Backquote'],
};

// Gamepad button mapping (Xbox layout)
export const GamepadButtons = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  L3: 10,
  R3: 11,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
};

// Gamepad axis mapping
export const GamepadAxes = {
  LEFT_X: 0,
  LEFT_Y: 1,
  RIGHT_X: 2,
  RIGHT_Y: 3,
};

export class InputSystem {
  constructor(options = {}) {
    // Target element for input events
    this.target = options.target || (typeof window !== 'undefined' ? window : null);
    this.canvas = options.canvas || null;
    
    // Key states
    this.keys = new Map(); // code -> { pressed, held, released, timestamp }
    this.previousKeys = new Map();
    
    // Mouse state
    this.mouse = {
      x: 0,
      y: 0,
      worldX: 0,
      worldY: 0,
      deltaX: 0,
      deltaY: 0,
      buttons: new Set(),
      previousButtons: new Set(),
      wheel: 0,
      isOverCanvas: false,
    };
    
    // Touch state
    this.touches = new Map(); // id -> { x, y, startX, startY, timestamp }
    this.gestures = {
      pinchScale: 1,
      pinchDelta: 0,
      swipeDirection: null,
    };
    
    // Gamepad state
    this.gamepads = new Map(); // index -> gamepad state
    this.gamepadDeadzone = options.deadzone ?? 0.15;
    
    // Action bindings
    this.bindings = { ...DefaultBindings, ...options.bindings };
    this.actionStates = new Map(); // action -> { pressed, held, released, value }
    
    // Input buffer for combo detection
    this.inputBuffer = [];
    this.bufferDuration = options.bufferDuration ?? 500; // ms
    this.maxBufferSize = options.maxBufferSize ?? 20;
    
    // Callbacks
    this.onAction = options.onAction || null;
    this.onKeyDown = options.onKeyDown || null;
    this.onKeyUp = options.onKeyUp || null;
    this.onMouseMove = options.onMouseMove || null;
    this.onMouseDown = options.onMouseDown || null;
    this.onMouseUp = options.onMouseUp || null;
    this.onGamepadConnect = options.onGamepadConnect || null;
    this.onGamepadDisconnect = options.onGamepadDisconnect || null;
    
    // Camera reference for world coordinates
    this.camera = options.camera || null;
    
    // Bound event handlers
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._handleWheel = this._handleWheel.bind(this);
    this._handleContextMenu = this._handleContextMenu.bind(this);
    this._handleTouchStart = this._handleTouchStart.bind(this);
    this._handleTouchMove = this._handleTouchMove.bind(this);
    this._handleTouchEnd = this._handleTouchEnd.bind(this);
    this._handleGamepadConnected = this._handleGamepadConnected.bind(this);
    this._handleGamepadDisconnected = this._handleGamepadDisconnected.bind(this);
    this._handleBlur = this._handleBlur.bind(this);
    
    // Initialize if target exists
    if (this.target) {
      this._attachListeners();
    }
    
    console.log('[Input] InputSystem initialized');
  }

  /**
   * Attach event listeners
   */
  _attachListeners() {
    const target = this.target;
    const canvas = this.canvas || target;
    
    // Keyboard
    target.addEventListener('keydown', this._handleKeyDown);
    target.addEventListener('keyup', this._handleKeyUp);
    
    // Mouse
    canvas.addEventListener('mousemove', this._handleMouseMove);
    canvas.addEventListener('mousedown', this._handleMouseDown);
    canvas.addEventListener('mouseup', this._handleMouseUp);
    canvas.addEventListener('wheel', this._handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', this._handleContextMenu);
    canvas.addEventListener('mouseenter', () => { this.mouse.isOverCanvas = true; });
    canvas.addEventListener('mouseleave', () => { this.mouse.isOverCanvas = false; });
    
    // Touch
    canvas.addEventListener('touchstart', this._handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this._handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', this._handleTouchEnd);
    canvas.addEventListener('touchcancel', this._handleTouchEnd);
    
    // Gamepad
    target.addEventListener('gamepadconnected', this._handleGamepadConnected);
    target.addEventListener('gamepaddisconnected', this._handleGamepadDisconnected);
    
    // Reset on blur
    target.addEventListener('blur', this._handleBlur);
  }

  /**
   * Detach event listeners
   */
  _detachListeners() {
    const target = this.target;
    const canvas = this.canvas || target;
    
    target.removeEventListener('keydown', this._handleKeyDown);
    target.removeEventListener('keyup', this._handleKeyUp);
    canvas.removeEventListener('mousemove', this._handleMouseMove);
    canvas.removeEventListener('mousedown', this._handleMouseDown);
    canvas.removeEventListener('mouseup', this._handleMouseUp);
    canvas.removeEventListener('wheel', this._handleWheel);
    canvas.removeEventListener('contextmenu', this._handleContextMenu);
    canvas.removeEventListener('touchstart', this._handleTouchStart);
    canvas.removeEventListener('touchmove', this._handleTouchMove);
    canvas.removeEventListener('touchend', this._handleTouchEnd);
    canvas.removeEventListener('touchcancel', this._handleTouchEnd);
    target.removeEventListener('gamepadconnected', this._handleGamepadConnected);
    target.removeEventListener('gamepaddisconnected', this._handleGamepadDisconnected);
    target.removeEventListener('blur', this._handleBlur);
  }

  // ============================================
  // KEYBOARD HANDLERS
  // ============================================

  _handleKeyDown(e) {
    const code = e.code;
    
    // Prevent default for game keys (but not browser shortcuts)
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const isGameKey = Object.values(this.bindings).flat().includes(code);
      if (isGameKey) {
        e.preventDefault();
      }
    }
    
    // Update key state
    if (!this.keys.has(code) || !this.keys.get(code).held) {
      this.keys.set(code, {
        pressed: true,
        held: true,
        released: false,
        timestamp: performance.now(),
      });
      
      // Add to input buffer
      this._addToBuffer({ type: 'key', code, action: 'down' });
      
      // Callback
      this.onKeyDown?.(code, e);
    }
  }

  _handleKeyUp(e) {
    const code = e.code;
    
    if (this.keys.has(code)) {
      const state = this.keys.get(code);
      this.keys.set(code, {
        ...state,
        pressed: false,
        held: false,
        released: true,
      });
      
      // Add to input buffer
      this._addToBuffer({ type: 'key', code, action: 'up' });
      
      // Callback
      this.onKeyUp?.(code, e);
    }
  }

  // ============================================
  // MOUSE HANDLERS
  // ============================================

  _handleMouseMove(e) {
    const rect = (this.canvas || e.target).getBoundingClientRect?.() || { left: 0, top: 0 };
    const prevX = this.mouse.x;
    const prevY = this.mouse.y;
    
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.mouse.deltaX = this.mouse.x - prevX;
    this.mouse.deltaY = this.mouse.y - prevY;
    
    // Calculate world coordinates if camera is available
    if (this.camera) {
      const worldPos = this.camera.screenToWorld(this.mouse.x, this.mouse.y);
      this.mouse.worldX = worldPos.x;
      this.mouse.worldY = worldPos.y;
    } else {
      this.mouse.worldX = this.mouse.x;
      this.mouse.worldY = this.mouse.y;
    }
    
    this.onMouseMove?.(this.mouse, e);
  }

  _handleMouseDown(e) {
    const button = this._getMouseButtonName(e.button);
    this.mouse.buttons.add(button);
    
    // Add to input buffer
    this._addToBuffer({ type: 'mouse', button, action: 'down', x: this.mouse.x, y: this.mouse.y });
    
    this.onMouseDown?.(button, this.mouse, e);
  }

  _handleMouseUp(e) {
    const button = this._getMouseButtonName(e.button);
    this.mouse.buttons.delete(button);
    
    // Add to input buffer
    this._addToBuffer({ type: 'mouse', button, action: 'up', x: this.mouse.x, y: this.mouse.y });
    
    this.onMouseUp?.(button, this.mouse, e);
  }

  _handleWheel(e) {
    e.preventDefault();
    this.mouse.wheel = e.deltaY;
    
    this._addToBuffer({ type: 'wheel', delta: e.deltaY });
  }

  _handleContextMenu(e) {
    e.preventDefault();
  }

  _getMouseButtonName(button) {
    switch (button) {
      case 0: return 'MouseLeft';
      case 1: return 'MouseMiddle';
      case 2: return 'MouseRight';
      case 3: return 'MouseBack';
      case 4: return 'MouseForward';
      default: return `Mouse${button}`;
    }
  }

  // ============================================
  // TOUCH HANDLERS
  // ============================================

  _handleTouchStart(e) {
    e.preventDefault();
    const rect = (this.canvas || e.target).getBoundingClientRect?.() || { left: 0, top: 0 };
    
    for (const touch of e.changedTouches) {
      this.touches.set(touch.identifier, {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
        startX: touch.clientX - rect.left,
        startY: touch.clientY - rect.top,
        timestamp: performance.now(),
      });
    }
    
    // Detect pinch gesture
    if (this.touches.size === 2) {
      const [t1, t2] = [...this.touches.values()];
      this.gestures.pinchScale = this._getDistance(t1, t2);
    }
  }

  _handleTouchMove(e) {
    e.preventDefault();
    const rect = (this.canvas || e.target).getBoundingClientRect?.() || { left: 0, top: 0 };
    
    for (const touch of e.changedTouches) {
      if (this.touches.has(touch.identifier)) {
        const state = this.touches.get(touch.identifier);
        state.x = touch.clientX - rect.left;
        state.y = touch.clientY - rect.top;
      }
    }
    
    // Update pinch gesture
    if (this.touches.size === 2) {
      const [t1, t2] = [...this.touches.values()];
      const newScale = this._getDistance(t1, t2);
      this.gestures.pinchDelta = newScale / this.gestures.pinchScale;
      this.gestures.pinchScale = newScale;
    }
  }

  _handleTouchEnd(e) {
    for (const touch of e.changedTouches) {
      if (this.touches.has(touch.identifier)) {
        const state = this.touches.get(touch.identifier);
        const dx = state.x - state.startX;
        const dy = state.y - state.startY;
        const duration = performance.now() - state.timestamp;
        
        // Detect swipe
        if (duration < 300 && Math.abs(dx) + Math.abs(dy) > 50) {
          if (Math.abs(dx) > Math.abs(dy)) {
            this.gestures.swipeDirection = dx > 0 ? 'right' : 'left';
          } else {
            this.gestures.swipeDirection = dy > 0 ? 'down' : 'up';
          }
          
          this._addToBuffer({ type: 'swipe', direction: this.gestures.swipeDirection });
        }
        
        this.touches.delete(touch.identifier);
      }
    }
    
    // Reset pinch
    if (this.touches.size < 2) {
      this.gestures.pinchDelta = 0;
    }
  }

  _getDistance(t1, t2) {
    const dx = t2.x - t1.x;
    const dy = t2.y - t1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ============================================
  // GAMEPAD HANDLERS
  // ============================================

  _handleGamepadConnected(e) {
    console.log(`[Input] Gamepad connected: ${e.gamepad.id}`);
    this.onGamepadConnect?.(e.gamepad);
  }

  _handleGamepadDisconnected(e) {
    console.log(`[Input] Gamepad disconnected: ${e.gamepad.id}`);
    this.gamepads.delete(e.gamepad.index);
    this.onGamepadDisconnect?.(e.gamepad);
  }

  /**
   * Poll gamepads (call in update loop)
   */
  pollGamepads() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    
    const gamepads = navigator.getGamepads();
    
    for (const gp of gamepads) {
      if (!gp) continue;
      
      const previous = this.gamepads.get(gp.index) || { buttons: [], axes: [] };
      
      const state = {
        id: gp.id,
        buttons: gp.buttons.map((btn, i) => ({
          pressed: btn.pressed,
          justPressed: btn.pressed && !previous.buttons[i]?.pressed,
          justReleased: !btn.pressed && previous.buttons[i]?.pressed,
          value: btn.value,
        })),
        axes: gp.axes.map((value, i) => ({
          value: Math.abs(value) > this.gamepadDeadzone ? value : 0,
          raw: value,
        })),
        // Convenience getters
        leftStick: {
          x: Math.abs(gp.axes[0]) > this.gamepadDeadzone ? gp.axes[0] : 0,
          y: Math.abs(gp.axes[1]) > this.gamepadDeadzone ? gp.axes[1] : 0,
        },
        rightStick: {
          x: Math.abs(gp.axes[2]) > this.gamepadDeadzone ? gp.axes[2] : 0,
          y: Math.abs(gp.axes[3]) > this.gamepadDeadzone ? gp.axes[3] : 0,
        },
      };
      
      this.gamepads.set(gp.index, state);
    }
  }

  /**
   * Get gamepad state
   */
  getGamepad(index = 0) {
    return this.gamepads.get(index) || null;
  }

  /**
   * Check if gamepad button is pressed
   */
  isGamepadButtonDown(button, gamepadIndex = 0) {
    const gp = this.gamepads.get(gamepadIndex);
    return gp?.buttons[button]?.pressed ?? false;
  }

  /**
   * Check if gamepad button was just pressed
   */
  isGamepadButtonPressed(button, gamepadIndex = 0) {
    const gp = this.gamepads.get(gamepadIndex);
    return gp?.buttons[button]?.justPressed ?? false;
  }

  // ============================================
  // BLUR HANDLER
  // ============================================

  _handleBlur() {
    // Clear all key states when window loses focus
    this.keys.forEach((state, code) => {
      if (state.held) {
        this.keys.set(code, { ...state, held: false, released: true });
      }
    });
    this.mouse.buttons.clear();
  }

  // ============================================
  // INPUT BUFFER
  // ============================================

  _addToBuffer(input) {
    const now = performance.now();
    
    // Remove old inputs
    this.inputBuffer = this.inputBuffer.filter(
      item => now - item.timestamp < this.bufferDuration
    );
    
    // Add new input
    this.inputBuffer.push({ ...input, timestamp: now });
    
    // Limit buffer size
    if (this.inputBuffer.length > this.maxBufferSize) {
      this.inputBuffer.shift();
    }
  }

  /**
   * Check for input sequence (combo detection)
   */
  checkSequence(sequence, maxDuration = 500) {
    if (sequence.length > this.inputBuffer.length) return false;
    
    const now = performance.now();
    const relevantInputs = this.inputBuffer.filter(
      item => now - item.timestamp < maxDuration && item.action === 'down'
    );
    
    if (relevantInputs.length < sequence.length) return false;
    
    // Check if sequence matches recent inputs
    const recentCodes = relevantInputs.slice(-sequence.length).map(item => item.code || item.button);
    return sequence.every((code, i) => recentCodes[i] === code);
  }

  // ============================================
  // KEY STATE QUERIES
  // ============================================

  /**
   * Check if key is currently held down
   */
  isKeyDown(code) {
    return this.keys.get(code)?.held ?? false;
  }

  /**
   * Check if key was just pressed this frame
   */
  isKeyPressed(code) {
    return this.keys.get(code)?.pressed ?? false;
  }

  /**
   * Check if key was just released this frame
   */
  isKeyReleased(code) {
    return this.keys.get(code)?.released ?? false;
  }

  /**
   * Check if any of the keys are down
   */
  isAnyKeyDown(codes) {
    return codes.some(code => this.isKeyDown(code));
  }

  /**
   * Check if any of the keys were pressed
   */
  isAnyKeyPressed(codes) {
    return codes.some(code => this.isKeyPressed(code));
  }

  // ============================================
  // MOUSE STATE QUERIES
  // ============================================

  /**
   * Check if mouse button is down
   */
  isMouseDown(button = 'MouseLeft') {
    return this.mouse.buttons.has(button);
  }

  /**
   * Check if mouse button was just pressed
   */
  isMousePressed(button = 'MouseLeft') {
    return this.mouse.buttons.has(button) && !this.mouse.previousButtons.has(button);
  }

  /**
   * Check if mouse button was just released
   */
  isMouseReleased(button = 'MouseLeft') {
    return !this.mouse.buttons.has(button) && this.mouse.previousButtons.has(button);
  }

  /**
   * Get mouse position
   */
  getMousePosition() {
    return { x: this.mouse.x, y: this.mouse.y };
  }

  /**
   * Get mouse world position
   */
  getMouseWorldPosition() {
    return { x: this.mouse.worldX, y: this.mouse.worldY };
  }

  /**
   * Get mouse wheel delta
   */
  getMouseWheel() {
    return this.mouse.wheel;
  }

  // ============================================
  // ACTION BINDINGS
  // ============================================

  /**
   * Check if an action is active (any bound key is down)
   */
  isActionDown(action) {
    const bindings = this.bindings[action];
    if (!bindings) return false;
    
    return bindings.some(code => {
      if (code.startsWith('Mouse')) {
        return this.mouse.buttons.has(code);
      }
      return this.isKeyDown(code);
    });
  }

  /**
   * Check if an action was just pressed
   */
  isActionPressed(action) {
    const bindings = this.bindings[action];
    if (!bindings) return false;
    
    return bindings.some(code => {
      if (code.startsWith('Mouse')) {
        return this.isMousePressed(code);
      }
      return this.isKeyPressed(code);
    });
  }

  /**
   * Check if an action was just released
   */
  isActionReleased(action) {
    const bindings = this.bindings[action];
    if (!bindings) return false;
    
    return bindings.some(code => {
      if (code.startsWith('Mouse')) {
        return this.isMouseReleased(code);
      }
      return this.isKeyReleased(code);
    });
  }

  /**
   * Get movement axis values (-1 to 1)
   */
  getAxis(negative, positive) {
    let value = 0;
    if (this.isActionDown(negative)) value -= 1;
    if (this.isActionDown(positive)) value += 1;
    
    // Also check gamepad
    const gp = this.getGamepad();
    if (gp) {
      if (negative === 'moveLeft' || positive === 'moveRight') {
        value = Math.max(-1, Math.min(1, value + gp.leftStick.x));
      }
      if (negative === 'moveUp' || positive === 'moveDown') {
        value = Math.max(-1, Math.min(1, value + gp.leftStick.y));
      }
    }
    
    return value;
  }

  /**
   * Get horizontal movement (-1, 0, or 1)
   */
  getHorizontal() {
    return this.getAxis('moveLeft', 'moveRight');
  }

  /**
   * Get vertical movement (-1, 0, or 1)
   */
  getVertical() {
    return this.getAxis('moveUp', 'moveDown');
  }

  /**
   * Rebind an action to new keys
   */
  rebind(action, keys) {
    this.bindings[action] = Array.isArray(keys) ? keys : [keys];
  }

  /**
   * Add a key to an action's bindings
   */
  addBinding(action, key) {
    if (!this.bindings[action]) {
      this.bindings[action] = [];
    }
    if (!this.bindings[action].includes(key)) {
      this.bindings[action].push(key);
    }
  }

  /**
   * Remove a key from an action's bindings
   */
  removeBinding(action, key) {
    if (this.bindings[action]) {
      this.bindings[action] = this.bindings[action].filter(k => k !== key);
    }
  }

  /**
   * Get all bindings for an action
   */
  getBindings(action) {
    return this.bindings[action] || [];
  }

  /**
   * Export bindings for saving
   */
  exportBindings() {
    return JSON.stringify(this.bindings);
  }

  /**
   * Import bindings from saved data
   */
  importBindings(json) {
    try {
      const bindings = JSON.parse(json);
      this.bindings = { ...DefaultBindings, ...bindings };
    } catch (e) {
      console.error('[Input] Failed to import bindings:', e);
    }
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  /**
   * Call this at the end of each frame to reset per-frame states
   */
  update() {
    // Poll gamepads
    this.pollGamepads();
    
    // Reset per-frame key states
    this.keys.forEach((state, code) => {
      if (state.pressed) {
        this.keys.set(code, { ...state, pressed: false });
      }
      if (state.released) {
        this.keys.delete(code);
      }
    });
    
    // Reset mouse per-frame states
    this.mouse.previousButtons = new Set(this.mouse.buttons);
    this.mouse.wheel = 0;
    this.mouse.deltaX = 0;
    this.mouse.deltaY = 0;
    
    // Reset gesture states
    this.gestures.swipeDirection = null;
  }

  // ============================================
  // UTILITY
  // ============================================

  /**
   * Set camera reference for world coordinate conversion
   */
  setCamera(camera) {
    this.camera = camera;
  }

  /**
   * Set canvas element for mouse events
   */
  setCanvas(canvas) {
    if (this.canvas) {
      // Remove old listeners
      this._detachListeners();
    }
    this.canvas = canvas;
    if (this.target) {
      this._attachListeners();
    }
  }

  /**
   * Destroy the input system
   */
  destroy() {
    this._detachListeners();
    this.keys.clear();
    this.mouse.buttons.clear();
    this.touches.clear();
    this.gamepads.clear();
    this.inputBuffer = [];
    console.log('[Input] InputSystem destroyed');
  }
}

/**
 * React hook for InputSystem
 */
export function useInputSystem(options = {}) {
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    inputRef.current = new InputSystem(options);
    
    return () => {
      inputRef.current?.destroy();
      inputRef.current = null;
    };
  }, []);

  return inputRef;
}

// Virtual gamepad for mobile
export class VirtualGamepad {
  constructor(container, inputSystem) {
    this.container = container;
    this.input = inputSystem;
    this.dpad = null;
    this.buttons = new Map();
    
    this._createUI();
  }

  _createUI() {
    // Create D-pad
    const dpadContainer = document.createElement('div');
    dpadContainer.className = 'virtual-dpad';
    dpadContainer.style.cssText = `
      position: absolute;
      bottom: 80px;
      left: 40px;
      width: 120px;
      height: 120px;
      opacity: 0.7;
    `;
    
    const directions = [
      { name: 'up', x: 40, y: 0, action: 'moveUp' },
      { name: 'down', x: 40, y: 80, action: 'moveDown' },
      { name: 'left', x: 0, y: 40, action: 'moveLeft' },
      { name: 'right', x: 80, y: 40, action: 'moveRight' },
    ];
    
    directions.forEach(dir => {
      const btn = document.createElement('div');
      btn.className = `dpad-${dir.name}`;
      btn.style.cssText = `
        position: absolute;
        width: 40px;
        height: 40px;
        background: rgba(255,255,255,0.3);
        border: 2px solid rgba(255,255,255,0.5);
        border-radius: 8px;
        left: ${dir.x}px;
        top: ${dir.y}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        color: white;
        user-select: none;
        touch-action: none;
      `;
      btn.textContent = { up: '▲', down: '▼', left: '◀', right: '▶' }[dir.name];
      
      // Touch events
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.style.background = 'rgba(255,255,255,0.6)';
        // Simulate key press
        this.input._handleKeyDown({ code: this.input.bindings[dir.action][0], preventDefault: () => {} });
      });
      
      btn.addEventListener('touchend', (e) => {
        btn.style.background = 'rgba(255,255,255,0.3)';
        // Simulate key release
        this.input._handleKeyUp({ code: this.input.bindings[dir.action][0] });
      });
      
      dpadContainer.appendChild(btn);
    });
    
    this.container.appendChild(dpadContainer);
    this.dpad = dpadContainer;
    
    // Create action buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      position: absolute;
      bottom: 80px;
      right: 40px;
    `;
    
    const actionButtons = [
      { name: 'A', x: 50, y: 50, action: 'jump', color: '#4ade80' },
      { name: 'B', x: 0, y: 25, action: 'attack', color: '#f87171' },
    ];
    
    actionButtons.forEach(ab => {
      const btn = document.createElement('div');
      btn.style.cssText = `
        position: absolute;
        width: 50px;
        height: 50px;
        background: ${ab.color}88;
        border: 3px solid ${ab.color};
        border-radius: 50%;
        left: ${ab.x}px;
        top: ${ab.y}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: bold;
        color: white;
        user-select: none;
        touch-action: none;
      `;
      btn.textContent = ab.name;
      
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.style.transform = 'scale(0.9)';
        this.input._handleKeyDown({ code: this.input.bindings[ab.action][0], preventDefault: () => {} });
      });
      
      btn.addEventListener('touchend', (e) => {
        btn.style.transform = 'scale(1)';
        this.input._handleKeyUp({ code: this.input.bindings[ab.action][0] });
      });
      
      buttonsContainer.appendChild(btn);
      this.buttons.set(ab.name, btn);
    });
    
    this.container.appendChild(buttonsContainer);
  }

  show() {
    if (this.dpad) this.dpad.style.display = 'block';
    this.buttons.forEach(btn => btn.style.display = 'flex');
  }

  hide() {
    if (this.dpad) this.dpad.style.display = 'none';
    this.buttons.forEach(btn => btn.style.display = 'none');
  }

  destroy() {
    this.dpad?.remove();
    this.buttons.forEach(btn => btn.remove());
  }
}

export default InputSystem;
