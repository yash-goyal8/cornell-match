/**
 * useTeams Hook
 * 
 * Fetches and manages teams for the matching system.
 * Optimized with consolidated queries and efficient data transformation.
 * 
 * @param userId - Current authenticated user's ID
 * @param hasProfile - Whether the current user has completed their profile
 * @returns {Object} teams state and management functions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Team, UserProfile } from '@/types';
import { transformProfile, transformTeam } from '@/lib/transforms';

interface UseTeamsResult {
  /** List of available teams to swipe on */
  teams: Team[];
  /** Whether teams are currently being loaded */
  loading: boolean;
  /** Remove a team from the list (after swipe) */
  removeTeam: (teamId: string) => void;
  /** Add a team back to the list (for undo) */
  addTeam: (team: Team) => void;
  /** Refresh the teams list */
  refresh: () => Promise<void>;
}

export function useTeams(userId: string | undefined, hasProfile: boolean): UseTeamsResult {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const initialFetchDone = useRef(false);

  /**
   * Fetches teams from the database with their members
   * Uses consolidated parallel queries for optimal performance
   */
  const fetchTeams = useCallback(async () => {
    if (!userId || fetchingRef.current) return;

    fetchingRef.current = true;
    
    // Only show loading on initial fetch
    if (!initialFetchDone.current) {
      setLoading(true);
    }
    
    try {
      // Single consolidated query: fetch everything in parallel
      const [swipedRes, teamsRes, membersRes] = await Promise.all([
        supabase
          .from('matches')
          .select('team_id')
          .eq('user_id', userId)
          .eq('match_type', 'individual_to_team')
          .not('team_id', 'is', null),
        supabase.from('teams').select('id, name, description, studio, skills_needed, created_by'),
        supabase
          .from('team_members')
          .select('team_id, user_id, role')
          .eq('status', 'confirmed'),
      ]);

      if (teamsRes.error) {
        console.error('Error fetching teams:', teamsRes.error);
        return;
      }

      const swipedTeamIds = new Set((swipedRes.data || []).map(m => m.team_id));
      const userTeamIds = new Set(
        (membersRes.data || [])
          .filter(m => m.user_id === userId)
          .map(m => m.team_id)
      );

      // Filter out swiped and user's own teams
      const availableTeams = (teamsRes.data || []).filter(
        t => !swipedTeamIds.has(t.id) && !userTeamIds.has(t.id)
      );

      if (availableTeams.length === 0) {
        if (isMountedRef.current) {
          setTeams([]);
          initialFetchDone.current = true;
        }
        return;
      }

      // Get unique member user IDs for profile fetch
      const memberUserIds = [...new Set((membersRes.data || []).map(m => m.user_id))];
      
      // Fetch member profiles if needed
      let profilesMap: Record<string, any> = {};
      if (memberUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, program, skills, bio, studio_preference, studio_preferences, avatar, linkedin')
          .in('user_id', memberUserIds);

        (profilesData || []).forEach(p => {
          profilesMap[p.user_id] = p;
        });
      }

      // Group members by team efficiently
      const membersByTeam = new Map<string, UserProfile[]>();
      (membersRes.data || []).forEach(member => {
        const profile = profilesMap[member.user_id];
        if (profile) {
          const teamMembers = membersByTeam.get(member.team_id) || [];
          teamMembers.push(transformProfile(profile));
          membersByTeam.set(member.team_id, teamMembers);
        }
      });

      // Transform teams data
      const transformedTeams: Team[] = availableTeams.map(t => transformTeam(t)).map(team => ({
        ...team,
        members: membersByTeam.get(team.id) || [],
      }));

      if (isMountedRef.current) {
        setTeams(transformedTeams);
        initialFetchDone.current = true;
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [userId]);

  // Initial fetch and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    if (hasProfile && userId) {
      fetchTeams();
    } else {
      setLoading(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [hasProfile, userId, fetchTeams]);

  const removeTeam = useCallback((teamId: string) => {
    setTeams(prev => prev.filter(t => t.id !== teamId));
  }, []);

  const addTeam = useCallback((team: Team) => {
    setTeams(prev => [team, ...prev]);
  }, []);

  return {
    teams,
    loading,
    removeTeam,
    addTeam,
    refresh: fetchTeams,
  };
}