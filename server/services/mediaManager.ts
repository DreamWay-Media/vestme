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

      // Ensure URL has a protocol
      let normalizedUrl = websiteUrl.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
        console.log(`📋 Added protocol to URL: ${normalizedUrl}`);
      }
      
      // Validate and create base URL
      let baseUrl: URL;
      try {
        baseUrl = new URL(normalizedUrl);
      } catch (urlError) {
        console.error(`❌ Invalid URL format: ${websiteUrl}`, urlError);
        throw new Error(`Invalid URL format: ${websiteUrl}. Please include http:// or https://`);
      }
      
      const visitedUrls = new Set<string>([normalizedUrl]);
      const allExtractedImages: ExtractedImage[] = [];
      const imageUrlSet = new Set<string>(); // Track unique image URLs
      const imageHashes = new Map<string, string>(); // Track image hashes for duplicate detection
      let totalSizeBytes = 0;
      const MAX_SIZE_BYTES = 32 * 1024 * 1024; // 32 MB
      const MAX_IMAGES = 20;
      const MAX_PAGES = 10;

      // Helper to normalize image URL for comparison
      const normalizeImageUrl = (url: string): string => {
        // Data URIs should be kept as-is (they're usually unique)
        if (url.startsWith('data:')) {
          return url;
        }
        try {
          const urlObj = new URL(url);
          // Remove query parameters and fragments for comparison
          return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
        } catch {
          return url;
        }
      };

      // Helper to check if images are similar (same normalized URL or very similar paths)
      // NOTE: This checks against images already in allExtractedImages, not just current page
      const isDuplicateImage = (url: string): boolean => {
        try {
          const normalized = normalizeImageUrl(url);
          
          // Check exact match against images already collected
          if (imageUrlSet.has(normalized)) {
            return true;
          }
          
          // Skip data URIs from duplicate checking (they're usually unique placeholders)
          if (url.startsWith('data:')) {
            return false;
          }
          
          return false;
        } catch (error) {
          // If URL normalization fails, don't treat as duplicate
          return false;
        }
      };

      // Extract images from a single page
      const extractImagesFromPage = async (pageUrl: string): Promise<ExtractedImage[]> => {
        try {
          console.log(`  📄 Crawling page: ${pageUrl}`);
          
          // Ensure pageUrl has protocol
          let normalizedPageUrl = pageUrl;
          if (!pageUrl.startsWith('http://') && !pageUrl.startsWith('https://')) {
            normalizedPageUrl = `https://${pageUrl}`;
          }
          
          console.log(`  🔗 Attempting to fetch: ${normalizedPageUrl}`);
          const response = await httpGet(normalizedPageUrl);
          console.log(`  ✅ Successfully fetched page (${response.data.length} bytes)`);
          const html = response.data.toString('utf-8');
          console.log(`  📄 HTML length: ${html.length} characters`);
          const $ = cheerio.load(html);
          const pageImages: ExtractedImage[] = [];
          const logoImages: string[] = [];
          
          // Local set for within-page deduplication (don't touch global imageUrlSet during extraction)
          const pageSeenUrls = new Set<string>();

          // Use normalized page URL for relative URL resolution
          const currentPageUrl = normalizedPageUrl;
          
          // Comprehensive image extraction that bypasses lazy loading
          // Extracts from multiple sources: HTML attributes, CSS, JavaScript, JSON, etc.
          const extractImagesFromAllSources = (html: string, $: cheerio.CheerioAPI): string[] => {
            const imageUrls: string[] = [];
            const seenUrls = new Set<string>();
            
            // Helper to normalize and add URL
            const addImageUrl = (url: string) => {
              if (!url || url.startsWith('data:') || url.length < 10) return;
              
              try {
                let absoluteUrl = url.split(' ')[0].split(',')[0].trim(); // Handle srcset: "url 2x, url2 3x"
                
                // Skip query params for comparison but keep them in the URL
                const urlWithoutQuery = absoluteUrl.split('?')[0];
                
                if (absoluteUrl.startsWith('/')) {
                  absoluteUrl = `${baseUrl.origin}${absoluteUrl}`;
                } else if (!absoluteUrl.startsWith('http')) {
                  absoluteUrl = new URL(absoluteUrl, currentPageUrl).href;
                }
                
                // Check if it looks like an image
                const isImageUrl = absoluteUrl.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|avif)(\?|$)/i) ||
                                  absoluteUrl.includes('/wp-content/uploads/') ||
                                  absoluteUrl.includes('/images/') ||
                                  absoluteUrl.includes('/assets/') ||
                                  absoluteUrl.includes('/media/') ||
                                  absoluteUrl.includes('/uploads/') ||
                                  absoluteUrl.includes('/img/') ||
                                  absoluteUrl.includes('/pictures/') ||
                                  absoluteUrl.includes('/photos/');
                
                if (isImageUrl && !seenUrls.has(urlWithoutQuery)) {
                  seenUrls.add(urlWithoutQuery);
                  imageUrls.push(absoluteUrl);
                }
              } catch {
                // Skip invalid URLs
              }
            };
            
            // 1. Extract from all data-* attributes (comprehensive lazy loading detection)
            $('[data-src], [data-lazy-src], [data-original], [data-url], [data-image], [data-img]').each((_, element) => {
              const dataSrc = $(element).attr('data-src') || 
                             $(element).attr('data-lazy-src') || 
                             $(element).attr('data-original') || 
                             $(element).attr('data-url') ||
                             $(element).attr('data-image') ||
                             $(element).attr('data-img');
              if (dataSrc) addImageUrl(dataSrc);
            });
            
            // 2. Extract from srcset attributes (responsive images)
            $('[srcset]').each((_, element) => {
              const srcset = $(element).attr('srcset');
              if (srcset) {
                // Parse srcset: "url1 1x, url2 2x, url3 3x"
                srcset.split(',').forEach(entry => {
                  const url = entry.trim().split(/\s+/)[0];
                  addImageUrl(url);
                });
              }
            });
            
            // 3. Extract from data-srcset
            $('[data-srcset]').each((_, element) => {
              const dataSrcset = $(element).attr('data-srcset');
              if (dataSrcset) {
                dataSrcset.split(',').forEach(entry => {
                  const url = entry.trim().split(/\s+/)[0];
                  addImageUrl(url);
                });
              }
            });
            
            // 4. Extract from inline styles (background-image)
            $('[style*="background-image"], [style*="background:"]').each((_, element) => {
              const style = $(element).attr('style') || '';
              const bgImageMatch = style.match(/background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/i);
              if (bgImageMatch && bgImageMatch[1]) {
                addImageUrl(bgImageMatch[1]);
              }
            });
            
            // 5. Extract from <style> tags (CSS)
            $('style').each((_, element) => {
              const css = $(element).html() || '';
              const bgImagePattern = /background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi;
              let bgMatch;
              while ((bgMatch = bgImagePattern.exec(css)) !== null) {
                if (bgMatch[1]) addImageUrl(bgMatch[1]);
              }
            });
            
            // 6. Extract from JSON-LD structured data
            $('script[type="application/ld+json"]').each((_, element) => {
              try {
                const jsonLd = JSON.parse($(element).html() || '{}');
                const extractFromObject = (obj: any) => {
                  if (!obj || typeof obj !== 'object') return;
                  for (const [key, value] of Object.entries(obj)) {
                    if (key === 'image' || key === 'logo' || key === 'photo') {
                      if (typeof value === 'string') {
                        addImageUrl(value);
                      } else if (value && typeof value === 'object' && 'url' in value) {
                        const urlValue = (value as any).url;
                        if (typeof urlValue === 'string') addImageUrl(urlValue);
                      } else if (Array.isArray(value)) {
                        value.forEach((item: any) => {
                          if (typeof item === 'string') {
                            addImageUrl(item);
                          } else if (item && typeof item === 'object' && 'url' in item) {
                            const itemUrl = item.url;
                            if (typeof itemUrl === 'string') addImageUrl(itemUrl);
                          }
                        });
                      }
                    } else if (Array.isArray(value) || (value && typeof value === 'object')) {
                      extractFromObject(value);
                    }
                  }
                };
                extractFromObject(jsonLd);
              } catch {
                // Skip invalid JSON
              }
            });
            
            // 7. Extract from JavaScript variables and data (look for image URLs in script tags)
            $('script:not([type="application/ld+json"])').each((_, element) => {
              const scriptContent = $(element).html() || '';
              // Look for image URLs in JavaScript (common patterns)
              const jsImagePatterns = [
                /["']([^"']+\.(jpg|jpeg|png|gif|svg|webp|ico))["']/gi,
                /url\(["']?([^"')]+\.(jpg|jpeg|png|gif|svg|webp|ico))["']?\)/gi,
                /src:\s*["']([^"']+)["']/gi,
                /image:\s*["']([^"']+)["']/gi,
              ];
              
              jsImagePatterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(scriptContent)) !== null) {
                  if (match[1]) addImageUrl(match[1]);
                }
              });
            });
            
            // 8. Extract from HTML patterns (regex on raw HTML)
            const htmlPatterns = [
              /data-src=["']([^"']+)["']/gi,
              /data-lazy-src=["']([^"']+)["']/gi,
              /data-original=["']([^"']+)["']/gi,
              /data-image=["']([^"']+)["']/gi,
              /data-img=["']([^"']+)["']/gi,
              /srcset=["']([^"']+)["']/gi,
              /data-srcset=["']([^"']+)["']/gi,
              /background-image:\s*url\(["']?([^"')]+)["']?\)/gi,
              /background:\s*url\(["']?([^"')]+)["']?\)/gi,
            ];
            
            htmlPatterns.forEach(pattern => {
              let match;
              while ((match = pattern.exec(html)) !== null) {
                if (match[1]) {
                  // Handle srcset format
                  const urls = match[1].split(',').map(u => u.trim().split(/\s+/)[0]);
                  urls.forEach(url => addImageUrl(url));
                }
              }
            });
            
            // 9. Extract all absolute image URLs from HTML (any URL with image extension)
            const absoluteImageUrlPattern = /https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|svg|webp|ico|avif)(\?[^\s"']*)?/gi;
            let match;
            while ((match = absoluteImageUrlPattern.exec(html)) !== null) {
              if (match[0]) addImageUrl(match[0]);
            }
            
            // 10. Extract from picture source elements
            $('picture source').each((_, element) => {
              const srcset = $(element).attr('srcset');
              if (srcset) {
                srcset.split(',').forEach(entry => {
                  const url = entry.trim().split(/\s+/)[0];
                  addImageUrl(url);
                });
              }
            });
            
            return imageUrls;
          };
          
          const extractedImageUrls = extractImagesFromAllSources(html, $);
          console.log(`  🔍 Found ${extractedImageUrls.length} images from all sources (bypassing lazy loading)`);
          if (extractedImageUrls.length > 0) {
            console.log(`  📋 Sample extracted URLs (first 5):`);
            extractedImageUrls.slice(0, 5).forEach((url, idx) => {
              console.log(`     ${idx + 1}. ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`);
            });
          }

          // Find all image tags (process from top to bottom)
          const imgCount = $('img').length;
          console.log(`  📸 Found ${imgCount} <img> tags on page`);
          
          // Debug counters
          let noSrcCount = 0;
          let invalidUrlCount = 0;
          let tooSmallCount = 0;
          let duplicateCount = 0;
          let faviconFilterCount = 0;
          let processedCount = 0;
          
          $('img').each((_, element) => {
            // Stop if we've reached limits
            if (allExtractedImages.length >= MAX_IMAGES * 2 || totalSizeBytes >= MAX_SIZE_BYTES) {
              return false; // Break the loop
            }

            // Check multiple attributes for lazy loading (prioritize real image sources)
            const dataSrc = $(element).attr('data-src') || 
                           $(element).attr('data-lazy-src') || 
                           $(element).attr('data-original') || 
                           $(element).attr('data-url') ||
                           $(element).attr('data-srcset')?.split(',')[0]?.trim().split(' ')[0]; // First image from srcset
            const srcAttr = $(element).attr('src');
            
            // Determine which source to use:
            // 1. If src is a placeholder (data URI), ALWAYS prefer data-src if it exists
            // 2. If data-src exists and src is NOT a placeholder, prefer data-src (lazy loading)
            // 3. Otherwise, use src
            let src: string | undefined;
            const isPlaceholder = srcAttr?.startsWith('data:image/svg+xml') || 
                                 (srcAttr?.startsWith('data:') && srcAttr.length < 200);
            
            if (dataSrc && (isPlaceholder || !srcAttr)) {
              // Prefer data-src if src is a placeholder or doesn't exist
              src = dataSrc;
            } else if (srcAttr) {
              src = srcAttr;
            } else if (dataSrc) {
              src = dataSrc;
            }
            
            const alt = $(element).attr('alt') || '';
            const width = $(element).attr('width');
            const height = $(element).attr('height');

            if (!src) {
              noSrcCount++;
              return; // Skip images without src
            }
            
            // Skip data URI placeholders BEFORE converting to absolute URL
            // This prevents 1x1 SVG placeholders from being processed
            if (src.startsWith('data:image/svg+xml')) {
              // Check if it's a 1x1 placeholder - the specific pattern we see in logs
              if (src.includes('PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIg==') || 
                  src.includes('width="1"') || 
                  src.includes('width=\'1\'') ||
                  src.includes('w="1"') ||
                  src.includes('w=\'1\'') ||
                  (src.length < 200 && src.includes('base64'))) {
                faviconFilterCount++;
                console.log(`  ⊘ Skipping 1x1 placeholder: ${src.substring(0, 60)}...`);
                return; // Skip 1x1 placeholder
              }
            }
            
            // Skip all very short data URIs (likely placeholders)
            if (src.startsWith('data:') && src.length < 200) {
              faviconFilterCount++;
              console.log(`  ⊘ Skipping short data URI placeholder: ${src.substring(0, 60)}...`);
              return;
            }

            // Convert relative URLs to absolute
            let absoluteUrl = src;
            try {
              if (src.startsWith('/')) {
                // Use origin instead of manually constructing to avoid double slashes
                absoluteUrl = `${baseUrl.origin}${src}`;
              } else if (!src.startsWith('http')) {
                absoluteUrl = new URL(src, currentPageUrl).href;
              }
            } catch (urlError) {
              invalidUrlCount++;
              console.log(`⚠️  Skipping invalid image URL: ${src}`, urlError);
              return; // Skip invalid URLs
            }

            // Only skip images with explicit very small dimensions (likely icons, tracking pixels)
            // If no size info, keep it - we'll check actual size when downloading
            const w = width ? parseInt(width) : 0;
            const h = height ? parseInt(height) : 0;
            if (w > 0 && h > 0 && ((w < 20) || (h < 20))) {
              tooSmallCount++;
              return; // Only skip if we have explicit dimensions AND they're very small
            }

            // Check for duplicates - use direct Set check instead of function
            // Skip data URIs from duplicate checking (they're usually unique placeholders)
            let normalizedUrl: string;
            try {
              if (absoluteUrl.startsWith('data:')) {
                // For data URIs, use the full URL as the key (they're usually unique)
                normalizedUrl = absoluteUrl;
              } else {
                normalizedUrl = normalizeImageUrl(absoluteUrl);
              }
              
              if (imageUrlSet.has(normalizedUrl)) {
                duplicateCount++;
                console.log(`  🔄 Duplicate detected: ${absoluteUrl.substring(0, 80)}${absoluteUrl.length > 80 ? '...' : ''}`);
                return;
              }
            } catch (urlError) {
              // If normalization fails, skip duplicate check but still process the image
              console.log(`  ⚠️  URL normalization failed for duplicate check: ${absoluteUrl}`);
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
              faviconFilterCount++;
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

            // Add to LOCAL page set for within-page deduplication
            try {
              if (absoluteUrl.startsWith('data:')) {
                pageSeenUrls.add(absoluteUrl);
              } else {
                pageSeenUrls.add(normalizeImageUrl(absoluteUrl));
              }
            } catch {
              // If normalization fails, add the original URL
              pageSeenUrls.add(absoluteUrl);
            }
            processedCount++;
          });
          
          // Log detailed filtering stats
          console.log(`  📊 Image filtering stats:`);
          console.log(`     - Total <img> tags: ${imgCount}`);
          console.log(`     - No src attribute: ${noSrcCount}`);
          console.log(`     - Invalid URLs: ${invalidUrlCount}`);
          console.log(`     - Too small (dimensions): ${tooSmallCount}`);
          console.log(`     - Duplicates: ${duplicateCount}`);
          console.log(`     - Favicon/sprite/pixel: ${faviconFilterCount}`);
          console.log(`     - Successfully processed: ${processedCount}`);

          // Check for logo-specific elements
          $('link[rel*="icon"]').each((_, element) => {
            const href = $(element).attr('href');
            if (href && !href.includes('favicon')) {
              try {
                let absoluteUrl = href;
                if (href.startsWith('/')) {
                  absoluteUrl = `${baseUrl.origin}${href}`;
                } else if (!href.startsWith('http')) {
                  absoluteUrl = new URL(href, currentPageUrl).href;
                }
                if (!logoImages.includes(absoluteUrl) && !pageSeenUrls.has(normalizeImageUrl(absoluteUrl))) {
                  logoImages.push(absoluteUrl);
                  pageSeenUrls.add(normalizeImageUrl(absoluteUrl));
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
                  : new URL(jsonLd.logo.url, currentPageUrl).href;
                const normalizedLogoUrl = normalizeImageUrl(logoUrl);
                if (!logoImages.includes(logoUrl) && !pageSeenUrls.has(normalizedLogoUrl)) {
                  logoImages.push(logoUrl);
                  pageSeenUrls.add(normalizedLogoUrl);
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
                absoluteOgUrl = `${baseUrl.origin}${ogImage}`;
              } else if (!ogImage.startsWith('http')) {
                absoluteOgUrl = new URL(ogImage, currentPageUrl).href;
              }

              const normalizedOgUrl = normalizeImageUrl(absoluteOgUrl);
              if (!pageSeenUrls.has(normalizedOgUrl)) {
                pageImages.unshift({
                  url: absoluteOgUrl,
                  altText: $('meta[property="og:image:alt"]').attr('content') || 'Open Graph Image',
                  context: 'Primary website image (Open Graph)'
                });
                pageSeenUrls.add(normalizedOgUrl);
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
          
          // Add images found from comprehensive extraction (bypassing lazy loading)
          let addedFromExtraction = 0;
          let skippedFromExtraction = 0;
          let skippedDataUri = 0;
          let skippedDuplicate = 0;
          
          console.log(`  🔧 Processing ${extractedImageUrls.length} URLs from comprehensive extraction...`);
          
          for (const extractedImageUrl of extractedImageUrls) {
            // Skip data URIs
            if (extractedImageUrl.startsWith('data:')) {
              skippedDataUri++;
              continue;
            }
            
            try {
              const normalizedUrl = normalizeImageUrl(extractedImageUrl);
              const isDuplicate = pageSeenUrls.has(normalizedUrl) || pageImages.some(img => img.url === extractedImageUrl);
              
              if (!isDuplicate) {
                pageImages.push({
                  url: extractedImageUrl,
                  altText: 'Image extracted from website',
                  context: 'Extracted from HTML/CSS/JavaScript (bypassing lazy loading)'
                });
                pageSeenUrls.add(normalizedUrl);
                addedFromExtraction++;
                
                if (addedFromExtraction <= 5) {
                  console.log(`  ✅ Added: ${extractedImageUrl.substring(0, 100)}${extractedImageUrl.length > 100 ? '...' : ''}`);
                }
              } else {
                skippedDuplicate++;
              }
            } catch (error) {
              skippedFromExtraction++;
              console.log(`  ⚠️  Error processing URL: ${extractedImageUrl.substring(0, 80)}...`);
            }
          }
          
          console.log(`  📊 Comprehensive extraction results:`);
          console.log(`     - Added to pageImages: ${addedFromExtraction}`);
          console.log(`     - Skipped (data URIs): ${skippedDataUri}`);
          console.log(`     - Skipped (duplicates): ${skippedDuplicate}`);
          console.log(`     - Skipped (errors): ${skippedFromExtraction - skippedDataUri - skippedDuplicate}`);
          console.log(`  ✅ Found ${pageImages.length} unique images on ${normalizedPageUrl} (from ${imgCount} total <img> tags + ${extractedImageUrls.length} from comprehensive extraction)`);
          if (pageImages.length === 0 && imgCount > 0) {
            console.warn(`  ⚠️  WARNING: Found ${imgCount} <img> tags but extracted 0 images!`);
            console.warn(`     This suggests all images were filtered out. Check the filtering stats above.`);
          }
          if (pageImages.length > 0) {
            console.log(`  📋 Sample extracted image URLs (first 3):`);
            pageImages.slice(0, 3).forEach((img, idx) => {
              console.log(`     ${idx + 1}. ${img.url}`);
            });
          }
          return pageImages;
        } catch (error: any) {
          console.warn(`  ⚠️ Error extracting images from ${pageUrl}:`, error.message);
          console.error(`  ❌ Full error details:`, error);
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
                absoluteUrl = `${baseUrl.origin}${href}`;
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
      console.log(`\n🔍 Extracting images from homepage: ${normalizedUrl}`);
      const homepageImages = await extractImagesFromPage(normalizedUrl);
      console.log(`📊 Homepage extraction returned ${homepageImages.length} images`);
      
      let homepageAdded = 0;
      let homepageFiltered = 0;
      for (const img of homepageImages) {
        const isDuplicate = isDuplicateImage(img.url);
        const isRelevant = isLikelyRelevant(img);
        
        if (!isDuplicate && isRelevant) {
          allExtractedImages.push(img);
          imageUrlSet.add(normalizeImageUrl(img.url));
          homepageAdded++;
        } else {
          homepageFiltered++;
          if (homepageFiltered <= 3) {
            console.log(`  ⊘ Filtered homepage image: ${img.url.substring(0, 80)}${img.url.length > 80 ? '...' : ''} (duplicate: ${isDuplicate}, relevant: ${isRelevant})`);
          }
        }
      }
      console.log(`✅ Homepage: ${homepageAdded} added, ${homepageFiltered} filtered from ${homepageImages.length} total\n`);

      // Collect all internal links first
      const allInternalLinks: string[] = [];
      const linkQueue: string[] = [normalizedUrl];
      const processedForLinks = new Set<string>([normalizedUrl]);

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
            let addedCount = 0;
            let filteredCount = 0;
            for (const img of pageImages) {
              if (allExtractedImages.length >= MAX_IMAGES * 2) {
                break;
              }
              
              const isDuplicate = isDuplicateImage(img.url);
              const isRelevant = isLikelyRelevant(img);
              
              if (!isDuplicate && isRelevant) {
                allExtractedImages.push(img);
                imageUrlSet.add(normalizeImageUrl(img.url));
                addedCount++;
              } else {
                filteredCount++;
                if (filteredCount <= 3) {
                  console.log(`  ⊘ Filtered image: ${img.url.substring(0, 80)}${img.url.length > 80 ? '...' : ''} (duplicate: ${isDuplicate}, relevant: ${isRelevant})`);
                }
              }
            }
            if (pageImages.length > 0) {
              console.log(`  📊 Page images: ${addedCount} added, ${filteredCount} filtered from ${pageImages.length} total`);
            }
          } catch (error) {
            console.warn(`⚠️ Error extracting images from ${link}:`, error);
          }
        }
      }

      console.log(`✅ Total extracted: ${allExtractedImages.length} unique images from ${visitedUrls.size} pages`);
      
      if (allExtractedImages.length === 0) {
        console.warn(`⚠️  WARNING: No images were extracted from ${websiteUrl}. Possible reasons:`);
        console.warn(`   - Website may require JavaScript to load images (we only parse static HTML)`);
        console.warn(`   - All images may have been filtered out`);
        console.warn(`   - Website may be blocking our User-Agent`);
        console.warn(`   - URL may be invalid or inaccessible`);
      }
      
      return allExtractedImages;
    } catch (error: any) {
      console.error('❌ Error extracting images from website:', error.message);
      console.error('Full error stack:', error);
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

    // REMOVED: Irrelevant filtering - using all extracted images directly
    console.log(`📊 Processing ${images.length} extracted images...`);

    // Process images until we hit limits
    for (const image of images) {
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

        // Skip data URIs - they can't be downloaded via HTTP and are usually placeholders
        if (image.url.startsWith('data:')) {
          console.log(`⊘ Skipping data URI (cannot download): ${image.url.substring(0, 80)}${image.url.length > 80 ? '...' : ''}`);
          skipped.push({
            url: image.url,
            reason: 'data_uri'
          });
          continue;
        }
        
        // Download the image
        const response = await httpGet(image.url);
        const buffer = response.data;
        
        // Validate file size first (skip if too small - likely broken image)
        // Reduced threshold from 2KB to 0.5KB to allow small valid images (icons, logos, etc.)
        const fileSizeKB = buffer.length / 1024;
        if (fileSizeKB < 0.5) {
          console.log(`⊘ Skipping broken/tiny file: ${image.url} (${fileSizeKB.toFixed(2)} KB)`);
          skipped.push({
            url: image.url,
            reason: 'too_small'
          });
          continue;
        }
        
        // Get image metadata (for content-type detection and dimension checking)
        let metadata: sharp.Metadata | null = null;
        let contentType = response.headers['content-type'] || '';
        
        try {
          metadata = await sharp(buffer).metadata();
          
          // Detect content type from file signature if not in header
          if (!contentType || !contentType.startsWith('image/')) {
            if (metadata.format) {
              contentType = `image/${metadata.format}`;
              console.log(`📋 Detected content type from file: ${contentType} for ${image.url}`);
            } else {
              // Fallback: try to detect from URL extension
              const urlLower = image.url.toLowerCase();
              if (urlLower.includes('.png')) contentType = 'image/png';
              else if (urlLower.includes('.gif')) contentType = 'image/gif';
              else if (urlLower.includes('.webp')) contentType = 'image/webp';
              else contentType = 'image/jpeg'; // Default fallback
            }
          }
          
          // Check image dimensions (reduced threshold from 50x50 to 20x20 to allow icons/logos)
          if (metadata.width && metadata.height) {
            // Skip only if actual dimensions are very small (likely broken or tracking pixel)
            // Changed from 50x50 to 20x20 to allow small valid images like icons and logos
            if (metadata.width < 20 || metadata.height < 20) {
              console.log(`⊘ Skipping very small image: ${image.url} (${metadata.width}x${metadata.height})`);
              skipped.push({
                url: image.url,
                reason: 'too_small'
              });
              continue;
            }
          }
        } catch (sharpError) {
          // If we can't read metadata, try URL-based content-type detection and continue anyway
          console.log(`⚠️  Could not read image metadata for ${image.url}, using URL-based detection`);
          if (!contentType || !contentType.startsWith('image/')) {
            const urlLower = image.url.toLowerCase();
            if (urlLower.includes('.png')) contentType = 'image/png';
            else if (urlLower.includes('.gif')) contentType = 'image/gif';
            else if (urlLower.includes('.webp')) contentType = 'image/webp';
            else contentType = 'image/jpeg'; // Default fallback
          }
          // Continue processing even if metadata read failed - might be a valid image
        }
        
        // Normalize content type (remove charset, etc.)
        contentType = contentType.split(';')[0].trim();

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
      duplicates: skipped.filter(s => s.reason === 'duplicate').length,
      dataUris: skipped.filter(s => s.reason === 'data_uri').length,
      tooSmall: skipped.filter(s => s.reason === 'too_small').length,
      sizeLimit: skipped.filter(s => s.reason === 'size_limit').length,
      saved: savedAssets.length,
      errors: errors.length,
      totalSizeMB: (totalSizeBytes / 1024 / 1024).toFixed(2)
    };

    console.log(`📊 Extraction Summary:
      - Total images found: ${stats.totalFound}
      - Skipped (duplicates): ${stats.duplicates}
      - Skipped (data URIs/placeholders): ${stats.dataUris}
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

