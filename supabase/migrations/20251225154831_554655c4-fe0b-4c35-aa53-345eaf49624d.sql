-- Allow team owners to delete their teams
CREATE POLICY "Team owners can delete teams" 
ON public.teams 
FOR DELETE 
USING (auth.uid() = created_by);

-- Allow deletion of conversation_participants when conversation is deleted
CREATE POLICY "Users can delete their own participation" 
ON public.conversation_participants 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow team owners to delete team conversations
CREATE POLICY "Team owners can delete team conversations" 
ON public.conversations 
FOR DELETE 
USING (
  team_id IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM teams WHERE teams.id = conversations.team_id AND teams.created_by = auth.uid()
  )
);