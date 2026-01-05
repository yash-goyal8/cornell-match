-- Fix PUBLIC_DATA_EXPOSURE: Require authentication for viewing profiles, teams, and team_members

-- 1. Fix profiles table - require authentication to view
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 2. Fix teams table - require authentication to view
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
CREATE POLICY "Authenticated users can view teams" 
ON public.teams FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 3. Fix team_members table - require authentication to view
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
CREATE POLICY "Authenticated users can view team members" 
ON public.team_members FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);