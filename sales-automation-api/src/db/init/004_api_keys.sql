-- API Keys Table for Database-backed Authentication
-- Created for E2E testing - creates table and seeds a test API key

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prefix VARCHAR(32) UNIQUE NOT NULL,
    key_hash TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'rotating', 'expired', 'revoked')),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0 NOT NULL,
    last_rotated_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    grace_period_ends_at TIMESTAMP WITH TIME ZONE,
    previous_key_hash TEXT,
    scopes JSONB DEFAULT '["*"]'::jsonb NOT NULL,
    ip_whitelist JSONB,
    user_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);

-- Create api_key_logs table for audit logging
CREATE TABLE IF NOT EXISTS api_key_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    endpoint VARCHAR(255),
    status_code INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_key_logs_api_key_id ON api_key_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_logs_event_type ON api_key_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_api_key_logs_created_at ON api_key_logs(created_at);

-- Seed a test API key for E2E testing
-- Full Key: test_api_key_e2e.e2e_secret_123 (prefix.secret format)
-- The API verifyKey() splits by '.' and hashes only the secret part
-- Prefix is used for DB lookup, secret is verified against key_hash
INSERT INTO api_keys (
    id,
    prefix,
    key_hash,
    name,
    version,
    status,
    scopes,
    metadata
) VALUES (
    'e2e0e2e0-e2e0-e2e0-e2e0-e2e000000001'::uuid,
    'test_api_key_e2e',
    -- Argon2id hash of 'e2e_secret_123' (the secret part after the dot)
    -- Generated with: argon2id, m=19456, t=2, p=1
    '$argon2id$v=19$m=19456,t=2,p=1$H9VHuDduquIiBvrPzovnBw$Ano6uRyeF+9bTZxd+fztGuG2IQCzqp/OQ777H1CZPZw',
    'E2E Test Key',
    1,
    'active',
    '["*"]'::jsonb,
    '{"description": "Auto-generated key for E2E testing. Use: test_api_key_e2e.e2e_secret_123", "environment": "test"}'::jsonb
) ON CONFLICT (prefix) DO UPDATE SET
    key_hash = EXCLUDED.key_hash,
    metadata = EXCLUDED.metadata;

-- Also create a simple env-compatible key entry that matches what authenticate.js expects
-- This allows both DB auth and env auth to work with the same key
