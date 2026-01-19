/**
 * useOptimizedUnreadCount Hook
 * 
 * Optimized version using database function for efficient unread counting.
 * Uses the get_unread_count RPC function for single-query performance.
 * 
 * @param userId - Current authenticated user's ID
 * @returns {number} Total count of unread messages
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseOptimizedUnreadCountOptions {
  /** Debounce time for real-time updates (ms) */
  debounceMs?: number;
  /** Polling interval as fallback (ms) */
  pollIntervalMs?: number;
}

export function useOptimizedUnreadCount(
  userId: string | undefined,
  options: UseOptimizedUnreadCountOptions = {}
): number {
  const { debounceMs = 500, pollIntervalMs = 30000 } = options;
  const [unreadCount, setUnreadCount] = useState(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Fetches unread count using optimized database function
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!userId || !isMountedRef.current) return;

    try {
      // Use the optimized database function
      const { data, error } = await supabase.rpc('get_unread_count', {
        p_user_id: userId,
      });

      if (error) {
        // Fallback to client-side counting if RPC fails
        console.warn('RPC failed, using fallback:', error);
        await fetchUnreadCountFallback();
        return;
      }

      if (isMountedRef.current) {
        setUnreadCount(data ?? 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [userId]);

  /**
   * Fallback method using parallel queries (for backwards compatibility)
   */
  const fetchUnreadCountFallback = useCallback(async () => {
    if (!userId || !isMountedRef.current) return;

    try {
      const [participationsRes, readsRes] = await Promise.all([
        supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', userId),
        supabase
          .from('message_reads')
          .select('conversation_id, last_read_at')
          .eq('user_id', userId),
      ]);

      const participations = participationsRes.data;
      if (!participations || participations.length === 0) {
        setUnreadCount(0);
        return;
      }

      const conversationIds = participations.map((p) => p.conversation_id);
      const readMap = new Map(
        readsRes.data?.map((r) => [r.conversation_id, r.last_read_at]) || []
      );

      const { data: messages } = await supabase
        .from('messages')
        .select('conversation_id, created_at')
        .in('conversation_id', conversationIds)
        .neq('sender_id', userId);

      let total = 0;
      (messages || []).forEach((msg) => {
        const lastRead = readMap.get(msg.conversation_id);
        if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
          total++;
        }
      });

      if (isMountedRef.current) {
        setUnreadCount(total);
      }
    } catch (error) {
      console.error('Error in fallback unread count:', error);
    }
  }, [userId]);

  /**
   * Debounced refresh for real-time updates
   */
  const debouncedRefresh = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchUnreadCount();
    }, debounceMs);
  }, [fetchUnreadCount, debounceMs]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    if (!userId) return;

    isMountedRef.current = true;
    fetchUnreadCount();

    // Real-time subscription for live updates
    const channel = supabase
      .channel(`unread-count-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => debouncedRefresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reads' },
        () => debouncedRefresh()
      )
      .subscribe();

    // Polling fallback for reliability
    const pollInterval = setInterval(fetchUnreadCount, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUnreadCount, debouncedRefresh, pollIntervalMs]);

  return unreadCount;
}
