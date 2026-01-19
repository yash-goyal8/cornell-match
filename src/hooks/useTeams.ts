/**
 * useTeams Hook
 * 
 * Fetches and manages teams for the matching system.
 * Optimized with parallel queries and efficient data transformation.
 * 
 * @param userId - Current authenticated user's ID
 * @param hasProfile - Whether the current user has completed their profile
 * @returns {Object} teams state and management functions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Team, UserProfile, Program, Studio } from '@/types';
import { toast } from 'sonner';

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

  /**
   * Transforms profile data to UserProfile format
   */
  const transformProfile = useCallback((p: any): UserProfile => ({
    id: p.id || p.user_id,
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
   * Fetches teams from the database with their members
   * Uses parallel queries for optimal performance
   */
  const fetchTeams = useCallback(async () => {
    if (!userId || fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);
    
    try {
      // Parallel fetch: all data in one go
      const [swipedRes, teamsRes, membersRes] = await Promise.all([
        supabase
          .from('matches')
          .select('team_id')
          .eq('user_id', userId)
          .eq('match_type', 'individual_to_team')
          .not('team_id', 'is', null),
        supabase.from('teams').select('*'),
        supabase
          .from('team_members')
          .select('team_id, user_id, role')
          .eq('status', 'confirmed'),
      ]);

      if (teamsRes.error) {
        console.error('Error fetching teams:', teamsRes.error);
        toast.error('Failed to load teams');
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
          setLoading(false);
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
          .select('*')
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
      const transformedTeams: Team[] = availableTeams.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        studio: t.studio as Studio,
        members: membersByTeam.get(t.id) || [],
        lookingFor: [],
        skillsNeeded: t.skills_needed || [],
        createdBy: t.created_by,
      }));

      if (isMountedRef.current) {
        setTeams(transformedTeams);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
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
    
    if (hasProfile) {
      fetchTeams();
    } else {
      setLoading(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [hasProfile, fetchTeams]);

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
