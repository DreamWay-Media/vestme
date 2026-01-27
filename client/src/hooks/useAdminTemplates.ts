import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Template } from './useTemplates';

interface AdminTemplatesOptions {
  category?: string;
  tags?: string[];
  search?: string;
  isEnabled?: boolean;
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No active session');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
  };
}

export function useAdminTemplates(options?: AdminTemplatesOptions) {
  return useQuery({
    queryKey: ['admin', 'templates', options],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (options?.category) params.append('category', options.category);
      if (options?.tags?.length) params.append('tags', options.tags.join(','));
      if (options?.search) params.append('search', options.search);
      if (options?.isEnabled !== undefined) params.append('isEnabled', String(options.isEnabled));
      
      const response = await fetch(`/api/admin/templates?${params}`, {
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

export function useGetTemplate(templateId: string | null) {
  return useQuery({
    queryKey: ['admin', 'template', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/templates/${templateId}`, {
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

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateData: Partial<Template>) => {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(templateData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      templateId: string;
      updates: Partial<Template>;
    }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/templates/${data.templateId}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data.updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update template');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate all template-related queries to ensure updates are visible everywhere
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'template'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      // Also invalidate the specific template query used when applying templates
      queryClient.invalidateQueries({ queryKey: ['template', variables.templateId] });
    },
  });
}

export function useSetDefaultTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateId: string) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/templates/${templateId}/set-default`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to set default template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

// BUG FIX 3: Separate hook for updating only enabled status (without changing theme access tier)
export function useUpdateTemplateEnabled() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      templateId: string;
      isEnabled: boolean;
    }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/templates/${data.templateId}/enabled`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          isEnabled: data.isEnabled,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update template enabled status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplateAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      templateId: string;
      accessTier: 'free' | 'premium';
      isEnabled: boolean;
    }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/templates/${data.templateId}/access`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          accessTier: data.accessTier,
          isEnabled: data.isEnabled,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update template access');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useReloadTemplates() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/templates/reload', {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to reload templates');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateId: string) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

