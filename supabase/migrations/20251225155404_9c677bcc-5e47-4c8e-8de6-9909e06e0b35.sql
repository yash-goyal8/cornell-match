-- Add a new column for multiple studio preferences
ALTER TABLE public.profiles 
ADD COLUMN studio_preferences text[] DEFAULT '{}';

-- Migrate existing data from studio_preference to studio_preferences
UPDATE public.profiles 
SET studio_preferences = ARRAY[studio_preference]
WHERE studio_preference IS NOT NULL;