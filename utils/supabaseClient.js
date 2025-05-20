import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'nuggs-auth-token',
    storage: {
      getItem: (key) => {
        try {
          return localStorage.getItem(key);
        } catch (e) {
          console.error('Error accessing localStorage:', e);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.error('Error writing to localStorage:', e);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.error('Error removing from localStorage:', e);
        }
      }
    }
  }
});

// Add this debug function that can be called to test the connection
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Supabase connection test failed:', error);
      return { success: false, error };
    }
    console.log('Supabase connection test successful');
    return { success: true, data };
  } catch (err) {
    console.error('Supabase connection test exception:', err);
    return { success: false, error: err };
  }
}; 