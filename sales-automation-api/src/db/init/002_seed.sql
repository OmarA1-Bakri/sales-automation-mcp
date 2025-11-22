-- RTGS Sales Automation - Sample Data
-- Seed file for development and testing
--
-- IMPORTANT: This file is idempotent - safe to run multiple times
-- Uses ON CONFLICT DO NOTHING to avoid duplicate key errors

-- ============================================================================
-- SAMPLE CAMPAIGN TEMPLATES
-- ============================================================================

-- Template 1: Structured Email Campaign (Lemlist PRIMARY)
INSERT INTO campaign_templates (
    id,
    name,
    description,
    type,
    path_type,
    settings,
    created_by
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Tech Company Outreach - Structured',
    'Multi-step email sequence for tech companies with 50+ employees',
    'email',
    'structured',
    '{"email_provider": "lemlist", "daily_send_limit": 50, "personalization_level": "basic"}',
    'system'
) ON CONFLICT (id) DO NOTHING;

-- Template 2: Multi-Channel Campaign (Lemlist PRIMARY - Email + LinkedIn)
INSERT INTO campaign_templates (
    id,
    name,
    description,
    type,
    path_type,
    settings,
    created_by
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'SaaS Decision Makers - Multi-Channel',
    'Email → LinkedIn fallback sequence for SaaS VPs and Directors',
    'multi_channel',
    'structured',
    '{"email_provider": "lemlist", "linkedin_provider": "lemlist", "fallback_enabled": true, "fallback_delay_days": 3}',
    'system'
) ON CONFLICT (id) DO NOTHING;

-- Template 3: LinkedIn-Only Campaign (Lemlist PRIMARY)
INSERT INTO campaign_templates (
    id,
    name,
    description,
    type,
    path_type,
    settings,
    created_by
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    'LinkedIn Connection Campaign',
    'Profile visit → Connection request → Follow-up message',
    'linkedin',
    'structured',
    '{"linkedin_provider": "lemlist", "connection_rate_limit": 20}',
    'system'
) ON CONFLICT (id) DO NOTHING;

-- Template 4: Dynamic AI Email Campaign (Future - Phase 10-12)
INSERT INTO campaign_templates (
    id,
    name,
    description,
    type,
    path_type,
    settings,
    created_by,
    is_active
) VALUES (
    '44444444-4444-4444-4444-444444444444',
    'AI-Personalized Enterprise Outreach',
    'RAG-powered ultra-personalized messages (15-25% reply rate target)',
    'email',
    'dynamic_ai',
    '{"email_provider": "lemlist", "ai_model": "claude-4-5-haiku", "research_depth": "deep", "personalization_level": "ultra"}',
    'system',
    false  -- Not active yet (Phase 10-12)
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EMAIL SEQUENCES
-- ============================================================================

-- Sequence for Template 1 (Structured Email Campaign)
INSERT INTO email_sequences (template_id, step_number, subject, body, delay_hours) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    1,
    'Quick question about {{company_name}}''s {{tech_stack}}',
    '<p>Hi {{first_name}},</p>

<p>I noticed {{company_name}} is using {{tech_stack}} for your infrastructure. We help companies like yours reduce cloud costs by 30-40% while improving performance.</p>

<p>Would you be open to a 15-minute call next week to discuss how {{company_name}} could benefit?</p>

<p>Best,<br>
Sales Team</p>',
    0
),
(
    '11111111-1111-1111-1111-111111111111',
    2,
    'Re: Quick question about {{company_name}}''s {{tech_stack}}',
    '<p>Hi {{first_name}},</p>

<p>Just wanted to follow up on my email from {{days_ago}} days ago.</p>

<p>I''ve helped companies in {{industry}} reduce their {{tech_stack}} costs significantly. For example, {{case_study_company}} saved $120K annually.</p>

<p>Worth a quick call?</p>

<p>Best,<br>
Sales Team</p>',
    72
),
(
    '11111111-1111-1111-1111-111111111111',
    3,
    'Final follow-up: {{company_name}} cost optimization',
    '<p>Hi {{first_name}},</p>

<p>I understand you''re busy. This is my last email.</p>

<p>If infrastructure cost optimization isn''t a priority right now, no worries. But if it becomes one, here''s my calendar link: {{calendar_link}}</p>

<p>Best of luck with {{company_name}}!</p>

<p>Best,<br>
Sales Team</p>',
    120
) ON CONFLICT (id) DO NOTHING;

-- Sequence for Template 2 (Multi-Channel - Email part)
INSERT INTO email_sequences (template_id, step_number, subject, body, delay_hours) VALUES
(
    '22222222-2222-2222-2222-222222222222',
    1,
    '{{first_name}}, improving {{company_name}}''s sales automation',
    '<p>Hi {{first_name}},</p>

<p>As a {{job_title}} at {{company_name}}, you''re probably looking for ways to scale your outbound without hiring more SDRs.</p>

<p>We help SaaS companies automate 80% of their prospecting while maintaining personalization.</p>

<p>Interested in seeing how it works?</p>

<p>Best,<br>
Sales Team</p>',
    0
),
(
    '22222222-2222-2222-2222-222222222222',
    2,
    'Re: {{company_name}}''s sales automation',
    '<p>Hi {{first_name}},</p>

<p>Quick follow-up - I shared some insights about sales automation for SaaS companies.</p>

<p>Would love to show you how {{case_study_company}} (similar size to {{company_name}}) increased their pipeline by 3x in 6 months.</p>

<p>15 minutes this week?</p>

<p>Best,<br>
Sales Team</p>',
    96
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- LINKEDIN SEQUENCES
-- ============================================================================

-- LinkedIn sequence for Template 2 (Multi-Channel - LinkedIn part)
-- These trigger if email doesn't get response
INSERT INTO linkedin_sequences (template_id, step_number, type, message, delay_hours) VALUES
(
    '22222222-2222-2222-2222-222222222222',
    1,
    'profile_visit',
    NULL,  -- No message for profile visits
    0  -- Happens immediately after email Step 2
),
(
    '22222222-2222-2222-2222-222222222222',
    2,
    'connection_request',
    'Hi {{first_name}}, I''ve been following {{company_name}}''s growth in the {{industry}} space. I help SaaS leaders like you scale outbound efficiently. Would love to connect!',
    24
),
(
    '22222222-2222-2222-2222-222222222222',
    3,
    'message',
    'Hi {{first_name}}, thanks for connecting! I sent you an email about sales automation for {{company_name}}. Did you get a chance to see it? Happy to share a quick case study if it''s relevant.',
    48
) ON CONFLICT (id) DO NOTHING;

-- LinkedIn sequence for Template 3 (LinkedIn-Only Campaign)
INSERT INTO linkedin_sequences (template_id, step_number, type, message, delay_hours) VALUES
(
    '33333333-3333-3333-3333-333333333333',
    1,
    'profile_visit',
    NULL,
    0
),
(
    '33333333-3333-3333-3333-333333333333',
    2,
    'connection_request',
    'Hi {{first_name}}, I help {{job_title}}s at companies like {{company_name}} streamline their operations. Would be great to connect and share insights!',
    24
),
(
    '33333333-3333-3333-3333-333333333333',
    3,
    'message',
    'Thanks for connecting, {{first_name}}! I noticed {{company_name}} is in {{industry}}. We recently helped a similar company reduce operational costs by 35%. Mind if I share a quick overview?',
    72
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE CAMPAIGN INSTANCES
-- ============================================================================

-- Active instance of Template 1
INSERT INTO campaign_instances (
    id,
    template_id,
    name,
    status,
    started_at,
    total_enrolled,
    total_sent,
    total_opened,
    total_clicked,
    total_replied,
    provider_config
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Q1 2025 Tech Outreach',
    'active',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    150,
    125,
    48,
    12,
    6,
    '{"email_provider": "lemlist", "linkedin_provider": null}'
) ON CONFLICT (id) DO NOTHING;

-- Paused instance of Template 2
INSERT INTO campaign_instances (
    id,
    template_id,
    name,
    status,
    started_at,
    paused_at,
    total_enrolled,
    total_sent,
    total_opened,
    total_clicked,
    total_replied,
    provider_config
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'SaaS VPs - Multi-Channel Test',
    'paused',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    75,
    60,
    28,
    8,
    5,
    '{"email_provider": "lemlist", "linkedin_provider": "lemlist"}'
) ON CONFLICT (id) DO NOTHING;

-- Draft instance of Template 3
INSERT INTO campaign_instances (
    id,
    template_id,
    name,
    status,
    provider_config
) VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'LinkedIn Warm Outreach - Feb 2025',
    'draft',
    '{"email_provider": null, "linkedin_provider": "lemlist"}'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE ENROLLMENTS AND EVENTS
-- ============================================================================

-- Sample enrollment 1 (completed successfully)
INSERT INTO campaign_enrollments (
    id,
    instance_id,
    contact_id,
    status,
    current_step,
    enrolled_at,
    completed_at,
    metadata
) VALUES (
    'e1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000001-0000-0000-0000-000000000001',  -- Placeholder contact ID
    'completed',
    3,
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    '{"first_name": "John", "company_name": "Acme Corp", "tech_stack": "AWS", "industry": "SaaS"}'
) ON CONFLICT (id) DO NOTHING;

-- Events for enrollment 1
INSERT INTO campaign_events (enrollment_id, event_type, channel, step_number, timestamp, provider, provider_event_id) VALUES
('e1111111-1111-1111-1111-111111111111', 'sent', 'email', 1, CURRENT_TIMESTAMP - INTERVAL '5 days', 'lemlist', 'lemlist_evt_001'),
('e1111111-1111-1111-1111-111111111111', 'delivered', 'email', 1, CURRENT_TIMESTAMP - INTERVAL '5 days', 'lemlist', 'lemlist_evt_002'),
('e1111111-1111-1111-1111-111111111111', 'opened', 'email', 1, CURRENT_TIMESTAMP - INTERVAL '4 days', 'lemlist', 'lemlist_evt_003'),
('e1111111-1111-1111-1111-111111111111', 'clicked', 'email', 1, CURRENT_TIMESTAMP - INTERVAL '4 days', 'lemlist', 'lemlist_evt_004'),
('e1111111-1111-1111-1111-111111111111', 'sent', 'email', 2, CURRENT_TIMESTAMP - INTERVAL '2 days', 'lemlist', 'lemlist_evt_005'),
('e1111111-1111-1111-1111-111111111111', 'replied', 'email', 2, CURRENT_TIMESTAMP - INTERVAL '1 day', 'lemlist', 'lemlist_evt_006') ON CONFLICT (id) DO NOTHING;

-- Sample enrollment 2 (active, mid-sequence)
INSERT INTO campaign_enrollments (
    id,
    instance_id,
    contact_id,
    status,
    current_step,
    next_action_at,
    enrolled_at,
    metadata
) VALUES (
    'e2222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000002-0000-0000-0000-000000000002',
    'active',
    2,
    CURRENT_TIMESTAMP + INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    '{"first_name": "Sarah", "company_name": "TechStart Inc", "tech_stack": "GCP", "industry": "FinTech"}'
) ON CONFLICT (id) DO NOTHING;

-- Events for enrollment 2
INSERT INTO campaign_events (enrollment_id, event_type, channel, step_number, timestamp, provider) VALUES
('e2222222-2222-2222-2222-222222222222', 'sent', 'email', 1, CURRENT_TIMESTAMP - INTERVAL '3 days', 'lemlist'),
('e2222222-2222-2222-2222-222222222222', 'delivered', 'email', 1, CURRENT_TIMESTAMP - INTERVAL '3 days', 'lemlist'),
('e2222222-2222-2222-2222-222222222222', 'opened', 'email', 1, CURRENT_TIMESTAMP - INTERVAL '2 days', 'lemlist'),
('e2222222-2222-2222-2222-222222222222', 'sent', 'email', 2, CURRENT_TIMESTAMP - INTERVAL '1 day', 'lemlist') ON CONFLICT (id) DO NOTHING;

-- Sample enrollment 3 (multi-channel with LinkedIn)
INSERT INTO campaign_enrollments (
    id,
    instance_id,
    contact_id,
    status,
    current_step,
    next_action_at,
    enrolled_at,
    metadata
) VALUES (
    'e3333333-3333-3333-3333-333333333333',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000003-0000-0000-0000-000000000003',
    'active',
    3,
    CURRENT_TIMESTAMP + INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '7 days',
    '{"first_name": "Mike", "company_name": "CloudScale", "job_title": "VP of Sales", "industry": "SaaS"}'
) ON CONFLICT (id) DO NOTHING;

-- Events for enrollment 3 (email + LinkedIn)
INSERT INTO campaign_events (enrollment_id, event_type, channel, step_number, timestamp, provider) VALUES
('e3333333-3333-3333-3333-333333333333', 'sent', 'email', 1, CURRENT_TIMESTAMP - INTERVAL '7 days', 'lemlist'),
('e3333333-3333-3333-3333-333333333333', 'delivered', 'email', 1, CURRENT_TIMESTAMP - INTERVAL '7 days', 'lemlist'),
('e3333333-3333-3333-3333-333333333333', 'sent', 'email', 2, CURRENT_TIMESTAMP - INTERVAL '4 days', 'lemlist'),
-- LinkedIn fallback triggered (no email response)
('e3333333-3333-3333-3333-333333333333', 'sent', 'linkedin', 1, CURRENT_TIMESTAMP - INTERVAL '3 days', 'lemlist'),
('e3333333-3333-3333-3333-333333333333', 'sent', 'linkedin', 2, CURRENT_TIMESTAMP - INTERVAL '2 days', 'lemlist'),
('e3333333-3333-3333-3333-333333333333', 'connection_accepted', 'linkedin', 2, CURRENT_TIMESTAMP - INTERVAL '1 day', 'lemlist') ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (commented out)
-- ============================================================================

-- SELECT COUNT(*) FROM campaign_templates;  -- Should return 4
-- SELECT COUNT(*) FROM email_sequences;     -- Should return 5
-- SELECT COUNT(*) FROM linkedin_sequences;  -- Should return 6
-- SELECT COUNT(*) FROM campaign_instances;  -- Should return 3
-- SELECT COUNT(*) FROM campaign_enrollments; -- Should return 3
-- SELECT COUNT(*) FROM campaign_events;     -- Should return 16
