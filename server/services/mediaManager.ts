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
   * Extract images from a website URL with multi-page crawling
   * Crawls up to 10 pages and collects up to 20 images or 32MB total
   */
  async extractImagesFromWebsite(websiteUrl: string): Promise<ExtractedImage[]> {
    try {
      console.log(`🔍 Extracting images from: ${websiteUrl} (multi-page crawl)`);

      const baseUrl = new URL(websiteUrl);
      const visitedUrls = new Set<string>([websiteUrl]);
      const allExtractedImages: ExtractedImage[] = [];
      const imageUrlSet = new Set<string>(); // Track unique image URLs
      const imageHashes = new Map<string, string>(); // Track image hashes for duplicate detection
      let totalSizeBytes = 0;
      const MAX_SIZE_BYTES = 32 * 1024 * 1024; // 32 MB
      const MAX_IMAGES = 20;
      const MAX_PAGES = 10;

      // Helper to normalize image URL for comparison
      const normalizeImageUrl = (url: string): string => {
        try {
          const urlObj = new URL(url);
          // Remove query parameters and fragments for comparison
          return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
        } catch {
          return url;
        }
      };

      // Helper to check if images are similar (same normalized URL or very similar paths)
      const isDuplicateImage = (url: string): boolean => {
        const normalized = normalizeImageUrl(url);
        
        // Check exact match
        if (imageUrlSet.has(normalized)) {
          return true;
        }

        // Check for similar paths (e.g., image.jpg vs image-1.jpg)
        const urlPath = normalized.toLowerCase();
        for (const existingUrl of imageUrlSet) {
          const existingPath = existingUrl.toLowerCase();
          // If paths are very similar (differ only by version numbers or sizes), consider duplicate
          const path1 = urlPath.split('/').pop() || '';
          const path2 = existingPath.split('/').pop() || '';
          
          // Remove common suffixes like -150x150, -300x300, etc.
          const cleanPath1 = path1.replace(/-\d+x\d+/, '').replace(/-\d+w/, '').replace(/-\d+h/, '');
          const cleanPath2 = path2.replace(/-\d+x\d+/, '').replace(/-\d+w/, '').replace(/-\d+h/, '');
          
          if (cleanPath1 === cleanPath2 && cleanPath1.length > 0) {
            return true;
          }
        }
        
        return false;
      };

      // Extract images from a single page
      const extractImagesFromPage = async (pageUrl: string): Promise<ExtractedImage[]> => {
        try {
          console.log(`  📄 Crawling page: ${pageUrl}`);
          const response = await httpGet(pageUrl);
          const html = response.data.toString('utf-8');
          const $ = cheerio.load(html);
          const pageImages: ExtractedImage[] = [];
          const logoImages: string[] = [];

          // Find all image tags (process from top to bottom)
          $('img').each((_, element) => {
            // Stop if we've reached limits
            if (allExtractedImages.length >= MAX_IMAGES || totalSizeBytes >= MAX_SIZE_BYTES) {
              return false; // Break the loop
            }

            const src = $(element).attr('src') || $(element).attr('data-src') || $(element).attr('data-lazy-src');
            const alt = $(element).attr('alt') || '';
            const width = $(element).attr('width');
            const height = $(element).attr('height');

            if (!src) return;

            // Convert relative URLs to absolute
            let absoluteUrl = src;
            try {
              if (src.startsWith('/')) {
                absoluteUrl = `${baseUrl.protocol}//${baseUrl.host}${src}`;
              } else if (!src.startsWith('http')) {
                absoluteUrl = new URL(src, pageUrl).href;
              }
            } catch {
              return; // Skip invalid URLs
            }

            // Only skip images with explicit very small dimensions (likely icons, tracking pixels)
            // If no size info, keep it - we'll check actual size when downloading
            const w = width ? parseInt(width) : 0;
            const h = height ? parseInt(height) : 0;
            if (w > 0 && h > 0 && ((w < 20) || (h < 20))) {
              return; // Only skip if we have explicit dimensions AND they're very small
            }

            // Check for duplicates
            if (isDuplicateImage(absoluteUrl)) {
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

            pageImages.push({
              url: absoluteUrl,
              altText: alt,
              width: width ? parseInt(width) : undefined,
              height: height ? parseInt(height) : undefined,
              context: context || undefined
            });

            imageUrlSet.add(normalizeImageUrl(absoluteUrl));
          });

          // Check for logo-specific elements
          $('link[rel*="icon"]').each((_, element) => {
            const href = $(element).attr('href');
            if (href && !href.includes('favicon')) {
              try {
                let absoluteUrl = href;
                if (href.startsWith('/')) {
                  absoluteUrl = `${baseUrl.protocol}//${baseUrl.host}${href}`;
                } else if (!href.startsWith('http')) {
                  absoluteUrl = new URL(href, pageUrl).href;
                }
                if (!logoImages.includes(absoluteUrl) && !isDuplicateImage(absoluteUrl)) {
                  logoImages.push(absoluteUrl);
                  imageUrlSet.add(normalizeImageUrl(absoluteUrl));
                }
              } catch {
                // Skip invalid URLs
              }
            }
          });

          // Logo from JSON-LD structured data
          $('script[type="application/ld+json"]').each((_, element) => {
            try {
              const jsonLd = JSON.parse($(element).html() || '{}');
              if (jsonLd.logo?.url) {
                const logoUrl = jsonLd.logo.url.startsWith('http') 
                  ? jsonLd.logo.url 
                  : new URL(jsonLd.logo.url, pageUrl).href;
                if (!logoImages.includes(logoUrl) && !isDuplicateImage(logoUrl)) {
                  logoImages.push(logoUrl);
                  imageUrlSet.add(normalizeImageUrl(logoUrl));
                }
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          });

          // Open Graph images
          const ogImage = $('meta[property="og:image"]').attr('content');
          if (ogImage) {
            try {
              let absoluteOgUrl = ogImage;
              if (ogImage.startsWith('/')) {
                absoluteOgUrl = `${baseUrl.protocol}//${baseUrl.host}${ogImage}`;
              } else if (!ogImage.startsWith('http')) {
                absoluteOgUrl = new URL(ogImage, pageUrl).href;
              }

              if (!isDuplicateImage(absoluteOgUrl)) {
                pageImages.unshift({
                  url: absoluteOgUrl,
                  altText: $('meta[property="og:image:alt"]').attr('content') || 'Open Graph Image',
                  context: 'Primary website image (Open Graph)'
                });
                imageUrlSet.add(normalizeImageUrl(absoluteOgUrl));
              }
            } catch {
              // Skip invalid URLs
            }
          }

          // Add detected logos to the beginning
          for (const logoUrl of logoImages) {
            if (!pageImages.some(img => img.url === logoUrl)) {
              pageImages.unshift({
                url: logoUrl,
                altText: 'Company Logo',
                context: 'Detected logo from website'
              });
            }
          }

          console.log(`  ✅ Found ${pageImages.length} unique images on ${pageUrl}`);
          return pageImages;
        } catch (error: any) {
          console.warn(`  ⚠️ Error extracting images from ${pageUrl}:`, error.message);
          return [];
        }
      };

      // Find links to other pages on the website
      const findInternalLinks = async (pageUrl: string): Promise<string[]> => {
        try {
          const response = await httpGet(pageUrl);
          const html = response.data.toString('utf-8');
          const $ = cheerio.load(html);
          const links: string[] = [];

          $('a[href]').each((_, element) => {
            const href = $(element).attr('href');
            if (!href) return;

            try {
              let absoluteUrl = href;
              if (href.startsWith('/')) {
                absoluteUrl = `${baseUrl.protocol}//${baseUrl.host}${href}`;
              } else if (!href.startsWith('http')) {
                absoluteUrl = new URL(href, pageUrl).href;
              }

              const linkUrl = new URL(absoluteUrl);
              
              // Only include links from the same domain
              if (linkUrl.host === baseUrl.host && !visitedUrls.has(absoluteUrl)) {
                // Prioritize common page types
                const path = linkUrl.pathname.toLowerCase();
                const isRelevantPage = 
                  path.includes('/about') ||
                  path.includes('/product') ||
                  path.includes('/services') ||
                  path.includes('/team') ||
                  path.includes('/features') ||
                  path.includes('/gallery') ||
                  path.includes('/portfolio') ||
                  path.length > 1; // Not just homepage

                if (isRelevantPage && !links.includes(absoluteUrl)) {
                  links.push(absoluteUrl);
                }
              }
            } catch {
              // Skip invalid URLs
            }
          });

          // Sort links by relevance (about, product, services first)
          links.sort((a, b) => {
            const aPath = new URL(a).pathname.toLowerCase();
            const bPath = new URL(b).pathname.toLowerCase();
            
            const priority = (path: string) => {
              if (path.includes('/about')) return 1;
              if (path.includes('/product')) return 2;
              if (path.includes('/services')) return 3;
              if (path.includes('/team')) return 4;
              return 5;
            };

            return priority(aPath) - priority(bPath);
          });

          return links.slice(0, MAX_PAGES - 1); // Limit to remaining pages
        } catch {
          return [];
        }
      };

      // Helper to check if image is likely relevant (very lenient filter for extraction)
      const isLikelyRelevant = (img: ExtractedImage): boolean => {
        // Only skip if we have explicit very small dimensions
        if (img.width && img.height && img.width < 20 && img.height < 20) {
          return false;
        }
        
        // Skip only the most obvious UI elements
        const url = img.url.toLowerCase();
        const skipPatterns = ['favicon.ico', 'sprite.png', '1x1.gif', 'pixel.gif', 'tracking.gif'];
        if (skipPatterns.some(pattern => url.includes(pattern))) {
          return false;
        }
        
        // Keep everything else - we'll check actual file size when downloading
        return true;
      };

      // Start with homepage
      const homepageImages = await extractImagesFromPage(websiteUrl);
      for (const img of homepageImages) {
        if (!isDuplicateImage(img.url) && isLikelyRelevant(img)) {
          allExtractedImages.push(img);
          imageUrlSet.add(normalizeImageUrl(img.url));
        }
      }

      // Collect all internal links first
      const allInternalLinks: string[] = [];
      const linkQueue: string[] = [websiteUrl];
      const processedForLinks = new Set<string>([websiteUrl]);

      // Build comprehensive link list by crawling pages
      while (linkQueue.length > 0 && processedForLinks.size < MAX_PAGES * 2) {
        const currentUrl = linkQueue.shift()!;
        try {
          const links = await findInternalLinks(currentUrl);
          for (const link of links) {
            if (!processedForLinks.has(link) && !allInternalLinks.includes(link)) {
              allInternalLinks.push(link);
              linkQueue.push(link);
              processedForLinks.add(link);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error finding links on ${currentUrl}:`, error);
        }
      }

      console.log(`🔗 Found ${allInternalLinks.length} total internal links to crawl`);

      // Continue crawling pages until we have enough images
      for (const link of allInternalLinks) {
        // Stop if we've reached limits (but be generous - we'll filter later)
        if (visitedUrls.size >= MAX_PAGES || allExtractedImages.length >= MAX_IMAGES * 2) {
          console.log(`⏹️  Stopping crawl: ${visitedUrls.size} pages, ${allExtractedImages.length} images collected`);
          break;
        }

        if (!visitedUrls.has(link)) {
          visitedUrls.add(link);
          try {
            const pageImages = await extractImagesFromPage(link);
            
            // Add images, checking for duplicates
            for (const img of pageImages) {
              if (allExtractedImages.length >= MAX_IMAGES * 2) {
                break;
              }
              
              if (!isDuplicateImage(img.url) && isLikelyRelevant(img)) {
                allExtractedImages.push(img);
                imageUrlSet.add(normalizeImageUrl(img.url));
              }
            }
          } catch (error) {
            console.warn(`⚠️ Error extracting images from ${link}:`, error);
          }
        }
      }

      console.log(`✅ Total extracted: ${allExtractedImages.length} unique images from ${visitedUrls.size} pages`);
      return allExtractedImages;
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
   * Very lenient filtering - only filters obvious UI elements
   * Actual file size filtering happens when downloading
   */
  filterPitchDeckRelevantImages(images: ExtractedImage[]): ExtractedImage[] {
    return images.filter(image => {
      // 1. Skip only the most obvious UI elements (very specific patterns)
      const url = image.url.toLowerCase();
      const skipPatterns = [
        'favicon.ico',
        'sprite.png',
        '1x1.gif',
        'pixel.gif',
        'tracking.gif',
        'spinner.gif',
        'loader.gif',
        'blank.gif',
        'transparent.gif'
      ];
      
      // Only skip if URL exactly matches or contains these specific patterns
      if (skipPatterns.some(pattern => url.endsWith(pattern) || url.includes(`/${pattern}`))) {
        console.log(`⊘ Skipping obvious UI element: ${image.url}`);
        return false;
      }

      // 2. Skip images with explicit very small dimensions (only if both are specified and very small)
      if (image.width && image.height) {
        if (image.width < 20 && image.height < 20) {
          console.log(`⊘ Skipping tiny image: ${image.url} (${image.width}x${image.height})`);
          return false;
        }
      }

      // 3. Keep everything else - we'll filter by actual file size when downloading
      // This ensures we don't filter out images that don't have size attributes in HTML
      console.log(`✓ Keeping image for download check: ${image.url}`);
      return true;
    });
  }

  /**
   * Download and save extracted images
   * Enforces 32MB total size limit and 20 image limit
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
    let totalSizeBytes = 0;
    const MAX_SIZE_BYTES = 32 * 1024 * 1024; // 32 MB

    // Filter to only pitch-deck relevant images
    console.log(`📊 Filtering ${images.length} images for pitch deck relevance...`);
    const relevantImages = this.filterPitchDeckRelevantImages(images);
    console.log(`✅ ${relevantImages.length} relevant images after filtering`);

    // If we don't have enough images after filtering, log a warning but continue
    if (relevantImages.length < maxImages) {
      console.log(`⚠️  Only ${relevantImages.length} images passed filtering (target: ${maxImages}). This may indicate the website has limited suitable images.`);
    }

    // Process images until we hit limits
    for (const image of relevantImages) {
      // Stop if we've reached limits
      if (savedAssets.length >= maxImages || totalSizeBytes >= MAX_SIZE_BYTES) {
        console.log(`⏹️  Reached limits: ${savedAssets.length} images, ${(totalSizeBytes / 1024 / 1024).toFixed(2)} MB`);
        break;
      }
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

        // Validate file size (skip if too small - likely icon or broken image)
        const fileSizeKB = buffer.length / 1024;
        if (fileSizeKB < 2) {
          console.log(`⊘ Skipping tiny/broken file: ${image.url} (${fileSizeKB.toFixed(1)} KB)`);
          skipped.push({
            url: image.url,
            reason: 'too_small'
          });
          continue;
        }
        
        // Also check image dimensions if possible (using sharp)
        try {
          const metadata = await sharp(buffer).metadata();
          if (metadata.width && metadata.height) {
            // Skip if actual dimensions are very small (likely icon)
            if (metadata.width < 50 || metadata.height < 50) {
              console.log(`⊘ Skipping small image: ${image.url} (${metadata.width}x${metadata.height})`);
              skipped.push({
                url: image.url,
                reason: 'too_small'
              });
              continue;
            }
          }
        } catch (sharpError) {
          // If we can't read metadata, continue anyway - might be a valid image
          console.log(`⚠️  Could not read image metadata for ${image.url}, continuing anyway`);
        }

        // Check if adding this image would exceed size limit
        if (totalSizeBytes + buffer.length > MAX_SIZE_BYTES) {
          console.log(`⊘ Skipping image (would exceed 32MB limit): ${image.url} (${fileSizeKB.toFixed(1)} KB)`);
          skipped.push({
            url: image.url,
            reason: 'size_limit'
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
        totalSizeBytes += buffer.length;
        console.log(`✅ Saved image ${savedAssets.length}/${maxImages}: ${image.url} (${fileSizeKB.toFixed(1)} KB, total: ${(totalSizeBytes / 1024 / 1024).toFixed(2)} MB)`);
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
      sizeLimit: skipped.filter(s => s.reason === 'size_limit').length,
      saved: savedAssets.length,
      errors: errors.length,
      totalSizeMB: (totalSizeBytes / 1024 / 1024).toFixed(2)
    };

    console.log(`📊 Extraction Summary:
      - Total images found: ${stats.totalFound}
      - Filtered out (irrelevant): ${stats.filtered}
      - Skipped (duplicates): ${stats.duplicates}
      - Skipped (too small): ${stats.tooSmall}
      - Skipped (size limit): ${stats.sizeLimit}
      - Successfully saved: ${stats.saved}
      - Total size: ${stats.totalSizeMB} MB
      - Errors: ${stats.errors}
    `);

    return {
      saved: savedAssets,
      errors,
      skipped,
      stats,
      total: savedAssets.length
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

  /**
   * Check if a media asset exists by source URL
   */
  async findAssetBySourceUrl(projectId: string, sourceUrl: string): Promise<string | null> {
    try {
      const [asset] = await db
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(and(
          eq(mediaAssets.projectId, projectId),
          eq(mediaAssets.sourceUrl, sourceUrl)
        ))
        .limit(1);

      return asset?.id || null;
    } catch (error) {
      console.error('Error finding asset by source URL:', error);
      return null;
    }
  }

  /**
   * Download and store a logo from URL in the media library
   * Returns the media asset ID if successful, or null if failed
   */
  async downloadAndStoreLogo(
    projectId: string,
    userId: string,
    logoUrl: string
  ): Promise<string | null> {
    try {
      // Check if logo already exists in media library
      const existingAssetId = await this.findAssetBySourceUrl(projectId, logoUrl);
      if (existingAssetId) {
        console.log(`✅ Logo already in media library: ${logoUrl}`);
        return existingAssetId;
      }

      // Download the logo
      console.log(`📥 Downloading logo from: ${logoUrl}`);
      const response = await httpGet(logoUrl);
      const buffer = response.data;
      const contentType = response.headers['content-type'] || 'image/jpeg';

      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(contentType)) {
        console.warn(`⚠️  Invalid file type for logo: ${contentType}`);
        return null;
      }

      // Extract filename from URL
      const urlParts = logoUrl.split('/');
      const originalFilename = urlParts[urlParts.length - 1].split('?')[0] || 'logo.jpg';
      const filename = `logo_${originalFilename}`;

      // Upload to media library
      const asset = await this.uploadMedia({
        projectId,
        userId,
        file: buffer,
        filename,
        fileType: contentType,
        source: 'website_extraction',
        sourceUrl: logoUrl,
        tags: ['logo', 'brand-kit'],
        description: 'Logo extracted for brand kit',
        altText: 'Company logo'
      });

      console.log(`✅ Logo stored in media library: ${asset.id}`);
      return asset.id;
    } catch (error: any) {
      console.error(`❌ Failed to download and store logo: ${error.message}`);
      return null;
    }
  }

  /**
   * Get media asset by ID
   */
  async getMediaAsset(assetId: string) {
    try {
      const [asset] = await db
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.id, assetId))
        .limit(1);

      return asset || null;
    } catch (error) {
      console.error('Error getting media asset:', error);
      return null;
    }
  }
}

export const mediaManager = new MediaManager();

