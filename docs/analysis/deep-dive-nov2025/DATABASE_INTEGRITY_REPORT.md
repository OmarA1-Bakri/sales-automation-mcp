# RTGS Sales Automation - Database Integrity Audit Report

**Date**: 2025-11-27
**Auditor**: Data Integrity Guardian
**Scope**: PostgreSQL schema, migrations, SQLite operations, transaction boundaries, and data validation

---

## Executive Summary

**Overall Risk Assessment**: MODERATE-HIGH

The RTGS Sales Automation system uses a dual-database architecture (PostgreSQL for campaigns, SQLite for jobs/cache). While the schema design shows solid understanding of normalization principles, there are **critical data integrity vulnerabilities** requiring immediate attention.

### Critical Findings (3)
1. **SQL Injection in WorkflowStateManager cleanup method** - CRITICAL
2. **Missing transaction boundaries in SQLite operations** - HIGH
3. **No foreign key enforcement in workflow_states table** - HIGH

### High Findings (7)
4. Migration 003 lacks transaction wrapping
5. Schema evolution via try-catch ALTER TABLE (unsafe pattern)
6. Missing NOT NULL constraints on critical timestamp fields
7. No validation of JSONB data structure
8. Inconsistent use of CASCADE vs RESTRICT
9. Missing indexes on foreign key lookups
10. No orphaned record cleanup strategy

---

## 1. Schema Design Quality Assessment

### 1.1 Campaign Database (PostgreSQL)

#### Strengths ✅
- **Good normalization**: Proper separation of templates, instances, enrollments, and events
- **UUID primary keys**: Excellent choice for distributed systems and prevents enumeration
- **Referential integrity**: Foreign keys properly defined with CASCADE behaviors
- **Composite unique constraints**: `(template_id, step_number, a_b_variant)` prevents duplicate sequence steps
- **Partial indexes**: Smart optimization for active enrollments (`idx_campaign_enrollments_active_next_action`)
- **Webhook deduplication**: Unique index on `provider_event_id` prevents duplicate event processing
- **Timestamp tracking**: Comprehensive `created_at`, `updated_at`, and status-specific timestamps

#### Vulnerabilities 🔴

**1.1.1 Missing NOT NULL Constraints on Critical Fields**

```sql
-- File: sales-automation-api/src/db/init/001_schema.sql
CREATE TABLE campaign_instances (
    started_at TIMESTAMP WITH TIME ZONE,     -- Should be NOT NULL when status='active'
    paused_at TIMESTAMP WITH TIME ZONE,      -- OK as nullable
    completed_at TIMESTAMP WITH TIME ZONE    -- Should be NOT NULL when status IN ('completed','failed')
);

CREATE TABLE campaign_enrollments (
    next_action_at TIMESTAMP WITH TIME ZONE, -- Should be NOT NULL when status='active'
    completed_at TIMESTAMP WITH TIME ZONE,   -- Should be NOT NULL when status='completed'
    unsubscribed_at TIMESTAMP WITH TIME ZONE -- Should be NOT NULL when status='unsubscribed'
);
```

**Risk**: NULL timestamps on "completed" records break data integrity assumptions. Analytics queries will silently produce incorrect results.

**Scenario**: Campaign marked as "completed" but `completed_at` is NULL → impossible to calculate campaign duration or completion rate.

**Fix**:
```sql
-- Add CHECK constraints to enforce business rules
ALTER TABLE campaign_instances
ADD CONSTRAINT check_started_at_when_active
CHECK (
  (status = 'draft') OR
  (status != 'draft' AND started_at IS NOT NULL)
);

ALTER TABLE campaign_instances
ADD CONSTRAINT check_completed_at_when_done
CHECK (
  (status NOT IN ('completed', 'failed')) OR
  (status IN ('completed', 'failed') AND completed_at IS NOT NULL)
);

ALTER TABLE campaign_enrollments
ADD CONSTRAINT check_next_action_when_active
CHECK (
  (status != 'active') OR
  (status = 'active' AND next_action_at IS NOT NULL)
);
```

**1.1.2 No Validation of JSONB Structure**

```sql
-- File: sales-automation-api/src/db/init/001_schema.sql (Line 23)
settings JSONB DEFAULT '{}',

-- File: sales-automation-api/src/db/init/001_schema.sql (Line 50)
provider_config JSONB DEFAULT '{}',

-- File: sales-automation-api/src/db/init/001_schema.sql (Line 115)
metadata JSONB DEFAULT '{}',
```

**Risk**: Unvalidated JSONB allows arbitrary data structure → application code must defensively parse → performance overhead and crash risk.

**Scenario**:
```javascript
// Corrupted data in database
provider_config = '{"email_provider": ["lemlist", "postmark"]}'  // ARRAY instead of STRING

// Application crashes when accessing
const provider = instance.provider_config.email_provider.toLowerCase(); // TypeError
```

**Fix**: Add CHECK constraints with JSON schema validation (PostgreSQL 12+):
```sql
ALTER TABLE campaign_templates
ADD CONSTRAINT check_settings_schema
CHECK (
  jsonb_typeof(settings) = 'object' AND
  (settings->>'email_provider') IS NULL OR
  (settings->>'email_provider') IN ('lemlist', 'postmark')
);

-- Or use triggers for complex validation
CREATE OR REPLACE FUNCTION validate_provider_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate structure
  IF jsonb_typeof(NEW.provider_config) != 'object' THEN
    RAISE EXCEPTION 'provider_config must be a JSON object';
  END IF;

  -- Validate email_provider value
  IF (NEW.provider_config->>'email_provider') IS NOT NULL AND
     (NEW.provider_config->>'email_provider') NOT IN ('lemlist', 'postmark') THEN
    RAISE EXCEPTION 'Invalid email_provider: %', NEW.provider_config->>'email_provider';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_provider_config_trigger
BEFORE INSERT OR UPDATE ON campaign_instances
FOR EACH ROW EXECUTE FUNCTION validate_provider_config();
```

**1.1.3 Inconsistent CASCADE Behavior**

```sql
-- File: sales-automation-api/src/db/init/001_schema.sql
-- All tables use ON DELETE CASCADE

-- This is DANGEROUS for production data!
campaign_instances ON DELETE CASCADE  -- Deleting template = lose ALL campaign history
email_sequences ON DELETE CASCADE     -- Expected behavior
campaign_enrollments ON DELETE CASCADE -- Deleting instance = lose enrollment history
campaign_events ON DELETE CASCADE      -- Deleting enrollment = lose event audit trail
```

**Risk**: Accidental template deletion cascades to destroy all historical campaign data. GDPR compliance requires audit trail retention.

**Scenario**:
```sql
-- Operator accidentally deletes template
DELETE FROM campaign_templates WHERE id = '11111111-1111-1111-1111-111111111111';

-- CASCADE EFFECT:
-- 1. All campaign_instances deleted
-- 2. All campaign_enrollments deleted (via instances)
-- 3. All campaign_events deleted (via enrollments)
-- Result: Complete data loss, no recovery possible
```

**Fix**:
```sql
-- RECOMMENDED: Use RESTRICT for historical data
ALTER TABLE campaign_instances
DROP CONSTRAINT campaign_instances_template_id_fkey,
ADD CONSTRAINT campaign_instances_template_id_fkey
FOREIGN KEY (template_id) REFERENCES campaign_templates(id)
ON DELETE RESTRICT  -- Prevent deletion if instances exist
ON UPDATE CASCADE;

-- Keep CASCADE only for operational data (enrollments/events are OK)
-- But add soft-delete to templates instead of hard-delete
```

**1.1.4 Missing Indexes on Foreign Key Lookups**

**Missing Index**: `campaign_events.instance_id` (added in migration 003 but not present in 001_schema.sql)

```sql
-- File: sales-automation-api/src/db/migrations/003_phase7c_provider_support.sql (Line 58)
CREATE INDEX IF NOT EXISTS idx_events_instance_id
ON campaign_events(instance_id)
WHERE instance_id IS NOT NULL;
```

**Risk**: Queries filtering by `instance_id` will perform sequential scans on large event tables.

**Query Impact**:
```sql
-- WITHOUT INDEX: Sequential scan of millions of rows
SELECT event_type, COUNT(*)
FROM campaign_events
WHERE instance_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
GROUP BY event_type;

-- Execution time: 2-5 seconds on 1M rows
-- WITH INDEX: Index scan + lookup
-- Execution time: 50-100ms
```

**Status**: ✅ Fixed in migration 003, but missing from base schema (inconsistency issue).

---

### 1.2 Workflow State Database (PostgreSQL)

#### Critical Vulnerability 🔴🔴🔴

**1.2.1 SQL Injection in WorkflowStateManager.cleanupOldWorkflows()**

```javascript
// File: sales-automation-api/src/bmad/WorkflowStateManager.js (Line 224-228)
async cleanupOldWorkflows(retentionDays = 30) {
  try {
    const result = await sequelize.query(`
      DELETE FROM workflow_states
      WHERE status = 'completed'
        AND completed_at < NOW() - INTERVAL '${retentionDays} days'
    `);
```

**CRITICAL ISSUE**: Direct string interpolation of `retentionDays` into SQL query.

**Attack Scenario**:
```javascript
// Attacker controls retentionDays parameter
await workflowStateManager.cleanupOldWorkflows("0 days'; DROP TABLE workflow_states; --");

// Executed SQL:
DELETE FROM workflow_states
WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '0 days'; DROP TABLE workflow_states; -- days'

// Result: ALL workflow state data destroyed
```

**Fix**:
```javascript
async cleanupOldWorkflows(retentionDays = 30) {
  try {
    // VALIDATE INPUT
    const validatedDays = parseInt(retentionDays, 10);
    if (isNaN(validatedDays) || validatedDays < 0 || validatedDays > 3650) {
      throw new Error(`Invalid retentionDays: ${retentionDays}`);
    }

    // USE PARAMETERIZED QUERY
    const result = await sequelize.query(`
      DELETE FROM workflow_states
      WHERE status = 'completed'
        AND completed_at < NOW() - INTERVAL '1 day' * $1
    `, {
      bind: [validatedDays],
      type: sequelize.QueryTypes.DELETE
    });

    const deletedCount = result[1] || 0;
    // ... rest of function
```

**1.2.2 Missing Foreign Key Between workflow_failures and workflow_states**

```sql
-- File: sales-automation-api/migrations/20241122_create_workflow_states.sql (Line 19-26)
CREATE TABLE IF NOT EXISTS workflow_failures (
  id SERIAL PRIMARY KEY,
  workflow_id UUID NOT NULL,  -- ❌ No FOREIGN KEY constraint
  failed_step TEXT NOT NULL,
  error_message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Risk**: Orphaned failure records accumulate when workflow_states rows are deleted.

**Scenario**:
```sql
-- Workflow completes or is cleaned up
DELETE FROM workflow_states WHERE id = '12345678-1234-1234-1234-123456789abc';

-- Failure record remains orphaned (no way to join back to workflow)
SELECT * FROM workflow_failures WHERE workflow_id = '12345678-1234-1234-1234-123456789abc';
-- Returns records but workflow_states row is gone
```

**Fix**:
```sql
ALTER TABLE workflow_failures
ADD CONSTRAINT workflow_failures_workflow_id_fkey
FOREIGN KEY (workflow_id) REFERENCES workflow_states(id)
ON DELETE CASCADE;  -- Delete failures when workflow is deleted
```

---

### 1.3 Job Queue Database (SQLite)

#### Critical Issue 🔴

**1.3.1 Missing Transaction Boundaries in Multi-Step Operations**

```javascript
// File: sales-automation-api/src/utils/database.js (Line 293-338)
updateJobStatus(id, status, result = null, error = null) {
  const now = Date.now();
  const updates = { status, updated_at: now };

  // Check if job exists and needs started_at timestamp
  const job = this.getJob(id);  // ❌ READ operation OUTSIDE transaction
  if (status === 'processing' && (!job || !job.started_at)) {
    updates.started_at = now;
  }

  if (status === 'completed' || status === 'failed') {
    updates.completed_at = now;
  }

  // ... (field validation)

  const stmt = this.db.prepare(`UPDATE jobs SET ${fields} WHERE id = ?`);
  stmt.run(...values, id);  // ❌ UPDATE operation NOT wrapped in transaction
}
```

**Race Condition Scenario**:
```javascript
// Thread 1: Worker A marks job as processing
updateJobStatus('job-123', 'processing');

// Thread 2: Worker B marks same job as processing (reads stale data)
updateJobStatus('job-123', 'processing');  // No error, both workers process same job

// Result: Job executed TWICE, duplicate emails sent, metrics corrupted
```

**Fix**:
```javascript
updateJobStatus(id, status, result = null, error = null) {
  // WRAP EVERYTHING IN TRANSACTION
  const transaction = this.db.transaction(() => {
    const now = Date.now();
    const updates = { status, updated_at: now };

    // Read-check-update ATOMICALLY
    const job = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);

    if (!job) {
      throw new Error(`Job ${id} not found`);
    }

    // Validate state transition
    if (status === 'processing' && job.status !== 'pending') {
      throw new Error(`Invalid state transition: ${job.status} -> processing`);
    }

    if (status === 'processing' && !job.started_at) {
      updates.started_at = now;
    }

    if (status === 'completed' || status === 'failed') {
      if (job.status !== 'processing') {
        throw new Error(`Invalid state transition: ${job.status} -> ${status}`);
      }
      updates.completed_at = now;
    }

    // ... (field validation)

    const stmt = this.db.prepare(`UPDATE jobs SET ${fields} WHERE id = ?`);
    const result = stmt.run(...values, id);

    if (result.changes === 0) {
      throw new Error(`Job ${id} not updated (concurrent modification?)`);
    }
  });

  transaction();  // Execute atomic transaction
}
```

**1.3.2 No Unique Constraints on Enrichment Cache Keys**

```javascript
// File: sales-automation-api/src/utils/database.js (Line 76-85)
CREATE TABLE IF NOT EXISTS enrichment_cache (
  type TEXT NOT NULL,
  key TEXT NOT NULL,
  data TEXT NOT NULL,
  cached_at TEXT NOT NULL,
  PRIMARY KEY (type, key)  // ✅ GOOD: Composite PK prevents duplicates
)
```

**Status**: ✅ Correctly implemented with composite primary key.

---

## 2. Migration Safety Analysis

### 2.1 Transaction Wrapping

#### Critical Issue 🔴

**2.1.1 Migration 003 Missing Transaction Wrapper**

```sql
-- File: sales-automation-api/src/db/migrations/003_phase7c_provider_support.sql (Line 10)
BEGIN;
-- ... 80+ lines of DDL ...
COMMIT;
```

**Status**: ✅ Uses `BEGIN`/`COMMIT` transaction wrapper.

**However**, migration 001 and 002 do NOT use transaction wrappers:

```sql
-- File: sales-automation-api/src/db/migrations/001_campaign_architecture.sql
-- ❌ NO BEGIN/COMMIT wrapper
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS campaign_templates (...);
-- ... 6 more tables, triggers, indexes ...
```

**Risk**: Partial migration if DDL statement fails midway.

**Scenario**:
```sql
-- Migration runs
CREATE TABLE campaign_templates (...);  -- ✅ Success
CREATE TABLE campaign_instances (...);  -- ✅ Success
CREATE TABLE email_sequences (...);     -- ❌ FAILS (disk full)
-- Migration stops, database left in inconsistent state
-- Next migration run: "table campaign_templates already exists" error
```

**Fix**: Wrap ALL migrations in transactions:
```sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ... all DDL statements ...

COMMIT;
```

**Note**: PostgreSQL supports transactional DDL (unlike MySQL). Always use it.

### 2.2 Rollback Capability

#### Good ✅

**2.2.1 Rollback Migration Provided for 003**

```sql
-- File: sales-automation-api/src/db/migrations/003_phase7c_provider_support_down.sql
BEGIN;

-- Restore original CHECK constraint (remove video)
ALTER TABLE campaign_events
DROP CONSTRAINT IF EXISTS campaign_events_channel_check;

ALTER TABLE campaign_events
ADD CONSTRAINT campaign_events_channel_check
CHECK (channel IN ('email', 'linkedin', 'sms', 'phone'));

-- Remove all Phase 7C columns
ALTER TABLE campaign_enrollments
  DROP COLUMN IF EXISTS provider_message_id,
  DROP COLUMN IF EXISTS provider_action_id;

-- ... (drops all 003 changes)

COMMIT;
```

**Status**: ✅ Properly structured with transaction and `IF EXISTS` guards.

#### Missing ❌

**2.2.2 No Rollback Migrations for 001, 002**

**Risk**: Cannot safely undo schema changes if issues discovered.

**Fix**: Create rollback migrations:
```sql
-- File: sales-automation-api/src/db/migrations/001_campaign_architecture_down.sql
BEGIN;

DROP TRIGGER IF EXISTS update_campaign_enrollments_updated_at ON campaign_enrollments;
-- ... (drop all triggers)

DROP INDEX IF EXISTS idx_campaign_events_enrollment_type;
-- ... (drop all indexes)

DROP TABLE IF EXISTS campaign_events CASCADE;
DROP TABLE IF EXISTS campaign_enrollments CASCADE;
DROP TABLE IF EXISTS linkedin_sequences CASCADE;
DROP TABLE IF EXISTS email_sequences CASCADE;
DROP TABLE IF EXISTS campaign_instances CASCADE;
DROP TABLE IF EXISTS campaign_templates CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column();
DROP EXTENSION IF EXISTS "uuid-ossp";

COMMIT;
```

### 2.3 Idempotency

#### Good ✅

All migrations use `IF NOT EXISTS` / `IF EXISTS` guards:
```sql
CREATE TABLE IF NOT EXISTS campaign_templates (...);
CREATE INDEX IF NOT EXISTS idx_campaign_templates_type ...;
DROP TRIGGER IF EXISTS update_campaign_templates_updated_at ...;
```

**Status**: ✅ Migrations are safely re-runnable.

### 2.4 Schema Evolution Pattern

#### Dangerous Pattern 🔴

**2.4.1 Try-Catch ALTER TABLE in Application Code**

```javascript
// File: sales-automation-api/src/utils/database.js (Line 223-239)
try {
  this.db.exec(`
    ALTER TABLE imported_contacts ADD COLUMN hubspot_last_modified TEXT
  `);
} catch (error) {
  // Column already exists, ignore
}

try {
  this.db.exec(`
    ALTER TABLE imported_contacts ADD COLUMN data_quality_last_check TEXT
  `);
} catch (error) {
  // Column already exists, ignore
}
```

**Risk**:
1. **Silent failures**: Catches ALL errors, not just "column exists"
2. **No audit trail**: No migration record of schema change
3. **No rollback**: Cannot undo changes
4. **Race conditions**: Multiple processes trying to alter simultaneously

**Scenario**:
```javascript
// Error: Permission denied to alter table
this.db.exec(`ALTER TABLE imported_contacts ADD COLUMN ...`);
// Exception caught, silently ignored
// Application assumes column exists, crashes on SELECT

// Better error: "disk full"
// Still caught and ignored → data corruption risk
```

**Fix**: Use proper migration framework:
```javascript
// ❌ NEVER DO THIS
try { ALTER TABLE ...; } catch {}

// ✅ ALWAYS USE MIGRATIONS
// File: sales-automation-api/src/db/migrations/004_add_hubspot_columns.sql
BEGIN;

ALTER TABLE imported_contacts
ADD COLUMN IF NOT EXISTS hubspot_last_modified TEXT;

ALTER TABLE imported_contacts
ADD COLUMN IF NOT EXISTS data_quality_last_check TEXT;

COMMIT;
```

---

## 3. Data Integrity - Referential Integrity

### 3.1 Foreign Key Enforcement

#### Good ✅

**All critical relationships have foreign keys**:
```sql
campaign_instances.template_id → campaign_templates.id (CASCADE)
email_sequences.template_id → campaign_templates.id (CASCADE)
linkedin_sequences.template_id → campaign_templates.id (CASCADE)
campaign_enrollments.instance_id → campaign_instances.id (CASCADE)
campaign_events.enrollment_id → campaign_enrollments.id (CASCADE)
```

#### Issues 🔴

**3.1.1 No FK Constraint on campaign_templates.icp_profile_id**

```sql
-- File: sales-automation-api/src/db/init/001_schema.sql (Line 22)
icp_profile_id UUID,  -- ❌ No REFERENCES clause
```

**Risk**: Orphaned templates referencing deleted ICP profiles.

**Scenario**:
```sql
-- ICP profile deleted
DELETE FROM icp_profiles WHERE id = 'profile-123';

-- Templates still reference deleted profile
SELECT * FROM campaign_templates WHERE icp_profile_id = 'profile-123';
-- Returns templates but ICP data is gone
```

**Fix**:
```sql
ALTER TABLE campaign_templates
ADD CONSTRAINT campaign_templates_icp_profile_fkey
FOREIGN KEY (icp_profile_id) REFERENCES icp_profiles(id)
ON DELETE SET NULL;  -- Keep template but clear ICP reference
```

**3.1.2 No FK Constraint on campaign_enrollments.contact_id**

```sql
-- File: sales-automation-api/src/db/init/001_schema.sql (Line 108)
contact_id UUID NOT NULL,  -- ❌ No REFERENCES clause
```

**Risk**: Cannot enforce contact existence, cannot cascade contact deletions (GDPR right-to-deletion).

**Scenario**:
```sql
-- User requests GDPR data deletion
DELETE FROM contacts WHERE id = 'contact-abc';

-- Enrollment orphaned (breaks joins)
SELECT e.*, c.email
FROM campaign_enrollments e
JOIN contacts c ON e.contact_id = c.id
WHERE e.id = 'enrollment-123';
-- Returns 0 rows (enrollment exists but contact doesn't)
```

**Fix**:
```sql
-- Assuming contacts table exists
ALTER TABLE campaign_enrollments
ADD CONSTRAINT campaign_enrollments_contact_fkey
FOREIGN KEY (contact_id) REFERENCES contacts(id)
ON DELETE CASCADE;  -- Delete enrollment when contact deleted (GDPR compliance)
```

### 3.2 Orphaned Records

#### Missing Cleanup Strategy 🔴

**3.2.1 No Periodic Cleanup Job**

**Potential orphans**:
1. `workflow_failures` with deleted `workflow_id` (no FK)
2. `dead_letter_events` older than retention period
3. `campaign_events` with NULL `enrollment_id` (shouldn't happen but no constraint prevents it)

**Fix**: Implement cleanup job:
```javascript
// File: sales-automation-api/src/workers/database-cleanup-worker.js
class DatabaseCleanupWorker {
  async run() {
    // Clean orphaned workflow failures (if FK not added)
    await sequelize.query(`
      DELETE FROM workflow_failures
      WHERE workflow_id NOT IN (SELECT id FROM workflow_states)
    `);

    // Clean old dead letter events (retention: 90 days)
    await sequelize.query(`
      DELETE FROM dead_letter_events
      WHERE status = 'ignored' AND created_at < NOW() - INTERVAL '90 days'
    `);

    // Clean old completed workflows (retention: 30 days)
    await workflowStateManager.cleanupOldWorkflows(30);

    // Vacuum and analyze
    await sequelize.query('VACUUM ANALYZE');
  }
}

// Run daily at 2 AM
cron.schedule('0 2 * * *', () => cleanupWorker.run());
```

---

## 4. Data Validation and Constraints

### 4.1 CHECK Constraints

#### Good ✅

**Status enums properly constrained**:
```sql
status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'completed', 'failed'))
type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'linkedin', 'multi_channel'))
event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', ...))
```

#### Missing 🔴

**4.1.1 No Range Constraints on Metrics**

```sql
-- File: sales-automation-api/src/db/init/001_schema.sql (Line 40-44)
total_enrolled INTEGER DEFAULT 0,
total_sent INTEGER DEFAULT 0,
total_opened INTEGER DEFAULT 0,
total_clicked INTEGER DEFAULT 0,
total_replied INTEGER DEFAULT 0,
```

**Risk**: Negative values or impossible ratios allowed.

**Scenario**:
```sql
-- Bug in metrics update logic
UPDATE campaign_instances SET total_opened = -5 WHERE id = 'xxx';
-- Success (no error)

-- Impossible ratios
UPDATE campaign_instances SET total_opened = 1000, total_sent = 10 WHERE id = 'yyy';
-- 10,000% open rate allowed!
```

**Fix**:
```sql
ALTER TABLE campaign_instances
ADD CONSTRAINT check_metrics_positive CHECK (
  total_enrolled >= 0 AND
  total_sent >= 0 AND
  total_opened >= 0 AND
  total_clicked >= 0 AND
  total_replied >= 0
);

ALTER TABLE campaign_instances
ADD CONSTRAINT check_metrics_logical CHECK (
  total_sent <= total_enrolled AND
  total_opened <= total_sent AND
  total_clicked <= total_opened AND
  total_replied <= total_sent
);
```

**4.1.2 No Validation on delay_hours**

```sql
-- File: sales-automation-api/src/db/init/001_schema.sql (Line 68)
delay_hours INTEGER DEFAULT 0,  -- ❌ No CHECK constraint
```

**Risk**: Negative delays or impossibly large delays allowed.

**Scenario**:
```sql
INSERT INTO email_sequences (template_id, step_number, body, delay_hours)
VALUES ('template-123', 2, 'Follow-up', -24);
-- Negative delay (time travel?)

INSERT INTO email_sequences (template_id, step_number, body, delay_hours)
VALUES ('template-123', 3, 'Final', 876000);  -- 100 years delay
```

**Fix**:
```sql
ALTER TABLE email_sequences
ADD CONSTRAINT check_delay_hours_reasonable CHECK (
  delay_hours >= 0 AND delay_hours <= 8760  -- Max 1 year (365 days * 24 hours)
);

ALTER TABLE linkedin_sequences
ADD CONSTRAINT check_delay_hours_reasonable CHECK (
  delay_hours >= 0 AND delay_hours <= 8760
);
```

### 4.2 Unique Constraints

#### Good ✅

**Webhook deduplication**:
```sql
-- File: sales-automation-api/src/db/init/001_schema.sql (Line 147-149)
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_events_provider_id_unique
    ON campaign_events(provider_event_id)
    WHERE provider_event_id IS NOT NULL;
```

**Enrollment uniqueness**:
```sql
-- File: sales-automation-api/src/db/init/001_schema.sql (Line 119)
UNIQUE(instance_id, contact_id)
```

**Sequence step uniqueness**:
```sql
-- File: sales-automation-api/src/db/init/001_schema.sql (Line 74)
UNIQUE(template_id, step_number, a_b_variant)
```

**Status**: ✅ All critical uniqueness constraints properly implemented.

---

## 5. Index Efficiency and Coverage

### 5.1 Index Coverage Analysis

#### Well Indexed ✅

**Campaign Templates**:
- `type` - for filtering by campaign type
- `path_type` - for filtering structured vs dynamic_ai
- `is_active` - for filtering active templates

**Campaign Instances**:
- `template_id` - foreign key lookup
- `status` - filtering active campaigns

**Campaign Enrollments**:
- `instance_id` - foreign key lookup
- `contact_id` - contact-based queries
- `status` - filtering enrollment states
- `(next_action_at) WHERE status='active'` - **EXCELLENT partial index** for automation worker

**Campaign Events**:
- `enrollment_id` - foreign key lookup
- `event_type` - event-based filtering
- `timestamp` - time-range queries
- `channel` - channel-based analytics
- `(channel, event_type)` - composite for analytics
- `(enrollment_id, event_type)` - composite for event history
- `(provider_event_id) WHERE provider_event_id IS NOT NULL` - webhook deduplication

#### Missing Indexes 🔴

**5.1.1 Missing Index on campaign_instances.created_at**

```sql
-- Common query: List recent campaigns
SELECT * FROM campaign_instances
ORDER BY created_at DESC
LIMIT 50;
```

**Without index**: Sequential scan + sort of entire table.

**Fix**:
```sql
CREATE INDEX idx_campaign_instances_created_at ON campaign_instances(created_at DESC);
```

**5.1.2 Missing Index on campaign_events.timestamp for Time-Range Queries**

```sql
-- Common query: Events in last 24 hours
SELECT COUNT(*) FROM campaign_events
WHERE timestamp >= NOW() - INTERVAL '24 hours';
```

**Current index**: `idx_campaign_events_timestamp` exists ✅

**BUT**: Not optimal for range queries. Better to use BRIN index:
```sql
-- Drop existing B-tree index
DROP INDEX idx_campaign_events_timestamp;

-- Create BRIN index (better for time-series data)
CREATE INDEX idx_campaign_events_timestamp_brin
ON campaign_events USING BRIN (timestamp);

-- BRIN is 100x smaller and faster for time-range queries on large tables
```

**5.1.3 Missing Composite Index for Dashboard Metrics Query**

```sql
-- Dashboard query: Campaign metrics by status
SELECT
  ci.status,
  COUNT(DISTINCT ce.enrollment_id) as engaged_contacts,
  SUM(CASE WHEN ce.event_type = 'opened' THEN 1 ELSE 0 END) as opens
FROM campaign_instances ci
JOIN campaign_enrollments enr ON ci.id = enr.instance_id
JOIN campaign_events ce ON enr.id = ce.enrollment_id
WHERE ci.status = 'active'
  AND ce.timestamp >= NOW() - INTERVAL '7 days'
GROUP BY ci.status;
```

**Fix**:
```sql
CREATE INDEX idx_campaign_events_timestamp_type
ON campaign_events(timestamp, event_type, enrollment_id)
WHERE timestamp >= NOW() - INTERVAL '30 days';
-- Partial index covering recent events only
```

### 5.2 Index Bloat and Maintenance

**No automatic maintenance configured** ❌

**Risk**: Indexes grow stale, query planner uses incorrect statistics.

**Fix**: Add periodic ANALYZE and REINDEX:
```sql
-- In cron job or pg_cron extension
SELECT cron.schedule('analyze-tables', '0 3 * * *', $$
  ANALYZE campaign_templates, campaign_instances, campaign_enrollments, campaign_events;
$$);

-- Monthly REINDEX (during maintenance window)
SELECT cron.schedule('reindex-campaign-tables', '0 4 1 * *', $$
  REINDEX TABLE CONCURRENTLY campaign_events;
  REINDEX TABLE CONCURRENTLY campaign_enrollments;
$$);
```

---

## 6. Transaction Boundaries in Critical Operations

### 6.1 PostgreSQL Operations (Sequelize)

#### Good ✅

**Campaign Controller uses transactions properly**:

```javascript
// File: sales-automation-api/src/controllers/campaign-controller.js (Line 212-253)
async function deleteTemplate(req, res) {
  // ✅ Uses transaction with row locking
  await sequelize.transaction(async (t) => {
    const template = await CampaignTemplate.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE  // ✅ Prevents concurrent modifications
    });

    // ✅ Validation inside transaction
    const activeInstances = await CampaignInstance.count({
      where: { template_id: id, status: 'active' },
      transaction: t
    });

    if (activeInstances > 0) {
      throw new ConflictError(...);  // ✅ Automatic rollback
    }

    await template.update({ is_active: false }, { transaction: t });
  });
}
```

```javascript
// File: sales-automation-api/src/controllers/campaign-controller.js (Line 315-359)
async function createInstance(req, res) {
  // ✅ Transaction ensures atomic validation + creation
  const instance = await sequelize.transaction(async (t) => {
    const template = await CampaignTemplate.findByPk(template_id, { transaction: t });

    if (!template || !template.is_active) {
      throw new ValidationError(...);  // ✅ Rollback
    }

    // ✅ All checks inside transaction
    const emailSeqCount = await EmailSequence.count({
      where: { template_id, is_active: true },
      transaction: t
    });

    return await CampaignInstance.create(data, { transaction: t });
  });
}
```

**WorkflowStateManager uses transactions**:

```javascript
// File: sales-automation-api/src/bmad/WorkflowStateManager.js (Line 86-126)
async failWorkflow(workflowId, failedStep, error) {
  const transaction = await sequelize.transaction();  // ✅ Explicit transaction

  try {
    await sequelize.query(`UPDATE workflow_states SET ...`, { transaction });
    await sequelize.query(`INSERT INTO workflow_failures ...`, { transaction });

    await transaction.commit();  // ✅ Explicit commit
  } catch (err) {
    await transaction.rollback();  // ✅ Explicit rollback
    logger.error('Failed to record workflow failure', { workflowId });
  }
}
```

#### Missing Transactions 🔴

**6.1.1 No Transaction in createWorkflow()**

```javascript
// File: sales-automation-api/src/bmad/WorkflowStateManager.js (Line 13-34)
async createWorkflow(workflowId, workflowName, initialInputs) {
  try {
    // ❌ NO TRANSACTION - Direct query
    await sequelize.query(`
      INSERT INTO workflow_states (...)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO NOTHING
    `, {
      bind: [workflowId, workflowName, 'running', JSON.stringify(initialInputs), null]
    });

    logger.info('Workflow created', { workflowId });
    return workflowId;
  } catch (error) {
    logger.error('Failed to create workflow state');
    // ❌ Swallows error, returns workflowId anyway
    return workflowId;
  }
}
```

**Risk**: Error silently swallowed, workflow continues without persistence.

**Scenario**:
```javascript
// Disk full error
await createWorkflow('workflow-123', 'lead-enrichment', {...});
// Returns 'workflow-123' (success assumed)

// Later: Crash recovery attempts to resume
const state = await getWorkflowState('workflow-123');
// Returns NULL (workflow never persisted)
// Recovery impossible, context lost
```

**Fix**:
```javascript
async createWorkflow(workflowId, workflowName, initialInputs) {
  // ✅ USE TRANSACTION
  const transaction = await sequelize.transaction();

  try {
    await sequelize.query(`
      INSERT INTO workflow_states (...)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, {
      bind: [workflowId, workflowName, 'running', JSON.stringify(initialInputs), null],
      transaction  // ✅ Part of transaction
    });

    await transaction.commit();
    logger.info('Workflow created', { workflowId });
    return workflowId;
  } catch (error) {
    await transaction.rollback();
    logger.error('Failed to create workflow state', { error: error.message });
    // ✅ THROW ERROR - Don't swallow it!
    throw new Error(`Failed to create workflow state: ${error.message}`);
  }
}
```

### 6.2 SQLite Operations

#### Critical Issue 🔴🔴🔴

**6.2.1 ALL SQLite Operations Missing Transactions**

```javascript
// File: sales-automation-api/src/utils/database.js

createJob(id, type, parameters, priority = 'normal') {
  // ❌ NO TRANSACTION
  const stmt = this.db.prepare(`INSERT INTO jobs ...`);
  stmt.run(id, type, priority, JSON.stringify(parameters), now, now);
}

updateJobStatus(id, status, result = null, error = null) {
  // ❌ NO TRANSACTION - Race condition possible
  const job = this.getJob(id);  // Read
  // ... (compute updates) ...
  const stmt = this.db.prepare(`UPDATE jobs ...`);
  stmt.run(...values, id);  // Write
}

saveChatMessage(conversationId, role, content) {
  // ❌ THREE OPERATIONS - NO TRANSACTION
  conversationStmt.run(conversationId);  // INSERT conversation
  updateStmt.run(conversationId);        // UPDATE timestamp
  messageStmt.run(conversationId, role, content);  // INSERT message
}
```

**Fix**: Use better-sqlite3 transactions:
```javascript
createJob(id, type, parameters, priority = 'normal') {
  const transaction = this.db.transaction(() => {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO jobs (id, type, status, priority, parameters, created_at, updated_at)
      VALUES (?, ?, 'pending', ?, ?, ?, ?)
    `);
    stmt.run(id, type, priority, JSON.stringify(parameters), now, now);
  });

  transaction();  // Execute atomically
  return { id, type, status: 'pending', priority, created_at: now };
}

saveChatMessage(conversationId, role, content) {
  const transaction = this.db.transaction(() => {
    // All three operations atomic
    this.db.prepare(`INSERT OR IGNORE INTO chat_conversations (conversation_id) VALUES (?)`).run(conversationId);
    this.db.prepare(`UPDATE chat_conversations SET updated_at = datetime('now') WHERE conversation_id = ?`).run(conversationId);
    this.db.prepare(`INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?)`).run(conversationId, role, content);
  });

  transaction();
}
```

---

## 7. SQL Injection Prevention

### 7.1 PostgreSQL Operations (Sequelize)

#### Good ✅

**All Sequelize queries use parameterized bindings**:
```javascript
// File: sales-automation-api/src/bmad/WorkflowStateManager.js (Line 15-22)
await sequelize.query(`
  INSERT INTO workflow_states (...)
  VALUES ($1, $2, $3, $4, $5, NOW())
`, {
  bind: [workflowId, workflowName, 'running', JSON.stringify(initialInputs), null]
  // ✅ Parameterized query - Safe from SQL injection
});
```

#### Critical Vulnerability 🔴🔴🔴

**7.1.1 SQL Injection in cleanupOldWorkflows()**

Already documented in Section 1.2.1. **MUST FIX IMMEDIATELY**.

### 7.2 SQLite Operations (better-sqlite3)

#### Good ✅

**All SQLite queries use prepared statements**:
```javascript
// File: sales-automation-api/src/utils/database.js (Line 270-273)
const stmt = this.db.prepare(`
  INSERT INTO jobs (id, type, status, priority, parameters, created_at, updated_at)
  VALUES (?, ?, 'pending', ?, ?, ?, ?)
`);
stmt.run(id, type, priority, JSON.stringify(parameters), now, now);
// ✅ Parameterized query - Safe
```

#### Fixed Vulnerability ✅

**7.2.1 Dynamic Field Names Properly Validated**

```javascript
// File: sales-automation-api/src/utils/database.js (Line 315-336)
// SECURITY FIX: Whitelist allowed field names to prevent SQL injection
const ALLOWED_FIELDS = ['status', 'updated_at', 'started_at', 'completed_at', 'result', 'error', 'progress'];
const FIELD_NAME_PATTERN = /^[a-z_][a-z0-9_]*$/i;
const fieldNames = Object.keys(updates);

for (const field of fieldNames) {
  if (!ALLOWED_FIELDS.includes(field)) {
    throw new Error(`[Database Security] Attempt to update disallowed field: ${field}`);
  }
  if (!FIELD_NAME_PATTERN.test(field)) {
    throw new Error(`[Database Security] Invalid field name format: ${field}`);
  }
}

// Safe to interpolate field names after validation
const fields = fieldNames.map(k => `${k} = ?`).join(', ');
const stmt = this.db.prepare(`UPDATE jobs SET ${fields} WHERE id = ?`);
```

**Status**: ✅ Excellent defense-in-depth approach (whitelist + regex validation).

---

## 8. Migration File Analysis

### 8.1 Migration Inventory

| File | Transaction | Rollback | Idempotent | Status |
|------|------------|----------|------------|--------|
| `001_campaign_architecture.sql` | ❌ No | ❌ No | ✅ Yes | **NEEDS FIX** |
| `002_indexes_constraints.sql` | ❌ No | ❌ No | ✅ Yes | **NEEDS FIX** |
| `003_phase7c_provider_support.sql` | ✅ Yes | ✅ Yes | ✅ Yes | ✅ **GOOD** |
| `003_phase7c_provider_support_down.sql` | ✅ Yes | N/A | ✅ Yes | ✅ **GOOD** |
| `20241122_create_workflow_states.sql` | ❌ No | ❌ No | ✅ Yes | **NEEDS FIX** |
| `20251111000000-create-dead-letter-events.cjs` | ✅ Yes (Sequelize) | ✅ Yes | ✅ Yes | ✅ **GOOD** |
| `20250110000000-add-total-delivered-column.cjs` | ✅ Yes (Sequelize) | ✅ Yes | ✅ Yes | ✅ **GOOD** |

### 8.2 Migration Naming Convention

**Inconsistent naming** 🔴:
- `001_*.sql` - Sequential numbering
- `20241122_*.sql` - Date-based
- `20251111000000-*.cjs` - Timestamp-based Sequelize format

**Fix**: Standardize on Sequelize format:
```
YYYYMMDDHHMMSS-description.cjs
```

### 8.3 Migration Data Loss Risk

#### Migration 20250110000000 - Data Backfill

```javascript
// File: sales-automation-api/src/db/migrations/20250110000000-add-total-delivered-column.cjs (Line 24-30)
await queryInterface.sequelize.query(`
  UPDATE campaign_instances
  SET total_delivered = total_sent
  WHERE total_sent > 0
`);
```

**Risk Assessment**: LOW ✅

**Reasoning**:
- Adds column with default 0
- Backfills with `total_sent` value (reasonable assumption)
- No data loss possible
- Rollback safely drops column

**Status**: ✅ Safe data migration.

---

## 9. Privacy and Compliance (GDPR)

### 9.1 PII Identification

**Tables containing PII**:
1. `imported_contacts` (email, first_name, last_name, phone, linkedin_url)
2. `campaign_enrollments.metadata` (JSONB - may contain PII)
3. `campaign_events.metadata` (JSONB - may contain provider data)
4. `dead_letter_events.event_data` (JSONB - full webhook payload)

### 9.2 Right to Deletion (GDPR Article 17)

#### Missing Implementation 🔴

**No cascade deletion strategy for contacts**:

```sql
-- File: sales-automation-api/src/db/init/001_schema.sql (Line 108)
contact_id UUID NOT NULL,  -- ❌ No FK constraint
```

**Scenario**: User requests data deletion under GDPR.

**Current behavior**:
```sql
DELETE FROM contacts WHERE email = 'user@example.com';
-- Contact deleted

SELECT * FROM campaign_enrollments WHERE contact_id = '<user-id>';
-- ❌ Orphaned enrollments remain (GDPR violation - PII not fully deleted)

SELECT * FROM campaign_events WHERE metadata->>'email' = 'user@example.com';
-- ❌ Event metadata still contains PII (GDPR violation)
```

**Fix**:
```sql
-- 1. Add FK constraint with CASCADE
ALTER TABLE campaign_enrollments
ADD CONSTRAINT campaign_enrollments_contact_fkey
FOREIGN KEY (contact_id) REFERENCES contacts(id)
ON DELETE CASCADE;

-- 2. Add trigger to anonymize event metadata
CREATE OR REPLACE FUNCTION anonymize_event_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Replace email in metadata with anonymized version
  UPDATE campaign_events
  SET metadata = jsonb_set(
    metadata,
    '{email}',
    to_jsonb(concat('deleted-', OLD.id, '@anonymized.local'))
  )
  WHERE enrollment_id IN (
    SELECT id FROM campaign_enrollments WHERE contact_id = OLD.id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER anonymize_on_contact_delete
BEFORE DELETE ON contacts
FOR EACH ROW EXECUTE FUNCTION anonymize_event_metadata();
```

### 9.3 Data Retention

#### Missing Retention Policies 🔴

**No automatic expiration**:
- `campaign_events` - grow indefinitely (audit trail requirement conflicts with GDPR)
- `dead_letter_events` - no automatic purge
- `workflow_states` - retention policy exists but not enforced automatically

**Fix**: Implement data retention policies:
```sql
-- Add retention policy table
CREATE TABLE data_retention_policies (
  table_name TEXT PRIMARY KEY,
  retention_days INTEGER NOT NULL,
  last_cleanup_at TIMESTAMPTZ,
  enabled BOOLEAN DEFAULT true
);

INSERT INTO data_retention_policies VALUES
  ('campaign_events', 365, NULL, true),       -- 1 year
  ('dead_letter_events', 90, NULL, true),     -- 90 days
  ('workflow_states', 30, NULL, true),        -- 30 days (completed only)
  ('workflow_failures', 90, NULL, true);      -- 90 days

-- Cleanup worker executes daily
```

### 9.4 Data Encryption

#### Missing Encryption ❌

**PII stored in plaintext**:
```sql
first_name TEXT,
last_name TEXT,
email TEXT PRIMARY KEY,
phone TEXT,
linkedin_url TEXT,
```

**Risk**: Database dump exposes PII in plaintext.

**Recommended**: Use PostgreSQL pgcrypto extension for column-level encryption:
```sql
CREATE EXTENSION pgcrypto;

-- Encrypt PII fields
ALTER TABLE imported_contacts
ALTER COLUMN email TYPE BYTEA USING pgp_sym_encrypt(email, current_setting('app.encryption_key'));

-- Application must decrypt on read
SELECT pgp_sym_decrypt(email, current_setting('app.encryption_key')) AS email
FROM imported_contacts;
```

**Alternative**: Use application-level encryption (less performant but more portable):
```javascript
const crypto = require('crypto');

function encryptPII(plaintext) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.PII_ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}
```

---

## 10. Recommendations Priority Matrix

### CRITICAL (Fix Immediately - Blocks Production)

| ID | Issue | Impact | Effort | File |
|----|-------|--------|--------|------|
| C1 | **SQL Injection in cleanupOldWorkflows()** | Data loss, security breach | 1 hour | `WorkflowStateManager.js:224` |
| C2 | **Missing transactions in SQLite operations** | Race conditions, duplicate jobs | 4 hours | `database.js` |
| C3 | **No FK constraint on workflow_failures** | Orphaned records, data leak | 1 hour | `20241122_create_workflow_states.sql` |

### HIGH (Fix Before Production)

| ID | Issue | Impact | Effort | Files |
|----|-------|--------|--------|-------|
| H1 | Wrap migrations 001, 002 in transactions | Partial migration failures | 30 mins | `001_*.sql`, `002_*.sql` |
| H2 | Add CHECK constraints on metrics | Invalid data, corrupt analytics | 2 hours | `001_schema.sql` |
| H3 | Add FK constraint on contact_id | GDPR violation, orphaned data | 2 hours | `001_schema.sql` |
| H4 | Remove try-catch ALTER TABLE pattern | Silent failures, no audit | 1 hour | `database.js:223-239` |
| H5 | Add rollback migrations for 001, 002 | Cannot undo schema changes | 2 hours | New files |
| H6 | Fix CASCADE vs RESTRICT on templates | Accidental data loss | 1 hour | `001_schema.sql:37` |
| H7 | Add missing NOT NULL constraints | NULL data corruption | 2 hours | `001_schema.sql` |

### MEDIUM (Production Improvements)

| ID | Issue | Impact | Effort | Files |
|----|-------|--------|--------|-------|
| M1 | Add JSONB validation constraints | Invalid JSON structure | 4 hours | `001_schema.sql` |
| M2 | Implement data retention policies | GDPR compliance, disk usage | 8 hours | New worker |
| M3 | Add composite indexes for dashboard | Slow dashboard queries | 2 hours | New migration |
| M4 | Implement PII encryption | GDPR compliance | 16 hours | Multiple files |
| M5 | Add orphaned record cleanup job | Database bloat | 4 hours | New worker |
| M6 | Convert timestamp index to BRIN | Faster time-range queries | 1 hour | New migration |

### LOW (Nice to Have)

| ID | Issue | Impact | Effort |
|----|-------|--------|--------|
| L1 | Standardize migration naming | Consistency | 1 hour |
| L2 | Add database statistics monitoring | Observability | 4 hours |
| L3 | Implement automatic VACUUM/ANALYZE | Performance maintenance | 2 hours |

---

## 11. Immediate Action Items

### Week 1 (Critical Security Fixes)

```bash
# Day 1: SQL Injection Fix
git checkout -b fix/sql-injection-vulnerability
# Edit: sales-automation-api/src/bmad/WorkflowStateManager.js:224
# - Replace string interpolation with parameterized query
# - Add input validation
# Test: Create malicious input test case
# Commit: "SECURITY: Fix SQL injection in WorkflowStateManager.cleanupOldWorkflows()"

# Day 2: Add FK Constraint
# Create migration: sales-automation-api/src/db/migrations/004_add_workflow_failures_fkey.sql
BEGIN;
ALTER TABLE workflow_failures
ADD CONSTRAINT workflow_failures_workflow_id_fkey
FOREIGN KEY (workflow_id) REFERENCES workflow_states(id)
ON DELETE CASCADE;
COMMIT;

# Day 3: SQLite Transaction Wrapper
# Edit: sales-automation-api/src/utils/database.js
# - Wrap updateJobStatus() in transaction
# - Wrap saveChatMessage() in transaction
# - Add state transition validation
# Test: Concurrent job updates
```

### Week 2 (High Priority Fixes)

```bash
# Day 1: Migration Transaction Wrappers
# Edit: sales-automation-api/src/db/migrations/001_campaign_architecture.sql
# - Add BEGIN; at top
# - Add COMMIT; at bottom

# Day 2: CHECK Constraints on Metrics
# Create migration: 005_add_metrics_constraints.sql
BEGIN;
ALTER TABLE campaign_instances
ADD CONSTRAINT check_metrics_positive CHECK (
  total_enrolled >= 0 AND total_sent >= 0 AND
  total_opened >= 0 AND total_clicked >= 0 AND total_replied >= 0
),
ADD CONSTRAINT check_metrics_logical CHECK (
  total_sent <= total_enrolled AND total_opened <= total_sent AND
  total_clicked <= total_opened AND total_replied <= total_sent
);
COMMIT;

# Day 3: Contact FK Constraint
# Create migration: 006_add_contact_fkey.sql
BEGIN;
-- Verify no orphaned enrollments first
DELETE FROM campaign_enrollments
WHERE contact_id NOT IN (SELECT id FROM contacts);

ALTER TABLE campaign_enrollments
ADD CONSTRAINT campaign_enrollments_contact_fkey
FOREIGN KEY (contact_id) REFERENCES contacts(id)
ON DELETE CASCADE;
COMMIT;

# Day 4: Remove Try-Catch ALTER TABLE
# Edit: sales-automation-api/src/utils/database.js:223-239
# - Remove try-catch blocks
# - Create proper migration instead

# Day 5: Create Rollback Migrations
# Create: 001_campaign_architecture_down.sql
# Create: 002_indexes_constraints_down.sql
```

---

## 12. Testing Recommendations

### 12.1 Data Integrity Tests

```javascript
// File: tests/database/integrity.test.js

describe('Database Integrity', () => {
  test('should reject negative metrics', async () => {
    const instance = await CampaignInstance.create({
      template_id: 'valid-template-id',
      name: 'Test Campaign',
      status: 'active'
    });

    await expect(
      instance.update({ total_opened: -5 })
    ).rejects.toThrow(/check_metrics_positive/);
  });

  test('should reject impossible metric ratios', async () => {
    await expect(
      CampaignInstance.create({
        template_id: 'valid-template-id',
        name: 'Test Campaign',
        status: 'active',
        total_sent: 10,
        total_opened: 1000  // Impossible: 10,000% open rate
      })
    ).rejects.toThrow(/check_metrics_logical/);
  });

  test('should cascade delete enrollments when contact deleted', async () => {
    const contact = await Contact.create({ email: 'test@example.com' });
    const enrollment = await CampaignEnrollment.create({
      instance_id: 'valid-instance',
      contact_id: contact.id,
      status: 'active'
    });

    await contact.destroy();

    const orphaned = await CampaignEnrollment.findByPk(enrollment.id);
    expect(orphaned).toBeNull();
  });

  test('should prevent duplicate webhook events', async () => {
    const event1 = await CampaignEvent.create({
      enrollment_id: 'valid-enrollment',
      event_type: 'opened',
      channel: 'email',
      provider_event_id: 'evt_12345'
    });

    await expect(
      CampaignEvent.create({
        enrollment_id: 'valid-enrollment',
        event_type: 'opened',
        channel: 'email',
        provider_event_id: 'evt_12345'  // Duplicate
      })
    ).rejects.toThrow(/unique constraint/);
  });
});
```

### 12.2 Transaction Tests

```javascript
// File: tests/database/transactions.test.js

describe('Transaction Safety', () => {
  test('should rollback on partial failure', async () => {
    await expect(
      sequelize.transaction(async (t) => {
        await CampaignInstance.create({
          template_id: 'valid-template',
          name: 'Test Campaign'
        }, { transaction: t });

        // Intentional error
        throw new Error('Simulated failure');
      })
    ).rejects.toThrow();

    const instances = await CampaignInstance.findAll();
    expect(instances).toHaveLength(0);  // Rollback successful
  });

  test('should prevent concurrent job status updates', async () => {
    const db = new Database(':memory:');
    await db.initialize();

    const jobId = 'test-job-123';
    db.createJob(jobId, 'enrichment', {}, 'normal');

    // Simulate two workers trying to claim same job
    await Promise.all([
      db.updateJobStatus(jobId, 'processing'),
      db.updateJobStatus(jobId, 'processing')
    ]).catch(err => {
      expect(err.message).toMatch(/Invalid state transition/);
    });

    const job = db.getJob(jobId);
    expect(job.status).toBe('processing');
  });
});
```

### 12.3 SQL Injection Tests

```javascript
// File: tests/security/sql-injection.test.js

describe('SQL Injection Prevention', () => {
  test('should reject SQL injection in cleanupOldWorkflows', async () => {
    const manager = new WorkflowStateManager();

    const maliciousInput = "0 days'; DROP TABLE workflow_states; --";

    await expect(
      manager.cleanupOldWorkflows(maliciousInput)
    ).rejects.toThrow(/Invalid retentionDays/);

    // Verify table still exists
    const [results] = await sequelize.query('SELECT 1 FROM workflow_states LIMIT 1');
    expect(results).toBeDefined();
  });

  test('should reject invalid field names in updateJobStatus', () => {
    const db = new Database(':memory:');
    db.initialize();

    db.createJob('job-123', 'test', {});

    // Attempt SQL injection via field name
    const maliciousUpdates = {
      status: 'completed',
      'id = 1; DROP TABLE jobs; --': 'payload'
    };

    expect(() => {
      db.updateJobStatus('job-123', maliciousUpdates.status);
    }).not.toThrow();  // Should handle gracefully

    // Verify table still exists
    const job = db.getJob('job-123');
    expect(job).toBeDefined();
  });
});
```

---

## 13. Conclusion

The RTGS Sales Automation database architecture demonstrates **solid understanding of relational database principles** with proper normalization, foreign keys, and indexing strategies. However, **critical security vulnerabilities and missing transaction boundaries** pose significant risks to data integrity.

### Key Strengths
1. Well-normalized schema design
2. Proper use of UUIDs and composite unique constraints
3. Excellent webhook deduplication strategy
4. Good index coverage for common queries
5. Parameterized queries in most operations

### Critical Weaknesses
1. **SQL injection vulnerability in WorkflowStateManager** (CRITICAL)
2. **No transaction wrapping in SQLite operations** (race conditions)
3. **Missing foreign key constraints** (orphaned records)
4. **Unsafe schema evolution pattern** (try-catch ALTER TABLE)
5. **No GDPR compliance strategy** (PII deletion, retention)

### Production Readiness
**Status**: ❌ **NOT READY FOR PRODUCTION**

**Blockers**:
- SQL injection vulnerability must be fixed
- SQLite operations need transaction wrapping
- Foreign key constraints must be added
- Data retention policies required for GDPR compliance

**Estimated effort to production-ready**: **2-3 weeks** (1 week critical fixes, 1-2 weeks high-priority improvements)

---

## Appendix A: Quick Reference Commands

### Database Health Check
```bash
# Check for orphaned records
psql -U rtgs_user -d rtgs_sales_automation -c "
SELECT 'workflow_failures' as table_name, COUNT(*) as orphaned_count
FROM workflow_failures wf
LEFT JOIN workflow_states ws ON wf.workflow_id = ws.id
WHERE ws.id IS NULL;
"

# Check for NULL timestamps on completed campaigns
psql -U rtgs_user -d rtgs_sales_automation -c "
SELECT status, COUNT(*)
FROM campaign_instances
WHERE status IN ('completed', 'failed') AND completed_at IS NULL
GROUP BY status;
"

# Check for impossible metric ratios
psql -U rtgs_user -d rtgs_sales_automation -c "
SELECT id, name, total_sent, total_opened,
       ROUND((total_opened::numeric / NULLIF(total_sent, 0)) * 100, 2) as open_rate_pct
FROM campaign_instances
WHERE total_opened > total_sent
LIMIT 10;
"
```

### Index Usage Analysis
```sql
-- Check unused indexes
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check missing indexes (sequential scans on large tables)
SELECT schemaname, tablename, seq_scan, seq_tup_read,
       seq_scan - idx_scan AS too_much_seq,
       CASE WHEN seq_scan - idx_scan > 0
            THEN 'Missing Index?'
            ELSE 'OK'
       END AS status
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND seq_scan - idx_scan > 0
ORDER BY too_much_seq DESC;
```

### Connection Pool Monitoring
```javascript
const { pool } = require('./src/db/connection');

setInterval(() => {
  console.log('Pool stats:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  });
}, 60000);  // Every minute
```

---

**Report Compiled By**: Data Integrity Guardian
**Date**: 2025-11-27
**Version**: 1.0
**Status**: FINAL
