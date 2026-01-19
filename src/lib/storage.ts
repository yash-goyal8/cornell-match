/**
 * Local Storage Utilities
 * 
 * Type-safe local storage operations with:
 * - Automatic JSON serialization/deserialization
 * - Error handling
 * - Expiration support
 * - Namespace prefixing
 */

const STORAGE_PREFIX = 'stm_'; // Studio Team Match prefix
const VERSION = '1'; // Increment to invalidate old cached data

interface StorageItem<T> {
  value: T;
  timestamp: number;
  version: string;
  expiresAt?: number;
}

/**
 * Storage keys for the application
 */
export const STORAGE_KEYS = {
  PEOPLE_FILTERS: 'people_filters',
  TEAM_FILTERS: 'team_filters',
  ACTIVE_TAB: 'active_tab',
  SCROLL_POSITION: 'scroll_position',
  ONBOARDING_STEP: 'onboarding_step',
  THEME: 'theme',
  LAST_VIEWED_PROFILE: 'last_viewed_profile',
  CHAT_DRAFT: 'chat_draft',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Get item from local storage with type safety
 */
export function getStorageItem<T>(key: StorageKey, defaultValue: T): T {
  try {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    const item = localStorage.getItem(prefixedKey);
    
    if (!item) {
      return defaultValue;
    }

    const parsed: StorageItem<T> = JSON.parse(item);
    
    // Check version - invalidate if version mismatch
    if (parsed.version !== VERSION) {
      localStorage.removeItem(prefixedKey);
      return defaultValue;
    }

    // Check expiration
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(prefixedKey);
      return defaultValue;
    }

    return parsed.value;
  } catch (error) {
    console.warn(`Error reading from storage key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Set item in local storage with optional expiration
 */
export function setStorageItem<T>(
  key: StorageKey,
  value: T,
  expiresInMs?: number
): boolean {
  try {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    const item: StorageItem<T> = {
      value,
      timestamp: Date.now(),
      version: VERSION,
      expiresAt: expiresInMs ? Date.now() + expiresInMs : undefined,
    };
    
    localStorage.setItem(prefixedKey, JSON.stringify(item));
    return true;
  } catch (error) {
    console.warn(`Error writing to storage key "${key}":`, error);
    return false;
  }
}

/**
 * Remove item from local storage
 */
export function removeStorageItem(key: StorageKey): boolean {
  try {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    localStorage.removeItem(prefixedKey);
    return true;
  } catch (error) {
    console.warn(`Error removing storage key "${key}":`, error);
    return false;
  }
}

/**
 * Clear all app-related storage items
 */
export function clearAppStorage(): boolean {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (error) {
    console.warn('Error clearing app storage:', error);
    return false;
  }
}

/**
 * Hook-compatible storage state manager
 * Returns [value, setValue] tuple for React state-like usage
 */
export function createStorageState<T>(
  key: StorageKey,
  defaultValue: T
): [() => T, (value: T) => void] {
  const getValue = () => getStorageItem(key, defaultValue);
  const setValue = (value: T) => setStorageItem(key, value);
  
  return [getValue, setValue];
}
