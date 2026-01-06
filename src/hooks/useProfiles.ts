/**
 * useProfiles Hook
 * 
 * Fetches and manages user profiles for the matching system.
 * Filters out users who are already in teams or have been swiped on.
 * 
 * @param userId - Current authenticated user's ID
 * @param hasProfile - Whether the current user has completed their profile
 * @returns {Object} profiles state and loading indicator
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, Program, Studio } from '@/types';
import { toast } from 'sonner';

interface UseProfilesResult {
  /** List of available user profiles to swipe on */
  profiles: UserProfile[];
  /** Whether profiles are currently being loaded */
  loading: boolean;
  /** Remove a profile from the list (after swipe) */
  removeProfile: (profileId: string) => void;
  /** Add a profile back to the list (for undo) */
  addProfile: (profile: UserProfile) => void;
  /** Refresh the profiles list */
  refresh: () => Promise<void>;
}

export function useProfiles(userId: string | undefined, hasProfile: boolean): UseProfilesResult {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Transforms a database profile record into a UserProfile object
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
   * Fetches profiles from the database, excluding:
   * - Current user
   * - Users already in teams
   * - Users already swiped on
   */
  const fetchProfiles = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Parallel fetch: team members and swiped users
      const [teamMembersRes, swipedMatchesRes] = await Promise.all([
        supabase
          .from('team_members')
          .select('user_id')
          .eq('status', 'confirmed'),
        supabase
          .from('matches')
          .select('target_user_id')
          .eq('user_id', userId)
          .in('match_type', ['individual_to_individual', 'team_to_individual'])
      ]);

      const usersInTeams = new Set((teamMembersRes.data || []).map(tm => tm.user_id));
      const swipedUserIds = new Set((swipedMatchesRes.data || []).map(m => m.target_user_id));

      // Fetch all profiles except current user
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', userId);

      if (error) {
        console.error('Error fetching profiles:', error);
        toast.error('Failed to load profiles');
        return;
      }

      // Filter and transform profiles
      const availableProfiles = (data || [])
        .filter(p => !usersInTeams.has(p.user_id) && !swipedUserIds.has(p.user_id))
        .map(transformProfile);

      setProfiles(availableProfiles);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, transformProfile]);

  // Initial fetch when user has a profile
  useEffect(() => {
    if (hasProfile) {
      fetchProfiles();
    }
  }, [hasProfile, fetchProfiles]);

  const removeProfile = useCallback((profileId: string) => {
    setProfiles(prev => prev.filter(p => p.id !== profileId));
  }, []);

  const addProfile = useCallback((profile: UserProfile) => {
    setProfiles(prev => [profile, ...prev]);
  }, []);

  return {
    profiles,
    loading,
    removeProfile,
    addProfile,
    refresh: fetchProfiles,
  };
}
