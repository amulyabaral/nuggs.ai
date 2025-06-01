import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSessionContext, useUser } from '@supabase/auth-helpers-react';

const AuthContext = createContext({
  user: null,
  profile: null,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  loading: true,
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

  const fetchProfile = useCallback(async (userId) => {
    if (!userId || !supabaseClient) {
      setProfile(null);
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
        setProfile(data);
      } else {
        setProfile(null);
        console.warn(`Profile not found for user ${userId}. This might be a new user whose profile is still being created, or an issue with profile data.`);
      }
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfileError(err.message || 'Failed to fetch profile.');
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [supabaseClient]);

  useEffect(() => {
    const currentUserId = user?.id;

    if (currentUserId) {
      if (!profileLoading && (!profile || profile.id !== currentUserId)) {
        fetchProfile(currentUserId);
      }
    } else {
      if (profile !== null || profileError !== null) {
        setProfile(null);
        setProfileError(null);
      }
    }
  }, [user?.id, profile?.id, profileLoading, fetchProfile]);

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
      email,
      password,
    });
    if (error) {
      console.error("Sign up error:", error);
      throw error;
    }
    return data;
  }
  
  async function signOut() {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        return;
      }
      setProfile(null);
      setProfileError(null);
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
    }
  }
  
  useEffect(() => {
    if (sessionError) {
      console.error('Session error from AuthContext:', sessionError);
    }
  }, [sessionError]);

  async function refreshUserProfile() {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }
  
  const overallLoading = sessionLoading || (!!user && profileLoading);

  async function signInWithGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Optional: redirectTo can be specified if you want to control
        // where the user is sent after successful Google auth.
        // redirectTo: `${window.location.origin}/dashboard` 
      }
    });
    if (error) {
      console.error("Google Sign in error:", error);
      throw error;
    }
    // Supabase handles the redirect to Google and then back to your app.
    // The session will be updated automatically by the Auth helpers.
  }

  const value = {
    user,
    profile,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    loading: overallLoading,
    refreshUserProfile,
    supabaseClient,
    profileError,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 