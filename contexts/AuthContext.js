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
    console.log('[AuthContext] useEffect triggered. Supabase client:', supabase); // Check if supabase object is valid

    // setLoading(true) is already set initially for the component.
    // onAuthStateChange will fire once with the initial session or null.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] onAuthStateChange event:', event, 'session:', session);
        const authUser = session?.user ?? null;
        setUser(authUser); // Set user (or null)

        if (authUser) {
          // If user exists, fetch/refresh profile.
          // fetchProfile itself doesn't set the main loading state; this block's finally does.
          await fetchProfile(authUser.id);
        } else {
          // No user, clear profile related states
          setProfile(null);
          setUsageRemaining(0);
          setIsPremium(false);
        }
        setLoading(false); // Done processing this auth state change, or initial state.
      }
    );

    // Initial check for existing session is handled by the first fire of onAuthStateChange
    // const performInitialCheck = async () => {
    //     await checkUser();
    // };
    // performInitialCheck(); // This call is no longer needed

    return () => {
      // Make sure to access the subscription property of the authListener object
      authListener?.subscription?.unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount
  
  async function checkUser() {
    try {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        setUser(authUser);
        await fetchProfile(authUser.id);
      } else {
        // No user initially, ensure states are reset
        setUser(null);
        setProfile(null);
        setUsageRemaining(0);
        setIsPremium(false);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      // Ensure clean state on error during initial check
      setUser(null);
      setProfile(null);
      setUsageRemaining(0);
      setIsPremium(false);
    } finally {
      setLoading(false); // Always set loading to false after initial check
    }
  }
  
  async function fetchProfile(userId) {
    // Add a small delay to simulate network latency for testing timeout
    // await new Promise(resolve => setTimeout(resolve, 7000)); // REMOVE FOR PRODUCTION

    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') { // PGRST116: "Searched item was not found"
        console.error('Supabase error fetching profile:', profileError.message);
        // No need to throw here, let the function complete and set profile to null
      }
      
      if (!data) {
        // Profile does not exist for the user yet.
        // This can happen if the user just signed up and the trigger to create the profile hasn't run yet,
        // or if the trigger is missing/failed.
        console.warn(`Profile not found for user ${userId}. Setting default values. A profile should be created automatically on signup.`);
        setProfile(null); // Explicitly set profile to null if no data
        setIsPremium(false);
        // For a new user without a profile, they should get the default free tier allowance.
        setUsageRemaining(5); // UPDATED: Default free tier allowance to 5
        return; 
      }
      
      setProfile(data);
      
      const premium = data.subscription_tier === 'premium' && 
                     (data.subscription_expires_at ? new Date(data.subscription_expires_at) > new Date() : false);
      setIsPremium(premium);
      
      if (premium) {
        setUsageRemaining(Infinity);
      } else {
        const now = new Date();
        // Ensure daily_usage_reset_at and daily_usage_count exist or have defaults from the DB.
        // The DB defaults should handle this, but good to be safe.
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
            setUsageRemaining(5); // UPDATED: Reset to 5 per day
          } catch (e) {
            console.error("Error during daily usage reset logic:", e);
            // Fallback to existing count if update fails, to prevent locking user out
            setUsageRemaining(Math.max(0, 5 - currentUsageCount)); // UPDATED
          }
        } else {
          setUsageRemaining(Math.max(0, 5 - currentUsageCount)); // UPDATED
        }
      }
    } catch (error) { 
      console.error('Error in fetchProfile function:', error.message);
      setProfile(null);
      setIsPremium(false);
      setUsageRemaining(0); // Default to 0 if profile fetching fails critically
      // Do not re-throw here, allow AuthContext to handle the null profile
    }
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  }
  
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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
    refreshProfile: () => {
      if (user && !loading) {
        setLoading(true);
        return fetchProfile(user.id).finally(() => setLoading(false));
      }
      return Promise.resolve();
    },
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 