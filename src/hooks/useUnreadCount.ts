/**
 * useUnreadCount Hook
 * 
 * Tracks unread message count across all conversations.
 * Uses optimized single-query approach and real-time subscriptions.
 * 
 * @param userId - Current authenticated user's ID
 * @returns {number} Total count of unread messages
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useUnreadCount(userId: string | undefined): number {
  const [unreadCount, setUnreadCount] = useState(0);

  /**
   * Fetches unread message count using optimized parallel queries
   * Instead of N+2 sequential queries, uses 3 parallel queries
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    // Parallel fetch: participations and read timestamps
    const [participationsRes, readsRes] = await Promise.all([
      supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId),
      supabase
        .from('message_reads')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId)
    ]);

    const participations = participationsRes.data;
    if (!participations || participations.length === 0) {
      setUnreadCount(0);
      return;
    }

    const conversationIds = participations.map(p => p.conversation_id);
    const readMap = new Map(readsRes.data?.map(r => [r.conversation_id, r.last_read_at]) || []);

    // Fetch all messages from these conversations not sent by user
    const { data: messages } = await supabase
      .from('messages')
      .select('conversation_id, created_at')
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId);

    // Count unread messages client-side
    let total = 0;
    (messages || []).forEach(msg => {
      const lastRead = readMap.get(msg.conversation_id);
      if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
        total++;
      }
    });

    setUnreadCount(total);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    fetchUnreadCount();

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
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUnreadCount]);

  return unreadCount;
}
