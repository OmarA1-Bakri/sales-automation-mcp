-- Outreach Outcomes Table
-- Tracks outcomes of outreach for AI learning and template performance ranking
-- Created for E2E testing - required by performance routes

-- Create outreach_outcomes table
CREATE TABLE IF NOT EXISTS outreach_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES campaign_enrollments(id) ON DELETE SET NULL,
    template_used VARCHAR(100),
    subject_line TEXT,
    persona VARCHAR(100),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    region VARCHAR(50),
    channel VARCHAR(50) NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'linkedin', 'sms', 'phone')),
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    opened BOOLEAN NOT NULL DEFAULT false,
    open_count INTEGER NOT NULL DEFAULT 0,
    first_opened_at TIMESTAMP WITH TIME ZONE,
    clicked BOOLEAN NOT NULL DEFAULT false,
    click_count INTEGER NOT NULL DEFAULT 0,
    replied BOOLEAN NOT NULL DEFAULT false,
    replied_at TIMESTAMP WITH TIME ZONE,
    reply_sentiment VARCHAR(20) CHECK (reply_sentiment IN ('positive', 'neutral', 'negative', 'objection', NULL)),
    meeting_booked BOOLEAN NOT NULL DEFAULT false,
    meeting_booked_at TIMESTAMP WITH TIME ZONE,
    unsubscribed BOOLEAN NOT NULL DEFAULT false,
    bounced BOOLEAN NOT NULL DEFAULT false,
    effective_elements JSONB NOT NULL DEFAULT '{}',
    personalization_used JSONB NOT NULL DEFAULT '[]',
    quality_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_outreach_outcomes_enrollment_id ON outreach_outcomes(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_outreach_outcomes_template_used ON outreach_outcomes(template_used);
CREATE INDEX IF NOT EXISTS idx_outreach_outcomes_persona ON outreach_outcomes(persona);
CREATE INDEX IF NOT EXISTS idx_outreach_outcomes_sent_at ON outreach_outcomes(sent_at);
CREATE INDEX IF NOT EXISTS idx_outreach_outcomes_opened ON outreach_outcomes(opened);
CREATE INDEX IF NOT EXISTS idx_outreach_outcomes_replied ON outreach_outcomes(replied);
CREATE INDEX IF NOT EXISTS idx_outreach_outcomes_meeting_booked ON outreach_outcomes(meeting_booked);
CREATE INDEX IF NOT EXISTS idx_outreach_outcomes_channel ON outreach_outcomes(channel);
CREATE INDEX IF NOT EXISTS idx_outreach_outcomes_template_persona ON outreach_outcomes(template_used, persona);
CREATE INDEX IF NOT EXISTS idx_outreach_outcomes_sent_opened ON outreach_outcomes(sent_at, opened);
CREATE INDEX IF NOT EXISTS idx_outreach_outcomes_sent_replied ON outreach_outcomes(sent_at, replied);

-- Seed some test data for E2E testing
INSERT INTO outreach_outcomes (
    template_used,
    persona,
    industry,
    company_size,
    channel,
    sent_at,
    opened,
    open_count,
    replied,
    meeting_booked
) VALUES
    ('enterprise_intro', 'CTO', 'Technology', '500-1000', 'email', NOW() - INTERVAL '1 day', true, 2, true, true),
    ('enterprise_intro', 'VP Engineering', 'FinTech', '100-500', 'email', NOW() - INTERVAL '2 days', true, 1, true, false),
    ('enterprise_intro', 'CTO', 'SaaS', '1000+', 'email', NOW() - INTERVAL '3 days', true, 3, false, false),
    ('startup_outreach', 'Founder', 'AI/ML', '10-50', 'email', NOW() - INTERVAL '1 day', true, 1, true, true),
    ('startup_outreach', 'CEO', 'HealthTech', '50-100', 'email', NOW() - INTERVAL '2 days', false, 0, false, false)
ON CONFLICT DO NOTHING;
