-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Match participants can create match conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations they're in" ON public.conversations;

-- Create simplified policies that don't cause recursion
-- Allow users to create direct conversations (for matches)
CREATE POLICY "Users can create direct conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  type = 'direct' AND auth.uid() IS NOT NULL
);

-- Allow users to view conversations where they are a participant OR part of a team match
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (
  -- User is a direct participant
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  )
  OR
  -- User is part of a team that has a match linked to this conversation
  (
    match_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM matches m
      JOIN team_members tm ON tm.team_id = m.team_id
      WHERE m.id = match_id 
        AND tm.user_id = auth.uid() 
        AND tm.status = 'confirmed'
    )
  )
  OR
  -- User is a participant in the match itself
  (
    match_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND (m.user_id = auth.uid() OR m.target_user_id = auth.uid())
    )
  )
);