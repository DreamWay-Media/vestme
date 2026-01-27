/**
 * OpenAI API Quota Manager
 * Tracks and limits OpenAI API usage to prevent quota exhaustion
 */

interface QuotaEntry {
  count: number;
  resetTime: number;
  totalTokens: number;
  lastReset: number;
}

// In-memory store for quota tracking (use Redis in production)
const quotaStore = new Map<string, QuotaEntry>();

// Default limits (adjust based on your OpenAI plan)
const DEFAULT_LIMITS = {
  // Conservative limits to prevent quota exhaustion
  requestsPerHour: 50, // Max 50 requests per hour
  requestsPerDay: 500, // Max 500 requests per day
  tokensPerHour: 100000, // Max 100k tokens per hour
  tokensPerDay: 1000000, // Max 1M tokens per day
};

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of quotaStore.entries()) {
    if (now > entry.resetTime) {
      quotaStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

export class OpenAIQuotaManager {
  private limits = DEFAULT_LIMITS;

  constructor(customLimits?: Partial<typeof DEFAULT_LIMITS>) {
    if (customLimits) {
      this.limits = { ...DEFAULT_LIMITS, ...customLimits };
    }
  }

  /**
   * Check if we can make an API call without exceeding quota
   */
  canMakeRequest(estimatedTokens: number = 0): { allowed: boolean; reason?: string; retryAfter?: number } {
    const now = Date.now();
    const hourKey = `hour:${Math.floor(now / (60 * 60 * 1000))}`;
    const dayKey = `day:${Math.floor(now / (24 * 60 * 60 * 1000))}`;

    // Get or create entries
    let hourEntry = quotaStore.get(hourKey);
    if (!hourEntry || now > hourEntry.resetTime) {
      hourEntry = {
        count: 0,
        resetTime: now + (60 * 60 * 1000), // 1 hour
        totalTokens: 0,
        lastReset: now
      };
      quotaStore.set(hourKey, hourEntry);
    }

    let dayEntry = quotaStore.get(dayKey);
    if (!dayEntry || now > dayEntry.resetTime) {
      dayEntry = {
        count: 0,
        resetTime: now + (24 * 60 * 60 * 1000), // 24 hours
        totalTokens: 0,
        lastReset: now
      };
      quotaStore.set(dayKey, dayEntry);
    }

    // Check hourly limits
    if (hourEntry.count >= this.limits.requestsPerHour) {
      return {
        allowed: false,
        reason: 'Hourly request limit exceeded',
        retryAfter: Math.ceil((hourEntry.resetTime - now) / 1000)
      };
    }

    if (hourEntry.totalTokens + estimatedTokens > this.limits.tokensPerHour) {
      return {
        allowed: false,
        reason: 'Hourly token limit exceeded',
        retryAfter: Math.ceil((hourEntry.resetTime - now) / 1000)
      };
    }

    // Check daily limits
    if (dayEntry.count >= this.limits.requestsPerDay) {
      return {
        allowed: false,
        reason: 'Daily request limit exceeded',
        retryAfter: Math.ceil((dayEntry.resetTime - now) / 1000)
      };
    }

    if (dayEntry.totalTokens + estimatedTokens > this.limits.tokensPerDay) {
      return {
        allowed: false,
        reason: 'Daily token limit exceeded',
        retryAfter: Math.ceil((dayEntry.resetTime - now) / 1000)
      };
    }

    return { allowed: true };
  }

  /**
   * Record an API call
   */
  recordRequest(actualTokens: number = 0): void {
    const now = Date.now();
    const hourKey = `hour:${Math.floor(now / (60 * 60 * 1000))}`;
    const dayKey = `day:${Math.floor(now / (24 * 60 * 60 * 1000))}`;

    const hourEntry = quotaStore.get(hourKey);
    if (hourEntry) {
      hourEntry.count++;
      hourEntry.totalTokens += actualTokens;
    }

    const dayEntry = quotaStore.get(dayKey);
    if (dayEntry) {
      dayEntry.count++;
      dayEntry.totalTokens += actualTokens;
    }
  }

  /**
   * Get current quota status
   */
  getStatus(): {
    hourly: { requests: number; tokens: number; limit: number; tokenLimit: number };
    daily: { requests: number; tokens: number; limit: number; tokenLimit: number };
  } {
    const now = Date.now();
    const hourKey = `hour:${Math.floor(now / (60 * 60 * 1000))}`;
    const dayKey = `day:${Math.floor(now / (24 * 60 * 60 * 1000))}`;

    const hourEntry = quotaStore.get(hourKey) || { count: 0, totalTokens: 0, resetTime: now, lastReset: now };
    const dayEntry = quotaStore.get(dayKey) || { count: 0, totalTokens: 0, resetTime: now, lastReset: now };

    return {
      hourly: {
        requests: hourEntry.count,
        tokens: hourEntry.totalTokens,
        limit: this.limits.requestsPerHour,
        tokenLimit: this.limits.tokensPerHour
      },
      daily: {
        requests: dayEntry.count,
        tokens: dayEntry.totalTokens,
        limit: this.limits.requestsPerDay,
        tokenLimit: this.limits.tokensPerDay
      }
    };
  }

  /**
   * Reset quota (for testing/admin)
   */
  reset(): void {
    quotaStore.clear();
  }
}

export const quotaManager = new OpenAIQuotaManager();

