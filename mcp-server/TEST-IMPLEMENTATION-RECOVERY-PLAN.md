# Test Implementation Recovery Plan
## Fixing Critical Issues & Getting Tests Running

**Created**: 2025-01-11
**Status**: READY TO EXECUTE
**Estimated Time**: 6-8 hours for Phase 1 (Critical Fixes)

---

## Executive Summary

Work-critic identified **3 CRITICAL BLOCKERS** preventing test execution:
1. ES module import error in `api-server.js`
2. Incorrect model initialization in test infrastructure
3. Fixture schema mismatches

This plan provides a systematic approach to fix these issues with verification at each step to prevent further errors.

---

## Phase 1: Critical Fixes (3-4 hours)

### Task 1.1: Fix ES Module Import in api-server.js ⛔ P0
**File**: `src/api-server.js:72`
**Issue**: Uses `require()` for ES module
**Impact**: Prevents test file from loading

#### Step-by-Step:
1. **Read current state** (Verification)
   ```bash
   grep -n "require.*connection" src/api-server.js
   ```

2. **Check if connection.js is ES module**
   ```bash
   head -5 src/db/connection.js | grep -E "export|import"
   ```

3. **Make the fix**
   ```javascript
   // BEFORE (Line 72):
   const { sequelize } = require('./db/connection.js');

   // AFTER:
   import { sequelize } from './db/connection.js';
   ```

   **CRITICAL**: This import must be at the TOP of the file, not in the middle

4. **Verify no other require() for ES modules**
   ```bash
   grep -n "require(.*\.js')" src/api-server.js
   ```

5. **Test the fix**
   ```bash
   node --check src/api-server.js
   ```

6. **Verify API server still runs**
   ```bash
   npm run api-server --timeout 5000
   # Should start without syntax errors
   ```

**Success Criteria**:
- ✅ No syntax errors in api-server.js
- ✅ API server starts successfully
- ✅ No `require()` statements for `.js` files

**Rollback Plan**: Keep backup of original file before editing

---

### Task 1.2: Understand Actual Model Structure ⛔ P0
**Goal**: Document exact model schemas before fixing tests

#### Step-by-Step:

1. **Examine CampaignTemplate.cjs**
   ```bash
   grep -A 50 "define.*CampaignTemplate" src/models/CampaignTemplate.cjs
   ```

   **Document**:
   - Exact field names
   - Required vs optional
   - Data types
   - Default values

2. **Examine CampaignInstance.cjs**
   ```bash
   grep -A 100 "define.*CampaignInstance" src/models/CampaignInstance.cjs
   ```

   **Verify**:
   - ✅ total_delivered exists (added in Phase 6B)
   - ✅ All counter fields present
   - ✅ Settings JSONB structure

3. **Examine CampaignEnrollment.cjs**
   ```bash
   grep -A 80 "define.*CampaignEnrollment" src/models/CampaignEnrollment.cjs
   ```

4. **Examine CampaignEvent.cjs**
   ```bash
   grep -A 60 "define.*CampaignEvent" src/models/CampaignEvent.cjs
   ```

5. **Check model factory pattern**
   ```bash
   tail -5 src/models/CampaignTemplate.cjs
   ```

   **Expected**: `module.exports = (sequelize) => { ... };`

6. **Create schema reference document**
   Create `tests/SCHEMA-REFERENCE.md` with exact field definitions

**Success Criteria**:
- ✅ Complete documentation of all 4 model schemas
- ✅ Understanding of factory pattern
- ✅ List of required vs optional fields
- ✅ Reference document created

**Deliverable**: `tests/SCHEMA-REFERENCE.md`

---

### Task 1.3: Rewrite test-server.js Correctly ⛔ P0
**File**: `tests/helpers/test-server.js`
**Issue**: Incorrect model initialization pattern

#### Step-by-Step:

1. **Study existing model initialization**
   ```bash
   grep -A 30 "sequelize.define" src/models/CampaignTemplate.cjs
   ```

2. **Check how api-server.js initializes models**
   ```bash
   grep -B 5 -A 10 "models" src/api-server.js
   ```

3. **Create new test-server.js approach**

   **Strategy**: Don't instantiate full API server, create minimal Express app

   ```javascript
   /**
    * CORRECT APPROACH:
    * 1. Create Sequelize instance with in-memory SQLite
    * 2. Import model factory functions (not classes)
    * 3. Initialize each model with sequelize instance
    * 4. Set up associations
    * 5. Sync database
    * 6. Return models + sequelize
    */
   ```

4. **Implementation template**:
   ```javascript
   import { Sequelize } from 'sequelize';

   // Import model factories (CommonJS)
   import { createRequire } from 'module';
   const require = createRequire(import.meta.url);

   const CampaignTemplateFactory = require('../../src/models/CampaignTemplate.cjs');
   const CampaignInstanceFactory = require('../../src/models/CampaignInstance.cjs');
   const CampaignEnrollmentFactory = require('../../src/models/CampaignEnrollment.cjs');
   const CampaignEventFactory = require('../../src/models/CampaignEvent.cjs');

   export async function createTestDatabase() {
     const sequelize = new Sequelize('sqlite::memory:', {
       logging: false
     });

     // Initialize models using factories
     const CampaignTemplate = CampaignTemplateFactory(sequelize);
     const CampaignInstance = CampaignInstanceFactory(sequelize);
     const CampaignEnrollment = CampaignEnrollmentFactory(sequelize);
     const CampaignEvent = CampaignEventFactory(sequelize);

     // Associations are defined in model files
     // Just need to sync
     await sequelize.sync({ force: true });

     return sequelize;
   }
   ```

5. **Write tests for test-server.js itself**
   ```javascript
   // tests/helpers/test-server.test.js
   import { createTestDatabase } from './test-server.js';

   test('createTestDatabase initializes all models', async () => {
     const sequelize = await createTestDatabase();

     expect(sequelize.models.CampaignTemplate).toBeDefined();
     expect(sequelize.models.CampaignInstance).toBeDefined();
     expect(sequelize.models.CampaignEnrollment).toBeDefined();
     expect(sequelize.models.CampaignEvent).toBeDefined();

     await sequelize.close();
   });
   ```

6. **Test the rewritten file**
   ```bash
   npm test -- test-server.test.js
   ```

**Success Criteria**:
- ✅ Models initialize without errors
- ✅ All 4 models accessible via `sequelize.models`
- ✅ Database tables created
- ✅ No "getAttributes is not a function" errors
- ✅ Test-server test passes

**Verification Commands**:
```bash
# Should not throw
node -e "import('./tests/helpers/test-server.js').then(m => console.log('OK'))"
```

---

### Task 1.4: Fix Fixture Schemas ⛔ P1
**File**: `tests/helpers/fixtures.js`
**Issue**: Field names don't match actual models

#### Step-by-Step:

1. **Use SCHEMA-REFERENCE.md from Task 1.2**

2. **Fix createTemplateFixture()**

   **Before**:
   ```javascript
   campaign_type: faker.helpers.arrayElement(['email', 'linkedin']),
   provider: faker.helpers.arrayElement(['lemlist']),
   workflow_steps: [...]
   ```

   **After** (using actual schema):
   ```javascript
   // Reference: src/models/CampaignTemplate.cjs actual fields
   type: faker.helpers.arrayElement(['email', 'linkedin', 'multi_channel']),
   path_type: faker.helpers.arrayElement(['structured', 'dynamic_ai']),
   icp_profile_id: faker.string.uuid(),
   settings: {
     lemlist_campaign_id: faker.string.alphanumeric(10),
     // ... other actual settings
   }
   ```

3. **Fix createInstanceFixture()**

   **Verify includes**:
   - ✅ total_delivered (added in Phase 6B)
   - ✅ All counter fields match CampaignInstance.cjs
   - ✅ Settings structure matches schema

4. **Fix createEnrollmentFixture()**

   **Verify**:
   - ✅ contact_data structure matches JSONB schema
   - ✅ All required fields present

5. **Fix createEventFixture()**

   **Verify**:
   - ✅ event_type enum matches model definition
   - ✅ channel enum matches model definition

6. **Test each fixture**
   ```javascript
   // tests/helpers/fixtures.test.js
   test('createTemplateFixture creates valid template', async () => {
     const sequelize = await createTestDatabase();
     const fixture = createTemplateFixture();

     // Should not throw validation error
     const template = await sequelize.models.CampaignTemplate.create(fixture);
     expect(template.id).toBeDefined();

     await sequelize.close();
   });
   ```

7. **Run fixture tests**
   ```bash
   npm test -- fixtures.test.js
   ```

**Success Criteria**:
- ✅ All fixtures create valid records
- ✅ No validation errors
- ✅ All required fields present
- ✅ Field names match schemas exactly

---

## Phase 2: Get Webhook Tests Running (2-3 hours)

### Task 2.1: Simplify Webhook Tests for First Pass
**File**: `tests/campaigns-webhooks.test.js`

#### Step-by-Step:

1. **Create minimal working test first**
   ```javascript
   // tests/campaigns-webhooks-simple.test.js
   import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
   import { createTestDatabase, getTestModels } from './helpers/test-server.js';
   import { createCompleteCampaign } from './helpers/fixtures.js';

   describe('Webhook Tests - Minimal', () => {
     let sequelize, models;

     beforeAll(async () => {
       sequelize = await createTestDatabase();
       models = getTestModels(sequelize);
     });

     afterAll(async () => {
       await sequelize.close();
     });

     it('should create campaign with enrollments', async () => {
       const { template, instance, enrollments } = await createCompleteCampaign(sequelize, {
         enrollmentCount: 5
       });

       expect(template.id).toBeDefined();
       expect(instance.id).toBeDefined();
       expect(enrollments).toHaveLength(5);
     });

     it('should create event for enrollment', async () => {
       const { enrollments } = await createCompleteCampaign(sequelize);
       const enrollment = enrollments[0];

       const event = await models.CampaignEvent.create({
         enrollment_id: enrollment.id,
         user_id: enrollment.user_id,
         event_type: 'sent',
         channel: 'email',
         timestamp: new Date(),
         provider_event_id: 'test_evt_123'
       });

       expect(event.id).toBeDefined();
       expect(event.provider_event_id).toBe('test_evt_123');
     });
   });
   ```

2. **Run simple tests**
   ```bash
   npm test -- campaigns-webhooks-simple.test.js
   ```

3. **Only after simple tests pass, add HTTP tests**

   **Create Express app wrapper**:
   ```javascript
   // tests/helpers/test-app.js
   import express from 'express';
   import campaignRoutes from '../../src/routes/campaigns.js';

   export function createTestApp(sequelize) {
     const app = express();
     app.use(express.json());

     // Mount routes
     app.use('/api/campaigns', campaignRoutes);

     return app;
   }
   ```

4. **Add HTTP tests incrementally**

   **Start with authenticated route**:
   ```javascript
   it('should reject webhook without signature', async () => {
     const response = await request(app)
       .post('/api/campaigns/events/webhook')
       .send({ enrollment_id: 'test' });

     expect(response.status).toBe(401);
   });
   ```

5. **Add webhook signature tests**
   ```javascript
   it('should accept webhook with valid Lemlist signature', async () => {
     const payload = { /* valid payload */ };
     const rawPayload = JSON.stringify(payload);
     const signature = crypto.createHmac('sha256', WEBHOOK_SECRET)
       .update(rawPayload)
       .digest('hex');

     const response = await request(app)
       .post('/api/campaigns/events/webhook')
       .set('X-Lemlist-Signature', signature)
       .set('X-Webhook-Provider', 'lemlist')
       .send(payload);

     expect(response.status).toBe(201);
   });
   ```

**Success Criteria**:
- ✅ Simple database tests pass (5+ tests)
- ✅ HTTP tests pass (3+ tests)
- ✅ Webhook signature tests pass (2+ tests)
- ✅ No import errors
- ✅ No model initialization errors

---

### Task 2.2: Add Verification at Each Test
**Goal**: Catch errors early, not after full test run

#### Implementation Pattern:

```javascript
describe('Event Deduplication', () => {
  beforeEach(async () => {
    // VERIFY: Database is clean
    const count = await models.CampaignEvent.count();
    expect(count).toBe(0);
  });

  it('should deduplicate events with same provider_event_id', async () => {
    // VERIFY: Enrollment exists
    const { enrollments } = await createCompleteCampaign(sequelize);
    expect(enrollments[0]).toBeDefined();

    const eventPayload = {
      enrollment_id: enrollments[0].id,
      event_type: 'sent',
      channel: 'email',
      provider_event_id: 'duplicate_test_123',
      timestamp: new Date().toISOString()
    };

    // Create event twice
    const event1 = await models.CampaignEvent.create(eventPayload);

    // VERIFY: First creation succeeded
    expect(event1.id).toBeDefined();

    // Second creation with same provider_event_id
    const [event2, created] = await models.CampaignEvent.findOrCreate({
      where: { provider_event_id: 'duplicate_test_123' },
      defaults: eventPayload
    });

    // VERIFY: Deduplication worked
    expect(created).toBe(false);
    expect(event2.id).toBe(event1.id);

    // VERIFY: Only 1 event in database
    const count = await models.CampaignEvent.count();
    expect(count).toBe(1);
  });
});
```

**Benefits**:
- Errors show exact point of failure
- Easy to debug which step failed
- Validates assumptions at each stage

---

## Phase 3: Error Prevention Strategy (1-2 hours)

### Strategy 3.1: Schema Validation Tests

**Create**: `tests/schema-validation.test.js`

```javascript
import { describe, it, expect } from '@jest/globals';
import { createTestDatabase } from './helpers/test-server.js';
import {
  createTemplateFixture,
  createInstanceFixture,
  createEnrollmentFixture,
  createEventFixture
} from './helpers/fixtures.js';

describe('Schema Validation - Fixtures Match Models', () => {
  let sequelize, models;

  beforeAll(async () => {
    sequelize = await createTestDatabase();
    models = sequelize.models;
  });

  it('createTemplateFixture creates valid template', async () => {
    const fixture = createTemplateFixture();

    // Should not throw
    const template = await models.CampaignTemplate.create(fixture);
    expect(template.id).toBeDefined();

    // Verify all fields present
    expect(template.type).toBeDefined();
    expect(template.path_type).toBeDefined();
  });

  it('createInstanceFixture creates valid instance', async () => {
    const template = await models.CampaignTemplate.create(createTemplateFixture());
    const fixture = createInstanceFixture({ template_id: template.id });

    const instance = await models.CampaignInstance.create(fixture);
    expect(instance.id).toBeDefined();
    expect(instance.total_delivered).toBeDefined(); // Added in Phase 6B
  });

  // ... more validation tests
});
```

**Run before every commit**:
```bash
npm test -- schema-validation.test.js
```

---

### Strategy 3.2: Pre-commit Hook

**Create**: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running schema validation tests..."
npm test -- schema-validation.test.js

if [ $? -ne 0 ]; then
  echo "❌ Schema validation failed! Fixtures don't match models."
  echo "Run: npm test -- schema-validation.test.js"
  exit 1
fi

echo "✅ Schema validation passed"
```

**Setup**:
```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm test -- schema-validation.test.js"
```

---

### Strategy 3.3: Documentation Standards

**Create**: `tests/README.md`

```markdown
# Test Suite Documentation

## Writing Tests - Rules

### RULE 1: Always verify fixtures match models
Before creating any fixture, check the actual model file:
```bash
grep -A 50 "define.*ModelName" src/models/ModelName.cjs
```

### RULE 2: Use schema validation tests
After creating/updating fixtures, run:
```bash
npm test -- schema-validation.test.js
```

### RULE 3: Verify at each step
Add verification after each critical operation:
```javascript
const instance = await models.CampaignInstance.create(fixture);
expect(instance.id).toBeDefined(); // VERIFY: Creation succeeded
```

### RULE 4: Test test infrastructure
Before writing tests, ensure infrastructure works:
```bash
npm test -- test-server.test.js
npm test -- fixtures.test.js
```

### RULE 5: Incremental testing
Don't write all tests at once. Test each component:
1. Database operations only
2. Add HTTP layer
3. Add authentication
4. Add full integration
```

---

### Strategy 3.4: Continuous Verification Script

**Create**: `scripts/verify-tests.sh`

```bash
#!/bin/bash
set -e

echo "🔍 Test Infrastructure Verification"
echo "===================================="
echo ""

echo "Step 1: Checking syntax..."
node --check src/api-server.js
node --check tests/helpers/test-server.js
echo "✅ Syntax OK"
echo ""

echo "Step 2: Testing database initialization..."
npm test -- test-server.test.js --silent
echo "✅ Database OK"
echo ""

echo "Step 3: Testing fixtures..."
npm test -- fixtures.test.js --silent
echo "✅ Fixtures OK"
echo ""

echo "Step 4: Testing schema validation..."
npm test -- schema-validation.test.js --silent
echo "✅ Schema validation OK"
echo ""

echo "Step 5: Running simple webhook tests..."
npm test -- campaigns-webhooks-simple.test.js --silent
echo "✅ Simple tests OK"
echo ""

echo "✅✅✅ All verification passed!"
echo ""
echo "Safe to run full test suite:"
echo "  npm test"
```

**Usage**:
```bash
chmod +x scripts/verify-tests.sh
./scripts/verify-tests.sh
```

---

## Phase 4: Full Test Suite Implementation (2-3 days)

### Task 4.1: Complete Webhook Tests
**After** Phase 1-3 complete and verified

1. Add all 26 test cases from `campaigns-webhooks.test.js`
2. Run incrementally, verify each section passes
3. Add concurrency tests last (most complex)

### Task 4.2: Enrollment Tests (via Plugin)
1. Use `/api-test-automation:api-tester` plugin
2. Focus on race conditions
3. Verify with load testing

### Task 4.3: Security Tests (via Plugin)
1. Use `/security-test-scanner:scan` plugin
2. Verify all 10 critical fixes from Phase 6B

### Task 4.4: Performance Tests (via Plugin)
1. Use `/performance-test-suite:load-test` plugin
2. Verify requirements met (1000 enrollments < 5s)

### Task 4.5: Business Logic Tests
1. Manual implementation
2. Focus on metrics calculation accuracy
3. Verify delivery_rate = (delivered / sent) * 100
4. Verify open_rate = (opened / delivered) * 100

---

## Execution Checklist

### Before Starting:
- [ ] Read this entire plan
- [ ] Understand why each step is necessary
- [ ] Have rollback strategy ready
- [ ] Backup critical files

### Phase 1 (Critical Fixes):
- [ ] Task 1.1: Fix ES module import
- [ ] Task 1.2: Document model schemas
- [ ] Task 1.3: Rewrite test-server.js
- [ ] Task 1.4: Fix fixture schemas
- [ ] Verify: Run `./scripts/verify-tests.sh`

### Phase 2 (Webhook Tests):
- [ ] Task 2.1: Simple tests pass
- [ ] Task 2.2: HTTP tests pass
- [ ] Task 2.3: Signature tests pass
- [ ] Verify: `npm test -- campaigns-webhooks-simple.test.js`

### Phase 3 (Error Prevention):
- [ ] Strategy 3.1: Schema validation tests
- [ ] Strategy 3.2: Pre-commit hook
- [ ] Strategy 3.3: Documentation
- [ ] Strategy 3.4: Verification script
- [ ] Verify: All checks pass

### Phase 4 (Full Suite):
- [ ] Task 4.1: Complete webhook tests (26 tests)
- [ ] Task 4.2: Enrollment tests (plugin)
- [ ] Task 4.3: Security tests (plugin)
- [ ] Task 4.4: Performance tests (plugin)
- [ ] Task 4.5: Business logic tests
- [ ] Verify: Coverage >80%

---

## Success Metrics

### After Phase 1:
- ✅ API server starts without errors
- ✅ Test infrastructure loads without errors
- ✅ Schema validation tests pass (100%)
- ✅ Fixture tests pass (100%)

### After Phase 2:
- ✅ Simple webhook tests pass (5+ tests)
- ✅ HTTP tests pass (3+ tests)
- ✅ Signature tests pass (2+ tests)
- ✅ Total: 10+ tests passing

### After Phase 3:
- ✅ Pre-commit hook installed
- ✅ Verification script passes
- ✅ Documentation complete
- ✅ No regression in existing tests

### After Phase 4:
- ✅ 26 webhook tests passing (100%)
- ✅ Enrollment tests passing (90% coverage)
- ✅ Security tests passing (95% coverage)
- ✅ Performance tests passing (100% requirements)
- ✅ Business logic tests passing (85% coverage)
- ✅ **Overall coverage >80%**

---

## Rollback Procedures

### If Phase 1 fails:
```bash
git checkout HEAD -- src/api-server.js
git checkout HEAD -- tests/helpers/test-server.js
git checkout HEAD -- tests/helpers/fixtures.js
npm test -- campaigns.test.js # Should still pass (28 TODOs)
```

### If Phase 2 fails:
```bash
# Keep Phase 1 fixes
git checkout HEAD -- tests/campaigns-webhooks.test.js
# Work on simplified version
```

### If Phase 3 fails:
```bash
# Keep Phases 1-2
rm .husky/pre-commit
# Manual verification instead
```

---

## Risk Mitigation

### Risk 1: ES module conversion breaks API server
**Mitigation**: Test server starts before committing
**Verification**: `npm run api-server` (manual test for 30 seconds)

### Risk 2: Model factory pattern still wrong
**Mitigation**: Create test-server.test.js FIRST
**Verification**: Test passes before using in other tests

### Risk 3: Fixtures still don't match schemas
**Mitigation**: Schema validation tests catch immediately
**Verification**: Automated in pre-commit hook

### Risk 4: Tests pass but code is still broken
**Mitigation**: Use real HTTP requests, not mocks
**Verification**: Integration tests with actual database

---

## Timeline

### Day 1 (6-8 hours):
- Morning: Phase 1 (Critical Fixes) - 3-4 hours
- Afternoon: Phase 2 (Webhook Tests) - 2-3 hours
- Evening: Phase 3 (Error Prevention) - 1-2 hours

### Day 2-3 (12-16 hours):
- Phase 4 (Full Test Suite) - 2-3 days
- Focus: 4-6 hours/day on tests
- Includes: Plugin-assisted tests + manual tests

### Day 4 (2-4 hours):
- Final verification
- Coverage report
- Documentation
- Production readiness review

**Total**: 4-5 days to production-ready with 80%+ coverage

---

## Communication Plan

### Daily Updates:
- Morning: Plan for the day
- Evening: Progress report + blockers

### After Each Phase:
- Summary of what was fixed
- What tests now pass
- Any issues discovered
- Next steps

### Final Delivery:
- Coverage report
- All tests passing
- Migration executed
- Deployment checklist

---

## Conclusion

This plan provides:
1. ✅ Systematic approach to fix all critical issues
2. ✅ Verification at each step
3. ✅ Error prevention strategies
4. ✅ Rollback procedures
5. ✅ Clear success criteria
6. ✅ Realistic timeline

**Key Principle**: Fix infrastructure first, then build tests incrementally with verification at each step.

**No more errors because**:
- Schema validation tests catch mismatches
- Pre-commit hooks prevent bad commits
- Verification script catches issues early
- Incremental approach limits scope of failures
- Documentation ensures consistency

Ready to execute when approved.
