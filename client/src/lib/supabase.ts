import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in development mode
export const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Allow the app to run without Supabase credentials
const hasSupabaseConfig = supabaseUrl && supabaseAnonKey;

if (!hasSupabaseConfig) {
  console.warn('Missing Supabase environment variables. Authentication features will be disabled.');
} else if (isDevelopment) {
  console.log('Development mode: Both dev login and real auth are available');
}

export const supabase: SupabaseClient | null = hasSupabaseConfig 
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      global: {
        headers: {
          'X-Client-Info': 'pitch-perfect-web',
        },
      },
    })
  : null;

// Auth helper functions
export const signInWithGoogle = async () => {
  if (!supabase) {
    throw new Error('Authentication is not configured');
  }
  
  // Use popup flow in development to work within Replit preview iframe
  // In production, use redirect flow for better UX
  const usePopup = isDevelopment;
  
  if (usePopup) {
    // Open in new window/tab for development
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });
    
    if (error) throw error;
    
    // Open the auth URL in a new window
    if (data?.url) {
      window.open(data.url, '_blank', 'width=500,height=600');
    }
    return data;
  } else {
    // Standard redirect flow for production
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) throw error;
    return data;
  }
};

export const signOut = async () => {
  if (!supabase) {
    throw new Error('Authentication is not configured');
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  if (!supabase) {
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const onAuthStateChange = (callback: (user: any) => void) => {
  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
};
