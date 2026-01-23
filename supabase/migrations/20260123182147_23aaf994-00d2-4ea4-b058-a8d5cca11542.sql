-- Fix rate_limits table - add a deny-all policy since access is only via SECURITY DEFINER functions
-- This prevents direct table access while allowing the check_rate_limit function to work

CREATE POLICY "No direct access to rate limits"
ON public.rate_limits FOR SELECT
USING (false);

CREATE POLICY "No direct insert to rate limits"
ON public.rate_limits FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct update to rate limits"
ON public.rate_limits FOR UPDATE
USING (false);

CREATE POLICY "No direct delete to rate limits"
ON public.rate_limits FOR DELETE
USING (false);