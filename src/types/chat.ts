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
  type: 'direct' | 'team' | 'match';
  team_id?: string;
  match_id?: string;
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
    member_count?: number;
  };
  // For join request conversations
  match?: JoinRequestMatch;
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
  team_id?: string;
  match_type: 'individual' | 'individual_to_individual' | 'team_to_individual' | 'individual_to_team';
  status: 'pending' | 'matched' | 'rejected' | 'accepted';
  created_at: string;
  updated_at: string;
  target_profile?: {
    id: string;
    name: string;
    avatar: string;
    program: string;
  };
  team?: {
    id: string;
    name: string;
    studio: string;
  };
}

export interface JoinRequestMatch {
  id: string;
  user_id: string;
  target_user_id: string;
  team_id: string;
  match_type: 'team_to_individual' | 'individual_to_team';
  status: 'pending' | 'matched' | 'rejected' | 'accepted';
  team?: {
    id: string;
    name: string;
  };
  // The individual's profile (whether they're requesting or being requested)
  individual_profile?: {
    id: string;
    name: string;
    avatar: string;
    program: string;
  };
}
