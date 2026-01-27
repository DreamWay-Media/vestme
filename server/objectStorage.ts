import { createClient } from '@supabase/supabase-js';
import { Response } from "express";
import { randomUUID } from "crypto";

// Initialize Supabase client for storage
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Allow the app to start without Supabase credentials in development
const hasSupabaseConfig = supabaseUrl && supabaseServiceKey;

if (!hasSupabaseConfig) {
  console.warn('WARNING: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are not set. Object storage features will be disabled.');
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseServiceKey!)
  : null;

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service using Supabase Storage
export class ObjectStorageService {
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'pitch-perfect-files';
  }

  // Gets the public object search paths (for compatibility)
  getPublicObjectSearchPaths(): Array<string> {
    return [`${this.bucketName}/public`];
  }

  // Gets the private object directory (for compatibility)
  getPrivateObjectDir(): string {
    return `${this.bucketName}/private`;
  }

  // Search for a public object
  async searchPublicObject(filePath: string): Promise<any> {
    if (!supabase) {
      console.warn('Object storage not configured');
      return null;
    }
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list('public', {
          search: filePath,
          limit: 1
        });

      if (error) {
        console.error('Error searching public object:', error);
        return null;
      }

      if (data && data.length > 0) {
        return data[0];
      }

      return null;
    } catch (error) {
      console.error('Error searching public object:', error);
      return null;
    }
  }

  // Downloads an object to the response
  async downloadObject(filePath: string, res: Response, cacheTtlSec: number = 3600) {
    if (!supabase) {
      return res.status(503).json({ error: 'Object storage not configured' });
    }
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(filePath);

      if (error) {
        throw new ObjectNotFoundError();
      }

      // Set cache headers
      res.setHeader('Cache-Control', `public, max-age=${cacheTtlSec}`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filePath.split('/').pop()}"`);

      // Send the file data
      res.send(data);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: 'File not found' });
      } else {
        console.error('Error downloading object:', error);
        res.status(500).json({ error: 'Failed to download file' });
      }
    }
  }

  // Uploads a file to Supabase Storage
  async uploadFile(
    filePath: string,
    fileBuffer: Buffer,
    contentType: string,
    isPublic: boolean = false
  ): Promise<string> {
    if (!supabase) {
      throw new Error('Object storage not configured');
    }
    try {
      const folder = isPublic ? 'public' : 'private';
      const fullPath = `${folder}/${filePath}`;

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fullPath, fileBuffer, {
          contentType,
          upsert: true
        });

      if (error) {
        console.error('Error uploading file:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      // Get public URL if it's a public file
      if (isPublic) {
        const { data: urlData } = supabase.storage
          .from(this.bucketName)
          .getPublicUrl(fullPath);

        return urlData.publicUrl;
      }

      return fullPath;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Deletes a file from Supabase Storage
  async deleteFile(filePath: string): Promise<void> {
    if (!supabase) {
      throw new Error('Object storage not configured');
    }
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file:', error);
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Gets a signed URL for file upload
  async getSignedUploadURL(
    filePath: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    if (!supabase) {
      throw new Error('Object storage not configured');
    }
    try {
      const folder = 'public';
      const fullPath = `${folder}/${filePath}`;

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUploadUrl(fullPath, {
          upsert: true
        } as any);

      if (error) {
        console.error('Error creating signed upload URL:', error);
        throw new Error(`Failed to create upload URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed upload URL:', error);
      throw error;
    }
  }

  // Gets a signed URL for file download
  async getSignedDownloadURL(
    filePath: string,
    expiresIn: number = 3600
  ): Promise<string> {
    if (!supabase) {
      throw new Error('Object storage not configured');
    }
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Error creating signed download URL:', error);
        throw new Error(`Failed to create download URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed download URL:', error);
      throw error;
    }
  }

  // Lists files in a folder
  async listFiles(folder: string, limit: number = 100): Promise<any[]> {
    if (!supabase) {
      console.warn('Object storage not configured');
      return [];
    }
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(folder, {
          limit
        });

      if (error) {
        console.error('Error listing files:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  // Checks if a file exists
  async fileExists(filePath: string): Promise<boolean> {
    if (!supabase) {
      console.warn('Object storage not configured');
      return false;
    }
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(filePath.split('/').slice(0, -1).join('/'), {
          search: filePath.split('/').pop(),
          limit: 1
        });

      if (error) {
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Builds a public URL for a file stored in the bucket (expects a path like 'public/filename.ext')
  getPublicUrl(filePath: string): string {
    if (!supabaseUrl) {
      return '';
    }
    return `${supabaseUrl}/storage/v1/object/public/${this.bucketName}/${filePath}`;
  }

  // --- Entity Compatibility Methods ---

  normalizeObjectEntityPath(path: string): string {
    // Return path relative to bucket root or specific entity convention
    // Removing leading slashes
    return path.replace(/^\/+/, '');
  }

  async trySetObjectEntityAclPolicy(path: string, policy: any): Promise<void> {
    // Supabase specific ACL handling or no-op if relying on bucket policies
    console.log(`Setting ACL policy for ${path}:`, policy);
    // Real implementation would depend on Supabase RLS or specific metadata
    return Promise.resolve();
  }

  async getObjectEntityFile(path: string): Promise<Buffer | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(path);

      if (error || !data) return null;

      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (e) {
      console.error('Error getting object entity file:', e);
      return null;
    }
  }

  async canAccessObjectEntity(path: string, user: any): Promise<boolean> {
    // Implement permission logic based on path and user
    // For now, allow access if user is authenticated (which they are if this is called)
    // and relying on RLS policies in Supabase
    return true;
  }

  async getObjectEntityUploadURL(fileName: string, contentType: string): Promise<string> {
    return this.getSignedUploadURL(fileName, contentType);
  }

  async getObjectEntityDownloadURL(filePath: string): Promise<string> {
    return this.getSignedDownloadURL(filePath);
  }
}

// Create a default instance
export const objectStorageService = new ObjectStorageService();

// Legacy compatibility functions
export const objectStorageClient = {
  bucket: (bucketName: string) => ({
    file: (fileName: string) => ({
      exists: async () => [await objectStorageService.fileExists(`${bucketName}/${fileName}`)],
      download: async () => [await objectStorageService.getSignedDownloadURL(`${bucketName}/${fileName}`)],
      delete: async () => [await objectStorageService.deleteFile(`${bucketName}/${fileName}`)]
    })
  })
};

// Parse object path helper (for compatibility)
export function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  const parts = path.split('/').filter(p => p);
  if (parts.length < 2) {
    throw new Error('Invalid object path');
  }

  const bucketName = parts[0];
  const objectName = parts.slice(1).join('/');

  return { bucketName, objectName };
}
