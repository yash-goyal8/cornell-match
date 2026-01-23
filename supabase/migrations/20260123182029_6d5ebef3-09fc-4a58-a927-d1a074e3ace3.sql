-- Fix overly permissive RLS policies
-- These are intentional for system-level tables managed by edge functions/triggers

-- 1. Fix audit_logs INSERT policy - only allow via security definer function
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
-- No replacement needed - inserts happen via log_audit_event() which is SECURITY DEFINER

-- 2. Fix user_sessions policies - restrict to authenticated users only
DROP POLICY IF EXISTS "System can manage sessions" ON public.user_sessions;

-- Sessions are managed via edge functions with service role, so we only need user policies
CREATE POLICY "Users can insert their own sessions"
ON public.user_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
ON public.user_sessions FOR DELETE
USING (auth.uid() = user_id);

-- 3. Fix rate_limits policies - no direct user access, only via edge functions
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;
-- Rate limits are managed via check_rate_limit() which is SECURITY DEFINER
-- No direct access policies needed - edge functions use service role