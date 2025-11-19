# Phase 7C: Fix Plan for BLOCKER and CRITICAL Issues

**Status:** In Progress
**Date:** January 10, 2025
**Estimated Total Time:** 10 hours
**Priority:** HIGH - Blocks Phase 7D implementation

---

## Executive Summary

Work-critic review identified **33 issues** (6 BLOCKERS, 16 CRITICAL, 11 MINOR) in Phase 7C implementation. This plan addresses all BLOCKER and CRITICAL issues before proceeding to Phase 7D (Lemlist implementation).

**Readiness Assessment:**
- Current: 4/10 - NOT READY FOR PHASE 7D
- Target: 9/10 - PRODUCTION READY
- Blockers: 6 → 0
- Critical: 16 → 0

---

## Fix Priority Order

### **Priority 1: Runtime Errors** (30 min)
These cause immediate crashes - fix first.

### **Priority 2: Database Integration** (2 hours)
Events cannot be persisted without these fixes.

### **Priority 3: Provider Infrastructure** (3 hours)
Core factory pattern issues blocking provider creation.

### **Priority 4: Error Handling** (1.5 hours)
Consistent error handling across all providers.

### **Priority 5: Security & Validation** (2 hours)
Security vulnerabilities and data validation issues.

### **Priority 6: Remaining Critical** (1 hour)
Documentation, optimization, and minor critical issues.

---

## BLOCKER Fixes (6 total)

### **BLOCKER #1: Runtime Error - EventNormalizer Typo**

**Issue:** Line 80 of EventNormalizer.js has typo: `raw Event.providerEventId`
**Impact:** ReferenceError on every webhook event
**Severity:** CRITICAL - Breaks all webhook processing
**File:** `src/providers/events/EventNormalizer.js:80`

**Current Code:**
```javascript
provider_event_id: raw Event.providerEventId,
```

**Fix:**
```javascript
provider_event_id: rawEvent.providerEventId,
```

**Testing:**
```javascript
// Test normalization doesn't throw
const rawEvent = {
  type: 'email.opened',
  providerEventId: 'evt_123',
  timestamp: new Date()
};
const normalized = EventNormalizer.normalize(rawEvent, 'lemlist', 'email');
assert(normalized.provider_event_id === 'evt_123');
```

**Time Estimate:** 5 minutes
**Dependencies:** None
**Priority:** 1

---

### **BLOCKER #2: JSDoc Typo - LinkedInProvider**

**Issue:** Line 147 has typo: `messagesT oday`
**Impact:** Breaks documentation generation, confusing autocomplete
**Severity:** HIGH - Blocks documentation
**File:** `src/providers/interfaces/LinkedInProvider.js:147`

**Current Code:**
```javascript
* @returns {number} rateLimit.messagesT oday - Messages sent today
```

**Fix:**
```javascript
* @returns {number} rateLimit.messagesToday - Messages sent today
```

**Testing:**
- Run JSDoc generation: `npm run docs`
- Verify no parsing errors
- Check IDE autocomplete works

**Time Estimate:** 2 minutes
**Dependencies:** None
**Priority:** 1

---

### **BLOCKER #3: LinkedIn Message Length Validation**

**Issue:** No validation for LinkedIn's 300-character connection message limit
**Impact:** Messages silently fail or get truncated by LinkedIn
**Severity:** HIGH - User frustration, failed campaigns
**File:** `src/providers/interfaces/LinkedInProvider.js`

**Fix:** Add validation method to interface
```javascript
/**
 * Validate connection request parameters
 * @param {Object} params - Connection request params
 * @throws {Error} If message exceeds 300 characters
 */
validateConnectionRequest(params) {
  if (!params.message) {
    throw new Error('Connection message is required');
  }

  if (params.message.length > 300) {
    throw new Error(
      `Connection message exceeds LinkedIn's 300 character limit (${params.message.length} characters)`
    );
  }

  if (params.message.trim().length === 0) {
    throw new Error('Connection message cannot be empty');
  }
}
```

**Integration:**
```javascript
async sendConnectionRequest(params) {
  // Validate before sending
  this.validateConnectionRequest(params);

  // Proceed with sending...
}
```

**Testing:**
```javascript
// Test validation
const provider = new LinkedInProvider();

// Should throw for long message
assert.throws(() => {
  provider.validateConnectionRequest({ message: 'a'.repeat(301) });
}, /300 character limit/);

// Should pass for valid message
provider.validateConnectionRequest({ message: 'Hi, let's connect!' });
```

**Time Estimate:** 15 minutes
**Dependencies:** None
**Priority:** 1

---

### **BLOCKER #4: Circular Import Dependencies**

**Issue:** ProviderFactory imports reference non-existent files
**Impact:** Runtime error when trying to create any provider
**Severity:** CRITICAL - Breaks all provider creation
**File:** `src/providers/ProviderFactory.js:31-54`

**Current Code:**
```javascript
this.emailProviders.set('lemlist', async () => {
  const { LemlistEmailProvider } = await import('./lemlist/LemlistEmailProvider.js');
  return new LemlistEmailProvider();
});
```

**Fix Option 1: Graceful Fallback (RECOMMENDED for Phase 7C)**
```javascript
registerProviders() {
  // Email Providers
  this.emailProviders.set('lemlist', async () => {
    try {
      const { LemlistEmailProvider } = await import('./lemlist/LemlistEmailProvider.js');
      return new LemlistEmailProvider();
    } catch (error) {
      throw new Error(
        `Lemlist email provider not yet implemented. ` +
        `This will be available in Phase 7D. Error: ${error.message}`
      );
    }
  });

  this.emailProviders.set('postmark', async () => {
    try {
      const { PostmarkEmailProvider } = await import('./postmark/PostmarkEmailProvider.js');
      return new PostmarkEmailProvider();
    } catch (error) {
      throw new Error(
        `Postmark email provider not yet implemented. ` +
        `This will be available in Phase 7E. Error: ${error.message}`
      );
    }
  });

  // Similar for LinkedIn and Video providers
}
```

**Fix Option 2: Stub Providers (For testing)**
Create stub implementations:
```javascript
// src/providers/lemlist/LemlistEmailProvider.js
import { EmailProvider } from '../interfaces/EmailProvider.js';

export class LemlistEmailProvider extends EmailProvider {
  get name() { return 'lemlist'; }

  async send(params) {
    throw new Error('Lemlist provider not yet implemented - Phase 7D');
  }

  // Stub all other methods...
}
```

**Recommendation:** Use Option 1 (graceful fallback) for Phase 7C, implement real providers in Phase 7D.

**Testing:**
```javascript
// Should fail gracefully
const factory = new ProviderFactory();
await assert.rejects(
  factory.createEmailProvider(),
  /not yet implemented/
);
```

**Time Estimate:** 30 minutes
**Dependencies:** None
**Priority:** 1

---

### **BLOCKER #5: Provider Instance Caching**

**Issue:** ProviderFactory creates new instance on every call
**Impact:** Multiple API connections, rate limit confusion, memory leak
**Severity:** HIGH - Blocks production use
**File:** `src/providers/ProviderFactory.js`

**Current Code:**
```javascript
async createEmailProvider() {
  const providerName = process.env.EMAIL_PROVIDER || 'lemlist';
  const providerFactory = this.emailProviders.get(providerName.toLowerCase());
  const provider = await providerFactory(); // NEW INSTANCE EVERY TIME
  await provider.validateConfig();
  return provider;
}
```

**Fix:**
```javascript
export class ProviderFactory {
  constructor() {
    this.emailProviders = new Map();
    this.linkedInProviders = new Map();
    this.videoProviders = new Map();

    // ADD: Instance cache
    this.cachedInstances = {
      email: null,
      linkedin: null,
      video: null
    };

    this.registerProviders();
  }

  async createEmailProvider() {
    // Check cache first
    if (this.cachedInstances.email) {
      logger.debug('Returning cached email provider instance');
      return this.cachedInstances.email;
    }

    const providerName = process.env.EMAIL_PROVIDER || 'lemlist';
    logger.info('Creating email provider', { provider: providerName });

    const providerFactory = this.emailProviders.get(providerName.toLowerCase());

    if (!providerFactory) {
      const available = Array.from(this.emailProviders.keys()).join(', ');
      throw new Error(
        `Email provider "${providerName}" not found. Available providers: ${available}`
      );
    }

    try {
      const provider = await providerFactory();
      await provider.validateConfig();

      // Cache the instance
      this.cachedInstances.email = provider;

      logger.info('Email provider created and cached', {
        provider: providerName,
        capabilities: provider.getCapabilities()
      });

      return provider;
    } catch (error) {
      logger.error('Failed to create email provider', {
        provider: providerName,
        error: error.message
      });
      throw error;
    }
  }

  // Similar for createLinkedInProvider() and createVideoProvider()

  /**
   * Clear provider cache
   * Useful for testing or when configuration changes
   */
  clearCache() {
    logger.info('Clearing provider instance cache');
    this.cachedInstances = {
      email: null,
      linkedin: null,
      video: null
    };
  }

  /**
   * Reload providers with new configuration
   * Clears cache and reloads config
   */
  async reload() {
    logger.info('Reloading provider factory');
    this.clearCache();

    // Reload provider config if it has a reload method
    if (global.providerConfig?.reload) {
      global.providerConfig.reload();
    }
  }
}
```

**Testing:**
```javascript
// Test caching works
const factory = new ProviderFactory();
const provider1 = await factory.createEmailProvider();
const provider2 = await factory.createEmailProvider();
assert(provider1 === provider2, 'Should return same instance');

// Test cache clearing
factory.clearCache();
const provider3 = await factory.createEmailProvider();
assert(provider3 !== provider1, 'Should create new instance after cache clear');
```

**Time Estimate:** 30 minutes
**Dependencies:** None
**Priority:** 1

---

### **BLOCKER #6: Missing enrollment_id Correlation**

**Issue:** EventNormalizer doesn't include enrollment_id - cannot associate webhooks with enrollments
**Impact:** Cannot track which contact triggered event
**Severity:** CRITICAL - Breaks campaign tracking
**File:** `src/providers/events/EventNormalizer.js`

**Root Cause Analysis:**
Webhooks arrive with `provider_message_id` but no enrollment context. Need reverse lookup:
```
provider_message_id (from webhook) → enrollment_id (database)
```

**Fix Part 1: Add lookup service**
```javascript
// src/services/ProviderMessageLookup.js
import { CampaignEnrollment } from '../models/CampaignEnrollment.cjs';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ProviderMessageLookup');

export class ProviderMessageLookup {
  /**
   * Find enrollment by provider message ID
   *
   * @param {string} providerMessageId - Provider's message/action ID
   * @param {string} channel - Channel type (email, linkedin)
   * @returns {Promise<Object|null>} Enrollment or null if not found
   */
  static async findEnrollmentByMessageId(providerMessageId, channel) {
    if (!providerMessageId) {
      return null;
    }

    try {
      const enrollment = await CampaignEnrollment.findOne({
        where: {
          provider_message_id: providerMessageId,
          channel: channel
        }
      });

      if (!enrollment) {
        logger.warn('No enrollment found for provider message ID', {
          providerMessageId,
          channel
        });
      }

      return enrollment;
    } catch (error) {
      logger.error('Error looking up enrollment', {
        providerMessageId,
        channel,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Update enrollment with provider message ID
   * Called when message is sent to store correlation
   *
   * @param {string} enrollmentId - Enrollment ID
   * @param {string} providerMessageId - Provider's message ID
   * @param {string} channel - Channel type
   */
  static async storeMessageId(enrollmentId, providerMessageId, channel) {
    try {
      await CampaignEnrollment.update(
        {
          provider_message_id: providerMessageId,
          channel: channel
        },
        {
          where: { id: enrollmentId }
        }
      );

      logger.info('Stored provider message ID', {
        enrollmentId,
        providerMessageId,
        channel
      });
    } catch (error) {
      logger.error('Error storing provider message ID', {
        enrollmentId,
        providerMessageId,
        error: error.message
      });
      throw error;
    }
  }
}
```

**Fix Part 2: Update EventNormalizer**
```javascript
static async normalize(rawEvent, provider, channel) {
  logger.debug('Normalizing event', { provider, channel, rawEvent });

  // Validate required fields
  this.validateRawEvent(rawEvent);

  // Look up enrollment by provider message ID
  const enrollment = await ProviderMessageLookup.findEnrollmentByMessageId(
    rawEvent.providerMessageId || rawEvent.providerActionId,
    channel
  );

  // Build normalized event
  const normalized = {
    // Core event fields
    event_type: this.normalizeEventType(rawEvent.type, channel),
    channel: this.normalizeChannel(channel),
    timestamp: this.normalizeTimestamp(rawEvent.timestamp),

    // Provider tracking
    provider: provider.toLowerCase(),
    provider_event_id: rawEvent.providerEventId,
    provider_message_id: rawEvent.providerMessageId || rawEvent.providerActionId || null,

    // ADD: Enrollment correlation
    enrollment_id: enrollment?.id || null,
    instance_id: enrollment?.instance_id || null,

    // Event data (provider-specific details)
    event_data: this.normalizeEventData(rawEvent.data, provider, channel),

    // Video-specific fields (if applicable)
    video_id: rawEvent.videoId || null,
    video_url: rawEvent.data?.videoUrl || null,
    video_status: rawEvent.data?.videoStatus || null,
    video_duration: rawEvent.data?.videoDuration || null
  };

  // Warn if enrollment not found
  if (!enrollment) {
    logger.warn('Event normalized without enrollment correlation', {
      provider,
      channel,
      providerMessageId: rawEvent.providerMessageId,
      eventType: normalized.event_type
    });
  }

  logger.debug('Event normalized', { normalized });

  return normalized;
}
```

**Fix Part 3: Update CampaignEnrollment model**
Add `provider_message_id` field if not exists:
```javascript
// In migration or model definition
provider_message_id: {
  type: DataTypes.STRING,
  allowNull: true,
  comment: 'Provider-specific message/action ID for webhook correlation'
},
channel: {
  type: DataTypes.ENUM('email', 'linkedin', 'sms', 'phone'),
  allowNull: false
}
```

**Testing:**
```javascript
// Test enrollment lookup
const enrollment = await CampaignEnrollment.create({
  instance_id: 'inst_123',
  contact_id: 'contact_123',
  provider_message_id: 'msg_456',
  channel: 'email'
});

const rawEvent = {
  type: 'email.opened',
  providerEventId: 'evt_789',
  providerMessageId: 'msg_456',
  timestamp: new Date()
};

const normalized = await EventNormalizer.normalize(rawEvent, 'lemlist', 'email');
assert(normalized.enrollment_id === enrollment.id);
assert(normalized.instance_id === 'inst_123');
```

**Time Estimate:** 1.5 hours
**Dependencies:** CampaignEnrollment model update
**Priority:** 2

---

## CRITICAL Fixes (16 total)

### **CRITICAL #1-10: Database Schema Alignment**

**Issue:** EventNormalizer output doesn't match CampaignEvent model
**Impact:** Events cannot be inserted into database
**Severity:** CRITICAL - Blocks all event tracking
**Files:**
- `src/providers/events/EventNormalizer.js`
- `src/models/CampaignEvent.cjs`

**Schema Mismatches:**
1. Missing `enrollment_id` (REQUIRED FK) - Fixed in BLOCKER #6
2. Missing `instance_id` (REQUIRED FK) - Fixed in BLOCKER #6
3. Wrong field: Uses `event_data` but model expects `metadata`
4. Missing `step_number` (optional but should include)
5. Field type mismatch: `video_id` vs `videoId`

**Fix:**
```javascript
static async normalize(rawEvent, provider, channel) {
  // ... (enrollment lookup from BLOCKER #6)

  // Build normalized event MATCHING CampaignEvent model
  const normalized = {
    // REQUIRED: Foreign keys
    enrollment_id: enrollment?.id || null,
    instance_id: enrollment?.instance_id || null,

    // REQUIRED: Event identification
    event_type: this.normalizeEventType(rawEvent.type, channel),
    channel: this.normalizeChannel(channel),
    timestamp: this.normalizeTimestamp(rawEvent.timestamp),

    // REQUIRED: Provider tracking
    provider: provider.toLowerCase(),
    provider_event_id: rawEvent.providerEventId,
    provider_message_id: rawEvent.providerMessageId || rawEvent.providerActionId || null,

    // OPTIONAL: Campaign context
    step_number: rawEvent.stepNumber || null,

    // REQUIRED: Event metadata (was event_data)
    metadata: this.normalizeEventData(rawEvent.data, provider, channel),

    // OPTIONAL: Video-specific fields
    video_id: rawEvent.videoId || null,
    video_url: rawEvent.data?.videoUrl || null,
    video_status: rawEvent.data?.videoStatus || null,
    video_duration: rawEvent.data?.videoDuration || null
  };

  logger.debug('Event normalized', { normalized });

  return normalized;
}
```

**Verify against CampaignEvent model:**
```javascript
// src/models/CampaignEvent.cjs
CampaignEvent.init({
  id: { type: DataTypes.UUID, primaryKey: true },

  // Foreign keys - MATCH ✓
  enrollment_id: { type: DataTypes.UUID, allowNull: false },
  instance_id: { type: DataTypes.UUID, allowNull: false },

  // Event fields - MATCH ✓
  event_type: { type: DataTypes.STRING, allowNull: false },
  channel: { type: DataTypes.ENUM('email', 'linkedin', 'sms', 'phone'), allowNull: false },
  timestamp: { type: DataTypes.DATE, allowNull: false },

  // Provider tracking - MATCH ✓
  provider: { type: DataTypes.STRING, allowNull: false },
  provider_event_id: { type: DataTypes.STRING, allowNull: false, unique: true },
  provider_message_id: { type: DataTypes.STRING, allowNull: true },

  // Campaign context - MATCH ✓
  step_number: { type: DataTypes.INTEGER, allowNull: true },

  // Event data - MATCH ✓ (renamed from event_data to metadata)
  metadata: { type: DataTypes.JSONB, allowNull: true },

  // Video fields - MATCH ✓
  video_id: { type: DataTypes.STRING, allowNull: true },
  video_url: { type: DataTypes.STRING, allowNull: true },
  video_status: { type: DataTypes.STRING, allowNull: true },
  video_duration: { type: DataTypes.INTEGER, allowNull: true }
});
```

**Testing:**
```javascript
// Test database insertion
const rawEvent = {
  type: 'email.opened',
  providerEventId: 'evt_unique_123',
  providerMessageId: 'msg_456',
  timestamp: new Date(),
  data: { userAgent: 'Mozilla/5.0' }
};

const normalized = await EventNormalizer.normalize(rawEvent, 'lemlist', 'email');

// Should insert successfully
const event = await CampaignEvent.create(normalized);
assert(event.id);
assert(event.metadata.userAgent === 'Mozilla/5.0');
```

**Time Estimate:** 30 minutes
**Dependencies:** BLOCKER #6 (enrollment_id)
**Priority:** 2

---

### **CRITICAL #11: Add video Channel to Database**

**Issue:** campaign_events.channel enum only allows 'email', 'linkedin', 'sms', 'phone' - no 'video'
**Impact:** Cannot insert video events
**Severity:** HIGH - Blocks HeyGen integration
**Files:**
- `src/db/migrations/XXX_add_video_channel.sql`
- `src/models/CampaignEvent.cjs`

**Fix: Create migration**
```sql
-- src/db/migrations/004_add_video_channel.sql
BEGIN;

-- Add 'video' to channel enum
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'video';

-- Update CampaignEvent table comment
COMMENT ON COLUMN campaign_events.channel IS
  'Communication channel: email, linkedin, sms, phone, video';

COMMIT;
```

**Fix: Update model**
```javascript
// src/models/CampaignEvent.cjs
channel: {
  type: DataTypes.ENUM('email', 'linkedin', 'sms', 'phone', 'video'),
  allowNull: false,
  comment: 'Communication channel'
}
```

**Testing:**
```bash
# Run migration
npm run migrate

# Test video event insertion
```

```javascript
const videoEvent = await CampaignEvent.create({
  enrollment_id: enrollment.id,
  instance_id: enrollment.instance_id,
  event_type: 'video_generated',
  channel: 'video', // Should work now
  timestamp: new Date(),
  provider: 'heygen',
  provider_event_id: 'evt_video_123',
  metadata: {}
});
```

**Time Estimate:** 15 minutes
**Dependencies:** None
**Priority:** 2

---

### **CRITICAL #12-15: Error Class Hierarchy**

**Issue:** No standardized error classes - inconsistent error handling
**Impact:** Hard to debug, catch, and handle provider errors
**Severity:** MEDIUM - Reduces code quality
**File:** `src/providers/errors/ProviderErrors.js` (NEW)

**Fix: Create error hierarchy**
```javascript
/**
 * Provider Error Classes
 * Standardized error hierarchy for all provider operations
 */

/**
 * Base error for all provider errors
 */
export class ProviderError extends Error {
  constructor(message, provider, originalError = null) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
    this.originalError = originalError;
    this.timestamp = new Date();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      provider: this.provider,
      timestamp: this.timestamp,
      stack: this.stack,
      originalError: this.originalError?.message
    };
  }
}

/**
 * Configuration error - invalid API keys, missing config
 */
export class ProviderConfigError extends ProviderError {
  constructor(message, provider, missingConfig = []) {
    super(message, provider);
    this.name = 'ProviderConfigError';
    this.missingConfig = missingConfig;
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends ProviderError {
  constructor(message, provider, limit, resetAt) {
    super(message, provider);
    this.name = 'RateLimitError';
    this.limit = limit;
    this.resetAt = resetAt;
  }
}

/**
 * Webhook verification failed
 */
export class WebhookVerificationError extends ProviderError {
  constructor(message, provider) {
    super(message, provider);
    this.name = 'WebhookVerificationError';
  }
}

/**
 * API request failed
 */
export class ProviderApiError extends ProviderError {
  constructor(message, provider, statusCode, responseBody) {
    super(message, provider);
    this.name = 'ProviderApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/**
 * Validation error - invalid input parameters
 */
export class ProviderValidationError extends ProviderError {
  constructor(message, provider, validationErrors = []) {
    super(message, provider);
    this.name = 'ProviderValidationError';
    this.validationErrors = validationErrors;
  }
}

/**
 * Quota exceeded error - video credits, email quota, etc.
 */
export class QuotaExceededError extends ProviderError {
  constructor(message, provider, quotaType, remaining, total) {
    super(message, provider);
    this.name = 'QuotaExceededError';
    this.quotaType = quotaType;
    this.remaining = remaining;
    this.total = total;
  }
}

/**
 * Timeout error - operation took too long
 */
export class ProviderTimeoutError extends ProviderError {
  constructor(message, provider, timeoutMs) {
    super(message, provider);
    this.name = 'ProviderTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}
```

**Usage in providers:**
```javascript
import {
  ProviderConfigError,
  RateLimitError,
  WebhookVerificationError
} from '../errors/ProviderErrors.js';

async validateConfig() {
  if (!this.apiKey) {
    throw new ProviderConfigError(
      'Lemlist API key not configured',
      'lemlist',
      ['LEMLIST_API_KEY']
    );
  }
}

async send(params) {
  const rateLimit = await this.getRateLimitStatus();
  if (rateLimit.remaining === 0) {
    throw new RateLimitError(
      'Daily email limit exceeded',
      'lemlist',
      rateLimit.limit,
      rateLimit.resetsAt
    );
  }
}
```

**Testing:**
```javascript
// Test error hierarchy
try {
  await provider.validateConfig();
} catch (error) {
  if (error instanceof ProviderConfigError) {
    console.log('Missing config:', error.missingConfig);
  } else if (error instanceof ProviderError) {
    console.log('Provider error:', error.provider);
  }
}
```

**Time Estimate:** 45 minutes
**Dependencies:** None
**Priority:** 4

---

### **CRITICAL #16: Webhook Signature Utilities**

**Issue:** No common utilities for HMAC-SHA256 verification
**Impact:** Each provider reimplements same logic
**Severity:** MEDIUM - Code duplication, security risk
**File:** `src/providers/utils/WebhookSignature.js` (NEW)

**Fix:**
```javascript
/**
 * Webhook Signature Utilities
 * Common utilities for HMAC-SHA256 webhook verification
 */

import crypto from 'crypto';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('WebhookSignature');

export class WebhookSignature {
  /**
   * Compute HMAC-SHA256 signature
   *
   * @param {string|Buffer} payload - Webhook payload
   * @param {string} secret - Webhook secret
   * @returns {string} Hex-encoded signature
   */
  static computeSignature(payload, secret) {
    const payloadString = typeof payload === 'string'
      ? payload
      : JSON.stringify(payload);

    return crypto
      .createHmac('sha256', secret)
      .update(payloadString, 'utf8')
      .digest('hex');
  }

  /**
   * Verify webhook signature with timing-safe comparison
   *
   * @param {string} receivedSignature - Signature from webhook header
   * @param {string|Buffer} payload - Webhook payload
   * @param {string} secret - Webhook secret
   * @returns {boolean} True if signature valid
   */
  static verify(receivedSignature, payload, secret) {
    if (!receivedSignature || !secret) {
      logger.warn('Missing signature or secret for verification');
      return false;
    }

    const expectedSignature = this.computeSignature(payload, secret);

    // Timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      // Buffer lengths don't match or invalid hex
      logger.warn('Signature verification failed', {
        error: error.message,
        receivedLength: receivedSignature.length,
        expectedLength: expectedSignature.length
      });
      return false;
    }
  }

  /**
   * Extract signature from header (common patterns)
   *
   * @param {Object} headers - HTTP headers object
   * @param {string} headerName - Header name (e.g., 'x-lemlist-signature')
   * @returns {string|null} Extracted signature or null
   */
  static extractSignature(headers, headerName) {
    // Try exact header name
    let signature = headers[headerName];

    if (!signature) {
      // Try lowercase
      signature = headers[headerName.toLowerCase()];
    }

    if (!signature) {
      logger.warn('Signature header not found', { headerName, headers: Object.keys(headers) });
      return null;
    }

    // Some providers prefix with "sha256=" or similar
    const prefixMatch = signature.match(/^sha256=(.+)$/);
    if (prefixMatch) {
      return prefixMatch[1];
    }

    return signature;
  }

  /**
   * Verify webhook from Express request
   *
   * @param {Object} req - Express request object
   * @param {string} secret - Webhook secret
   * @param {string} signatureHeader - Header containing signature
   * @returns {boolean} True if valid
   */
  static verifyRequest(req, secret, signatureHeader = 'x-signature') {
    const signature = this.extractSignature(req.headers, signatureHeader);

    if (!signature) {
      return false;
    }

    // Use raw body for verification (must be buffered by middleware)
    const payload = req.rawBody || JSON.stringify(req.body);

    return this.verify(signature, payload, secret);
  }
}
```

**Usage in providers:**
```javascript
import { WebhookSignature } from '../utils/WebhookSignature.js';

verifyWebhookSignature(req, secret) {
  return WebhookSignature.verifyRequest(req, secret, 'x-lemlist-signature');
}
```

**Testing:**
```javascript
// Test signature computation
const payload = { event: 'email.opened' };
const secret = 'test_secret';

const signature = WebhookSignature.computeSignature(payload, secret);
assert(WebhookSignature.verify(signature, payload, secret));

// Test invalid signature
assert(!WebhookSignature.verify('invalid', payload, secret));

// Test timing attack resistance
const validSignature = WebhookSignature.computeSignature(payload, secret);
const almostValid = validSignature.slice(0, -2) + '00';
assert(!WebhookSignature.verify(almostValid, payload, secret));
```

**Time Estimate:** 30 minutes
**Dependencies:** None
**Priority:** 5

---

### **CRITICAL #17: Video Download Security**

**Issue:** VideoProvider.downloadVideo() has no URL/path validation
**Impact:** Path traversal attack, SSRF vulnerability
**Severity:** HIGH - Security vulnerability
**File:** `src/providers/interfaces/VideoProvider.js`

**Fix: Add validation**
```javascript
/**
 * Download video file
 *
 * @param {string} videoUrl - Video URL from getVideoStatus()
 * @param {string} destinationPath - Local path to save video
 * @returns {Promise<string>} Path to downloaded video file
 * @throws {Error} If download fails or validation fails
 */
async downloadVideo(videoUrl, destinationPath) {
  // Validate URL
  this.validateVideoUrl(videoUrl);

  // Validate destination path
  this.validateDestinationPath(destinationPath);

  // Proceed with download...
  throw new Error('VideoProvider.downloadVideo() must be implemented');
}

/**
 * Validate video URL is from trusted source
 * @private
 */
validateVideoUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid video URL: must be a non-empty string');
  }

  // Parse URL
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    throw new Error(`Invalid video URL format: ${url}`);
  }

  // Only allow HTTPS
  if (parsedUrl.protocol !== 'https:') {
    throw new Error(`Invalid video URL protocol: must be HTTPS (got ${parsedUrl.protocol})`);
  }

  // Whitelist allowed domains (provider-specific)
  const allowedDomains = this.getAllowedVideoDomains();
  const hostname = parsedUrl.hostname.toLowerCase();

  const isAllowed = allowedDomains.some(domain => {
    return hostname === domain || hostname.endsWith(`.${domain}`);
  });

  if (!isAllowed) {
    throw new Error(
      `Video URL domain not allowed: ${hostname}. ` +
      `Allowed domains: ${allowedDomains.join(', ')}`
    );
  }
}

/**
 * Get allowed video domains for this provider
 * @protected
 */
getAllowedVideoDomains() {
  // Override in subclass
  return [];
}

/**
 * Validate destination path prevents path traversal
 * @private
 */
validateDestinationPath(path) {
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid destination path: must be a non-empty string');
  }

  // Check for path traversal attempts
  const normalized = require('path').normalize(path);
  if (normalized.includes('..')) {
    throw new Error(`Path traversal detected in destination path: ${path}`);
  }

  // Ensure path is within allowed directory
  const allowedDir = process.env.VIDEO_DOWNLOAD_DIR || '/tmp/videos';
  const absolutePath = require('path').resolve(normalized);
  const allowedAbsolute = require('path').resolve(allowedDir);

  if (!absolutePath.startsWith(allowedAbsolute)) {
    throw new Error(
      `Destination path must be within ${allowedDir}: ${path}`
    );
  }

  // Check file extension is allowed
  const ext = require('path').extname(normalized).toLowerCase();
  const allowedExtensions = ['.mp4', '.webm', '.mov'];

  if (!allowedExtensions.includes(ext)) {
    throw new Error(
      `Invalid file extension: ${ext}. ` +
      `Allowed: ${allowedExtensions.join(', ')}`
    );
  }
}
```

**Testing:**
```javascript
// Test URL validation
const provider = new VideoProvider();

// Should reject HTTP
assert.throws(() => {
  provider.validateVideoUrl('http://example.com/video.mp4');
}, /must be HTTPS/);

// Should reject unauthorized domain
assert.throws(() => {
  provider.validateVideoUrl('https://evil.com/video.mp4');
}, /domain not allowed/);

// Test path validation
assert.throws(() => {
  provider.validateDestinationPath('../../../etc/passwd');
}, /Path traversal detected/);

assert.throws(() => {
  provider.validateDestinationPath('/var/log/video.mp4');
}, /must be within/);
```

**Time Estimate:** 45 minutes
**Dependencies:** None
**Priority:** 5

---

### **CRITICAL #18-22: Remaining Critical Issues**

**Quick fixes for remaining critical issues:**

**#18: Add rate limiting interface to EmailProvider**
```javascript
async getRateLimitStatus() {
  return {
    dailyLimit: null, // No limit by default
    dailySent: 0,
    remaining: null,
    resetsAt: null
  };
}
```
**Time:** 10 minutes

**#19: Add provider health check**
```javascript
async healthCheck() {
  try {
    await this.validateConfig();
    // Provider-specific health check (e.g., ping API)
    return { healthy: true, provider: this.name };
  } catch (error) {
    return { healthy: false, provider: this.name, error: error.message };
  }
}
```
**Time:** 15 minutes

**#20: Fix validateAllProviders() optimization**
```javascript
async validateAllProviders() {
  const errors = [];
  const validations = [];

  // Just validate config, don't create instances
  const emailProvider = process.env.EMAIL_PROVIDER || 'lemlist';
  const linkedinProvider = process.env.LINKEDIN_PROVIDER || 'lemlist';
  const videoProvider = process.env.VIDEO_PROVIDER || 'heygen';

  // Use providerConfig to validate
  if (!providerConfig.getProviderApiKey(emailProvider)) {
    errors.push(`Email provider ${emailProvider}: API key not configured`);
  }

  // Similar for other providers...

  return { valid: errors.length === 0, errors };
}
```
**Time:** 20 minutes

**#21: Complete batch send return structure**
```javascript
/**
 * @returns {Promise<Object>} Batch send results
 * @returns {number} result.sent - Number successfully sent
 * @returns {number} result.failed - Number that failed
 * @returns {Array<Object>} result.results - Individual results
 * @returns {string} result.results[].email - Email address
 * @returns {boolean} result.results[].success - Success status
 * @returns {string} result.results[].providerMessageId - Message ID (if success)
 * @returns {string} result.results[].error - Error message (if failed)
 */
```
**Time:** 5 minutes

**#22: Add video generation timeout specification**
```javascript
getCapabilities() {
  return {
    // ... other capabilities
    maxGenerationTimeMs: 300000, // 5 minutes max
    supportsWebhooks: true, // Recommended over polling
    pollingIntervalMs: 5000 // Poll every 5 seconds
  };
}
```
**Time:** 5 minutes

---

## Implementation Order

```
Phase 1: Runtime Errors (30 min)
├── Fix EventNormalizer typo (BLOCKER #1)
├── Fix LinkedInProvider JSDoc typo (BLOCKER #2)
└── Add connection message validation (BLOCKER #3)

Phase 2: Database Integration (2 hours)
├── Add provider message lookup service (BLOCKER #6)
├── Update EventNormalizer with enrollment_id (BLOCKER #6)
├── Align EventNormalizer output with model (CRITICAL #1-10)
└── Add video channel migration (CRITICAL #11)

Phase 3: Provider Infrastructure (3 hours)
├── Add graceful import fallbacks (BLOCKER #4)
├── Implement provider instance caching (BLOCKER #5)
└── Create error class hierarchy (CRITICAL #12-15)

Phase 4: Security & Validation (2 hours)
├── Create webhook signature utilities (CRITICAL #16)
├── Add video download security (CRITICAL #17)
└── Add rate limiting interfaces

Phase 5: Remaining Critical (1 hour)
├── Add health check methods
├── Fix validateAllProviders optimization
├── Complete documentation gaps
└── Add timeout specifications
```

---

## Testing Strategy

### **Unit Tests**
```bash
# Test each fix individually
npm test -- EventNormalizer.test.js
npm test -- ProviderFactory.test.js
npm test -- WebhookSignature.test.js
```

### **Integration Tests**
```bash
# Test database integration
npm test -- integration/event-normalization.test.js

# Test provider creation
npm test -- integration/provider-factory.test.js
```

### **Manual Testing**
```bash
# Test webhook signature verification
curl -X POST http://localhost:3000/api/campaigns/events/webhook/lemlist \
  -H "x-lemlist-signature: computed_signature" \
  -d '{"event": "email.opened"}'

# Test provider factory
node -e "
  import { providerFactory } from './src/providers/ProviderFactory.js';
  const provider = await providerFactory.createEmailProvider();
  console.log(provider.name);
"
```

---

## Success Criteria

- [ ] All 6 BLOCKER issues resolved
- [ ] All 16 CRITICAL issues resolved
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] No runtime errors on server start
- [ ] Webhook events can be persisted to database
- [ ] Provider factory creates and caches instances
- [ ] Error handling is consistent across providers
- [ ] Security validations in place
- [ ] Ready for Phase 7D (Lemlist implementation)

---

## Rollback Plan

If fixes introduce regressions:

1. **Git checkpoint before fixes:**
   ```bash
   git add .
   git commit -m "Phase 7C: Before BLOCKER/CRITICAL fixes"
   git tag phase-7c-pre-fixes
   ```

2. **Rollback if needed:**
   ```bash
   git reset --hard phase-7c-pre-fixes
   ```

3. **Selective rollback:**
   ```bash
   git checkout phase-7c-pre-fixes -- src/providers/events/EventNormalizer.js
   ```

---

## Next Steps After Fixes

Once all BLOCKER and CRITICAL issues are resolved:

1. **Re-run work-critic** to verify fixes
2. **Update readiness score** (target: 9/10)
3. **Proceed to Phase 7D:** Lemlist provider implementation
4. **Create integration tests** for Lemlist
5. **Deploy to staging** for real-world testing

---

**Estimated Total Time:** 10 hours
**Start Date:** January 10, 2025
**Target Completion:** January 11, 2025

**Made with care for the RTGS Team**
