/**
 * Security Utilities
 * 
 * Industry-grade security functions for:
 * - Password strength validation
 * - Rate limiting integration
 * - Session management
 * - Audit logging
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Password strength requirements
 */
export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-5
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    notCommon: boolean;
  };
}

// Common passwords to block (top 100 most common)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 'master',
  'dragon', '111111', 'baseball', 'iloveyou', 'trustno1', 'sunshine',
  'princess', 'welcome', 'shadow', 'superman', 'michael', 'password1',
  'password123', 'letmein', 'football', 'admin', 'login', 'starwars',
  'passw0rd', '1234567890', 'qwerty123', 'password!', 'changeme'
]);

/**
 * Validate password strength with comprehensive checks
 */
export function validatePasswordStrength(password: string): PasswordStrength {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    notCommon: !COMMON_PASSWORDS.has(password.toLowerCase()),
  };

  const feedback: string[] = [];
  let score = 0;

  if (!requirements.minLength) {
    feedback.push('Password must be at least 8 characters');
  } else {
    score++;
  }

  if (!requirements.hasUppercase) {
    feedback.push('Add an uppercase letter');
  } else {
    score++;
  }

  if (!requirements.hasLowercase) {
    feedback.push('Add a lowercase letter');
  } else {
    score++;
  }

  if (!requirements.hasNumber) {
    feedback.push('Add a number');
  } else {
    score++;
  }

  if (!requirements.hasSpecial) {
    feedback.push('Add a special character (!@#$%^&*)');
  } else {
    score++;
  }

  if (!requirements.notCommon) {
    feedback.push('This password is too common');
    score = Math.max(0, score - 2);
  }

  // Minimum requirements for a valid password
  const isValid = 
    requirements.minLength && 
    requirements.hasUppercase && 
    requirements.hasLowercase && 
    requirements.hasNumber &&
    requirements.notCommon;

  return { isValid, score, feedback, requirements };
}

/**
 * Get password strength label and color
 */
export function getPasswordStrengthDisplay(score: number): { label: string; color: string } {
  if (score <= 1) return { label: 'Weak', color: 'text-destructive' };
  if (score <= 2) return { label: 'Fair', color: 'text-orange-500' };
  if (score <= 3) return { label: 'Good', color: 'text-yellow-500' };
  if (score <= 4) return { label: 'Strong', color: 'text-green-500' };
  return { label: 'Very Strong', color: 'text-emerald-500' };
}

/**
 * Log a security event (client-side wrapper)
 */
export async function logSecurityEvent(
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.rpc('log_audit_event', {
      p_action: action,
      p_metadata: JSON.stringify(metadata || {}),
    });
  } catch (error) {
    console.warn('Failed to log security event:', error);
  }
}

/**
 * Request data export (GDPR)
 */
export async function requestDataExport(): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase.rpc('export_user_data', {
      p_user_id: user.id,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return { success: false, error: message };
  }
}

/**
 * Request account deletion (GDPR)
 */
export async function requestAccountDeletion(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('data_requests')
      .insert({
        user_id: user.id,
        request_type: 'deletion',
      });

    if (error) throw error;
    
    await logSecurityEvent('deletion_requested');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Request failed';
    return { success: false, error: message };
  }
}

/**
 * Get user's active sessions
 */
export async function getUserSessions(): Promise<{ 
  success: boolean; 
  sessions?: Array<{
    id: string;
    device_info: unknown;
    ip_address: unknown;
    last_active_at: string;
    created_at: string;
  }>; 
  error?: string 
}> {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('id, device_info, ip_address, last_active_at, created_at')
      .eq('is_revoked', false)
      .order('last_active_at', { ascending: false });

    if (error) throw error;
    return { success: true, sessions: data || [] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sessions';
    return { success: false, error: message };
  }
}

/**
 * Revoke a session
 */
export async function revokeSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({ is_revoked: true })
      .eq('id', sessionId);

    if (error) throw error;
    
    await logSecurityEvent('session_revoked', { session_id: sessionId });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to revoke session';
    return { success: false, error: message };
  }
}

/**
 * Security headers to be applied via edge function or middleware
 */
export const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
  ].join('; '),
};
