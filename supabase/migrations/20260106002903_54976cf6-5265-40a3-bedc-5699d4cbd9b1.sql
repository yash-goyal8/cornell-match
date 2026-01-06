-- Fix infinite recursion in RLS policies by using simpler, non-recursive policies

-- Drop all existing policies on conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create direct conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create join request conversations" ON public.conversations;
DROP POLICY IF EXISTS "Team members can create team conversations" ON public.conversations;
DROP POLICY IF EXISTS "Team owners can delete team conversations" ON public.conversations;

-- Drop all existing policies on conversation_participants
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Team members can add participants to join request conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can delete their own participation" ON public.conversation_participants;

-- Create simple non-recursive policies for conversations
-- INSERT: Any authenticated user can create conversations
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT: Users can view conversations where they are a match participant or team member
CREATE POLICY "Users can view conversations via matches"
ON public.conversations
FOR SELECT
USING (
  -- Direct match participant
  (match_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM matches m 
    WHERE m.id = conversations.match_id 
    AND (m.user_id = auth.uid() OR m.target_user_id = auth.uid())
  ))
  OR
  -- Team member for team-related match
  (match_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM matches m 
    JOIN team_members tm ON tm.team_id = m.team_id
    WHERE m.id = conversations.match_id 
    AND tm.user_id = auth.uid() 
    AND tm.status = 'confirmed'
  ))
  OR
  -- Team conversation member
  (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = conversations.team_id
    AND tm.user_id = auth.uid()
    AND tm.status = 'confirmed'
  ))
);

-- DELETE: Team owners can delete their team conversations
CREATE POLICY "Team owners can delete conversations"
ON public.conversations
FOR DELETE
USING (
  team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM teams 
    WHERE teams.id = conversations.team_id 
    AND teams.created_by = auth.uid()
  )
);

-- Create simple non-recursive policies for conversation_participants
-- INSERT: Users can add themselves as participants
CREATE POLICY "Users can add themselves as participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- SELECT: Users can see participants if they are one of them or involved in the match
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants
FOR SELECT
USING (
  -- User is this participant
  user_id = auth.uid()
  OR
  -- User is in the same conversation via matches (no reference back to conversation_participants)
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN matches m ON c.match_id = m.id
    WHERE c.id = conversation_participants.conversation_id
    AND (m.user_id = auth.uid() OR m.target_user_id = auth.uid())
  )
  OR
  -- User is team member for this conversation
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN matches m ON c.match_id = m.id
    JOIN team_members tm ON tm.team_id = m.team_id
    WHERE c.id = conversation_participants.conversation_id
    AND tm.user_id = auth.uid()
    AND tm.status = 'confirmed'
  )
);

-- DELETE: Users can delete their own participation
CREATE POLICY "Users can delete own participation"
ON public.conversation_participants
FOR DELETE
USING (user_id = auth.uid());