import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return {
    user: context.user,
    isLoading: context.loading,
    isAuthenticated: !!context.user,
    isAdmin: context.isAdmin,
    signOut: context.signOut,
    devLogin: context.devLogin,
  };
}
