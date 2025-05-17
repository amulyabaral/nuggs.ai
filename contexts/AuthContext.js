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
    // Get initial auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setUsageRemaining(0);
          setIsPremium(false);
        }
        
        setLoading(false);
      }
    );
    
    // Initial check for existing session
    checkUser();
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  
  async function checkUser() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        await fetchProfile(user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      
      setProfile(data);
      
      // Check if user is premium
      const premium = data.subscription_tier === 'premium' && 
                     (data.subscription_expires_at ? new Date(data.subscription_expires_at) > new Date() : false);
      setIsPremium(premium);
      
      // Calculate remaining daily usage
      if (premium) {
        setUsageRemaining(Infinity); // Unlimited for premium users
      } else {
        // Check if we need to reset the daily counter
        const resetDate = new Date(data.daily_usage_reset_at);
        const now = new Date();
        
        if (resetDate < now) {
          // Reset the counter if it's a new day
          await supabase
            .from('profiles')
            .update({
              daily_usage_count: 0,
              daily_usage_reset_at: now
            })
            .eq('id', userId);
          
          setUsageRemaining(3); // Reset to 3 per day
        } else {
          setUsageRemaining(Math.max(0, 3 - data.daily_usage_count));
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
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
    
    if (usageRemaining <= 0) return false; // No usage remaining
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          daily_usage_count: profile.daily_usage_count + 1
        })
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) throw error;
      
      setProfile(data);
      setUsageRemaining(Math.max(0, 3 - data.daily_usage_count));
      
      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
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
    refreshProfile: () => user && fetchProfile(user.id),
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 