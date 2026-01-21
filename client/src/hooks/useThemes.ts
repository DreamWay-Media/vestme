import { useQuery } from "@tanstack/react-query";
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

export interface Theme {
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
    author?: string;
    colorScheme?: string;
    style?: string;
    [key: string]: any;
  };
  isLocked?: boolean;
  requiresUpgrade?: boolean;
  templates?: any[];
}

interface UseThemesOptions {
  tags?: string[];
  search?: string;
}

export function useThemes(options?: UseThemesOptions) {
  return useQuery({
    queryKey: ["themes", options],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams();
        
        if (options?.tags && options.tags.length > 0) {
          params.append("tags", options.tags.join(","));
        }
        if (options?.search) {
          params.append("search", options.search);
        }
        
        const url = `/api/themes${params.toString() ? `?${params.toString()}` : ""}`;
        
        const response = await fetch(url, {
          headers,
          credentials: 'include',
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch themes: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Ensure we return an array
        if (!Array.isArray(data)) {
          return [];
        }
        
        return data as Theme[];
      } catch (error) {
        throw error;
      }
    },
  });
}

export function useTheme(themeId: string | null) {
  return useQuery({
    queryKey: ["theme", themeId],
    queryFn: async () => {
      if (!themeId) return null;
      
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/themes/${themeId}`, {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch theme");
      }
      
      return response.json() as Promise<Theme>;
    },
    enabled: !!themeId,
  });
}

export function useThemeTemplates(themeId: string | null) {
  return useQuery({
    queryKey: ["theme-templates", themeId],
    queryFn: async () => {
      if (!themeId) return [];
      
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/themes/${themeId}/templates`, {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch theme templates");
      }
      
      return response.json() as Promise<any[]>;
    },
    enabled: !!themeId,
  });
}


