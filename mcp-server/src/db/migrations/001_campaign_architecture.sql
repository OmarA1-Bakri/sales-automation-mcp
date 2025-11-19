-- Migration 001: Campaign Architecture - Core Tables
-- Phase 6A: PostgreSQL Database Schema
-- This migration is idempotent and can be run multiple times safely

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE 1: campaign_templates
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
-- UNIQUE CONSTRAINT: Prevent duplicate webhook events
-- CRITICAL FIX: Ensures provider_event_id is unique (prevents double-counting)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_events_provider_id_unique
    ON campaign_events(provider_event_id)
    WHERE provider_event_id IS NOT NULL;

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

DROP TRIGGER IF EXISTS update_campaign_templates_updated_at ON campaign_templates;
CREATE TRIGGER update_campaign_templates_updated_at BEFORE UPDATE ON campaign_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaign_instances_updated_at ON campaign_instances;
CREATE TRIGGER update_campaign_instances_updated_at BEFORE UPDATE ON campaign_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_sequences_updated_at ON email_sequences;
CREATE TRIGGER update_email_sequences_updated_at BEFORE UPDATE ON email_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_linkedin_sequences_updated_at ON linkedin_sequences;
CREATE TRIGGER update_linkedin_sequences_updated_at BEFORE UPDATE ON linkedin_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaign_enrollments_updated_at ON campaign_enrollments;
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
COMMENT ON COLUMN campaign_events.provider_event_id IS 'External event ID from provider (MUST be unique to prevent duplicate webhook processing)';
