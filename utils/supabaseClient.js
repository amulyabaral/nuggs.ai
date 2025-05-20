import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

// Enhanced custom storage with better error handling
const createCustomStorage = () => {
  // Check if window is defined (client-side) or not (server-side)
  if (typeof window !== 'undefined') {
    // Client-side - use localStorage with robust error handling
    return {
      getItem: (key) => {
        try {
          const item = localStorage.getItem(key);
          // Check if it's valid JSON data (for Supabase items)
          if (key.includes('supabase') && item) {
            try {
              JSON.parse(item);
            } catch (e) {
              console.error('Invalid JSON in localStorage, removing item:', key);
              localStorage.removeItem(key);
              return null;
            }
          }
          return item;
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
          
          // If quota exceeded, try to clear old items
          if (e.name === 'QuotaExceededError') {
            try {
              // Clean up any potentially stale Supabase items
              Object.keys(localStorage).forEach(storageKey => {
                if (storageKey.includes('supabase') && storageKey !== key) {
                  localStorage.removeItem(storageKey);
                }
              });
              // Try again
              localStorage.setItem(key, value);
            } catch (clearError) {
              console.error('Still cannot write to localStorage after cleanup:', clearError);
            }
          }
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.error('Error removing from localStorage:', e);
        }
      }
    };
  } else {
    // Server-side - use in-memory storage (won't persist, but prevents errors)
    const storage = {};
    return {
      getItem: (key) => {
        return storage[key] || null;
      },
      setItem: (key, value) => {
        storage[key] = value;
      },
      removeItem: (key) => {
        delete storage[key];
      }
    };
  }
};

// Init client with more robust options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: typeof window !== 'undefined', // Only detect sessions in URL on client-side
    storageKey: 'nuggs-auth-token',
    storage: createCustomStorage(),
    flowType: 'implicit', // Use the implicit flow which is more reliable across browsers
    debug: false, // Set to true for more debugging in dev environments
  },
  realtime: {
    // Disable realtime subscriptions as they're not used
    params: {
      eventsPerSecond: 0
    }
  },
  global: {
    // Add sensible request timeouts
    fetch: (url, options) => {
      return fetch(url, { 
        ...options, 
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
    }
  }
});

// Enhanced test function with more details
export const testSupabaseConnection = async () => {
  try {
    const startTime = Date.now();
    
    // First test that auth service is available
    const { data: authData, error: authError } = await supabase.auth.getSession();
    const authTime = Date.now() - startTime;
    
    if (authError) {
      console.error('Supabase auth service test failed:', authError);
      return { 
        success: false, 
        error: authError, 
        details: { authTest: 'failed', time: authTime },
        message: 'Auth service check failed'
      };
    }
    
    // Test database connection next
    const dbStartTime = Date.now();
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
      .limit(1);
      
    const dbTime = Date.now() - dbStartTime;
    const totalTime = Date.now() - startTime;
    
    if (error) {
      console.error('Supabase database connection test failed:', error);
      return { 
        success: false, 
        error, 
        details: { 
          authTest: 'passed', 
          authTime,
          dbTest: 'failed', 
          dbTime,
          totalTime 
        },
        message: 'Database connection failed' 
      };
    }
    
    console.log(`Supabase connection test successful (${totalTime}ms - Auth: ${authTime}ms, DB: ${dbTime}ms)`);
    return { 
      success: true, 
      data, 
      details: { 
        authTest: 'passed',
        dbTest: 'passed',
        authTime,
        dbTime,
        totalTime 
      },
      message: 'Connection test successful'
    };
  } catch (err) {
    console.error('Supabase connection test exception:', err);
    return { success: false, error: err, message: 'Connection test threw an exception' };
  }
}; 