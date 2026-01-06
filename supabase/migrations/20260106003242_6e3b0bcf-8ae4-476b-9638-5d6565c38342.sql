-- Fix the conversation_participants INSERT policy to allow adding other users during match creation
-- The issue is that when creating a match conversation, we need to add BOTH users

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can add themselves as participants" ON public.conversation_participants;

-- Create a more permissive INSERT policy that allows:
-- 1. Users to add themselves
-- 2. Users to add others if they own/created the conversation (via the match)
CREATE POLICY "Users can add participants to their conversations"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can add themselves
  user_id = auth.uid()
  OR
  -- User can add others to conversations they're part of via their match
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN matches m ON c.match_id = m.id
    WHERE c.id = conversation_participants.conversation_id
    AND (m.user_id = auth.uid() OR m.target_user_id = auth.uid())
  )
  OR
  -- Team members can add participants to team-related conversations
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN matches m ON c.match_id = m.id
    JOIN team_members tm ON tm.team_id = m.team_id
    WHERE c.id = conversation_participants.conversation_id
    AND tm.user_id = auth.uid()
    AND tm.status = 'confirmed'
  )
);