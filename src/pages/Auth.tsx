import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2, Users, ArrowLeft } from 'lucide-react';
import { validatePasswordStrength } from '@/lib/security';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';

const Auth = () => {
  const navigate = useNavigate();
  const { user, profile, loading, profileLoading } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'update-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [sessionCleared, setSessionCleared] = useState(false);
  const [justAuthenticated, setJustAuthenticated] = useState(false);

  // Clear any existing session on mount - force fresh authentication
  useEffect(() => {
    const clearSession = async () => {
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      const isRecoveryFlow = 
        (hash && (hash.includes('type=recovery') || hash.includes('type=magiclink'))) ||
        searchParams.get('reset') === 'true';
      
      if (isRecoveryFlow) {
        setMode('update-password');
        setSessionCleared(true);
        return;
      }

      // Clear existing session to force re-authentication
      await supabase.auth.signOut();
      setSessionCleared(true);
    };
    
    clearSession();
  }, []);

  // Handle PASSWORD_RECOVERY event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update-password');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Only redirect AFTER explicit authentication action (not on existing session)
  useEffect(() => {
    if (mode === 'update-password') return;
    if (!justAuthenticated) return; // Only redirect after user explicitly logs in
    if (loading || !user) return;
    if (profileLoading) return;
    
    // User logged in with profile -> app, without profile -> onboarding
    navigate(profile ? '/app' : '/onboarding', { replace: true });
  }, [user, profile, loading, profileLoading, mode, navigate, justAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'update-password') {
      if (!password) {
        toast.error('Please enter a new password');
        return;
      }
      
      const strength = validatePasswordStrength(password);
      if (!strength.isValid) {
        toast.error(strength.feedback[0] || 'Password does not meet requirements');
        return;
      }
      
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      
      setSubmitting(true);
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        
        await supabase.auth.signOut();
        toast.success('Password updated! Please log in with your new password.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } catch (error: any) {
        toast.error(error.message || 'Failed to update password');
      } finally {
        setSubmitting(false);
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

    setSubmitting(true);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        });
        if (error) throw error;
        toast.success('Password reset email sent! Check your inbox.');
        setMode('login');
        setSubmitting(false);
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back!');
        setJustAuthenticated(true); // Mark as explicitly authenticated
        // Set a max timeout to prevent stuck state - redirect should happen faster
        setTimeout(() => setSubmitting(false), 8000);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success('Account created! Redirecting...');
        setJustAuthenticated(true); // Mark as explicitly authenticated
        // For signup, redirect to onboarding immediately (trigger created placeholder profile)
        setTimeout(() => {
          setSubmitting(false);
          navigate('/onboarding', { replace: true });
        }, 500);
      }
    } catch (error: any) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else if (error.message.includes('User already registered')) {
        toast.error('An account with this email already exists');
      } else {
        toast.error(error.message || 'Authentication failed');
      }
      setSubmitting(false);
    }
  };

  // Show loading only during initial auth check, not during form submission or profile loading
  // Profile loading should not block the form - redirect will happen automatically
  if (loading && !submitting) {
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
                  disabled={submitting}
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
                  disabled={submitting}
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
                  disabled={submitting}
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-primary hover:underline"
                  disabled={submitting}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {getButtonText()}
            </Button>
          </form>

          {(mode === 'login' || mode === 'signup') && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                disabled={submitting}
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
