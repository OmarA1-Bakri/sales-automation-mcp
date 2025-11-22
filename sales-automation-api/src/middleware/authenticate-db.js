/**
 * Database-Backed Authentication Middleware
 * 
 * Implements secure API key authentication using Argon2id hashing
 * with database storage, rotation support, and comprehensive audit logging.
 * 
 * Replaces plaintext .env authentication with enterprise-grade security.
 */

import { ApiKey, sequelize } from '../models/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Auth-DB');

/**
 * Public endpoints that don't require authentication
 * Webhooks use signature validation instead of API keys
 *
 * NOTE: When middleware is mounted at /api, req.path is relative to mount point
 * So /api/campaigns/events/webhook becomes /campaigns/events/webhook
 */
const PUBLIC_ENDPOINTS = [
  '/health',
  '/dashboard',
  '/',
  '/campaigns/events/webhook',  // Webhook endpoint with signature validation (relative to /api mount)
  '/campaigns/v2/events/webhook',  // V2 webhook endpoint (relative to /api mount)
];

/**
 * Extract API key from request headers
 * Supports two formats:
 * 1. Authorization: Bearer sk_live_v2_...
 * 2. X-API-Key: sk_live_v2_...
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
 * Validate IP address against whitelist (if configured)
 * 
 * @param {string} clientIp - Client IP address
 * @param {Array|null} ipWhitelist - Array of allowed IPs or null for all
 * @returns {boolean} True if IP is allowed
 */
function validateIpWhitelist(clientIp, ipWhitelist) {
  // If no whitelist, allow all IPs
  if (!ipWhitelist || !Array.isArray(ipWhitelist) || ipWhitelist.length === 0) {
    return true;
  }

  // Check if client IP is in whitelist
  return ipWhitelist.includes(clientIp);
}

/**
 * Check if API key has required scope for the endpoint
 * 
 * SECURITY: Normalizes path to prevent traversal attacks.
 * Validates resource names to prevent injection.
 * 
 * @param {Array} keyScopes - API key's granted scopes
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @returns {boolean} True if key has required scope
 */
function validateScope(keyScopes, method, path) {
  // If no scopes defined, allow all (backward compatibility)
  if (!keyScopes || keyScopes.length === 0) {
    return true;
  }

  // Normalize path to prevent traversal attacks
  // Remove ../ and %2f (URL-encoded /)
  const normalizedPath = path
    .replace(/\/\.\.\//g, '/')  // Remove ../
    .replace(/%2[fF]/g, '/')     // Decode %2f and %2F
    .replace(/\/+/g, '/');       // Normalize multiple slashes

  // Extract resource (second segment after /api/)
  // Only match alphanumeric, underscore, hyphen (prevents injection)
  const resourceMatch = normalizedPath.match(/^\/api\/([a-z0-9_-]+)(\/|$)/i);
  if (!resourceMatch) {
    // Non-API routes don't require specific scopes
    return true;
  }

  const resource = resourceMatch[1].toLowerCase();
  const action = method.toLowerCase() === 'get' ? 'read' : 'write';
  const requiredScope = `${action}:${resource}`;

  // Check if key has required scope or wildcard scope
  return keyScopes.includes(requiredScope) || 
         keyScopes.includes(`${action}:*`) || 
         keyScopes.includes('*');
}

/**
 * Database-backed authentication middleware
 * Validates API key against database with Argon2id verification
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function authenticateDb(req, res, next) {
  try {
    // Skip authentication for public endpoints
    if (isPublicEndpoint(req.path)) {
      return next();
    }

    // Extract API key from request
    const providedKey = extractApiKey(req);

    // If no API key provided
    if (!providedKey) {
      logger.warn(`Missing API key from ${req.ip}: ${req.method} ${req.path}`);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing API key. Provide via Authorization: Bearer <key> or X-API-Key: <key> header',
        timestamp: new Date().toISOString(),
      });
    }

    // Verify API key against database
    const apiKey = await ApiKey.verifyKey(providedKey);

    if (!apiKey) {
      // verifyKey already logged the failure reason
      logger.warn(`Invalid API key attempt from ${req.ip}: ${req.method} ${req.path}`);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired API key',
        timestamp: new Date().toISOString(),
      });
    }

    // Check IP whitelist (if configured)
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!validateIpWhitelist(clientIp, apiKey.ipWhitelist)) {
      logger.warn(`IP blocked for key ${apiKey.prefix} from ${clientIp}: ${req.method} ${req.path}`, {
        keyId: apiKey.id,
        clientIp,
        whitelistedIps: apiKey.ipWhitelist
      });
      await apiKey.logEvent('used', req, { error: 'IP not whitelisted', clientIp });
      
      // SECURITY: Generic error message (don't reveal IP whitelist exists)
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Authentication failed',
        timestamp: new Date().toISOString(),
      });
    }

    // Check scope permissions
    if (!validateScope(apiKey.scopes, req.method, req.path)) {
      logger.warn(`Insufficient scope for key ${apiKey.prefix} from ${clientIp}: ${req.method} ${req.path}`, {
        keyId: apiKey.id,
        requiredScope: `${req.method.toLowerCase() === 'get' ? 'read' : 'write'}:${req.path.match(/^\/api\/([^/]+)/)?.[1]}`,
        grantedScopes: apiKey.scopes
      });
      await apiKey.logEvent('used', req, { 
        error: 'Insufficient scope', 
        requiredScope: `${req.method.toLowerCase() === 'get' ? 'read' : 'write'}:${req.path.match(/^\/api\/([^/]+)/)?.[1]}`,
        grantedScopes: apiKey.scopes
      });
      
      // SECURITY: Generic error message (don't reveal scope requirements)
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Authentication failed',
        timestamp: new Date().toISOString(),
      });
    }

    // Authentication successful
    logger.info(`Authenticated: ${apiKey.prefix} | ${req.method} ${req.path} | ${clientIp}`);

    // Log successful usage (already logged in verifyKey, but with full context)
    await apiKey.logEvent('used', req, { 
      success: true,
      endpoint: req.path,
      method: req.method
    });

    // Attach API key info to request for downstream middleware
    req.authenticated = true;
    req.apiKey = {
      id: apiKey.id,
      prefix: apiKey.prefix,
      name: apiKey.name,
      scopes: apiKey.scopes,
      userId: apiKey.userId,
      version: apiKey.version
    };

    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Authentication service error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Middleware to require specific scope
 * Use after authenticateDb to enforce granular permissions
 * 
 * @param {string|Array} requiredScopes - Required scope(s)
 * @returns {Function} Express middleware
 * 
 * @example
 * router.post('/campaigns', authenticateDb, requireScope('write:campaigns'), createCampaign);
 */
export function requireScope(requiredScopes) {
  const scopes = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];
  
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'API key required',
        timestamp: new Date().toISOString(),
      });
    }

    const keyScopes = req.apiKey.scopes || [];
    const hasScope = scopes.some(scope => 
      keyScopes.includes(scope) || keyScopes.includes('*')
    );

    if (!hasScope) {
      logger.warn(`Scope check failed for ${req.apiKey.prefix}: required [${scopes.join(', ')}], has [${keyScopes.join(', ')}]`);
      
      // SECURITY: Generic error message (don't reveal scope requirements)
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Authentication failed',
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
}

/**
 * Health check for database authentication
 * Tests database connectivity and model availability
 * 
 * @returns {Promise<object>} Health status
 */
export async function checkAuthHealth() {
  try {
    await sequelize.authenticate();

    const activeKeys = await ApiKey.count({
      where: { status: 'active' }
    });

    return {
      status: 'healthy',
      activeKeys,
      authMethod: 'database',
      hashAlgorithm: 'Argon2id'
    };
  } catch (error) {
    logger.warn('Database health check failed', { error: error.message });

    return {
      status: 'unhealthy',
      error: error.message,
      authMethod: 'database'
    };
  }
}

export default { authenticateDb, requireScope, checkAuthHealth };
