-- Performance indexes for chat and matching queries

-- conversation_participants: lookup by user_id (chat list loading)
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id 
ON public.conversation_participants (user_id);

-- conversation_participants: lookup by conversation_id + user_id
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv_user 
ON public.conversation_participants (conversation_id, user_id);

-- messages: lookup by conversation_id ordered by created_at (chat room)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages (conversation_id, created_at);

-- messages: for unread count (sender_id filter)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender 
ON public.messages (conversation_id, sender_id);

-- matches: lookup by user_id or target_user_id
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON public.matches (user_id);
CREATE INDEX IF NOT EXISTS idx_matches_target_user_id ON public.matches (target_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_id ON public.matches (team_id) WHERE team_id IS NOT NULL;

-- team_members: lookup by user_id + status
CREATE INDEX IF NOT EXISTS idx_team_members_user_status 
ON public.team_members (user_id, status);

-- team_members: lookup by team_id + status
CREATE INDEX IF NOT EXISTS idx_team_members_team_status 
ON public.team_members (team_id, status);

-- conversations: lookup by match_id
CREATE INDEX IF NOT EXISTS idx_conversations_match_id 
ON public.conversations (match_id) WHERE match_id IS NOT NULL;

-- conversations: lookup by team_id
CREATE INDEX IF NOT EXISTS idx_conversations_team_id 
ON public.conversations (team_id) WHERE team_id IS NOT NULL;

-- message_reads: lookup by user_id + conversation_id
CREATE INDEX IF NOT EXISTS idx_message_reads_user_conversation 
ON public.message_reads (user_id, conversation_id);

-- profiles: lookup by user_id (primary join key)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);