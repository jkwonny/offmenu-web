import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '🔴 Missing Supabase environment variables. Please check your .env.local file.'
  );
  
  // In development, provide specific error message about which variables are missing
  if (process.env.NODE_ENV === 'development') {
    if (!supabaseUrl) console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

// Helper function to handle auth errors
export const handleAuthError = (error: Error | { message?: string }) => {
  console.error('Auth error:', error?.message || error);
  
  // Check for specific auth error types
  if (error?.message?.includes('Invalid Refresh Token')) {
    // Clear localStorage auth data to ensure clean slate
    if (typeof window !== 'undefined') {
      localStorage.removeItem('offmenu-auth-token');
    }
    
    return 'Your session has expired. Please sign in again.';
  }
  
  return error?.message || 'Authentication error occurred';
};

// Create a Supabase client with the public URL and anon key
export const supabase = createClient(
    supabaseUrl || 'https://placeholder-url.supabase.co', // Fallback to prevent crash
    supabaseAnonKey || 'placeholder-key',                 // Fallback to prevent crash
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'offmenu-auth-token',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      global: {
        // Add request timeout to prevent hanging requests
        fetch: (url, options = {}) => {
          const fetchOptions = {
            ...options,
            // Add a timeout to the request
            signal: options.signal || (AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined),
          };
          return fetch(url, fetchOptions);
        },
      },
    }
);

// Set up auth state listener (separate from client creation to avoid type errors)
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
    } else if (event === 'SIGNED_OUT') {
    } else if (event === 'USER_UPDATED') {
    }
  });
}