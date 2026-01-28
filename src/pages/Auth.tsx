import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2, Users, ArrowLeft, Shield } from 'lucide-react';
import { validatePasswordStrength, logSecurityEvent } from '@/lib/security';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'update-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Use ref to track recovery mode to avoid stale closure issues
  const isRecoveryModeRef = useRef(false);

  useEffect(() => {
    // Check for recovery token in URL hash or query params
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    const isRecoveryFlow = 
      (hash && (hash.includes('type=recovery') || hash.includes('type=magiclink'))) ||
      searchParams.get('reset') === 'true';
    
    if (isRecoveryFlow) {
      // Mark as recovery mode and wait for PASSWORD_RECOVERY event
      isRecoveryModeRef.current = true;
      setCheckingAuth(false);
    } else {
      // Check if already logged in (only if not recovery flow)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && !isRecoveryModeRef.current) {
          navigate('/');
        }
        setCheckingAuth(false);
      });
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the password reset link - show update password form
        isRecoveryModeRef.current = true;
        setMode('update-password');
        setCheckingAuth(false);
        return;
      }
      
      // Don't redirect if we're in recovery mode
      if (isRecoveryModeRef.current) {
        return;
      }
      
      if (event === 'SIGNED_IN' && session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'update-password') {
      if (!password) {
        toast.error('Please enter a new password');
        return;
      }
      
      // Validate password strength
      const strength = validatePasswordStrength(password);
      if (!strength.isValid) {
        toast.error(strength.feedback[0] || 'Password does not meet requirements');
        return;
      }
      
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      
      setLoading(true);
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        
        // Log the password change
        await logSecurityEvent('password_changed');
        
        // Clear recovery mode and sign out to force fresh login with new password
        isRecoveryModeRef.current = false;
        await supabase.auth.signOut();
        
        toast.success('Password updated successfully! Please log in with your new password.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } catch (error: any) {
        console.error('Password update error:', error);
        toast.error(error.message || 'Failed to update password');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    if (mode !== 'forgot' && !password) {
      toast.error('Please enter your password');
      return;
    }

    // For signup, validate password strength
    if (mode === 'signup') {
      const strength = validatePasswordStrength(password);
      if (!strength.isValid) {
        toast.error(strength.feedback[0] || 'Password does not meet requirements');
        return;
      }
    } else if (mode === 'login' && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        });
        if (error) throw error;
        toast.success('Password reset email sent! Check your inbox.');
        setMode('login');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Welcome back!');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success('Account created! You can now log in.');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else if (error.message.includes('User already registered')) {
        toast.error('An account with this email already exists');
      } else {
        toast.error(error.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Remove the second useEffect - logic is now consolidated above

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getTitle = () => {
    switch (mode) {
      case 'forgot': return 'Reset Password';
      case 'signup': return 'Create Account';
      case 'update-password': return 'Set New Password';
      default: return 'Welcome Back';
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case 'forgot': return 'Send Reset Email';
      case 'signup': return 'Sign Up';
      case 'update-password': return 'Update Password';
      default: return 'Sign In';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gradient">Spring Studio</h1>
          <p className="text-muted-foreground mt-1">Team Matching Platform</p>
        </div>

        {/* Auth Form */}
        <div className="glass rounded-2xl p-6">
          {(mode === 'forgot' || mode === 'update-password') && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>
          )}
          
          <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
            {getTitle()}
          </h2>

          {mode === 'forgot' && (
            <p className="text-sm text-muted-foreground text-center mb-4">
              Enter your email and we'll send you a link to reset your password.
            </p>
          )}

          {mode === 'update-password' && (
            <p className="text-sm text-muted-foreground text-center mb-4">
              Enter your new password below.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode !== 'update-password' && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@cornell.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="space-y-2">
                <Label htmlFor="password">{mode === 'update-password' ? 'New Password' : 'Password'}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                {(mode === 'signup' || mode === 'update-password') && (
                  <PasswordStrengthMeter password={password} />
                )}
              </div>
            )}

            {mode === 'update-password' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-primary hover:underline"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {getButtonText()}
            </Button>
          </form>

          {(mode === 'login' || mode === 'signup') && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading}
              >
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <span className="text-primary font-medium">
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </span>
              </button>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
};

export default Auth;
