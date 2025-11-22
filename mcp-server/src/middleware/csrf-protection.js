/**
 * CSRF Protection Middleware - ES Module Version
 * Implements Double Submit Cookie pattern with Redis storage
 */

import crypto from 'crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('CSRF');

class CSRFProtection {
  constructor(options = {}) {
    this.tokenTTL = options.tokenTTL || parseInt(process.env.CSRF_TOKEN_TTL) || 3600000;
    this.rotation = options.rotation || process.env.CSRF_ROTATION || 'per-session';
    this.enforce = options.enforce !== false && process.env.CSRF_ENFORCE !== 'false';
    this.memoryStore = new Map();
    this.redis = null;
    this._lastFallbackWarning = 0; // Track last fallback warning time

    try {
      // Redis will be injected if available
      if (options.redis) {
        this.redis = options.redis;
      }
    } catch (err) {
      logger.warn('[CSRF] Redis not configured, using in-memory store');
    }

    // Warn about in-memory fallback in production
    if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
      logger.warn('[CSRF] PRODUCTION WARNING: Redis not configured, using in-memory CSRF token storage');
      logger.warn('[CSRF] This configuration will cause CSRF token mismatches in multi-server deployments');
      logger.warn('[CSRF] Users will get 403 errors when requests hit different servers');
      logger.warn('[CSRF] Migration path: Set REDIS_URL environment variable');
      logger.warn('[CSRF] Example: REDIS_URL=redis://localhost:6379');
      logger.warn('[CSRF] See docs/SCALING.md for complete migration guide');
    }
  }

  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async storeToken(sessionId, token) {
    const key = `csrf:${sessionId}`;
    const ttlSeconds = Math.floor(this.tokenTTL / 1000);

    try {
      if (this.redis && this.redis.status === 'ready') {
        await this.redis.setex(key, ttlSeconds, token);
      } else {
        // Warn about in-memory fallback if Redis is not ready
        if (this.redis && process.env.NODE_ENV === 'production') {
          const now = Date.now();
          if (now - this._lastFallbackWarning > 60000) { // Throttle warnings to once per minute
            logger.warn('[CSRF] Redis not ready, using in-memory store. WARNING: Multi-server deployments will have CSRF token mismatch issues!');
            this._lastFallbackWarning = now;
          }
        }
        this.memoryStore.set(key, { token, expiresAt: Date.now() + this.tokenTTL });
        this.cleanupExpiredTokens();
      }
    } catch (err) {
      logger.error('[CSRF] Token storage failed:', err);
      // Warn about fallback on error
      if (process.env.NODE_ENV === 'production') {
        const now = Date.now();
        if (now - this._lastFallbackWarning > 60000) { // Throttle warnings to once per minute
          logger.warn('[CSRF] Redis unavailable, falling back to in-memory store. WARNING: Multi-server deployments will have CSRF token mismatch issues!');
          this._lastFallbackWarning = now;
        }
      }
      this.memoryStore.set(key, { token, expiresAt: Date.now() + this.tokenTTL });
    }
  }

  async getToken(sessionId) {
    const key = `csrf:${sessionId}`;
    try {
      if (this.redis && this.redis.status === 'ready') {
        return await this.redis.get(key);
      }
      const entry = this.memoryStore.get(key);
      return (entry && entry.expiresAt > Date.now()) ? entry.token : null;
    } catch (err) {
      const entry = this.memoryStore.get(key);
      return (entry && entry.expiresAt > Date.now()) ? entry.token : null;
    }
  }

  async validateToken(sessionId, submittedToken) {
    if (!submittedToken) return false;
    const storedToken = await this.getToken(sessionId);
    if (!storedToken) return false;

    try {
      const storedBuffer = Buffer.from(storedToken);
      const submittedBuffer = Buffer.from(submittedToken);
      if (storedBuffer.length !== submittedBuffer.length) return false;
      return crypto.timingSafeEqual(storedBuffer, submittedBuffer);
    } catch (err) {
      logger.error('[CSRF] Token comparison failed:', err);
      return false;
    }
  }

  cleanupExpiredTokens() {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.expiresAt <= now) this.memoryStore.delete(key);
    }
  }

  isExemptPath(path) {
    const exemptPaths = [
      '/api/webhooks',
      '/api/campaigns/events/webhook',  // Campaign webhook endpoint
      '/api/campaigns/v2/events/webhook',  // V2 webhook endpoint
      '/health',
      '/metrics',
      '/api/auth/login',
      '/api/csrf-token'
    ];
    return exemptPaths.some(e => path.startsWith(e));
  }

  middleware() {
    return async (req, res, next) => {
      try {
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          const sessionId = req.sessionID || req.ip || 'anonymous';
          let token = await this.getToken(sessionId);
          if (!token || this.rotation === 'per-request') {
            token = this.generateToken();
            await this.storeToken(sessionId, token);
          }
          res.setHeader('X-CSRF-Token', token);
          return next();
        }

        if (this.isExemptPath(req.path)) return next();
        if (!this.enforce) return next();

        const sessionId = req.sessionID || req.ip || 'anonymous';
        const submittedToken = req.headers['x-csrf-token'] || req.body?._csrf || req.query?._csrf;

        if (!submittedToken) {
          logger.warn(`[CSRF] Missing token for ${req.method} ${req.path}`);
          return res.status(403).json({ error: 'CSRF token missing', code: 'CSRF_TOKEN_MISSING' });
        }

        const isValid = await this.validateToken(sessionId, submittedToken);
        if (!isValid) {
          logger.warn(`[CSRF] Invalid token for ${req.method} ${req.path}`);
          return res.status(403).json({ error: 'CSRF token invalid', code: 'CSRF_TOKEN_INVALID' });
        }

        if (this.rotation === 'per-request') {
          const newToken = this.generateToken();
          await this.storeToken(sessionId, newToken);
          res.setHeader('X-CSRF-Token', newToken);
        }

        next();
      } catch (err) {
        logger.error('[CSRF] Middleware error:', err);
        if (process.env.NODE_ENV === 'production') {
          return res.status(500).json({ error: 'CSRF validation failed', code: 'CSRF_ERROR' });
        }
        next();
      }
    };
  }
}

// Create singleton instance
const csrfProtectionInstance = new CSRFProtection();

// Export middleware function
export const csrfMiddleware = (options = {}) => {
  const instance = new CSRFProtection(options);
  return instance.middleware();
};

// Export handler for getting CSRF token via API
export const getCsrfTokenHandler = async (req, res) => {
  try {
    const sessionId = req.sessionID || req.ip || 'anonymous';
    let token = await csrfProtectionInstance.getToken(sessionId);
    
    if (!token) {
      token = csrfProtectionInstance.generateToken();
      await csrfProtectionInstance.storeToken(sessionId, token);
    }

    res.json({
      csrfToken: token,
      expiresIn: csrfProtectionInstance.tokenTTL
    });
  } catch (err) {
    logger.error('[CSRF] Token generation failed:', err);
    res.status(500).json({ error: 'Failed to generate CSRF token' });
  }
};

export { CSRFProtection };
export default csrfMiddleware;
