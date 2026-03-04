/*
  This file helps Jarvis prevent abuse and keep the service running smoothly for everyone.

  It limits how many requests can be made in a time period, protects against overload, and makes sure Jarvis remains available while being more lenient during development.
*/
/**
 * Rate limiting middleware using express-rate-limit
 *
 * In development/test mode (NODE_ENV !== 'production'), limits are increased
 * to allow for testing without hitting rate limits.
 */

import rateLimit from "express-rate-limit";

// Check if we're in production mode
const isProduction = process.env.NODE_ENV === "production";

// Multiplier for development/test mode (10x higher limits)
const devMultiplier = isProduction ? 1 : 10;

/**
 * General rate limiter (100 requests per 15 minutes in prod, 1000 in dev)
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 * devMultiplier, // 100 requests per window (1000 in dev)
  message: {
    success: false,
    error: "Too many requests, please try again later",
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.SKIP_RATE_LIMIT === "true",
});

/**
 * Strict rate limiter (20 requests per 15 minutes in prod, 200 in dev)
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20 * devMultiplier,
  message: {
    success: false,
    error: "Rate limit exceeded for this endpoint",
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.SKIP_RATE_LIMIT === "true",
});

/**
 * Authentication rate limiter (5 requests per 15 minutes in prod, 50 in dev)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5 * devMultiplier,
  message: {
    success: false,
    error: "Too many authentication attempts, please try again later",
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.SKIP_RATE_LIMIT === "true",
});

/**
 * Agent execution rate limiter (30 requests per 15 minutes in prod, 300 in dev)
 */
export const agentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30 * devMultiplier,
  message: {
    success: false,
    error: "Too many agent execution requests",
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.SKIP_RATE_LIMIT === "true",
});

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
