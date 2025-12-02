/**
 * Rate Limiter Middleware
 * Prevents abuse of API endpoints, especially file uploads
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (for production, use Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: any) => string; // Custom key generator
  message?: string;
  skipSuccessfulRequests?: boolean; // Only count failed requests
  skipFailedRequests?: boolean; // Only count successful requests
}

/**
 * Create a rate limiter middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req: any) => {
      // Default: use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip || req.connection.remoteAddress || 'unknown';
    },
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req as any);
      const now = Date.now();
      
      // Get or create rate limit entry
      let entry = rateLimitStore.get(key);
      
      if (!entry || now > entry.resetTime) {
        // Create new entry
        entry = {
          count: 0,
          resetTime: now + windowMs
        };
        rateLimitStore.set(key, entry);
      }

      // Check if limit exceeded
      if (entry.count >= maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        res.set('Retry-After', String(retryAfter));
        res.set('X-RateLimit-Limit', String(maxRequests));
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', String(entry.resetTime));
        
        return res.status(429).json({
          error: message,
          retryAfter: retryAfter
        });
      }

      // Increment counter (conditionally based on options)
      const shouldCount = () => {
        if (skipSuccessfulRequests && res.statusCode < 400) return false;
        if (skipFailedRequests && res.statusCode >= 400) return false;
        return true;
      };

      // Store original end function
      const originalEnd = res.end;
      
      // Override end to count after response
      res.end = function(...args: any[]) {
        if (shouldCount()) {
          entry!.count++;
        }
        return originalEnd.apply(res, args);
      } as any;

      // Set rate limit headers
      res.set('X-RateLimit-Limit', String(maxRequests));
      res.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count - 1)));
      res.set('X-RateLimit-Reset', String(entry.resetTime));

      // Increment immediately if not waiting for response
      if (!skipSuccessfulRequests && !skipFailedRequests) {
        entry.count++;
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Don't block request on rate limiter errors
      next();
    }
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // Strict rate limit for file uploads
  upload: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20, // 20 uploads per 15 minutes
    message: 'Too many uploads. Please wait before uploading more files.',
    skipFailedRequests: true // Only count successful uploads
  }),

  // Moderate rate limit for image extraction
  extract: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 extractions per hour
    message: 'Too many extraction requests. Please wait before extracting more images.',
    skipFailedRequests: true
  }),

  // General API rate limit
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200, // 200 requests per 15 minutes
    message: 'Too many requests. Please slow down.',
  }),

  // Auth endpoints (stricter)
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
    keyGenerator: (req: any) => {
      // Use IP for auth endpoints regardless of authentication
      return req.ip || req.connection.remoteAddress || 'unknown';
    }
  }),
};

