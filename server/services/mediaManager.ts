/**
 * Media Manager Service
 * Handles media asset upload, storage, extraction, and management
 */

import { db } from '../db';
import { mediaAssets } from '../../shared/schema';
import { eq, and, sql } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import * as cheerio from 'cheerio';
import https from 'https';
import http from 'http';
import { ImageSecurityValidator } from './imageSecurityValidator';

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

/**
 * Helper function to make HTTP requests without axios (with redirect support)
 */
function httpGet(url: string, maxRedirects = 5): Promise<{ data: any; headers: any }> {
  return new Promise((resolve, reject) => {
    if (maxRedirects === 0) {
      reject(new Error('Too many redirects'));
      return;
    }

    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VestMe/1.0; +https://vestme.com)'
      }
    };
    
    lib.get(url, options, (res) => {
      // Handle redirects (301, 302, 307, 308)
      if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode)) {
        const redirectUrl = res.headers.location;
        if (!redirectUrl) {
          reject(new Error(`Redirect without location header`));
          return;
        }
        
        // Follow the redirect
        const newUrl = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, url).href;
        console.log(`Following redirect: ${url} -> ${newUrl}`);
        
        httpGet(newUrl, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }
      
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          data: buffer,
          headers: res.headers
        });
      });
    }).on('error', reject).setTimeout(10000, () => {
      reject(new Error('Request timeout'));
    });
  });
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
   * Upload media to Supabase Storage (with comprehensive security validation)
   */
  async uploadMedia(params: UploadMediaParams) {
    const { projectId, userId, file, filename, fileType, source, sourceUrl, tags, description, altText } = params;

    try {
      console.log(`🔒 Starting secure upload: ${filename}`);

      // ===== SECURITY LAYER 1: Comprehensive Validation =====
      const securityCheck = await ImageSecurityValidator.validateUpload({
        buffer: file,
        filename,
        mimeType: fileType,
        tags,
        description,
        altText
      });

      if (!securityCheck.valid) {
        console.error(`❌ Security validation failed: ${securityCheck.error}`);
        throw new Error(`Security validation failed: ${securityCheck.error}`);
      }

      if (securityCheck.warnings && securityCheck.warnings.length > 0) {
        console.warn(`⚠️  Upload warnings:`, securityCheck.warnings);
      }

      // Use sanitized filename and buffer
      const sanitizedFilename = securityCheck.sanitizedFilename!;
      const sanitizedBuffer = securityCheck.sanitizedBuffer!;

      console.log(`✅ Security validation passed for: ${sanitizedFilename}`);

      // ===== SECURITY LAYER 2: File Type and Size Validation =====
      const validation = this.validateFile(fileType, sanitizedBuffer.length);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // ===== SECURITY LAYER 3: Storage Quota Check =====
      const quotaCheck = await this.checkStorageQuota(projectId, sanitizedBuffer.length);
      if (!quotaCheck.allowed) {
        throw new Error(`Storage quota exceeded. Current usage: ${quotaCheck.currentUsage.toFixed(2)}MB / ${quotaCheck.limit}MB`);
      }

      // Get image metadata (from sanitized buffer)
      const metadata = await this.getImageMetadata(sanitizedBuffer);

      // Generate unique filename with additional entropy
      const timestamp = Date.now();
      const storagePath = `${projectId}/${timestamp}_${sanitizedFilename}`;

      // Upload sanitized image
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, sanitizedBuffer, {
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

      // Generate and upload thumbnail (from sanitized buffer)
      let thumbnailUrl: string | null = null;
      try {
        const thumbnail = await this.generateThumbnail(sanitizedBuffer);
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

      // Save to database (with sanitized/validated data only)
      const [mediaAsset] = await db.insert(mediaAssets).values({
        projectId,
        userId,
        filename: storagePath,
        originalFilename: sanitizedFilename, // Use sanitized name
        fileType,
        fileSize: sanitizedBuffer.length, // Use sanitized buffer size
        storageUrl: urlData.publicUrl,
        thumbnailUrl,
        width: metadata?.width || null,
        height: metadata?.height || null,
        source,
        sourceUrl: sourceUrl || null,
        tags: tags || [], // Already validated by security check
        description: description || null, // Already validated
        altText: altText || null, // Already validated
        metadata: metadata || {},
        usageCount: 0
      }).returning();

      console.log(`✅ Media uploaded successfully with security validation: ${mediaAsset.id}`);
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
      const response = await httpGet(websiteUrl);
      const html = response.data.toString('utf-8');
      const $ = cheerio.load(html);
      const extractedImages: ExtractedImage[] = [];
      const logoImages: string[] = [];

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

        // Detect if this is likely a logo
        const isLikelyLogo = 
          absoluteUrl.toLowerCase().includes('logo') ||
          alt.toLowerCase().includes('logo') ||
          $(element).attr('class')?.toLowerCase().includes('logo') ||
          $(element).attr('id')?.toLowerCase().includes('logo') ||
          $(element).closest('header, nav, .header, .navbar, .logo').length > 0;
        
        if (isLikelyLogo) {
          logoImages.push(absoluteUrl);
        }

        // Skip common icon/favicon patterns in URLs (but not logos)
        if (
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

      // Check for logo-specific elements
      // 1. Link rel icons (apple-touch-icon, icon, shortcut icon)
      $('link[rel*="icon"]').each((_, element) => {
        const href = $(element).attr('href');
        if (href && !href.includes('favicon')) {
          let absoluteUrl = href;
          if (href.startsWith('/')) {
            const urlObj = new URL(websiteUrl);
            absoluteUrl = `${urlObj.protocol}//${urlObj.host}${href}`;
          } else if (!href.startsWith('http')) {
            const urlObj = new URL(websiteUrl);
            absoluteUrl = `${urlObj.protocol}//${urlObj.host}/${href}`;
          }
          if (!logoImages.includes(absoluteUrl)) {
            logoImages.push(absoluteUrl);
          }
        }
      });

      // 2. Logo from JSON-LD structured data
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const jsonLd = JSON.parse($(element).html() || '{}');
          if (jsonLd.logo?.url) {
            const logoUrl = jsonLd.logo.url.startsWith('http') 
              ? jsonLd.logo.url 
              : new URL(jsonLd.logo.url, websiteUrl).href;
            if (!logoImages.includes(logoUrl)) {
              logoImages.push(logoUrl);
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
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

      // Add detected logos to the beginning of the array with special marking
      for (const logoUrl of logoImages) {
        if (!extractedImages.some(img => img.url === logoUrl)) {
          extractedImages.unshift({
            url: logoUrl,
            altText: 'Company Logo',
            context: 'Detected logo from website'
          });
        }
      }

      console.log(`✅ Found ${extractedImages.length} images (${logoImages.length} logos) on ${websiteUrl}`);
      return extractedImages;
    } catch (error: any) {
      console.error('Error extracting images from website:', error.message);
      throw new Error(`Failed to extract images: ${error.message}`);
    }
  }

  /**
   * Check if image already exists in project
   */
  async imageExists(projectId: string, sourceUrl: string): Promise<boolean> {
    try {
      const [existing] = await db
        .select()
        .from(mediaAssets)
        .where(and(
          eq(mediaAssets.projectId, projectId),
          eq(mediaAssets.sourceUrl, sourceUrl)
        ))
        .limit(1);
      
      return !!existing;
    } catch (error) {
      console.error('Error checking image existence:', error);
      return false;
    }
  }

  /**
   * Filter images to only include those suitable for pitch decks
   */
  filterPitchDeckRelevantImages(images: ExtractedImage[]): ExtractedImage[] {
    return images.filter(image => {
      // 1. Skip very small images (likely icons, buttons)
      if (image.width && image.height) {
        if (image.width < 200 || image.height < 200) {
          console.log(`⊘ Skipping small image: ${image.url} (${image.width}x${image.height})`);
          return false;
        }
      }

      // 2. Skip images with promotional/ad keywords in URL
      const url = image.url.toLowerCase();
      const skipKeywords = [
        'banner', 'ad-', 'advertisement', 'promo-', 'popup',
        'cookie', 'social-icon', 'share-', 'badge', 'button',
        'arrow', 'chevron', 'caret', 'spinner', 'loader'
      ];
      
      if (skipKeywords.some(keyword => url.includes(keyword))) {
        console.log(`⊘ Skipping promotional/UI element: ${image.url}`);
        return false;
      }

      // 3. Keep logos (always relevant for pitch decks)
      const alt = image.altText?.toLowerCase() || '';
      const context = image.context?.toLowerCase() || '';
      if (alt.includes('logo') || context.includes('logo') || url.includes('logo')) {
        console.log(`✓ Keeping logo: ${image.url}`);
        return true;
      }

      // 4. Keep images with pitch-deck relevant keywords
      const relevantKeywords = [
        'product', 'team', 'founder', 'office', 'dashboard',
        'app', 'platform', 'feature', 'service', 'solution',
        'hero', 'about', 'vision', 'mission', 'graph', 'chart',
        'infographic', 'metric', 'result', 'achievement', 'award'
      ];
      
      if (relevantKeywords.some(keyword => 
        alt.includes(keyword) || context.includes(keyword) || url.includes(keyword)
      )) {
        console.log(`✓ Keeping relevant image: ${image.url}`);
        return true;
      }

      // 5. Keep larger, high-quality images (likely feature images)
      if (image.width && image.height && image.width >= 800 && image.height >= 600) {
        console.log(`✓ Keeping high-quality image: ${image.url} (${image.width}x${image.height})`);
        return true;
      }

      // 6. Skip if no clear indication of relevance
      console.log(`⊘ Skipping potentially irrelevant: ${image.url}`);
      return false;
    });
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
    const skipped = [];

    // Filter to only pitch-deck relevant images
    console.log(`📊 Filtering ${images.length} images for pitch deck relevance...`);
    const relevantImages = this.filterPitchDeckRelevantImages(images);
    console.log(`✅ ${relevantImages.length} relevant images after filtering`);

    // Limit the number of images to save
    const imagesToSave = relevantImages.slice(0, maxImages);

    for (const image of imagesToSave) {
      try {
        // Check for duplicates first
        const isDuplicate = await this.imageExists(projectId, image.url);
        if (isDuplicate) {
          console.log(`⊘ Skipping duplicate: ${image.url}`);
          skipped.push({
            url: image.url,
            reason: 'duplicate'
          });
          continue;
        }

        // Download the image
        const response = await httpGet(image.url);
        const buffer = response.data;
        const contentType = response.headers['content-type'] || 'image/jpeg';

        // Validate file size (skip if too small - likely icon)
        const fileSizeKB = buffer.length / 1024;
        if (fileSizeKB < 5) {
          console.log(`⊘ Skipping tiny file: ${image.url} (${fileSizeKB.toFixed(1)} KB)`);
          skipped.push({
            url: image.url,
            reason: 'too_small'
          });
          continue;
        }

        // Extract filename from URL
        const urlParts = image.url.split('/');
        const filename = urlParts[urlParts.length - 1].split('?')[0] || 'extracted-image.jpg';

        // Use AI to analyze and tag the image (async, best effort)
        let aiTags: string[] = [];
        try {
          const { analyzeImageWithAI } = await import('./openai');
          aiTags = await analyzeImageWithAI(image.url);
        } catch (aiError) {
          console.warn(`AI tagging failed for ${image.url}, using fallback tags`);
          // Fallback: use context-based tags
          if (image.altText?.toLowerCase().includes('logo')) {
            aiTags = ['logo'];
          } else if (image.context?.toLowerCase().includes('logo')) {
            aiTags = ['logo'];
          } else {
            aiTags = ['photo'];
          }
        }

        // Combine AI tags with extraction source
        const allTags = ['website-extracted', ...aiTags];

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
          tags: allTags,
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

    const stats = {
      totalFound: images.length,
      filtered: images.length - relevantImages.length,
      duplicates: skipped.filter(s => s.reason === 'duplicate').length,
      tooSmall: skipped.filter(s => s.reason === 'too_small').length,
      saved: savedAssets.length,
      errors: errors.length
    };

    console.log(`📊 Extraction Summary:
      - Total images found: ${stats.totalFound}
      - Filtered out (irrelevant): ${stats.filtered}
      - Skipped (duplicates): ${stats.duplicates}
      - Skipped (too small): ${stats.tooSmall}
      - Successfully saved: ${stats.saved}
      - Errors: ${stats.errors}
    `);

    return {
      saved: savedAssets,
      errors,
      skipped,
      stats,
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

