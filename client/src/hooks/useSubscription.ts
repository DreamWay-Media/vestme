import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No active session');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
  };
}

export interface Subscription {
  id: string;
  userId: string;
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}

export interface SubscriptionStatus {
  tier: 'free' | 'pro' | 'enterprise';
  subscription: Subscription | null;
  isPremium: boolean;
}

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/user/subscription', {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }
      
      return response.json() as Promise<SubscriptionStatus>;
    },
  });
}

export function useIsPremium() {
  const { data } = useSubscription();
  return data?.isPremium ?? false;
}

export function useUserTier() {
  const { data } = useSubscription();
  return data?.tier ?? 'free';
}

