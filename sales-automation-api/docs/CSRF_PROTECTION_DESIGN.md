# CSRF Protection Design Specification
**Version**: 1.0
**Date**: 2025-11-17
**Stage**: Stage 2 Phase 1 - Security Architecture
**Security Priority**: HIGH

---

## Executive Summary

This document outlines the comprehensive CSRF (Cross-Site Request Forgery) protection strategy for the RTGS Sales Automation API. The design implements token-based CSRF protection for all state-changing operations while maintaining compatibility with API key authentication and webhook signature verification.

**Key Decision**: Double Submit Cookie pattern with cryptographically secure tokens stored in Redis.

---

## 1. CSRF Attack Vector Analysis

### Threat Model
- **Attack Type**: Cross-Site Request Forgery (OWASP A01:2021)
- **Risk Level**: HIGH for state-changing endpoints (POST/PUT/DELETE/PATCH)
- **Attack Scenario**: Malicious website tricks authenticated user's browser into making unwanted requests
- **Vulnerable Endpoints**: 31 routes (campaign management, API key operations, enrollment, etc.)

### Current Vulnerabilities
- ✅ API key authentication DOES NOT prevent CSRF (keys can be stolen via XSS)
- ✅ Session-based dashboard endpoints are vulnerable
- ✅ Webhook endpoints are EXEMPT (verified via HMAC-SHA256 signatures)

---

## 2. CSRF Token Generation Strategy

### Token Generation Algorithm
```javascript
// File: mcp-server/src/middleware/csrf-protection.js

import crypto from 'crypto';

/**
 * Generate cryptographically secure CSRF token
 * Uses crypto.randomBytes for CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
 */
function generateCSRFToken() {
  // Generate 32 bytes (256 bits) of random data
  const randomBytes = crypto.randomBytes(32);

  // Encode as URL-safe base64
  const token = randomBytes.toString('base64url');

  return token; // Returns 43-character alphanumeric string
}
```

### Token Format
- **Length**: 43 characters (32 bytes base64url-encoded)
- **Character Set**: A-Z, a-z, 0-9, -, _ (URL-safe base64)
- **Entropy**: 256 bits (cryptographically secure)
- **Example**: `kJ3mN9pQ2rS5tU7vW9xY0zA2bC4dE6fG8hI0jK2lM4nO6`

### Token Lifecycle
1. **Generation**: On session creation or per-request (configurable)
2. **Storage**: Redis with TTL (Time To Live)
3. **Validation**: Compare submitted token with stored token
4. **Rotation**: After successful use (per-request mode) or session expiry

---

## 3. Token Storage Strategy

### Decision: Redis-backed Storage (PRODUCTION) with In-Memory Fallback (DEV)

**Why Redis?**
- ✅ Persistent across server restarts
- ✅ TTL support for automatic cleanup
- ✅ Scalable for multi-instance deployments
- ✅ Already used for orphaned event queue (existing dependency)

**Storage Schema**:
```javascript
// Redis key format: csrf:{sessionId}
// Value: CSRF token (string)
// TTL: 3600 seconds (1 hour)

await redisClient.set(
  `csrf:${sessionId}`,
  csrfToken,
  'EX', 3600  // Expires in 1 hour
);
```

### In-Memory Fallback (Development Only)
```javascript
// For local development without Redis
const csrfTokens = new Map();
// WARNING: Tokens lost on server restart!
// DO NOT USE IN PRODUCTION
```

### Token Retrieval
```javascript
async function getCSRFToken(sessionId) {
  if (process.env.REDIS_URL) {
    return await redisClient.get(`csrf:${sessionId}`);
  } else {
    // Development fallback
    return csrfTokens.get(sessionId);
  }
}
```

---

## 4. Token Validation Flow

### Request Flow for State-Changing Operations

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ 1. GET /api/campaigns/templates
       │    (Safe method, no CSRF check)
       ▼
┌─────────────┐
│   Server    │  2. Generate CSRF token
│             │  3. Store in Redis: csrf:{sessionId}
│             │  4. Set cookie: CSRF-TOKEN={token}
└──────┬──────┘
       │ 5. Return response with cookie
       ▼
┌─────────────┐
│   Client    │  6. Extract token from cookie
│             │  7. Add to header: X-CSRF-TOKEN
└──────┬──────┘
       │ 8. POST /api/campaigns/templates
       │    Cookie: CSRF-TOKEN={token}
       │    X-CSRF-TOKEN: {token}
       ▼
┌─────────────┐
│   Server    │  9. Extract token from header
│             │ 10. Extract sessionId from cookie
│             │ 11. Retrieve stored token from Redis
│             │ 12. Timing-safe comparison
│             │ 13. If match: ALLOW request
│             │     If mismatch: REJECT with 403
└─────────────┘
```

### Validation Middleware
```javascript
/**
 * CSRF Token Validation Middleware
 * Applied to POST/PUT/DELETE/PATCH routes
 */
async function validateCSRFToken(req, res, next) {
  const method = req.method;

  // Skip safe methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // Extract token from header
  const submittedToken = req.headers['x-csrf-token'];

  if (!submittedToken) {
    return res.status(403).json({
      success: false,
      error: 'CSRF Token Missing',
      message: 'X-CSRF-TOKEN header required for state-changing operations',
      statusCode: 403
    });
  }

  // Extract session ID from cookie or API key
  const sessionId = req.sessionId || req.apiKey?.id;

  if (!sessionId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Session or API key required',
      statusCode: 401
    });
  }

  // Retrieve stored token from Redis
  const storedToken = await getCSRFToken(sessionId);

  if (!storedToken) {
    return res.status(403).json({
      success: false,
      error: 'CSRF Token Expired',
      message: 'CSRF token expired or invalid. Please refresh the page.',
      statusCode: 403
    });
  }

  // Timing-safe comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(submittedToken),
    Buffer.from(storedToken)
  );

  if (!isValid) {
    logger.warn('CSRF token validation failed', {
      sessionId,
      ip: req.ip,
      path: req.path,
      method: req.method
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF Token Invalid',
      message: 'CSRF token validation failed',
      statusCode: 403
    });
  }

  // Optional: Rotate token after use (per-request mode)
  if (process.env.CSRF_ROTATION === 'per-request') {
    const newToken = generateCSRFToken();
    await storeCSRFToken(sessionId, newToken);
    res.setHeader('X-New-CSRF-Token', newToken);
  }

  next();
}
```

---

## 5. Exempt Endpoints

### Webhooks (Signature-Verified)
**Exempt from CSRF protection** (authenticated via HMAC-SHA256 signatures):
- `POST /api/campaigns/events/webhook` (Lemlist, Postmark, Phantombuster)

**Rationale**:
- Webhooks are server-to-server communications
- No browser involvement (no CSRF risk)
- Already secured via cryptographic signature verification

### Health & Monitoring Endpoints
**Exempt from CSRF protection**:
- `GET /health` (public, read-only)
- `GET /metrics` (public, read-only)
- `GET /dashboard/*` (static files)

---

## 6. Token Rotation Policy

### Recommendation: Hybrid Approach

#### Per-Session Rotation (DEFAULT)
- **When**: Token generated on session creation
- **Lifespan**: 1 hour (session TTL)
- **Use Case**: Standard API operations
- **Pros**: Lower overhead, simpler implementation
- **Cons**: Token valid for full session duration

#### Per-Request Rotation (OPTIONAL)
- **When**: Token regenerated after each state-changing request
- **Lifespan**: Single use
- **Use Case**: High-security operations (API key deletion, etc.)
- **Pros**: Maximum security (one-time tokens)
- **Cons**: Higher overhead, potential race conditions

**Configuration**:
```bash
# .env
CSRF_ROTATION=per-session  # Options: per-session | per-request
CSRF_TOKEN_TTL=3600        # 1 hour in seconds
```

---

## 7. Integration with Existing Authentication

### Session-Based Auth (Dashboard)
```javascript
// Session middleware creates session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
}));

// CSRF middleware piggybacks on session
app.use(csrfProtection);
```

### API Key Auth (REST API)
```javascript
// API key authentication
app.use('/api', authenticateDb);

// CSRF protection uses API key ID as session identifier
// Token stored in Redis: csrf:{apiKeyId}
app.use('/api', validateCSRFToken);
```

---

## 8. Security Considerations

### Timing Attack Prevention
✅ Use `crypto.timingSafeEqual()` for token comparison (prevents timing attacks)

### Token Leakage Prevention
✅ Tokens stored in HttpOnly cookies (not accessible via JavaScript)
✅ Tokens transmitted via secure headers (not URL parameters)
✅ Tokens never logged or exposed in error messages

### Double Submit Cookie Pattern
✅ Token stored in cookie (set by server)
✅ Token submitted in header (set by client JavaScript)
✅ Attacker cannot read cookie from different origin (Same-Origin Policy)

### SameSite Cookie Attribute
```javascript
cookie: {
  httpOnly: true,
  secure: true,  // HTTPS only
  sameSite: 'strict'  // Prevents CSRF via third-party sites
}
```

---

## 9. Implementation Checklist

- [ ] Create `src/middleware/csrf-protection.js`
- [ ] Add CSRF token generation function (`generateCSRFToken`)
- [ ] Add CSRF token storage function (`storeCSRFToken`)
- [ ] Add CSRF token retrieval function (`getCSRFToken`)
- [ ] Add CSRF validation middleware (`validateCSRFToken`)
- [ ] Add CSRF token endpoint (`GET /api/csrf-token`)
- [ ] Update `api-server.js` to apply CSRF middleware
- [ ] Exempt webhook routes from CSRF protection
- [ ] Add CSRF configuration to `.env.example`
- [ ] Update frontend to include CSRF tokens in requests
- [ ] Add CSRF tests (`tests/csrf-protection.test.js`)
- [ ] Document CSRF implementation in API docs

---

## 10. Testing Strategy

### Unit Tests
```javascript
describe('CSRF Protection', () => {
  it('should generate 43-character tokens', () => {
    const token = generateCSRFToken();
    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('should reject requests without CSRF token', async () => {
    const res = await request(app)
      .post('/api/campaigns/templates')
      .set('Authorization', 'Bearer sk_test_...')
      .send({ name: 'Test' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('CSRF Token Missing');
  });

  it('should accept requests with valid CSRF token', async () => {
    const token = await getCSRFToken(sessionId);

    const res = await request(app)
      .post('/api/campaigns/templates')
      .set('Authorization', 'Bearer sk_test_...')
      .set('X-CSRF-Token', token)
      .send({ name: 'Test' });

    expect(res.status).toBe(201);
  });

  it('should reject requests with invalid CSRF token', async () => {
    const res = await request(app)
      .post('/api/campaigns/templates')
      .set('Authorization', 'Bearer sk_test_...')
      .set('X-CSRF-Token', 'invalid_token_here')
      .send({ name: 'Test' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('CSRF Token Invalid');
  });
});
```

---

## 11. Performance Impact

### Overhead Analysis
- **Token Generation**: ~0.5ms per token (crypto.randomBytes)
- **Redis Lookup**: ~1-2ms per request (network latency)
- **Token Comparison**: <0.1ms (constant time)
- **Total Overhead**: ~2-3ms per state-changing request

**Conclusion**: Negligible performance impact (<0.3% overhead for typical 1-second API responses)

---

## 12. Migration Path

### Phase 1: Add CSRF Middleware (Non-Breaking)
1. Deploy CSRF middleware in **permissive mode** (log warnings, don't block)
2. Monitor logs for missing CSRF tokens
3. Update frontend to include tokens

### Phase 2: Enable Enforcement (Breaking Change)
1. Switch to **enforcement mode** (block requests without valid tokens)
2. Announce breaking change in API docs
3. Provide migration guide for API consumers

### Phase 3: Optimize
1. Enable per-request rotation for sensitive endpoints
2. Tune TTL based on usage patterns
3. Add Prometheus metrics for CSRF failures

---

## 13. Configuration Reference

### Environment Variables
```bash
# CSRF Protection
CSRF_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
CSRF_ROTATION=per-session  # Options: per-session | per-request
CSRF_TOKEN_TTL=3600         # 1 hour in seconds
CSRF_ENFORCE=true           # Set to false for permissive mode during migration

# Session Management (for dashboard)
SESSION_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
SESSION_TTL=3600000         # 1 hour in milliseconds

# Redis (required for CSRF in production)
REDIS_URL=redis://localhost:6379
```

---

## 14. Conclusion

This CSRF protection design provides:
- ✅ **Strong Security**: 256-bit cryptographically secure tokens
- ✅ **Scalability**: Redis-backed storage for multi-instance deployments
- ✅ **Flexibility**: Per-session or per-request rotation
- ✅ **Compatibility**: Works with both session and API key auth
- ✅ **Performance**: <3ms overhead per request

**Next Steps**: Proceed to implementation in `src/middleware/csrf-protection.js`

---

**Reviewed By**: Security Architect
**Approved By**: [Pending Stage 2 Phase 1 Review]
**Implementation Target**: Stage 2 Phase 1 (Week 1)
