import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChatList } from './ChatList';
import { ChatRoom } from './ChatRoom';
import { Conversation, Message, Match, JoinRequestMatch } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { messageSchema, validateInput } from '@/lib/validation';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onMemberAdded?: () => void;
}

export const ChatModal = ({ isOpen, onClose, currentUserId, onMemberAdded }: ChatModalProps) => {
  const [view, setView] = useState<'list' | 'room'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userTeamIds, setUserTeamIds] = useState<string[]>([]);
  const [joinRequestMatch, setJoinRequestMatch] = useState<JoinRequestMatch | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'chats' | 'matches'>('chats');

  // Check which teams the user is a member of
  const fetchUserTeams = useCallback(async () => {
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', currentUserId)
      .eq('status', 'confirmed');
    
    setUserTeamIds((memberships || []).map(m => m.team_id));
  }, [currentUserId]);

  // Fetch unread message counts for conversations
  const fetchUnreadCounts = useCallback(async (conversationIds: string[]) => {
    if (conversationIds.length === 0) {
      setUnreadCounts({});
      return;
    }

    const counts: Record<string, number> = {};

    // Get user's last read timestamps for each conversation
    const { data: reads } = await supabase
      .from('message_reads')
      .select('conversation_id, last_read_at')
      .eq('user_id', currentUserId)
      .in('conversation_id', conversationIds);

    const readMap = new Map((reads || []).map(r => [r.conversation_id, r.last_read_at]));

    // For each conversation, count messages after last_read_at
    await Promise.all(
      conversationIds.map(async (convId) => {
        const lastReadAt = readMap.get(convId);
        
        let query = supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .neq('sender_id', currentUserId);

        if (lastReadAt) {
          query = query.gt('created_at', lastReadAt);
        }

        const { count } = await query;
        counts[convId] = count || 0;
      })
    );

    setUnreadCounts(counts);
  }, [currentUserId]);

  // Fetch conversations and matches when modal opens
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        await fetchUserTeams();

        // Fetch user's direct conversations (as participant)
        const { data: participations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', currentUserId);

        const participantConvIds = (participations || []).map(p => p.conversation_id);

        // Also fetch conversations related to team matches (where user is team member)
        const { data: teamMemberships } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', currentUserId)
          .eq('status', 'confirmed');

        const teamIds = (teamMemberships || []).map(m => m.team_id);
        
        let teamMatchConvIds: string[] = [];
        if (teamIds.length > 0) {
          // Find matches involving user's teams
          const { data: teamMatches } = await supabase
            .from('matches')
            .select('id')
            .in('team_id', teamIds);

          const matchIds = (teamMatches || []).map(m => m.id);
          
          if (matchIds.length > 0) {
            const { data: matchConvs } = await supabase
              .from('conversations')
              .select('id')
              .in('match_id', matchIds);
            
            teamMatchConvIds = (matchConvs || []).map(c => c.id);
          }
        }

        // Also fetch conversations from individual matches where user is participant
        const { data: individualMatches } = await supabase
          .from('matches')
          .select('id')
          .or(`user_id.eq.${currentUserId},target_user_id.eq.${currentUserId}`)
          .in('match_type', ['individual_to_individual', 'team_to_individual', 'individual_to_team']);

        let individualMatchConvIds: string[] = [];
        if (individualMatches && individualMatches.length > 0) {
          const matchIds = individualMatches.map(m => m.id);
          const { data: matchConvs } = await supabase
            .from('conversations')
            .select('id')
            .in('match_id', matchIds);
          
          individualMatchConvIds = (matchConvs || []).map(c => c.id);
        }

        // Combine and dedupe conversation IDs
        const allConvIds = [...new Set([...participantConvIds, ...teamMatchConvIds, ...individualMatchConvIds])];

        if (allConvIds.length > 0) {
          const { data: convData } = await supabase
            .from('conversations')
            .select('*')
            .in('id', allConvIds);

          // Get other participants and match details for each conversation
          const conversationsWithDetails: Conversation[] = await Promise.all(
            (convData || []).map(async (conv) => {
              let otherUser = undefined;
              let team = undefined;
              let match = undefined;

              // If this conversation has a match, fetch match details
              if (conv.match_id) {
                const { data: matchData } = await supabase
                  .from('matches')
                  .select('*')
                  .eq('id', conv.match_id)
                  .single();

                if (matchData) {
                  // Handle individual_to_individual matches (no team involved)
                  if (matchData.match_type === 'individual_to_individual') {
                    // Determine who the "other" person is
                    const otherUserId = matchData.user_id === currentUserId 
                      ? matchData.target_user_id 
                      : matchData.user_id;

                    const { data: otherProfile } = await supabase
                      .from('profiles')
                      .select('user_id, name, avatar, program')
                      .eq('user_id', otherUserId)
                      .single();

                    if (otherProfile) {
                      otherUser = {
                        id: otherProfile.user_id,
                        name: otherProfile.name,
                        avatar: otherProfile.avatar || '',
                      };
                    }
                  } else {
                    // Team-based matches (team_to_individual or individual_to_team)
                    // Get team info
                    const { data: teamData } = await supabase
                      .from('teams')
                      .select('id, name')
                      .eq('id', matchData.team_id)
                      .single();

                    // Determine who the "other" person is based on match type
                    const individualUserId = matchData.match_type === 'team_to_individual' 
                      ? matchData.target_user_id 
                      : matchData.user_id;

                    const { data: individualProfile } = await supabase
                      .from('profiles')
                      .select('user_id, name, avatar, program')
                      .eq('user_id', individualUserId)
                      .single();

                    match = {
                      id: matchData.id,
                      user_id: matchData.user_id,
                      target_user_id: matchData.target_user_id,
                      team_id: matchData.team_id,
                      match_type: matchData.match_type as 'team_to_individual' | 'individual_to_team',
                      status: matchData.status as 'pending' | 'matched' | 'rejected' | 'accepted',
                      team: teamData ? { id: teamData.id, name: teamData.name } : undefined,
                      individual_profile: individualProfile ? {
                        id: individualProfile.user_id,
                        name: individualProfile.name,
                        avatar: individualProfile.avatar || '',
                        program: individualProfile.program,
                      } : undefined,
                    };

                    // Set other_user based on the individual in the request
                    if (individualProfile) {
                      otherUser = {
                        id: individualProfile.user_id,
                        name: individualProfile.name,
                        avatar: individualProfile.avatar || '',
                      };
                    }

                    if (teamData) {
                      team = { id: teamData.id, name: teamData.name };
                    }
                  }
                }
              } else if (conv.type === 'direct') {
                // Regular direct conversation
                const { data: participants } = await supabase
                  .from('conversation_participants')
                  .select('user_id')
                  .eq('conversation_id', conv.id)
                  .neq('user_id', currentUserId);

                const otherUserId = participants?.[0]?.user_id;
                
                if (otherUserId) {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('user_id, name, avatar')
                    .eq('user_id', otherUserId)
                    .single();

                  if (profile) {
                    otherUser = {
                      id: profile.user_id,
                      name: profile.name,
                      avatar: profile.avatar || '',
                    };
                  }
                }
              } else if (conv.type === 'team' && conv.team_id) {
                // Team conversation - fetch team info and member count
                const [teamResult, memberCountResult] = await Promise.all([
                  supabase
                    .from('teams')
                    .select('id, name')
                    .eq('id', conv.team_id)
                    .single(),
                  supabase
                    .from('team_members')
                    .select('id', { count: 'exact', head: true })
                    .eq('team_id', conv.team_id)
                    .eq('status', 'confirmed')
                ]);

                if (teamResult.data) {
                  team = { 
                    id: teamResult.data.id, 
                    name: teamResult.data.name,
                    member_count: memberCountResult.count || 0
                  };
                }
              }

              return {
                ...conv,
                type: conv.type as 'direct' | 'team',
                other_user: otherUser,
                team,
                match,
              };
            })
          );

          setConversations(conversationsWithDetails);
          
          // Fetch unread counts for each conversation
          await fetchUnreadCounts(conversationsWithDetails.map(c => c.id));
        } else {
          setConversations([]);
          setUnreadCounts({});
        }

        // Fetch individual matches (for the Matches tab) - includes individual_to_individual
        const { data: matchData } = await supabase
          .from('matches')
          .select('*')
          .or(`user_id.eq.${currentUserId},target_user_id.eq.${currentUserId}`)
          .in('match_type', ['individual', 'individual_to_individual']);

        const matchesWithProfiles: Match[] = await Promise.all(
          (matchData || []).map(async (match) => {
            const otherUserId = match.user_id === currentUserId 
              ? match.target_user_id 
              : match.user_id;
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, name, avatar, program')
              .eq('user_id', otherUserId)
              .single();

            return {
              ...match,
              match_type: match.match_type as 'individual' | 'individual_to_individual' | 'team_to_individual' | 'individual_to_team',
              status: match.status as 'pending' | 'matched' | 'rejected' | 'accepted',
              target_profile: profile ? {
                id: profile.user_id,
                name: profile.name,
                avatar: profile.avatar || '',
                program: profile.program,
              } : undefined,
            };
          })
        );

        setMatches(matchesWithProfiles);
      } catch (error) {
        console.error('Error fetching chat data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, currentUserId, fetchUserTeams]);

  // Subscribe to new messages when in a conversation
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, avatar')
            .eq('user_id', newMessage.sender_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...newMessage, sender: profile || undefined },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  const fetchMessages = async (conversationId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const senderIds = [...new Set(data?.map((m) => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, avatar')
        .in('user_id', senderIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, { name: p.name, avatar: p.avatar || '' }])
      );

      const messagesWithSenders = (data || []).map((m) => ({
        ...m,
        sender: profileMap.get(m.sender_id),
      }));

      setMessages(messagesWithSenders);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setJoinRequestMatch(conversation.match || null);
    fetchMessages(conversation.id);
    setView('room');
    
    // Mark messages as read by updating/inserting last_read_at
    try {
      const { data: existingRead } = await supabase
        .from('message_reads')
        .select('id')
        .eq('conversation_id', conversation.id)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (existingRead) {
        await supabase
          .from('message_reads')
          .update({ last_read_at: new Date().toISOString() })
          .eq('id', existingRead.id);
      } else {
        await supabase
          .from('message_reads')
          .insert({
            conversation_id: conversation.id,
            user_id: currentUserId,
            last_read_at: new Date().toISOString(),
          });
      }

      // Update unread count for this conversation
      setUnreadCounts(prev => ({ ...prev, [conversation.id]: 0 }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleStartChat = async (match: Match) => {
    // Determine who the "other" user is - could be user_id or target_user_id depending on who swiped
    const otherUserId = match.user_id === currentUserId ? match.target_user_id : match.user_id;
    
    // First check if a conversation already exists for this match
    const existingConvByMatch = conversations.find(c => c.match_id === match.id);
    if (existingConvByMatch) {
      handleSelectConversation(existingConvByMatch);
      return;
    }

    // Also check by other_user for backwards compatibility
    const existingConv = conversations.find(
      (c) =>
        c.type === 'direct' &&
        c.other_user?.id === otherUserId
    );

    if (existingConv) {
      handleSelectConversation(existingConv);
      return;
    }

    try {
      setIsLoading(true);

      // Create conversation linked to the match
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({ 
          type: 'direct',
          match_id: match.id 
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add both participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: conversation.id, user_id: currentUserId },
          { conversation_id: conversation.id, user_id: otherUserId },
        ]);

      if (partError) throw partError;

      const newConversation: Conversation = {
        id: conversation.id,
        type: conversation.type as 'direct' | 'team',
        team_id: conversation.team_id || undefined,
        match_id: conversation.match_id || undefined,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        other_user: {
          id: otherUserId,
          name: match.target_profile?.name || 'Unknown',
          avatar: match.target_profile?.avatar || '',
        },
      };

      setConversations((prev) => [newConversation, ...prev]);
      handleSelectConversation(newConversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;

    const validation = validateInput(messageSchema, {
      content,
      conversationId: selectedConversation.id,
      senderId: currentUserId,
    });
    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }
    const validatedData = (validation as { success: true; data: { content: string; conversationId: string; senderId: string } }).data;

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: validatedData.conversationId,
        sender_id: validatedData.senderId,
        content: validatedData.content,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleAcceptRequest = async () => {
    if (!joinRequestMatch) return;

    try {
      // Determine who to add to the team
      const userToAdd = joinRequestMatch.match_type === 'team_to_individual'
        ? joinRequestMatch.target_user_id
        : joinRequestMatch.user_id;

      // Check if user is already a team member (prevent duplicates)
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', joinRequestMatch.team_id)
        .eq('user_id', userToAdd)
        .eq('status', 'confirmed')
        .maybeSingle();

      if (existingMember) {
        toast.error('This user is already a team member');
        // Still update the match status to accepted
        await supabase
          .from('matches')
          .update({ status: 'accepted' })
          .eq('id', joinRequestMatch.id);
        
        setJoinRequestMatch({ ...joinRequestMatch, status: 'accepted' });
        return;
      }

      // Update match status
      const { error: matchError } = await supabase
        .from('matches')
        .update({ status: 'accepted' })
        .eq('id', joinRequestMatch.id);

      if (matchError) throw matchError;

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: joinRequestMatch.team_id,
          user_id: userToAdd,
          role: 'member',
          status: 'confirmed',
        });

      if (memberError) throw memberError;

      // Add user to team conversation (check for duplicates)
      const { data: teamConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('team_id', joinRequestMatch.team_id)
        .eq('type', 'team')
        .maybeSingle();

      if (teamConv) {
        // Check if already a participant
        const { data: existingParticipant } = await supabase
          .from('conversation_participants')
          .select('id')
          .eq('conversation_id', teamConv.id)
          .eq('user_id', userToAdd)
          .maybeSingle();

        if (!existingParticipant) {
          await supabase
            .from('conversation_participants')
            .insert({
              conversation_id: teamConv.id,
              user_id: userToAdd,
            });
        }
      }

      // Update local state
      setJoinRequestMatch({ ...joinRequestMatch, status: 'accepted' });
      
      // Update conversation in list
      setConversations(prev => prev.map(c => 
        c.id === selectedConversation?.id 
          ? { ...c, match: { ...joinRequestMatch, status: 'accepted' as const } }
          : c
      ));

      toast.success('Member added to team!');
      onMemberAdded?.();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async () => {
    if (!joinRequestMatch) return;

    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'rejected' })
        .eq('id', joinRequestMatch.id);

      if (error) throw error;

      setJoinRequestMatch({ ...joinRequestMatch, status: 'rejected' });
      
      setConversations(prev => prev.map(c => 
        c.id === selectedConversation?.id 
          ? { ...c, match: { ...joinRequestMatch, status: 'rejected' as const } }
          : c
      ));

      toast.info('Request declined');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to decline request');
    }
  };

  const handleBack = () => {
    if (view === 'room') {
      setView('list');
      setSelectedConversation(null);
      setJoinRequestMatch(null);
      setMessages([]);
    } else {
      onClose();
    }
  };

  // Check if current user is a team member for the selected conversation's match
  const isTeamMember = joinRequestMatch 
    ? userTeamIds.includes(joinRequestMatch.team_id)
    : false;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md h-[80vh] p-0 gap-0 overflow-hidden">
        {isLoading && view === 'list' ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : view === 'list' ? (
          <ChatList
            conversations={conversations}
            matches={matches}
            onSelectConversation={handleSelectConversation}
            onStartChat={handleStartChat}
            onBack={onClose}
            selectedId={selectedConversation?.id}
            unreadCounts={unreadCounts}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        ) : selectedConversation ? (
          <ChatRoom
            conversation={selectedConversation}
            messages={messages}
            currentUserId={currentUserId}
            onBack={handleBack}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            joinRequestMatch={joinRequestMatch || undefined}
            isTeamMember={isTeamMember}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
