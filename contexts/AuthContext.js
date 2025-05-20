import { createContext, useContext, useState, useEffect } from 'react';
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
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usageRemaining, setUsageRemaining] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const handleAuthChange = async (event, session) => {
      // Always set loading to true at the start of an auth change
      setLoading(true);
      try {
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
          setUsageRemaining(0);
          setIsPremium(false);
        }
      } catch (err) {
        console.error('Error handling auth change:', err);
        setUser(null);
        setProfile(null);
        setUsageRemaining(0);
        setIsPremium(false);
      } finally {
        // Always set loading to false at the end
        if (isMounted) setLoading(false);
      }
    };

    // Initial session check: always get the user and profile
    const checkInitialSession = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setUsageRemaining(0);
          setIsPremium(false);
        }
      } catch (err) {
        console.error('Error checking initial session:', err);
        setUser(null);
        setProfile(null);
        setUsageRemaining(0);
        setIsPremium(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkInitialSession();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Cleanup
    return () => {
      isMounted = false;
      if (authListener?.subscription?.unsubscribe) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);
  
  async function fetchProfile(userId) {
    console.log('Fetching profile for user ID:', userId);
    
    if (!userId) {
      console.error('Cannot fetch profile: userId is missing');
      setLoading(false); // Ensure we exit loading state
      return null;
    }

    try {
      // First, try to get the profile
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, creating a new one');
          
          // Profile doesn't exist, create it
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: user?.email,
              daily_usage_reset_at: new Date().toISOString(),
              daily_usage_count: 0,
              subscription_tier: 'free'
            })
            .select()
            .single();
            
          if (insertError) {
            console.error('Error creating profile:', insertError);
            setProfile(null);
            setIsPremium(false);
            setUsageRemaining(0);
            setLoading(false);
            return null;
          }
          
          // Use the newly created profile
          setProfile(newProfile);
          setIsPremium(false);
          // Get default free tries from environment variable, fallback to 5
          const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);
          setUsageRemaining(defaultFreeTries);
          setLoading(false);
          return newProfile;
        }
        
        // Handle other types of errors
        setProfile(null);
        setIsPremium(false);
        setUsageRemaining(0);
        setLoading(false);
        return null;
      }
      
      if (!data) {
        // Profile does not exist for the user yet.
        console.warn(`Profile not found for user ${userId}. Setting default values. A profile should be created automatically on signup.`);
        setProfile(null); // Explicitly set profile to null if no data
        
        // Get default free tries from environment variable, fallback to 5
        const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);
        setIsPremium(false);
        setUsageRemaining(defaultFreeTries); 
        return; 
      }
      
      setProfile(data);
      
      // Regular premium and usage calculation (no special overrides)
      const premium = data.subscription_tier === 'premium' && 
                     (data.subscription_expires_at ? new Date(data.subscription_expires_at) > new Date() : false);
      setIsPremium(premium);
      
      if (premium) {
        setUsageRemaining(Infinity);
      } else {
        const now = new Date();
        // Get default free tries from environment variable, fallback to 5
        const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);
        // Ensure daily_usage_reset_at and daily_usage_count exist or have defaults from the DB.
        const resetDate = data.daily_usage_reset_at ? new Date(data.daily_usage_reset_at) : new Date(0); 
        const currentUsageCount = data.daily_usage_count || 0;

        if (resetDate < now) {
          // Reset the counter if it's a new day or reset_at is in the past/null
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

            if (updateError) {
                console.error("Error updating daily usage in DB:", updateError);
                throw updateError;
            }
            
            setProfile(updatedProfileData); 
            setUsageRemaining(defaultFreeTries);
          } catch (e) {
            console.error("Error during daily usage reset logic:", e);
            // Fallback to existing count if update fails, to prevent locking user out
            setUsageRemaining(Math.max(0, defaultFreeTries - currentUsageCount));
          }
        } else {
          setUsageRemaining(Math.max(0, defaultFreeTries - currentUsageCount));
        }
      }
    } catch (error) { 
      console.error('Exception in fetchProfile function:', error);
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
      setLoading(false); // Always ensure loading is false after an error
      return null;
    }
    
    return data; // Return the profile data for optional chaining
  }
  
  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  }
  
  async function signUp(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      // After successful signup, let's manually ensure the profile exists
      if (data.user) {
        // Wait a moment to let the database trigger work first
        setTimeout(async () => {
          try {
            // Check if profile already exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', data.user.id)
              .single();
              
            if (!existingProfile) {
              // Profile doesn't exist yet, create it manually
              const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                  id: data.user.id,
                  email: data.user.email,
                  daily_usage_reset_at: new Date().toISOString()
                });
                
              if (profileError) console.error('Failed to create profile manually:', profileError);
            }
          } catch (err) {
            console.error('Error checking/creating profile after signup:', err);
          }
        }, 1000);
      }
      
      return data;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  }
  
  async function signOut() {
    try {
      console.log('Attempting to sign out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error during sign out:', error);
        throw error;
      }
      console.log('Sign out successful');
      // Force clean state even if the auth listener is slow to respond
      setUser(null);
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
    } catch (error) {
      console.error('Exception during sign out:', error);
      // Still try to clean state even if there's an error
      setUser(null);
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
    }
  }
  
  // Update usage count when recipe is generated
  async function incrementUsage() {
    if (!user) return false;
    
    if (isPremium) return true; // Premium users have unlimited usage
    
    // Check against the state variable `usageRemaining` which should be up-to-date
    if (usageRemaining <= 0) {
        console.log("Increment usage check: No usage remaining based on state.");
        return false; 
    }
    
    // It's also good to double-check the profile data directly if possible,
    // though this might introduce slight delay or complexity if profile isn't fresh.
    // For now, relying on `usageRemaining` state is okay if `fetchProfile` is robust.

    try {
      // It's crucial that `profile.daily_usage_count` is the value *before* this increment.
      // If `profile` state might be stale, re-fetch or be careful.
      // Assuming `profile` state is reasonably up-to-date from `fetchProfile` or previous increments.
      const newUsageCount = (profile?.daily_usage_count || 0) + 1;

      const { data, error } = await supabase
        .from('profiles')
        .update({
          daily_usage_count: newUsageCount
        })
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) throw error;
      
      setProfile(data); // Update profile state with the new count
      setUsageRemaining(Math.max(0, 5 - data.daily_usage_count)); // UPDATED
      
      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      // If increment fails, we probably shouldn't grant usage.
      // Consider how to handle this - maybe refresh profile to get latest server state.
      await fetchProfile(user.id); // Refresh profile to sync state
      return false;
    }
  }
  
  const refreshSession = async () => {
    try {
      setLoading(true);
      // Force a session refresh
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      // If successful, we'll have a user in the data
      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id);
      } else {
        // No user after refresh, clear state
        setUser(null);
        setProfile(null);
        setIsPremium(false);
        setUsageRemaining(0);
      }
      return data.user !== null;
    } catch (err) {
      console.error('Error refreshing session:', err);
      // On error, clear state to prevent stuck states
      setUser(null);
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
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
    refreshProfile: () => {
      if (user && !loading) {
        setLoading(true);
        console.log('Refreshing profile for user:', user.id);
        return fetchProfile(user.id)
          .then(() => {
            console.log('Profile refreshed successfully');
            return true;
          })
          .catch(err => {
            console.error('Error refreshing profile:', err);
            return false;
          })
          .finally(() => {
            setLoading(false);
          });
      }
      return Promise.resolve(false);
    },
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 