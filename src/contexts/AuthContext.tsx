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
      // Use Promise.race for timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

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
    } catch (error: any) {
      console.warn('Profile fetch failed or timed out:', error.message);
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
    let timeoutId: NodeJS.Timeout;
    
    // CRITICAL: Initial load must complete fully before any redirects can happen
    const initializeAuth = async () => {
      try {
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (isMountedRef.current && loading) {
            console.warn('Auth initialization timed out, forcing loading to false');
            setLoading(false);
          }
        }, 5000);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMountedRef.current) return;
        
        if (error) {
          console.error('Session error:', error);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          // Set profileLoading BEFORE setting user to prevent race condition
          profileLoadingRef.current = true;
          setProfileLoading(true);
          
          // Now set user
          setSession(session);
          setUser(session.user);
          
          // Fetch profile
          const profileData = await fetchProfile(session.user.id);
          if (isMountedRef.current) {
            setProfile(profileData);
            profileLoadingRef.current = false;
            setProfileLoading(false);
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        clearTimeout(timeoutId);
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listener for ONGOING auth changes (after initial load)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMountedRef.current) return;
        
        console.log('Auth state change:', event);
        
        // Skip token refresh events - they don't change user state
        if (event === 'TOKEN_REFRESHED') {
          return;
        }
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          // Always fetch profile on auth state change
          profileLoadingRef.current = true;
          setProfileLoading(true);
          
          const profileData = await fetchProfile(session.user.id);
          if (isMountedRef.current) {
            setProfile(profileData);
            profileLoadingRef.current = false;
            setProfileLoading(false);
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          profileLoadingRef.current = false;
          setProfileLoading(false);
        }
      }
    );

    return () => {
      isMountedRef.current = false;
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
