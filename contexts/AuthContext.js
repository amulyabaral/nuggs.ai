import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSessionContext, useUser } from '@supabase/auth-helpers-react';

const AuthContext = createContext({
  user: null,
  profile: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  loading: true,
  usageRemaining: 0,
  isPremium: false,
  incrementUsage: async () => false,
  refreshUserProfile: async () => {},
  profileError: null,
});

export function AuthProvider({ children }) {
  const {
    session,
    isLoading: sessionLoading,
    error: sessionError,
    supabaseClient,
  } = useSessionContext();
  const user = useUser();

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [usageRemaining, setUsageRemaining] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId || !supabaseClient) {
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
      return null;
    }
    
    setProfileLoading(true);
    setProfileError(null);
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      
      if (data) {
        const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);
        const premiumStatus = data.subscription_tier === 'premium' &&
          (data.subscription_expires_at ? new Date(data.subscription_expires_at) > new Date() : false);
          
        setIsPremium(premiumStatus);
        setUsageRemaining(premiumStatus ? Infinity : Math.max(0, defaultFreeTries - (data.daily_usage_count || 0)));
        setProfile(data);
      } else {
        setProfile(null);
        setIsPremium(false);
        setUsageRemaining(0);
        console.warn(`Profile not found for user ${userId}. This might be a new user whose profile is still being created, or an issue with profile data.`);
      }
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfileError(err.message || 'Failed to fetch profile.');
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [supabaseClient]);

  useEffect(() => {
    if (user?.id && !profileLoading) {
      fetchProfile(user.id);
    } else if (!user?.id) {
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
      setProfileError(null);
    }
  }, [user, fetchProfile, profileLoading]);

  async function signIn(email, password) {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  }
  
  async function signUp(email, password) {
    const { data, error } = await supabaseClient.auth.signUp({
    });
    if (error) {
      console.error("Sign up error:", error);
      throw error;
    }
    return data;
  }
  
  async function signOut() {
    try {
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
  
  useEffect(() => {
    if (sessionError) {
      console.error('Session error from AuthContext:', sessionError);
    }
  }, [sessionError]);

  const incrementUsage = useCallback(async () => {
    if (!user || !profile || !supabaseClient) return false;
    if (isPremium) return true;

    const currentUsage = profile.daily_usage_count || 0;
    const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);

    if (currentUsage >= defaultFreeTries) {
      setUsageRemaining(0);
      return false;
    }

    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .update({ daily_usage_count: currentUsage + 1 })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      setUsageRemaining(Math.max(0, defaultFreeTries - data.daily_usage_count));
      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  }, [user, profile, isPremium, supabaseClient]);

  async function refreshUserProfile() {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }
  
  const overallLoading = sessionLoading || (!!user && profileLoading);

  const value = {
    user,
    profile,
    signIn,
    signUp,
    signOut,
    loading: overallLoading,
    usageRemaining,
    isPremium,
    incrementUsage,
    refreshUserProfile,
    supabaseClient,
    profileError,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 