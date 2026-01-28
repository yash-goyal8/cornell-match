import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { profileSchema, validateInput } from '@/lib/validation';
import { UserProfile } from '@/types';
import { Loader2 } from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, profile, loading, profileLoading, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;
    
    // If not logged in, go to auth
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    
    // Wait for profile loading to finish before checking profile
    if (profileLoading) return;
    
    // If already has profile, go to main app
    if (profile) {
      navigate('/app', { replace: true });
    }
  }, [loading, profileLoading, user, profile, navigate]);

  const handleOnboardingComplete = async (profileData: Omit<UserProfile, 'id'>) => {
    if (!user) {
      toast.error('Please sign in to complete your profile');
      navigate('/auth', { replace: true });
      return;
    }

    const validation = validateInput(profileSchema, profileData);
    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }
    const validatedData = (validation as { success: true; data: typeof profileData }).data;

    setSaving(true);
    try {
      toast.info('Saving your profile...');
      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        name: validatedData.name,
        program: validatedData.program,
        skills: validatedData.skills,
        bio: validatedData.bio,
        studio_preference: validatedData.studioPreference,
        studio_preferences: validatedData.studioPreferences,
        avatar: validatedData.avatar,
        linkedin: validatedData.linkedIn,
      });

      if (error) {
        console.error('Error saving profile:', error);
        toast.error('Failed to save profile. Please try again.');
        setSaving(false);
        return;
      }

      await refreshProfile();
      toast.success(`Welcome, ${validatedData.name}!`);
      navigate('/app', { replace: true });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('An unexpected error occurred');
      setSaving(false);
    }
  };

  // Show loading while checking auth or profile
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - will redirect via useEffect
  if (!user) {
    return null;
  }

  // Already has profile - will redirect via useEffect
  if (profile) {
    return null;
  }

  return <OnboardingWizard onComplete={handleOnboardingComplete} />;
};

export default Onboarding;
