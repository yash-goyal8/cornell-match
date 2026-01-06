import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Message, Conversation, JoinRequestMatch } from '@/types/chat';
import { JoinRequestBanner } from './JoinRequestBanner';
import { cn } from '@/lib/utils';

interface ChatRoomProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  onBack: () => void;
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  // Join request specific props
  joinRequestMatch?: JoinRequestMatch;
  isTeamMember?: boolean;
  onAcceptRequest?: () => Promise<void>;
  onRejectRequest?: () => Promise<void>;
}

export const ChatRoom = ({
  conversation,
  messages,
  currentUserId,
  onBack,
  onSendMessage,
  isLoading,
  joinRequestMatch,
  isTeamMember = false,
  onAcceptRequest,
  onRejectRequest,
}: ChatRoomProps) => {
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const chatName = conversation.type === 'direct' 
    ? conversation.other_user?.name 
    : conversation.team?.name;

  const chatAvatar = conversation.type === 'direct'
    ? conversation.other_user?.avatar
    : undefined;

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={chatAvatar} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {conversation.type === 'direct' 
              ? chatName?.charAt(0) || '?'
              : <Users className="w-4 h-4" />
            }
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-foreground truncate">{chatName}</h2>
          {conversation.type === 'team' && (
            <p className="text-xs text-muted-foreground">
              {conversation.team?.member_count || 0} member{(conversation.team?.member_count || 0) !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Join Request Banner */}
      {joinRequestMatch && onAcceptRequest && onRejectRequest && (
        <JoinRequestBanner
          match={joinRequestMatch}
          currentUserId={currentUserId}
          isTeamMember={isTeamMember}
          onAccept={onAcceptRequest}
          onReject={onRejectRequest}
        />
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {Object.entries(groupedMessages).map(([date, dayMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 text-xs bg-muted text-muted-foreground rounded-full">
                  {date === new Date().toLocaleDateString() ? 'Today' : date}
                </span>
              </div>

              {/* Messages for this date */}
              <AnimatePresence>
                {dayMessages.map((message, index) => {
                  const isOwn = message.sender_id === currentUserId;
                  const showAvatar = !isOwn && (
                    index === 0 || 
                    dayMessages[index - 1]?.sender_id !== message.sender_id
                  );

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "flex items-end gap-2 mb-2",
                        isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      {!isOwn && (
                        <div className="w-8">
                          {showAvatar && (
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={message.sender?.avatar} />
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                {message.sender?.name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2",
                          isOwn 
                            ? "bg-primary text-primary-foreground rounded-br-md" 
                            : "bg-muted text-foreground rounded-bl-md"
                        )}
                      >
                        {!isOwn && conversation.type === 'team' && showAvatar && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {message.sender?.name}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <p className={cn(
                          "text-[10px] mt-1",
                          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {new Date(message.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No messages yet</p>
              <p className="text-sm mt-1">Say hello to start the conversation!</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-muted border-0"
            disabled={isLoading}
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            disabled={!newMessage.trim() || isLoading}
            className="rounded-full w-10 h-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
