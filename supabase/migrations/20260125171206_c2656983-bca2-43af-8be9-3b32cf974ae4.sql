-- Fix security issues identified in scan

-- 1. Fix user_sessions - add explicit public denial and auth requirement
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 2. Fix audit_logs - add auth requirement to all SELECT policies
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'));

-- 3. Fix data_requests - add auth requirement
DROP POLICY IF EXISTS "Users can view their own data requests" ON public.data_requests;
CREATE POLICY "Users can view their own data requests"
ON public.data_requests FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 4. Add DELETE policy for profiles (GDPR compliance)
CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
USING (auth.uid() = user_id);

-- 5. Add UPDATE and DELETE policies for messages
CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
ON public.messages FOR DELETE
USING (auth.uid() = sender_id);

-- 6. Add DELETE policy for message_reads
CREATE POLICY "Users can delete their own read status"
ON public.message_reads FOR DELETE
USING (auth.uid() = user_id);