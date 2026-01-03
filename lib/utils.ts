import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { User } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function isValidVideoFile(file: File): boolean {
  const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  return validTypes.indexOf(file.type) !== -1;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Remove sensitive or unnecessary fields before persisting user to localStorage.
 * Specifically drops `email` and `bio` while keeping identifiers and avatar data.
 */
export function sanitizeUserForStorage(user: User): Pick<User, 'id' | 'username' | 'avatar_url' | 'avatar_urls' | 'display_name' | 'created_at'> {
  return {
    id: user.id,
    username: user.username,
    avatar_url: user.avatar_url,
    avatar_urls: user.avatar_urls,
    display_name: user.display_name,
    created_at: user.created_at,
  };
}