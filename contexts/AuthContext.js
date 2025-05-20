import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

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
  refreshSession: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usageRemaining, setUsageRemaining] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  // Simplified profile fetching
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      
      // Set premium status and usage
      const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);
      const premiumStatus = data.subscription_tier === 'premium' &&
        (data.subscription_expires_at ? new Date(data.subscription_expires_at) > new Date() : false);
        
      setIsPremium(premiumStatus);
      setUsageRemaining(premiumStatus ? Infinity : Math.max(0, defaultFreeTries - (data.daily_usage_count || 0)));
      
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  // Setup auth state listener
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        } else {
          setUser(null);
          setProfile(null);
          setIsPremium(false);
          setUsageRemaining(0);
        }
      } catch (error) {
        console.error('Session init error:', error);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setLoading(true);
      
      if (session?.user) {
        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      } else {
        setUser(null);
        setProfile(null);
        setIsPremium(false);
        setUsageRemaining(0);
      }
      
      setLoading(false);
    });
    
    return () => {
      if (authListener && typeof authListener.unsubscribe === 'function') {
        authListener.unsubscribe();
      }
    };
  }, [fetchProfile]);

  // Sign in function
  async function signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  }
  
  // Sign up function
  async function signUp(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  }
  
  // Sign out function
  async function signOut() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
  
  // Add a fallback to sign out if session is invalid
  useEffect(() => {
    if (!loading && user && !profile) {
      console.warn('Invalid session detected, signing out...');
      signOut();
    }
  }, [loading, user, profile]);

  // Increment usage function
  const incrementUsage = useCallback(async () => {
    if (!user || !profile) return false;
    if (isPremium) return true;

    const currentUsage = profile.daily_usage_count || 0;
    const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);

    if (currentUsage >= defaultFreeTries) {
      return false;
    }

    try {
      const { data, error } = await supabase
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
  }, [user, profile, isPremium]);

  // Add a function to refresh the session
  async function refreshSession() {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (session?.user) {
        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      setUser(null);
      setProfile(null);
    }
  }

  const value = {
    user,
    profile,
    signIn,
    signUp,
    signOut,
    loading,
    usageRemaining,
    isPremium,
    incrementUsage,
    refreshSession,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 