# Phase 2A: Security Implementation Guide

**Date:** 2025-11-07
**Status:** 🚧 In Progress (1 of 11 complete)
**Estimated Total Time:** 21 hours

---

## Progress Tracker

✅ **Completed (1/11):**
1. ✅ CORS Configuration Fixed (30 min)

⏳ **In Progress:**
2. Input Validation with Zod

🔲 **Pending (9):**
3. Security Headers (Helmet.js)
4. API Authentication
5. Rate Limiting
6. Log Sanitization
7. SQL Injection Fix
8. File Permissions
9. HTTPS Enable
10. Prototype Pollution Protection
11. API Key Rotation

---

## 1. ✅ CORS Configuration Fixed

**Status:** COMPLETE
**File:** `mcp-server/src/api-server.js` (lines 121-145)
**Time Spent:** 30 minutes

### What Was Fixed:
- Removed wildcard `Access-Control-Allow-Origin: *`
- Added environment-based origin whitelist
- Defaults to `http://localhost:3000,http://localhost:3456`
- Production requires explicit `ALLOWED_ORIGINS` environment variable
- Development mode allows localhost variations
- Added `OPTIONS` preflight handling

### Configuration:
```bash
# .env
ALLOWED_ORIGINS=https://app.yourdomain.com,https://dashboard.yourdomain.com
```

### Test:
```bash
# Should succeed
curl -H "Origin: http://localhost:3000" http://localhost:3456/health

# Should fail in production (no CORS header)
curl -H "Origin: https://evil.com" http://localhost:3456/health
```

---

## 2. ⏳ Input Validation with Zod

**Status:** IN PROGRESS
**Priority:** CRITICAL
**Estimated Time:** 4 hours

### Implementation Plan:

#### Step 1: Create Validation Schemas (`mcp-server/src/utils/validation-schemas.js`)

```javascript
import { z } from 'zod';

// Base schemas
export const EmailSchema = z.string().email().max(254);
export const DomainSchema = z.string().regex(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i).max(253);
export const UUIDSchema = z.string().uuid();

// Discovery endpoint
export const DiscoverByICPSchema = z.object({
  query: z.string().min(1).max(500).optional(),
  icpProfileName: z.string().regex(/^icp_[a-z0-9_]+$/).optional(),
  count: z.number().int().min(1).max(1000).default(50),
  minScore: z.number().min(0).max(1).default(0.75),
  geography: z.string().max(100).optional(),
  excludeExisting: z.boolean().default(true),
});

// Enrichment endpoint
export const EnrichContactsSchema = z.object({
  contacts: z.array(z.object({
    email: EmailSchema,
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    companyDomain: DomainSchema.optional(),
  })).min(1).max(100),
  sources: z.array(z.enum(['explorium', 'apollo'])).optional(),
  cacheEnabled: z.boolean().default(true),
  minQuality: z.number().min(0).max(1).default(0.7),
});

// CRM Sync endpoint
export const SyncToHubSpotSchema = z.object({
  contacts: z.array(z.object({
    email: EmailSchema,
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    // ... full schema
  })).min(1).max(100),
  deduplicate: z.boolean().default(true),
  updateIfExists: z.boolean().default(true),
  associateCompany: z.boolean().default(true),
});

// Outreach endpoint
export const EnrollInCampaignSchema = z.object({
  contacts: z.array(z.object({
    email: EmailSchema,
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
  })).min(1).max(100),
  campaignId: z.string().min(1).max(100),
  variables: z.record(z.string()).optional(),
});

// Job queries
export const GetJobsSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  type: z.string().max(50).optional(),
  limit: z.number().int().min(1).max(1000).default(100),
});

export const GetJobByIdSchema = z.object({
  jobId: z.string().regex(/^job_[0-9]+_[a-z0-9]+$/),
});
```

#### Step 2: Create Validation Middleware (`mcp-server/src/middleware/validate.js`)

```javascript
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Validate body, query, and params
      const data = {
        ...req.body,
        ...req.query,
        ...req.params,
      };

      const validated = schema.parse(data);

      // Replace request data with validated data
      req.validatedData = validated;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        });
      }

      next(error);
    }
  };
};
```

#### Step 3: Apply to All Routes

```javascript
// In api-server.js
import { validate } from './middleware/validate.js';
import {
  DiscoverByICPSchema,
  EnrichContactsSchema,
  SyncToHubSpotSchema,
  EnrollInCampaignSchema,
  GetJobsSchema,
  GetJobByIdSchema,
} from './utils/validation-schemas.js';

// Discovery endpoint
this.app.post('/api/discover', validate(DiscoverByICPSchema), async (req, res) => {
  const params = req.validatedData; // Pre-validated, safe to use
  // ...
});

// Enrichment endpoint
this.app.post('/api/enrich', validate(EnrichContactsSchema), async (req, res) => {
  const params = req.validatedData;
  // ...
});

// And so on for all endpoints...
```

---

## 3. 🔲 Security Headers (Helmet.js)

**Status:** PENDING
**Priority:** HIGH
**Estimated Time:** 1 hour

### Implementation:

```javascript
// In api-server.js setupMiddleware()
import helmet from 'helmet';

setupMiddleware() {
  // Add Helmet FIRST (before other middleware)
  this.app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // For dashboard
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'no-referrer' },
  }));

  // Size limits (prevent DoS)
  this.app.use(express.json({ limit: '1mb' }));
  this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ... rest of middleware
}
```

---

## 4. 🔲 API Authentication

**Status:** PENDING
**Priority:** CRITICAL
**Estimated Time:** 4 hours

### Option A: Simple API Keys (Recommended for MVP)

```javascript
// Create middleware/auth.js
export const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      message: 'Include Authorization header with Bearer token',
    });
  }

  const validKeys = (process.env.API_KEYS || '').split(',').filter(Boolean);

  if (!validKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
    });
  }

  // Optionally track API key usage
  req.apiKey = apiKey;

  next();
};

// Apply to protected routes
this.app.use('/api', authenticateAPIKey);

// Exempt health check
this.app.get('/health', (req, res) => { /* ... */ });
```

### Configuration:
```bash
# .env
API_KEYS=sk-live-abc123xyz789,sk-test-def456uvw012
```

### Option B: JWT Tokens (For Production)

*Implementation details available if needed*

---

## 5. 🔲 Rate Limiting

**Status:** PENDING
**Priority:** HIGH
**Estimated Time:** 2 hours

### Implementation:

```javascript
import rateLimit from 'express-rate-limit';

setupMiddleware() {
  // Global rate limit (all requests)
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  this.app.use(globalLimiter);

  // Strict limit for expensive operations
  const strictLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    skipSuccessfulRequests: false,
  });

  // Apply to expensive endpoints
  this.app.post('/api/discover', strictLimiter, async (req, res) => { /* ... */ });
  this.app.post('/api/enrich', strictLimiter, async (req, res) => { /* ... */ });
  this.app.post('/api/outreach', strictLimiter, async (req, res) => { /* ... */ });

  // Looser limit for read operations
  const readLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
  });
  this.app.get('/api/jobs', readLimiter, async (req, res) => { /* ... */ });
}
```

---

## 6. 🔲 Log Sanitization

**Status:** PENDING
**Priority:** HIGH
**Estimated Time:** 2 hours

### Implementation:

```javascript
// Create utils/logger.js
class Logger {
  static sanitize(message) {
    let sanitized = String(message);

    // Redact API keys (32+ character hex strings)
    sanitized = sanitized.replace(/[a-f0-9]{32,}/gi, '[REDACTED_KEY]');

    // Redact emails
    sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/gi, '[REDACTED_EMAIL]');

    // Redact auth tokens
    sanitized = sanitized.replace(/Bearer\s+[\w.-]+/gi, 'Bearer [REDACTED]');

    // Redact credit card numbers
    sanitized = sanitized.replace(/\b\d{13,19}\b/g, '[REDACTED_CC]');

    // Redact SSNs
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');

    return sanitized;
  }

  static log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const sanitizedMessage = Logger.sanitize(message);
    const sanitizedMetadata = JSON.parse(Logger.sanitize(JSON.stringify(metadata)));

    console.log(`[${timestamp}] [${level.toUpperCase()}] ${sanitizedMessage}`, sanitizedMetadata);
  }

  static info(message, metadata) {
    Logger.log('info', message, metadata);
  }

  static warn(message, metadata) {
    Logger.log('warn', message, metadata);
  }

  static error(message, metadata) {
    Logger.log('error', message, metadata);
  }
}

export default Logger;

// Usage throughout codebase:
// Replace: console.log('Processing contact: john@example.com');
// With: Logger.info('Processing contact', { count: 1 }); // No PII
```

---

## 7. 🔲 SQL Injection Fix

**Status:** PENDING
**Priority:** HIGH
**Estimated Time:** 2 hours

### Fix in database.js (lines 186-195):

```javascript
updateJobStatus(id, status, result = null, error = null) {
  const now = Date.now();
  const updates = { status, updated_at: now };

  if (status === 'processing') {
    updates.started_at = now;
  }

  if (status === 'completed' || status === 'failed') {
    updates.completed_at = now;
  }

  if (result !== null) {
    updates.result = JSON.stringify(result);
  }

  if (error !== null) {
    updates.error = error;
  }

  // WHITELIST allowed fields (prevent injection)
  const ALLOWED_FIELDS = ['status', 'updated_at', 'started_at', 'completed_at', 'result', 'error', 'progress'];

  // Filter out any keys not in whitelist
  const safeUpdates = {};
  for (const [key, value] of Object.entries(updates)) {
    if (ALLOWED_FIELDS.includes(key)) {
      safeUpdates[key] = value;
    } else {
      console.warn(`[Database] Attempted to update disallowed field: ${key}`);
    }
  }

  const fields = Object.keys(safeUpdates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(safeUpdates);

  const stmt = this.db.prepare(`UPDATE jobs SET ${fields} WHERE id = ?`);
  stmt.run(...values, id);
}
```

---

## 8. 🔲 File Permissions

**Status:** PENDING
**Priority:** MEDIUM
**Estimated Time:** 30 minutes

### Fix:

```bash
# Set restrictive permissions on .env
chmod 600 /home/omar/claude\ -\ sales_auto_skill/.env

# Verify
ls -la /home/omar/claude\ -\ sales_auto_skill/.env
# Should show: -rw------- (600)
```

### Add to deployment script:

```bash
#!/bin/bash
# deploy.sh or startup.sh

set -e

# Check .env permissions
if [ -f .env ]; then
  PERMS=$(stat -c "%a" .env)
  if [ "$PERMS" != "600" ]; then
    echo "ERROR: .env must have 600 permissions (currently $PERMS)"
    echo "Run: chmod 600 .env"
    exit 1
  fi
  echo "✓ .env permissions OK"
fi

npm start
```

---

## 9. 🔲 HTTPS Enable

**Status:** PENDING
**Priority:** MEDIUM (for production)
**Estimated Time:** 2 hours

### Implementation:

```javascript
// In api-server.js constructor
import https from 'https';
import fs from 'fs';

constructor(options = {}) {
  this.app = express();
  this.port = options.port || parseInt(process.env.PORT || '3000');

  // Use HTTPS in production
  if (process.env.NODE_ENV === 'production' && process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
    const httpsOptions = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    };
    this.server = https.createServer(httpsOptions, this.app);
    console.log('🔒 HTTPS enabled');
  } else {
    this.server = createServer(this.app);
    console.log('⚠️  HTTP mode (development)');
  }

  // ... rest of initialization
}

// Redirect HTTP to HTTPS in production
setupMiddleware() {
  if (process.env.NODE_ENV === 'production') {
    this.app.use((req, res, next) => {
      if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });
  }

  // ... rest of middleware
}
```

### Configuration:
```bash
# .env (production)
NODE_ENV=production
SSL_KEY_PATH=/etc/ssl/private/server.key
SSL_CERT_PATH=/etc/ssl/certs/server.crt
```

### Getting SSL Certificate (Let's Encrypt):
```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d api.yourdomain.com

# Certificate files will be at:
# /etc/letsencrypt/live/api.yourdomain.com/privkey.pem
# /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem
```

---

## 10. 🔲 Prototype Pollution Protection

**Status:** PENDING
**Priority:** HIGH
**Estimated Time:** 1 hour

### Implementation:

```javascript
// Create middleware/anti-pollution.js
export const preventPrototypePollution = (req, res, next) => {
  const checkObject = (obj, path = '') => {
    if (obj && typeof obj === 'object') {
      // Check for dangerous keys
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

      for (const key of dangerousKeys) {
        if (key in obj) {
          console.error(`[Security] Prototype pollution attempt detected: ${path}.${key}`);
          return res.status(400).json({
            success: false,
            error: 'Malicious payload detected',
            details: `Forbidden property: ${key}`,
          });
        }
      }

      // Recursively check nested objects
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          const result = checkObject(value, `${path}.${key}`);
          if (result) return result;
        }
      }
    }
  };

  const result = checkObject(req.body, 'body');
  if (result) return result;

  next();
};

// In api-server.js setupMiddleware()
import { preventPrototypePollution } from './middleware/anti-pollution.js';

setupMiddleware() {
  this.app.use(express.json({ limit: '1mb' }));
  this.app.use(preventPrototypePollution); // Add after JSON parsing

  // ... rest
}

// Also freeze prototypes at startup
Object.freeze(Object.prototype);
Object.freeze(Array.prototype);
```

---

## 11. 🔲 API Key Rotation

**Status:** PENDING
**Priority:** CRITICAL (Do FIRST before any production testing)
**Estimated Time:** 2 hours

### Steps:

#### 1. Rotate HubSpot API Key
```bash
# Go to: https://app.hubspot.com/settings/[your-account]/integrations/api/private-apps
# 1. Delete old private app OR regenerate access token
# 2. Copy new token
# 3. Update .env:
HUBSPOT_API_KEY=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### 2. Rotate Lemlist API Key
```bash
# Go to: https://app.lemlist.com/settings/integrations
# 1. Regenerate API key
# 2. Update .env:
LEMLIST_API_KEY=new_key_here
```

#### 3. Rotate Explorium API Key
```bash
# Contact Explorium support or regenerate in dashboard
# Update .env:
EXPLORIUM_API_KEY=new_key_here
```

#### 4. Rotate LinkedIn Session Cookie
```bash
# 1. Log out of LinkedIn
# 2. Log back in
# 3. Get new session cookie
# 4. Update .env:
LINKEDIN_SESSION_COOKIE=new_cookie_here
```

#### 5. Remove Keys from Git History
```bash
# Check if .env was ever committed
git log --all --full-history -- ".env"

# If found, use BFG Repo-Cleaner
git clone --mirror git@github.com:user/repo.git
java -jar bfg.jar --delete-files .env repo.git
cd repo.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

#### 6. Add .gitignore Protection
```bash
# Ensure .gitignore has:
.env
.env.*
!.env.example

# Add pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
if git diff --cached --name-only | grep -q '.env$'; then
  echo "ERROR: Attempting to commit .env file!"
  exit 1
fi
EOF
chmod +x .git/hooks/pre-commit
```

---

## Testing Checklist

After implementing all fixes:

### Security Tests:

```bash
# 1. CORS Test
curl -H "Origin: https://evil.com" http://localhost:3456/health
# Expected: No Access-Control-Allow-Origin header

# 2. Authentication Test
curl http://localhost:3456/api/jobs
# Expected: 401 Unauthorized

curl -H "Authorization: Bearer invalid-key" http://localhost:3456/api/jobs
# Expected: 401 Invalid API key

curl -H "Authorization: Bearer $VALID_API_KEY" http://localhost:3456/api/jobs
# Expected: 200 OK

# 3. Input Validation Test
curl -X POST http://localhost:3456/api/discover \
  -H "Authorization: Bearer $VALID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"count": 99999999}'
# Expected: 400 Validation failed (count max 1000)

# 4. Rate Limit Test
for i in {1..15}; do
  curl -H "Authorization: Bearer $VALID_API_KEY" http://localhost:3456/api/discover
done
# Expected: 429 Too Many Requests after 10th request

# 5. Prototype Pollution Test
curl -X POST http://localhost:3456/api/discover \
  -H "Authorization: Bearer $VALID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"__proto__": {"isAdmin": true}, "query": "test"}'
# Expected: 400 Malicious payload detected

# 6. SQL Injection Test
# (Requires internal testing - field whitelisting should prevent)

# 7. File Permissions
ls -la .env
# Expected: -rw------- (600)

# 8. Security Headers
curl -I http://localhost:3456/health
# Expected: X-Frame-Options, X-Content-Type-Options, etc.

# 9. HTTPS (production only)
curl -I https://api.yourdomain.com/health
# Expected: 200 OK with Strict-Transport-Security header

# 10. Log Sanitization
# Check logs - should NOT contain:
# - Full API keys
# - Email addresses
# - Auth tokens
```

---

## Rollback Plan

If any implementation causes issues:

### Revert CORS:
```javascript
// api-server.js line 122
res.header('Access-Control-Allow-Origin', '*'); // Temporary
```

### Disable Authentication:
```javascript
// Comment out in setupMiddleware():
// this.app.use('/api', authenticateAPIKey);
```

### Disable Rate Limiting:
```javascript
// Comment out limiters in setupMiddleware()
```

---

## Estimated Completion

**Phase 2A Total:** 21 hours
**Completed:** 1 hour (CORS)
**Remaining:** 20 hours

**Suggested Schedule:**
- **Day 1 (4 hours):** Input validation + Security headers
- **Day 2 (4 hours):** API authentication + Rate limiting
- **Day 3 (4 hours):** Log sanitization + SQL injection fix + File permissions
- **Day 4 (4 hours):** Prototype pollution + HTTPS setup
- **Day 5 (4 hours):** API key rotation + Testing

---

## Next Steps

**Option A:** Continue implementing security fixes sequentially
**Option B:** Pause and test current progress (CORS fix)
**Option C:** Switch to performance fixes (Phase 2B)

**Recommendation:** Continue with Option A - complete critical security before any real API testing.

---

**Document Updated:** 2025-11-07
**Last Edit:** CORS fix completed
**Next Task:** Input validation with Zod
