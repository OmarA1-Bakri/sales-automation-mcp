/**
 * Rollback Migration 003: Phase 7C Provider Support
 *
 * SAFELY REVERTS:
 * - Video channel support from CHECK constraint
 * - Provider message correlation fields
 * - Video-specific event fields
 * - All indexes created in up migration
 *
 * IMPORTANT: Only run this if rolling back Phase 7C completely
 */

BEGIN;

-- Restore original CHECK constraint (remove video)
ALTER TABLE campaign_events
DROP CONSTRAINT IF EXISTS campaign_events_channel_check;

ALTER TABLE campaign_events
ADD CONSTRAINT campaign_events_channel_check
CHECK (channel IN ('email', 'linkedin', 'sms', 'phone'));

COMMENT ON COLUMN campaign_events.channel IS
  'Communication channel: email, linkedin, sms, phone (video removed)';

-- Remove all Phase 7C columns from campaign_enrollments
ALTER TABLE campaign_enrollments
  DROP COLUMN IF EXISTS provider_message_id,
  DROP COLUMN IF EXISTS provider_action_id;

-- Remove all Phase 7C columns from campaign_events
ALTER TABLE campaign_events
  DROP COLUMN IF EXISTS step_number,
  DROP COLUMN IF EXISTS instance_id,
  DROP COLUMN IF EXISTS provider_message_id,
  DROP COLUMN IF EXISTS video_id,
  DROP COLUMN IF EXISTS video_url,
  DROP COLUMN IF EXISTS video_status,
  DROP COLUMN IF EXISTS video_duration;

-- Drop all Phase 7C indexes
DROP INDEX IF EXISTS idx_enrollments_provider_message_id;
DROP INDEX IF EXISTS idx_enrollments_provider_action_id;
DROP INDEX IF EXISTS idx_events_step_number;
DROP INDEX IF EXISTS idx_events_instance_id;
DROP INDEX IF EXISTS idx_events_provider_message_id;
DROP INDEX IF EXISTS idx_events_video_id;

COMMIT;
