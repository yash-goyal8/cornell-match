import { useState, useEffect } from 'react';
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

  // Fetch all chat data in optimized parallel batches
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // === ROUND 1: All independent base queries in parallel ===
        const [participationsRes, teamMembershipsRes, userMatchesRes] = await Promise.all([
          supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', currentUserId),
          supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', currentUserId)
            .eq('status', 'confirmed'),
          supabase
            .from('matches')
            .select('*')
            .or(`user_id.eq.${currentUserId},target_user_id.eq.${currentUserId}`),
        ]);

        const teamIds = (teamMembershipsRes.data || []).map(m => m.team_id);
        setUserTeamIds(teamIds);
        const participantConvIds = (participationsRes.data || []).map(p => p.conversation_id);

        // Merge user matches with team matches (if any) — single additional query only if needed
        const allMatchesMap = new Map<string, any>();
        (userMatchesRes.data || []).forEach((m: any) => allMatchesMap.set(m.id, m));

        if (teamIds.length > 0) {
          const { data: teamMatches } = await supabase
            .from('matches')
            .select('*')
            .in('team_id', teamIds);
          (teamMatches || []).forEach((m: any) => allMatchesMap.set(m.id, m));
        }

        const allMatches = Array.from(allMatchesMap.values());
        const matchIds = allMatches.map(m => m.id);

        // === ROUND 2: Get conversations + unread count in parallel ===
        const unreadPromise = supabase.rpc('get_unread_count', { p_user_id: currentUserId });
        const matchConvPromise = matchIds.length > 0
          ? supabase.from('conversations').select('id').in('match_id', matchIds)
          : Promise.resolve({ data: [] as { id: string }[] });

        const [unreadCountRes, matchConvsRes] = await Promise.all([unreadPromise, matchConvPromise]);
        const matchConvIds = (matchConvsRes?.data || []).map((c: any) => c.id);
        const allConvIds = [...new Set([...participantConvIds, ...matchConvIds])];

        if (allConvIds.length === 0) {
          setConversations([]);
          setUnreadCounts({});
          // Still build matches from allMatches with profiles
          await buildMatchesTab(allMatches, new Map());
          return;
        }

        // === ROUND 3: Fetch ALL remaining data in one parallel batch ===
        // Collect user/team IDs we'll need from matches (known already)
        const userIdsNeeded = new Set<string>();
        const teamIdsNeeded = new Set<string>();
        allMatches.forEach(m => {
          userIdsNeeded.add(m.user_id);
          userIdsNeeded.add(m.target_user_id);
          if (m.team_id) teamIdsNeeded.add(m.team_id);
        });
        userIdsNeeded.delete(currentUserId);

        const [convDataRes, allParticipantsRes, profilesRes, teamsRes, memberCountsRes] = await Promise.all([
          supabase.from('conversations').select('*').in('id', allConvIds),
          supabase
            .from('conversation_participants')
            .select('conversation_id, user_id')
            .in('conversation_id', allConvIds)
            .neq('user_id', currentUserId),
          supabase
            .from('profiles')
            .select('user_id, name, avatar, program')
            .in('user_id', Array.from(userIdsNeeded)),
          teamIdsNeeded.size > 0
            ? supabase.from('teams').select('id, name').in('id', Array.from(teamIdsNeeded))
            : Promise.resolve({ data: [] }),
          teamIdsNeeded.size > 0
            ? supabase.from('team_members').select('team_id').in('team_id', Array.from(teamIdsNeeded)).eq('status', 'confirmed')
            : Promise.resolve({ data: [] }),
        ]);

        const convData = convDataRes.data || [];

        // Add participant user IDs that weren't in matches
        const extraUserIds: string[] = [];
        (allParticipantsRes.data || []).forEach((p: any) => {
          if (!userIdsNeeded.has(p.user_id)) extraUserIds.push(p.user_id);
        });
        // Add team IDs from conversations not in matches
        convData.forEach(c => { if (c.team_id && !teamIdsNeeded.has(c.team_id)) teamIdsNeeded.add(c.team_id); });

        // Fetch any extra profiles/teams we discovered (usually none)
        let extraProfilesMap = new Map<string, any>();
        if (extraUserIds.length > 0) {
          const { data } = await supabase.from('profiles').select('user_id, name, avatar, program').in('user_id', extraUserIds);
          (data || []).forEach((p: any) => extraProfilesMap.set(p.user_id, p));
        }

        // Build lookup maps
        const profilesMap = new Map<string, any>();
        (profilesRes.data || []).forEach((p: any) => profilesMap.set(p.user_id, p));
        extraProfilesMap.forEach((v, k) => profilesMap.set(k, v));

        const teamsMap = new Map<string, any>();
        (teamsRes.data || []).forEach((t: any) => teamsMap.set(t.id, t));

        const memberCountMap = new Map<string, number>();
        (memberCountsRes.data || []).forEach((row: any) => {
          memberCountMap.set(row.team_id, (memberCountMap.get(row.team_id) || 0) + 1);
        });

        const matchesById = new Map<string, any>();
        allMatches.forEach(m => matchesById.set(m.id, m));

        const participantsByConv = new Map<string, string[]>();
        (allParticipantsRes.data || []).forEach((p: any) => {
          const list = participantsByConv.get(p.conversation_id) || [];
          list.push(p.user_id);
          participantsByConv.set(p.conversation_id, list);
        });

        // === ASSEMBLE conversations (no N+1) ===
        const conversationsWithDetails: Conversation[] = convData.map(conv => {
          let otherUser = undefined;
          let team = undefined;
          let match = undefined;

          if (conv.match_id) {
            const matchData = matchesById.get(conv.match_id);
            if (matchData) {
              if (matchData.match_type === 'individual_to_individual') {
                const otherUserId = matchData.user_id === currentUserId
                  ? matchData.target_user_id : matchData.user_id;
                const profile = profilesMap.get(otherUserId);
                if (profile) {
                  otherUser = { id: profile.user_id, name: profile.name, avatar: profile.avatar || '' };
                }
              } else {
                const teamData = matchData.team_id ? teamsMap.get(matchData.team_id) : null;
                const individualUserId = matchData.match_type === 'team_to_individual'
                  ? matchData.target_user_id : matchData.user_id;
                const individualProfile = profilesMap.get(individualUserId);

                match = {
                  id: matchData.id,
                  user_id: matchData.user_id,
                  target_user_id: matchData.target_user_id,
                  team_id: matchData.team_id,
                  match_type: matchData.match_type as 'team_to_individual' | 'individual_to_team',
                  status: matchData.status as 'pending' | 'matched' | 'rejected' | 'accepted',
                  team: teamData ? { id: teamData.id, name: teamData.name } : undefined,
                  individual_profile: individualProfile ? {
                    id: individualProfile.user_id, name: individualProfile.name,
                    avatar: individualProfile.avatar || '', program: individualProfile.program,
                  } : undefined,
                };

                if (individualProfile) {
                  otherUser = { id: individualProfile.user_id, name: individualProfile.name, avatar: individualProfile.avatar || '' };
                }
                if (teamData) {
                  team = { id: teamData.id, name: teamData.name };
                }
              }
            }
          } else if (conv.type === 'direct' || conv.type === 'match') {
            const otherUserIds = participantsByConv.get(conv.id) || [];
            const otherUserId = otherUserIds[0];
            if (otherUserId) {
              const profile = profilesMap.get(otherUserId);
              if (profile) {
                otherUser = { id: profile.user_id, name: profile.name, avatar: profile.avatar || '' };
              }
            }
          } else if (conv.type === 'team' && conv.team_id) {
            const teamData = teamsMap.get(conv.team_id);
            if (teamData) {
              team = { id: teamData.id, name: teamData.name, member_count: memberCountMap.get(conv.team_id) || 0 };
            }
          }

          return {
            ...conv, type: conv.type as 'direct' | 'team' | 'match',
            other_user: otherUser, team, match,
          };
        });

        setConversations(conversationsWithDetails);
        setUnreadCounts({});

        // Build matches tab reusing already-fetched profiles (no duplicate query!)
        await buildMatchesTab(allMatches, profilesMap);
      } catch (error) {
        console.error('Error fetching chat data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const buildMatchesTab = async (allMatches: any[], profilesMap: Map<string, any>) => {
      const individualMatches = allMatches.filter(m =>
        m.match_type === 'individual' || m.match_type === 'individual_to_individual'
      );

      // Check if we need any profiles not already cached
      const missingIds = individualMatches
        .map(m => m.user_id === currentUserId ? m.target_user_id : m.user_id)
        .filter(id => !profilesMap.has(id));

      if (missingIds.length > 0) {
        const { data } = await supabase.from('profiles').select('user_id, name, avatar, program').in('user_id', missingIds);
        (data || []).forEach((p: any) => profilesMap.set(p.user_id, p));
      }

      const finalMatches: Match[] = individualMatches.map(match => {
        const otherUserId = match.user_id === currentUserId ? match.target_user_id : match.user_id;
        const profile = profilesMap.get(otherUserId);
        return {
          ...match,
          match_type: match.match_type as 'individual' | 'individual_to_individual' | 'team_to_individual' | 'individual_to_team',
          status: match.status as 'pending' | 'matched' | 'rejected' | 'accepted',
          target_profile: profile ? {
            id: profile.user_id, name: profile.name, avatar: profile.avatar || '', program: profile.program,
          } : undefined,
        };
      });

      setMatches(finalMatches);
    };

    fetchData();
  }, [isOpen, currentUserId]);

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
    
    // Mark messages as read using optimized RPC
    try {
      await supabase.rpc('upsert_message_read', {
        p_conversation_id: conversation.id,
        p_user_id: currentUserId,
      });
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
        (c.type === 'direct' || c.type === 'match') &&
        c.other_user?.id === otherUserId
    );

    if (existingConv) {
      handleSelectConversation(existingConv);
      return;
    }

    try {
      setIsLoading(true);

      // Create conversation linked to the match - use 'match' type for RLS policy
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({ 
          type: 'match',
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
        type: conversation.type as 'direct' | 'team' | 'match',
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
            currentUserId={currentUserId}
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
