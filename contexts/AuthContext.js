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
  sessionExpired: false,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usageRemaining, setUsageRemaining] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

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
      
      // Add timeout handling for profile fetch
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timed out')), 7000);
      });
      
      const { data, error, status } = await Promise.race([fetchPromise, timeoutPromise])
        .catch(err => {
          console.error('AuthContext: Profile fetch timeout or error:', err);
          throw err;
        });

      if (error) {
        if (status === 406) {
          console.log('AuthContext: Profile not found for user. This might be a new user.');
          
          try {
            // Use the same timeout pattern for profile creation
            const createPromise = supabase
              .from('profiles')
              .insert({
                id: userId,
                email: userEmail,
                subscription_tier: 'free',
                daily_usage_count: 0,
                daily_usage_reset_at: new Date().toISOString()
              })
              .single();
              
            const { data: newProfile, error: createError } = await Promise.race([
              createPromise, 
              new Promise((_, reject) => setTimeout(() => reject(new Error('Profile creation timed out')), 7000))
            ]);
            
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

  const setupSessionRefresh = useCallback((expiresAt) => {
    if (!expiresAt) return null;
    
    const expiresIn = new Date(expiresAt).getTime() - Date.now();
    const refreshTime = Math.max(expiresIn - 60000, 0);
    
    console.log(`AuthContext: Setting up token refresh in ${Math.floor(refreshTime/1000)} seconds`);
    
    const refreshTimer = setTimeout(async () => {
      console.log('AuthContext: Proactively refreshing token before expiration');
      await refreshSession();
    }, refreshTime);
    
    return refreshTimer;
  }, []);

  useEffect(() => {
    let isMounted = true;
    let refreshTimer = null;
    setLoading(true);

    const handleAuthChange = async (event, session) => {
      if (!isMounted) return;
      console.log('AuthContext: Auth state changed:', event, session?.user?.email ? `User ${session.user.email}` : 'No user');
      
      setLoading(true);
      setProfileError(null);
      setSessionExpired(false);

      try {
        const currentUser = session?.user || null;
        
        // First update the user state immediately for fast UI feedback
        setUser(currentUser);

        if (refreshTimer) {
          clearTimeout(refreshTimer);
          refreshTimer = null;
        }

        if (currentUser) {
          // Now fetch the profile - wrap this in a timeout to prevent blocking
          const profilePromise = _internalFetchProfile(currentUser.id, currentUser.email);
          
          // Create a timeout promise to ensure we don't get stuck if profile fetch hangs
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
          });
          
          try {
            await Promise.race([profilePromise, timeoutPromise]);
          } catch (err) {
            console.warn('AuthContext: Profile fetch timed out or errored:', err);
            // We'll continue - the UI should handle missing profile gracefully
          }
          
          if (session && session.expires_at) {
            refreshTimer = setupSessionRefresh(session.expires_at);
          }
          
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
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: Error during initial getSession():', error);
          return;
        }
        
        if (data.session) {
          console.log('AuthContext: Initial session found:', data.session.user?.email);
          
          if (data.session.expires_at) {
            refreshTimer = setupSessionRefresh(data.session.expires_at);
          }
        } else {
          console.log('AuthContext: No active session found during initialization');
        }
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
      if (refreshTimer) clearTimeout(refreshTimer);
      
      if (authListener && typeof authListener.unsubscribe === 'function') {
        authListener.unsubscribe();
      } else if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [_internalFetchProfile, clearAuthState, sessionChecked, loading, setupSessionRefresh]);
  
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
        
        if (error.message && (
            error.message.includes("expired") || 
            error.message.includes("invalid refresh token") ||
            error.message.includes("JWT expired"))) {
          console.log('AuthContext: Session expired, setting sessionExpired flag');
          setSessionExpired(true);
        }
        
        clearAuthState();
        return false;
      }
      
      console.log('AuthContext: Manual session refresh successful. User:', data?.user?.email);
      setSessionExpired(false);
      
      if (data?.user) {
        setUser(data.user);
        await _internalFetchProfile(data.user.id, data.user.email);
        
        if (data.session && data.session.expires_at) {
          setupSessionRefresh(data.session.expires_at);
        }
        
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
  }, [_internalFetchProfile, clearAuthState, setupSessionRefresh]);
  
  const refreshProfile = useCallback(async () => {
    if (!user) {
      console.log('AuthContext: Cannot refresh profile - no user');
      return false;
    }
    
    try {
      console.log('AuthContext: Manual refreshProfile called for user:', user.id);
      setProfileError(null);
      
      const fetchedProfile = await _internalFetchProfile(user.id, user.email);
      console.log('AuthContext: Profile refresh completed, result:', !!fetchedProfile);
      
      return !!fetchedProfile;
    } catch (err) {
      console.error('AuthContext: Error in refreshProfile:', err);
      setProfileError(`Error refreshing profile: ${err.message}`);
      return false;
    }
  }, [user, _internalFetchProfile]);

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
    refreshProfile,
    sessionChecked,
    profileError,
    sessionExpired,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 