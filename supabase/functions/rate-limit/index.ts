import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RateLimitRequest {
  action: string;
  identifier?: string;
  maxAttempts?: number;
  windowMinutes?: number;
  blockMinutes?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for rate limit operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get client IP from headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    const body: RateLimitRequest = await req.json();
    
    if (!body.action) {
      return new Response(
        JSON.stringify({ error: 'Action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate action format (alphanumeric and underscores only, max 50 chars)
    if (!/^[a-zA-Z0-9_]{1,50}$/.test(body.action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use provided identifier or fall back to IP
    const identifier = body.identifier || clientIp;
    
    // Validate and constrain numeric inputs to prevent injection and DoS
    const maxAttempts = Math.max(1, Math.min(Math.floor(body.maxAttempts || 5), 100));
    const windowMinutes = Math.max(1, Math.min(Math.floor(body.windowMinutes || 15), 1440)); // Max 24 hours
    const blockMinutes = Math.max(1, Math.min(Math.floor(body.blockMinutes || 30), 10080)); // Max 1 week
    
    // Call the rate limit check function with validated inputs
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action: body.action,
      p_max_attempts: maxAttempts,
      p_window_minutes: windowMinutes,
      p_block_minutes: blockMinutes,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request (fail open for availability)
      return new Response(
        JSON.stringify({ allowed: true, error: 'Rate limit check failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAllowed = data?.allowed ?? true;
    const retryAfter = data?.retry_after;

    // Set rate limit headers
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': String(data?.remaining ?? 0),
      'X-RateLimit-Limit': String(body.maxAttempts || 5),
    };

    if (!isAllowed && retryAfter) {
      responseHeaders['Retry-After'] = String(retryAfter);
    }

    return new Response(
      JSON.stringify(data),
      { 
        status: isAllowed ? 200 : 429,
        headers: responseHeaders 
      }
    );

  } catch (error) {
    console.error('Rate limit function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', allowed: true }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
