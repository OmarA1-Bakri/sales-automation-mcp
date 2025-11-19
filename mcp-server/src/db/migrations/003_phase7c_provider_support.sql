/**
 * Migration 003: Phase 7C Provider Support
 *
 * Adds support for:
 * - Provider message ID correlation (enrollment → provider messages)
 * - Video channel support
 * - Enhanced event tracking
 */

BEGIN;

-- Add provider_message_id to campaign_enrollments for webhook correlation
ALTER TABLE campaign_enrollments
ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS provider_action_id VARCHAR(255);

-- Create index for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_provider_message_id
ON campaign_enrollments(provider_message_id)
WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_provider_action_id
ON campaign_enrollments(provider_action_id)
WHERE provider_action_id IS NOT NULL;

-- Update CHECK constraint to support video channel
-- (Original migration used CHECK constraint, not enum)
ALTER TABLE campaign_events
DROP CONSTRAINT IF EXISTS campaign_events_channel_check;

ALTER TABLE campaign_events
ADD CONSTRAINT campaign_events_channel_check
CHECK (channel IN ('email', 'linkedin', 'video', 'sms', 'phone'));

COMMENT ON COLUMN campaign_events.channel IS
  'Communication channel: email, linkedin, sms, phone, video';

-- Add step_number to campaign_events if not exists
ALTER TABLE campaign_events
ADD COLUMN IF NOT EXISTS step_number INTEGER;

COMMENT ON COLUMN campaign_events.step_number IS
  'Campaign step number when event occurred (optional)';

-- Create index for step_number queries
CREATE INDEX IF NOT EXISTS idx_events_step_number
ON campaign_events(step_number)
WHERE step_number IS NOT NULL;

-- Add instance_id to campaign_events for direct instance reference
ALTER TABLE campaign_events
ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES campaign_instances(id) ON DELETE CASCADE;

COMMENT ON COLUMN campaign_events.instance_id IS
  'Direct reference to campaign instance (denormalized for performance)';

-- Create index for instance_id lookups
CREATE INDEX IF NOT EXISTS idx_events_instance_id
ON campaign_events(instance_id)
WHERE instance_id IS NOT NULL;

-- Add provider_message_id to campaign_events for correlation
ALTER TABLE campaign_events
ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(255);

COMMENT ON COLUMN campaign_events.provider_message_id IS
  'Provider message/action ID for correlation (denormalized from enrollment)';

-- Create index for fast provider_message_id lookups
CREATE INDEX IF NOT EXISTS idx_events_provider_message_id
ON campaign_events(provider_message_id)
WHERE provider_message_id IS NOT NULL;

-- Add video-specific fields to campaign_events
ALTER TABLE campaign_events
ADD COLUMN IF NOT EXISTS video_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS video_duration INTEGER;

COMMENT ON COLUMN campaign_events.video_id IS
  'Video provider ID (HeyGen, Synthesia, etc.)';
COMMENT ON COLUMN campaign_events.video_url IS
  'URL to generated video';
COMMENT ON COLUMN campaign_events.video_status IS
  'Video generation status (processing, completed, failed)';
COMMENT ON COLUMN campaign_events.video_duration IS
  'Video duration in seconds';

-- Create index for video_id lookups
CREATE INDEX IF NOT EXISTS idx_events_video_id
ON campaign_events(video_id)
WHERE video_id IS NOT NULL;

COMMIT;
