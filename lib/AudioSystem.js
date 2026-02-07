'use client';

import { Howl, Howler } from 'howler';

/**
 * AudioSystem - Howler.js audio wrapper for games
 * 
 * Features:
 * - Sound effect playback with pooling
 * - Background music with crossfade
 * - Spatial/3D audio positioning
 * - Volume controls (master, music, SFX)
 * - Sound sprite support
 * - Preloading and caching
 */

export class AudioSystem {
  constructor(options = {}) {
    // Volume settings
    this.masterVolume = options.masterVolume ?? 1.0;
    this.musicVolume = options.musicVolume ?? 0.7;
    this.sfxVolume = options.sfxVolume ?? 1.0;
    
    // Mute states
    this.masterMuted = false;
    this.musicMuted = false;
    this.sfxMuted = false;
    
    // Sound cache
    this.sounds = new Map();
    this.music = new Map();
    
    // Currently playing
    this.currentMusic = null;
    this.currentMusicId = null;
    this.playingSounds = new Set();
    
    // Spatial audio settings
    this.listenerPosition = { x: 0, y: 0 };
    this.spatialScale = options.spatialScale ?? 100; // pixels per unit
    
    // Crossfade settings
    this.crossfadeDuration = options.crossfadeDuration ?? 1000; // ms
    
    // Apply initial master volume
    Howler.volume(this.masterVolume);
  }

  /**
   * Load a sound effect
   */
  loadSound(id, src, options = {}) {
    if (this.sounds.has(id)) {
      return this.sounds.get(id);
    }

    const sound = new Howl({
      src: Array.isArray(src) ? src : [src],
      format: options.format, // Explicitly specify format for blob URLs
      volume: (options.volume ?? 1.0) * this.sfxVolume,
      loop: options.loop ?? false,
      preload: options.preload ?? true,
      pool: options.pool ?? 5,
      sprite: options.sprite,
      html5: options.html5 ?? false, // Use Web Audio API by default
      onload: () => {
        sound._loaded = true;
        console.log(`[Audio] Loaded sound: ${id}`);
        options.onLoad?.();
      },
      onloaderror: (soundId, error) => {
        sound._loadFailed = true;
        // Only log as warning, not error - missing audio files are common during development
        console.warn(`[Audio] Sound not found: ${id} (${src})`);
        options.onError?.(error);
      },
      onend: (soundId) => {
        this.playingSounds.delete(soundId);
        options.onEnd?.(soundId);
      }
    });

    // Store original volume for unmuting
    sound._baseVolume = options.volume ?? 1.0;
    sound._loaded = false;
    sound._loadFailed = false;
    
    this.sounds.set(id, sound);
    return sound;
  }

  /**
   * Load background music
   */
  loadMusic(id, src, options = {}) {
    if (this.music.has(id)) {
      return this.music.get(id);
    }

    const music = new Howl({
      src: Array.isArray(src) ? src : [src],
      volume: (options.volume ?? 1.0) * this.musicVolume,
      loop: options.loop ?? true,
      preload: options.preload ?? true,
      html5: options.html5 ?? true, // Use HTML5 for large music files
      onload: () => {
        music._loaded = true;
        console.log(`[Audio] Loaded music: ${id}`);
        options.onLoad?.();
      },
      onloaderror: (soundId, error) => {
        music._loadFailed = true;
        console.warn(`[Audio] Music not found: ${id} (${src})`);
        options.onError?.(error);
      },
      onend: (soundId) => {
        if (!music.loop()) {
          options.onEnd?.(soundId);
        }
      }
    });

    // Store original volume
    music._baseVolume = options.volume ?? 1.0;
    music._loaded = false;
    music._loadFailed = false;
    
    this.music.set(id, music);
    return music;
  }

  /**
   * Preload multiple sounds
   */
  preloadSounds(soundList) {
    const promises = soundList.map(({ id, src, ...options }) => {
      return new Promise((resolve, reject) => {
        this.loadSound(id, src, {
          ...options,
          onLoad: () => resolve(id),
          onError: reject
        });
      });
    });
    
    return Promise.all(promises);
  }

  /**
   * Play a sound effect
   */
  play(id, options = {}) {
    const sound = this.sounds.get(id);
    if (!sound) {
      // Sound not registered - silently return
      return null;
    }

    // Don't play if sound failed to load
    if (sound._loadFailed) {
      return null;
    }

    // Apply volume
    const volume = (options.volume ?? sound._baseVolume) * this.sfxVolume;
    sound.volume(this.sfxMuted ? 0 : volume);
    
    // Apply rate/pitch
    if (options.rate) {
      sound.rate(options.rate);
    }

    // Play sprite or full sound
    const soundId = options.sprite 
      ? sound.play(options.sprite)
      : sound.play();

    this.playingSounds.add(soundId);

    // Apply spatial positioning
    if (options.x !== undefined && options.y !== undefined) {
      this.setSpatialPosition(sound, soundId, options.x, options.y);
    }

    return soundId;
  }

  /**
   * Play a sound at a specific position (spatial audio)
   */
  playAt(id, x, y, options = {}) {
    return this.play(id, { ...options, x, y });
  }

  /**
   * Stop a specific sound instance
   */
  stop(id, soundId) {
    const sound = this.sounds.get(id);
    if (sound) {
      if (soundId !== undefined) {
        sound.stop(soundId);
        this.playingSounds.delete(soundId);
      } else {
        sound.stop();
      }
    }
  }

  /**
   * Stop all sounds
   */
  stopAll() {
    this.sounds.forEach(sound => sound.stop());
    this.playingSounds.clear();
  }

  /**
   * Pause a sound
   */
  pause(id, soundId) {
    const sound = this.sounds.get(id);
    if (sound) {
      sound.pause(soundId);
    }
  }

  /**
   * Resume a paused sound
   */
  resume(id, soundId) {
    const sound = this.sounds.get(id);
    if (sound) {
      sound.play(soundId);
    }
  }

  /**
   * Play background music
   */
  playMusic(id, options = {}) {
    const music = this.music.get(id);
    if (!music) {
      console.warn(`[Audio] Music not found: ${id}`);
      return;
    }

    // Crossfade if there's already music playing
    if (this.currentMusic && options.crossfade !== false) {
      this.crossfadeMusic(music, options);
    } else {
      // Stop current music
      if (this.currentMusic) {
        this.currentMusic.stop();
      }
      
      // Start new music
      const volume = (options.volume ?? music._baseVolume) * this.musicVolume;
      music.volume(this.musicMuted ? 0 : volume);
      this.currentMusicId = music.play();
      this.currentMusic = music;
    }
  }

  /**
   * Crossfade between music tracks
   */
  crossfadeMusic(newMusic, options = {}) {
    const duration = options.crossfadeDuration ?? this.crossfadeDuration;
    const oldMusic = this.currentMusic;
    const oldMusicId = this.currentMusicId;
    
    // Start new music at 0 volume
    const targetVolume = (options.volume ?? newMusic._baseVolume) * this.musicVolume;
    newMusic.volume(0);
    const newMusicId = newMusic.play();
    
    // Fade out old, fade in new
    if (oldMusic) {
      oldMusic.fade(oldMusic.volume(), 0, duration, oldMusicId);
      setTimeout(() => {
        oldMusic.stop(oldMusicId);
      }, duration);
    }
    
    newMusic.fade(0, this.musicMuted ? 0 : targetVolume, duration, newMusicId);
    
    this.currentMusic = newMusic;
    this.currentMusicId = newMusicId;
  }

  /**
   * Stop music
   */
  stopMusic(fadeOut = true) {
    if (!this.currentMusic) return;
    
    if (fadeOut) {
      this.currentMusic.fade(this.currentMusic.volume(), 0, this.crossfadeDuration, this.currentMusicId);
      setTimeout(() => {
        if (this.currentMusic) {
          this.currentMusic.stop();
          this.currentMusic = null;
          this.currentMusicId = null;
        }
      }, this.crossfadeDuration);
    } else {
      this.currentMusic.stop();
      this.currentMusic = null;
      this.currentMusicId = null;
    }
  }

  /**
   * Pause music
   */
  pauseMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause(this.currentMusicId);
    }
  }

  /**
   * Resume music
   */
  resumeMusic() {
    if (this.currentMusic) {
      this.currentMusic.play(this.currentMusicId);
    }
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.masterVolume);
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    
    // Update currently playing music
    if (this.currentMusic && !this.musicMuted) {
      const targetVolume = this.currentMusic._baseVolume * this.musicVolume;
      this.currentMusic.volume(targetVolume, this.currentMusicId);
    }
  }

  /**
   * Set SFX volume (0-1)
   */
  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Toggle master mute
   */
  toggleMasterMute() {
    this.masterMuted = !this.masterMuted;
    Howler.mute(this.masterMuted);
    return this.masterMuted;
  }

  /**
   * Toggle music mute
   */
  toggleMusicMute() {
    this.musicMuted = !this.musicMuted;
    
    if (this.currentMusic) {
      if (this.musicMuted) {
        this.currentMusic.volume(0, this.currentMusicId);
      } else {
        const volume = this.currentMusic._baseVolume * this.musicVolume;
        this.currentMusic.volume(volume, this.currentMusicId);
      }
    }
    
    return this.musicMuted;
  }

  /**
   * Toggle SFX mute
   */
  toggleSfxMute() {
    this.sfxMuted = !this.sfxMuted;
    return this.sfxMuted;
  }

  /**
   * Set listener position for spatial audio
   */
  setListenerPosition(x, y) {
    this.listenerPosition = { x, y };
    Howler.pos(x / this.spatialScale, y / this.spatialScale, 0);
  }

  /**
   * Set spatial position for a sound
   */
  setSpatialPosition(sound, soundId, x, y) {
    const relX = (x - this.listenerPosition.x) / this.spatialScale;
    const relY = (y - this.listenerPosition.y) / this.spatialScale;
    
    sound.pos(relX, relY, 0, soundId);
    
    // Calculate volume falloff based on distance
    const distance = Math.sqrt(relX * relX + relY * relY);
    const maxDistance = 10; // units
    const falloff = Math.max(0, 1 - distance / maxDistance);
    
    const baseVolume = sound._baseVolume * this.sfxVolume;
    sound.volume(baseVolume * falloff, soundId);
  }

  /**
   * Get sound duration
   */
  getDuration(id) {
    const sound = this.sounds.get(id) || this.music.get(id);
    return sound ? sound.duration() : 0;
  }

  /**
   * Check if sound is playing
   */
  isPlaying(id, soundId) {
    const sound = this.sounds.get(id) || this.music.get(id);
    return sound ? sound.playing(soundId) : false;
  }

  /**
   * Get current playback position
   */
  getSeek(id, soundId) {
    const sound = this.sounds.get(id) || this.music.get(id);
    return sound ? sound.seek(soundId) : 0;
  }

  /**
   * Seek to position
   */
  seek(id, position, soundId) {
    const sound = this.sounds.get(id) || this.music.get(id);
    if (sound) {
      sound.seek(position, soundId);
    }
  }

  /**
   * Unload a sound
   */
  unload(id) {
    const sound = this.sounds.get(id);
    if (sound) {
      sound.unload();
      this.sounds.delete(id);
    }
    
    const music = this.music.get(id);
    if (music) {
      music.unload();
      this.music.delete(id);
    }
  }

  /**
   * Unload all sounds
   */
  unloadAll() {
    this.stopAll();
    this.stopMusic(false);
    
    this.sounds.forEach(sound => sound.unload());
    this.music.forEach(music => music.unload());
    
    this.sounds.clear();
    this.music.clear();
  }

  /**
   * Get volume state
   */
  getVolumeState() {
    return {
      master: this.masterVolume,
      music: this.musicVolume,
      sfx: this.sfxVolume,
      masterMuted: this.masterMuted,
      musicMuted: this.musicMuted,
      sfxMuted: this.sfxMuted
    };
  }

  /**
   * Set volume state (for loading saved settings)
   */
  setVolumeState(state) {
    if (state.master !== undefined) this.setMasterVolume(state.master);
    if (state.music !== undefined) this.setMusicVolume(state.music);
    if (state.sfx !== undefined) this.setSfxVolume(state.sfx);
    if (state.masterMuted !== undefined && state.masterMuted !== this.masterMuted) {
      this.toggleMasterMute();
    }
    if (state.musicMuted !== undefined && state.musicMuted !== this.musicMuted) {
      this.toggleMusicMute();
    }
    if (state.sfxMuted !== undefined && state.sfxMuted !== this.sfxMuted) {
      this.toggleSfxMute();
    }
  }

  /**
   * Pause all audio (for game pause)
   */
  pauseAll() {
    this.sounds.forEach(sound => sound.pause());
    this.pauseMusic();
  }

  /**
   * Resume all audio
   */
  resumeAll() {
    this.sounds.forEach(sound => sound.play());
    this.resumeMusic();
  }

  /**
   * Destroy audio system
   */
  destroy() {
    this.unloadAll();
    Howler.unload();
  }
}

/**
 * Common game sound effects
 */
export const GameSounds = {
  // UI sounds
  CLICK: 'ui_click',
  HOVER: 'ui_hover',
  CONFIRM: 'ui_confirm',
  CANCEL: 'ui_cancel',
  ERROR: 'ui_error',
  
  // Player sounds
  JUMP: 'player_jump',
  LAND: 'player_land',
  HURT: 'player_hurt',
  DEATH: 'player_death',
  COLLECT: 'player_collect',
  
  // Game sounds
  EXPLOSION: 'explosion',
  SHOOT: 'shoot',
  HIT: 'hit',
  POWERUP: 'powerup',
  COIN: 'coin',
  
  // Ambient
  WIND: 'ambient_wind',
  RAIN: 'ambient_rain',
  FIRE: 'ambient_fire'
};

/**
 * React hook for AudioSystem
 */
export function useAudioSystem(options = {}) {
  const audioRef = React.useRef(null);
  
  React.useEffect(() => {
    audioRef.current = new AudioSystem(options);
    
    // Handle page visibility for auto-pause
    const handleVisibility = () => {
      if (document.hidden) {
        audioRef.current?.pauseAll();
      } else {
        audioRef.current?.resumeAll();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (audioRef.current) {
        audioRef.current.destroy();
        audioRef.current = null;
      }
    };
  }, []);
  
  return audioRef;
}

/**
 * Create a sound sprite from a single audio file
 * @param {Object} sprites - Object with sprite name -> [start, duration] in ms
 */
export function createSpriteDefinition(sprites) {
  const result = {};
  Object.entries(sprites).forEach(([name, [start, duration]]) => {
    result[name] = [start, duration];
  });
  return result;
}

export default AudioSystem;
