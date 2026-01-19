/**
 * usePersistedState Hook
 * 
 * A React hook that persists state to localStorage.
 * Automatically syncs state across tabs/windows.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '@/lib/storage';

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

interface UsePersistedStateOptions<T> {
  /** Key to use in localStorage */
  key: StorageKey;
  /** Default value if nothing in storage */
  defaultValue: T;
  /** Optional expiration time in milliseconds */
  expiresInMs?: number;
  /** Sync across browser tabs (default: true) */
  syncTabs?: boolean;
}

/**
 * Hook that persists state to localStorage with automatic syncing
 * 
 * @example
 * ```tsx
 * const [filters, setFilters] = usePersistedState({
 *   key: STORAGE_KEYS.PEOPLE_FILTERS,
 *   defaultValue: { programs: [], studios: [] },
 * });
 * ```
 */
export function usePersistedState<T>({
  key,
  defaultValue,
  expiresInMs,
  syncTabs = true,
}: UsePersistedStateOptions<T>): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state from storage
  const [state, setStateInternal] = useState<T>(() => {
    return getStorageItem(key, defaultValue);
  });

  // Track if this is the first render
  const isFirstRender = useRef(true);

  // Wrapped setState that also persists to storage
  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStateInternal((prev) => {
        const nextValue = typeof value === 'function' 
          ? (value as (prev: T) => T)(prev) 
          : value;
        
        // Persist to storage
        setStorageItem(key, nextValue, expiresInMs);
        
        return nextValue;
      });
    },
    [key, expiresInMs]
  );

  // Sync across tabs using storage event
  useEffect(() => {
    if (!syncTabs) return;

    const handleStorageChange = (event: StorageEvent) => {
      const prefixedKey = `stm_${key}`;
      
      if (event.key === prefixedKey && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          setStateInternal(parsed.value);
        } catch (error) {
          console.warn('Error parsing storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, syncTabs]);

  // Skip persistence on first render (already loaded from storage)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
  }, []);

  return [state, setState];
}

/**
 * Convenience hook for filter state persistence
 */
export function usePersistedFilters<T extends Record<string, unknown>>(
  type: 'people' | 'team',
  defaultFilters: T
): [T, (filters: T | ((prev: T) => T)) => void] {
  const key = type === 'people' 
    ? STORAGE_KEYS.PEOPLE_FILTERS 
    : STORAGE_KEYS.TEAM_FILTERS;
  
  return usePersistedState({
    key,
    defaultValue: defaultFilters,
    // Filters expire after 24 hours
    expiresInMs: 24 * 60 * 60 * 1000,
  });
}

/**
 * Hook for persisting active tab state
 */
export function usePersistedTab(
  defaultTab: string
): [string, (tab: string) => void] {
  return usePersistedState({
    key: STORAGE_KEYS.ACTIVE_TAB,
    defaultValue: defaultTab,
  });
}
