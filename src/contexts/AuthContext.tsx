/**
 * AuthContext - Optimized Authentication Provider
 * 
 * Industry-grade implementation with:
 * - Immediate session restore from cache
 * - Non-blocking profile fetch
 * - Proper cleanup and error handling
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

// Session cache key for faster startup
const SESSION_CACHE_KEY = 'auth_session_cached';

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
  const profileFetchRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    // Prevent duplicate fetches
    if (profileFetchRef.current) return null;
    profileFetchRef.current = true;
    
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
    } finally {
      profileFetchRef.current = false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user && isMountedRef.current) {
      setProfileLoading(true);
      const fetchedProfile = await fetchProfile(user.id);
      if (isMountedRef.current) {
        setProfile(fetchedProfile);
        setProfileLoading(false);
      }
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    isMountedRef.current = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const initSession = async () => {
      try {
        // Fast path: Check for cached session indicator
        const hasCachedSession = sessionStorage.getItem(SESSION_CACHE_KEY);
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (isMountedRef.current) {
            setLoading(false);
          }
          return;
        }
        
        if (!isMountedRef.current) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Cache session presence for faster next load
        if (session) {
          sessionStorage.setItem(SESSION_CACHE_KEY, 'true');
        } else {
          sessionStorage.removeItem(SESSION_CACHE_KEY);
        }
        
        // CRITICAL: Set loading to false BEFORE fetching profile
        // This allows the UI to render immediately
        setLoading(false);
        
        // Fetch profile in background (non-blocking)
        if (session?.user) {
          setProfileLoading(true);
          const profileData = await fetchProfile(session.user.id);
          if (isMountedRef.current) {
            setProfile(profileData);
            setProfileLoading(false);
          }
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    // Start session check immediately
    initSession();

    // Set up auth state listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMountedRef.current) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Update cache
        if (session) {
          sessionStorage.setItem(SESSION_CACHE_KEY, 'true');
        } else {
          sessionStorage.removeItem(SESSION_CACHE_KEY);
        }
        
        if (session?.user) {
          setProfileLoading(true);
          const profileData = await fetchProfile(session.user.id);
          if (isMountedRef.current) {
            setProfile(profileData);
            setProfileLoading(false);
          }
        } else {
          setProfile(null);
        }
      }
    );
    
    authSubscription = subscription;

    return () => {
      isMountedRef.current = false;
      authSubscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    sessionStorage.removeItem(SESSION_CACHE_KEY);
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
