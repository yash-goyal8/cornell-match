/**
 * useProfiles Hook
 * 
 * Fetches and manages user profiles for the matching system.
 * Optimized with single consolidated query and proper cleanup.
 * 
 * @param userId - Current authenticated user's ID
 * @param hasProfile - Whether the current user has completed their profile
 * @returns {Object} profiles state and loading indicator
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, Program, Studio } from '@/types';

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
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const initialFetchDone = useRef(false);

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
   * Fetches profiles from the database using optimized single query approach
   */
  const fetchProfiles = useCallback(async () => {
    if (!userId || fetchingRef.current) return;

    fetchingRef.current = true;
    
    // Only show loading on initial fetch
    if (!initialFetchDone.current) {
      setLoading(true);
    }
    
    try {
      // Single consolidated query: fetch all needed data in parallel
      const [teamMembersRes, swipedMatchesRes, profilesRes] = await Promise.all([
        supabase
          .from('team_members')
          .select('user_id')
          .eq('status', 'confirmed'),
        supabase
          .from('matches')
          .select('target_user_id')
          .eq('user_id', userId)
          .in('match_type', ['individual_to_individual', 'team_to_individual']),
        supabase
          .from('profiles')
          .select('user_id, name, program, skills, bio, studio_preference, studio_preferences, avatar, linkedin')
          .neq('user_id', userId),
      ]);

      if (profilesRes.error) {
        console.error('Error fetching profiles:', profilesRes.error);
        return;
      }

      const usersInTeams = new Set((teamMembersRes.data || []).map(tm => tm.user_id));
      const swipedUserIds = new Set((swipedMatchesRes.data || []).map(m => m.target_user_id));

      // Filter and transform profiles
      const availableProfiles = (profilesRes.data || [])
        .filter(p => !usersInTeams.has(p.user_id) && !swipedUserIds.has(p.user_id))
        .map(transformProfile);

      if (isMountedRef.current) {
        setProfiles(availableProfiles);
        initialFetchDone.current = true;
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [userId, transformProfile]);

  // Initial fetch and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    if (hasProfile && userId) {
      fetchProfiles();
    } else {
      setLoading(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [hasProfile, userId, fetchProfiles]);

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
