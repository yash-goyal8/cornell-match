/**
 * useMyTeam Hook
 * 
 * Manages the current user's team membership and team data.
 * Handles team creation, updates, and deletion.
 * 
 * @param userId - Current authenticated user's ID
 * @param profile - Current user's profile data
 * @returns {Object} Team state and management functions
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Team, UserProfile, Program, Studio } from '@/types';
import { toast } from 'sonner';
import { validateInput, teamSchema } from '@/lib/validation';

interface UseMyTeamResult {
  /** The user's current team (null if not in a team) */
  myTeam: Team | null;
  /** Set the team directly */
  setMyTeam: React.Dispatch<React.SetStateAction<Team | null>>;
  /** Create a new team */
  createTeam: (teamData: CreateTeamData) => Promise<void>;
  /** Refresh team data from database */
  refreshTeam: () => Promise<void>;
}

interface CreateTeamData {
  name: string;
  description: string;
  studio: Studio;
  lookingFor: string;
  skillsNeeded: string[];
}

export function useMyTeam(
  userId: string | undefined,
  profile: any
): UseMyTeamResult {
  const [myTeam, setMyTeam] = useState<Team | null>(null);

  /**
   * Transforms member profiles from database format to UserProfile
   */
  const transformMemberProfiles = useCallback((profiles: any[]): UserProfile[] => {
    return profiles.map(p => ({
      id: p.user_id,
      name: p.name,
      program: p.program as Program,
      skills: p.skills || [],
      bio: p.bio || '',
      studioPreference: p.studio_preference as Studio,
      studioPreferences: (p.studio_preferences as Studio[]) || [p.studio_preference as Studio],
      avatar: p.avatar || '',
      linkedIn: p.linkedin,
    }));
  }, []);

  /**
   * Fetches and sets the user's team data
   */
  const refreshTeam = useCallback(async () => {
    if (!userId) return;

    // Check if user is a member of any team
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (!membership) {
      setMyTeam(null);
      return;
    }

    // Fetch team details
    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('id', membership.team_id)
      .single();

    if (!teamData) {
      setMyTeam(null);
      return;
    }

    // Fetch team members
    const { data: members } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamData.id)
      .eq('status', 'confirmed');

    const memberUserIds = (members || []).map(m => m.user_id);
    let teamMembers: UserProfile[] = [];

    if (memberUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', memberUserIds);

      teamMembers = transformMemberProfiles(profiles || []);
    }

    setMyTeam({
      id: teamData.id,
      name: teamData.name,
      description: teamData.description || '',
      studio: teamData.studio as Studio,
      members: teamMembers,
      lookingFor: [],
      skillsNeeded: [],
      createdBy: teamData.created_by,
    });
  }, [userId, transformMemberProfiles]);

  /**
   * Creates a new team with the current user as owner
   */
  const createTeam = useCallback(async (teamData: CreateTeamData) => {
    if (!userId || !profile) return;

    // Validate input
    const validation = validateInput(teamSchema, teamData);
    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }
    const validatedData = (validation as { success: true; data: typeof teamData }).data;

    try {
      // 1. Create the team
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: validatedData.name,
          description: validatedData.description,
          studio: validatedData.studio,
          looking_for: validatedData.lookingFor,
          skills_needed: validatedData.skillsNeeded,
          created_by: userId,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // 2. Add creator as owner member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: newTeam.id,
          user_id: userId,
          role: 'owner',
          status: 'confirmed',
        });

      if (memberError) throw memberError;

      // 3. Create team conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'team',
          team_id: newTeam.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // 4. Add creator to conversation participants
      await supabase.from('conversation_participants').insert({
        conversation_id: conversation.id,
        user_id: userId,
      });

      // Update local state
      const creatorProfile: UserProfile = {
        id: userId,
        name: profile.name || 'You',
        program: (profile.program as Program) || 'MBA',
        skills: profile.skills || [],
        bio: profile.bio || '',
        studioPreference: (profile.studioPreference as Studio) || 'startup',
        studioPreferences: profile.studioPreferences || [profile.studioPreference || 'startup'],
        avatar: profile.avatar || '',
        linkedIn: profile.linkedIn,
      };

      setMyTeam({
        id: newTeam.id,
        name: newTeam.name,
        description: newTeam.description || '',
        studio: newTeam.studio as Studio,
        members: [creatorProfile],
        lookingFor: [],
        skillsNeeded: [],
        createdBy: userId,
      });

      toast.success('Team created!', {
        description: `You are now the admin of "${teamData.name}"`,
      });
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
      throw error;
    }
  }, [userId, profile]);

  // Initial fetch
  useEffect(() => {
    if (profile) {
      refreshTeam();
    }
  }, [profile, refreshTeam]);

  return {
    myTeam,
    setMyTeam,
    createTeam,
    refreshTeam,
  };
}
