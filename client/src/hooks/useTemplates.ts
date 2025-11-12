import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'title' | 'content' | 'data' | 'closing';
  thumbnail: string;
  accessTier: 'free' | 'premium';
  isDefault: boolean;
  isEnabled: boolean;
  displayOrder: number;
  isLocked?: boolean;
  requiresUpgrade?: boolean;
  usageCount?: number;
  tags?: string[];
  layout: any;
  defaultStyling: any;
  contentSchema: any;
}

interface UseTemplatesOptions {
  category?: string;
  tags?: string[];
  search?: string;
}

export function useTemplates(options?: UseTemplatesOptions) {
  return useQuery({
    queryKey: ['templates', options],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (options?.category) params.append('category', options.category);
      if (options?.tags?.length) params.append('tags', options.tags.join(','));
      if (options?.search) params.append('search', options.search);
      
      const response = await fetch(`/api/templates?${params}`, {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      return response.json() as Promise<Template[]>;
    },
  });
}

export function useTemplate(templateId: string | null) {
  return useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/templates/${templateId}`, {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }
      
      return response.json() as Promise<Template>;
    },
    enabled: !!templateId,
  });
}

export function useDefaultTemplate() {
  return useQuery({
    queryKey: ['template', 'default'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/templates/default/get', {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch default template');
      }
      
      return response.json() as Promise<Template>;
    },
  });
}

export function useApplyTemplate(deckId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      templateId: string;
      content: any;
      overrides?: any;
    }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/decks/${deckId}/slides/from-template`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate deck queries to refetch with new slide
      queryClient.invalidateQueries({ queryKey: ['deck', deckId] });
    },
  });
}

export function useApplyTemplateToSlide(deckId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      slideId: string;
      templateId: string;
      content?: any;
      overrides?: any;
    }) => {
      const headers = await getAuthHeaders();
      const { slideId, ...requestData } = data;
      const response = await fetch(`/api/decks/${deckId}/slides/${slideId}/apply-template`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate deck queries to refetch updated slide
      queryClient.invalidateQueries({ queryKey: ['deck', deckId] });
      queryClient.invalidateQueries({ queryKey: [`/api/decks/${deckId}`] });
    },
  });
}

export function useCreateTemplateFromSlide() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      slideId: string;
      deckId: string;
      name: string;
      description?: string;
    }) => {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/templates/from-slide', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate templates to show new custom template
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

