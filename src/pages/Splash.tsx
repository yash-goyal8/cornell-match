import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Splash = () => {
  const navigate = useNavigate();
  const { user, profile, loading, profileLoading } = useAuth();
  const [countdown, setCountdown] = useState(3);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Navigation logic - ONLY after countdown AND all loading is complete
  useEffect(() => {
    // Don't navigate if already navigated
    if (hasNavigated) return;
    
    // Wait for countdown to finish
    if (countdown > 0) return;
    
    // Wait for auth loading to complete
    if (loading) return;
    
    // If no user, go to auth immediately
    if (!user) {
      setHasNavigated(true);
      navigate('/auth', { replace: true });
      return;
    }
    
    // User exists - wait for profile loading to complete before deciding
    if (profileLoading) return;
    
    // Now we know: loading is done, profileLoading is done
    setHasNavigated(true);
    
    if (profile) {
      // Has profile → main app
      navigate('/app', { replace: true });
    } else {
      // No profile → onboarding
      navigate('/onboarding', { replace: true });
    }
  }, [countdown, loading, profileLoading, user, profile, navigate, hasNavigated]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-6"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-gradient">Spring Studio</h1>
          <p className="text-xl text-muted-foreground mt-2">Team Matching</p>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground max-w-xs mx-auto"
        >
          Find your perfect teammates for Cornell Tech studio projects
        </motion.p>

        {/* Loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8"
        >
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Splash;
