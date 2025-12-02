/**
 * React hooks for media management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

async function getAuthHeaders() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    await supabase.auth.refreshSession();
    const { data: { session: newSession } } = await supabase.auth.getSession();
    if (!newSession) {
      throw new Error('No valid session');
    }
    return {
      'Authorization': `Bearer ${newSession.access_token}`,
      'Content-Type': 'application/json',
    };
  }
  
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export interface MediaAsset {
  id: string;
  projectId: string;
  userId: string;
  filename: string;
  originalFilename: string | null;
  fileType: string;
  fileSize: number;
  storageUrl: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  source: 'upload' | 'website_extraction' | 'ai_generated';
  sourceUrl: string | null;
  tags: string[] | null;
  description: string | null;
  altText: string | null;
  metadata: any;
  usageCount: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MediaLibrary {
  assets: MediaAsset[];
  quota: {
    allowed: boolean;
    currentUsage: number;
    limit: number;
  };
}

/**
 * Fetch all media assets for a project
 */
export function useProjectMedia(projectId?: string) {
  return useQuery<MediaLibrary>({
    queryKey: [`/api/projects/${projectId}/media`],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/projects/${projectId}/media`, { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch media assets');
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Upload media file to project
 */
export function useUploadMedia(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      file: string; // base64 encoded
      filename: string;
      fileType: string;
      tags?: string[];
      description?: string;
      altText?: string;
    }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/projects/${projectId}/media/upload`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload media');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/media`] });
    },
  });
}

/**
 * Extract images from website
 */
export function useExtractImages(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      websiteUrl: string;
      maxImages?: number;
    }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/projects/${projectId}/media/extract`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to extract images');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/media`] });
    },
  });
}

/**
 * Update media asset metadata
 */
export function useUpdateMediaMetadata(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      assetId: string;
      tags?: string[];
      description?: string;
      altText?: string;
    }) => {
      const { assetId, ...updates } = data;
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/projects/${projectId}/media/${assetId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update media');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/media`] });
    },
  });
}

/**
 * Delete media asset
 */
export function useDeleteMedia(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/projects/${projectId}/media/${assetId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete media');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/media`] });
    },
  });
}

