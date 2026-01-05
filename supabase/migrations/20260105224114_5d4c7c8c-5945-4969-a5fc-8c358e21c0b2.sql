-- Drop the existing constraint
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_match_type_check;

-- Add the new constraint with all match types
ALTER TABLE public.matches ADD CONSTRAINT matches_match_type_check 
CHECK (match_type IN ('individual', 'team_to_individual', 'individual_to_team', 'individual_to_individual'));