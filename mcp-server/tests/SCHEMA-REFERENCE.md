# Database Schema Reference for Tests

> **Purpose**: Authoritative reference for model schemas to ensure test fixtures match production models
> **Last Updated**: Based on model files examined 2025-01-10

---

## Model Factory Pattern

All models use the **CommonJS factory pattern**:

```javascript
// src/models/ModelName.cjs
module.exports = (sequelize) => {
  const ModelName = sequelize.define('table_name', {
    // field definitions
  }, {
    // options
  });

  return ModelName;
};
```

### Importing Models in Tests

For ES module tests importing CommonJS models:

```javascript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const CampaignTemplateFactory = require('../../src/models/CampaignTemplate.cjs');
const CampaignTemplate = CampaignTemplateFactory(sequelize);
```

---

## 1. CampaignTemplate

**Table**: `campaign_templates`
**File**: `src/models/CampaignTemplate.cjs`

### Required Fields

| Field | Type | Validation | Default |
|-------|------|------------|---------|
| `name` | STRING(255) | notEmpty, len[1,255] | - |
| `type` | STRING(50) | isIn['email','linkedin','multi_channel'] | - |
| `path_type` | STRING(50) | isIn['structured','dynamic_ai'] | - |
| `settings` | JSONB | - | `{}` |
| `is_active` | BOOLEAN | - | `true` |

### Optional Fields

| Field | Type | Default |
|-------|------|---------|
| `id` | UUID | UUIDV4 |
| `description` | TEXT | null |
| `icp_profile_id` | UUID | null |
| `created_by` | STRING(255) | null |
| `created_at` | DATE | NOW |
| `updated_at` | DATE | NOW |

### Valid Values

- **type**: `'email'`, `'linkedin'`, `'multi_channel'`
- **path_type**: `'structured'`, `'dynamic_ai'`

### Settings JSONB Structure

```javascript
// Minimal valid settings
{
  // Empty object is valid
}

// Typical settings (structure varies by path_type)
{
  steps: [...],           // For structured paths
  ai_config: {...},       // For dynamic_ai paths
  linkedin_config: {...}, // For linkedin/multi_channel
  email_config: {...}     // For email/multi_channel
}
```

### Instance Methods

- `toJSON()` - Serialize to JSON
- `findActive(options)` - Static: Find active templates
- `findByType(type, options)` - Static: Find by type

---

## 2. CampaignInstance

**Table**: `campaign_instances`
**File**: `src/models/CampaignInstance.cjs`

### Required Fields

| Field | Type | Validation | Default |
|-------|------|------------|---------|
| `template_id` | UUID | FK to campaign_templates | - |
| `name` | STRING(255) | notEmpty, len[1,255] | - |
| `status` | STRING(50) | isIn['draft','active','paused','completed','failed'] | `'draft'` |
| `total_enrolled` | INTEGER | - | `0` |
| `total_sent` | INTEGER | - | `0` |
| `total_delivered` | INTEGER | - | `0` |
| `total_opened` | INTEGER | - | `0` |
| `total_clicked` | INTEGER | - | `0` |
| `total_replied` | INTEGER | - | `0` |
| `provider_config` | JSONB | - | `{}` |

### Optional Fields

| Field | Type | Default |
|-------|------|---------|
| `id` | UUID | UUIDV4 |
| `started_at` | DATE | null |
| `paused_at` | DATE | null |
| `completed_at` | DATE | null |
| `created_at` | DATE | NOW |
| `updated_at` | DATE | NOW |

### Valid Values

- **status**: `'draft'`, `'active'`, `'paused'`, `'completed'`, `'failed'`

### Provider Config JSONB Structure

```javascript
// Minimal valid provider_config
{
  // Empty object is valid
}

// Typical provider_config
{
  lemlist: {
    campaign_id: "...",
    api_key: "..."
  },
  postmark: {
    server_token: "...",
    stream: "..."
  },
  phantombuster: {
    agent_id: "...",
    api_key: "..."
  }
}
```

### Critical Notes

- **total_delivered**: Added in migration `20250110000000-add-total-delivered-column.cjs`
- **Atomic Updates**: Counters MUST be incremented atomically using `sequelize.literal()`
- **Metrics Calculation**: See `getMetrics()` method lines 152-172

### Metrics Calculation

```javascript
// From CampaignInstance.prototype.getMetrics() - lines 152-172
{
  enrolled: this.total_enrolled,
  sent: this.total_sent,
  delivered: this.total_delivered,
  opened: this.total_opened,
  clicked: this.total_clicked,
  replied: this.total_replied,

  // CRITICAL: Delivery rate based on SENT
  delivery_rate: sent > 0 ? (delivered / sent * 100).toFixed(2) : 0,

  // CRITICAL: Open rate based on DELIVERED (not sent!)
  open_rate: delivered > 0 ? (opened / delivered * 100).toFixed(2) : 0,

  // Click rate based on DELIVERED
  click_rate: delivered > 0 ? (clicked / delivered * 100).toFixed(2) : 0,

  // Reply rate based on DELIVERED
  reply_rate: delivered > 0 ? (replied / delivered * 100).toFixed(2) : 0,

  // Click-through rate based on OPENED
  click_through_rate: opened > 0 ? (clicked / opened * 100).toFixed(2) : 0
}
```

### Instance Methods

- `start(options)` - Transition from draft/paused → active
- `pause(options)` - Transition from active → paused
- `complete(options)` - Transition from active → completed
- `getMetrics()` - Calculate all metrics (see above)
- `findActive(options)` - Static: Find active instances

---

## 3. CampaignEnrollment

**Table**: `campaign_enrollments`
**File**: `src/models/CampaignEnrollment.cjs`

### Required Fields

| Field | Type | Validation | Default |
|-------|------|------------|---------|
| `instance_id` | UUID | FK to campaign_instances | - |
| `contact_id` | UUID | - | - |
| `status` | STRING(50) | isIn['enrolled','active','paused','completed','unsubscribed','bounced'] | `'enrolled'` |
| `current_step` | INTEGER | - | `0` |
| `enrolled_at` | DATE | - | NOW |
| `metadata` | JSONB | - | `{}` |

### Optional Fields

| Field | Type | Default |
|-------|------|---------|
| `id` | UUID | UUIDV4 |
| `next_action_at` | DATE | null |
| `completed_at` | DATE | null |
| `unsubscribed_at` | DATE | null |
| `created_at` | DATE | NOW |
| `updated_at` | DATE | NOW |

### Valid Values

- **status**: `'enrolled'`, `'active'`, `'paused'`, `'completed'`, `'unsubscribed'`, `'bounced'`

### Metadata JSONB Structure

```javascript
// Minimal valid metadata
{
  // Empty object is valid
}

// Typical metadata
{
  contact_data: {
    email: "...",
    name: "...",
    company: "..."
  },
  linkedin_profile: {
    url: "...",
    profile_id: "..."
  },
  custom_fields: {...}
}
```

### Instance Methods

- `unsubscribe()` - Set status to unsubscribed
- `markBounced()` - Set status to bounced
- `advanceStep()` - Increment current_step

---

## 4. CampaignEvent

**Table**: `campaign_events`
**File**: `src/models/CampaignEvent.cjs`

### Required Fields

| Field | Type | Validation | Default |
|-------|------|------------|---------|
| `enrollment_id` | UUID | FK to campaign_enrollments | - |
| `event_type` | STRING(50) | isIn[...] (see below) | - |
| `channel` | STRING(50) | isIn['email','linkedin'] | - |
| `timestamp` | DATE | - | NOW |
| `metadata` | JSONB | - | `{}` |

### Optional Fields

| Field | Type | Default |
|-------|------|---------|
| `id` | UUID | UUIDV4 |
| `step_number` | INTEGER | null |
| `provider` | STRING(50) | null |
| `provider_event_id` | STRING(255) | null (UNIQUE) |
| `created_at` | DATE | NOW |

### Valid Values

- **event_type**: `'sent'`, `'delivered'`, `'opened'`, `'clicked'`, `'replied'`, `'bounced'`, `'unsubscribed'`, `'connection_accepted'`, `'connection_rejected'`
- **channel**: `'email'`, `'linkedin'`

### Metadata JSONB Structure

```javascript
// Minimal valid metadata
{
  // Empty object is valid
}

// Email event metadata
{
  subject: "...",
  message_id: "...",
  recipient: "...",
  ip_address: "...",
  user_agent: "..."
}

// LinkedIn event metadata
{
  connection_request_id: "...",
  message_thread_id: "...",
  profile_url: "..."
}
```

### Critical Notes

- **provider_event_id**: MUST be unique (enforced by partial index for non-null values)
- **Deduplication**: Use `createIfNotExists()` method for webhook events
- **Timestamps**: Model has `created_at` but not `updated_at` (events are immutable)

### Instance Methods

- `createIfNotExists(eventData)` - Static: Create event with deduplication
- `getEventsByEnrollment(enrollmentId, options)` - Static: Get events for enrollment
- `getMetricsByChannel(enrollmentIds)` - Static: Aggregate metrics by channel

---

## Test Fixture Creation Guidelines

### 1. Always Include Required Fields

```javascript
// ❌ WRONG - Missing required fields
export function createTemplateFixture() {
  return {
    name: faker.commerce.productName()
    // Missing: type, path_type, settings
  };
}

// ✅ CORRECT
export function createTemplateFixture(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    type: 'email',
    path_type: 'structured',
    settings: {},
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}
```

### 2. Use Valid Enum Values

```javascript
// ❌ WRONG
campaign_type: faker.helpers.arrayElement(['email', 'linkedin'])

// ✅ CORRECT
type: faker.helpers.arrayElement(['email', 'linkedin', 'multi_channel'])
```

### 3. Match Field Names Exactly

```javascript
// ❌ WRONG
user_id: faker.string.uuid()
campaign_type: 'email'

// ✅ CORRECT
created_by: faker.string.uuid()  // Field is created_by, not user_id
type: 'email'                     // Field is type, not campaign_type
```

### 4. Include All Counter Fields

```javascript
// ❌ WRONG - Missing total_delivered
export function createInstanceFixture() {
  return {
    template_id: faker.string.uuid(),
    name: faker.commerce.productName(),
    status: 'draft',
    total_enrolled: 0,
    total_sent: 0,
    total_opened: 0,
    // Missing: total_delivered, total_clicked, total_replied
  };
}

// ✅ CORRECT
export function createInstanceFixture() {
  return {
    id: faker.string.uuid(),
    template_id: faker.string.uuid(),
    name: faker.commerce.productName(),
    status: 'draft',
    total_enrolled: 0,
    total_sent: 0,
    total_delivered: 0,  // CRITICAL - don't forget this
    total_opened: 0,
    total_clicked: 0,
    total_replied: 0,
    provider_config: {},
    created_at: new Date(),
    updated_at: new Date()
  };
}
```

### 5. Preserve Foreign Key Relationships

```javascript
// Create parent first
const template = await createTemplateFixture();

// Then child with valid FK
const instance = await createInstanceFixture({
  template_id: template.id  // Valid FK reference
});
```

---

## Common Test Patterns

### Pattern 1: Testing Atomic Counter Increments

```javascript
// Atomic increment - CORRECT way
await CampaignInstance.increment(
  { total_sent: 1 },
  { where: { id: instanceId } }
);

// OR using sequelize.literal() in update
await instance.update({
  total_sent: sequelize.literal('total_sent + 1')
});
```

### Pattern 2: Testing Event Deduplication

```javascript
// First event - should create
const result1 = await CampaignEvent.createIfNotExists({
  enrollment_id: enrollment.id,
  event_type: 'delivered',
  channel: 'email',
  provider_event_id: 'unique_123',
  metadata: {}
});
expect(result1.created).toBe(true);

// Duplicate event - should NOT create
const result2 = await CampaignEvent.createIfNotExists({
  enrollment_id: enrollment.id,
  event_type: 'delivered',
  channel: 'email',
  provider_event_id: 'unique_123',  // Same ID
  metadata: {}
});
expect(result2.created).toBe(false);
```

### Pattern 3: Testing Metrics Calculation

```javascript
const instance = await createInstanceFixture({
  total_sent: 100,
  total_delivered: 90,
  total_opened: 45,
  total_clicked: 10,
  total_replied: 5
});

const metrics = instance.getMetrics();

// Delivery rate: (90/100) * 100 = 90.00
expect(metrics.delivery_rate).toBe('90.00');

// Open rate: (45/90) * 100 = 50.00 (based on DELIVERED!)
expect(metrics.open_rate).toBe('50.00');

// Click-through rate: (10/45) * 100 = 22.22
expect(metrics.click_through_rate).toBe('22.22');
```

---

## Critical Testing Requirements

### 1. Event Deduplication (P0 CRITICAL)
- MUST test that duplicate `provider_event_id` values don't create multiple events
- MUST test concurrent duplicate webhooks (race conditions)
- MUST test that different `provider_event_id` values create separate events

### 2. Atomic Counter Updates (P0 CRITICAL)
- MUST test concurrent increments don't lose updates
- MUST use `sequelize.literal()` or `Model.increment()`
- NEVER use `instance.total_sent += 1; await instance.save();`

### 3. Metrics Calculations (P0 CRITICAL)
- MUST verify open_rate uses `delivered` as denominator (NOT `sent`)
- MUST verify all rates return "0" or "0.00" when denominator is 0
- MUST verify rates are formatted to 2 decimal places

### 4. Status Transitions (P1 HIGH)
- MUST test state machine constraints (can't pause a draft, etc.)
- MUST test timestamp updates (started_at, paused_at, etc.)

### 5. Foreign Key Integrity (P1 HIGH)
- MUST test CASCADE deletes work correctly
- MUST test orphaned records are prevented

---

## Schema Validation Checklist

Before running tests, verify fixtures:

- [ ] All required fields present
- [ ] Field names match exactly (snake_case)
- [ ] Enum values are valid
- [ ] JSONB fields use correct structure
- [ ] Foreign keys reference valid UUIDs
- [ ] Counter fields initialized to 0
- [ ] Timestamps use Date objects
- [ ] UUIDs generated with faker.string.uuid()

---

## References

- **Models Directory**: `/src/models/`
- **Migration**: `/src/db/migrations/20250110000000-add-total-delivered-column.cjs`
- **Fixtures**: `/tests/helpers/fixtures.js`
- **Test Suite**: `/tests/campaigns-webhooks.test.js`
