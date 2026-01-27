import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, onAuthStateChange } from '../lib/supabase';

interface DbUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

interface AuthContextType {
  user: DbUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (supabaseUser: User) => {
    if (!supabase) {
      setUser(null);
      return;
    }
    
    try {
      // Get the current session with auto-refresh
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }
      
      if (!session?.access_token) {
        console.log('No active session, trying to refresh...');
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('Session refresh error:', refreshError);
          throw refreshError;
        }
        session = refreshedSession;
      }
      
      if (!session?.access_token) {
        console.error('No valid session after refresh');
        setUser(null);
        return;
      }

      // Try to fetch user from our database
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('User data from DB:', userData);
        setUser(userData);
      } else {
        console.log('Failed to fetch from DB, using Supabase metadata');
        // Fallback to Supabase metadata
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          firstName: supabaseUser.user_metadata?.full_name?.split(' ')[0] || '',
          lastName: supabaseUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          profileImageUrl: supabaseUser.user_metadata?.avatar_url || '',
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Fallback to Supabase metadata
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        firstName: supabaseUser.user_metadata?.email || '',
        lastName: supabaseUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        profileImageUrl: supabaseUser.user_metadata?.avatar_url || '',
      });
    }
  };

  useEffect(() => {
    // If supabase is not configured, skip auth setup
    if (!supabase) {
      console.log('Supabase not configured, skipping auth');
      setLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Initial session error:', sessionError);
          setUser(null);
          return;
        }
        
        if (session?.user) {
          console.log('Initial session found, fetching user data...');
          await fetchUserData(session.user);
        } else {
          console.log('No initial session found');
          setUser(null);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const authListener = onAuthStateChange(async (supabaseUser) => {
      console.log('Auth state changed:', supabaseUser ? 'User logged in' : 'User logged out');
      if (supabaseUser) {
        await fetchUserData(supabaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Set up periodic session refresh (every 30 minutes)
    const refreshInterval = setInterval(async () => {
      if (!supabase) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('Refreshing session...');
          await supabase.auth.refreshSession();
        }
      } catch (error) {
        console.error('Error refreshing session:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => {
      if (authListener?.data?.subscription) {
        authListener.data.subscription.unsubscribe();
      }
      clearInterval(refreshInterval);
    };
  }, []);

  const signOut = async () => {
    if (!supabase) {
      setUser(null);
      return;
    }
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
