-- Fix: Unrestricted Conversation Creation Without Validation
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- For team conversations - verify team membership
CREATE POLICY "Team members can create team conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (
  type = 'team' AND team_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = conversations.team_id 
      AND user_id = auth.uid()
      AND status = 'confirmed'
  )
);

-- For match conversations - verify match participation
CREATE POLICY "Match participants can create match conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (
  type = 'direct' AND
  (
    match_id IS NULL OR
    EXISTS (
      SELECT 1 FROM matches
      WHERE id = conversations.match_id
        AND (user_id = auth.uid() OR target_user_id = auth.uid())
    )
  )
);

-- For join request conversations - allow team members or match participants
CREATE POLICY "Users can create join request conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (
  type = 'join_request' AND match_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = conversations.match_id
      AND (
        m.user_id = auth.uid() 
        OR m.target_user_id = auth.uid()
        OR (m.team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.team_id = m.team_id 
            AND tm.user_id = auth.uid()
            AND tm.status = 'confirmed'
        ))
      )
  )
);