-- Fix 1: Drop the unused SECURITY DEFINER function
DROP FUNCTION IF EXISTS public.is_conversation_participant(uuid, uuid);

-- Fix 2: Replace the overly permissive INSERT policy on conversations
-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

-- Create a proper restrictive policy that ensures users can only create conversations
-- when they are part of a match or team
CREATE POLICY "Users can create conversations they participate in"
ON public.conversations
FOR INSERT
WITH CHECK (
  -- For team conversations: user must be a confirmed team member
  (
    type = 'team' 
    AND team_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = conversations.team_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'confirmed'
    )
  )
  OR
  -- For match conversations: user must be part of the match
  (
    type = 'match' 
    AND match_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = conversations.match_id
      AND (m.user_id = auth.uid() OR m.target_user_id = auth.uid())
    )
  )
);