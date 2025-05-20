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
  sessionChecked: false,
  profileError: null,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usageRemaining, setUsageRemaining] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const _internalFetchProfile = useCallback(async (userId, userEmail) => {
    console.log('AuthContext: _internalFetchProfile called for user ID:', userId);
    if (!userId) {
      console.error('AuthContext: Cannot fetch profile, userId is missing');
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
      setProfileError(null);
      return null;
    }

    try {
      console.log('AuthContext: Fetching profile for user:', userId);
      setProfileError(null);
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (status === 406) {
          console.log('AuthContext: Profile not found for user. This might be a new user.');
          
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: userEmail,
                subscription_tier: 'free',
                daily_usage_count: 0,
                daily_usage_reset_at: new Date().toISOString()
              })
              .single();
              
            if (createError) throw createError;
            
            if (newProfile) {
              setProfile(newProfile);
              setIsPremium(false);
              const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);
              setUsageRemaining(defaultFreeTries);
              console.log('AuthContext: New profile created for user:', userId);
              return newProfile;
            }
          } catch (createErr) {
            console.error('AuthContext: Failed to create profile for new user:', createErr);
            throw createErr;
          }
        } else {
          console.error('AuthContext: Error fetching profile:', error);
          throw error;
        }
      }

      if (data) {
        setProfile(data);
        const premiumStatus = data.subscription_tier === 'premium' &&
          (data.subscription_expires_at ? new Date(data.subscription_expires_at) > new Date() : false);
        setIsPremium(premiumStatus);
        
        const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);
        if (premiumStatus) {
          setUsageRemaining(Infinity);
        } else {
          const dailyUsage = data.daily_usage_count || 0;
          setUsageRemaining(Math.max(0, defaultFreeTries - dailyUsage));
        }
        console.log('AuthContext: Profile loaded:', data, 'Is Premium:', premiumStatus);
      } else {
        console.warn('AuthContext: No profile found for user:', userId, 'Email:', userEmail, 'This might be a new user.');
        setProfile(null);
        setIsPremium(false);
        const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);
        setUsageRemaining(defaultFreeTries);
      }
      return data;
    } catch (err) {
      console.error('AuthContext: Exception in _internalFetchProfile:', err);
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
      setProfileError('Failed to load profile data. Some features might be unavailable.');
      return null;
    }
  }, []);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setIsPremium(false);
    setUsageRemaining(0);
    setProfileError(null);
  }, []);

  const forceSignOut = useCallback(async () => {
    try {
      console.log('AuthContext: Forcing sign out...');
      await supabase.auth.signOut({ scope: 'global' });
      console.log('AuthContext: Force sign out completed via Supabase.');
    } catch (e) {
      console.error('AuthContext: Error during Supabase sign out in forceSignOut:', e);
    } finally {
      clearAuthState();
    }
  }, [clearAuthState]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const handleAuthChange = async (event, session) => {
      if (!isMounted) return;
      console.log('AuthContext: Auth state changed:', event, session);
      setLoading(true);
      setProfileError(null);

      try {
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          await _internalFetchProfile(currentUser.id, currentUser.email);
          console.log('AuthContext: User profile processing complete after auth change.');
        } else {
          setProfile(null);
          setUsageRemaining(0);
          setIsPremium(false);
        }
      } catch (err) {
        console.error('AuthContext: Unexpected error handling auth change:', err);
        if (!session?.user) {
            clearAuthState();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          if (!sessionChecked) setSessionChecked(true);
        }
      }
    };

    const performInitialSessionCheck = async () => {
      if (!isMounted) return;
      console.log('AuthContext: Performing initial getSession()...');
      try {
        await supabase.auth.getSession();
      } catch (error) {
        console.error('AuthContext: Error during initial getSession():', error);
      } finally {
        if (isMounted && !sessionChecked) {
            setTimeout(() => {
                if (isMounted && loading) {
                    console.warn("AuthContext: Fallback timeout, setting loading false and sessionChecked true.");
                    setLoading(false);
                    setSessionChecked(true);
                }
            }, 3000);
        }
      }
    };

    performInitialSessionCheck();

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      isMounted = false;
      if (authListener && typeof authListener.unsubscribe === 'function') {
        authListener.unsubscribe();
      } else if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [_internalFetchProfile, clearAuthState, sessionChecked, loading]);
  
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
      
      clearAuthState();
      
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error('AuthContext: Error during Supabase sign out:', error);
      }
      
      console.log('AuthContext: Supabase sign out successful.');
      
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      
    } catch (error) {
      console.error('AuthContext: Exception during sign out process:', error);
      clearAuthState();
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } finally {
      if (typeof window !== 'undefined') {
        setLoading(false);
      }
    }
  }
  
  const incrementUsage = useCallback(async () => {
    if (!user || !profile) {
      if (user && !profile && profileError) {
          console.warn("AuthContext: Cannot increment usage, profile not loaded due to error.");
          return false;
      }
      if (!user) return false;
      if (user && !profile) {
          console.log("AuthContext: Increment usage check: User exists but profile is null. Denying usage increment.");
          return false;
      }
    }
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
  }, [user, profile, isPremium, _internalFetchProfile, profileError]);
  
  const refreshSession = useCallback(async () => {
    setLoading(true);
    setProfileError(null);
    try {
      console.log('AuthContext: Manual refreshSession called, refreshing session...');
      
      const refreshPromise = supabase.auth.refreshSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Session refresh timed out")), 8000)
      );
      
      const { data, error } = await Promise.race([refreshPromise, timeoutPromise])
        .catch(err => {
          console.error('AuthContext: Session refresh timeout or error:', err);
          return { data: null, error: err };
        });
        
      if (error) {
        console.error('AuthContext: Manual session refresh failed:', error);
        clearAuthState();
        return false;
      }
      
      console.log('AuthContext: Manual session refresh successful. User:', data?.user?.email);
      if (data?.user) {
        setUser(data.user);
        await _internalFetchProfile(data.user.id, data.user.email);
        return true;
      } else {
        clearAuthState();
        return false;
      }
    } catch (err) {
      console.error('AuthContext: Error in manual refreshSession:', err);
      clearAuthState();
      return false;
    } finally {
      setLoading(false);
    }
  }, [_internalFetchProfile, clearAuthState]);
  
  const manualRefreshProfile = useCallback(async () => {
    if (user && !loading) {
      console.log('AuthContext: manualRefreshProfile called for user:', user.id);
      setLoading(true);
      setProfileError(null);
      try {
        await _internalFetchProfile(user.id, user.email);
        console.log('AuthContext: Profile refreshed successfully via manualRefreshProfile');
        return true;
      } catch (err) {
        console.error('AuthContext: Error during manualRefreshProfile (already handled by _internalFetchProfile):', err);
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
    sessionChecked,
    profileError,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 