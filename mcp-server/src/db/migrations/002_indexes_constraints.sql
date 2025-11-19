-- Migration 002: Performance Indexes and Constraints
-- Optimized indexes for critical query patterns
-- This migration is idempotent and can be run multiple times safely

-- ============================================================================
-- BASIC INDEXES (template queries)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_campaign_templates_type ON campaign_templates(type);
CREATE INDEX IF NOT EXISTS idx_campaign_templates_path_type ON campaign_templates(path_type);
CREATE INDEX IF NOT EXISTS idx_campaign_templates_active ON campaign_templates(is_active);

-- ============================================================================
-- CAMPAIGN INSTANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_campaign_instances_template ON campaign_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_campaign_instances_status ON campaign_instances(status);

-- ============================================================================
-- SEQUENCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_email_sequences_template ON email_sequences(template_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_step ON email_sequences(template_id, step_number);

CREATE INDEX IF NOT EXISTS idx_linkedin_sequences_template ON linkedin_sequences(template_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_sequences_step ON linkedin_sequences(template_id, step_number);

-- ============================================================================
-- ENROLLMENT INDEXES (CRITICAL FOR AUTOMATION)
-- ============================================================================

-- Basic lookups
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_instance ON campaign_enrollments(instance_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_contact ON campaign_enrollments(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_status ON campaign_enrollments(status);

-- OPTIMIZED: Partial index for automation worker queries
-- This index ONLY includes active enrollments ready for next action
-- Much faster than filtering all enrollments by status
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_active_next_action
    ON campaign_enrollments(next_action_at)
    WHERE status = 'active' AND next_action_at IS NOT NULL;

-- ============================================================================
-- EVENT INDEXES (CRITICAL FOR ANALYTICS)
-- ============================================================================

-- Basic lookups
CREATE INDEX IF NOT EXISTS idx_campaign_events_enrollment ON campaign_events(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_type ON campaign_events(event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_events_timestamp ON campaign_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_campaign_events_channel ON campaign_events(channel);

-- OPTIMIZED: Composite index for channel + event type analytics
-- Enables fast queries like "SELECT COUNT(*) WHERE channel='email' AND event_type='opened'"
CREATE INDEX IF NOT EXISTS idx_campaign_events_channel_type
    ON campaign_events(channel, event_type);

-- OPTIMIZED: Composite index for enrollment analytics
-- Enables fast queries like "SELECT * FROM events WHERE enrollment_id=X AND event_type='clicked'"
CREATE INDEX IF NOT EXISTS idx_campaign_events_enrollment_type
    ON campaign_events(enrollment_id, event_type);

-- ============================================================================
-- WEBHOOK DEDUPLICATION (Already in 001, but confirmed here)
-- ============================================================================

-- UNIQUE index on provider_event_id to prevent duplicate webhook processing
-- This is CRITICAL - without it, metrics will be inflated
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_events_provider_id_unique
    ON campaign_events(provider_event_id)
    WHERE provider_event_id IS NOT NULL;

-- ============================================================================
-- EXPLAIN: How These Indexes Work
-- ============================================================================

-- Query: Find next actions for automation worker
-- SELECT * FROM campaign_enrollments
-- WHERE status = 'active' AND next_action_at <= NOW()
-- ORDER BY next_action_at LIMIT 100;
-- Uses: idx_campaign_enrollments_active_next_action (partial index)

-- Query: Email open rate by campaign
-- SELECT instance_id, COUNT(*) as opens
-- FROM campaign_events ce
-- JOIN campaign_enrollments enr ON ce.enrollment_id = enr.id
-- WHERE ce.channel = 'email' AND ce.event_type = 'opened'
-- GROUP BY enr.instance_id;
-- Uses: idx_campaign_events_channel_type (composite)

-- Query: Check if webhook already processed
-- SELECT id FROM campaign_events
-- WHERE provider_event_id = 'lemlist_evt_12345';
-- Uses: idx_campaign_events_provider_id_unique (UNIQUE prevents duplicates)

-- ============================================================================
-- STATISTICS UPDATE
-- ============================================================================

-- Update table statistics for query planner
ANALYZE campaign_templates;
ANALYZE campaign_instances;
ANALYZE email_sequences;
ANALYZE linkedin_sequences;
ANALYZE campaign_enrollments;
ANALYZE campaign_events;
