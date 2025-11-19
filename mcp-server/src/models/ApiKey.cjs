/**
 * ApiKey Model - Secure API Key Management
 * Implements Argon2id hashing, rotation, and audit logging
 */

const crypto = require('crypto');
const argon2 = require('argon2');

// ============================================================================
// CONSTANTS
// ============================================================================

// Cryptographic Constants
const KEY_SECRET_BYTES = 32;  // 256 bits for key secret
const PREFIX_RANDOM_BYTES = 4;  // 32 bits for prefix randomness

// Argon2id Parameters (OWASP compliant)
const ARGON2_MEMORY_COST = parseInt(process.env.ARGON2_MEMORY_COST) || 19456;  // 19 MiB
const ARGON2_TIME_COST = parseInt(process.env.ARGON2_TIME_COST) || 2;
const ARGON2_PARALLELISM = parseInt(process.env.ARGON2_PARALLELISM) || 1;

// Key Lifecycle Constants
const DEFAULT_EXPIRATION_DAYS = 90;
const DEFAULT_GRACE_PERIOD_HOURS = 48;

// Dummy hash for constant-time comparison (prevents timing attacks)
const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0ZHVtbXlzYWx0$dummyhashdummyhashdummyhashdummyhash';

module.exports = (sequelize, DataTypes) => {
  const ApiKey = sequelize.define('ApiKey', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Key Identification
    prefix: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
      comment: 'Public key prefix for lookup (e.g., sk_live_v2_abc123)'
    },

    keyHash: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'key_hash',
      comment: 'Argon2id hash of the secret portion'
    },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Human-readable key name/description'
    },

    // Versioning
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      comment: 'Key version for rotation tracking'
    },

    // Lifecycle
    status: {
      type: DataTypes.ENUM('active', 'rotating', 'expired', 'revoked'),
      defaultValue: 'active',
      allowNull: false
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
      comment: 'NULL = never expires'
    },

    lastRotatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_rotated_at',
      comment: 'Last rotation timestamp'
    },

    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'revoked_at',
      comment: 'Manual revocation timestamp'
    },

    // Grace period support
    gracePeriodEndsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'grace_period_ends_at',
      comment: 'Old key valid until this time'
    },

    // Ownership
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id'
    },

    // Usage tracking
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_used_at'
    },

    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'usage_count'
    },

    // Security
    ipWhitelist: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'ip_whitelist',
      comment: 'Array of allowed IPs (null = all IPs allowed)'
    },

    scopes: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false,
      comment: 'Permissions array: ["read:users", "write:products"]'
    }
  }, {
    tableName: 'api_keys',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['prefix'], unique: true },
      { fields: ['status'] },
      { fields: ['expires_at'] },
      { fields: ['user_id'] }
    ]
  });

  /**
   * Generate a new API key with Argon2id hashing
   * 
   * SECURITY: Wrapped in transaction to ensure atomicity of key creation and audit log.
   * If audit log fails, entire operation rolls back (no orphaned keys).
   * 
   * @param {string} name - Human-readable key name
   * @param {Array} scopes - Permission scopes
   * @param {number} expiresInDays - Days until expiration (null = never)
   * @param {UUID} userId - Optional user association
   * @returns {Object} { id, key (ONE TIME ONLY), prefix, expiresAt, scopes }
   */
  ApiKey.generateKey = async function(name, scopes = [], expiresInDays = DEFAULT_EXPIRATION_DAYS, userId = null) {
    // Generate cryptographically secure random key (outside transaction - no DB calls)
    const randomBytes = crypto.randomBytes(KEY_SECRET_BYTES); // 256 bits
    const keySecret = randomBytes.toString('base64url'); // URL-safe base64

    // Generate unique prefix (identifies key type and version)
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(PREFIX_RANDOM_BYTES).toString('hex');
    const prefix = `sk_live_v2_${timestamp}${random}`;

    // Complete key that user will receive (ONE TIME ONLY)
    const fullKey = `${prefix}.${keySecret}`;

    // Hash the secret portion with Argon2id (OWASP recommended)
    const keyHash = await argon2.hash(keySecret, {
      type: argon2.argon2id,
      memoryCost: ARGON2_MEMORY_COST,
      timeCost: ARGON2_TIME_COST,
      parallelism: ARGON2_PARALLELISM
    });

    // Calculate expiration
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // WRAP IN TRANSACTION: Ensures atomicity of key + audit log creation
    const result = await sequelize.transaction(async (t) => {
      // Create database record
      const apiKey = await ApiKey.create({
        prefix,
        keyHash,
        name,
        userId,
        scopes,
        expiresAt,
        status: 'active',
        version: 1
      }, { transaction: t });

      // Create audit log in same transaction
      const ApiKeyLog = sequelize.models.ApiKeyLog;
      await ApiKeyLog.create({
        apiKeyId: apiKey.id,
        eventType: 'created',
        ipAddress: null,
        userAgent: null,
        endpoint: null,
        statusCode: null,
        metadata: { scopes, expiresInDays }
      }, { transaction: t });

      return apiKey;
    });

    // Return full key (ONLY SHOWN ONCE!)
    return {
      id: result.id,
      key: fullKey,  // ⚠️ NEVER STORED! Show to user once!
      prefix: result.prefix,
      expiresAt: result.expiresAt,
      scopes: result.scopes
    };
  };

  /**
   * Verify a provided API key against stored hash
   * 
   * SECURITY: Uses constant-time comparison to prevent timing attacks.
   * ALWAYS performs Argon2 verification regardless of key validity to maintain
   * consistent response time (~800ms). This prevents attackers from enumerating
   * valid key prefixes via timing analysis.
   * 
   * @param {string} providedKey - Full key from request (prefix.secret)
   * @returns {boolean|ApiKey} ApiKey instance if valid, false otherwise
   */
  ApiKey.verifyKey = async function(providedKey) {
    // Extract prefix (public portion)
    const parts = providedKey.split('.');
    if (parts.length !== 2) {
      // Invalid format - perform dummy Argon2 verification to maintain constant time
      await argon2.verify(DUMMY_HASH, 'fake-secret');
      return false;
    }

    const [prefix, secret] = parts;

    // Look up key by prefix (indexed, fast)
    const apiKey = await ApiKey.findOne({
      where: { prefix }
    });

    // CRITICAL: ALWAYS perform hash verification (constant-time comparison)
    // Use dummy hash if key not found to prevent timing attacks
    const hashToVerify = apiKey ? apiKey.keyHash : DUMMY_HASH;
    const isValid = await argon2.verify(hashToVerify, secret);

    // NOW check other conditions (after constant-time operation)
    if (!apiKey || !isValid) {
      if (apiKey) {
        await apiKey.logEvent('used', null, { error: 'Invalid signature' });
      }
      return false;
    }

    // Check status
    if (apiKey.status === 'revoked') {
      await apiKey.logEvent('used', null, { error: 'Key revoked' });
      return false;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      // Auto-expire key
      await apiKey.update({ status: 'expired' });
      await apiKey.logEvent('expired', null);
      return false;
    }

    // Check if this is an old key in grace period
    if (apiKey.status === 'rotating') {
      if (apiKey.gracePeriodEndsAt && apiKey.gracePeriodEndsAt > new Date()) {
        // Still in grace period, allow usage
        await apiKey.logEvent('used', null, { warning: 'Grace period key' });
        // Continue to success path
      } else {
        await apiKey.logEvent('used', null, { error: 'Grace period expired' });
        return false;
      }
    }

    // Update usage tracking (atomic operation - Issue #4 fix)
    await apiKey.increment({
      usageCount: 1
    }, {
      lastUsedAt: new Date()
    });
    
    await apiKey.logEvent('used', null, { success: true });

    return apiKey;
  };

  /**
   * Rotate API key with grace period
   * 
   * SECURITY: Wrapped in transaction to ensure atomicity of:
   * - New key creation
   * - Old key status update
   * - Audit logs for both keys
   * 
   * If any step fails, entire rotation rolls back (no orphaned keys).
   * 
   * @param {number} gracePeriodHours - Hours old key remains valid (default: 48)
   * @returns {Object} { oldKey: { prefix, validUntil }, newKey: { id, key, ... } }
   */
  ApiKey.prototype.rotate = async function(gracePeriodHours = DEFAULT_GRACE_PERIOD_HOURS) {
    const gracePeriodEndsAt = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000);
    
    // Generate new key materials (outside transaction - no DB calls)
    const randomBytes = crypto.randomBytes(KEY_SECRET_BYTES);
    const keySecret = randomBytes.toString('base64url');
    
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(PREFIX_RANDOM_BYTES).toString('hex');
    const prefix = `sk_live_v2_${timestamp}${random}`;
    const fullKey = `${prefix}.${keySecret}`;
    
    // Hash the secret (outside transaction - CPU-intensive)
    const keyHash = await argon2.hash(keySecret, {
      type: argon2.argon2id,
      memoryCost: ARGON2_MEMORY_COST,
      timeCost: ARGON2_TIME_COST,
      parallelism: ARGON2_PARALLELISM
    });
    
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
    
    // WRAP ENTIRE ROTATION IN TRANSACTION
    const result = await sequelize.transaction(async (t) => {
      // 1. Create new key in transaction
      const newKey = await ApiKey.create({
        prefix,
        keyHash,
        name: this.name + ' (rotated)',
        userId: this.userId,
        scopes: this.scopes,
        expiresAt,
        status: 'active',
        version: this.version + 1
      }, { transaction: t });

      // 2. Update old key status in same transaction
      await this.update({
        status: 'rotating',
        gracePeriodEndsAt,
        lastRotatedAt: new Date()
      }, { transaction: t });

      // 3. Create audit logs for both keys in transaction
      const ApiKeyLog = sequelize.models.ApiKeyLog;
      
      await ApiKeyLog.create({
        apiKeyId: this.id,
        eventType: 'rotated',
        metadata: { newKeyId: newKey.id, gracePeriodHours }
      }, { transaction: t });
      
      await ApiKeyLog.create({
        apiKeyId: newKey.id,
        eventType: 'created',
        metadata: { rotatedFrom: this.id }
      }, { transaction: t });

      return { newKey, fullKey, gracePeriodEndsAt };
    });

    return {
      oldKey: {
        prefix: this.prefix,
        validUntil: result.gracePeriodEndsAt
      },
      newKey: {
        id: result.newKey.id,
        key: result.fullKey,  // ⚠️ ONLY SHOWN ONCE!
        prefix: result.newKey.prefix,
        expiresAt: result.newKey.expiresAt,
        scopes: result.newKey.scopes
      }
    };
  };

  /**
   * Revoke API key immediately
   * 
   * SECURITY: Prevents self-revocation to avoid accidental lockout.
   * 
   * @param {string} currentKeyId - ID of the key making this request (for self-revocation check)
   * @throws {Error} If attempting to revoke the current key
   */
  ApiKey.prototype.revoke = async function(currentKeyId = null) {
    // Prevent self-revocation
    if (currentKeyId && this.id === currentKeyId) {
      throw new Error('Cannot revoke the key used for this request. Use a different admin key.');
    }

    await this.update({
      status: 'revoked',
      revokedAt: new Date()
    });

    await this.logEvent('revoked', null);
  };

  /**
   * Log API key event to audit trail
   * @param {string} eventType - Event type (created, used, rotated, etc.)
   * @param {Object} req - Express request object (optional)
   * @param {Object} metadata - Additional context
   */
  ApiKey.prototype.logEvent = async function(eventType, req, metadata = {}) {
    const ApiKeyLog = sequelize.models.ApiKeyLog;

    await ApiKeyLog.create({
      apiKeyId: this.id,
      eventType,
      ipAddress: req ? (req.ip || req.connection?.remoteAddress) : null,
      userAgent: req ? req.headers['user-agent'] : null,
      endpoint: req ? req.path : null,
      statusCode: req ? req.statusCode : null,
      metadata
    });
  };

  return ApiKey;
};
