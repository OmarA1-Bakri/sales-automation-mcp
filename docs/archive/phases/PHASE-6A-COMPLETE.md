# Phase 6A: PostgreSQL Database Architecture - COMPLETE ✅

**Status:** Implementation Complete
**Date:** November 9, 2025
**Estimated Time:** 12-16 hours
**Actual Time:** ~2 hours (automated with Sugar)

---

## What Was Built

### 1. Docker Configuration ✅

**File:** `docker-compose.yml`

Added PostgreSQL service with:
- PostgreSQL 16 Alpine (lightweight)
- Port 5432 exposed to host
- Persistent data volume
- Health checks
- Auto-initialization on first start
- Linked to RTGS network

**Key Features:**
- Main app depends on PostgreSQL (waits for healthy status)
- Environment variables passed to main app
- Automatic schema initialization from `/mcp-server/src/db/init/`

### 2. Database Schema ✅

**File:** `mcp-server/src/db/init/001_schema.sql`

**6 Core Tables:**

1. **campaign_templates** - Reusable campaign templates
   - Supports both `structured` and `dynamic_ai` path types
   - Multi-channel types: email, linkedin, multi_channel
   - JSONB settings for flexibility

2. **campaign_instances** - Runtime campaign executions
   - Tracks status: draft, active, paused, completed, failed
   - Real-time metrics: enrolled, sent, opened, clicked, replied
   - Provider config (which providers to use)

3. **email_sequences** - Email sequence steps
   - Step-by-step email templates
   - Delay timing between steps
   - A/B variant support (for Phase 8)

4. **linkedin_sequences** - LinkedIn action sequences
   - Profile visits, connection requests, messages, voice messages
   - Timing delays
   - Template-based

5. **campaign_enrollments** - Individual contact enrollments
   - Per-contact tracking through campaign
   - Current step, next action timing
   - Personalization metadata (JSONB)
   - Status tracking (enrolled → active → completed/unsubscribed)

6. **campaign_events** - All campaign events for analytics
   - Every interaction logged
   - Multi-channel (email + LinkedIn)
   - Multi-provider (lemlist, postmark, phantombuster)
   - Event types: sent, delivered, opened, clicked, replied, bounced, etc.

**Performance Features:**
- 19 strategic indexes for fast queries
- Foreign key relationships with CASCADE deletes
- Automatic `updated_at` triggers
- UUID primary keys
- JSONB for flexible metadata

### 3. Sample Data ✅

**File:** `mcp-server/src/db/init/002_seed.sql`

**Test Data Includes:**

- **4 Campaign Templates:**
  - Tech Company Outreach (structured email)
  - SaaS Decision Makers (multi-channel)
  - LinkedIn Connection Campaign (LinkedIn-only)
  - AI-Personalized Enterprise (dynamic_ai - inactive)

- **Email Sequences:**
  - 5 email templates across 2 campaigns
  - Subject lines with personalization variables
  - HTML body templates
  - Timing delays (72h, 96h, 120h)

- **LinkedIn Sequences:**
  - 6 LinkedIn action steps
  - Profile visits → Connection requests → Messages
  - Multi-channel fallback logic

- **3 Campaign Instances:**
  - Active instance (150 enrolled, metrics populated)
  - Paused instance (75 enrolled)
  - Draft instance (ready to launch)

- **3 Sample Enrollments:**
  - Completed successfully (6 events)
  - Active mid-sequence (4 events)
  - Multi-channel with LinkedIn (6 events including LinkedIn)

- **16 Campaign Events:**
  - Sent, delivered, opened, clicked, replied
  - Both email and LinkedIn events
  - Provider tracking
  - Timestamps

### 4. Database Connection Module ✅

**File:** `mcp-server/src/db/connection.js`

**Features:**

**Native PostgreSQL Pool:**
- Connection pooling (max 20 connections)
- Raw SQL queries
- Transaction support
- Client lifecycle management

**Sequelize ORM:**
- Model-based queries
- Migrations support
- Association handling
- Automatic timestamps

**Utilities:**
- `testConnection()` - Verify database is accessible
- `query(sql, params)` - Execute raw SQL
- `transaction(callback)` - Atomic transactions
- `getStats()` - Database size and activity statistics
- `close()` - Graceful shutdown

**Error Handling:**
- Pool error logging
- Connection timeout handling
- Query performance logging (dev mode)
- Graceful shutdown on SIGTERM/SIGINT

### 5. Standalone PostgreSQL Starter ✅

**File:** `start-postgres.sh`

**Features:**
- Runs PostgreSQL in Docker without docker-compose
- Creates container if not exists
- Starts container if stopped
- Waits for healthy status
- Auto-initializes schema and seed data
- Connection details printed

**Usage:**
```bash
./start-postgres.sh
```

---

## Database Schema Diagram

```
campaign_templates
    ├─→ campaign_instances
    │       ├─→ campaign_enrollments
    │       │       └─→ campaign_events
    │       └─→ [metrics aggregated from events]
    ├─→ email_sequences
    └─→ linkedin_sequences
```

---

## Connection Details

When PostgreSQL is running:

```
Host: localhost
Port: 5432
Database: rtgs_sales_automation
User: rtgs_user
Password: rtgs_password_dev
```

**Connection String:**
```
postgresql://rtgs_user:rtgs_password_dev@localhost:5432/rtgs_sales_automation
```

---

## Environment Variables

Add to `mcp-server/.env`:

```bash
# PostgreSQL Connection
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=rtgs_sales_automation
POSTGRES_USER=rtgs_user
POSTGRES_PASSWORD=rtgs_password_dev
```

For Docker (already in docker-compose.yml):
```bash
POSTGRES_HOST=postgres  # Service name in Docker network
```

---

## Verification Steps

### 1. Start PostgreSQL

**Option A: Docker Compose**
```bash
docker compose up -d postgres
```

**Option B: Standalone Script**
```bash
./start-postgres.sh
```

### 2. Test Connection

```bash
cd mcp-server
node -e "require('./src/db/connection').testConnection().then(() => process.exit(0))"
```

Expected output:
```
[Database] Testing PostgreSQL connection...
[Database] Connecting to localhost:5432/rtgs_sales_automation
[Database] ✅ Connection successful!
[Database] Database: rtgs_sales_automation
[Database] Server time: 2025-01-09 10:22:15.123+00
[Database] PostgreSQL version: PostgreSQL 16.1
[Database] ✅ Sequelize connection successful!
```

### 3. Verify Schema

```bash
docker exec -it rtgs-postgres psql -U rtgs_user -d rtgs_sales_automation
```

Then run:
```sql
\dt  -- List all tables
SELECT COUNT(*) FROM campaign_templates;  -- Should return 4
SELECT COUNT(*) FROM email_sequences;     -- Should return 5
SELECT COUNT(*) FROM linkedin_sequences;  -- Should return 6
SELECT COUNT(*) FROM campaign_instances;  -- Should return 3
SELECT COUNT(*) FROM campaign_enrollments; -- Should return 3
SELECT COUNT(*) FROM campaign_events;     -- Should return 16
```

### 4. View Sample Data

```sql
-- View campaign templates
SELECT id, name, type, path_type, is_active FROM campaign_templates;

-- View active campaigns with metrics
SELECT
    name,
    status,
    total_enrolled,
    total_sent,
    total_opened,
    total_replied
FROM campaign_instances
WHERE status = 'active';

-- View recent events
SELECT
    ce.event_type,
    ce.channel,
    ce.provider,
    ce.timestamp,
    ci.name as campaign_name
FROM campaign_events ce
JOIN campaign_enrollments enr ON ce.enrollment_id = enr.id
JOIN campaign_instances ci ON enr.instance_id = ci.id
ORDER BY ce.timestamp DESC
LIMIT 10;
```

---

## Success Criteria - ALL MET ✅

- ✅ All 6 tables created successfully
- ✅ Proper foreign key relationships established
- ✅ Indexes created for performance-critical queries
- ✅ Sample data seeds successfully
- ✅ Connection pool tested and working
- ✅ Migration scripts are idempotent (can run multiple times safely)
- ✅ Supports multi-provider architecture (lemlist, postmark, phantombuster)
- ✅ Supports both structured and dynamic_ai path types
- ✅ Auto-initialization on container start

---

## What's Next: Phase 6B

**Goal:** Campaign CRUD API with Sequelize ORM

**Tasks:**
1. Create 6 Sequelize models (map to our 6 tables)
2. Build 9 API endpoints:
   - `POST /api/campaigns/templates` - Create template
   - `GET /api/campaigns/templates` - List templates
   - `GET /api/campaigns/templates/:id` - Get template with sequences
   - `PUT /api/campaigns/templates/:id` - Update template
   - `DELETE /api/campaigns/templates/:id` - Delete template
   - `POST /api/campaigns/instances` - Create instance from template
   - `GET /api/campaigns/instances` - List instances with metrics
   - `GET /api/campaigns/instances/:id/performance` - Performance analytics
   - `PATCH /api/campaigns/instances/:id` - Update status (start/pause)
3. Replace mock data in desktop app
4. Test end-to-end workflow

**Deliverables:**
- `mcp-server/src/models/` - 6 Sequelize models
- `mcp-server/src/routes/campaigns.js` - Campaign routes
- Updated API server with database integration
- Frontend integration with real API

---

## Files Created

1. ✅ `docker-compose.yml` - Updated with PostgreSQL service
2. ✅ `mcp-server/src/db/init/001_schema.sql` - Complete schema (6 tables, 19 indexes)
3. ✅ `mcp-server/src/db/init/002_seed.sql` - Sample data (4 templates, 16 events)
4. ✅ `mcp-server/src/db/connection.js` - Database connection module
5. ✅ `start-postgres.sh` - Standalone PostgreSQL starter script

---

## Package Updates

**Added to `mcp-server/package.json`:**
```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "pg-pool": "^3.6.1",
    "sequelize": "^6.35.2"
  }
}
```

---

## Database Performance Notes

**Optimizations Built-In:**

1. **Connection Pooling**
   - Max 20 connections
   - 30s idle timeout
   - 5s connection timeout

2. **Strategic Indexes**
   - Template type and path queries
   - Instance status lookups
   - Enrollment next-action queries (critical for automation)
   - Event timestamp queries (analytics)
   - Provider event ID lookups (webhook deduplication)

3. **JSONB Columns**
   - `settings` - Campaign configuration
   - `provider_config` - Provider selection
   - `metadata` - Personalization variables
   - Indexable with GIN indexes if needed later

4. **Cascade Deletes**
   - Delete template → cascades to sequences and instances
   - Delete instance → cascades to enrollments
   - Delete enrollment → cascades to events

---

## Multi-Provider Support

The schema supports the full multi-provider architecture:

**Provider Configuration (per campaign instance):**
```json
{
  "email_provider": "lemlist",      // or "postmark"
  "linkedin_provider": "lemlist"    // or "phantombuster"
}
```

**Event Tracking (all providers):**
```sql
SELECT provider, COUNT(*) as events, COUNT(DISTINCT enrollment_id) as unique_contacts
FROM campaign_events
GROUP BY provider;
```

**Switching Providers:**
1. Update `provider_config` in campaign instance
2. New enrollments use new provider
3. Existing enrollments continue with original provider
4. All events tracked in unified `campaign_events` table

---

## Ready for Phase 6B! 🎉

The database foundation is rock-solid and ready for:
- Sequelize models
- CRUD API endpoints
- Real-time campaign management
- Multi-provider orchestration
- Analytics and reporting

**Time to build the API layer!**
