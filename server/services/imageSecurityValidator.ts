/**
 * Image Security Validator
 * Comprehensive security checks for uploaded images to prevent malicious attacks
 */

import sharp from 'sharp';
import crypto from 'crypto';

// Magic bytes for image format verification
const FILE_SIGNATURES: Record<string, Buffer[]> = {
  'image/jpeg': [
    Buffer.from([0xFF, 0xD8, 0xFF]), // JPEG
  ],
  'image/jpg': [
    Buffer.from([0xFF, 0xD8, 0xFF]), // JPEG (same as jpeg)
  ],
  'image/png': [
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG
  ],
  'image/webp': [
    Buffer.from([0x52, 0x49, 0x46, 0x46]), // RIFF (WebP container)
  ],
  'image/gif': [
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), // GIF87a
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), // GIF89a
  ]
};

// Dangerous patterns to detect in filenames and metadata
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers (onclick, onload, etc.)
  /data:text\/html/gi,
  /vbscript:/gi,
  /\.\.\//, // Path traversal
  /%00/, // Null byte
  /%2e%2e/, // URL encoded path traversal
];

// Allowed characters in filenames (alphanumeric, dash, underscore, dot)
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

// Maximum dimensions to prevent image bombs
const MAX_IMAGE_WIDTH = 10000;
const MAX_IMAGE_HEIGHT = 10000;
const MAX_TOTAL_PIXELS = 50000000; // 50 megapixels

export interface SecurityValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export class ImageSecurityValidator {
  /**
   * Verify file signature matches claimed MIME type (prevents type spoofing)
   */
  static verifyFileSignature(buffer: Buffer, claimedMimeType: string): SecurityValidationResult {
    const signatures = FILE_SIGNATURES[claimedMimeType.toLowerCase()];
    
    if (!signatures || signatures.length === 0) {
      return {
        valid: false,
        error: `Unsupported file type: ${claimedMimeType}`
      };
    }

    // Check if buffer starts with any of the valid signatures
    const isValidSignature = signatures.some(signature => {
      return buffer.slice(0, signature.length).equals(signature) ||
             (claimedMimeType === 'image/webp' && buffer.slice(0, 4).equals(signature));
    });

    // For WebP, also check for WEBP string at offset 8
    if (claimedMimeType === 'image/webp' && isValidSignature) {
      const webpSignature = buffer.slice(8, 12).toString('ascii');
      if (webpSignature !== 'WEBP') {
        return {
          valid: false,
          error: 'Invalid WebP file signature'
        };
      }
    }

    if (!isValidSignature) {
      return {
        valid: false,
        error: `File signature does not match claimed type ${claimedMimeType}. Possible file type spoofing.`
      };
    }

    return { valid: true };
  }

  /**
   * Sanitize filename to prevent path traversal and script injection
   */
  static sanitizeFilename(filename: string): string {
    // Remove any path separators
    let sanitized = filename.replace(/[\/\\]/g, '');
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Convert to lowercase for consistency
    sanitized = sanitized.toLowerCase();
    
    // Replace spaces and special chars with underscores
    sanitized = sanitized.replace(/[^a-z0-9.-]/g, '_');
    
    // Remove multiple consecutive underscores
    sanitized = sanitized.replace(/_+/g, '_');
    
    // Remove leading/trailing underscores and dots
    sanitized = sanitized.replace(/^[._]+|[._]+$/g, '');
    
    // Limit length
    if (sanitized.length > 100) {
      const ext = sanitized.split('.').pop();
      sanitized = sanitized.substring(0, 95) + '.' + ext;
    }
    
    // If empty after sanitization, use a random name
    if (!sanitized || sanitized === '.') {
      const randomName = crypto.randomBytes(8).toString('hex');
      sanitized = `upload_${randomName}.jpg`;
    }
    
    return sanitized;
  }

  /**
   * Validate and sanitize text inputs (tags, descriptions, alt text)
   */
  static sanitizeTextInput(input: string, maxLength: number = 500): SecurityValidationResult {
    if (!input) {
      return { valid: true };
    }

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(input)) {
        return {
          valid: false,
          error: 'Input contains potentially malicious content'
        };
      }
    }

    // Limit length
    if (input.length > maxLength) {
      return {
        valid: false,
        error: `Input exceeds maximum length of ${maxLength} characters`
      };
    }

    return { valid: true };
  }

  /**
   * Validate image dimensions to prevent image bombs
   */
  static async validateImageDimensions(buffer: Buffer): Promise<SecurityValidationResult> {
    try {
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const totalPixels = width * height;

      if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
        return {
          valid: false,
          error: `Image dimensions ${width}x${height} exceed maximum allowed ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT}`
        };
      }

      if (totalPixels > MAX_TOTAL_PIXELS) {
        return {
          valid: false,
          error: `Image size ${totalPixels} pixels exceeds maximum ${MAX_TOTAL_PIXELS} pixels`
        };
      }

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: `Failed to validate image: ${error.message}`
      };
    }
  }

  /**
   * Re-encode image to strip any embedded scripts or malicious data
   * This also validates that the image is actually processable
   */
  static async sanitizeImageContent(buffer: Buffer, mimeType: string): Promise<{ valid: boolean; sanitizedBuffer?: Buffer; error?: string }> {
    try {
      let sharpInstance = sharp(buffer);

      // Get metadata first
      const metadata = await sharpInstance.metadata();
      
      // Explicitly strip all metadata (EXIF, ICC profiles, etc.)
      sharpInstance = sharp(buffer).rotate(); // Auto-rotate based on EXIF, then strip

      // Re-encode based on format to strip any embedded content
      let sanitizedBuffer: Buffer;
      
      switch (mimeType.toLowerCase()) {
        case 'image/jpeg':
        case 'image/jpg':
          sanitizedBuffer = await sharpInstance
            .jpeg({ 
              quality: 90, 
              mozjpeg: true,
              force: true 
            })
            .toBuffer();
          break;
        
        case 'image/png':
          sanitizedBuffer = await sharpInstance
            .png({ 
              compressionLevel: 9,
              force: true 
            })
            .toBuffer();
          break;
        
        case 'image/webp':
          sanitizedBuffer = await sharpInstance
            .webp({ 
              quality: 90,
              force: true 
            })
            .toBuffer();
          break;
        
        case 'image/gif':
          // GIF support in sharp is limited, so we convert to PNG
          sanitizedBuffer = await sharpInstance
            .png({ 
              compressionLevel: 9,
              force: true 
            })
            .toBuffer();
          break;
        
        default:
          return {
            valid: false,
            error: 'Unsupported image format for sanitization'
          };
      }

      console.log(`🧹 Image sanitized: ${buffer.length} bytes → ${sanitizedBuffer.length} bytes`);
      
      return {
        valid: true,
        sanitizedBuffer
      };
    } catch (error: any) {
      return {
        valid: false,
        error: `Image sanitization failed: ${error.message}. File may be corrupted or contain invalid data.`
      };
    }
  }

  /**
   * Comprehensive security validation for uploaded images
   */
  static async validateUpload(params: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    tags?: string[];
    description?: string;
    altText?: string;
  }): Promise<SecurityValidationResult & { sanitizedBuffer?: Buffer; sanitizedFilename?: string }> {
    const warnings: string[] = [];

    // 1. Verify file signature
    const signatureCheck = this.verifyFileSignature(params.buffer, params.mimeType);
    if (!signatureCheck.valid) {
      return signatureCheck;
    }

    // 2. Sanitize filename
    const sanitizedFilename = this.sanitizeFilename(params.filename);
    if (sanitizedFilename !== params.filename) {
      warnings.push('Filename was sanitized for security');
    }

    // 3. Validate text inputs
    if (params.description) {
      const descCheck = this.sanitizeTextInput(params.description, 1000);
      if (!descCheck.valid) {
        return descCheck;
      }
    }

    if (params.altText) {
      const altCheck = this.sanitizeTextInput(params.altText, 500);
      if (!altCheck.valid) {
        return altCheck;
      }
    }

    if (params.tags) {
      for (const tag of params.tags) {
        const tagCheck = this.sanitizeTextInput(tag, 50);
        if (!tagCheck.valid) {
          return {
            valid: false,
            error: `Invalid tag "${tag}": ${tagCheck.error}`
          };
        }
      }
    }

    // 4. Validate image dimensions
    const dimensionCheck = await this.validateImageDimensions(params.buffer);
    if (!dimensionCheck.valid) {
      return dimensionCheck;
    }

    // 5. Sanitize image content (re-encode to strip malicious data)
    const sanitizationResult = await this.sanitizeImageContent(params.buffer, params.mimeType);
    if (!sanitizationResult.valid) {
      return {
        valid: false,
        error: sanitizationResult.error
      };
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      sanitizedBuffer: sanitizationResult.sanitizedBuffer,
      sanitizedFilename
    };
  }
}

