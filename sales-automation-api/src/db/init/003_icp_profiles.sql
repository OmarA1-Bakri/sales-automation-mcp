-- RTGS Sales Automation - ICP Profile Schema
-- ICP (Ideal Customer Profile) Management Tables
--
-- NOTE: This migration adds the icp_profiles table and foreign key reference
-- Run this after 001_schema.sql and 002_seed.sql

-- ============================================================================
-- TABLE: icp_profiles
-- Purpose: Store Ideal Customer Profile definitions for lead scoring/targeting
-- ============================================================================

CREATE TABLE IF NOT EXISTS icp_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    tier VARCHAR(50) NOT NULL DEFAULT 'core' CHECK (tier IN ('core', 'expansion', 'strategic')),
    active BOOLEAN NOT NULL DEFAULT true,

    -- Firmographic criteria (JSONB for flexibility)
    firmographics JSONB NOT NULL DEFAULT '{
        "companySize": {"min": 0, "max": 0},
        "revenue": {"min": 0, "max": 0},
        "industries": [],
        "geographies": []
    }'::jsonb,

    -- Target job titles
    titles JSONB NOT NULL DEFAULT '{
        "primary": [],
        "secondary": []
    }'::jsonb,

    -- Scoring thresholds
    scoring JSONB NOT NULL DEFAULT '{
        "autoApprove": 0.85,
        "reviewRequired": 0.70,
        "disqualify": 0.50
    }'::jsonb,

    -- Performance statistics
    stats JSONB NOT NULL DEFAULT '{
        "discovered": 0,
        "enriched": 0,
        "enrolled": 0,
        "avgScore": 0
    }'::jsonb,

    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_icp_profiles_tier ON icp_profiles(tier);
CREATE INDEX IF NOT EXISTS idx_icp_profiles_active ON icp_profiles(active);
CREATE INDEX IF NOT EXISTS idx_icp_profiles_name ON icp_profiles(name);

-- Add foreign key to campaign_templates (if not exists)
-- Note: The column already exists from 001_schema.sql, we just need the FK constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_campaign_templates_icp_profile'
    ) THEN
        ALTER TABLE campaign_templates
        ADD CONSTRAINT fk_campaign_templates_icp_profile
        FOREIGN KEY (icp_profile_id)
        REFERENCES icp_profiles(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- Seed default ICP profiles (optional)
-- ============================================================================

INSERT INTO icp_profiles (name, description, tier, firmographics, titles, scoring)
VALUES
(
    'Enterprise SaaS Buyers',
    'Decision makers at enterprise software companies',
    'core',
    '{
        "companySize": {"min": 500, "max": 10000},
        "revenue": {"min": 50000000, "max": 1000000000},
        "industries": ["Software", "Technology", "SaaS"],
        "geographies": ["United States", "Canada", "United Kingdom"]
    }'::jsonb,
    '{
        "primary": ["VP of Engineering", "CTO", "Director of Engineering"],
        "secondary": ["Engineering Manager", "Head of Product"]
    }'::jsonb,
    '{
        "autoApprove": 0.85,
        "reviewRequired": 0.70,
        "disqualify": 0.50
    }'::jsonb
),
(
    'SMB Growth Companies',
    'Fast-growing small and medium businesses',
    'expansion',
    '{
        "companySize": {"min": 50, "max": 500},
        "revenue": {"min": 5000000, "max": 50000000},
        "industries": ["Technology", "Professional Services", "Marketing"],
        "geographies": ["United States"]
    }'::jsonb,
    '{
        "primary": ["CEO", "Founder", "COO"],
        "secondary": ["VP Operations", "Head of Growth"]
    }'::jsonb,
    '{
        "autoApprove": 0.80,
        "reviewRequired": 0.65,
        "disqualify": 0.45
    }'::jsonb
)
ON CONFLICT (name) DO NOTHING;
