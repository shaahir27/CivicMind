/**
 * Rate Limiting Middleware
 *
 * Provides tiered rate limiters for different endpoint sensitivity levels.
 * Applied per-route in addition to the global limiter in server.ts.
 *
 * Tiers:
 *   - strict:   10 req / 15 min  — issue submission, auth (prevent spam/abuse)
 *   - standard: 60 req / 15 min  — authenticated reads/updates
 *   - relaxed:  300 req / 15 min — public map/feed endpoints
 */

import { rateLimit } from 'express-rate-limit';

const RATE_LIMITED_RESPONSE = {
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please slow down and try again later.',
  },
};

/** 10 requests per 15 min — issue submission, auth endpoints */
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env['NODE_ENV'] === 'development' ? 500 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMITED_RESPONSE,
  skipSuccessfulRequests: false,
});

/** 60 requests per 15 min — authority status updates, confirms */
export const standardRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env['NODE_ENV'] === 'development' ? 1000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMITED_RESPONSE,
});

/** 300 requests per 15 min — read-heavy public endpoints */
export const relaxedRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env['NODE_ENV'] === 'development' ? 2000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMITED_RESPONSE,
});
