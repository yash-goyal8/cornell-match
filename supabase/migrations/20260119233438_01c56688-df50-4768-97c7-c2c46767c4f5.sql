-- =====================================================
-- DATABASE PERFORMANCE OPTIMIZATION FOR MEDIUM SCALE (1K-10K USERS)
-- =====================================================

-- 1. INDEXES FOR FREQUENTLY QUERIED COLUMNS
-- =====================================================

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_program ON public.profiles(program);
CREATE INDEX IF NOT EXISTS idx_profiles_studio_preference ON public.profiles(studio_preference);

-- Team members indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON public.team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_user_status ON public.team_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_team_members_team_status ON public.team_members(team_id, status);

-- Matches indexes for activity history and filtering
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON public.matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_target_user_id ON public.matches(target_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_id ON public.matches(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_match_type ON public.matches(match_type);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_user_type ON public.matches(user_id, match_type);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches(created_at DESC);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_match_id ON public.conversations(match_id);
CREATE INDEX IF NOT EXISTS idx_conversations_team_id ON public.conversations(team_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

-- Conversation participants indexes
CREATE INDEX IF NOT EXISTS idx_conv_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user_conv ON public.conversation_participants(user_id, conversation_id);

-- Messages indexes for chat performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);

-- Message reads indexes
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON public.message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_conversation_id ON public.message_reads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_conv ON public.message_reads(user_id, conversation_id);

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);
CREATE INDEX IF NOT EXISTS idx_teams_studio ON public.teams(studio);

-- 2. COMPOSITE FUNCTION FOR ATOMIC MATCH CREATION
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_match_with_conversation(
  p_user_id uuid,
  p_target_user_id uuid,
  p_match_type text,
  p_team_id uuid DEFAULT NULL,
  p_conversation_type text DEFAULT 'match'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id uuid;
  v_conversation_id uuid;
BEGIN
  -- Create match
  INSERT INTO public.matches (user_id, target_user_id, match_type, team_id, status)
  VALUES (p_user_id, p_target_user_id, p_match_type, p_team_id, 'pending')
  RETURNING id INTO v_match_id;

  -- Create conversation
  INSERT INTO public.conversations (type, match_id, team_id)
  VALUES (p_conversation_type, v_match_id, p_team_id)
  RETURNING id INTO v_conversation_id;

  -- Add participants
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES 
    (v_conversation_id, p_user_id),
    (v_conversation_id, p_target_user_id);

  RETURN json_build_object(
    'match_id', v_match_id,
    'conversation_id', v_conversation_id
  );
END;
$$;

-- 3. UPSERT FUNCTION FOR MESSAGE READS
-- =====================================================
CREATE OR REPLACE FUNCTION public.upsert_message_read(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.message_reads (conversation_id, user_id, last_read_at)
  VALUES (p_conversation_id, p_user_id, now())
  ON CONFLICT (user_id, conversation_id) 
  DO UPDATE SET last_read_at = now();
EXCEPTION
  WHEN unique_violation THEN
    UPDATE public.message_reads 
    SET last_read_at = now()
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
END;
$$;

-- Add unique constraint for upsert to work
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_reads_user_conv_unique 
ON public.message_reads(user_id, conversation_id);

-- 4. FUNCTION TO GET UNREAD COUNT EFFICIENTLY
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_unread_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)::integer
  FROM public.messages m
  INNER JOIN public.conversation_participants cp 
    ON cp.conversation_id = m.conversation_id
  LEFT JOIN public.message_reads mr 
    ON mr.conversation_id = m.conversation_id 
    AND mr.user_id = p_user_id
  WHERE cp.user_id = p_user_id
    AND m.sender_id != p_user_id
    AND (mr.last_read_at IS NULL OR m.created_at > mr.last_read_at);
$$;

-- 5. FUNCTION FOR TEAM CREATION WITH CONVERSATION
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_team_with_owner(
  p_name text,
  p_description text,
  p_studio text,
  p_looking_for text,
  p_skills_needed text[],
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_conversation_id uuid;
BEGIN
  -- Create team
  INSERT INTO public.teams (name, description, studio, looking_for, skills_needed, created_by)
  VALUES (p_name, p_description, p_studio, p_looking_for, p_skills_needed, p_user_id)
  RETURNING id INTO v_team_id;

  -- Add owner as member
  INSERT INTO public.team_members (team_id, user_id, role, status)
  VALUES (v_team_id, p_user_id, 'owner', 'confirmed');

  -- Create team conversation
  INSERT INTO public.conversations (type, team_id)
  VALUES ('team', v_team_id)
  RETURNING id INTO v_conversation_id;

  -- Add owner to conversation
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (v_conversation_id, p_user_id);

  RETURN json_build_object(
    'team_id', v_team_id,
    'conversation_id', v_conversation_id
  );
END;
$$;