/**
 * useActivityHistory Hook
 * 
 * Manages swipe history for the activity modal.
 * Loads historical swipe data from database and tracks new swipes.
 * 
 * @param userId - Current authenticated user's ID
 * @param hasProfile - Whether the current user has completed their profile
 * @returns {Object} History state and management functions
 */

import { useState, useEffect, useCallback } from 'react';
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

  /**
   * Loads activity history from the database
   */
  const loadActivityHistory = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Fetch all matches made by the user
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading activity history:', error);
        return;
      }

      if (!matchesData || matchesData.length === 0) {
        setLoading(false);
        return;
      }

      // Separate individual and team matches
      const individualMatches = matchesData.filter(
        m => m.match_type === 'individual_to_individual' || m.match_type === 'team_to_individual'
      );
      const teamMatches = matchesData.filter(m => m.match_type === 'individual_to_team');

      // Fetch profiles for individual matches
      const targetUserIds = individualMatches.map(m => m.target_user_id);
      let profilesMap: Record<string, any> = {};

      if (targetUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', targetUserIds);

        (profiles || []).forEach(p => {
          profilesMap[p.user_id] = p;
        });
      }

      // Fetch teams for team matches
      const teamIds = teamMatches.map(m => m.team_id).filter(Boolean);
      let teamsMap: Record<string, any> = {};

      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);

        (teamsData || []).forEach(t => {
          teamsMap[t.id] = t;
        });
      }

      // Build history items
      const historyItems: SwipeHistory[] = [];

      individualMatches.forEach(match => {
        const profile = profilesMap[match.target_user_id];
        if (profile) {
          historyItems.push({
            type: 'user',
            item: {
              id: profile.user_id,
              name: profile.name,
              program: profile.program as Program,
              skills: profile.skills || [],
              bio: profile.bio || '',
              studioPreference: profile.studio_preference as Studio,
              studioPreferences: (profile.studio_preferences as Studio[]) || [profile.studio_preference as Studio],
              avatar: profile.avatar || undefined,
              linkedIn: profile.linkedin || undefined,
            },
            direction: match.status === 'rejected' ? 'left' : 'right',
          });
        }
      });

      teamMatches.forEach(match => {
        const team = match.team_id ? teamsMap[match.team_id] : null;
        if (team) {
          historyItems.push({
            type: 'team',
            item: {
              id: team.id,
              name: team.name,
              description: team.description || '',
              studio: team.studio as Studio,
              members: [],
              lookingFor: [],
              skillsNeeded: [],
              createdBy: team.created_by,
            },
            direction: match.status === 'rejected' ? 'left' : 'right',
          });
        }
      });

      setHistory(historyItems);
    } catch (error) {
      console.error('Error loading activity history:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    if (hasProfile) {
      loadActivityHistory();
    }
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
