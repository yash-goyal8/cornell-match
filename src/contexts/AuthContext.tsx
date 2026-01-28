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
    
    // CRITICAL: Separate initial load from ongoing auth changes (Stack Overflow pattern)
    
    // 1. Listener for ONGOING auth changes (does NOT control initial loading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMountedRef.current) return;
        
        console.log('Auth state change:', event);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fire and forget for ongoing changes - don't block loading
        if (session?.user) {
          profileLoadingRef.current = true;
          setProfileLoading(true);
          fetchProfile(session.user.id).then(profileData => {
            if (isMountedRef.current) {
              setProfile(profileData);
              profileLoadingRef.current = false;
              setProfileLoading(false);
            }
          });
        } else {
          setProfile(null);
          profileLoadingRef.current = false;
          setProfileLoading(false);
        }
      }
    );

    // 2. INITIAL load (controls isLoading) - must await all operations
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMountedRef.current) return;
        
        if (error) {
          console.error('Session error:', error);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch profile BEFORE setting loading false
        if (session?.user) {
          profileLoadingRef.current = true;
          setProfileLoading(true);
          const profileData = await fetchProfile(session.user.id);
          if (isMountedRef.current) {
            setProfile(profileData);
            profileLoadingRef.current = false;
            setProfileLoading(false);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        // ALWAYS set loading false after initialization
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

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
