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
  // Individual swipes right on another individual - creates match and conversation
  const createIndividualToIndividualMatch = useCallback(async (targetProfile: UserProfile) => {
    try {
      // Create match record
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          user_id: currentUserId,
          target_user_id: targetProfile.id,
          match_type: 'individual_to_individual',
          status: 'pending',
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // Create a conversation for them to chat
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          match_id: match.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add both users to the conversation
      const { error: partError1 } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: currentUserId,
        });

      if (partError1) throw partError1;

      const { error: partError2 } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: targetProfile.id,
        });

      if (partError2) throw partError2;

      toast.success(`Interest sent to ${targetProfile.name}!`, {
        description: "You can now chat with them in Messages.",
      });

      onMatchCreated?.();
      return { match, conversation };
    } catch (error) {
      console.error('Error creating individual match:', error);
      toast.error('Failed to send interest');
      return null;
    }
  }, [currentUserId, onMatchCreated]);

  // Team swipes right on an individual - creates a join request
  const createTeamToIndividualMatch = useCallback(async (targetProfile: UserProfile) => {
    if (!myTeam) {
      toast.error("You need to be part of a team to swipe on individuals");
      return null;
    }

    try {
      // Create match record
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          user_id: currentUserId, // Who initiated the swipe
          target_user_id: targetProfile.id,
          team_id: myTeam.id,
          match_type: 'team_to_individual',
          status: 'pending',
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // Create a conversation for negotiation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          match_id: match.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add BOTH parties to the conversation so both can see it
      // Add the target individual
      const { error: partError1 } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: targetProfile.id,
        });

      if (partError1) throw partError1;

      // Add the team initiator (current user)
      const { error: partError2 } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: currentUserId,
        });

      if (partError2) throw partError2;

      toast.success(`Request sent to ${targetProfile.name}!`, {
        description: "They'll be able to chat with your team and decide.",
      });

      onMatchCreated?.();
      return { match, conversation };
    } catch (error) {
      console.error('Error creating team match:', error);
      toast.error('Failed to send request');
      return null;
    }
  }, [currentUserId, myTeam, onMatchCreated]);

  // Individual swipes right on a team - creates a join request
  const createIndividualToTeamMatch = useCallback(async (targetTeam: Team) => {
    try {
      // Create match record
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          user_id: currentUserId,
          target_user_id: targetTeam.createdBy, // Team owner as primary contact
          team_id: targetTeam.id,
          match_type: 'individual_to_team',
          status: 'pending',
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // Create a conversation for negotiation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          match_id: match.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add BOTH parties to the conversation so both can see it
      // Add the individual (current user)
      const { error: partError1 } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: currentUserId,
        });

      if (partError1) throw partError1;

      // Add the team owner as a participant
      const { error: partError2 } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: targetTeam.createdBy,
        });

      if (partError2) throw partError2;

      toast.success(`Request sent to ${targetTeam.name}!`, {
        description: "The team will review your profile and can chat with you.",
      });

      onMatchCreated?.();
      return { match, conversation };
    } catch (error) {
      console.error('Error creating team match:', error);
      toast.error('Failed to send request');
      return null;
    }
  }, [currentUserId, onMatchCreated]);

  // Accept a join request - adds user to team
  const acceptJoinRequest = useCallback(async (matchId: string, teamId: string, userId: string) => {
    try {
      // Check if user is already a team member (prevent duplicates)
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .maybeSingle();

      if (existingMember) {
        toast.error('This user is already a team member');
        // Still update the match status
        await supabase
          .from('matches')
          .update({ status: 'accepted' })
          .eq('id', matchId);
        return true;
      }

      // Update match status
      const { error: matchError } = await supabase
        .from('matches')
        .update({ status: 'accepted' })
        .eq('id', matchId);

      if (matchError) throw matchError;

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

      // Add user to team conversation (with duplicate check)
      const { data: teamConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('team_id', teamId)
        .eq('type', 'team')
        .maybeSingle();

      if (teamConv) {
        // Check if already a participant
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
