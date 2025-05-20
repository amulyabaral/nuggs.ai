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
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usageRemaining, setUsageRemaining] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

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

  const clearAuthState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setIsPremium(false);
    setUsageRemaining(0);
  }, []);

  const forceSignOut = useCallback(async () => {
    try {
      clearAuthState();
      await supabase.auth.signOut({ scope: 'global' });
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.auth') || key.includes('nuggs-auth')) {
            localStorage.removeItem(key);
          }
        });
      }
      console.log('AuthContext: Force sign out completed');
    } catch (e) {
      console.error('AuthContext: Error during force sign out:', e);
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

      try {
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          await _internalFetchProfile(currentUser.id, currentUser.email);
          console.log('AuthContext: User profile loaded after auth change');
        } else {
          setProfile(null);
          setUsageRemaining(0);
          setIsPremium(false);
        }
      } catch (err) {
        console.error('AuthContext: Error handling auth change:', err);
        if (event !== 'SIGNED_OUT') {
          console.log('AuthContext: Forcing sign out due to auth error');
          try {
            await supabase.auth.signOut();
          } catch (e) {
            console.error('AuthContext: Error during forced sign out:', e);
          }
        }
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
      
      const timeoutId = setTimeout(() => {
        if (isMounted && loading) {
          console.error('AuthContext: Session check timed out after 10 seconds');
          clearAuthState();
          setLoading(false);
          setSessionChecked(true);
        }
      }, 10000);
      
      try {
        const { data: authUser } = await supabase.auth.getUser();
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        
        console.log('AuthContext: Auth check -', 
          'User from getUser():', authUser?.user ? `Found (${authUser.user.email})` : 'Not found', 
          'Session:', session ? `Found (expires: ${new Date(session.expires_at * 1000).toISOString()})` : 'Not found');
        
        if (authUser?.user) {
          setUser(authUser.user);
          
          try {
            console.log('AuthContext: Forcing session refresh to ensure valid tokens');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('AuthContext: Session refresh failed - signing out:', refreshError);
              await forceSignOut();
              setLoading(false);
              setSessionChecked(true);
              clearTimeout(timeoutId);
              return;
            }
            
            if (refreshData?.user) {
              console.log('AuthContext: Session refreshed successfully:', refreshData.user.email);
              setUser(refreshData.user);
              
              const profileData = await _internalFetchProfile(refreshData.user.id, refreshData.user.email);
              if (!profileData) {
                console.error('AuthContext: Profile fetch failed after successful session refresh');
                throw new Error('Failed to load profile after successful authentication');
              }
            } else {
              console.warn('AuthContext: Session refresh returned no user despite success');
              throw new Error('Session refresh succeeded but returned no user');
            }
          } catch (refreshErr) {
            console.error('AuthContext: Error during forced refresh:', refreshErr);
            await forceSignOut();
            setLoading(false);
            setSessionChecked(true);
            clearTimeout(timeoutId);
            return;
          }
        } else {
          console.log('AuthContext: No user found in auth state');
          clearAuthState();
        }
      } catch (err) {
        console.error('AuthContext: Critical error checking initial session:', err);
        await forceSignOut();
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setLoading(false);
          setSessionChecked(true);
        }
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
  }, [_internalFetchProfile, forceSignOut, clearAuthState]);
  
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
      
      // First clear all local state
      setUser(null);
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
      
      // Then clear auth cookies/storage with scope: 'local'
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error('AuthContext: Error during sign out:', error);
        throw error;
      }
      
      console.log('AuthContext: Sign out successful.');
      
      // Force page reload to ensure all auth state is fresh
      window.location.href = '/';
      
    } catch (error) {
      console.error('AuthContext: Exception during sign out:', error);
      
      // Even if there's an error, try to clean up local storage directly
      try {
        localStorage.removeItem('supabase.auth.token');
      } catch (e) {
        console.error('AuthContext: Failed to manually clear local storage:', e);
      }
      
      // Force page reload anyway to clean state
      window.location.href = '/';
      
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
        await forceSignOut();
        return false;
      }
      
      console.log('AuthContext: Manual session refresh successful. User:', data.user);
      if (data.user) {
        setUser(data.user);
        await _internalFetchProfile(data.user.id, data.user.email);
        return true;
      } else {
        clearAuthState();
        return false;
      }
    } catch (err) {
      console.error('AuthContext: Error in manual refreshSession:', err);
      await forceSignOut();
      return false;
    } finally {
      setLoading(false);
    }
  }, [_internalFetchProfile, forceSignOut, clearAuthState]);
  
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
    sessionChecked,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 