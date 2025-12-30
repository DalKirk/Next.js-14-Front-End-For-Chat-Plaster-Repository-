/**
 * User validation and recreation utilities
 * Handles validation of users against the backend and recreation if needed
 */

import { apiClient } from './api';
import { StorageUtils } from './storage-utils';
import type { User } from './types';

export class UserValidator {
  /**
   * Validate that a user exists on the backend
   * If not, recreate them and update localStorage
   */
  static async validateAndRecreateIfNeeded(): Promise<User | null> {
    try {
      const savedUser = StorageUtils.safeGetItem('chat-user');
      if (!savedUser) {
        console.log('No user in localStorage');
        return null;
      }

      const userData = JSON.parse(savedUser);
      console.log('🔍 Validating user:', userData.id);

      // Check if user exists on backend
      const exists = await apiClient.validateUser(userData.id);
      
      if (exists) {
        console.log('✅ User exists on backend');
        return userData;
      }

      // User doesn't exist - recreate
      console.warn('⚠️ User not found on backend, recreating...');
      const recreated = await apiClient.createUser(userData.username || 'Guest');
      console.log('✅ User recreated:', recreated);
      
      // Update localStorage with new user ID
      StorageUtils.safeSetItem('chat-user', JSON.stringify(recreated));
      
      // Update userProfile if it exists
      const userProfile = StorageUtils.safeGetItem('userProfile');
      if (userProfile) {
        try {
          const profile = JSON.parse(userProfile);
          profile.id = recreated.id;
          profile.username = recreated.username;
          StorageUtils.safeSetItem('userProfile', JSON.stringify(profile));
        } catch (e) {
          console.warn('Could not update userProfile:', e);
        }
      }
      
      return recreated;
    } catch (error) {
      console.error('❌ Error validating/recreating user:', error);
      return null;
    }
  }

  /**
   * Clear all user data from localStorage
   */
  static clearUserData(): void {
    console.log('🗑️ Clearing all user data');
    StorageUtils.safeRemoveItem('chat-user');
    StorageUtils.safeRemoveItem('userProfile');
    StorageUtils.safeRemoveItem('userAvatarCache');
    StorageUtils.safeRemoveItem('userAvatarCacheById');
  }

  /**
   * Check if current user ID is a mock user (created when backend was down)
   */
  static isMockUser(userId: string): boolean {
    return userId.startsWith('mock-');
  }

  /**
   * Ensure user is valid before performing critical operations
   * Returns valid user or throws error
   */
  static async ensureValidUser(): Promise<User> {
    const user = await this.validateAndRecreateIfNeeded();
    if (!user) {
      throw new Error('No user found. Please log in.');
    }
    return user;
  }
}
