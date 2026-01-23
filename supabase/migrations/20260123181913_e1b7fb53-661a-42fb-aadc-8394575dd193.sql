-- =====================================================
-- INDUSTRY-GRADE DATA PROTECTION MIGRATION
-- Phase 1: Critical Fixes + Phase 2: Enhanced Security
-- =====================================================

-- 1. CREATE USER ROLES TABLE (Separate from profiles for security)
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 2. CREATE AUDIT LOG TABLE
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs, users can see their own actions
CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert audit logs (via security definer function)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- 3. CREATE SESSION TRACKING TABLE
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token text NOT NULL,
  device_info jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  last_active_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_revoked boolean DEFAULT false
);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(last_active_at DESC);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
ON public.user_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can revoke their own sessions"
ON public.user_sessions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage sessions"
ON public.user_sessions FOR ALL
USING (true)
WITH CHECK (true);

-- 4. CREATE RATE LIMITING TABLE
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or user_id
  action text NOT NULL, -- login, signup, password_reset, api_call
  attempts integer DEFAULT 1,
  first_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  blocked_until timestamp with time zone,
  UNIQUE (identifier, action)
);

CREATE INDEX idx_rate_limits_identifier ON public.rate_limits(identifier);
CREATE INDEX idx_rate_limits_blocked ON public.rate_limits(blocked_until);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limits managed by edge functions only
CREATE POLICY "System can manage rate limits"
ON public.rate_limits FOR ALL
USING (true)
WITH CHECK (true);

-- 5. CREATE GDPR DATA REQUESTS TABLE
CREATE TABLE public.data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('export', 'deletion')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  download_url text,
  expires_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX idx_data_requests_user ON public.data_requests(user_id);
CREATE INDEX idx_data_requests_status ON public.data_requests(status);

ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data requests"
ON public.data_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own data requests"
ON public.data_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 6. SECURITY HELPER FUNCTIONS

-- Function to log audit events (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_table_name text DEFAULT NULL,
  p_record_id uuid DEFAULT NULL,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data, metadata)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15,
  p_block_minutes integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_limit RECORD;
  v_result jsonb;
BEGIN
  -- Get or create rate limit record
  SELECT * INTO v_rate_limit
  FROM public.rate_limits
  WHERE identifier = p_identifier AND action = p_action;

  -- Check if currently blocked
  IF v_rate_limit.blocked_until IS NOT NULL AND v_rate_limit.blocked_until > now() THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limited',
      'retry_after', EXTRACT(EPOCH FROM (v_rate_limit.blocked_until - now()))::integer,
      'attempts', v_rate_limit.attempts
    );
  END IF;

  -- If no record or window expired, reset
  IF v_rate_limit IS NULL OR 
     v_rate_limit.first_attempt_at < now() - (p_window_minutes || ' minutes')::interval THEN
    INSERT INTO public.rate_limits (identifier, action, attempts, first_attempt_at, last_attempt_at, blocked_until)
    VALUES (p_identifier, p_action, 1, now(), now(), NULL)
    ON CONFLICT (identifier, action) 
    DO UPDATE SET attempts = 1, first_attempt_at = now(), last_attempt_at = now(), blocked_until = NULL;
    
    RETURN jsonb_build_object('allowed', true, 'attempts', 1, 'remaining', p_max_attempts - 1);
  END IF;

  -- Increment attempts
  IF v_rate_limit.attempts >= p_max_attempts THEN
    -- Block the user
    UPDATE public.rate_limits
    SET blocked_until = now() + (p_block_minutes || ' minutes')::interval,
        last_attempt_at = now()
    WHERE identifier = p_identifier AND action = p_action;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limited',
      'retry_after', p_block_minutes * 60,
      'attempts', v_rate_limit.attempts
    );
  END IF;

  -- Allow but increment
  UPDATE public.rate_limits
  SET attempts = attempts + 1, last_attempt_at = now()
  WHERE identifier = p_identifier AND action = p_action;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'attempts', v_rate_limit.attempts + 1,
    'remaining', p_max_attempts - v_rate_limit.attempts - 1
  );
END;
$$;

-- Function to export user data (GDPR)
CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data jsonb;
BEGIN
  -- Only allow users to export their own data
  IF auth.uid() != p_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'profile', (SELECT row_to_json(p.*) FROM profiles p WHERE p.user_id = p_user_id),
    'teams', (SELECT jsonb_agg(row_to_json(t.*)) FROM teams t WHERE t.created_by = p_user_id),
    'team_memberships', (SELECT jsonb_agg(row_to_json(tm.*)) FROM team_members tm WHERE tm.user_id = p_user_id),
    'matches', (SELECT jsonb_agg(row_to_json(m.*)) FROM matches m WHERE m.user_id = p_user_id OR m.target_user_id = p_user_id),
    'messages', (SELECT jsonb_agg(row_to_json(msg.*)) FROM messages msg WHERE msg.sender_id = p_user_id),
    'exported_at', now()
  ) INTO v_data;

  -- Log the export
  PERFORM public.log_audit_event('data_export', 'profiles', p_user_id, NULL, NULL, 
    jsonb_build_object('export_type', 'full'));

  RETURN v_data;
END;
$$;

-- 7. AUDIT TRIGGERS FOR SENSITIVE TABLES

-- Trigger function for profile changes
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      'profile_updated',
      'profiles',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'profile_deleted',
      'profiles',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_profiles_changes
AFTER UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_profile_changes();

-- Trigger function for team changes
CREATE OR REPLACE FUNCTION public.audit_team_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'team_created',
      'teams',
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      'team_updated',
      'teams',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'team_deleted',
      'teams',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_teams_changes
AFTER INSERT OR UPDATE OR DELETE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.audit_team_changes();

-- Trigger for team member changes
CREATE OR REPLACE FUNCTION public.audit_team_member_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'member_added',
      'team_members',
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      'member_updated',
      'team_members',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'member_removed',
      'team_members',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_team_members_changes
AFTER INSERT OR UPDATE OR DELETE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.audit_team_member_changes();