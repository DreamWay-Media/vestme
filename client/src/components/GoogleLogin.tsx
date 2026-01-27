import React from 'react';
import { useLocation } from 'wouter';
import { signInWithGoogle, supabase, isDevelopment } from '../lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface GoogleLoginProps {
  className?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'primary' | 'outline';
  forceDevLogin?: boolean;
}

export const GoogleLogin: React.FC<GoogleLoginProps> = ({ 
  className = '', 
  children,
  variant = 'default',
  forceDevLogin = false
}) => {
  const { devLogin } = useAuth();
  const [, navigate] = useLocation();
  
  const handleGoogleLogin = async () => {
    try {
      // If forced dev login or no Supabase configured, use dev login
      if (forceDevLogin || !supabase) {
        console.log('Using dev login');
        await devLogin();
        navigate('/projects');
        return;
      }
      await signInWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  // Base styles that apply to all variants
  const baseStyles = "flex items-center justify-center gap-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 font-medium";
  
  // Variant-specific styles (only used if no custom className overrides them)
  const variantStyles = {
    default: "px-6 py-3 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    primary: "px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "px-6 py-3 bg-background text-foreground border border-input hover:bg-accent"
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className={cn(
        baseStyles,
        !className && variantStyles[variant],
        className
      )}
    >
      {children || (
        <>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </>
      )}
    </button>
  );
};

// Development-only demo login button
export const DevLoginButton: React.FC<{ className?: string }> = ({ className }) => {
  const { devLogin } = useAuth();
  const [, navigate] = useLocation();
  
  if (!isDevelopment) return null;
  
  const handleDevLogin = async () => {
    try {
      await devLogin();
      navigate('/projects');
    } catch (error) {
      console.error('Dev login error:', error);
    }
  };
  
  return (
    <button
      onClick={handleDevLogin}
      className={cn(
        "flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors",
        "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200",
        "text-sm font-medium",
        className
      )}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
      Demo Login (Dev Mode)
    </button>
  );
};
