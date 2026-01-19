/**
 * React Query Client Configuration
 * 
 * Industry-grade configuration with:
 * - Optimized caching strategies
 * - Retry logic with exponential backoff
 * - Stale time configurations for different data types
 * - Error handling
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Stale times for different data types
export const STALE_TIMES = {
  /** Profile data - relatively stable, 5 minutes */
  PROFILE: 5 * 60 * 1000,
  /** Teams list - moderate updates, 2 minutes */
  TEAMS: 2 * 60 * 1000,
  /** Active matches - frequent updates, 30 seconds */
  MATCHES: 30 * 1000,
  /** Messages - very frequent, 10 seconds */
  MESSAGES: 10 * 1000,
  /** Static data like skills/programs - long cache, 30 minutes */
  STATIC: 30 * 60 * 1000,
} as const;

// Cache times (how long to keep in memory after becoming inactive)
export const CACHE_TIMES = {
  DEFAULT: 10 * 60 * 1000, // 10 minutes
  SHORT: 5 * 60 * 1000,    // 5 minutes
  LONG: 30 * 60 * 1000,    // 30 minutes
} as const;

// Query keys factory for consistent key management
export const queryKeys = {
  // Profiles
  profiles: {
    all: ['profiles'] as const,
    list: (filters?: Record<string, unknown>) => ['profiles', 'list', filters] as const,
    detail: (userId: string) => ['profiles', 'detail', userId] as const,
    current: () => ['profiles', 'current'] as const,
  },
  // Teams
  teams: {
    all: ['teams'] as const,
    list: (filters?: Record<string, unknown>) => ['teams', 'list', filters] as const,
    detail: (teamId: string) => ['teams', 'detail', teamId] as const,
    myTeam: (userId: string) => ['teams', 'my', userId] as const,
    members: (teamId: string) => ['teams', 'members', teamId] as const,
  },
  // Matches
  matches: {
    all: ['matches'] as const,
    list: (userId: string) => ['matches', 'list', userId] as const,
    pending: (userId: string) => ['matches', 'pending', userId] as const,
    history: (userId: string) => ['matches', 'history', userId] as const,
  },
  // Conversations
  conversations: {
    all: ['conversations'] as const,
    list: (userId: string) => ['conversations', 'list', userId] as const,
    detail: (conversationId: string) => ['conversations', 'detail', conversationId] as const,
    messages: (conversationId: string) => ['conversations', 'messages', conversationId] as const,
    unreadCount: (userId: string) => ['conversations', 'unread', userId] as const,
  },
} as const;

/**
 * Creates an optimized QueryClient instance
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default stale time - data considered fresh for 1 minute
        staleTime: 60 * 1000,
        // Keep in cache for 10 minutes after becoming inactive
        gcTime: CACHE_TIMES.DEFAULT,
        // Retry failed requests with exponential backoff
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error instanceof Error && error.message.includes('4')) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch on window focus for fresh data
        refetchOnWindowFocus: true,
        // Don't refetch on mount if data is fresh
        refetchOnMount: 'always',
        // Enable network mode for offline support
        networkMode: 'online',
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
        retryDelay: 1000,
        // Network mode
        networkMode: 'online',
      },
    },
  });
}

// Export singleton instance for app-wide use
export const queryClient = createQueryClient();
