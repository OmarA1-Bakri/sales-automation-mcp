-- ============================================================
-- RTGS Sales Automation - E2E Test Data Seed Script
-- ============================================================
-- Run with: psql -h localhost -U postgres -d sales_automation -f seed-test-data.sql
-- Or via API: POST /api/test/seed (if implemented)
--
-- This script creates test fixtures for persona-based E2E testing.
-- Data is tagged with 'e2e_test_' prefix for easy cleanup.
-- ============================================================

BEGIN;

-- ============================================================
-- CLEANUP PREVIOUS TEST DATA
-- ============================================================
DELETE FROM contacts WHERE email LIKE '%@e2e-test.local';
DELETE FROM campaign_templates WHERE name LIKE 'E2E Test%';
DELETE FROM icp_profiles WHERE name LIKE 'E2E Test%';
DELETE FROM outreach_outcomes WHERE contact_id IN (SELECT id FROM contacts WHERE email LIKE '%@e2e-test.local');

-- ============================================================
-- ICP PROFILES (for Persona 1: Power User)
-- ============================================================

INSERT INTO icp_profiles (id, name, description, criteria, scoring, active, created_at, updated_at)
VALUES
  -- Core Enterprise ICP
  (
    'e2e-icp-001',
    'E2E Test - Enterprise SaaS Buyers',
    'Decision makers at enterprise SaaS companies with 500+ employees',
    '{
      "industries": ["Technology", "SaaS", "Software"],
      "companySizes": ["500-1000", "1000-5000", "5000+"],
      "titles": ["VP of Sales", "Director of Sales", "Head of Revenue", "CRO", "CEO"],
      "locations": ["United States", "Canada", "United Kingdom"],
      "technologies": ["Salesforce", "HubSpot", "Outreach"],
      "fundingStages": ["Series B", "Series C", "Series D", "Public"]
    }',
    '{
      "autoApprove": 0.85,
      "weights": {
        "title": 0.3,
        "company_size": 0.25,
        "industry": 0.2,
        "technology": 0.15,
        "location": 0.1
      }
    }',
    true,
    NOW(),
    NOW()
  ),

  -- Expansion Market ICP
  (
    'e2e-icp-002',
    'E2E Test - Mid-Market FinTech',
    'Growing fintech companies ready for sales automation',
    '{
      "industries": ["FinTech", "Financial Services", "Banking Technology"],
      "companySizes": ["50-200", "200-500"],
      "titles": ["VP of Sales", "Sales Director", "Head of Growth", "CEO"],
      "locations": ["United States"],
      "technologies": ["Stripe", "Plaid", "Modern Banking APIs"],
      "fundingStages": ["Series A", "Series B"]
    }',
    '{
      "autoApprove": 0.75,
      "weights": {
        "title": 0.35,
        "company_size": 0.2,
        "industry": 0.25,
        "technology": 0.1,
        "location": 0.1
      }
    }',
    true,
    NOW(),
    NOW()
  ),

  -- SMB ICP
  (
    'e2e-icp-003',
    'E2E Test - SMB Tech Startups',
    'Fast-growing startups with early sales teams',
    '{
      "industries": ["Technology", "SaaS", "E-commerce"],
      "companySizes": ["10-50", "50-200"],
      "titles": ["Founder", "CEO", "Head of Sales", "Sales Lead"],
      "locations": ["United States", "Remote"],
      "technologies": ["Modern Stack"],
      "fundingStages": ["Seed", "Series A"]
    }',
    '{
      "autoApprove": 0.7,
      "weights": {
        "title": 0.4,
        "company_size": 0.2,
        "industry": 0.2,
        "technology": 0.1,
        "location": 0.1
      }
    }',
    true,
    NOW(),
    NOW()
  ),

  -- Inactive ICP (for testing filters)
  (
    'e2e-icp-004',
    'E2E Test - Inactive Profile',
    'This profile is inactive for testing purposes',
    '{"industries": ["Test"]}',
    '{"autoApprove": 0.5}',
    false,
    NOW(),
    NOW()
  );

-- ============================================================
-- CONTACTS (for Persona 2: Daily Driver)
-- ============================================================

INSERT INTO contacts (id, email, first_name, last_name, title, company, company_size, industry, linkedin_url, phone, location, source, status, icp_score, enriched, created_at, updated_at)
VALUES
  -- High-quality enterprise leads
  ('e2e-contact-001', 'john.smith@acme-corp.e2e-test.local', 'John', 'Smith', 'VP of Sales', 'Acme Corporation', '1000-5000', 'Technology', 'https://linkedin.com/in/johnsmith', '+1-555-0101', 'San Francisco, CA', 'csv', 'new', 0.92, true, NOW(), NOW()),
  ('e2e-contact-002', 'sarah.jones@techstart.e2e-test.local', 'Sarah', 'Jones', 'Director of Revenue', 'TechStart Inc', '500-1000', 'SaaS', 'https://linkedin.com/in/sarahjones', '+1-555-0102', 'New York, NY', 'csv', 'new', 0.88, true, NOW(), NOW()),
  ('e2e-contact-003', 'michael.chen@cloudsales.e2e-test.local', 'Michael', 'Chen', 'CRO', 'CloudSales Pro', '1000-5000', 'Software', 'https://linkedin.com/in/michaelchen', '+1-555-0103', 'Austin, TX', 'hubspot', 'contacted', 0.95, true, NOW(), NOW()),

  -- Mid-market leads
  ('e2e-contact-004', 'emily.wilson@fintech-co.e2e-test.local', 'Emily', 'Wilson', 'Head of Growth', 'FinTech Co', '200-500', 'FinTech', 'https://linkedin.com/in/emilywilson', '+1-555-0104', 'Boston, MA', 'csv', 'new', 0.78, true, NOW(), NOW()),
  ('e2e-contact-005', 'david.brown@paytech.e2e-test.local', 'David', 'Brown', 'Sales Director', 'PayTech Solutions', '100-200', 'Financial Services', 'https://linkedin.com/in/davidbrown', '+1-555-0105', 'Chicago, IL', 'discover', 'qualified', 0.82, true, NOW(), NOW()),

  -- Startup leads
  ('e2e-contact-006', 'lisa.taylor@rapidgrow.e2e-test.local', 'Lisa', 'Taylor', 'CEO', 'RapidGrow AI', '20-50', 'Technology', 'https://linkedin.com/in/lisataylor', '+1-555-0106', 'Seattle, WA', 'csv', 'new', 0.71, true, NOW(), NOW()),
  ('e2e-contact-007', 'james.martin@startupx.e2e-test.local', 'James', 'Martin', 'Founder', 'StartupX', '10-20', 'SaaS', 'https://linkedin.com/in/jamesmartin', '+1-555-0107', 'Denver, CO', 'discover', 'new', 0.68, false, NOW(), NOW()),

  -- Contacts in different stages
  ('e2e-contact-008', 'jennifer.davis@enterprise.e2e-test.local', 'Jennifer', 'Davis', 'VP of Sales', 'Enterprise Global', '5000+', 'Technology', 'https://linkedin.com/in/jenniferdavis', '+1-555-0108', 'Los Angeles, CA', 'hubspot', 'replied', 0.94, true, NOW(), NOW()),
  ('e2e-contact-009', 'robert.garcia@megacorp.e2e-test.local', 'Robert', 'Garcia', 'Head of Revenue', 'MegaCorp Inc', '5000+', 'Software', 'https://linkedin.com/in/robertgarcia', '+1-555-0109', 'Atlanta, GA', 'csv', 'meeting_booked', 0.91, true, NOW(), NOW()),
  ('e2e-contact-010', 'amanda.lee@smallbiz.e2e-test.local', 'Amanda', 'Lee', 'Sales Lead', 'SmallBiz Tools', '10-50', 'E-commerce', 'https://linkedin.com/in/amandalee', '+1-555-0110', 'Portland, OR', 'csv', 'not_interested', 0.65, true, NOW(), NOW()),

  -- Unenriched contacts (for testing enrichment)
  ('e2e-contact-011', 'pending1@needsenrich.e2e-test.local', 'Pending', 'Contact1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'csv', 'new', NULL, false, NOW(), NOW()),
  ('e2e-contact-012', 'pending2@needsenrich.e2e-test.local', 'Pending', 'Contact2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'csv', 'new', NULL, false, NOW(), NOW()),

  -- Bulk contacts for pagination testing
  ('e2e-contact-013', 'bulk01@bulktest.e2e-test.local', 'Bulk', 'Contact01', 'Manager', 'BulkTest Corp', '100-200', 'Technology', NULL, NULL, 'Remote', 'csv', 'new', 0.72, true, NOW(), NOW()),
  ('e2e-contact-014', 'bulk02@bulktest.e2e-test.local', 'Bulk', 'Contact02', 'Manager', 'BulkTest Corp', '100-200', 'Technology', NULL, NULL, 'Remote', 'csv', 'new', 0.73, true, NOW(), NOW()),
  ('e2e-contact-015', 'bulk03@bulktest.e2e-test.local', 'Bulk', 'Contact03', 'Manager', 'BulkTest Corp', '100-200', 'Technology', NULL, NULL, 'Remote', 'csv', 'new', 0.74, true, NOW(), NOW());

-- ============================================================
-- CAMPAIGN TEMPLATES (for Persona 3: Campaign Specialist)
-- ============================================================

INSERT INTO campaign_templates (id, name, description, type, steps, variables, active, performance_metrics, created_at, updated_at)
VALUES
  -- Email Campaign
  (
    'e2e-campaign-001',
    'E2E Test - Enterprise Outreach Sequence',
    'Multi-step email sequence for enterprise prospects',
    'email',
    '[
      {
        "step": 1,
        "type": "email",
        "subject": "Quick question about {{company}} growth",
        "body": "Hi {{first_name}},\n\nI noticed {{company}} has been growing rapidly...",
        "delay_days": 0
      },
      {
        "step": 2,
        "type": "email",
        "subject": "Following up - {{company}}",
        "body": "Hi {{first_name}},\n\nWanted to follow up on my previous email...",
        "delay_days": 3
      },
      {
        "step": 3,
        "type": "email",
        "subject": "One last thought for {{first_name}}",
        "body": "Hi {{first_name}},\n\nI understand you are busy...",
        "delay_days": 5
      }
    ]',
    '["first_name", "last_name", "company", "title", "industry"]',
    true,
    '{"sent": 1250, "opened": 625, "replied": 94, "meetings": 23}',
    NOW(),
    NOW()
  ),

  -- LinkedIn Campaign
  (
    'e2e-campaign-002',
    'E2E Test - LinkedIn Connection Sequence',
    'LinkedIn outreach for warm introductions',
    'linkedin',
    '[
      {
        "step": 1,
        "type": "connection_request",
        "message": "Hi {{first_name}}, I came across your profile and was impressed by your work at {{company}}...",
        "delay_days": 0
      },
      {
        "step": 2,
        "type": "message",
        "message": "Thanks for connecting! I''d love to learn more about how {{company}} handles...",
        "delay_days": 1
      },
      {
        "step": 3,
        "type": "message",
        "message": "Hi {{first_name}}, quick question about your team''s approach to...",
        "delay_days": 4
      }
    ]',
    '["first_name", "company", "title"]',
    true,
    '{"sent": 500, "connected": 175, "replied": 52, "meetings": 12}',
    NOW(),
    NOW()
  ),

  -- Video Campaign
  (
    'e2e-campaign-003',
    'E2E Test - Personalized Video Outreach',
    'High-touch video campaign for top accounts',
    'video',
    '[
      {
        "step": 1,
        "type": "video_email",
        "subject": "Quick video for {{first_name}} at {{company}}",
        "video_script": "Hi {{first_name}}, I recorded this quick video specifically for you...",
        "delay_days": 0
      },
      {
        "step": 2,
        "type": "email",
        "subject": "Did you catch my video?",
        "body": "Hi {{first_name}},\n\nHope you had a chance to watch the video I sent...",
        "delay_days": 2
      }
    ]',
    '["first_name", "company", "industry"]',
    true,
    '{"sent": 100, "watched": 45, "replied": 18, "meetings": 8}',
    NOW(),
    NOW()
  ),

  -- Inactive Campaign (for testing)
  (
    'e2e-campaign-004',
    'E2E Test - Archived Campaign',
    'This campaign is archived for testing purposes',
    'email',
    '[{"step": 1, "type": "email", "subject": "Test", "body": "Test", "delay_days": 0}]',
    '["first_name"]',
    false,
    '{"sent": 50, "opened": 10, "replied": 1, "meetings": 0}',
    NOW(),
    NOW()
  ),

  -- A/B Test Campaign
  (
    'e2e-campaign-005',
    'E2E Test - A/B Test Sequence',
    'Campaign with A/B test variants',
    'email',
    '[
      {
        "step": 1,
        "type": "email",
        "variants": {
          "A": {
            "subject": "Quick question for {{first_name}}",
            "body": "Hi {{first_name}},\n\nVariant A content..."
          },
          "B": {
            "subject": "{{company}} + Our Solution",
            "body": "Hi {{first_name}},\n\nVariant B content..."
          }
        },
        "delay_days": 0
      }
    ]',
    '["first_name", "company"]',
    true,
    '{"sent": 200, "variant_a_opens": 55, "variant_b_opens": 62, "winner": "B"}',
    NOW(),
    NOW()
  );

-- ============================================================
-- OUTREACH OUTCOMES (for analytics)
-- ============================================================

INSERT INTO outreach_outcomes (id, contact_id, campaign_id, step_number, outcome_type, outcome_details, created_at)
VALUES
  -- Successful outcomes
  ('e2e-outcome-001', 'e2e-contact-001', 'e2e-campaign-001', 1, 'sent', '{"email_id": "msg-001"}', NOW() - INTERVAL '7 days'),
  ('e2e-outcome-002', 'e2e-contact-001', 'e2e-campaign-001', 1, 'opened', '{"opened_at": "2024-01-10T14:30:00Z"}', NOW() - INTERVAL '6 days'),
  ('e2e-outcome-003', 'e2e-contact-001', 'e2e-campaign-001', 2, 'sent', '{"email_id": "msg-002"}', NOW() - INTERVAL '4 days'),
  ('e2e-outcome-004', 'e2e-contact-001', 'e2e-campaign-001', 2, 'replied', '{"reply_sentiment": "positive"}', NOW() - INTERVAL '3 days'),

  ('e2e-outcome-005', 'e2e-contact-002', 'e2e-campaign-001', 1, 'sent', '{"email_id": "msg-003"}', NOW() - INTERVAL '5 days'),
  ('e2e-outcome-006', 'e2e-contact-002', 'e2e-campaign-001', 1, 'opened', '{"opened_at": "2024-01-12T09:15:00Z"}', NOW() - INTERVAL '4 days'),

  ('e2e-outcome-007', 'e2e-contact-003', 'e2e-campaign-002', 1, 'sent', '{"connection_sent": true}', NOW() - INTERVAL '10 days'),
  ('e2e-outcome-008', 'e2e-contact-003', 'e2e-campaign-002', 1, 'connected', '{"connected_at": "2024-01-08T11:00:00Z"}', NOW() - INTERVAL '9 days'),
  ('e2e-outcome-009', 'e2e-contact-003', 'e2e-campaign-002', 2, 'sent', '{"message_id": "li-msg-001"}', NOW() - INTERVAL '8 days'),
  ('e2e-outcome-010', 'e2e-contact-003', 'e2e-campaign-002', 2, 'replied', '{"reply_sentiment": "interested"}', NOW() - INTERVAL '7 days'),
  ('e2e-outcome-011', 'e2e-contact-003', 'e2e-campaign-002', 2, 'meeting_booked', '{"meeting_date": "2024-01-20T15:00:00Z"}', NOW() - INTERVAL '6 days'),

  -- Video campaign outcomes
  ('e2e-outcome-012', 'e2e-contact-008', 'e2e-campaign-003', 1, 'sent', '{"video_url": "https://vid.example.com/abc"}', NOW() - INTERVAL '3 days'),
  ('e2e-outcome-013', 'e2e-contact-008', 'e2e-campaign-003', 1, 'watched', '{"watch_duration": 45, "completion": 0.85}', NOW() - INTERVAL '2 days'),
  ('e2e-outcome-014', 'e2e-contact-008', 'e2e-campaign-003', 1, 'replied', '{"reply_sentiment": "very_positive"}', NOW() - INTERVAL '1 day');

-- ============================================================
-- SETTINGS (for testing configuration)
-- ============================================================

-- Note: Settings table structure may vary; adjust as needed
-- INSERT INTO settings (key, value, created_at, updated_at)
-- VALUES
--   ('e2e_test_api_key', 'test-api-key-12345', NOW(), NOW()),
--   ('e2e_test_email_provider', 'lemlist', NOW(), NOW()),
--   ('e2e_test_enrichment_provider', 'apollo', NOW(), NOW());

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify data was inserted correctly
SELECT 'ICP Profiles' as table_name, COUNT(*) as count FROM icp_profiles WHERE name LIKE 'E2E Test%'
UNION ALL
SELECT 'Contacts', COUNT(*) FROM contacts WHERE email LIKE '%@e2e-test.local'
UNION ALL
SELECT 'Campaigns', COUNT(*) FROM campaign_templates WHERE name LIKE 'E2E Test%'
UNION ALL
SELECT 'Outcomes', COUNT(*) FROM outreach_outcomes WHERE id LIKE 'e2e-outcome%';

-- Show ICP profile summary
SELECT id, name, active, (scoring::json->>'autoApprove')::float as auto_approve_threshold
FROM icp_profiles
WHERE name LIKE 'E2E Test%'
ORDER BY name;

-- Show contact summary by status
SELECT status, COUNT(*) as count
FROM contacts
WHERE email LIKE '%@e2e-test.local'
GROUP BY status
ORDER BY count DESC;

-- Show campaign summary
SELECT id, name, type, active, (performance_metrics::json->>'meetings')::int as meetings_booked
FROM campaign_templates
WHERE name LIKE 'E2E Test%'
ORDER BY name;
