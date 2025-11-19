# ENTERPRISE-GRADE AUTONOMOUS REMEDIATION PROMPT FOR CLAUDE CODE

```markdown
# AUTONOMOUS PROJECT REMEDIATION - SALES AUTOMATION PLATFORM
## Mission: Production-Ready Deployment via Parallel Agent Execution

---

## CONTEXT & CURRENT STATE

**Project:** Sales Automation Platform (React/Electron Desktop + Express API + Workers + Integrations)
**Current Grade:** C+ (71/100) - 🔴 BLOCKED FOR PRODUCTION
**Total Issues:** 157 (31 Blocking, 44 Critical, 48 High, 22 Medium, 12 Low)
**Test Coverage:** 14% (Target: 80%)
**Risk Exposure:** $95K-$1.85M+

**Pre-Analysis Complete:** ✅ Comprehensive work-critic review completed across all 7 components
- Desktop App (React/Electron): C+ (70/100) - 18 issues
- API Server (Express): B+ (83/100) - 25 issues  
- Workers (4 processes): C+ (71/100) - 38 issues
- Integration Clients (3 services): C+ (73/100) - 38 issues
- Database Layer: B+ (85/100) - 16 issues
- Testing Infrastructure: D+ (65/100) - 25 issues

**Excellence Identified:** 35 excellent patterns including perfect Electron security, outstanding transaction implementation, security-first middleware, and clean event-driven architecture.

---

## EXECUTION DIRECTIVE

You are Claude Code, an autonomous engineering system. Execute ALL phases below WITHOUT human intervention until ALL success criteria are GREEN. Use parallel agents, validation loops, and tool orchestration to achieve production-ready status in the shortest possible time.

**OPERATIONAL RULES:**
1. ✅ NO requests for permission - execute autonomously
2. ✅ NO stopping for clarification - use available context and make engineering decisions
3. ✅ NO skipping validation - every task MUST pass work-critic + tests before proceeding
4. ✅ PARALLEL execution for independent tasks - maximize throughput
5. ✅ LOOP on failures - retry with alternative approaches until GREEN
6. ✅ COMPREHENSIVE context for each agent - provide 500+ lines surrounding code
7. ✅ REPORT to user ONLY when 100% complete and production-ready

---

## PHASE 1: ROOT DIRECTORY REMEDIATION (PREREQUISITE)
**Timeline:** 2-4 hours | **Gate:** Clean enterprise directory structure

### Strategic Objective
Establish clean, enterprise-standard directory structure before any code fixes. A chaotic root directory complicates parallel agent coordination and increases risk of file conflicts during simultaneous operations.

### T1.1: Root Directory Structural Audit
**Agent Assignment:** Agent-Foundation-1 (Read-only analysis)

**Execution Steps:**
1. Scan root directory: `ls -la / && find . -maxdepth 2 -type f`
2. Identify misplaced files:
   - Config files not in `/config` or project root standards
   - Source files not in `/src`, `/lib`, or component directories
   - Test files not in `/test`, `/__tests__`, or co-located
   - Build artifacts in version control (.next, dist, node_modules)
   - Logs, temp files, or system artifacts
3. Catalog configuration files: `.env*`, `*.config.js`, `*.json`, `*.yaml`
4. Map target directory structure per Node.js/React/Electron standards:
   ```
   /
   ├── src/              # Source code
   ├── test/             # Tests (or __tests__)
   ├── config/           # Configuration files
   ├── scripts/          # Build/deploy scripts
   ├── docs/             # Documentation
   ├── .github/          # GitHub workflows
   ├── package.json      # Root manifest
   ├── .gitignore        # Version control rules
   └── README.md         # Project docs
   ```
5. Generate remediation plan: `ROOT_DIRECTORY_REMEDIATION_PLAN.md`
   - File-by-file movement strategy
   - Import/reference updates required
   - Risk assessment (dependencies, breaking changes)

**Sugar Invocation:** `sugar --task "Root directory audit" --output-format "structured-plan"`

**Success Criteria:**
- ✅ Complete file inventory with categorization
- ✅ Remediation plan generated with zero ambiguity
- ✅ No execution yet - analysis only

---

### T1.2: Execute Directory Structure Remediation
**Agent Assignment:** Agent-Foundation-2, Agent-Foundation-3, Agent-Foundation-4 (Parallel)

**Task Router Strategy:**
```bash
task-router --input ROOT_DIRECTORY_REMEDIATION_PLAN.md \
  --optimize-for parallel-safety \
  --agents 3 \
  --output EXECUTION_SEQUENCE.json
```

**Parallel Execution Workflow:**

**Agent-Foundation-2: File Movement Operations**
- Move files per remediation plan
- Preserve file history in git (use `git mv` not `mv`)
- Create directories as needed
- No reference updates yet

**Agent-Foundation-3: Configuration Consolidation**
- Merge duplicate config files (e.g., multiple `.env` files)
- Validate no conflicting settings
- Standardize config file naming
- Document configuration schema

**Agent-Foundation-4: Import/Reference Scanner**
- Scan entire codebase for imports: `grep -r "import.*from.*'\.\./" src/`
- Scan for file path references: `grep -r "path.join.*'\.\./" src/`
- Generate update map: `FILE_REFERENCE_UPDATE_MAP.json`

**After All 3 Agents Complete:**

**Agent-Foundation-2 (Sequential):**
- Apply all import/reference updates from `FILE_REFERENCE_UPDATE_MAP.json`
- Use AST-based refactoring where possible (jscodeshift, ts-morph)
- Fall back to regex for edge cases

**Sugar Invocation (per agent):** 
```bash
sugar --task "File movement for Agent-Foundation-2" \
  --complexity high \
  --safety-checks git-history,reference-integrity
```

**Validation Loop:**
```bash
# After each agent completes their work:
work-critic --target-files <modified-files> \
  --standards enterprise-structure \
  --output WORK_CRITIC_ROOT_CLEANUP.md

# Run all tests
npm test || yarn test

# Verify no broken imports
npm run build || yarn build

# LOOP CONDITION:
while [[ $(work-critic --check-status) != "GREEN" ]] || [[ $test_exit_code -ne 0 ]]; do
  echo "Validation FAILED - analyzing failure and retrying..."
  # Analyze failure, apply fix, re-run validation
done
```

**Success Criteria:**
- ✅ Root directory matches enterprise standards (documented in WORK_CRITIC_ROOT_CLEANUP.md)
- ✅ Zero misplaced files
- ✅ All imports/references updated and valid
- ✅ Project builds successfully: `npm run build` exits 0
- ✅ All existing tests pass: `npm test` exits 0
- ✅ work-critic validation: GREEN
- ✅ Git history preserved (no force pushes, use `git mv`)

---

## PHASE 2: CATASTROPHIC SECURITY FIXES (WEEK 1)
**Timeline:** 24-32 hours | **Gate:** Zero catastrophic vulnerabilities

### Strategic Objective
Eliminate the 10 most catastrophic security vulnerabilities that represent immediate production blockers and legal liability. These fixes MUST be completed before ANY other work proceeds.

### Context Provisioning for All Security Agents
```json
{
  "codebase_access": "full",
  "sensitive_files": [
    "desktop-app/src/utils/api.js",
    "desktop-app/src/pages/SettingsPage.jsx",
    "api-server/src/config/database.js",
    "api-server/src/server.js",
    "integration-clients/*.js",
    ".env*"
  ],
  "security_standards": ["OWASP Top 10", "SANS 25", "SOC 2", "GDPR Article 32"],
  "reference_docs": [
    "https://electron.github.io/security/",
    "https://cheatsheetseries.owasp.org/",
    "docs/SECURITY_POLICY.md"
  ],
  "findings": "WORK-CRITIC-MASTER-SUMMARY.md sections: Top 10 Catastrophic Issues"
}
```

---

### T2.1: Eliminate Hardcoded Production API Key (2 hours)
**Agent Assignment:** Agent-Security-1 (CRITICAL - SOLO EXECUTION)

**Issue:** Hardcoded API key `sk_live_48eadc821ee5b4403d2ddb6f2fab647441d036ac14aa00d2fa58cfb3efc9a8ea` exposed in `desktop-app/src/utils/api.js:9-10`.

**Immediate Actions (Sequential - NO PARALLELIZATION):**

**Step 1: Remove Hardcoded Key (5 minutes)**
```javascript
// desktop-app/src/utils/api.js
// BEFORE (lines 9-10):
const API_KEY = 'sk_live_48eadc821ee5b4403d2ddb6f2fab647441d036ac14aa00d2fa58cfb3efc9a8ea';
const API_URL = 'https://api.rtgs.global/v1';

// AFTER:
const API_KEY = process.env.REACT_APP_API_KEY;
const API_URL = process.env.REACT_APP_API_URL || 'https://api.rtgs.global/v1';

if (!API_KEY) {
  throw new Error('REACT_APP_API_KEY environment variable is required');
}
```

**Step 2: Implement Electron SafeStorage (2 hours)**
```javascript
// desktop-app/electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('secureStorage', {
  setApiKey: (key) => ipcRenderer.invoke('secure-storage:set', 'api_key', key),
  getApiKey: () => ipcRenderer.invoke('secure-storage:get', 'api_key'),
  deleteApiKey: () => ipcRenderer.invoke('secure-storage:delete', 'api_key')
});

// desktop-app/electron/main.js
const { safeStorage } = require('electron');

ipcMain.handle('secure-storage:set', async (event, key, value) => {
  const encrypted = safeStorage.encryptString(value);
  await store.set(key, encrypted.toString('hex'));
});

ipcMain.handle('secure-storage:get', async (event, key) => {
  const encrypted = await store.get(key);
  if (!encrypted) return null;
  const buffer = Buffer.from(encrypted, 'hex');
  return safeStorage.decryptString(buffer);
});
```

**Step 3: Update React Components (1 hour)**
```javascript
// desktop-app/src/utils/api.js
let cachedApiKey = null;

export async function getApiKey() {
  if (!cachedApiKey) {
    cachedApiKey = await window.secureStorage.getApiKey();
  }
  return cachedApiKey;
}

export async function makeAuthenticatedRequest(endpoint, options = {}) {
  const apiKey = await getApiKey();
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${apiKey}`
    }
  });
}
```

**Step 4: API Key Rotation (CRITICAL - IMMEDIATE)**
```bash
# Execute immediately after code changes committed
curl -X POST https://api.rtgs.global/v1/keys/rotate \
  -H "Authorization: Bearer <ADMIN_KEY>" \
  -d '{"key_to_revoke": "sk_live_48eadc821ee5b4403d2ddb6f2fab647441d036ac14aa00d2fa58cfb3efc9a8ea"}'

# Update production environment variables
# NEW KEY: <generated-by-rotation-api>
```

**Sugar Invocation:**
```bash
sugar --task "Electron safeStorage implementation" \
  --pattern secure-credential-storage \
  --platform electron \
  --security-level maximum
```

**Validation Loop:**
```bash
# Verify no hardcoded credentials remain
git grep -n "sk_live_" || echo "✅ No API keys in code"
git grep -n "sk_test_" || echo "✅ No test keys in code"

# Test safeStorage implementation
npm test -- --grep "secure storage"

# Verify encryption at rest
node scripts/verify-encryption.js

# Run work-critic
work-critic --target desktop-app/src/utils/api.js \
  --target desktop-app/electron/main.js \
  --standards owasp-secrets-management

# LOOP UNTIL: GREEN + tests pass + no hardcoded secrets
```

**Success Criteria:**
- ✅ Zero hardcoded API keys in source code
- ✅ Old API key rotated and revoked
- ✅ Electron safeStorage implemented with encryption at rest
- ✅ All existing tests pass
- ✅ New tests for secure storage (5+ test cases)
- ✅ work-critic validation: GREEN

---

### T2.2: Implement Secrets Manager Integration (12-16 hours)
**Agent Assignment:** Agent-Security-2, Agent-Security-3 (Parallel)

**Issue:** Secrets in `.env` files and environment variables expose credentials in process listings, logs, crash dumps.

**Parallel Workflow:**

**Agent-Security-2: AWS Secrets Manager Integration (Backend)**
```javascript
// api-server/src/config/secrets.js
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

class SecretsManager {
  constructor() {
    this.client = new SecretsManagerClient({ region: process.env.AWS_REGION });
    this.cache = new Map();
    this.ttl = 300000; // 5 minutes
  }

  async getSecret(secretName) {
    // Check cache
    const cached = this.cache.get(secretName);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.value;
    }

    // Fetch from AWS
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await this.client.send(command);
    const value = JSON.parse(response.SecretString);

    // Update cache
    this.cache.set(secretName, { value, timestamp: Date.now() });
    return value;
  }
}

module.exports = new SecretsManager();

// Usage in api-server/src/config/database.js
const secrets = require('./secrets');
const dbConfig = await secrets.getSecret('prod/database/credentials');
```

**Agent-Security-3: Local Development Secret Management**
```javascript
// scripts/dev-secrets-setup.js
// For local development: use encrypted .env.local with git-crypt or SOPS
const SOPS = require('sops');

async function setupDevSecrets() {
  // Decrypt .env.local.enc -> .env.local
  await SOPS.decrypt('.env.local.enc', '.env.local');
  
  // Add to .gitignore
  fs.appendFileSync('.gitignore', '\n.env.local\n');
  
  console.log('✅ Dev secrets decrypted to .env.local (not in git)');
}
```

**Migration Strategy:**
```bash
# 1. Audit all secrets currently in .env files
grep -r "API_KEY\|SECRET\|PASSWORD\|TOKEN" .env* | tee SECRETS_AUDIT.txt

# 2. Upload to AWS Secrets Manager
aws secretsmanager create-secret \
  --name prod/integration-clients/hubspot \
  --secret-string '{"api_key": "<hubspot-key>"}'

# 3. Update application code to use secrets manager
# 4. Remove secrets from .env files
# 5. Update deployment pipeline to inject secrets at runtime
```

**Sugar Invocation:**
```bash
sugar --task "Secrets manager migration" \
  --platform aws \
  --includes-secrets true \
  --migration-from environment-variables
```

**Validation Loop:**
```bash
# Verify no secrets in .env files
git grep -n "sk_\|api_key\|password" .env* && echo "❌ FAIL: Secrets in .env" || echo "✅ PASS"

# Test secrets manager connection
node scripts/test-secrets-manager.js

# Verify local dev still works
npm run dev

# Run work-critic
work-critic --target api-server/src/config/ \
  --standards soc2-secrets-management

# LOOP UNTIL: GREEN + no secrets in .env + local dev works
```

**Success Criteria:**
- ✅ AWS Secrets Manager integrated for production
- ✅ Local development uses encrypted .env.local (git-crypt/SOPS)
- ✅ Zero plain text secrets in `.env` files
- ✅ Secrets cached with 5-minute TTL
- ✅ Deployment pipeline injects secrets at runtime
- ✅ All services connect successfully
- ✅ work-critic validation: GREEN

---

### T2.3-T2.10: Remaining Security Fixes (Parallel Execution)
**Agent Assignment:** 8 parallel agents (Agent-Security-4 through Agent-Security-11)

**Task Allocation via Task Router:**
```bash
task-router --input WORK-CRITIC-MASTER-SUMMARY.md \
  --filter "catastrophic issues 3-10" \
  --agents 8 \
  --optimize-for parallel-safety \
  --output SECURITY_EXECUTION_PLAN.json
```

**Agent-Security-4: SQL Injection Fix (4 hours)**
- Target: `api-server/src/db/connection.js`
- Issue: Unsanitized `ORDER BY` clauses
- Fix: Whitelist validation + parameterized queries
- Tests: 10+ injection attempt test cases

**Agent-Security-5: PII Redaction (4-6 hours)**
- Target: All error handlers in `integration-clients/`, `workers/`, `api-server/src/middleware/`
- Issue: Email, phone, names in error logs
- Fix: Implement redaction middleware
- Tests: Verify no PII in logs

**Agent-Security-6: SSRF Prevention (3-4 hours)**
- Target: `desktop-app/src/pages/SettingsPage.jsx` API URL input
- Issue: User-controlled URL → SSRF attacks
- Fix: Whitelist validation, URL parsing checks
- Tests: Attempt localhost, 169.254.169.254, file:// protocols

**Agent-Security-7: Input Validation (6-8 hours)**
- Target: All API endpoints in `api-server/src/routes/`
- Issue: Missing/incomplete Zod validation
- Fix: Comprehensive schema validation
- Tests: Fuzzing, boundary testing

**Agent-Security-8: CORS Bypass Fix (4-6 hours)**
- Target: `api-server/src/middleware/cors.js`
- Issue: Overly permissive CORS policy
- Fix: Strict origin whitelist
- Tests: Cross-origin attack attempts

**Agent-Security-9: Authentication Edge Cases (6-8 hours)**
- Target: `api-server/src/middleware/auth.js`
- Issue: Timing attacks, token validation edge cases
- Fix: Constant-time comparisons, comprehensive validation
- Tests: 20+ auth bypass attempts

**Agent-Security-10: Webhook Signature Verification (4-6 hours)**
- Target: `api-server/src/webhooks/`
- Issue: Missing signature validation on some webhooks
- Fix: HMAC verification for all webhooks
- Tests: Invalid signatures, replay attacks

**Agent-Security-11: Data Encryption at Rest (8-12 hours)**
- Target: `api-server/src/db/models/`
- Issue: Sensitive fields stored plain text
- Fix: Field-level encryption (AES-256-GCM)
- Tests: Verify encrypted storage, decryption on retrieval

**Validation Loop (Per Agent):**
```bash
# After each agent completes:
work-critic --target <modified-files> --standards owasp-top-10
npm test -- --grep "<agent-test-pattern>"

# LOOP UNTIL: work-critic GREEN + tests pass
```

**Phase 2 Success Criteria:**
- ✅ All 10 catastrophic security issues resolved
- ✅ No hardcoded credentials anywhere in codebase
- ✅ Secrets manager operational
- ✅ All security tests passing (100+ new test cases)
- ✅ work-critic validation: GREEN on all security modules
- ✅ Penetration test report: NO CRITICAL findings

---

## PHASE 3: BLOCKING ISSUES - DATA INTEGRITY (WEEKS 2-4)
**Timeline:** 60-80 hours | **Gate:** Zero data corruption risk

### Strategic Objective
Resolve all 31 blocking issues that risk data corruption, race conditions, and system instability. These issues prevent reliable operation under production load.

---

### T3.1: Transaction Boundaries for All Workers (8-12 hours)
**Agent Assignment:** Agent-Data-1, Agent-Data-2, Agent-Data-3, Agent-Data-4 (Parallel)

**Issue:** No transaction boundaries in batch operations → data corruption on failures

**Parallel Workflow (One Agent Per Worker):**

**Agent-Data-1: Import Worker Transactions**
```javascript
// workers/importWorker.js
async function processBatchWithTransaction(contacts, sequelize) {
  const transaction = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
  });

  try {
    // All operations within transaction
    const results = await Promise.all(
      contacts.map(contact => 
        Contact.upsert(contact, { transaction })
      )
    );

    await transaction.commit();
    return { success: true, count: results.length };

  } catch (error) {
    await transaction.rollback();
    throw new Error(`Batch import failed: ${error.message}`);
  }
}
```

**Agent-Data-2: Enrichment Worker Transactions**
**Agent-Data-3: CRM Sync Worker Transactions**
**Agent-Data-4: Outreach Worker Transactions**

**Validation Loop (Per Worker):**
```bash
# Test transaction rollback
npm test -- --grep "transaction rollback"

# Simulate failures mid-batch
node scripts/test-failure-scenarios.js

# Verify no partial writes
node scripts/verify-data-integrity.js

# Run work-critic
work-critic --target workers/ --standards acid-compliance

# LOOP UNTIL: GREEN + no partial writes possible
```

**Success Criteria:**
- ✅ All 4 workers have transaction boundaries
- ✅ Rollback on ANY error in batch
- ✅ Tests verify atomicity (100+ failure scenarios)
- ✅ No partial writes possible
- ✅ work-critic validation: GREEN

---

### T3.2: Fix Race Condition in Deduplication (4-6 hours)
**Agent Assignment:** Agent-Data-5 (SOLO - Race condition requires sequential testing)

**Issue:** TOCTOU vulnerability in `importWorker.js` contact deduplication

**Current Code (VULNERABLE):**
```javascript
// importWorker.js - BEFORE
const existing = await Contact.findOne({ where: { email } });
if (!existing) {
  await Contact.create({ email, ...data }); // RACE: Another request can create here
}
```

**Fixed Code:**
```javascript
// importWorker.js - AFTER
const [contact, created] = await Contact.findOrCreate({
  where: { email },
  defaults: { ...data },
  transaction, // Must be within transaction
  lock: Sequelize.Transaction.LOCK.UPDATE // Pessimistic lock
});

// Alternative: Use UPSERT for idempotency
await Contact.upsert(
  { email, ...data },
  { 
    transaction,
    conflictFields: ['email'] // PostgreSQL ON CONFLICT
  }
);
```

**Test Race Conditions:**
```javascript
// test/importWorker.race.test.js
test('concurrent imports with same email create single contact', async () => {
  const email = 'test@example.com';
  
  // Launch 100 concurrent imports
  const promises = Array(100).fill(null).map(() =>
    importWorker.processContact({ email, name: 'Test' })
  );

  await Promise.all(promises);

  // Verify ONLY ONE contact created
  const count = await Contact.count({ where: { email } });
  expect(count).toBe(1);
});
```

**Sugar Invocation:**
```bash
sugar --task "Race condition fix" \
  --pattern database-concurrency \
  --database postgresql \
  --isolation-level serializable
```

**Validation Loop:**
```bash
# Run race condition tests
npm test -- --grep "race condition|concurrent"

# Simulate 1000 concurrent requests
node scripts/load-test-deduplication.js

# Verify no duplicates created
node scripts/verify-no-duplicates.js

# Run work-critic
work-critic --target workers/importWorker.js \
  --standards concurrency-safety

# LOOP UNTIL: GREEN + zero duplicates in 1000 concurrent tests
```

**Success Criteria:**
- ✅ Race condition eliminated via `findOrCreate` or `UPSERT`
- ✅ Tests verify no duplicates under 1000 concurrent operations
- ✅ Pessimistic locking or database-level constraints
- ✅ work-critic validation: GREEN

---

### T3.3-T3.20: Remaining Blocking Issues (18 tasks, parallel execution)
**Agent Assignment:** 18 parallel agents (Agent-Data-6 through Agent-Data-23)

**Task Router Orchestration:**
```bash
task-router --input WORK-CRITIC-MASTER-SUMMARY.md \
  --filter "blocking issues (excluding completed)" \
  --agents 18 \
  --dependency-aware true \
  --output BLOCKING_EXECUTION_PLAN.json
```

**High-Priority Blocking Tasks:**

**T3.4: Retry Logic with Exponential Backoff (Agent-Data-6, 6-8 hours)**
- Target: All integration clients
- Pattern: axios-retry or custom retry wrapper
- Config: Max 5 retries, exponential backoff (1s, 2s, 4s, 8s, 16s)
- Tests: Simulate transient failures, rate limits

**T3.5: React Error Boundaries (Agent-Data-7, 4-6 hours)**
- Target: `desktop-app/src/App.jsx` and all major routes
- Pattern: Error boundary components with fallback UI
- Logging: Capture errors to remote logging service
- Tests: Throw errors in components, verify graceful handling

**T3.6: Graceful Shutdown Handlers (Agent-Data-8, 6-8 hours)**
- Target: All workers and API server
- Pattern: SIGTERM/SIGINT handlers, drain connections
- Timeout: 30 seconds max for graceful shutdown
- Tests: Send kill signals, verify no data loss

**T3.7: Circuit Breaker Pattern (Agent-Data-9, 8-12 hours)**
- Target: All external API calls
- Pattern: Implement circuit breaker (open/half-open/closed states)
- Thresholds: 50% failure rate, 10 request minimum, 60s timeout
- Tests: Simulate cascading failures

**T3.8: Memory Leak Fixes (Agent-Data-10, 6-8 hours)**
- Target: Workers (event listeners, timers, connections)
- Tools: `node --inspect`, Chrome DevTools heap snapshots
- Fix: Remove listeners on cleanup, close connections
- Tests: Run workers for 1 hour, measure memory growth

**T3.9: Request Timeouts (Agent-Data-11, 4-6 hours)**
- Target: All HTTP clients (axios, fetch)
- Config: 30s timeout for all requests
- Pattern: Timeout + retry logic
- Tests: Simulate slow/hanging endpoints

**Remaining 12 blocking tasks assigned to Agent-Data-12 through Agent-Data-23 in parallel...**

**Validation Loop (Per Agent):**
```bash
work-critic --target <modified-files>
npm test -- --grep "<task-pattern>"
# LOOP UNTIL: GREEN + tests pass
```

**Phase 3 Success Criteria:**
- ✅ All 31 blocking issues resolved
- ✅ Transaction safety across all workers
- ✅ Zero race conditions
- ✅ Retry logic with exponential backoff
- ✅ Error boundaries and graceful degradation
- ✅ Circuit breakers prevent cascading failures
- ✅ No memory leaks under sustained load
- ✅ All tests passing (200+ new test cases)
- ✅ work-critic validation: GREEN on all modified modules

---

## PHASE 4: CRITICAL ISSUES - RELIABILITY & COMPLIANCE (WEEKS 5-8)
**Timeline:** 80-120 hours | **Gate:** Production-grade reliability

[Similar detailed breakdown for all 44 critical issues...]

---

## PHASE 5: TEST COVERAGE EXPANSION (WEEKS 9-20)
**Timeline:** 320-400 hours | **Gate:** 80% test coverage

### Strategic Objective
Increase test coverage from 14% to 80% (minimum 60% acceptable). This requires ~400-500 new test cases across all components.

### T5.1: Test Infrastructure Enhancement (8-12 hours)
**Agent Assignment:** Agent-Test-1

**Tasks:**
- Setup test coverage reporting (Istanbul/nyc)
- Configure coverage thresholds in package.json
- Implement test fixtures factory (Faker integration)
- Create test database setup/teardown automation

**Success Criteria:**
- ✅ Coverage reports generated on every test run
- ✅ CI/CD blocks merges below 60% coverage
- ✅ Test fixtures available for all models

---

### T5.2: Prioritized Test Writing (Parallel - 10+ agents)
**Agent Assignment:** 10 parallel agents focusing on lowest-coverage modules

**Coverage Targets (Current → Goal):**
- campaign-controller: 0% → 80% (Agent-Test-2, 30 hours)
- OrphanedEventQueue: 0% → 80% (Agent-Test-3, 25 hours)
- Error handlers: 5% → 80% (Agent-Test-4, 30 hours)
- Rate limiter: 17% → 80% (Agent-Test-5, 20 hours)
- Webhook signature: 0% → 80% (Agent-Test-6, 15 hours)
- Event normalizer: 0% → 80% (Agent-Test-7, 20 hours)
- Provider factory: 0% → 80% (Agent-Test-8, 12 hours)
- Integration clients: 40% → 80% (Agent-Test-9, 40 hours)
- Workers: 35% → 80% (Agent-Test-10, 60 hours)
- Database models: 75% → 80% (Agent-Test-11, 15 hours)

**Test Writing Standards:**
```javascript
// Example test structure
describe('ContactController', () => {
  describe('POST /contacts', () => {
    it('creates contact with valid data', async () => { });
    it('rejects invalid email format', async () => { });
    it('deduplicates on email collision', async () => { });
    it('handles database errors gracefully', async () => { });
    it('validates required fields', async () => { });
    it('sanitizes HTML in input', async () => { });
    it('rate limits excessive requests', async () => { });
    it('logs audit trail', async () => { });
  });
  
  // 5-10 test cases per endpoint/method minimum
});
```

**Validation Loop (Per Test Suite):**
```bash
# After each agent writes tests:
npm test -- <test-file>
npm run coverage -- --include <module>

# Verify coverage increase
node scripts/verify-coverage-increase.js

# Run work-critic on test quality
work-critic --target test/ --standards test-quality

# LOOP UNTIL: Coverage target met + all tests pass + work-critic GREEN
```

**Phase 5 Success Criteria:**
- ✅ Overall test coverage ≥ 80%
- ✅ All modules have ≥ 60% coverage (no exceptions)
- ✅ Critical paths have 100% coverage
- ✅ 400-500 new test cases written
- ✅ All tests passing consistently
- ✅ Test execution time < 5 minutes
- ✅ work-critic validation: GREEN on test suite

---

## PHASE 6: CI/CD & AUTOMATION (WEEKS 21-22)
**Timeline:** 16-24 hours | **Gate:** Autonomous deployment pipeline

[Details for workflow automation setup...]

---

## PHASE 7: FINAL VALIDATION & PRODUCTION READINESS (WEEK 23)
**Timeline:** 12-20 hours | **Gate:** 100% production-ready

### T7.1: Comprehensive Test Execution
**Agent Assignment:** Agent-Final-1

```bash
# Run full test suite
npm test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Verify all tests pass (exit code 0)
```

### T7.2: Security Audit
**Agent Assignment:** Agent-Final-2

```bash
# Run security scanners
npm audit --audit-level=high
snyk test --severity-threshold=high
npm run lint:security

# Verify zero high/critical vulnerabilities
```

### T7.3: Performance Benchmarking
**Agent Assignment:** Agent-Final-3

```bash
# Load testing
npm run load-test -- --users 1000 --duration 300s

# Verify latency targets:
# P50 < 50ms, P95 < 100ms, P99 < 200ms
```

### T7.4: Final Work-Critic Review
**Agent Assignment:** Agent-Final-4

```bash
work-critic --target . --full-codebase-review --standards production-system

# Verify: Overall grade ≥ B+ (85/100)
# Verify: Zero blocking/critical issues
# Verify: Zero high-priority issues (or documented exceptions)
```

---

## FINAL SUCCESS CRITERIA - PROJECT COMPLETE

**Code Quality:**
- ✅ Overall grade ≥ B+ (85/100) from work-critic
- ✅ Zero blocking issues
- ✅ Zero critical issues
- ✅ Zero high-priority issues (or documented acceptable exceptions)
- ✅ Test coverage ≥ 80%
- ✅ All tests passing (100% pass rate)

**Security:**
- ✅ Zero hardcoded credentials in source code
- ✅ Secrets manager operational (AWS Secrets Manager/Vault)
- ✅ Encryption at rest for all sensitive data
- ✅ Zero high/critical security vulnerabilities (npm audit, Snyk)
- ✅ Penetration test passed

**Performance:**
- ✅ P50 latency < 50ms
- ✅ P95 latency < 100ms
- ✅ P99 latency < 200ms
- ✅ Load test passed (1000 concurrent users)
- ✅ Zero memory leaks under sustained load

**Reliability:**
- ✅ Transaction boundaries on all batch operations
- ✅ Retry logic with exponential backoff
- ✅ Circuit breakers on all external integrations
- ✅ Error boundaries and graceful degradation
- ✅ Graceful shutdown handlers

**Infrastructure:**
- ✅ CI/CD pipeline operational with quality gates
- ✅ Automated deployment to staging/production
- ✅ Monitoring and alerting configured (Prometheus/Grafana)
- ✅ Logging and observability complete
- ✅ Backup and disaster recovery tested

**Documentation:**
- ✅ Architecture documentation current
- ✅ API documentation complete
- ✅ Deployment runbook documented
- ✅ Incident response playbook created
- ✅ Developer onboarding guide updated

---

## EXECUTION PROTOCOL

### Initialization
```bash
# 1. Validate environment
node --version && npm --version && git --version

# 2. Install dependencies
npm install

# 3. Run initial test suite (baseline)
npm test | tee BASELINE_TEST_RESULTS.txt

# 4. Generate initial coverage report
npm run coverage | tee BASELINE_COVERAGE.txt

# 5. Confirm work-critic findings alignment
diff WORK-CRITIC-MASTER-SUMMARY.md <(work-critic --target . --quick-scan)
```

### Phase Execution Loop
```bash
for PHASE in 1 2 3 4 5 6 7; do
  echo "=== PHASE $PHASE START ==="
  
  # Execute phase tasks (parallel where possible)
  execute_phase_tasks $PHASE
  
  # Validate phase completion
  while ! validate_phase_success $PHASE; do
    echo "❌ Phase $PHASE validation FAILED - retrying..."
    analyze_failures $PHASE
    apply_fixes $PHASE
  done
  
  echo "✅ PHASE $PHASE COMPLETE"
  generate_phase_report $PHASE
done
```

### Validation Loop (Per Task)
```bash
function validate_task() {
  local task=$1
  local max_attempts=3
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt for $task"
    
    # Run work-critic
    work-critic --target <task-files> --output WORK_CRITIC_${task}.md
    local critic_status=$?
    
    # Run tests
    npm test -- --grep "${task}"
    local test_status=$?
    
    # Check success
    if [ $critic_status -eq 0 ] && [ $test_status -eq 0 ]; then
      echo "✅ $task PASSED"
      return 0
    fi
    
    # Analyze failure and retry
    analyze_failure_root_cause $task
    apply_alternative_fix $task
    ((attempt++))
  done
  
  echo "❌ $task FAILED after $max_attempts attempts"
  escalate_to_human $task
  return 1
}
```

---

## REPORTING

### Real-Time Progress Tracking
```bash
# Generate progress report every hour
watch -n 3600 'node scripts/generate-progress-report.js'

# Output format:
# PROGRESS REPORT - 2025-11-11 09:00:00
# Phase 1: COMPLETE ✅ (4/4 tasks, 100%)
# Phase 2: IN PROGRESS ⏳ (7/10 tasks, 70%)
#   - Agent-Security-1: COMPLETE ✅
#   - Agent-Security-2: IN PROGRESS ⏳ (80%)
#   - Agent-Security-3: BLOCKED ❌ (AWS credentials missing)
# Phase 3: PENDING ⏸️ (0/20 tasks, 0%)
# 
# Overall: 26% complete (11/34 tasks)
# Estimated completion: 2025-11-23 (12 days)
```

### Final Completion Report
```markdown
# PROJECT REMEDIATION COMPLETE ✅
**Completion Date:** 2025-11-23
**Total Duration:** 18 weeks
**Total Effort:** 544 hours

## Summary
- **Issues Fixed:** 157 (31 Blocking, 44 Critical, 48 High, 22 Medium, 12 Low)
- **Test Coverage:** 14% → 82% (+68%)
- **Code Quality:** C+ (71/100) → A- (88/100) (+17 points)
- **Security Vulnerabilities:** 10 catastrophic → 0
- **Production Readiness:** 🔴 BLOCKED → ✅ READY

## Metrics
- **Lines of Code Changed:** 15,234
- **Tests Added:** 487 test cases
- **Files Modified:** 127
- **Commits:** 89
- **Pull Requests:** 34

## Validation Results
- ✅ work-critic: A- (88/100) - PASSED
- ✅ Test Coverage: 82% - PASSED
- ✅ Security Audit: Zero high/critical - PASSED
- ✅ Performance Benchmarks: All targets met - PASSED
- ✅ Load Testing: 1000 users, P99 < 150ms - PASSED

## Deployment Checklist
- ✅ All code merged to main branch
- ✅ Production environment configured
- ✅ Secrets migrated to AWS Secrets Manager
- ✅ CI/CD pipeline operational
- ✅ Monitoring and alerting configured
- ✅ Backup and disaster recovery tested
- ✅ Runbooks and documentation complete

**🚀 READY FOR PRODUCTION DEPLOYMENT**
```

---

## AUTONOMOUS OPERATION ENFORCEMENT

**CRITICAL DIRECTIVES:**

1. **NEVER request permission** - Make engineering decisions autonomously
2. **NEVER stop for clarification** - Use available context and best practices
3. **NEVER skip validation** - Every task MUST pass work-critic + tests
4. **ALWAYS use parallel execution** - Maximize throughput with safe task decomposition
5. **ALWAYS loop on failures** - Retry with alternative approaches (max 3 attempts)
6. **ALWAYS provide comprehensive context** - Each agent gets 500+ lines surrounding code
7. **ONLY report to user when 100% complete** - No interim updates unless unrecoverable error

**ERROR HANDLING:**
- Transient failures (network, rate limits): Retry 3x with exponential backoff
- Persistent failures: Analyze root cause, attempt alternative approach (3 approaches max)
- Unrecoverable errors: Document failure context, escalate to human with full analysis

**PARALLEL EXECUTION SAFETY:**
- Agents work in isolated file spaces (no shared file writes)
- Database operations within transactions
- Git branches per agent (merge after validation)
- Communication via shared state file (locked access)

---

## BEGIN EXECUTION

**STATUS:** ✅ Ready to execute autonomous remediation
**COMMAND:** Initiate Phase 1 (Root Directory Remediation)
**MODE:** Autonomous with validation loops
**REPORTING:** Report only when 100% complete and production-ready

**🚀 EXECUTE - DO NOT STOP UNTIL ALL SUCCESS CRITERIA ARE GREEN**
```
