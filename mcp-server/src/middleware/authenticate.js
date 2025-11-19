/**
 * Authentication Middleware - Sales Automation API
 *
 * Implements API key-based authentication for securing API endpoints.
 * Supports both Bearer token and X-API-Key header formats.
 */

import crypto from 'crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Auth');

// Rate limiting and account lockout tracking (in-memory)
// NOTE: In-memory implementation - not suitable for multi-server deployments.
// For production scaling, migrate to Redis using same pattern as CSRF protection.
const failedAttempts = new Map(); // key: IP address, value: { count, firstAttempt, lockedUntil }
const requestCounts = new Map(); // key: IP address, value: { count, windowStart }

// Log warning about in-memory usage at startup
if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
  logger.warn('[Auth] PRODUCTION WARNING: Using in-memory rate limiting and account lockout');
  logger.warn('[Auth] This configuration is NOT suitable for multi-server deployments');
  logger.warn('[Auth] Rate limits and lockouts will NOT be shared across server instances');
  logger.warn('[Auth] Migration path: Set REDIS_URL environment variable to enable distributed storage');
  logger.warn('[Auth] Example: REDIS_URL=redis://localhost:6379');
  logger.warn('[Auth] See docs/SCALING.md for complete migration guide');
}

// Track if we've warned about multi-server deployment in this session
let multiServerWarningLogged = false;

// Configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Cleanup every 5 minutes

/**
 * Cleanup expired lockout entries to prevent memory leaks
 * Removes entries where lockout has expired or window has passed
 */
function cleanupExpiredLockouts() {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [ip, attempt] of failedAttempts.entries()) {
    // Remove if lockout expired or outside the tracking window
    if (
      (attempt.lockedUntil && now >= attempt.lockedUntil) ||
      (now - attempt.firstAttempt > LOCKOUT_DURATION_MS * 2)
    ) {
      failedAttempts.delete(ip);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.debug(`[Auth] Cleanup: Removed ${cleanedCount} expired lockout entries`);
  }
}

/**
 * Cleanup expired rate limit entries to prevent memory leaks
 * Removes entries older than 2x the rate limit window
 */
function cleanupExpiredRateLimits() {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [ip, record] of requestCounts.entries()) {
    // Remove if window is more than 2x expired (gives buffer for edge cases)
    if (now - record.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      requestCounts.delete(ip);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.debug(`[Auth] Cleanup: Removed ${cleanedCount} expired rate limit entries`);
  }
}

/**
 * Automatic cleanup interval to prevent memory leaks
 * Runs every 5 minutes to clean up expired entries from both Maps
 */
const cleanupInterval = setInterval(() => {
  cleanupExpiredLockouts();
  cleanupExpiredRateLimits();

  // Log current map sizes for monitoring
  logger.debug(`[Auth] Memory usage: ${failedAttempts.size} lockouts, ${requestCounts.size} rate limits`);
}, CLEANUP_INTERVAL_MS);

// Prevent the interval from keeping the process alive in tests
cleanupInterval.unref();

/**
 * Get API Keys from environment (lazy loading)
 * Format: API_KEYS=sk_live_abc123...,sk_live_def456...
 *
 * Note: We read this on each call rather than at module load time
 * to ensure dotenv.config() has been called first.
 */
function getApiKeys() {
  const keys = process.env.API_KEYS ? process.env.API_KEYS.split(',').map(k => k.trim()) : [];
  // Debug logging
  if (keys.length > 0) {
    logger.info(`Loaded ${keys.length} API keys from environment`);
  } else {
    logger.warn('No API keys found in process.env.API_KEYS');
  }
  return keys;
}

/**
 * Public endpoints that don't require authentication
 * Webhooks use signature validation instead of API keys
 */
const PUBLIC_ENDPOINTS = [
  '/health',
  '/dashboard',
  '/',
  '/api/campaigns/events/webhook',  // Webhook endpoint with signature validation
  '/api/campaigns/v2/events/webhook',  // V2 webhook endpoint
];

/**
 * Extract API key from request headers
 * Supports two formats:
 * 1. Authorization: Bearer sk_live_...
 * 2. X-API-Key: sk_live_...
 *
 * @param {object} req - Express request object
 * @returns {string|null} API key or null if not found
 */
function extractApiKey(req) {
  // Check Authorization header (Bearer token format)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * Validate API key using constant-time comparison to prevent timing attacks
 *
 * @param {string} providedKey - API key from request
 * @returns {boolean} True if key is valid
 */
function validateApiKey(providedKey) {
  if (!providedKey || typeof providedKey !== 'string') {
    return false;
  }

  const apiKeys = getApiKeys();

  // If no API keys configured, reject all requests (fail secure)
  if (apiKeys.length === 0) {
    logger.warn('No API keys configured - all requests rejected');
    return false;
  }

  // Check against all configured keys using constant-time comparison
  for (const validKey of apiKeys) {
    if (constantTimeCompare(providedKey, validKey)) {
      return true;
    }
  }

  return false;
}

/**
 * Constant-time string comparison to prevent timing attacks
 * Uses crypto.timingSafeEqual for secure comparison
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
function constantTimeCompare(a, b) {
  try {
    // Convert to buffers for timing-safe comparison
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    // If lengths differ, still perform comparison to avoid timing leak
    if (bufferA.length !== bufferB.length) {
      // Compare with a dummy buffer of same length as b to maintain constant time
      const dummyBuffer = Buffer.alloc(bufferB.length);
      crypto.timingSafeEqual(dummyBuffer, bufferB);
      return false;
    }

    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch (error) {
    // If any error occurs, reject the comparison
    return false;
  }
}

/**
 * Check if endpoint is public (doesn't require authentication)
 *
 * @param {string} path - Request path
 * @returns {boolean} True if endpoint is public
 */
function isPublicEndpoint(path) {
  return PUBLIC_ENDPOINTS.some(publicPath => {
    // Exact match
    if (path === publicPath) {
      return true;
    }
    // Starts with match (for /dashboard/* routes)
    // Important: Only match if publicPath is NOT just "/" to avoid matching ALL routes
    if (publicPath.endsWith('/') && publicPath !== '/' && path.startsWith(publicPath)) {
      return true;
    }
    return false;
  });
}

/**
 * Authentication middleware
 * Validates API key for all non-public endpoints
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
/**
 * Check if IP is currently locked out
 */
function isLockedOut(ip) {
  const attempt = failedAttempts.get(ip);
  if (!attempt) return false;
  
  if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
    return true;
  }
  
  // Lock expired, clear it
  if (attempt.lockedUntil && Date.now() >= attempt.lockedUntil) {
    failedAttempts.delete(ip);
  }
  
  return false;
}

/**
 * Record failed authentication attempt
 * Uses atomic increment-then-check to prevent race conditions
 */
function recordFailedAttempt(ip) {
  const now = Date.now();
  const attempt = failedAttempts.get(ip) || { count: 0, firstAttempt: now };

  // Reset if outside window
  if (now - attempt.firstAttempt > LOCKOUT_DURATION_MS) {
    attempt.count = 0;
    attempt.firstAttempt = now;
    attempt.lockedUntil = null;
  }

  // Increment FIRST (always increment failed attempts)
  attempt.count++;

  // Lock out if too many attempts (>= not >, to lock on exactly 5th attempt)
  // This prevents race condition where multiple concurrent failed auths
  // could all read count=4, increment to 5, but not trigger lockout
  if (attempt.count >= MAX_FAILED_ATTEMPTS) {
    attempt.lockedUntil = now + LOCKOUT_DURATION_MS;
    logger.warn(`IP ${ip} locked out after ${attempt.count} failed attempts`);
  }

  failedAttempts.set(ip, attempt);
}

/**
 * Clear failed attempts on successful auth
 */
function clearFailedAttempts(ip) {
  failedAttempts.delete(ip);
}

/**
 * Check rate limit for IP
 * Uses atomic check-then-increment to prevent race conditions
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const record = requestCounts.get(ip) || { count: 0, windowStart: now };

  // Reset if outside window
  if (now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    record.count = 0;
    record.windowStart = now;
  }

  // Check BEFORE incrementing (atomic check-and-increment pattern)
  // This prevents race condition where multiple concurrent requests
  // can all read count=99, increment to 100, and all pass
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  requestCounts.set(ip, record);

  return true;
}

export function authenticate(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;

  // Log warning on first request if multi-server deployment detected
  if (process.env.NODE_ENV === 'production' &&
      !multiServerWarningLogged &&
      req.headers['x-forwarded-for']) {
    logger.warn('[Auth] Multi-server deployment detected (X-Forwarded-For header present)');
    logger.warn('[Auth] Using in-memory stores will cause authentication issues');
    logger.warn('[Auth] Each server instance has separate rate limits and lockout tracking');
    logger.warn('[Auth] Immediate action required: Migrate to Redis (see docs/SCALING.md)');
    multiServerWarningLogged = true;
  }

  // Skip authentication for public endpoints
  if (isPublicEndpoint(req.path)) {
    return next();
  }
  
  // Check if IP is locked out
  if (isLockedOut(ip)) {
    const attempt = failedAttempts.get(ip);
    const remainingMs = attempt.lockedUntil - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    
    return res.status(429).json({
      success: false,
      error: 'Account Locked',
      message: `Too many failed authentication attempts. Try again in ${remainingMinutes} minutes.`,
      code: 'ACCOUNT_LOCKED',
      timestamp: new Date().toISOString(),
    });
  }
  
  // Check rate limit
  if (!checkRateLimit(ip)) {
    logger.warn(`Rate limit exceeded for IP ${ip}`);
    return res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per 15 minutes.`,
      code: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString(),
    });
  }

  // Extract API key from request
  const apiKey = extractApiKey(req);

  // If no API key provided
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing API key. Provide via Authorization: Bearer <key> or X-API-Key: <key> header',
      timestamp: new Date().toISOString(),
    });
  }

  // Validate API key
  if (!validateApiKey(apiKey)) {
    // Record failed attempt
    recordFailedAttempt(ip);
    
    // Don't log the invalid key (security risk)
    logger.warn(`Invalid API key attempt from ${ip}`);

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid API key',
      code: 'INVALID_API_KEY',
      timestamp: new Date().toISOString(),
    });
  }

  // Authentication successful - clear any failed attempts
  clearFailedAttempts(ip);
  
  // Note: Don't log the valid key
  logger.info(`Authenticated request: ${req.method} ${req.path} from ${ip}`);

  // Attach auth info to request (without the key itself)
  req.authenticated = true;

  next();
}

/**
 * Generate a secure API key
 * Format: sk_live_<64 hex characters>
 *
 * @param {string} prefix - Key prefix (default: sk_live)
 * @returns {string} Generated API key
 */
export function generateApiKey(prefix = 'sk_live') {
  const randomBytes = crypto.randomBytes(32); // 256 bits
  const randomHex = randomBytes.toString('hex'); // 64 hex characters
  return `${prefix}_${randomHex}`;
}

/**
 * Check if API keys are configured
 *
 * @returns {boolean} True if API keys are configured
 */
export function hasApiKeys() {
  return getApiKeys().length > 0;
}

/**
 * Get count of configured API keys (for monitoring)
 *
 * @returns {number} Number of configured keys
 */
export function getApiKeyCount() {
  return getApiKeys().length;
}

export default { authenticate, generateApiKey, hasApiKeys, getApiKeyCount };
