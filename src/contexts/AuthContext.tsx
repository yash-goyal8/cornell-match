/**
 * AuthContext - Simplified Authentication Provider
 * 
 * Robust implementation with timeout to prevent stuck loading states
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const isMountedRef = useRef(true);
  const profileLoadingRef = useRef(false); // Track profileLoading for timeout

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (data) {
        return {
          id: data.id,
          name: data.name,
          program: data.program,
          skills: data.skills || [],
          bio: data.bio || '',
          studioPreference: data.studio_preference,
          studioPreferences: data.studio_preferences || [data.studio_preference],
          avatar: data.avatar || '',
          linkedIn: data.linkedin,
        } as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user && isMountedRef.current) {
      profileLoadingRef.current = true;
      setProfileLoading(true);
      const fetchedProfile = await fetchProfile(user.id);
      if (isMountedRef.current) {
        setProfile(fetchedProfile);
        profileLoadingRef.current = false;
        setProfileLoading(false);
      }
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    isMountedRef.current = true;
    
    // CRITICAL: Set a timeout to ensure loading never stays stuck
    const loadingTimeout = setTimeout(() => {
      if (isMountedRef.current && loading) {
        console.warn('Auth loading timeout - forcing completion');
        setLoading(false);
      }
    }, 5000); // 5 second max wait
    
    // CRITICAL: Set a timeout for profile loading too
    const profileLoadingTimeout = setTimeout(() => {
      if (isMountedRef.current && profileLoadingRef.current) {
        console.warn('Profile loading timeout - forcing completion');
        profileLoadingRef.current = false;
        setProfileLoading(false);
      }
    }, 5000); // 5 second max wait for profile

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMountedRef.current) return;
        
        if (error) {
          console.error('Session error:', error);
          setLoading(false);
          profileLoadingRef.current = false;
          setProfileLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Fetch profile in background
        if (session?.user) {
          profileLoadingRef.current = true;
          setProfileLoading(true);
          const profileData = await fetchProfile(session.user.id);
          if (isMountedRef.current) {
            setProfile(profileData);
            profileLoadingRef.current = false;
            setProfileLoading(false);
          }
        } else {
          profileLoadingRef.current = false;
          setProfileLoading(false);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        if (isMountedRef.current) {
          setLoading(false);
          profileLoadingRef.current = false;
          setProfileLoading(false);
        }
      }
    };

    initSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMountedRef.current) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false); // Always ensure loading is false on auth change
        
        if (session?.user) {
          profileLoadingRef.current = true;
          setProfileLoading(true);
          const profileData = await fetchProfile(session.user.id);
          if (isMountedRef.current) {
            setProfile(profileData);
            profileLoadingRef.current = false;
            setProfileLoading(false);
          }
        } else {
          setProfile(null);
          profileLoadingRef.current = false;
          setProfileLoading(false);
        }
      }
    );

    return () => {
      isMountedRef.current = false;
      clearTimeout(loadingTimeout);
      clearTimeout(profileLoadingTimeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      profileLoading,
      signOut, 
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
