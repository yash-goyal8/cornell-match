/**
 * useTeamMatching Hook
 * 
 * Handles all matching scenarios between users and teams.
 * Uses optimized database functions for atomic operations.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Team, UserProfile } from '@/types';

interface UseTeamMatchingProps {
  currentUserId: string;
  myTeam: Team | null;
  onMatchCreated?: () => void;
}

export const useTeamMatching = ({ currentUserId, myTeam, onMatchCreated }: UseTeamMatchingProps) => {
  /**
   * Creates a match using the optimized RPC function
   * Falls back to sequential operations if RPC fails
   */
  const createMatchWithConversation = useCallback(async (
    targetUserId: string,
    matchType: string,
    teamId: string | null = null,
    conversationType: string = 'match'
  ) => {
    try {
      // Try optimized RPC first
      const { data, error } = await supabase.rpc('create_match_with_conversation', {
        p_user_id: currentUserId,
        p_target_user_id: targetUserId,
        p_match_type: matchType,
        p_team_id: teamId,
        p_conversation_type: conversationType,
      });

      if (error) {
        console.warn('RPC failed, using fallback:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createMatchWithConversation:', error);
      return null;
    }
  }, [currentUserId]);

  /**
   * Fallback for creating match with conversation (sequential operations)
   */
  const createMatchFallback = useCallback(async (
    targetUserId: string,
    matchType: string,
    teamId: string | null = null,
    conversationType: string = 'direct'
  ) => {
    // Create match record
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        user_id: currentUserId,
        target_user_id: targetUserId,
        match_type: matchType,
        team_id: teamId,
        status: 'pending',
      })
      .select()
      .single();

    if (matchError) throw matchError;

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        type: conversationType,
        match_id: match.id,
        team_id: teamId,
      })
      .select()
      .single();

    if (convError) throw convError;

    // Add participants in parallel
    await Promise.all([
      supabase.from('conversation_participants').insert({
        conversation_id: conversation.id,
        user_id: currentUserId,
      }),
      supabase.from('conversation_participants').insert({
        conversation_id: conversation.id,
        user_id: targetUserId,
      }),
    ]);

    return { match_id: match.id, conversation_id: conversation.id };
  }, [currentUserId]);

  // Individual swipes right on another individual
  const createIndividualToIndividualMatch = useCallback(async (targetProfile: UserProfile) => {
    try {
      let result = await createMatchWithConversation(
        targetProfile.id,
        'individual_to_individual',
        null,
        'match'
      );

      if (!result) {
        result = await createMatchFallback(targetProfile.id, 'individual_to_individual');
      }

      toast.success(`Interest sent to ${targetProfile.name}!`, {
        description: "You can now chat with them in Messages.",
      });

      onMatchCreated?.();
      return result;
    } catch (error) {
      console.error('Error creating individual match:', error);
      toast.error('Failed to send interest');
      return null;
    }
  }, [createMatchWithConversation, createMatchFallback, onMatchCreated]);

  // Team swipes right on an individual
  const createTeamToIndividualMatch = useCallback(async (targetProfile: UserProfile) => {
    if (!myTeam) {
      toast.error("You need to be part of a team to swipe on individuals");
      return null;
    }

    try {
      let result = await createMatchWithConversation(
        targetProfile.id,
        'team_to_individual',
        myTeam.id,
        'match'
      );

      if (!result) {
        result = await createMatchFallback(targetProfile.id, 'team_to_individual', myTeam.id);
      }

      toast.success(`Request sent to ${targetProfile.name}!`, {
        description: "They'll be able to chat with your team and decide.",
      });

      onMatchCreated?.();
      return result;
    } catch (error) {
      console.error('Error creating team match:', error);
      toast.error('Failed to send request');
      return null;
    }
  }, [myTeam, createMatchWithConversation, createMatchFallback, onMatchCreated]);

  // Individual swipes right on a team
  const createIndividualToTeamMatch = useCallback(async (targetTeam: Team) => {
    try {
      let result = await createMatchWithConversation(
        targetTeam.createdBy,
        'individual_to_team',
        targetTeam.id,
        'match'
      );

      if (!result) {
        result = await createMatchFallback(targetTeam.createdBy, 'individual_to_team', targetTeam.id);
      }

      toast.success(`Request sent to ${targetTeam.name}!`, {
        description: "The team will review your profile and can chat with you.",
      });

      onMatchCreated?.();
      return result;
    } catch (error) {
      console.error('Error creating team match:', error);
      toast.error('Failed to send request');
      return null;
    }
  }, [createMatchWithConversation, createMatchFallback, onMatchCreated]);

  // Accept a join request - adds user to team
  const acceptJoinRequest = useCallback(async (matchId: string, teamId: string, userId: string) => {
    try {
      // Update match status and add member in parallel where possible
      const [matchUpdate, existingMember] = await Promise.all([
        supabase
          .from('matches')
          .update({ status: 'accepted' })
          .eq('id', matchId),
        supabase
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('user_id', userId)
          .eq('status', 'confirmed')
          .maybeSingle(),
      ]);

      if (matchUpdate.error) throw matchUpdate.error;

      if (existingMember.data) {
        toast.info('This user is already a team member');
        return true;
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          role: 'member',
          status: 'confirmed',
        });

      if (memberError) throw memberError;

      // Add user to team conversation
      const { data: teamConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('team_id', teamId)
        .eq('type', 'team')
        .maybeSingle();

      if (teamConv) {
        const { data: existingParticipant } = await supabase
          .from('conversation_participants')
          .select('id')
          .eq('conversation_id', teamConv.id)
          .eq('user_id', userId)
          .maybeSingle();

        if (!existingParticipant) {
          await supabase
            .from('conversation_participants')
            .insert({
              conversation_id: teamConv.id,
              user_id: userId,
            });
        }
      }

      toast.success('Member added to team!');
      return true;
    } catch (error) {
      console.error('Error accepting join request:', error);
      toast.error('Failed to accept request');
      return false;
    }
  }, []);

  // Reject a join request
  const rejectJoinRequest = useCallback(async (matchId: string) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'rejected' })
        .eq('id', matchId);

      if (error) throw error;

      toast.info('Request declined');
      return true;
    } catch (error) {
      console.error('Error rejecting join request:', error);
      toast.error('Failed to decline request');
      return false;
    }
  }, []);

  return {
    createIndividualToIndividualMatch,
    createTeamToIndividualMatch,
    createIndividualToTeamMatch,
    acceptJoinRequest,
    rejectJoinRequest,
  };
};
