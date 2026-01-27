/**
 * useMyTeam Hook
 * 
 * Manages the current user's team membership and team data.
 * Uses optimized database functions for atomic operations.
 * 
 * @param userId - Current authenticated user's ID
 * @param profile - Current user's profile data
 * @returns {Object} Team state and management functions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Team, UserProfile, Program, Studio } from '@/types';
import { toast } from 'sonner';
import { validateInput, teamSchema } from '@/lib/validation';

interface UseMyTeamResult {
  /** The user's current team (null if not in a team) */
  myTeam: Team | null;
  /** Whether the team is loading */
  loading: boolean;
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
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const initialFetchDone = useRef(false);

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
   * Fetches and sets the user's team data using parallel queries
   */
  const refreshTeam = useCallback(async () => {
    if (!userId || fetchingRef.current) return;
    
    fetchingRef.current = true;
    
    // Only show loading on initial fetch
    if (!initialFetchDone.current) {
      setLoading(true);
    }

    try {
      // Check if user is a member of any team
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership) {
        if (isMountedRef.current) {
          setMyTeam(null);
          initialFetchDone.current = true;
        }
        return;
      }

      // Parallel fetch: team details and team members
      const [teamRes, membersRes] = await Promise.all([
        supabase
          .from('teams')
          .select('id, name, description, studio, skills_needed, created_by')
          .eq('id', membership.team_id)
          .single(),
        supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', membership.team_id)
          .eq('status', 'confirmed'),
      ]);

      if (teamRes.error) throw teamRes.error;
      const teamData = teamRes.data;

      if (!teamData) {
        if (isMountedRef.current) {
          setMyTeam(null);
          initialFetchDone.current = true;
        }
        return;
      }

      // Fetch member profiles
      const memberUserIds = (membersRes.data || []).map(m => m.user_id);
      let teamMembers: UserProfile[] = [];

      if (memberUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, program, skills, bio, studio_preference, studio_preferences, avatar, linkedin')
          .in('user_id', memberUserIds);

        teamMembers = transformMemberProfiles(profiles || []);
      }

      if (isMountedRef.current) {
        setMyTeam({
          id: teamData.id,
          name: teamData.name,
          description: teamData.description || '',
          studio: teamData.studio as Studio,
          members: teamMembers,
          lookingFor: [],
          skillsNeeded: teamData.skills_needed || [],
          createdBy: teamData.created_by,
        });
        initialFetchDone.current = true;
      }
    } catch (error) {
      console.error('Error refreshing team:', error);
      if (isMountedRef.current) {
        setMyTeam(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [userId, transformMemberProfiles]);

  /**
   * Creates a new team using the optimized database function
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
      // Use the optimized RPC function
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_team_with_owner', {
        p_name: validatedData.name,
        p_description: validatedData.description,
        p_studio: validatedData.studio,
        p_looking_for: validatedData.lookingFor,
        p_skills_needed: validatedData.skillsNeeded,
        p_user_id: userId,
      });

      if (rpcError) {
        console.warn('RPC failed, using fallback:', rpcError);
        await createTeamFallback(validatedData);
        return;
      }

      // Parse the RPC result
      const resultData = rpcResult as { team_id: string; conversation_id: string };

      // Update local state with the new team
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
        id: resultData.team_id,
        name: validatedData.name,
        description: validatedData.description || '',
        studio: validatedData.studio,
        members: [creatorProfile],
        lookingFor: [],
        skillsNeeded: validatedData.skillsNeeded,
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

  /**
   * Fallback method for team creation (sequential operations)
   */
  const createTeamFallback = useCallback(async (validatedData: CreateTeamData) => {
    if (!userId || !profile) return;

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
      skillsNeeded: validatedData.skillsNeeded,
      createdBy: userId,
    });

    toast.success('Team created!', {
      description: `You are now the admin of "${validatedData.name}"`,
    });
  }, [userId, profile]);

  // Initial fetch and cleanup - deferred to not block main content
  useEffect(() => {
    isMountedRef.current = true;
    
    if (profile && userId) {
      // Defer team fetch slightly to prioritize main content
      const timeoutId = setTimeout(() => {
        refreshTeam();
      }, 50);
      
      return () => {
        isMountedRef.current = false;
        clearTimeout(timeoutId);
      };
    } else {
      setLoading(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [profile, userId, refreshTeam]);

  return {
    myTeam,
    loading,
    setMyTeam,
    createTeam,
    refreshTeam,
  };
}
