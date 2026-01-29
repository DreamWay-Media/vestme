import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export interface AdminTheme {
  id: string;
  slug: string;
  name: string;
  description: string;
  thumbnail: string;
  accessTier: "free" | "premium";
  isDefault: boolean;
  isEnabled: boolean;
  displayOrder: number;
  tags: string[];
  metadata?: {
    style?: string;
    colorScheme?: string;
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface AdminThemesOptions {
  tags?: string[];
  search?: string;
  isEnabled?: boolean;
}

export function useAdminThemes(options?: AdminThemesOptions) {
  return useQuery({
    queryKey: ['admin-themes', options],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      
      if (options?.tags && options.tags.length > 0) {
        params.append("tags", options.tags.join(","));
      }
      if (options?.search) {
        params.append("search", options.search);
      }
      if (options?.isEnabled !== undefined) {
        params.append("isEnabled", String(options.isEnabled));
      }
      
      const url = `/api/admin/themes${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch themes");
      }
      
      return response.json() as Promise<AdminTheme[]>;
    },
  });
}

export function useGetAdminTheme(themeId: string | null) {
  return useQuery({
    queryKey: ['admin-theme', themeId],
    queryFn: async () => {
      if (!themeId) return null;
      
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/themes/${themeId}`, {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch theme");
      }
      
      return response.json() as Promise<AdminTheme>;
    },
    enabled: !!themeId,
  });
}

export function useCreateTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (themeData: {
      name: string;
      slug: string;
      description?: string;
      accessTier: 'free' | 'premium';
      isDefault: boolean;
      isEnabled?: boolean;
      tags: string[];
      metadata?: any;
    }) => {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/themes', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(themeData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw error;
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
    },
  });
}

export function useUpdateTheme(themeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (themeData: Partial<AdminTheme>) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/themes/${themeId}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(themeData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to update theme');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-theme', themeId] });
      queryClient.invalidateQueries({ queryKey: ['admin-themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
    },
  });
}

export function useDeleteTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (themeId: string) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/themes/${themeId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw error;
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
    },
  });
}


