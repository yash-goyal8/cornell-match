/**
 * useTeams Hook
 * 
 * Fetches and manages teams for the matching system.
 * Handles team data transformation and member profile loading.
 * 
 * @param userId - Current authenticated user's ID
 * @param hasProfile - Whether the current user has completed their profile
 * @returns {Object} teams state and management functions
 */

import { useState, useEffect, useCallback } from 'react';
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

  /**
   * Fetches teams from the database with their members
   * Excludes teams the user has already swiped on or is a member of
   */
  const fetchTeams = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Parallel fetch: swiped teams, all teams, and team members
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
          .eq('status', 'confirmed')
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
        setTeams([]);
        return;
      }

      // Fetch member profiles
      const memberUserIds = [...new Set((membersRes.data || []).map(m => m.user_id))];
      
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

      // Group members by team
      const membersByTeam: Record<string, UserProfile[]> = {};
      (membersRes.data || []).forEach(member => {
        if (!membersByTeam[member.team_id]) {
          membersByTeam[member.team_id] = [];
        }
        const profile = profilesMap[member.user_id];
        if (profile) {
          membersByTeam[member.team_id].push({
            id: profile.id,
            name: profile.name,
            program: profile.program as Program,
            skills: profile.skills || [],
            bio: profile.bio || '',
            studioPreference: profile.studio_preference as Studio,
            studioPreferences: (profile.studio_preferences as Studio[]) || [profile.studio_preference as Studio],
            avatar: profile.avatar || undefined,
            linkedIn: profile.linkedin || undefined,
          });
        }
      });

      // Transform teams data
      const transformedTeams: Team[] = availableTeams.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        studio: t.studio as Studio,
        members: membersByTeam[t.id] || [],
        lookingFor: [],
        skillsNeeded: [],
        createdBy: t.created_by,
      }));

      setTeams(transformedTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch when user has a profile
  useEffect(() => {
    if (hasProfile) {
      fetchTeams();
    }
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
