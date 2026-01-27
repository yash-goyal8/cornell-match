-- Create a function to sanitize sensitive data from JSONB before logging
CREATE OR REPLACE FUNCTION public.sanitize_audit_data(p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_sensitive_keys text[] := ARRAY[
    'password', 'password_hash', 'hashed_password', 'encrypted_password',
    'secret', 'api_key', 'apikey', 'access_token', 'refresh_token',
    'credit_card', 'card_number', 'cvv', 'ssn', 'social_security',
    'private_key', 'secret_key', 'auth_token', 'session_token'
  ];
  v_key text;
BEGIN
  IF p_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_result := p_data;
  
  -- Remove or mask sensitive keys (case-insensitive check)
  FOREACH v_key IN ARRAY v_sensitive_keys LOOP
    -- Check each key in the JSONB object
    SELECT jsonb_object_agg(
      key,
      CASE 
        WHEN lower(key) = lower(v_key) OR lower(key) LIKE '%' || lower(v_key) || '%'
        THEN '"[REDACTED]"'::jsonb
        ELSE value
      END
    ) INTO v_result
    FROM jsonb_each(v_result);
  END LOOP;
  
  RETURN v_result;
END;
$$;

-- Update the log_audit_event function to sanitize data before storing
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text, 
  p_table_name text DEFAULT NULL::text, 
  p_record_id uuid DEFAULT NULL::uuid, 
  p_old_data jsonb DEFAULT NULL::jsonb, 
  p_new_data jsonb DEFAULT NULL::jsonb, 
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_sanitized_old jsonb;
  v_sanitized_new jsonb;
  v_sanitized_metadata jsonb;
BEGIN
  -- Sanitize all data before storing to prevent sensitive data exposure
  v_sanitized_old := public.sanitize_audit_data(p_old_data);
  v_sanitized_new := public.sanitize_audit_data(p_new_data);
  v_sanitized_metadata := public.sanitize_audit_data(p_metadata);
  
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data, metadata)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, v_sanitized_old, v_sanitized_new, v_sanitized_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Update profile audit trigger to sanitize data
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
      public.sanitize_audit_data(to_jsonb(OLD)),
      public.sanitize_audit_data(to_jsonb(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'profile_deleted',
      'profiles',
      OLD.id,
      public.sanitize_audit_data(to_jsonb(OLD)),
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update team audit trigger to sanitize data
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
      public.sanitize_audit_data(to_jsonb(NEW))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      'team_updated',
      'teams',
      NEW.id,
      public.sanitize_audit_data(to_jsonb(OLD)),
      public.sanitize_audit_data(to_jsonb(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'team_deleted',
      'teams',
      OLD.id,
      public.sanitize_audit_data(to_jsonb(OLD)),
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update team member audit trigger to sanitize data
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
      public.sanitize_audit_data(to_jsonb(NEW))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      'member_updated',
      'team_members',
      NEW.id,
      public.sanitize_audit_data(to_jsonb(OLD)),
      public.sanitize_audit_data(to_jsonb(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'member_removed',
      'team_members',
      OLD.id,
      public.sanitize_audit_data(to_jsonb(OLD)),
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;