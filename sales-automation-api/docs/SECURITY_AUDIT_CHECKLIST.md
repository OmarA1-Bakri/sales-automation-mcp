# Stage 2 Security Audit Checklist
**RTGS Sales Automation - Security Remediation**

**Current Grade**: C+ (65/100)
**Target Grade**: B+ (82/100)
**Stage**: Stage 2 Phase 1 - Security Architecture
**Date**: 2025-11-17

---

## 📋 Overview

This checklist covers all security controls required for Stage 2 Phase 1 security remediation. Each item must be verified before advancing to the final OWASP audit.

**Verification Levels**:
- ✅ **PASS**: Control implemented and tested
- ⚠️ **PARTIAL**: Control partially implemented, needs completion
- ❌ **FAIL**: Control not implemented or failing
- 🔍 **REVIEW**: Requires manual security review

---

## 1️⃣ Input Validation (T2.6 - CRITICAL)

### 1.1 Zod Schema Coverage
- [ ] All 31+ endpoints have Zod validation schemas
- [ ] Validation covers `req.body` for POST/PUT/PATCH requests
- [ ] Validation covers `req.query` for GET requests with parameters
- [ ] Validation covers `req.params` for all routes with URL parameters
- [ ] No direct access to `req.body` without validation middleware

**Endpoint Inventory** (31 routes verified):

#### Campaign Routes (19 endpoints)
- [ ] `POST /api/campaigns/templates` - CreateCampaignTemplateSchema
- [ ] `GET /api/campaigns/templates` - ListCampaignTemplatesSchema
- [ ] `GET /api/campaigns/templates/:id` - CampaignTemplateParamSchema
- [ ] `PUT /api/campaigns/templates/:id` - UpdateCampaignTemplateSchema
- [ ] `DELETE /api/campaigns/templates/:id` - CampaignTemplateParamSchema
- [ ] `POST /api/campaigns/templates/:id/sequences/email` - CreateEmailSequenceSchema
- [ ] `PUT /api/campaigns/templates/:templateId/sequences/email/:id` - UpdateEmailSequenceSchema
- [ ] `DELETE /api/campaigns/templates/:templateId/sequences/email/:id` - DeleteEmailSequenceSchema
- [ ] `POST /api/campaigns/templates/:id/sequences/linkedin` - CreateLinkedInSequenceSchema
- [ ] `PUT /api/campaigns/templates/:templateId/sequences/linkedin/:id` - UpdateLinkedInSequenceSchema
- [ ] `DELETE /api/campaigns/templates/:templateId/sequences/linkedin/:id` - DeleteLinkedInSequenceSchema
- [ ] `POST /api/campaigns/instances` - CreateCampaignInstanceSchema
- [ ] `GET /api/campaigns/instances` - ListCampaignInstancesSchema
- [ ] `GET /api/campaigns/instances/:id` - GetCampaignInstanceSchema
- [ ] `PATCH /api/campaigns/instances/:id` - UpdateCampaignInstanceStatusSchema
- [ ] `GET /api/campaigns/instances/:id/performance` - GetCampaignPerformanceSchema
- [ ] `POST /api/campaigns/instances/:id/enrollments` - CreateEnrollmentSchema
- [ ] `POST /api/campaigns/instances/:id/enrollments/bulk` - BulkEnrollSchema
- [ ] `GET /api/campaigns/instances/:id/enrollments` - ListEnrollmentsSchema
- [ ] `GET /api/campaigns/enrollments/:id` - GetEnrollmentSchema
- [ ] `PATCH /api/campaigns/enrollments/:id` - UpdateEnrollmentSchema
- [ ] `DELETE /api/campaigns/enrollments/:id` - DeleteEnrollmentSchema
- [ ] `POST /api/campaigns/events/webhook` - CreateCampaignEventSchema
- [ ] `GET /api/campaigns/enrollments/:id/events` - GetEnrollmentEventsSchema

#### API Key Routes (6 endpoints)
- [ ] `POST /api/keys` - CreateAPIKeySchema
- [ ] `GET /api/keys` - ListAPIKeysSchema
- [ ] `GET /api/keys/:id` - GetAPIKeySchema
- [ ] `POST /api/keys/:id/rotate` - RotateAPIKeySchema
- [ ] `DELETE /api/keys/:id` - RevokeAPIKeySchema
- [ ] `GET /api/keys/:id/logs` - GetAPIKeyLogsSchema

#### Discovery & Enrichment Routes (2 endpoints)
- [ ] `POST /api/discover` - DiscoverByICPSchema
- [ ] `POST /api/enrich` - EnrichContactsSchema

#### Chat Routes (2 endpoints)
- [ ] `POST /api/chat` - ChatMessageSchema
- [ ] `GET /api/chat/history` - ChatHistorySchema

#### Import Routes (6 endpoints)
- [ ] `POST /api/import/lemlist` - ImportFromLemlistSchema
- [ ] `POST /api/import/hubspot` - ImportFromHubSpotSchema
- [ ] `POST /api/import/csv` - ImportFromCSVSchema
- [ ] `POST /api/import/enrich` - EnrichImportedContactsSchema
- [ ] `POST /api/import/sync/hubspot` - SyncToHubSpotSchema
- [ ] `GET /api/import/contacts` - ListImportedContactsSchema

#### Admin/DLQ Routes (3 endpoints)
- [ ] `GET /api/admin/dlq` - GetDLQEventsSchema
- [ ] `POST /api/admin/dlq/replay` - ReplayDLQEventsSchema
- [ ] `GET /api/admin/dlq/stats` - GetDLQStatsSchema

#### Job Routes (3 endpoints)
- [ ] `GET /api/jobs` - GetJobsSchema
- [ ] `GET /api/jobs/:jobId` - GetJobByIdSchema
- [ ] `DELETE /api/jobs/:jobId` - CancelJobSchema

#### YOLO Routes (3 endpoints)
- [ ] `POST /api/yolo/enable` - EnableYOLOSchema
- [ ] `POST /api/yolo/disable` - DisableYOLOSchema
- [ ] `GET /api/yolo/status` - GetYOLOStatusSchema

### 1.2 Validation Strictness
- [ ] String length limits enforced (prevent buffer overflows)
- [ ] Email format validation (RFC 5322 compliant)
- [ ] URL/Domain validation for all URL fields
- [ ] UUID validation for all ID fields
- [ ] Enum validation for fixed-value fields (status, type, etc.)
- [ ] Array validation with min/max length limits
- [ ] Number validation with min/max ranges
- [ ] Date validation for date/time fields
- [ ] Sanitization: strings trimmed, emails lowercased

### 1.3 Prototype Pollution Prevention
- [ ] `SafeJSONBSchema` used for all JSONB/metadata fields
- [ ] `hasDangerousKeys()` function prevents `__proto__`, `constructor`, `prototype`
- [ ] Max object depth enforced (5 levels)
- [ ] Max JSON size enforced (10KB)

### 1.4 Testing
- [ ] Unit tests for valid input acceptance
- [ ] Unit tests for invalid input rejection
- [ ] Boundary testing (min/max lengths, ranges)
- [ ] Malicious input testing (SQL injection, XSS, prototype pollution)

**Test Script**: `npm test -- --grep "Input Validation"`

---

## 2️⃣ CSRF Protection (T2.5 - HIGH)

### 2.1 Token Generation
- [ ] CSRF tokens generated with `crypto.randomBytes(32)`
- [ ] Tokens are 43 characters (256-bit entropy)
- [ ] Token format is URL-safe base64
- [ ] Tokens are cryptographically unpredictable

### 2.2 Token Storage
- [ ] Redis-backed storage in production (`REDIS_URL` configured)
- [ ] In-memory fallback only in development (`NODE_ENV=development`)
- [ ] Token TTL configured (default: 3600 seconds)
- [ ] Redis key format: `csrf:{sessionId}`

### 2.3 Token Validation
- [ ] POST/PUT/DELETE/PATCH routes require CSRF token
- [ ] Token submitted via `X-CSRF-Token` header
- [ ] Timing-safe comparison (`crypto.timingSafeEqual()`)
- [ ] Invalid tokens rejected with 403 Forbidden
- [ ] Missing tokens rejected with 403 Forbidden
- [ ] Expired tokens rejected with 403 Forbidden

### 2.4 Exempt Endpoints
- [ ] GET/HEAD/OPTIONS requests exempt (safe methods)
- [ ] Webhook endpoints exempt (`POST /api/campaigns/events/webhook`)
- [ ] Health/metrics endpoints exempt (`/health`, `/metrics`)
- [ ] Webhook signature verification used instead of CSRF

### 2.5 Token Rotation
- [ ] Rotation policy configured (`CSRF_ROTATION=per-session` or `per-request`)
- [ ] Per-session rotation: Token valid for session duration
- [ ] Per-request rotation: Token regenerated after each use (optional)
- [ ] New token returned in `X-New-CSRF-Token` header (per-request mode)

### 2.6 Configuration
- [ ] `CSRF_SECRET` environment variable set
- [ ] `CSRF_ROTATION` environment variable set
- [ ] `CSRF_TOKEN_TTL` environment variable set
- [ ] `CSRF_ENFORCE` environment variable set (`true` for enforcement)

### 2.7 Testing
- [ ] Test: Valid token accepted
- [ ] Test: Invalid token rejected (403)
- [ ] Test: Missing token rejected (403)
- [ ] Test: Expired token rejected (403)
- [ ] Test: Safe methods (GET) bypass CSRF check
- [ ] Test: Webhook endpoints bypass CSRF check

**Test Script**: `npm test -- --grep "CSRF Protection"`

---

## 3️⃣ Authentication (T2.8 - CRITICAL)

### 3.1 Rate Limiting
- [ ] Global rate limit: 100 requests per 15 minutes per IP
- [ ] Rate limit configured via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW`
- [ ] Rate limit headers exposed (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`)
- [ ] 429 Too Many Requests returned when exceeded
- [ ] Health/metrics endpoints exempt from rate limiting

### 3.2 Account Lockout (Brute Force Prevention)
- [ ] Account lockout enabled (5 failed attempts per 15 minutes)
- [ ] `LOCKOUT_MAX_ATTEMPTS` environment variable set (default: 5)
- [ ] `LOCKOUT_DURATION_MINUTES` environment variable set (default: 15)
- [ ] `LOCKOUT_WINDOW_MINUTES` environment variable set (default: 15)
- [ ] Lockout counter stored in Redis (persistent across restarts)
- [ ] Lockout events logged to security log

### 3.3 Session Management
- [ ] Session secret configured (`SESSION_SECRET` with 256-bit entropy)
- [ ] Session TTL configured (default: 1 hour / 3600000 ms)
- [ ] HttpOnly flag set on session cookies
- [ ] Secure flag set in production (`NODE_ENV=production`)
- [ ] SameSite=Strict attribute set (CSRF prevention)
- [ ] Session fixation protection implemented

### 3.4 API Key Authentication
- [ ] Database-backed authentication (`authenticateDb` middleware)
- [ ] Argon2id hashing for API key storage
- [ ] API key rotation supported (with grace period)
- [ ] API key revocation supported
- [ ] API key audit logging enabled
- [ ] Scope-based authorization (`requireScope` middleware)

### 3.5 Testing
- [ ] Test: Rate limit enforced (100 requests/15min)
- [ ] Test: 429 response after rate limit exceeded
- [ ] Test: Account lockout after 5 failed attempts
- [ ] Test: Lockout duration enforced (15 minutes)
- [ ] Test: Session cookies have HttpOnly, Secure, SameSite flags
- [ ] Test: Invalid API key rejected (401)

**Test Script**: `npm test -- --grep "Authentication"`

---

## 4️⃣ Webhook Security (T2.9 - HIGH)

### 4.1 Signature Verification
- [ ] HMAC-SHA256 signature verification implemented
- [ ] Lemlist webhook signature verified (`LEMLIST_WEBHOOK_SECRET`)
- [ ] Postmark webhook signature verified (`POSTMARK_WEBHOOK_SECRET`)
- [ ] Phantombuster webhook signature verified (`PHANTOMBUSTER_WEBHOOK_SECRET`)
- [ ] Invalid signatures rejected with 403 Forbidden
- [ ] Signature verification failures logged

### 4.2 Webhook Configuration
- [ ] `LEMLIST_WEBHOOK_SECRET` environment variable set
- [ ] `POSTMARK_WEBHOOK_SECRET` environment variable set
- [ ] `PHANTOMBUSTER_WEBHOOK_SECRET` environment variable set
- [ ] `WEBHOOK_SIGNING_SECRET` environment variable set (generic webhooks)

### 4.3 Webhook Middleware
- [ ] `validateWebhookSignature` middleware applied to webhook routes
- [ ] `saveRawBody` middleware captures raw request body (for signature verification)
- [ ] Webhook rate limiting enabled (100 requests/minute)
- [ ] Webhook validation errors logged with severity level

### 4.4 Testing
- [ ] Test: Valid signature accepted
- [ ] Test: Invalid signature rejected (403)
- [ ] Test: Missing signature rejected (403)
- [ ] Test: Webhook rate limiting enforced

**Test Script**: `npm test -- --grep "Webhook Security"`

---

## 5️⃣ SQL Injection Prevention (OWASP A03)

### 5.1 Parameterized Queries
- [ ] All database queries use Sequelize ORM
- [ ] No raw SQL queries with string concatenation
- [ ] No string interpolation in `where()` clauses
- [ ] Sequelize parameter binding used (`{ where: { id: ? } }`)

### 5.2 Code Review
- [ ] `grep -r "sequelize.query" src/` returns no unsafe queries
- [ ] `grep -r "\.query(" src/` returns no unsafe queries
- [ ] `grep -r "\`SELECT" src/` returns no string template SQL
- [ ] `grep -r "\"SELECT" src/` returns no string concatenation SQL

### 5.3 Testing
- [ ] Test: SQL injection in email field blocked
- [ ] Test: SQL injection in UUID field blocked
- [ ] Test: SQL injection in JSON field blocked

**Test Script**: `npm test -- --grep "SQL Injection"`

---

## 6️⃣ XSS Prevention (OWASP A03)

### 6.1 Output Encoding
- [ ] All user-generated content properly escaped
- [ ] Content Security Policy (CSP) headers configured
- [ ] No `dangerouslySetInnerHTML` usage (React/frontend)
- [ ] No `innerHTML` assignments with user input

### 6.2 CSP Configuration
- [ ] `helmet` middleware enabled
- [ ] CSP directives configured (`default-src 'self'`)
- [ ] `script-src` restricts inline scripts
- [ ] `style-src` restricts inline styles
- [ ] `img-src` restricts image sources

### 6.3 Testing
- [ ] Test: XSS in campaign name blocked
- [ ] Test: XSS in contact notes blocked
- [ ] Test: XSS in email body blocked

**Test Script**: `npm test -- --grep "XSS Prevention"`

---

## 7️⃣ Sensitive Data Exposure (OWASP A02)

### 7.1 Secret Management
- [ ] No hardcoded secrets in code (`grep -r "sk_live" src/` returns nothing)
- [ ] No hardcoded API keys (`grep -r "pat-na1" src/` returns nothing)
- [ ] All secrets loaded from environment variables
- [ ] `.env` file in `.gitignore`
- [ ] `.env.example` has placeholder values only

### 7.2 Logging
- [ ] No passwords logged
- [ ] No API keys logged
- [ ] No CSRF tokens logged
- [ ] No session IDs logged
- [ ] Sensitive fields redacted in logs

### 7.3 Error Messages
- [ ] Error messages don't leak stack traces (production)
- [ ] Error messages don't leak database schema
- [ ] Error messages don't leak file paths
- [ ] Generic error messages for authentication failures

### 7.4 HTTPS/TLS
- [ ] HTTPS enabled in production (`ENABLE_HTTPS=true`)
- [ ] TLS 1.2+ required (`TLS_MIN_VERSION=TLSv1.2`)
- [ ] Strong cipher suites configured
- [ ] HSTS header enabled (`Strict-Transport-Security`)

### 7.5 Testing
- [ ] Test: `.env` not committed to git
- [ ] Test: Error responses don't include stack traces (production)
- [ ] Test: HTTPS redirect enforced (production)

**Test Script**: `npm test -- --grep "Sensitive Data"`

---

## 8️⃣ OWASP Top 10 Compliance

### A01: Broken Access Control
- [ ] API key scope validation (`requireScope` middleware)
- [ ] User-owned resource authorization checks
- [ ] No horizontal privilege escalation (user A cannot access user B's data)
- [ ] No vertical privilege escalation (regular user cannot perform admin actions)

### A02: Cryptographic Failures
- [ ] Secrets use 256-bit entropy (`crypto.randomBytes(32)`)
- [ ] Argon2id for password/API key hashing
- [ ] HTTPS/TLS for data in transit
- [ ] Sensitive data encrypted at rest (database encryption)

### A03: Injection
- [ ] SQL injection prevented (Sequelize ORM, parameterized queries)
- [ ] NoSQL injection prevented (Zod validation, SafeJSONBSchema)
- [ ] Command injection prevented (no `exec()`, `eval()`, `child_process`)
- [ ] Prototype pollution prevented (`hasDangerousKeys()`)

### A04: Insecure Design
- [ ] CSRF protection designed and implemented
- [ ] Rate limiting designed and implemented
- [ ] Account lockout designed and implemented
- [ ] Webhook signature verification designed and implemented

### A05: Security Misconfiguration
- [ ] `helmet` middleware enabled (security headers)
- [ ] CORS properly configured (allowlist only)
- [ ] Debug mode disabled in production (`DEBUG=false`)
- [ ] Error stack traces disabled in production

### A06: Vulnerable and Outdated Components
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] Dependencies updated to latest stable versions
- [ ] Automated dependency scanning enabled (Dependabot, Snyk)

### A07: Identification and Authentication Failures
- [ ] Rate limiting prevents brute force (100 req/15min)
- [ ] Account lockout prevents brute force (5 attempts/15min)
- [ ] Strong session management (HttpOnly, Secure, SameSite)
- [ ] API key rotation supported

### A08: Software and Data Integrity Failures
- [ ] Webhook signature verification (HMAC-SHA256)
- [ ] No unsigned third-party code execution
- [ ] CI/CD pipeline integrity (signed commits, protected branches)

### A09: Security Logging and Monitoring Failures
- [ ] Security events logged (`LOG_SECURITY_EVENTS=true`)
- [ ] Failed authentication attempts logged
- [ ] CSRF validation failures logged
- [ ] Webhook signature failures logged
- [ ] Account lockouts logged

### A10: Server-Side Request Forgery (SSRF)
- [ ] URL validation for external requests
- [ ] URL allowlist for webhook callbacks
- [ ] No user-supplied URLs in HTTP requests without validation

---

## 9️⃣ Code Quality & Security Scanning

### 9.1 Static Analysis
- [ ] ESLint security rules enabled
- [ ] No `eval()` usage
- [ ] No `Function()` constructor usage
- [ ] No `child_process.exec()` usage
- [ ] No unsafe regex (ReDoS prevention)

### 9.2 Dependency Scanning
- [ ] `npm audit` executed (no high/critical vulnerabilities)
- [ ] `npm audit fix` applied
- [ ] Snyk scan executed (optional)
- [ ] Dependabot alerts reviewed

### 9.3 Secret Scanning
- [ ] `git-secrets` or `gitleaks` installed
- [ ] Pre-commit hook prevents secret commits
- [ ] Historical commits scanned for secrets

**Command**: `npm audit && npm run lint`

---

## 🔟 Production Readiness

### 10.1 Environment Configuration
- [ ] All secrets generated with `crypto.randomBytes(32)`
- [ ] Different secrets for dev/staging/production
- [ ] `.env` file permissions set to 600 (`chmod 600 .env`)
- [ ] Production secrets stored in vault (AWS Secrets Manager, etc.)

### 10.2 Infrastructure
- [ ] HTTPS/TLS enabled with valid certificate
- [ ] Redis configured for production (managed service)
- [ ] PostgreSQL configured with strong password
- [ ] Database backups automated (daily minimum)

### 10.3 Monitoring
- [ ] Security logging enabled (`LOG_SECURITY_EVENTS=true`)
- [ ] Log aggregation configured (CloudWatch, Datadog, etc.)
- [ ] Alerts configured for:
  - Account lockouts
  - CSRF failures
  - Webhook signature failures
  - Rate limit violations
  - High error rates

### 10.4 Incident Response
- [ ] Security incident response plan documented
- [ ] Escalation contacts defined
- [ ] Post-mortem process defined
- [ ] Rollback procedures documented

---

## ✅ Final Verification

Before advancing to Stage 2 Phase 2, ensure:

1. **All checkboxes above are checked** (✅)
2. **All tests pass**: `npm test`
3. **No high/critical vulnerabilities**: `npm audit`
4. **Security logs reviewed** (no anomalies)
5. **CSRF protection tested** in staging environment
6. **Webhook signature verification tested** with real providers
7. **Rate limiting tested** under load
8. **Account lockout tested** with failed login attempts
9. **Code reviewed** by security team
10. **Documentation complete** (CSRF_PROTECTION_DESIGN.md, this checklist)

---

## 📊 Security Score Calculation

**Stage 2 Phase 1 Target: B+ (82/100)**

| Category | Weight | Max Score | Current | Target |
|----------|--------|-----------|---------|--------|
| Input Validation (T2.6) | 25% | 25 | ? | 25 |
| CSRF Protection (T2.5) | 20% | 20 | ? | 20 |
| Authentication (T2.8) | 20% | 20 | ? | 20 |
| Webhook Security (T2.9) | 15% | 15 | ? | 15 |
| OWASP Compliance | 20% | 20 | ? | 17 |
| **TOTAL** | 100% | **100** | **?** | **82+** |

**Scoring Criteria**:
- **A+ (95-100)**: All controls implemented, tested, and hardened
- **A (90-94)**: All controls implemented and tested
- **B+ (82-89)**: All critical controls implemented, some hardening remaining
- **B (75-81)**: Most controls implemented, testing in progress
- **C+ (65-74)**: Partial implementation, significant gaps remain

---

## 📝 Auditor Notes

**Date**: _____________
**Auditor**: _____________
**Overall Assessment**: [ ] PASS  [ ] FAIL  [ ] CONDITIONAL PASS

**Critical Findings**:
1.
2.
3.

**Recommendations**:
1.
2.
3.

**Sign-Off**:
- [ ] Security Team Approved
- [ ] Engineering Team Approved
- [ ] Product Team Approved

---

**Next Stage**: Stage 2 Phase 2 - Security Implementation & Testing
