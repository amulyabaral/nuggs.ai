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
  refreshSession: async () => false,
  refreshProfile: async () => false,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usageRemaining, setUsageRemaining] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  const _internalFetchProfile = useCallback(async (userId, userEmail) => {
    console.log('AuthContext: _internalFetchProfile called for user ID:', userId);
    if (!userId) {
      console.error('AuthContext: Cannot fetch profile, userId is missing');
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
      return null;
    }

    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('AuthContext: Error fetching profile:', profileError);
        if (profileError.code === 'PGRST116' && userEmail) {
          console.log('AuthContext: Profile not found for', userId, ', creating a new one with email:', userEmail);
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: userEmail,
              daily_usage_reset_at: new Date().toISOString(),
              daily_usage_count: 0,
              subscription_tier: 'free'
            })
            .select()
            .single();

          if (insertError) {
            console.error('AuthContext: Error creating profile:', insertError);
            setProfile(null);
            setIsPremium(false);
            setUsageRemaining(0);
            return null;
          }
          console.log('AuthContext: New profile created:', newProfile);
          setProfile(newProfile);
          setIsPremium(false);
          const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);
          setUsageRemaining(defaultFreeTries);
          return newProfile;
        }
        setProfile(null);
        setIsPremium(false);
        setUsageRemaining(0);
        return null;
      }

      if (!data && userEmail) {
        console.warn(`AuthContext: Profile data not found for user ${userId} (no error code). Attempting to create.`);
        const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: userEmail,
              daily_usage_reset_at: new Date().toISOString(),
              daily_usage_count: 0,
              subscription_tier: 'free'
            })
            .select()
            .single();
        if (insertError) {
            console.error('AuthContext: Error creating profile (fallback):', insertError);
            setProfile(null); setIsPremium(false); setUsageRemaining(0);
            return null;
        }
        console.log('AuthContext: New profile created (fallback):', newProfile);
        setProfile(newProfile); setIsPremium(false);
        const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);
        setUsageRemaining(defaultFreeTries);
        return newProfile;
      } else if (!data) {
        console.warn(`AuthContext: Profile data not found for user ${userId} and no email provided for creation.`);
        setProfile(null); setIsPremium(false); setUsageRemaining(0);
        return null;
      }

      console.log('AuthContext: Profile fetched:', data);
      setProfile(data);

      const premium = data.subscription_tier === 'premium' &&
                     (data.subscription_expires_at ? new Date(data.subscription_expires_at) > new Date() : false);
      setIsPremium(premium);

      if (premium) {
        setUsageRemaining(Infinity);
      } else {
        const now = new Date();
        const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);
        const resetDate = data.daily_usage_reset_at ? new Date(data.daily_usage_reset_at) : new Date(0);
        const currentUsageCount = data.daily_usage_count || 0;

        if (resetDate < now) {
          try {
            const { data: updatedProfileData, error: updateError } = await supabase
              .from('profiles')
              .update({
                daily_usage_count: 0,
                daily_usage_reset_at: now.toISOString()
              })
              .eq('id', userId)
              .select()
              .single();

            if (updateError) throw updateError;
            setProfile(updatedProfileData);
            setUsageRemaining(defaultFreeTries);
          } catch (e) {
            console.error("AuthContext: Error during daily usage reset logic:", e);
            setUsageRemaining(Math.max(0, defaultFreeTries - currentUsageCount));
          }
        } else {
          setUsageRemaining(Math.max(0, defaultFreeTries - currentUsageCount));
        }
      }
      return data;
    } catch (error) {
      console.error('AuthContext: Exception in _internalFetchProfile function:', error);
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const handleAuthChange = async (event, session) => {
      if (!isMounted) return;
      console.log('AuthContext: Auth state changed:', event, session);
      setLoading(true);

      try {
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          await _internalFetchProfile(currentUser.id, currentUser.email);
        } else {
          setProfile(null);
          setUsageRemaining(0);
          setIsPremium(false);
        }
      } catch (err) {
        console.error('AuthContext: Error handling auth change:', err);
        setUser(null);
        setProfile(null);
        setUsageRemaining(0);
        setIsPremium(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const checkInitialSession = async () => {
      if (!isMounted) return;
      console.log('AuthContext: Checking initial session...');

      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('AuthContext: Initial session data:', session);
        if (session?.user) {
          setUser(session.user);
          await _internalFetchProfile(session.user.id, session.user.email);
        } else {
          setUser(null);
          setProfile(null);
          setUsageRemaining(0);
          setIsPremium(false);
        }
      } catch (err) {
        console.error('AuthContext: Error checking initial session:', err);
        setUser(null);
        setProfile(null);
        setUsageRemaining(0);
        setIsPremium(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      isMounted = false;
      if (authListener?.subscription?.unsubscribe) {
        authListener.subscription.unsubscribe();
        console.log('AuthContext: Unsubscribed from auth changes.');
      }
    };
  }, [_internalFetchProfile]);
  
  async function signIn(email, password) {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        setUser(data.user);
        await _internalFetchProfile(data.user.id, data.user.email);
      }
      return data;
    } catch (error) {
      console.error("AuthContext: Sign in error:", error);
      setUser(null);
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
      throw error;
    } finally {
      setLoading(false);
    }
  }
  
  async function signUp(email, password) {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
         setUser(data.user);
         await _internalFetchProfile(data.user.id, data.user.email);
      }
      return data;
    } catch (error) {
      console.error("AuthContext: Sign up error:", error);
      setUser(null);
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
      throw error;
    } finally {
      setLoading(false);
    }
  }
  
  async function signOut() {
    setLoading(true);
    try {
      console.log('AuthContext: Attempting to sign out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AuthContext: Error during sign out:', error);
        throw error;
      }
      console.log('AuthContext: Sign out successful. States will be cleared by onAuthStateChange.');
      setUser(null);
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
    } catch (error) {
      console.error('AuthContext: Exception during sign out:', error);
    } finally {
      setLoading(false);
    }
  }
  
  const incrementUsage = useCallback(async () => {
    if (!user || !profile) return false;
    if (isPremium) return true;

    const currentProfile = profile;
    const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);
    const currentUsage = currentProfile.daily_usage_count || 0;

    if (currentUsage >= defaultFreeTries) {
      console.log("AuthContext: Increment usage check: No usage remaining based on profile state.");
      setUsageRemaining(0);
      return false;
    }

    try {
      const newUsageCount = currentUsage + 1;
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({ daily_usage_count: newUsageCount })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(updatedProfile);
      setUsageRemaining(Math.max(0, defaultFreeTries - updatedProfile.daily_usage_count));
      return true;
    } catch (error) {
      console.error('AuthContext: Error incrementing usage:', error);
      if (user?.id) await _internalFetchProfile(user.id, user.email);
      return false;
    }
  }, [user, profile, isPremium, _internalFetchProfile]);
  
  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      console.log('AuthContext: Refreshing session...');
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      console.log('AuthContext: Session refresh call completed. User:', data.user);
      if (data.user) {
        setUser(data.user);
        await _internalFetchProfile(data.user.id, data.user.email);
      } else {
        setUser(null);
        setProfile(null);
        setIsPremium(false);
        setUsageRemaining(0);
      }
      return data.user !== null;
    } catch (err) {
      console.error('AuthContext: Error refreshing session:', err);
      setUser(null);
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
      return false;
    } finally {
      setLoading(false);
    }
  }, [_internalFetchProfile]);
  
  const manualRefreshProfile = useCallback(async () => {
    if (user && !loading) {
      console.log('AuthContext: manualRefreshProfile called for user:', user.id);
      setLoading(true);
      try {
        await _internalFetchProfile(user.id, user.email);
        console.log('AuthContext: Profile refreshed successfully via manualRefreshProfile');
        return true;
      } catch (err) {
        console.error('AuthContext: Error during manualRefreshProfile:', err);
        return false;
      } finally {
        setLoading(false);
      }
    }
    console.log('AuthContext: manualRefreshProfile skipped (no user or already loading)');
    return false;
  }, [user, loading, _internalFetchProfile]);

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
    refreshProfile: manualRefreshProfile,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 