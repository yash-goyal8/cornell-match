-- Fix SQL injection in check_rate_limit by using make_interval() instead of string concatenation
-- and add input validation
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
  v_window_minutes integer;
  v_block_minutes integer;
  v_max_attempts integer;
BEGIN
  -- Validate and constrain inputs to prevent injection and DoS
  v_window_minutes := GREATEST(1, LEAST(COALESCE(p_window_minutes, 15), 1440)); -- 1 min to 24 hours
  v_block_minutes := GREATEST(1, LEAST(COALESCE(p_block_minutes, 30), 10080)); -- 1 min to 1 week
  v_max_attempts := GREATEST(1, LEAST(COALESCE(p_max_attempts, 5), 100)); -- 1 to 100 attempts
  
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

  -- Use make_interval() instead of string concatenation to prevent SQL injection
  IF v_rate_limit IS NULL OR 
     v_rate_limit.first_attempt_at < now() - make_interval(mins => v_window_minutes) THEN
    INSERT INTO public.rate_limits (identifier, action, attempts, first_attempt_at, last_attempt_at, blocked_until)
    VALUES (p_identifier, p_action, 1, now(), now(), NULL)
    ON CONFLICT (identifier, action) 
    DO UPDATE SET attempts = 1, first_attempt_at = now(), last_attempt_at = now(), blocked_until = NULL;
    
    RETURN jsonb_build_object('allowed', true, 'attempts', 1, 'remaining', v_max_attempts - 1);
  END IF;

  -- Increment attempts
  IF v_rate_limit.attempts >= v_max_attempts THEN
    -- Block the user using make_interval()
    UPDATE public.rate_limits
    SET blocked_until = now() + make_interval(mins => v_block_minutes),
        last_attempt_at = now()
    WHERE identifier = p_identifier AND action = p_action;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limited',
      'retry_after', v_block_minutes * 60,
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
    'remaining', v_max_attempts - v_rate_limit.attempts - 1
  );
END;
$$;

-- Fix authorization bypass in create_match_with_conversation
-- Add auth.uid() checks and input validation
CREATE OR REPLACE FUNCTION public.create_match_with_conversation(
  p_user_id uuid,
  p_target_user_id uuid,
  p_match_type text,
  p_team_id uuid DEFAULT NULL,
  p_conversation_type text DEFAULT 'match'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id uuid;
  v_conversation_id uuid;
  v_is_team_member boolean;
BEGIN
  -- CRITICAL: Authorization check - user must be creating a match for themselves
  IF auth.uid() != p_user_id THEN
    -- For team matches, verify the caller is a confirmed team member
    IF p_team_id IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: Can only create matches for yourself';
    END IF;
    
    -- Check team membership
    SELECT EXISTS(
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = p_team_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'confirmed'
    ) INTO v_is_team_member;
    
    IF NOT v_is_team_member THEN
      RAISE EXCEPTION 'Unauthorized: Not a confirmed team member';
    END IF;
  END IF;
  
  -- Validate match_type is one of allowed values
  IF p_match_type NOT IN ('individual_to_individual', 'team_to_individual', 
                          'individual_to_team', 'team_to_team', 'individual') THEN
    RAISE EXCEPTION 'Invalid match_type: %', p_match_type;
  END IF;
  
  -- Validate conversation_type
  IF p_conversation_type NOT IN ('match', 'team', 'direct') THEN
    RAISE EXCEPTION 'Invalid conversation_type: %', p_conversation_type;
  END IF;
  
  -- Prevent self-matching
  IF p_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot create a match with yourself';
  END IF;

  -- Create match
  INSERT INTO public.matches (user_id, target_user_id, match_type, team_id, status)
  VALUES (p_user_id, p_target_user_id, p_match_type, p_team_id, 'pending')
  RETURNING id INTO v_match_id;

  -- Create conversation
  INSERT INTO public.conversations (type, match_id, team_id)
  VALUES (p_conversation_type, v_match_id, p_team_id)
  RETURNING id INTO v_conversation_id;

  -- Add participants
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES 
    (v_conversation_id, p_user_id),
    (v_conversation_id, p_target_user_id);

  RETURN json_build_object(
    'match_id', v_match_id,
    'conversation_id', v_conversation_id
  );
END;
$$;

-- Fix authorization bypass in create_team_with_owner
-- Add auth.uid() check to ensure users can only create teams for themselves
CREATE OR REPLACE FUNCTION public.create_team_with_owner(
  p_name text,
  p_description text,
  p_studio text,
  p_looking_for text,
  p_skills_needed text[],
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_conversation_id uuid;
BEGIN
  -- CRITICAL: Authorization check - user must be creating a team for themselves
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only create teams for yourself';
  END IF;
  
  -- Validate required fields
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Team name is required';
  END IF;
  
  IF p_studio IS NULL OR length(trim(p_studio)) = 0 THEN
    RAISE EXCEPTION 'Studio is required';
  END IF;
  
  -- Validate name length
  IF length(p_name) > 100 THEN
    RAISE EXCEPTION 'Team name must be 100 characters or less';
  END IF;

  -- Create team
  INSERT INTO public.teams (name, description, studio, looking_for, skills_needed, created_by)
  VALUES (trim(p_name), p_description, trim(p_studio), p_looking_for, p_skills_needed, p_user_id)
  RETURNING id INTO v_team_id;

  -- Add owner as member
  INSERT INTO public.team_members (team_id, user_id, role, status)
  VALUES (v_team_id, p_user_id, 'owner', 'confirmed');

  -- Create team conversation
  INSERT INTO public.conversations (type, team_id)
  VALUES ('team', v_team_id)
  RETURNING id INTO v_conversation_id;

  -- Add owner to conversation
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (v_conversation_id, p_user_id);

  RETURN json_build_object(
    'team_id', v_team_id,
    'conversation_id', v_conversation_id
  );
END;
$$;