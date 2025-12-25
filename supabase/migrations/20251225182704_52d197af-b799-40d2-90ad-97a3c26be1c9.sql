-- Add length constraints to profiles table
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 500),
  ADD CONSTRAINT profiles_linkedin_length CHECK (linkedin IS NULL OR char_length(linkedin) <= 200);

-- Add length constraints to teams table
ALTER TABLE public.teams
  ADD CONSTRAINT teams_name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 100),
  ADD CONSTRAINT teams_description_length CHECK (description IS NULL OR char_length(description) <= 1000),
  ADD CONSTRAINT teams_looking_for_length CHECK (looking_for IS NULL OR char_length(looking_for) <= 500);

-- Add length constraints to messages table
ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 5000);