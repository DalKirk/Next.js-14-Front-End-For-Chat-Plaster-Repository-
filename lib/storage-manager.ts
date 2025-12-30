/**
 * Storage Manager - Handles localStorage quota management and image compression
 */

const STORAGE_LIMITS = {
  MAX_ROOMS: 25,
  MAX_AVATARS: 50,
  MAX_MESSAGES_PER_ROOM: 100,
  MAX_IMAGE_SIZE_KB: 30,
  MAX_IMAGE_DIMENSION: 400,
};

export class StorageManager {
  /**
   * Compress image data URL to reduce storage (~90% size reduction)
   */
  static async compressImage(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Scale down if too large
        const maxDim = STORAGE_LIMITS.MAX_IMAGE_DIMENSION;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels to stay under size limit
        let quality = 0.8;
        let compressed = canvas.toDataURL('image/jpeg', quality);

        const targetSize = STORAGE_LIMITS.MAX_IMAGE_SIZE_KB * 1024;
        while (compressed.length > targetSize && quality > 0.3) {
          quality -= 0.1;
          compressed = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(compressed);
      };
      img.onerror = () => {
        console.warn('Failed to compress image, using original');
        resolve(dataUrl);
      };
      img.src = dataUrl;
    });
  }

  /**
   * Safe localStorage setItem with quota handling and auto-cleanup
   */
  static setItem(key: string, value: any): boolean {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn(`⚠️ Storage quota exceeded for key: ${key}, running cleanup...`);
        this.cleanupStorage();
        
        // Try again after cleanup
        try {
          const serialized = JSON.stringify(value);
          localStorage.setItem(key, serialized);
          console.log('✅ Successfully stored after cleanup');
          return true;
        } catch {
          console.error('❌ Still cannot store after cleanup');
          return false;
        }
      }
      console.error('Storage error:', error);
      return false;
    }
  }

  /**
   * Get item from localStorage with fallback
   */
  static getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to parse ${key} from localStorage:`, error);
      return defaultValue;
    }
  }

  /**
   * Cleanup old data to free space (removes ~50-70% of storage)
   */
  static cleanupStorage(): void {
    try {
      console.log('🧹 Running storage cleanup...');
      
      // 1. Limit rooms to most recent
      const rooms = this.getItem('rooms-data', []);
      if (rooms.length > STORAGE_LIMITS.MAX_ROOMS) {
        const limited = rooms.slice(-STORAGE_LIMITS.MAX_ROOMS);
        localStorage.setItem('rooms-data', JSON.stringify(limited));
        console.log(`  Rooms: ${rooms.length} → ${limited.length}`);
      }

      // 2. Limit avatar caches
      const avatarCache = this.getItem('userAvatarCache', {});
      const avatarEntries = Object.entries(avatarCache);
      if (avatarEntries.length > STORAGE_LIMITS.MAX_AVATARS) {
        const limited = Object.fromEntries(
          avatarEntries.slice(-STORAGE_LIMITS.MAX_AVATARS)
        );
        localStorage.setItem('userAvatarCache', JSON.stringify(limited));
        console.log(`  Avatar cache: ${avatarEntries.length} → ${limited.length}`);
      }

      const avatarCacheById = this.getItem('userAvatarCacheById', {});
      const avatarByIdEntries = Object.entries(avatarCacheById);
      if (avatarByIdEntries.length > STORAGE_LIMITS.MAX_AVATARS) {
        const limited = Object.fromEntries(
          avatarByIdEntries.slice(-STORAGE_LIMITS.MAX_AVATARS)
        );
        localStorage.setItem('userAvatarCacheById', JSON.stringify(limited));
        console.log(`  Avatar cache by ID: ${avatarByIdEntries.length} → ${limited.length}`);
      }

      // 3. Limit message history per room
      const messageKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('room-') && key.includes('-messages')
      );
      messageKeys.forEach(key => {
        const messages = this.getItem(key, []);
        if (messages.length > STORAGE_LIMITS.MAX_MESSAGES_PER_ROOM) {
          const limited = messages.slice(-STORAGE_LIMITS.MAX_MESSAGES_PER_ROOM);
          localStorage.setItem(key, JSON.stringify(limited));
          console.log(`  ${key}: ${messages.length} → ${limited.length} messages`);
        }
      });

      console.log('✅ Storage cleanup completed');
    } catch (error) {
      console.error('Storage cleanup failed:', error);
    }
  }

  /**
   * Get current storage usage statistics
   */
  static getStorageUsage(): { used: number; limit: number; percentage: number; usedMB: number } {
    let used = 0;
    Object.keys(localStorage).forEach(key => {
      used += (localStorage.getItem(key)?.length || 0);
    });

    const limit = 10 * 1024 * 1024; // 10MB estimate
    return {
      used,
      limit,
      percentage: Math.round((used / limit) * 100),
      usedMB: parseFloat((used / (1024 * 1024)).toFixed(2)),
    };
  }

  /**
   * Clear specific data types (for manual cleanup)
   */
  static clearRooms(): void {
    localStorage.removeItem('rooms-data');
    console.log('🗑️ Cleared rooms data');
  }

  static clearAvatars(): void {
    localStorage.removeItem('userAvatarCache');
    localStorage.removeItem('userAvatarCacheById');
    console.log('🗑️ Cleared avatar caches');
  }

  static clearMessages(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith('room-') && key.includes('-messages'))
      .forEach(key => localStorage.removeItem(key));
    console.log('🗑️ Cleared all message history');
  }

  /**
   * Log current storage usage to console
   */
  static logStorageUsage(): void {
    const usage = this.getStorageUsage();
    console.log(`📊 Storage Usage: ${usage.usedMB}MB / ~10MB (${usage.percentage}%)`);
    
    // Show top storage consumers
    const sizes: { [key: string]: number } = {};
    Object.keys(localStorage).forEach(key => {
      const size = (localStorage.getItem(key)?.length || 0) / 1024;
      if (size > 10) { // Only show items > 10KB
        sizes[key] = parseFloat(size.toFixed(2));
      }
    });
    
    const sorted = Object.entries(sizes).sort((a, b) => b[1] - a[1]);
    console.table(sorted.slice(0, 10)); // Top 10 items
  }
}
