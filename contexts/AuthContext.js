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
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usageRemaining, setUsageRemaining] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  // Simplified profile fetching without complex error handling
  const fetchProfile = useCallback(async (userId, userEmail) => {
    if (!userId) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        // If no profile exists, create one
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: userEmail,
              subscription_tier: 'free',
              daily_usage_count: 0,
              daily_usage_reset_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (createError) throw createError;
          return newProfile;
        }
        throw error;
      }
      
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  // Process user authentication state
  const handleAuthChange = useCallback(async (event, session) => {
    setLoading(true);
    
    try {
      const currentUser = session?.user || null;
      setUser(currentUser);
      
      if (currentUser) {
        const profileData = await fetchProfile(currentUser.id, currentUser.email);
        setProfile(profileData);
        
        if (profileData) {
          const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);
          const premiumStatus = profileData.subscription_tier === 'premium' &&
            (profileData.subscription_expires_at ? new Date(profileData.subscription_expires_at) > new Date() : false);
            
          setIsPremium(premiumStatus);
          setUsageRemaining(premiumStatus ? Infinity : Math.max(0, defaultFreeTries - (profileData.daily_usage_count || 0)));
        }
      } else {
        setProfile(null);
        setIsPremium(false);
        setUsageRemaining(0);
      }
    } catch (error) {
      console.error('Auth state handling error:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  // Initialize authentication listener
  useEffect(() => {
    let isMounted = true;
    
    // Initial session check
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (data.session && isMounted) {
          handleAuthChange('INITIAL_SESSION', data.session);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Session check error:', error);
        setLoading(false);
      }
    };
    
    checkSession();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthChange);
    
    return () => {
      isMounted = false;
      if (authListener && typeof authListener.unsubscribe === 'function') {
        authListener.unsubscribe();
      }
    };
  }, [handleAuthChange]);

  // Simplified sign in function
  async function signIn(email, password) {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }
  
  // Simplified sign up function
  async function signUp(email, password) {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }
  
  // Simplified sign out function
  async function signOut() {
    try {
      await supabase.auth.signOut();
      
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
  
  // Simplified usage increment
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
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 