export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    name: string;
    avatar: string;
  };
}

export interface Conversation {
  id: string;
  type: 'direct' | 'team';
  team_id?: string;
  created_at: string;
  updated_at: string;
  participants?: ConversationParticipant[];
  last_message?: Message;
  other_user?: {
    id: string;
    name: string;
    avatar: string;
  };
  team?: {
    id: string;
    name: string;
  };
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  profile?: {
    name: string;
    avatar: string;
  };
}

export interface Match {
  id: string;
  user_id: string;
  target_user_id: string;
  status: 'pending' | 'matched' | 'rejected';
  created_at: string;
  updated_at: string;
  target_profile?: {
    id: string;
    name: string;
    avatar: string;
    program: string;
  };
}
