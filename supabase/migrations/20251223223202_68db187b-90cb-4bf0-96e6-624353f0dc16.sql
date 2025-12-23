-- Add new columns for team requirements
ALTER TABLE public.teams
ADD COLUMN looking_for TEXT,
ADD COLUMN skills_needed TEXT[];