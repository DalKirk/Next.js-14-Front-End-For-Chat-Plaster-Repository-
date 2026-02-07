'use client';

import Matter from 'matter-js';

/**
 * PhysicsSystem - Matter.js physics wrapper for PixiJS games
 * 
 * Features:
 * - Rigid body physics with gravity
 * - Collision detection with events
 * - Static and dynamic bodies
 * - Body properties: mass, friction, restitution
 * - Debug wireframe rendering
 * - Pause/resume physics simulation
 */

const { Engine, World, Bodies, Body, Events, Composite, Runner, Render } = Matter;

export class PhysicsSystem {
  constructor(options = {}) {
    // Create physics engine
    this.engine = Engine.create({
      gravity: {
        x: options.gravityX ?? 0,
        y: options.gravityY ?? 1,
        scale: options.gravityScale ?? 0.001
      }
    });
    
    this.world = this.engine.world;
    
    // Physics settings
    this.pixelsPerMeter = options.pixelsPerMeter ?? 50;
    this.timeScale = options.timeScale ?? 1;
    this.paused = false;
    
    // Body tracking (maps object IDs to Matter bodies)
    this.bodies = new Map();
    this.bodyToId = new Map();
    
    // Collision callbacks
    this.collisionCallbacks = {
      start: new Map(),
      active: new Map(),
      end: new Map()
    };
    
    // Global collision handlers
    this.onCollisionStart = null;
    this.onCollisionActive = null;
    this.onCollisionEnd = null;
    
    // Set up collision events
    this.setupCollisionEvents();
    
    // Debug render (optional)
    this.debugRender = null;
    this.debugEnabled = options.debug ?? false;
  }

  /**
   * Set up collision event listeners
   */
  setupCollisionEvents() {
    Events.on(this.engine, 'collisionStart', (event) => {
      if (this.paused) return;
      
      event.pairs.forEach(pair => {
        const idA = this.bodyToId.get(pair.bodyA);
        const idB = this.bodyToId.get(pair.bodyB);
        
        if (idA && idB) {
          // Call specific callbacks
          const callbackA = this.collisionCallbacks.start.get(idA);
          const callbackB = this.collisionCallbacks.start.get(idB);
          
          if (callbackA) callbackA(idB, pair);
          if (callbackB) callbackB(idA, pair);
          
          // Call global handler
          if (this.onCollisionStart) {
            this.onCollisionStart(idA, idB, pair);
          }
        }
      });
    });

    Events.on(this.engine, 'collisionActive', (event) => {
      if (this.paused) return;
      
      event.pairs.forEach(pair => {
        const idA = this.bodyToId.get(pair.bodyA);
        const idB = this.bodyToId.get(pair.bodyB);
        
        if (idA && idB) {
          const callbackA = this.collisionCallbacks.active.get(idA);
          const callbackB = this.collisionCallbacks.active.get(idB);
          
          if (callbackA) callbackA(idB, pair);
          if (callbackB) callbackB(idA, pair);
          
          if (this.onCollisionActive) {
            this.onCollisionActive(idA, idB, pair);
          }
        }
      });
    });

    Events.on(this.engine, 'collisionEnd', (event) => {
      if (this.paused) return;
      
      event.pairs.forEach(pair => {
        const idA = this.bodyToId.get(pair.bodyA);
        const idB = this.bodyToId.get(pair.bodyB);
        
        if (idA && idB) {
          const callbackA = this.collisionCallbacks.end.get(idA);
          const callbackB = this.collisionCallbacks.end.get(idB);
          
          if (callbackA) callbackA(idB, pair);
          if (callbackB) callbackB(idA, pair);
          
          if (this.onCollisionEnd) {
            this.onCollisionEnd(idA, idB, pair);
          }
        }
      });
    });
  }

  /**
   * Create a rectangular body
   */
  createRect(id, x, y, width, height, options = {}) {
    const body = Bodies.rectangle(
      x + width / 2,  // Matter.js uses center coordinates
      y + height / 2,
      width,
      height,
      {
        isStatic: options.isStatic ?? false,
        isSensor: options.isSensor ?? false,
        friction: options.friction ?? 0.1,
        frictionAir: options.frictionAir ?? 0.01,
        restitution: options.restitution ?? 0.3,
        density: options.density ?? 0.001,
        label: options.label ?? id,
        collisionFilter: {
          category: options.category ?? 0x0001,
          mask: options.mask ?? 0xFFFF,
          group: options.group ?? 0
        }
      }
    );
    
    this.addBody(id, body);
    return body;
  }

  /**
   * Create a circular body
   */
  createCircle(id, x, y, radius, options = {}) {
    const body = Bodies.circle(
      x,
      y,
      radius,
      {
        isStatic: options.isStatic ?? false,
        isSensor: options.isSensor ?? false,
        friction: options.friction ?? 0.1,
        frictionAir: options.frictionAir ?? 0.01,
        restitution: options.restitution ?? 0.3,
        density: options.density ?? 0.001,
        label: options.label ?? id,
        collisionFilter: {
          category: options.category ?? 0x0001,
          mask: options.mask ?? 0xFFFF,
          group: options.group ?? 0
        }
      }
    );
    
    this.addBody(id, body);
    return body;
  }

  /**
   * Create a polygon body
   */
  createPolygon(id, x, y, sides, radius, options = {}) {
    const body = Bodies.polygon(
      x,
      y,
      sides,
      radius,
      {
        isStatic: options.isStatic ?? false,
        isSensor: options.isSensor ?? false,
        friction: options.friction ?? 0.1,
        frictionAir: options.frictionAir ?? 0.01,
        restitution: options.restitution ?? 0.3,
        density: options.density ?? 0.001,
        label: options.label ?? id,
        collisionFilter: {
          category: options.category ?? 0x0001,
          mask: options.mask ?? 0xFFFF,
          group: options.group ?? 0
        }
      }
    );
    
    this.addBody(id, body);
    return body;
  }

  /**
   * Create static ground/wall
   */
  createStatic(id, x, y, width, height, options = {}) {
    return this.createRect(id, x, y, width, height, { ...options, isStatic: true });
  }

  /**
   * Add a body to the world
   */
  addBody(id, body) {
    if (this.bodies.has(id)) {
      this.removeBody(id);
    }
    
    this.bodies.set(id, body);
    this.bodyToId.set(body, id);
    World.add(this.world, body);
  }

  /**
   * Remove a body from the world
   */
  removeBody(id) {
    const body = this.bodies.get(id);
    if (body) {
      World.remove(this.world, body);
      this.bodyToId.delete(body);
      this.bodies.delete(id);
      
      // Clean up callbacks
      this.collisionCallbacks.start.delete(id);
      this.collisionCallbacks.active.delete(id);
      this.collisionCallbacks.end.delete(id);
    }
  }

  /**
   * Get body by ID
   */
  getBody(id) {
    return this.bodies.get(id);
  }

  /**
   * Set body position
   */
  setPosition(id, x, y) {
    const body = this.bodies.get(id);
    if (body) {
      Body.setPosition(body, { x, y });
    }
  }

  /**
   * Set body velocity
   */
  setVelocity(id, vx, vy) {
    const body = this.bodies.get(id);
    if (body) {
      Body.setVelocity(body, { x: vx, y: vy });
    }
  }

  /**
   * Apply force to body
   */
  applyForce(id, forceX, forceY, pointX = null, pointY = null) {
    const body = this.bodies.get(id);
    if (body) {
      const point = pointX !== null && pointY !== null
        ? { x: pointX, y: pointY }
        : body.position;
      Body.applyForce(body, point, { x: forceX, y: forceY });
    }
  }

  /**
   * Apply impulse (immediate velocity change)
   */
  applyImpulse(id, impulseX, impulseY) {
    const body = this.bodies.get(id);
    if (body) {
      const velocity = body.velocity;
      Body.setVelocity(body, {
        x: velocity.x + impulseX,
        y: velocity.y + impulseY
      });
    }
  }

  /**
   * Set body rotation (in radians)
   */
  setAngle(id, angle) {
    const body = this.bodies.get(id);
    if (body) {
      Body.setAngle(body, angle);
    }
  }

  /**
   * Set angular velocity
   */
  setAngularVelocity(id, velocity) {
    const body = this.bodies.get(id);
    if (body) {
      Body.setAngularVelocity(body, velocity);
    }
  }

  /**
   * Set body static/dynamic
   */
  setStatic(id, isStatic) {
    const body = this.bodies.get(id);
    if (body) {
      Body.setStatic(body, isStatic);
    }
  }

  /**
   * Register collision callback for specific body
   */
  onCollision(id, type, callback) {
    if (this.collisionCallbacks[type]) {
      this.collisionCallbacks[type].set(id, callback);
    }
  }

  /**
   * Remove collision callback
   */
  offCollision(id, type) {
    if (this.collisionCallbacks[type]) {
      this.collisionCallbacks[type].delete(id);
    }
  }

  /**
   * Set gravity
   */
  setGravity(x, y, scale = 0.001) {
    this.engine.gravity.x = x;
    this.engine.gravity.y = y;
    this.engine.gravity.scale = scale;
  }

  /**
   * Set time scale (slow motion / fast forward)
   */
  setTimeScale(scale) {
    this.timeScale = scale;
    this.engine.timing.timeScale = scale;
  }

  /**
   * Pause physics simulation
   */
  pause() {
    this.paused = true;
  }

  /**
   * Resume physics simulation
   */
  resume() {
    this.paused = false;
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  /**
   * Update physics (call each frame)
   * @param {number} delta - Delta time in milliseconds
   */
  update(delta = 16.67) {
    if (this.paused) return;
    
    // Cap delta to prevent physics explosion on lag spikes
    const maxDelta = 50;
    const cappedDelta = Math.min(delta, maxDelta);
    
    Engine.update(this.engine, cappedDelta * this.timeScale);
  }

  /**
   * Sync PixiJS sprites with physics bodies
   * @param {Map|Object} sprites - Map or object of sprites keyed by ID
   */
  syncSprites(sprites) {
    if (this.paused) return;
    
    this.bodies.forEach((body, id) => {
      const sprite = sprites instanceof Map ? sprites.get(id) : sprites[id];
      if (sprite && !body.isStatic) {
        // Update position (convert from center to top-left for PixiJS)
        sprite.x = body.position.x;
        sprite.y = body.position.y;
        
        // Update rotation
        sprite.rotation = body.angle;
      }
    });
  }

  /**
   * Get body state (for saving/serialization)
   */
  getBodyState(id) {
    const body = this.bodies.get(id);
    if (!body) return null;
    
    return {
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
      velocityX: body.velocity.x,
      velocityY: body.velocity.y,
      angularVelocity: body.angularVelocity,
      isStatic: body.isStatic
    };
  }

  /**
   * Restore body state
   */
  setBodyState(id, state) {
    const body = this.bodies.get(id);
    if (!body || !state) return;
    
    Body.setPosition(body, { x: state.x, y: state.y });
    Body.setAngle(body, state.angle);
    Body.setVelocity(body, { x: state.velocityX, y: state.velocityY });
    Body.setAngularVelocity(body, state.angularVelocity);
    Body.setStatic(body, state.isStatic);
  }

  /**
   * Ray cast to find bodies along a line
   */
  raycast(startX, startY, endX, endY) {
    const bodies = Composite.allBodies(this.world);
    const collisions = Matter.Query.ray(bodies, { x: startX, y: startY }, { x: endX, y: endY });
    
    return collisions.map(collision => ({
      id: this.bodyToId.get(collision.body),
      body: collision.body,
      point: collision.point
    })).filter(c => c.id);
  }

  /**
   * Query bodies in a region
   */
  queryRegion(x, y, width, height) {
    const bounds = {
      min: { x, y },
      max: { x: x + width, y: y + height }
    };
    
    const bodies = Composite.allBodies(this.world);
    const found = Matter.Query.region(bodies, bounds);
    
    return found.map(body => this.bodyToId.get(body)).filter(Boolean);
  }

  /**
   * Check if point is inside any body
   */
  queryPoint(x, y) {
    const bodies = Composite.allBodies(this.world);
    const found = Matter.Query.point(bodies, { x, y });
    
    return found.map(body => this.bodyToId.get(body)).filter(Boolean);
  }

  /**
   * Clear all bodies
   */
  clear() {
    World.clear(this.world, false);
    this.bodies.clear();
    this.bodyToId.clear();
    this.collisionCallbacks.start.clear();
    this.collisionCallbacks.active.clear();
    this.collisionCallbacks.end.clear();
  }

  /**
   * Destroy physics system
   */
  destroy() {
    this.clear();
    Events.off(this.engine);
    Engine.clear(this.engine);
    
    if (this.debugRender) {
      Render.stop(this.debugRender);
      this.debugRender.canvas.remove();
      this.debugRender = null;
    }
  }

  /**
   * Create debug renderer (overlays on canvas)
   */
  createDebugRenderer(container, width, height) {
    if (this.debugRender) {
      Render.stop(this.debugRender);
      this.debugRender.canvas.remove();
    }
    
    this.debugRender = Render.create({
      element: container,
      engine: this.engine,
      options: {
        width,
        height,
        wireframes: true,
        background: 'transparent',
        wireframeBackground: 'transparent',
        showAngleIndicator: true,
        showCollisions: true,
        showVelocity: true
      }
    });
    
    // Make canvas transparent overlay
    this.debugRender.canvas.style.position = 'absolute';
    this.debugRender.canvas.style.top = '0';
    this.debugRender.canvas.style.left = '0';
    this.debugRender.canvas.style.pointerEvents = 'none';
    this.debugRender.canvas.style.zIndex = '1000';
    
    if (this.debugEnabled) {
      Render.run(this.debugRender);
    }
    
    return this.debugRender;
  }

  /**
   * Toggle debug renderer
   */
  toggleDebug() {
    this.debugEnabled = !this.debugEnabled;
    
    if (this.debugRender) {
      if (this.debugEnabled) {
        Render.run(this.debugRender);
      } else {
        Render.stop(this.debugRender);
      }
    }
    
    return this.debugEnabled;
  }

  /**
   * Get all body IDs
   */
  getAllBodyIds() {
    return Array.from(this.bodies.keys());
  }

  /**
   * Check if body exists
   */
  hasBody(id) {
    return this.bodies.has(id);
  }
}

/**
 * Collision categories for filtering
 */
export const CollisionCategory = {
  DEFAULT: 0x0001,
  PLAYER: 0x0002,
  ENEMY: 0x0004,
  PROJECTILE: 0x0008,
  PLATFORM: 0x0010,
  TRIGGER: 0x0020,
  PICKUP: 0x0040,
  ALL: 0xFFFF
};

/**
 * React hook for PhysicsSystem
 */
export function usePhysicsSystem(options = {}) {
  const physicsRef = React.useRef(null);
  
  React.useEffect(() => {
    physicsRef.current = new PhysicsSystem(options);
    
    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroy();
        physicsRef.current = null;
      }
    };
  }, []);
  
  return physicsRef;
}

export default PhysicsSystem;
