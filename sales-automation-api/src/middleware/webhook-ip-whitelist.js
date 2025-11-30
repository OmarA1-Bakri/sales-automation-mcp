/**
 * Webhook IP Whitelist Middleware
 *
 * Security layer for webhook endpoints that validates incoming requests
 * against known provider IP addresses.
 *
 * SECURITY: This middleware MUST be applied to webhook routes for providers
 * that don't support cryptographic signature verification.
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('WebhookIPWhitelist');

/**
 * Known provider IP addresses
 *
 * Postmark IPs: https://postmarkapp.com/developer/webhooks/inbound-reference#inbound-ip-addresses
 * Last updated: 2025-11-30
 */
const PROVIDER_IPS = {
  postmark: [
    '3.134.147.250',
    '50.31.156.6',
    '50.31.156.77',
    '18.217.206.57'
  ],
  // PhantomBuster doesn't publish webhook source IPs
  // We rely on HMAC signature validation instead
  phantombuster: [],
  // HeyGen doesn't publish webhook source IPs
  // We rely on HMAC signature validation instead
  heygen: [],
  // Lemlist doesn't publish webhook source IPs
  lemlist: []
};

/**
 * Extract client IP from request, handling proxies
 * @param {Request} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIP(req) {
  // Trust X-Forwarded-For if behind a proxy (configure trust proxy in Express)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2...
    // The leftmost is the original client
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }

  // Fall back to direct connection IP
  return req.ip ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.connection?.socket?.remoteAddress ||
         '0.0.0.0';
}

/**
 * Normalize IPv6-mapped IPv4 addresses
 * @param {string} ip - IP address that might be IPv6-mapped
 * @returns {string} Normalized IPv4 address
 */
function normalizeIP(ip) {
  if (!ip) return '0.0.0.0';

  // Handle IPv6-mapped IPv4 (::ffff:192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }

  // Handle IPv6 localhost
  if (ip === '::1') {
    return '127.0.0.1';
  }

  return ip;
}

/**
 * Create IP whitelist middleware for a specific provider
 *
 * @param {string} provider - Provider name (postmark, phantombuster, heygen)
 * @param {Object} options - Configuration options
 * @param {boolean} options.allowLocalhost - Allow localhost for development (default: true in dev)
 * @param {string[]} options.additionalIPs - Additional IPs to whitelist
 * @returns {Function} Express middleware function
 *
 * @example
 * // Apply to Postmark webhook route
 * router.post('/webhooks/postmark',
 *   createIPWhitelistMiddleware('postmark'),
 *   postmarkWebhookHandler
 * );
 */
export function createIPWhitelistMiddleware(provider, options = {}) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const {
    allowLocalhost = isDevelopment,
    additionalIPs = []
  } = options;

  const providerIPs = PROVIDER_IPS[provider] || [];

  // Build whitelist
  const whitelist = new Set([
    ...providerIPs,
    ...additionalIPs
  ]);

  // Add localhost IPs for development
  if (allowLocalhost) {
    whitelist.add('127.0.0.1');
    whitelist.add('localhost');
    whitelist.add('::1');
  }

  // Log configuration
  if (providerIPs.length > 0) {
    logger.info(`IP whitelist configured for ${provider}`, {
      provider,
      whitelistedIPs: providerIPs.length,
      allowLocalhost,
      additionalIPs: additionalIPs.length
    });
  } else {
    logger.warn(`No IP whitelist configured for ${provider} - using signature validation only`, {
      provider
    });
  }

  return function ipWhitelistMiddleware(req, res, next) {
    // Skip IP validation if no IPs configured for this provider
    // (rely on signature validation instead)
    if (providerIPs.length === 0) {
      return next();
    }

    const clientIP = normalizeIP(getClientIP(req));

    if (whitelist.has(clientIP)) {
      logger.debug(`${provider} webhook from whitelisted IP`, {
        provider,
        clientIP
      });
      return next();
    }

    // Log rejected attempt with details for security monitoring
    logger.warn(`${provider} webhook REJECTED - unauthorized IP`, {
      provider,
      clientIP,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    return res.status(403).json({
      error: 'Forbidden',
      message: 'Request from unauthorized IP address'
    });
  };
}

/**
 * Pre-configured middleware instances for common providers
 */
export const postmarkIPWhitelist = createIPWhitelistMiddleware('postmark');
export const phantombusterIPWhitelist = createIPWhitelistMiddleware('phantombuster');
export const heygenIPWhitelist = createIPWhitelistMiddleware('heygen');

/**
 * Combined middleware that detects provider from query param and applies appropriate whitelist
 *
 * @example
 * // Apply to unified webhook endpoint
 * router.post('/api/campaigns/events/webhook',
 *   dynamicIPWhitelist,
 *   webhookHandler
 * );
 */
export function dynamicIPWhitelist(req, res, next) {
  const provider = req.query.provider || detectProviderFromBody(req.body);

  if (!provider) {
    // No provider identified, let the handler deal with it
    return next();
  }

  const middleware = createIPWhitelistMiddleware(provider);
  return middleware(req, res, next);
}

/**
 * Attempt to detect provider from webhook body structure
 * @param {Object} body - Request body
 * @returns {string|null} Provider name or null
 */
function detectProviderFromBody(body) {
  if (!body) return null;

  // Postmark uses RecordType
  if (body.RecordType) return 'postmark';

  // Lemlist uses event type field
  if (body.type && body.campaignId) return 'lemlist';

  // HeyGen uses video_id
  if (body.video_id || body.event_type?.startsWith('video.')) return 'heygen';

  // PhantomBuster uses agent_id
  if (body.agent_id || body.phantom_id) return 'phantombuster';

  return null;
}

export default {
  createIPWhitelistMiddleware,
  postmarkIPWhitelist,
  phantombusterIPWhitelist,
  heygenIPWhitelist,
  dynamicIPWhitelist
};
