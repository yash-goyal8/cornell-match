-- Add team matching support to matches table
-- We need to track: team_id (if team is swiping), direction of who swiped who

-- First, add columns to matches table for team matching
ALTER TABLE public.matches 
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS match_type TEXT NOT NULL DEFAULT 'individual' CHECK (match_type IN ('individual', 'team_to_individual', 'individual_to_team'));

-- Add a column to conversation_participants to track if someone can manage the join request
-- This allows any team member to approve/reject
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_matches_team_id ON public.matches(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_match_type ON public.matches(match_type);
CREATE INDEX IF NOT EXISTS idx_conversations_match_id ON public.conversations(match_id);

-- Update RLS policy for matches to allow team members to view/update team matches
DROP POLICY IF EXISTS "Team members can view team matches" ON public.matches;
CREATE POLICY "Team members can view team matches" ON public.matches
  FOR SELECT USING (
    auth.uid() = user_id 
    OR auth.uid() = target_user_id 
    OR (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_members.team_id = matches.team_id 
        AND team_members.user_id = auth.uid()
        AND team_members.status = 'confirmed'
    ))
  );

-- Update existing select policy
DROP POLICY IF EXISTS "Users can view their own matches" ON public.matches;
CREATE POLICY "Users can view their own matches" ON public.matches
  FOR SELECT USING (
    auth.uid() = user_id 
    OR auth.uid() = target_user_id
    OR (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_members.team_id = matches.team_id 
        AND team_members.user_id = auth.uid()
        AND team_members.status = 'confirmed'
    ))
  );

-- Allow team members to update matches (for accepting/rejecting)
DROP POLICY IF EXISTS "Users can update their own matches" ON public.matches;
CREATE POLICY "Users can update their own matches" ON public.matches
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR auth.uid() = target_user_id
    OR (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_members.team_id = matches.team_id 
        AND team_members.user_id = auth.uid()
        AND team_members.status = 'confirmed'
    ))
  );

-- Allow team members to create matches on behalf of team
DROP POLICY IF EXISTS "Users can create matches" ON public.matches;
CREATE POLICY "Users can create matches" ON public.matches
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    OR (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_members.team_id = matches.team_id 
        AND team_members.user_id = auth.uid()
        AND team_members.status = 'confirmed'
    ))
  );

-- Update conversation_participants policy to allow team members to add participants  
DROP POLICY IF EXISTS "Team members can add participants to join request conversations" ON public.conversation_participants;
CREATE POLICY "Team members can add participants to join request conversations" ON public.conversation_participants
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.matches m ON c.match_id = m.id
      JOIN public.team_members tm ON tm.team_id = m.team_id
      WHERE c.id = conversation_id 
        AND tm.user_id = auth.uid()
        AND tm.status = 'confirmed'
    )
  );

-- Allow team members to view join request conversation participants
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants of their conversations" ON public.conversation_participants
  FOR SELECT USING (
    user_id = auth.uid() 
    OR is_conversation_participant(conversation_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.matches m ON c.match_id = m.id
      JOIN public.team_members tm ON tm.team_id = m.team_id
      WHERE c.id = conversation_id 
        AND tm.user_id = auth.uid()
        AND tm.status = 'confirmed'
    )
  );

-- Allow viewing conversations related to team matches
DROP POLICY IF EXISTS "Users can view conversations they're in" ON public.conversations;
CREATE POLICY "Users can view conversations they're in" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()
    )
    OR (match_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.team_members tm ON tm.team_id = m.team_id
      WHERE m.id = conversations.match_id 
        AND tm.user_id = auth.uid()
        AND tm.status = 'confirmed'
    ))
  );

-- Allow team members to send messages in join request conversations
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
CREATE POLICY "Users can send messages to their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.conversations c
        JOIN public.matches m ON c.match_id = m.id
        JOIN public.team_members tm ON tm.team_id = m.team_id
        WHERE c.id = messages.conversation_id 
          AND tm.user_id = auth.uid()
          AND tm.status = 'confirmed'
      )
    )
  );

-- Allow team members to view messages in join request conversations  
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants 
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.matches m ON c.match_id = m.id
      JOIN public.team_members tm ON tm.team_id = m.team_id
      WHERE c.id = messages.conversation_id 
        AND tm.user_id = auth.uid()
        AND tm.status = 'confirmed'
    )
  );