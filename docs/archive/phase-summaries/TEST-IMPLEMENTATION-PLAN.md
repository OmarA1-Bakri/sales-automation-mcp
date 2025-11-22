# Campaign API - Comprehensive Test Implementation Plan

## Overview

**Goal**: Achieve >80% code coverage with production-quality tests
**Timeline**: 2-3 days (16-24 hours)
**Priority**: Critical path tests first (webhooks, race conditions, security)

---

## Test Suite Structure

```
tests/
├── setup.js                          # Global test setup ✅
├── helpers/
│   ├── test-server.js               # Test server factory
│   ├── fixtures.js                  # Test data generators
│   └── assertions.js                # Custom assertions
├── unit/
│   ├── models.test.js               # Model validation
│   ├── validators.test.js           # Zod schema tests
│   └── middleware.test.js           # Middleware isolation tests
└── integration/
    ├── webhooks.test.js             # Webhook event processing (CRITICAL)
    ├── enrollments.test.js          # Enrollment race conditions
    ├── security.test.js             # Authentication & authorization
    ├── performance.test.js          # Load testing
    └── business-logic.test.js       # Campaign lifecycle
```

---

## Phase 1: Test Infrastructure (Day 1, 2 hours)

### 1.1: Test Server Factory

**File**: `tests/helpers/test-server.js`

**Purpose**: Create isolated test instances of API server

**Implementation**:
```javascript
import { APIServer } from '../../src/api-server.js';
import { initializeDatabase } from '../../src/db/init.js';

export async function createTestServer() {
  // Use in-memory SQLite
  process.env.DATABASE_URL = ':memory:';

  // Initialize database with migrations
  const sequelize = await initializeDatabase();

  // Create API server instance
  const server = new APIServer({
    port: 0,  // Random port
    enableHttps: false
  });

  await server.start();

  return {
    app: server.app,
    sequelize,
    close: async () => {
      await server.stop();
      await sequelize.close();
    }
  };
}
```

**Test Coverage Target**: N/A (helper)

---

### 1.2: Test Fixtures Generator

**File**: `tests/helpers/fixtures.js`

**Purpose**: Generate realistic test data with Faker

**Implementation**:
```javascript
import { faker } from '@faker-js/faker';
import crypto from 'crypto';

export const fixtures = {
  /**
   * Create campaign template with sequences
   */
  async createTemplate(sequelize, overrides = {}) {
    const CampaignTemplate = sequelize.models.campaign_templates;

    return await CampaignTemplate.create({
      name: faker.commerce.productName(),
      description: faker.lorem.sentence(),
      channel_mix: {
        email: true,
        linkedin: true
      },
      is_active: true,
      ...overrides
    });
  },

  /**
   * Create campaign instance
   */
  async createInstance(sequelize, templateId, overrides = {}) {
    const CampaignInstance = sequelize.models.campaign_instances;

    return await CampaignInstance.create({
      template_id: templateId,
      name: `${faker.commerce.productName()} Campaign`,
      status: 'active',
      started_at: new Date(),
      ...overrides
    });
  },

  /**
   * Create enrollment
   */
  async createEnrollment(sequelize, instanceId, overrides = {}) {
    const CampaignEnrollment = sequelize.models.campaign_enrollments;

    return await CampaignEnrollment.create({
      instance_id: instanceId,
      contact_id: faker.string.uuid(),
      contact_email: faker.internet.email(),
      contact_name: faker.person.fullName(),
      status: 'active',
      enrolled_at: new Date(),
      ...overrides
    });
  },

  /**
   * Generate valid webhook signature
   */
  generateSignature(payload, secret, algorithm = 'sha256') {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  },

  /**
   * Create webhook event payload
   */
  createWebhookEvent(enrollmentId, overrides = {}) {
    return {
      enrollment_id: enrollmentId,
      event_type: 'sent',
      channel: 'email',
      timestamp: new Date().toISOString(),
      provider_event_id: faker.string.uuid(),
      provider_data: {
        message_id: faker.string.uuid()
      },
      ...overrides
    };
  }
};
```

**Test Coverage Target**: N/A (helper)

---

### 1.3: Custom Assertions

**File**: `tests/helpers/assertions.js`

**Purpose**: Domain-specific assertions

**Implementation**:
```javascript
export const assertions = {
  /**
   * Assert counter was incremented
   */
  assertCounterIncremented(before, after, field, expectedDelta = 1) {
    expect(after[field]).toBe(before[field] + expectedDelta);
  },

  /**
   * Assert metrics calculation is accurate
   */
  assertMetricsAccurate(metrics, expected) {
    expect(parseFloat(metrics.open_rate)).toBeCloseTo(expected.open_rate, 2);
    expect(parseFloat(metrics.click_rate)).toBeCloseTo(expected.click_rate, 2);
    expect(parseFloat(metrics.delivery_rate)).toBeCloseTo(expected.delivery_rate, 2);
  },

  /**
   * Assert response has standard error format
   */
  assertErrorResponse(response, statusCode, errorMessage) {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain(errorMessage);
  }
};
```

**Test Coverage Target**: N/A (helper)

---

## Phase 2: Critical Path Tests (Day 1, 6 hours)

### 2.1: Webhook Event Processing Tests (CRITICAL)

**File**: `tests/integration/webhooks.test.js`

**Priority**: HIGHEST - Core business logic

**Tests to Implement**:

#### Test 2.1.1: Event Deduplication
```javascript
describe('Event Deduplication', () => {
  it('should deduplicate events with same provider_event_id', async () => {
    // Arrange
    const { app, sequelize } = await createTestServer();
    const template = await fixtures.createTemplate(sequelize);
    const instance = await fixtures.createInstance(sequelize, template.id);
    const enrollment = await fixtures.createEnrollment(sequelize, instance.id);

    const eventPayload = fixtures.createWebhookEvent(enrollment.id, {
      provider_event_id: 'unique-event-123'
    });

    const signature = fixtures.generateSignature(
      eventPayload,
      process.env.LEMLIST_WEBHOOK_SECRET
    );

    // Act - Send same event twice
    const response1 = await request(app)
      .post('/api/campaigns/v2/events/webhook')
      .set('x-lemlist-signature', `sha256=${signature}`)
      .send(eventPayload);

    const response2 = await request(app)
      .post('/api/campaigns/v2/events/webhook')
      .set('x-lemlist-signature', `sha256=${signature}`)
      .send(eventPayload);

    // Assert
    expect(response1.status).toBe(201);
    expect(response2.status).toBe(201);  // Still succeeds

    const events = await sequelize.models.campaign_events.findAll({
      where: { provider_event_id: 'unique-event-123' }
    });

    expect(events).toHaveLength(1);  // Only one event created
  });

  it('should handle concurrent duplicate webhooks', async () => {
    // Send 10 concurrent requests with same provider_event_id
    // Verify only 1 event created
    // Uses Promise.all() for concurrency
  });
});
```

**Coverage Target**: 100% of createEvent function

---

#### Test 2.1.2: Atomic Counter Updates
```javascript
describe('Counter Updates', () => {
  it('should atomically increment counters without race conditions', async () => {
    // Arrange
    const { app, sequelize } = await createTestServer();
    const template = await fixtures.createTemplate(sequelize);
    const instance = await fixtures.createInstance(sequelize, template.id);
    const enrollment = await fixtures.createEnrollment(sequelize, instance.id);

    // Create 100 concurrent webhook events
    const webhookPromises = Array.from({ length: 100 }, (_, i) => {
      const eventPayload = fixtures.createWebhookEvent(enrollment.id, {
        event_type: 'opened',
        provider_event_id: `event-${i}`
      });

      const signature = fixtures.generateSignature(
        eventPayload,
        process.env.LEMLIST_WEBHOOK_SECRET
      );

      return request(app)
        .post('/api/campaigns/v2/events/webhook')
        .set('x-lemlist-signature', `sha256=${signature}`)
        .send(eventPayload);
    });

    // Act - Execute all webhooks concurrently
    await Promise.all(webhookPromises);

    // Assert - Counter should be exactly 100
    await instance.reload();
    expect(instance.total_opened).toBe(100);
  });

  it('should increment total_delivered on delivered events', async () => {
    // Test delivered event → total_delivered++
  });

  it('should increment total_sent on sent events', async () => {
    // Test sent event → total_sent++
  });

  it('should NOT increment counters for duplicate events', async () => {
    // Send duplicate → counters unchanged
  });
});
```

**Coverage Target**: 100% of counter increment logic

---

#### Test 2.1.3: Webhook Signature Verification
```javascript
describe('Webhook Signature Verification', () => {
  it('should reject webhooks with invalid Lemlist signatures', async () => {
    const { app, sequelize } = await createTestServer();
    const enrollment = await fixtures.createEnrollment(sequelize, instanceId);
    const eventPayload = fixtures.createWebhookEvent(enrollment.id);

    const response = await request(app)
      .post('/api/campaigns/v2/events/webhook')
      .set('x-lemlist-signature', 'sha256=invalid_signature')
      .send(eventPayload);

    assertions.assertErrorResponse(response, 401, 'Invalid webhook signature');
  });

  it('should reject webhooks with missing signatures', async () => {
    // No x-lemlist-signature header → 401
  });

  it('should accept webhooks with valid signatures', async () => {
    // Valid HMAC → 201 created
  });

  it('should verify Postmark signatures (base64)', async () => {
    // Postmark uses base64 encoding instead of hex
  });

  it('should verify Phantombuster token auth', async () => {
    // Phantombuster uses simple token instead of HMAC
  });
});
```

**Coverage Target**: 100% of webhook-auth.js

---

### 2.2: Enrollment Race Condition Tests

**File**: `tests/integration/enrollments.test.js`

**Priority**: HIGH - Data integrity

**Tests to Implement**:

```javascript
describe('Bulk Enrollment', () => {
  it('should prevent duplicate enrollments in concurrent requests', async () => {
    // Arrange
    const { app } = await createTestServer();
    const contacts = [
      { id: 'contact-1', email: 'test1@example.com' },
      { id: 'contact-2', email: 'test2@example.com' },
      { id: 'contact-3', email: 'test3@example.com' }
    ];

    // Act - Send 2 concurrent bulk enrollment requests with overlapping contacts
    const requests = [
      request(app)
        .post(`/api/campaigns/v2/instances/${instanceId}/enrollments/bulk`)
        .set('Authorization', `Bearer ${testHelpers.getValidApiKey()}`)
        .send({ contact_ids: ['contact-1', 'contact-2'] }),

      request(app)
        .post(`/api/campaigns/v2/instances/${instanceId}/enrollments/bulk`)
        .set('Authorization', `Bearer ${testHelpers.getValidApiKey()}`)
        .send({ contact_ids: ['contact-2', 'contact-3'] })
    ];

    await Promise.all(requests);

    // Assert - Each contact enrolled exactly once
    const enrollments = await sequelize.models.campaign_enrollments.findAll({
      where: { instance_id: instanceId }
    });

    expect(enrollments).toHaveLength(3);  // Not 4!
    const contactIds = enrollments.map(e => e.contact_id).sort();
    expect(contactIds).toEqual(['contact-1', 'contact-2', 'contact-3']);
  });

  it('should accurately count enrolled contacts', async () => {
    // Bulk enroll 1000 contacts
    // Verify instance.total_enrolled === 1000
  });

  it('should handle enrollment failures gracefully', async () => {
    // Invalid contact_id → partial rollback
  });
});
```

**Coverage Target**: 90% of enrollment functions

---

## Phase 3: Security Tests (Day 2, 4 hours)

### 3.1: Authentication Tests

**File**: `tests/integration/security.test.js`

**Tests to Implement**:

```javascript
describe('Authentication', () => {
  it('should reject requests without API key', async () => {
    const { app } = await createTestServer();

    const response = await request(app)
      .get('/api/campaigns/v2/templates')
      .send();

    assertions.assertErrorResponse(response, 401, 'Missing API key');
  });

  it('should reject requests with invalid API key', async () => {
    const response = await request(app)
      .get('/api/campaigns/v2/templates')
      .set('Authorization', `Bearer ${testHelpers.getInvalidApiKey()}`)
      .send();

    assertions.assertErrorResponse(response, 401, 'Invalid API key');
  });

  it('should use constant-time comparison for API keys', async () => {
    // Measure response time for valid vs invalid keys
    // Should be within 5ms of each other (prevents timing attacks)
  });
});

describe('Input Validation', () => {
  it('should sanitize JSONB input for prototype pollution', async () => {
    const response = await request(app)
      .post('/api/campaigns/v2/templates')
      .set('Authorization', `Bearer ${testHelpers.getValidApiKey()}`)
      .send({
        name: 'Test',
        channel_mix: {
          __proto__: { polluted: true },
          email: true
        }
      });

    assertions.assertErrorResponse(response, 400, 'Invalid JSON');
  });

  it('should prevent SQL injection in analytics queries', async () => {
    const response = await request(app)
      .get('/api/campaigns/v2/instances/abc"; DROP TABLE campaign_instances;--/performance')
      .set('Authorization', `Bearer ${testHelpers.getValidApiKey()}`)
      .send();

    // Should return 400 (invalid UUID) not execute SQL
    expect(response.status).toBe(400);
  });

  it('should validate UUID format strictly', async () => {
    // Invalid UUID → 400, not DB error
  });
});

describe('Rate Limiting', () => {
  it('should enforce webhook rate limits (100/min)', async () => {
    // Send 101 webhook requests in quick succession
    // 101st should return 429
  });

  it('should enforce general API rate limits (100/15min)', async () => {
    // Send 101 API requests
    // 101st should return 429
  });

  it('should track rate limits per IP', async () => {
    // Different IPs → independent rate limits
  });
});
```

**Coverage Target**: 95% of security middleware

---

## Phase 4: Performance Tests (Day 2, 3 hours)

### 4.1: Load Testing

**File**: `tests/integration/performance.test.js`

**Tests to Implement**:

```javascript
describe('Performance', () => {
  it('should handle 1000 enrollments without timeout', async () => {
    const { app } = await createTestServer();

    const startTime = Date.now();

    const response = await request(app)
      .post(`/api/campaigns/v2/instances/${instanceId}/enrollments/bulk`)
      .set('Authorization', `Bearer ${testHelpers.getValidApiKey()}`)
      .send({
        contact_ids: Array.from({ length: 1000 }, (_, i) => `contact-${i}`)
      });

    const duration = Date.now() - startTime;

    expect(response.status).toBe(201);
    expect(duration).toBeLessThan(5000);  // Under 5 seconds
  });

  it('should efficiently query performance analytics with 10K events', async () => {
    // Create 10,000 events across 100 enrollments
    // Query analytics
    // Should complete < 2 seconds
  });

  it('should use database indexes effectively', async () => {
    // Execute EXPLAIN query
    // Verify index usage
  });
});
```

**Coverage Target**: N/A (performance validation)

---

## Phase 5: Business Logic Tests (Day 2-3, 5 hours)

### 5.1: Campaign Lifecycle

**File**: `tests/integration/business-logic.test.js`

**Tests to Implement**:

```javascript
describe('Campaign Status Transitions', () => {
  it('should reject invalid status transitions', async () => {
    // draft → completed (skip active) → should fail
  });

  it('should allow valid transitions', async () => {
    // draft → active → paused → active → completed
  });

  it('should update timestamps on status changes', async () => {
    // active → paused sets paused_at
  });
});

describe('Metrics Calculation', () => {
  it('should calculate delivery rate correctly', async () => {
    // sent=100, delivered=95 → 95%
  });

  it('should calculate open rate based on delivered not sent', async () => {
    // delivered=95, opened=50 → 52.63%
  });

  it('should handle division by zero gracefully', async () => {
    // sent=0 → rates=0, no error
  });
});
```

**Coverage Target**: 85% of business logic

---

## Phase 6: Unit Tests (Day 3, 4 hours)

### 6.1: Model Validation

**File**: `tests/unit/models.test.js`

**Tests**:
- UUID primary keys
- Enum validation
- Required fields
- Default values
- Virtual getters

### 6.2: Validator Tests

**File**: `tests/unit/validators.test.js`

**Tests**:
- Zod schema edge cases
- JSONB sanitization
- Email validation
- UUID validation

### 6.3: Middleware Tests

**File**: `tests/unit/middleware.test.js`

**Tests**:
- Error handler formatting
- Async wrapper functionality
- CORS configuration

---

## Test Execution Strategy

### Development Workflow:
```bash
# Run tests in watch mode during development
npm run test:watch

# Run specific test file
npm test tests/integration/webhooks.test.js

# Run with coverage
npm run test:coverage
```

### CI/CD Integration:
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run db:migrate
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Coverage Targets by Area

| Area | Target | Priority |
|------|--------|----------|
| Webhook Processing | 100% | CRITICAL |
| Counter Updates | 100% | CRITICAL |
| Enrollment Logic | 90% | HIGH |
| Authentication | 95% | HIGH |
| Rate Limiting | 90% | HIGH |
| Business Logic | 85% | MEDIUM |
| Validators | 90% | MEDIUM |
| Models | 80% | MEDIUM |
| Middleware | 85% | MEDIUM |
| **Overall** | **>80%** | **REQUIRED** |

---

## Success Criteria

**Test Suite Completion Checklist**:
- [ ] All helper functions implemented
- [ ] 100% webhook event processing coverage
- [ ] 100% counter update coverage
- [ ] 90% enrollment coverage
- [ ] 95% security coverage
- [ ] Performance benchmarks passing
- [ ] 85% business logic coverage
- [ ] 80% overall coverage achieved
- [ ] All tests passing
- [ ] No flaky tests (run 10x consecutive passes)
- [ ] Test execution < 30 seconds total

---

## Timeline Summary

**Day 1** (8 hours):
- 0-2h: Test infrastructure (helpers, fixtures)
- 2-8h: Critical path tests (webhooks, enrollments)

**Day 2** (8 hours):
- 0-4h: Security tests
- 4-7h: Performance tests
- 7-8h: Start business logic tests

**Day 3** (8 hours):
- 0-5h: Finish business logic tests
- 5-8h: Unit tests
- Final: Coverage validation & cleanup

**Total**: 24 hours estimated, 16-20 hours realistic

---

## Risk Mitigation

### Potential Blockers:
1. **Database migration issues** → Use in-memory SQLite
2. **Flaky concurrency tests** → Use proper async/await, transactions
3. **Slow test execution** → Parallelize test files, use beforeAll/afterAll efficiently
4. **Coverage gaps** → Focus on critical paths first

### Solutions:
- Mock external services (Lemlist, Postmark APIs)
- Use database transactions for test isolation
- Implement test timeouts (10s max per test)
- Run tests in parallel with Jest `--maxWorkers=4`

---

## Next Steps

1. Review this plan
2. Start with Phase 1 (test infrastructure)
3. Implement tests in priority order
4. Monitor coverage as you go
5. Iterate on failing tests

**Estimated completion**: 2-3 days for full production-ready test suite achieving >80% coverage.
