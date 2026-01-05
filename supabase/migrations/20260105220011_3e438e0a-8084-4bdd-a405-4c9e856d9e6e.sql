-- Add DELETE policy for matches table to allow users and team members to delete matches

CREATE POLICY "Users and team members can delete matches"
ON public.matches
FOR DELETE
USING (
  auth.uid() = user_id 
  OR auth.uid() = target_user_id
  OR (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = matches.team_id 
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'confirmed'
  ))
);