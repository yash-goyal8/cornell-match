-- Add foreign key from team_members.user_id to profiles.user_id
-- First, we need to check if there's any data that would violate this constraint
-- Then add the foreign key

-- Since profiles.user_id is unique, we can reference it
ALTER TABLE public.team_members
ADD CONSTRAINT team_members_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;