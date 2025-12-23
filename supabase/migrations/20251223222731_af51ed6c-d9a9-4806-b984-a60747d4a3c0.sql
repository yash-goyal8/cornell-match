-- Drop the existing insert policy that's too restrictive
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create new policy that allows authenticated users to create conversations
CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (true);