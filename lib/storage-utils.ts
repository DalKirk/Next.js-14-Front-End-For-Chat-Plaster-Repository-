/**
 * Safe localStorage wrapper with quota error handling
 */

export class StorageUtils {
  private static readonly ESSENTIAL_KEYS = ['userId', 'authToken'];

  /**
   * Safely set item in localStorage with quota error handling
   */
  static safeSetItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded - cleaning up...');
        
        // Clear non-essential data
        const allKeys = Object.keys(localStorage);
        let cleaned = 0;
        
        allKeys.forEach(k => {
          if (!this.ESSENTIAL_KEYS.includes(k)) {
            localStorage.removeItem(k);
            cleaned++;
          }
        });
        
        console.log(`🧹 Cleaned ${cleaned} non-essential items from localStorage`);
        
        // Try again after cleanup
        try {
          localStorage.setItem(key, value);
          console.log('✅ Successfully saved after cleanup');
          return true;
        } catch (retryError) {
          console.warn('❌ Still failing after cleanup - falling back to sessionStorage');
          // Fallback to sessionStorage
          try {
            sessionStorage.setItem(key, value);
            return true;
          } catch (sessionError) {
            console.error('❌ Cannot save to any storage:', sessionError);
            return false;
          }
        }
      } else {
        console.error('Storage error:', e);
        return false;
      }
    }
  }

  /**
   * Safely get item from localStorage or sessionStorage fallback
   */
  static safeGetItem(key: string): string | null {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  }

  /**
   * Remove item from both storages
   */
  static safeRemoveItem(key: string): void {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  /**
   * Calculate storage usage percentage
   */
  static getStorageUsage(): { used: number; total: number; percentage: number } {
    let used = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
    
    const total = 5 * 1024 * 1024; // 5MB typical limit
    const percentage = (used / total) * 100;
    
    return { used, total, percentage };
  }

  /**
   * Log storage usage to console
   */
  static logStorageUsage(): void {
    const usage = this.getStorageUsage();
    const usedMB = (usage.used / 1024 / 1024).toFixed(2);
    const totalMB = (usage.total / 1024 / 1024).toFixed(2);
    
    console.log(`📊 localStorage usage: ${usedMB}MB / ${totalMB}MB (${usage.percentage.toFixed(1)}%)`);
    
    if (usage.percentage > 80) {
      console.warn('⚠️ localStorage usage above 80% - consider cleanup');
    }
  }

  /**
   * Clean up old data to free space
   */
  static cleanup(): void {
    const usage = this.getStorageUsage();
    
    if (usage.percentage < 80) {
      console.log('✅ Storage usage healthy, no cleanup needed');
      return;
    }
    
    console.log('🧹 Starting storage cleanup...');
    
    // Remove old conversation history
    for (const key in localStorage) {
      if (key.startsWith('conversation-') || key.startsWith('room-') && key.endsWith('-messages')) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            // Keep only last 50 messages
            if (Array.isArray(parsed) && parsed.length > 50) {
              localStorage.setItem(key, JSON.stringify(parsed.slice(-50)));
              console.log(`✂️ Trimmed ${key}`);
            }
          } catch (e) {
            // Invalid data, remove it
            localStorage.removeItem(key);
            console.log(`🗑️ Removed invalid ${key}`);
          }
        }
      }
    }
    
    const newUsage = this.getStorageUsage();
    console.log(`✅ Cleanup complete. Usage: ${newUsage.percentage.toFixed(1)}%`);
  }
}
