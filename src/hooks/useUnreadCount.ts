/**
 * useUnreadCount Hook
 * 
 * Tracks unread message count across all conversations.
 * Optimized with deferred loading and efficient queries.
 * 
 * @param userId - Current authenticated user's ID (undefined to skip)
 * @returns {number} Total count of unread messages
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useUnreadCount(userId: string | undefined): number {
  const [unreadCount, setUnreadCount] = useState(0);
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  /**
   * Fetches unread message count using optimized parallel queries
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!userId || fetchingRef.current) return;
    
    fetchingRef.current = true;

    try {
      // Use optimized database function instead of multiple queries
      const { data, error } = await supabase.rpc('get_unread_count', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error fetching unread count:', error);
        return;
      }

      if (isMountedRef.current) {
        setUnreadCount(data || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    } finally {
      fetchingRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    // Defer initial fetch slightly to prioritize main content
    const timeoutId = setTimeout(() => {
      fetchUnreadCount();
    }, 100);

    // Real-time subscription for live updates
    const channel = supabase
      .channel('unread-count')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchUnreadCount()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reads' },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUnreadCount]);

  return unreadCount;
}
