import { motion } from 'framer-motion';
import { MessageCircle, Users, ChevronLeft, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Conversation, Match } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatListProps {
  conversations: Conversation[];
  matches: Match[];
  onSelectConversation: (conversation: Conversation) => void;
  onStartChat: (match: Match) => void;
  onBack: () => void;
  selectedId?: string;
  unreadCounts: Record<string, number>;
  activeTab: 'chats' | 'matches';
  onTabChange: (tab: 'chats' | 'matches') => void;
}

export const ChatList = ({
  conversations,
  matches,
  onSelectConversation,
  onStartChat,
  onBack,
  selectedId,
  unreadCounts,
  activeTab,
  onTabChange,
}: ChatListProps) => {
  // Show pending matches that the user can start chatting with
  const pendingMatches = matches.filter(m => m.status === 'pending' || m.status === 'matched');
  
  // Calculate total unread count for chats tab badge
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold text-foreground">Messages</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => onTabChange('chats')}
          className={cn(
            "flex-1 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'chats'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageCircle className="w-4 h-4 inline mr-2" />
          Chats
          {totalUnread > 0 && (
            <span className="absolute top-2 right-4 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
        <button
          onClick={() => onTabChange('matches')}
          className={cn(
            "flex-1 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'matches'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Matches
          {pendingMatches.length > 0 && (
            <span className="absolute top-2 right-4 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
              {pendingMatches.length}
            </span>
          )}
        </button>
      </div>

      <ScrollArea className="flex-1">
        {activeTab === 'chats' ? (
          <div className="divide-y divide-border">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm mt-1">Match with someone to start chatting!</p>
              </div>
            ) : (
              conversations.map((conversation) => {
                const isJoinRequest = !!conversation.match;
                const isPending = conversation.match?.status === 'pending';
                
                // Determine display name
                let displayName = '';
                let displayAvatar = '';
                
                if (isJoinRequest && conversation.match) {
                  // For join requests, show the individual's name with team context
                  displayName = conversation.match.individual_profile?.name || 'Unknown';
                  displayAvatar = conversation.match.individual_profile?.avatar || '';
                } else if (conversation.type === 'direct') {
                  displayName = conversation.other_user?.name || 'Unknown';
                  displayAvatar = conversation.other_user?.avatar || '';
                } else {
                  displayName = conversation.team?.name || 'Team Chat';
                }
                
                return (
                  <motion.button
                    key={conversation.id}
                    onClick={() => onSelectConversation(conversation)}
                    className={cn(
                      "w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left",
                      selectedId === conversation.id && "bg-accent"
                    )}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={displayAvatar} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {conversation.type === 'team' && !isJoinRequest
                            ? <Users className="w-5 h-5" />
                            : displayName?.charAt(0) || '?'
                          }
                        </AvatarFallback>
                      </Avatar>
                      {isJoinRequest && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <UserPlus className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground truncate">
                          {displayName}
                        </h3>
                        {isJoinRequest && isPending && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Request
                          </Badge>
                        )}
                        {conversation.match?.status === 'accepted' && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-600 dark:text-green-400">
                            Joined
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {conversation.last_message && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(conversation.last_message.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      )}
                      {unreadCounts[conversation.id] > 0 && (
                        <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                          {unreadCounts[conversation.id] > 99 ? '99+' : unreadCounts[conversation.id]}
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pendingMatches.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No matches yet</p>
                <p className="text-sm mt-1">Keep swiping to find your teammates!</p>
              </div>
            ) : (
              pendingMatches.map((match) => (
                <motion.button
                  key={match.id}
                  onClick={() => onStartChat(match)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left"
                  whileTap={{ scale: 0.98 }}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={match.target_profile?.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {match.target_profile?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {match.target_profile?.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {match.target_profile?.program} • Tap to start chatting
                    </p>
                  </div>
                  <span className="text-xs text-primary font-medium">NEW</span>
                </motion.button>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
