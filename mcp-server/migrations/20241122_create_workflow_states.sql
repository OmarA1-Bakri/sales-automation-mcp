-- Migration: Create workflow_states and workflow_failures tables
-- Purpose: Enable workflow state persistence for crash recovery and auditing
-- Date: 2024-11-22

-- Create workflow_states table
CREATE TABLE IF NOT EXISTS workflow_states (
  id UUID PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  context JSONB,
  current_step TEXT,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create workflow_failures table for detailed error tracking
CREATE TABLE IF NOT EXISTS workflow_failures (
  id SERIAL PRIMARY KEY,
  workflow_id UUID NOT NULL,
  failed_step TEXT NOT NULL,
  error_message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workflow_states_status ON workflow_states(status);
CREATE INDEX IF NOT EXISTS idx_workflow_states_name ON workflow_states(workflow_name);
CREATE INDEX IF NOT EXISTS idx_workflow_states_started ON workflow_states(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_states_completed ON workflow_states(completed_at DESC) WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_failures_workflow_id ON workflow_failures(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_failures_created ON workflow_failures(created_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflow_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_workflow_states_updated_at ON workflow_states;

CREATE TRIGGER trigger_update_workflow_states_updated_at
  BEFORE UPDATE ON workflow_states
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_states_updated_at();

-- Comments for documentation
COMMENT ON TABLE workflow_states IS 'Stores workflow execution state for crash recovery and monitoring';
COMMENT ON TABLE workflow_failures IS 'Detailed error tracking for failed workflow steps';

COMMENT ON COLUMN workflow_states.context IS 'Workflow execution context (inputs and step results)';
COMMENT ON COLUMN workflow_states.current_step IS 'Last successfully completed step ID';
COMMENT ON COLUMN workflow_failures.context IS 'Workflow context at time of failure';
