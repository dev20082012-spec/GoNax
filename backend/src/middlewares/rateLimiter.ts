import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipBuckets = new Map<string, RateLimitRecord>();

// Cleanup stale rate limit buckets every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipBuckets.entries()) {
    if (record.resetTime <= now) {
      ipBuckets.delete(key);
    }
  }
}, 300000);

export function createRateLimiter(options?: {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
}) {
  const windowMs = options?.windowMs || config.security.rateLimitWindowMs;
  const maxRequests = options?.maxRequests || config.security.rateLimitMaxRequests;
  const prefix = options?.keyPrefix || 'global';

  return (req: Request, res: Response, next: NextFunction) => {
    // In test environment, bypass rate limiter if specified
    if (config.nodeEnv === 'test' && !req.headers['x-test-rate-limit']) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${prefix}:${ip}`;
    const now = Date.now();

    let record = ipBuckets.get(key);

    if (!record || record.resetTime <= now) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      ipBuckets.set(key, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', retryAfter.toString());
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded for ${prefix}. Maximum ${maxRequests} requests per ${windowMs / 1000}s allowed.`,
        retryAfterSeconds: retryAfter
      });
    }

    next();
  };
}

export const globalRateLimiter = createRateLimiter({
  windowMs: config.security.rateLimitWindowMs,
  maxRequests: config.security.rateLimitMaxRequests,
  keyPrefix: 'api'
});

export const authRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 10,
  keyPrefix: 'auth'
});

export const predictionRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 40,
  keyPrefix: 'prediction'
});

export const assistantRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 25,
  keyPrefix: 'assistant'
});
