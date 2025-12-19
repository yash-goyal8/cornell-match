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

  // DEV MODE: Use mock data since we're bypassing auth
  useEffect(() => {
    if (isOpen) {
      // For dev mode, set empty data
      setConversations([]);
      setMatches([]);
    }
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
