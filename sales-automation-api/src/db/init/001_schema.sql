-- RTGS Sales Automation - Campaign Database Schema
-- Phase 6A: PostgreSQL Database Architecture
-- 6 Core Tables for Multi-Provider Campaign Management
--
-- IMPORTANT: This file runs on Docker container initialization ONLY
-- For production schema changes, use migrations in /mcp-server/src/db/migrations/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE 1: campaign_templates
-- Purpose: Store reusable campaign templates (structured & dynamic_ai paths)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'linkedin', 'multi_channel')),
    path_type VARCHAR(50) NOT NULL CHECK (path_type IN ('structured', 'dynamic_ai')),
    icp_profile_id UUID,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

-- ============================================================================
-- TABLE 2: campaign_instances
-- Purpose: Track runtime campaign executions
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES campaign_templates(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_enrolled INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_replied INTEGER DEFAULT 0,
    provider_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE 3: email_sequences
-- Purpose: Define email sequence steps for campaigns
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES campaign_templates(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    step_number INTEGER NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    delay_hours INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    a_b_variant VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(template_id, step_number, a_b_variant)
);

-- ============================================================================
-- TABLE 4: linkedin_sequences
-- Purpose: Define LinkedIn sequence steps for campaigns
-- ============================================================================

CREATE TABLE IF NOT EXISTS linkedin_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES campaign_templates(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    step_number INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('profile_visit', 'connection_request', 'message', 'voice_message')),
    message TEXT,
    delay_hours INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(template_id, step_number)
);

-- ============================================================================
-- TABLE 5: campaign_enrollments
-- Purpose: Track individual contact enrollments in campaigns
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES campaign_instances(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    contact_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'active', 'paused', 'completed', 'unsubscribed', 'bounced')),
    current_step INTEGER DEFAULT 0,
    next_action_at TIMESTAMP WITH TIME ZONE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(instance_id, contact_id)
);

-- ============================================================================
-- TABLE 6: campaign_events
-- Purpose: Store all campaign-related events for analytics and tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES campaign_enrollments(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed', 'connection_accepted', 'connection_rejected')),
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'linkedin')),
    step_number INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    provider VARCHAR(50),
    provider_event_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CRITICAL: UNIQUE constraint on provider_event_id
-- Prevents duplicate webhook events from being recorded
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_events_provider_id_unique
    ON campaign_events(provider_event_id)
    WHERE provider_event_id IS NOT NULL;

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- campaign_templates indexes
CREATE INDEX IF NOT EXISTS idx_campaign_templates_type ON campaign_templates(type);
CREATE INDEX IF NOT EXISTS idx_campaign_templates_path_type ON campaign_templates(path_type);
CREATE INDEX IF NOT EXISTS idx_campaign_templates_active ON campaign_templates(is_active);

-- campaign_instances indexes
CREATE INDEX IF NOT EXISTS idx_campaign_instances_template ON campaign_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_campaign_instances_status ON campaign_instances(status);

-- email_sequences indexes
CREATE INDEX IF NOT EXISTS idx_email_sequences_template ON email_sequences(template_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_step ON email_sequences(template_id, step_number);

-- linkedin_sequences indexes
CREATE INDEX IF NOT EXISTS idx_linkedin_sequences_template ON linkedin_sequences(template_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_sequences_step ON linkedin_sequences(template_id, step_number);

-- campaign_enrollments indexes
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_instance ON campaign_enrollments(instance_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_contact ON campaign_enrollments(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_status ON campaign_enrollments(status);

-- OPTIMIZED: Partial index for active enrollments needing action
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_active_next_action
    ON campaign_enrollments(next_action_at)
    WHERE status = 'active' AND next_action_at IS NOT NULL;

-- campaign_events indexes
CREATE INDEX IF NOT EXISTS idx_campaign_events_enrollment ON campaign_events(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_type ON campaign_events(event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_events_timestamp ON campaign_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_campaign_events_channel ON campaign_events(channel);

-- OPTIMIZED: Composite indexes for analytics
CREATE INDEX IF NOT EXISTS idx_campaign_events_channel_type
    ON campaign_events(channel, event_type);

CREATE INDEX IF NOT EXISTS idx_campaign_events_enrollment_type
    ON campaign_events(enrollment_id, event_type);

-- ============================================================================
-- TRIGGERS for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaign_templates_updated_at BEFORE UPDATE ON campaign_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_instances_updated_at BEFORE UPDATE ON campaign_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_sequences_updated_at BEFORE UPDATE ON email_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_linkedin_sequences_updated_at BEFORE UPDATE ON linkedin_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_enrollments_updated_at BEFORE UPDATE ON campaign_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS for Documentation
-- ============================================================================

COMMENT ON TABLE campaign_templates IS 'Reusable campaign templates supporting structured and dynamic_ai paths';
COMMENT ON TABLE campaign_instances IS 'Runtime instances of campaign templates with execution tracking';
COMMENT ON TABLE email_sequences IS 'Email sequence steps with timing and A/B test support';
COMMENT ON TABLE linkedin_sequences IS 'LinkedIn action sequences (visits, connections, messages)';
COMMENT ON TABLE campaign_enrollments IS 'Individual contact enrollments with step tracking';
COMMENT ON TABLE campaign_events IS 'All campaign events from any provider for analytics';

COMMENT ON COLUMN campaign_instances.provider_config IS 'JSON config: {"email_provider": "lemlist|postmark", "linkedin_provider": "lemlist|phantombuster"}';
COMMENT ON COLUMN campaign_events.provider IS 'Which provider sent this event: lemlist, postmark, or phantombuster';
COMMENT ON COLUMN campaign_events.provider_event_id IS 'External event ID from provider webhook (MUST be unique to prevent duplicate events)';
