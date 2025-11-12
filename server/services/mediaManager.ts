/**
 * Media Manager Service
 * Handles media asset upload, storage, extraction, and management
 */

import { db } from "@db";
import { mediaAssets } from "@db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import sharp from 'sharp';
import * as cheerio from 'cheerio';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

// Create Supabase client for storage operations
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STORAGE_BUCKET = 'project-media';
const MAX_STORAGE_PER_PROJECT_MB = 32;
const MAX_FILE_SIZE_MB = 10; // Max per file
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export interface UploadMediaParams {
  projectId: string;
  userId: string;
  file: Buffer;
  filename: string;
  fileType: string;
  source: 'upload' | 'website_extraction' | 'ai_generated';
  sourceUrl?: string;
  tags?: string[];
  description?: string;
  altText?: string;
}

export interface ExtractedImage {
  url: string;
  altText?: string;
  width?: number;
  height?: number;
  context?: string; // Surrounding text context for AI
}

export class MediaManager {
  /**
   * Check if project has storage space available
   */
  async checkStorageQuota(projectId: string, newFileSize: number): Promise<{ allowed: boolean; currentUsage: number; limit: number }> {
    try {
      const assets = await db
        .select({ totalSize: sql<number>`COALESCE(SUM(${mediaAssets.fileSize}), 0)` })
        .from(mediaAssets)
        .where(eq(mediaAssets.projectId, projectId));

      const currentUsageBytes = Number(assets[0]?.totalSize || 0);
      const currentUsageMB = currentUsageBytes / (1024 * 1024);
      const newFileSizeMB = newFileSize / (1024 * 1024);
      const limitMB = MAX_STORAGE_PER_PROJECT_MB;

      const allowed = (currentUsageMB + newFileSizeMB) <= limitMB;

      return {
        allowed,
        currentUsage: currentUsageMB,
        limit: limitMB
      };
    } catch (error) {
      console.error('Error checking storage quota:', error);
      throw new Error('Failed to check storage quota');
    }
  }

  /**
   * Validate file type and size
   */
  validateFile(fileType: string, fileSize: number): { valid: boolean; error?: string } {
    if (!ALLOWED_FILE_TYPES.includes(fileType)) {
      return {
        valid: false,
        error: `File type ${fileType} not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
      };
    }

    const fileSizeMB = fileSize / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      return {
        valid: false,
        error: `File size ${fileSizeMB.toFixed(2)}MB exceeds maximum ${MAX_FILE_SIZE_MB}MB`
      };
    }

    return { valid: true };
  }

  /**
   * Generate thumbnail from image
   */
  async generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const thumbnail = await sharp(imageBuffer)
        .resize(400, 300, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      return thumbnail;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  /**
   * Get image metadata (dimensions, format, etc.)
   */
  async getImageMetadata(imageBuffer: Buffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        hasAlpha: metadata.hasAlpha
      };
    } catch (error) {
      console.error('Error getting image metadata:', error);
      return null;
    }
  }

  /**
   * Upload media to Supabase Storage
   */
  async uploadMedia(params: UploadMediaParams) {
    const { projectId, userId, file, filename, fileType, source, sourceUrl, tags, description, altText } = params;

    try {
      // Validate file
      const validation = this.validateFile(fileType, file.length);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Check storage quota
      const quotaCheck = await this.checkStorageQuota(projectId, file.length);
      if (!quotaCheck.allowed) {
        throw new Error(`Storage quota exceeded. Current usage: ${quotaCheck.currentUsage.toFixed(2)}MB / ${quotaCheck.limit}MB`);
      }

      // Get image metadata
      const metadata = await this.getImageMetadata(file);

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${projectId}/${timestamp}_${sanitizedFilename}`;

      // Upload original image
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          contentType: fileType,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      // Generate and upload thumbnail
      let thumbnailUrl: string | null = null;
      try {
        const thumbnail = await this.generateThumbnail(file);
        const thumbnailPath = `${projectId}/thumbnails/${timestamp}_thumb_${sanitizedFilename}`;
        
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(thumbnailPath, thumbnail, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (!thumbError && thumbData) {
          const { data: thumbUrlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(thumbnailPath);
          thumbnailUrl = thumbUrlData?.publicUrl || null;
        }
      } catch (thumbError) {
        console.warn('Failed to generate thumbnail, continuing without it:', thumbError);
      }

      // Save to database
      const [mediaAsset] = await db.insert(mediaAssets).values({
        projectId,
        userId,
        filename: storagePath,
        originalFilename: filename,
        fileType,
        fileSize: file.length,
        storageUrl: urlData.publicUrl,
        thumbnailUrl,
        width: metadata?.width || null,
        height: metadata?.height || null,
        source,
        sourceUrl: sourceUrl || null,
        tags: tags || [],
        description: description || null,
        altText: altText || null,
        metadata: metadata || {},
        usageCount: 0
      }).returning();

      console.log(`✅ Media uploaded successfully: ${mediaAsset.id}`);
      return mediaAsset;
    } catch (error: any) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  /**
   * Extract images from a website URL
   */
  async extractImagesFromWebsite(websiteUrl: string): Promise<ExtractedImage[]> {
    try {
      console.log(`🔍 Extracting images from: ${websiteUrl}`);

      // Fetch the website HTML
      const response = await axios.get(websiteUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VestMe/1.0; +https://vestme.com)'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);
      const extractedImages: ExtractedImage[] = [];

      // Find all image tags
      $('img').each((_, element) => {
        const src = $(element).attr('src');
        const alt = $(element).attr('alt') || '';
        const width = $(element).attr('width');
        const height = $(element).attr('height');

        if (!src) return;

        // Convert relative URLs to absolute
        let absoluteUrl = src;
        if (src.startsWith('/')) {
          const urlObj = new URL(websiteUrl);
          absoluteUrl = `${urlObj.protocol}//${urlObj.host}${src}`;
        } else if (src.startsWith('http') === false) {
          const urlObj = new URL(websiteUrl);
          absoluteUrl = `${urlObj.protocol}//${urlObj.host}/${src}`;
        }

        // Skip very small images (likely icons, tracking pixels)
        const w = width ? parseInt(width) : 0;
        const h = height ? parseInt(height) : 0;
        if ((w > 0 && w < 50) || (h > 0 && h < 50)) {
          return;
        }

        // Skip common icon/logo patterns in URLs
        if (
          absoluteUrl.includes('icon') ||
          absoluteUrl.includes('favicon') ||
          absoluteUrl.includes('sprite') ||
          absoluteUrl.includes('pixel') ||
          absoluteUrl.includes('tracking')
        ) {
          return;
        }

        // Get surrounding context (nearby text)
        const parent = $(element).parent();
        const siblings = parent.find('p, h1, h2, h3, h4, h5, h6, span');
        const context = siblings
          .map((_, el) => $(el).text().trim())
          .get()
          .slice(0, 3)
          .join(' ')
          .substring(0, 200);

        extractedImages.push({
          url: absoluteUrl,
          altText: alt,
          width: width ? parseInt(width) : undefined,
          height: height ? parseInt(height) : undefined,
          context: context || undefined
        });
      });

      // Also check for Open Graph images
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) {
        let absoluteOgUrl = ogImage;
        if (ogImage.startsWith('/')) {
          const urlObj = new URL(websiteUrl);
          absoluteOgUrl = `${urlObj.protocol}//${urlObj.host}${ogImage}`;
        }

        // Add if not already in the list
        if (!extractedImages.some(img => img.url === absoluteOgUrl)) {
          extractedImages.unshift({
            url: absoluteOgUrl,
            altText: $('meta[property="og:image:alt"]').attr('content') || 'Open Graph Image',
            context: 'Primary website image (Open Graph)'
          });
        }
      }

      console.log(`✅ Found ${extractedImages.length} images on ${websiteUrl}`);
      return extractedImages;
    } catch (error: any) {
      console.error('Error extracting images from website:', error.message);
      throw new Error(`Failed to extract images: ${error.message}`);
    }
  }

  /**
   * Download and save extracted images
   */
  async saveExtractedImages(
    projectId: string,
    userId: string,
    images: ExtractedImage[],
    maxImages: number = 20
  ) {
    const savedAssets = [];
    const errors = [];

    // Limit the number of images to save
    const imagesToSave = images.slice(0, maxImages);

    for (const image of imagesToSave) {
      try {
        // Download the image
        const response = await axios.get(image.url, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; VestMe/1.0; +https://vestme.com)'
          }
        });

        const buffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'] || 'image/jpeg';

        // Extract filename from URL
        const urlParts = image.url.split('/');
        const filename = urlParts[urlParts.length - 1].split('?')[0] || 'extracted-image.jpg';

        // Upload the image
        const asset = await this.uploadMedia({
          projectId,
          userId,
          file: buffer,
          filename,
          fileType: contentType,
          source: 'website_extraction',
          sourceUrl: image.url,
          altText: image.altText,
          tags: ['website-extracted'],
          description: image.context
        });

        savedAssets.push(asset);
      } catch (error: any) {
        console.warn(`Failed to save image ${image.url}:`, error.message);
        errors.push({
          url: image.url,
          error: error.message
        });
      }
    }

    return {
      saved: savedAssets,
      errors,
      total: imagesToSave.length
    };
  }

  /**
   * Get all media assets for a project
   */
  async getProjectMedia(projectId: string) {
    try {
      const assets = await db
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.projectId, projectId))
        .orderBy(sql`${mediaAssets.createdAt} DESC`);

      return assets;
    } catch (error) {
      console.error('Error fetching project media:', error);
      throw new Error('Failed to fetch project media');
    }
  }

  /**
   * Delete a media asset
   */
  async deleteMedia(assetId: string, userId: string) {
    try {
      // Get the asset
      const [asset] = await db
        .select()
        .from(mediaAssets)
        .where(and(
          eq(mediaAssets.id, assetId),
          eq(mediaAssets.userId, userId)
        ));

      if (!asset) {
        throw new Error('Media asset not found or unauthorized');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([asset.filename]);

      if (storageError) {
        console.warn('Failed to delete from storage:', storageError);
      }

      // Delete thumbnail if exists
      if (asset.thumbnailUrl && asset.filename) {
        const thumbnailPath = asset.filename.replace(
          `${asset.projectId}/`,
          `${asset.projectId}/thumbnails/thumb_`
        );
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([thumbnailPath]);
      }

      // Delete from database
      await db
        .delete(mediaAssets)
        .where(eq(mediaAssets.id, assetId));

      console.log(`✅ Media deleted: ${assetId}`);
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting media:', error);
      throw error;
    }
  }

  /**
   * Update media asset metadata
   */
  async updateMediaMetadata(
    assetId: string,
    userId: string,
    updates: {
      tags?: string[];
      description?: string;
      altText?: string;
    }
  ) {
    try {
      const [updated] = await db
        .update(mediaAssets)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(
          eq(mediaAssets.id, assetId),
          eq(mediaAssets.userId, userId)
        ))
        .returning();

      if (!updated) {
        throw new Error('Media asset not found or unauthorized');
      }

      return updated;
    } catch (error) {
      console.error('Error updating media metadata:', error);
      throw new Error('Failed to update media metadata');
    }
  }

  /**
   * Increment usage count for a media asset
   */
  async incrementUsageCount(assetId: string) {
    try {
      await db
        .update(mediaAssets)
        .set({
          usageCount: sql`${mediaAssets.usageCount} + 1`
        })
        .where(eq(mediaAssets.id, assetId));
    } catch (error) {
      console.error('Error incrementing usage count:', error);
    }
  }
}

export const mediaManager = new MediaManager();

