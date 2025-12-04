/**
 * API Key Management Routes
 * RESTful endpoints for creating, rotating, and managing API keys
 * 
 * Security: All key management operations require existing authentication
 * and appropriate scopes (admin:keys)
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { ApiKey, ApiKeyLog } from '../models/index.js';
import { authenticateDb, requireScope } from '../middleware/authenticate-db.js';
import { asyncHandler } from '../middleware/campaign-error-handler.js';
import { createLogger } from '../utils/logger.js';
import { validate } from '../middleware/validate.js';
import {
  CreateAPIKeySchema,
  ListAPIKeysSchema,
  GetAPIKeySchema,
  RotateAPIKeySchema,
  RevokeAPIKeySchema,
  GetAPIKeyLogsSchema
} from '../validators/complete-schemas.js';

const router = express.Router();
const logger = createLogger('API-Keys');

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Key management operations rate limit
 * 20 requests per 15 minutes (sensitive operations)
 */
const keyManagementRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded. Maximum 20 key operations per 15 minutes.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.E2E_MODE === 'true'  // Bypass for E2E tests
});

/**
 * Key listing/viewing rate limit (less restrictive)
 * 60 requests per 15 minutes
 */
const keyViewRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded. Maximum 60 view operations per 15 minutes.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.E2E_MODE === 'true'  // Bypass for E2E tests
});

// ============================================================================
// GLOBAL MIDDLEWARE
// ============================================================================

// Apply authentication to ALL key management routes
router.use(authenticateDb);

// Require admin:keys scope for all key management operations
// This prevents regular API keys from managing other keys
router.use(requireScope(['admin:keys', 'admin:*', '*']));

// ============================================================================
// KEY GENERATION
// ============================================================================

/**
 * POST /api/keys
 * Create a new API key
 * 
 * Body:
 * - name: string (required) - Human-readable key name
 * - scopes: array (optional) - Permission scopes, default: []
 * - expiresInDays: number (optional) - Days until expiration, default: 90
 * - ipWhitelist: array (optional) - Allowed IP addresses, default: null (all)
 * 
 * Response:
 * - key: string - FULL API KEY (SHOWN ONLY ONCE!)
 * - id: uuid
 * - prefix: string
 * - expiresAt: date
 * - scopes: array
 */
router.post(
  '/',
  keyManagementRateLimit,
  validate(CreateAPIKeySchema),
  asyncHandler(async (req, res) => {
    const { name, scopes = [], expiresInDays = 90, ipWhitelist = null, userId = null } = req.validatedBody;

    // Generate new API key (validation handled by Zod middleware)
    const keyData = await ApiKey.generateKey(
      name.trim(),
      scopes,
      expiresInDays,
      userId || req.apiKey?.userId
    );

    logger.info(`New API key created: ${keyData.prefix} by ${req.apiKey?.prefix || 'system'}`);

    res.status(201).json({
      success: true,
      message: '⚠️ IMPORTANT: Save this key securely. It will never be shown again!',
      data: {
        key: keyData.key,  // ⚠️ ONLY TIME THIS IS SHOWN!
        id: keyData.id,
        prefix: keyData.prefix,
        name,
        scopes: keyData.scopes,
        expiresAt: keyData.expiresAt,
        createdAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  })
);

// ============================================================================
// KEY LISTING & RETRIEVAL
// ============================================================================

/**
 * GET /api/keys
 * List all API keys (without secrets)
 * 
 * Query params:
 * - status: string (optional) - Filter by status (active, rotating, expired, revoked)
 * - limit: number (optional) - Results per page, default: 50
 * - offset: number (optional) - Pagination offset, default: 0
 */
router.get(
  '/',
  keyViewRateLimit,
  validate(ListAPIKeysSchema),
  asyncHandler(async (req, res) => {
    const { status, limit = 50, offset = 0 } = req.validatedQuery;

    const where = {};
    if (status) {
      where.status = status;
    }

    const keys = await ApiKey.findAll({
      where,
      attributes: [
        'id', 'prefix', 'name', 'version', 'status',
        'expiresAt', 'lastRotatedAt', 'revokedAt', 'gracePeriodEndsAt',
        'userId', 'lastUsedAt', 'usageCount', 'ipWhitelist', 'scopes',
        'createdAt', 'updatedAt'
      ],
      limit: Math.min(parseInt(limit), 100),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    const total = await ApiKey.count({ where });

    res.json({
      success: true,
      data: {
        keys,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: total > parseInt(offset) + keys.length
        }
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /api/keys/:id
 * Get single API key details (without secret)
 */
router.get(
  '/:id',
  keyViewRateLimit,
  validate(GetAPIKeySchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    const apiKey = await ApiKey.findByPk(id, {
      attributes: [
        'id', 'prefix', 'name', 'version', 'status',
        'expiresAt', 'lastRotatedAt', 'revokedAt', 'gracePeriodEndsAt',
        'userId', 'lastUsedAt', 'usageCount', 'ipWhitelist', 'scopes',
        'createdAt', 'updatedAt'
      ]
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'API key not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: apiKey,
      timestamp: new Date().toISOString()
    });
  })
);

// ============================================================================
// KEY ROTATION
// ============================================================================

/**
 * POST /api/keys/:id/rotate
 * Rotate an API key with grace period
 * 
 * Body:
 * - gracePeriodHours: number (optional) - Hours old key remains valid, default: 48
 * 
 * Response:
 * - newKey: object - New key data with FULL KEY (shown once)
 * - oldKey: object - Old key info with grace period
 */
router.post(
  '/:id/rotate',
  keyManagementRateLimit,
  validate(RotateAPIKeySchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { gracePeriodHours = 48 } = req.validatedBody;

    // Validation handled by Zod middleware
    const apiKey = await ApiKey.findByPk(id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'API key not found',
        timestamp: new Date().toISOString()
      });
    }

    if (apiKey.status === 'revoked') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Operation',
        message: 'Cannot rotate revoked key',
        timestamp: new Date().toISOString()
      });
    }

    // Perform rotation
    const rotationResult = await apiKey.rotate(gracePeriodHours);

    logger.info(`API key rotated: ${apiKey.prefix} -> ${rotationResult.newKey.prefix} by ${req.apiKey?.prefix || 'system'}`);

    res.json({
      success: true,
      message: '⚠️ IMPORTANT: Save the new key securely. It will never be shown again!',
      data: rotationResult,
      timestamp: new Date().toISOString()
    });
  })
);

// ============================================================================
// KEY REVOCATION
// ============================================================================

/**
 * DELETE /api/keys/:id
 * Revoke an API key immediately (cannot be undone)
 */
router.delete(
  '/:id',
  keyManagementRateLimit,
  validate(RevokeAPIKeySchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    const apiKey = await ApiKey.findByPk(id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'API key not found',
        timestamp: new Date().toISOString()
      });
    }

    if (apiKey.status === 'revoked') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Operation',
        message: 'Key already revoked',
        timestamp: new Date().toISOString()
      });
    }

    // Revoke key (model handles self-revocation check)
    await apiKey.revoke(req.apiKey?.id);

    logger.warn(`API key revoked: ${apiKey.prefix} by ${req.apiKey?.prefix || 'system'}`);

    res.json({
      success: true,
      message: 'API key revoked successfully',
      data: {
        id: apiKey.id,
        prefix: apiKey.prefix,
        status: 'revoked',
        revokedAt: apiKey.revokedAt
      },
      timestamp: new Date().toISOString()
    });
  })
);

// ============================================================================
// AUDIT LOGS
// ============================================================================

/**
 * GET /api/keys/:id/logs
 * Get audit logs for a specific API key
 * 
 * Query params:
 * - eventType: string (optional) - Filter by event type
 * - limit: number (optional) - Results per page, default: 50
 * - offset: number (optional) - Pagination offset, default: 0
 */
router.get(
  '/:id/logs',
  keyViewRateLimit,
  validate(GetAPIKeyLogsSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { eventType, limit = 50, offset = 0 } = req.validatedQuery;

    // Verify key exists
    const apiKey = await ApiKey.findByPk(id);
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'API key not found',
        timestamp: new Date().toISOString()
      });
    }

    const where = { apiKeyId: id };
    if (eventType) {
      where.eventType = eventType;
    }

    const logs = await ApiKeyLog.findAll({
      where,
      limit: Math.min(parseInt(limit), 100),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    const total = await ApiKeyLog.count({ where });

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: total > parseInt(offset) + logs.length
        }
      },
      timestamp: new Date().toISOString()
    });
  })
);

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/keys/health
 * Database authentication health check
 */
router.get(
  '/health',
  keyViewRateLimit,
  asyncHandler(async (req, res) => {
    const activeKeys = await ApiKey.count({ where: { status: 'active' } });
    const expiredKeys = await ApiKey.count({ where: { status: 'expired' } });
    const revokedKeys = await ApiKey.count({ where: { status: 'revoked' } });
    const rotatingKeys = await ApiKey.count({ where: { status: 'rotating' } });

    res.json({
      success: true,
      data: {
        status: 'healthy',
        authMethod: 'database',
        hashAlgorithm: 'Argon2id',
        statistics: {
          active: activeKeys,
          rotating: rotatingKeys,
          expired: expiredKeys,
          revoked: revokedKeys,
          total: activeKeys + expiredKeys + revokedKeys + rotatingKeys
        }
      },
      timestamp: new Date().toISOString()
    });
  })
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;
