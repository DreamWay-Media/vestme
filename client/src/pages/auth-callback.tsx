import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '../lib/supabase';

export const AuthCallback: React.FC = () => {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the URL hash and search params
        const hash = window.location.hash;
        const searchParams = new URLSearchParams(window.location.search);
        
        // Check for errors in both query params and hash
        const error = searchParams.get('error') || (hash.includes('error=') ? new URLSearchParams(hash.substring(1)).get('error') : null);
        const errorDescription = searchParams.get('error_description') || (hash.includes('error_description=') ? new URLSearchParams(hash.substring(1)).get('error_description') : null);
        
        if (error) {
          setError(errorDescription || error);
          setTimeout(() => setLocation('/'), 3000);
          return;
        }

        // Supabase automatically handles the hash and sets the session
        // We just need to wait a moment for it to process
        await new Promise(resolve => setTimeout(resolve, 500));

        // Handle the OAuth callback
        if (!supabase) {
          setError('Authentication service not configured');
          setTimeout(() => setLocation('/'), 3000);
          return;
        }
        
        const { data, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('Auth callback error:', authError);
          setError('Authentication failed. Please try again.');
          setTimeout(() => setLocation('/'), 3000);
          return;
        }

        if (data.session) {
          // Successfully authenticated - redirect to root which shows Dashboard for authenticated users
          setLocation('/');
        } else {
          setError('No session found. Please try logging in again.');
          setTimeout(() => setLocation('/'), 3000);
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
        setError('An unexpected error occurred. Please try again.');
        setTimeout(() => setLocation('/'), 3000);
      }
    };

    handleAuthCallback();
  }, [setLocation]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Authentication Error</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <p className="mt-4 text-sm text-gray-500">Redirecting to home page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Authenticating...</h2>
          <p className="mt-2 text-sm text-gray-600">Please wait while we complete your sign-in.</p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
