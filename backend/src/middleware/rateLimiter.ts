import rateLimit from 'express-rate-limit';
import { AuthRequest } from '../core/auth/index.js';

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  message?: string;
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const max = options.max ?? 100;
  const message = options.message ?? 'Too many requests, please try again later';

  return rateLimit({
    windowMs,
    max,
    message: {
      status: 'error',
      message,
      code: 'RATE_LIMIT_ERROR',
    },
    keyGenerator: (req) => {
      const authReq = req as AuthRequest;
      if (authReq.user?.userId) {
        return `user:${authReq.user.userId}`;
      }
      return req.ip ?? 'unknown';
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}
