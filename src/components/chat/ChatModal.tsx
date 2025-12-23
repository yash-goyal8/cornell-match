import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChatList } from './ChatList';
import { ChatRoom } from './ChatRoom';
import { Conversation, Message, Match } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export const ChatModal = ({ isOpen, onClose, currentUserId }: ChatModalProps) => {
  const [view, setView] = useState<'list' | 'room'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch conversations and matches when modal opens
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch user's conversations
        const { data: participations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', currentUserId);

        if (participations && participations.length > 0) {
          const conversationIds = participations.map((p) => p.conversation_id);
          
          const { data: convData } = await supabase
            .from('conversations')
            .select('*')
            .in('id', conversationIds);

          // Get other participants for each conversation
          const conversationsWithUsers: Conversation[] = await Promise.all(
            (convData || []).map(async (conv) => {
              if (conv.type === 'direct') {
                // Get other user in conversation
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

                  return {
                    ...conv,
                    type: conv.type as 'direct' | 'team',
                    other_user: profile ? {
                      id: profile.user_id,
                      name: profile.name,
                      avatar: profile.avatar || '',
                    } : undefined,
                  };
                }
              }
              return { ...conv, type: conv.type as 'direct' | 'team' };
            })
          );

          setConversations(conversationsWithUsers);
        }

        // Fetch matches where both users have swiped right
        const { data: matchData } = await supabase
          .from('matches')
          .select('*')
          .or(`user_id.eq.${currentUserId},target_user_id.eq.${currentUserId}`)
          .eq('status', 'matched');

        // Get profiles for matched users
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
              status: match.status as 'pending' | 'matched' | 'rejected',
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
          
          // Fetch sender info
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

      // Fetch sender profiles
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

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
    setView('room');
  };

  const handleStartChat = async (match: Match) => {
    // Check if conversation already exists
    const existingConv = conversations.find(
      (c) =>
        c.type === 'direct' &&
        c.other_user?.id === match.target_user_id
    );

    if (existingConv) {
      handleSelectConversation(existingConv);
      return;
    }

    // Create new conversation
    try {
      setIsLoading(true);

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({ type: 'direct' })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: conversation.id, user_id: currentUserId },
          { conversation_id: conversation.id, user_id: match.target_user_id },
        ]);

      if (partError) throw partError;

      // Create conversation object with other user info
      const newConversation: Conversation = {
        id: conversation.id,
        type: conversation.type as 'direct' | 'team',
        team_id: conversation.team_id || undefined,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        other_user: {
          id: match.target_user_id,
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

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: selectedConversation.id,
        sender_id: currentUserId,
        content,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleBack = () => {
    if (view === 'room') {
      setView('list');
      setSelectedConversation(null);
      setMessages([]);
    } else {
      onClose();
    }
  };

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
          />
        ) : selectedConversation ? (
          <ChatRoom
            conversation={selectedConversation}
            messages={messages}
            currentUserId={currentUserId}
            onBack={handleBack}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
