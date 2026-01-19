/**
 * useActivityHistory Hook
 * 
 * Manages swipe history for the activity modal.
 * Optimized with parallel queries and proper cleanup.
 * 
 * @param userId - Current authenticated user's ID
 * @param hasProfile - Whether the current user has completed their profile
 * @returns {Object} History state and management functions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, Team, Program, Studio } from '@/types';

export interface SwipeHistory {
  type: 'user' | 'team';
  item: UserProfile | Team;
  direction: 'left' | 'right';
}

interface UseActivityHistoryResult {
  /** List of swipe history items */
  history: SwipeHistory[];
  /** Whether history is being loaded */
  loading: boolean;
  /** Add a new item to history */
  addToHistory: (item: SwipeHistory) => void;
  /** Remove an item from history by index */
  removeFromHistory: (index: number) => void;
  /** Remove the last item from history */
  removeLastFromHistory: () => void;
}

export function useActivityHistory(
  userId: string | undefined,
  hasProfile: boolean
): UseActivityHistoryResult {
  const [history, setHistory] = useState<SwipeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  /**
   * Transforms profile data to UserProfile format
   */
  const transformProfile = useCallback((p: any): UserProfile => ({
    id: p.user_id,
    name: p.name,
    program: p.program as Program,
    skills: p.skills || [],
    bio: p.bio || '',
    studioPreference: p.studio_preference as Studio,
    studioPreferences: (p.studio_preferences as Studio[]) || [p.studio_preference as Studio],
    avatar: p.avatar || undefined,
    linkedIn: p.linkedin || undefined,
  }), []);

  /**
   * Transforms team data to Team format
   */
  const transformTeam = useCallback((t: any): Team => ({
    id: t.id,
    name: t.name,
    description: t.description || '',
    studio: t.studio as Studio,
    members: [],
    lookingFor: [],
    skillsNeeded: t.skills_needed || [],
    createdBy: t.created_by,
  }), []);

  /**
   * Loads activity history from the database using optimized queries
   */
  const loadActivityHistory = useCallback(async () => {
    if (!userId || fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);
    
    try {
      // Fetch all matches made by the user
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100); // Limit for performance

      if (error) {
        console.error('Error loading activity history:', error);
        return;
      }

      if (!matchesData || matchesData.length === 0) {
        if (isMountedRef.current) {
          setHistory([]);
          setLoading(false);
        }
        return;
      }

      // Separate individual and team matches
      const individualMatches = matchesData.filter(
        m => m.match_type === 'individual_to_individual' || m.match_type === 'team_to_individual'
      );
      const teamMatches = matchesData.filter(m => m.match_type === 'individual_to_team');

      // Collect IDs for batch fetching
      const targetUserIds = [...new Set(individualMatches.map(m => m.target_user_id))];
      const teamIds = [...new Set(teamMatches.map(m => m.team_id).filter(Boolean))] as string[];

      // Parallel fetch profiles and teams
      const [profilesRes, teamsRes] = await Promise.all([
        targetUserIds.length > 0
          ? supabase.from('profiles').select('*').in('user_id', targetUserIds)
          : Promise.resolve({ data: [] }),
        teamIds.length > 0
          ? supabase.from('teams').select('*').in('id', teamIds)
          : Promise.resolve({ data: [] }),
      ]);

      // Create lookup maps
      const profilesMap = new Map(
        (profilesRes.data || []).map(p => [p.user_id, p])
      );
      const teamsMap = new Map(
        (teamsRes.data || []).map(t => [t.id, t])
      );

      // Build history items maintaining order
      const historyItems: SwipeHistory[] = matchesData
        .map(match => {
          if (match.match_type === 'individual_to_team') {
            const team = match.team_id ? teamsMap.get(match.team_id) : null;
            if (!team) return null;
            return {
              type: 'team' as const,
              item: transformTeam(team),
              direction: match.status === 'rejected' ? 'left' as const : 'right' as const,
            };
          } else {
            const profile = profilesMap.get(match.target_user_id);
            if (!profile) return null;
            return {
              type: 'user' as const,
              item: transformProfile(profile),
              direction: match.status === 'rejected' ? 'left' as const : 'right' as const,
            };
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null) as SwipeHistory[];

      if (isMountedRef.current) {
        setHistory(historyItems);
      }
    } catch (error) {
      console.error('Error loading activity history:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [userId, transformProfile, transformTeam]);

  // Initial load and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    if (hasProfile) {
      loadActivityHistory();
    } else {
      setLoading(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [hasProfile, loadActivityHistory]);

  const addToHistory = useCallback((item: SwipeHistory) => {
    setHistory(prev => [...prev, item]);
  }, []);

  const removeFromHistory = useCallback((index: number) => {
    setHistory(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeLastFromHistory = useCallback(() => {
    setHistory(prev => prev.slice(0, -1));
  }, []);

  return {
    history,
    loading,
    addToHistory,
    removeFromHistory,
    removeLastFromHistory,
  };
}
