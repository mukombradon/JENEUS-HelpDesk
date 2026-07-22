import rateLimit from 'express-rate-limit';
import config from '../config';

// ---------------------------------------------------------------------------
// Auth-specific rate limiters
// ---------------------------------------------------------------------------

/**
 * Strict limiter for login — 5 attempts per minute per IP.
 */
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    error: {
      message: 'Too many login attempts. Please try again in a minute.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(config.nodeEnv === 'test' ? { max: 100 } : {}),
});

/**
 * Moderate limiter for forgot-password / reset-password — 3 requests per 5 min.
 */
export const passwordLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  message: {
    error: {
      message: 'Too many password reset requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General auth limiter — 20 requests per minute (catches refresh, etc.).
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    error: {
      message: 'Too many requests. Please slow down.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
