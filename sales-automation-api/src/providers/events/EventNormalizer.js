/**
 * Event Normalizer
 * Normalizes events from different providers into a standard format
 *
 * All provider events (email, LinkedIn, video) are normalized to a common
 * structure for consistent storage and processing in the database.
 */

import { createLogger } from '../../utils/logger.js';
import { ProviderMessageLookup } from '../../services/ProviderMessageLookup.js';

const logger = createLogger('EventNormalizer');

/**
 * Standard event types across all providers
 */
export const EVENT_TYPES = {
  // Email events
  EMAIL_SENT: 'sent',
  EMAIL_DELIVERED: 'delivered',
  EMAIL_OPENED: 'opened',
  EMAIL_CLICKED: 'clicked',
  EMAIL_REPLIED: 'replied',
  EMAIL_BOUNCED: 'bounced',
  EMAIL_UNSUBSCRIBED: 'unsubscribed',
  EMAIL_SPAM_REPORTED: 'spam_reported',

  // LinkedIn events
  LINKEDIN_PROFILE_VISITED: 'profile_visited',
  LINKEDIN_CONNECTION_SENT: 'connection_sent',
  LINKEDIN_CONNECTION_ACCEPTED: 'connection_accepted',
  LINKEDIN_CONNECTION_REJECTED: 'connection_rejected',
  LINKEDIN_MESSAGE_SENT: 'message_sent',
  LINKEDIN_MESSAGE_READ: 'message_read',
  LINKEDIN_MESSAGE_REPLIED: 'message_replied',
  LINKEDIN_VOICE_MESSAGE_SENT: 'voice_message_sent',

  // Video events
  VIDEO_GENERATED: 'video_generated',
  VIDEO_GENERATION_FAILED: 'video_generation_failed',
  VIDEO_VIEWED: 'video_viewed',
  VIDEO_COMPLETED: 'video_completed',
  VIDEO_SHARED: 'video_shared'
};

/**
 * Standard channel types
 */
export const CHANNELS = {
  EMAIL: 'email',
  LINKEDIN: 'linkedin',
  VIDEO: 'video',
  SMS: 'sms',
  PHONE: 'phone'
};

export class EventNormalizer {
  /**
   * Normalize an event from any provider to standard format
   *
   * @param {Object} rawEvent - Raw event from provider's parseWebhookEvent()
   * @param {string} provider - Provider name (lemlist, postmark, phantombuster, heygen)
   * @param {string} channel - Channel type (email, linkedin, video)
   * @returns {Promise<Object>} Normalized event ready for database insertion
   */
  static async normalize(rawEvent, provider, channel) {
    try {
      logger.debug('Normalizing event', { provider, channel, rawEvent });

      // Validate required fields
      this.validateRawEvent(rawEvent);

      // Look up enrollment by provider message ID
      const enrollment = await ProviderMessageLookup.findEnrollment({
        providerMessageId: rawEvent.providerMessageId,
        providerActionId: rawEvent.providerActionId
      }, channel);

      // Build normalized event (ALIGNED WITH CampaignEvent MODEL)
      const normalized = {
        // REQUIRED: Foreign keys
        enrollment_id: enrollment?.id || null,
        instance_id: enrollment?.instance_id || null,

        // REQUIRED: Event identification
        event_type: this.normalizeEventType(rawEvent.type, channel),
        channel: this.normalizeChannel(channel),
        timestamp: this.normalizeTimestamp(rawEvent.timestamp),

        // REQUIRED: Provider tracking
        provider: provider.toLowerCase(),
        provider_event_id: rawEvent.providerEventId,
        provider_message_id: rawEvent.providerMessageId || rawEvent.providerActionId || null,

        // OPTIONAL: Campaign context
        step_number: rawEvent.stepNumber || enrollment?.current_step || null,

        // REQUIRED: Event metadata (renamed from event_data)
        metadata: this.normalizeEventData(rawEvent.data, provider, channel),

        // OPTIONAL: Video-specific fields
        video_id: rawEvent.videoId || null,
        video_url: rawEvent.data?.videoUrl || null,
        video_status: rawEvent.data?.videoStatus || null,
        video_duration: rawEvent.data?.videoDuration || null
      };

      // Warn if enrollment not found
      if (!enrollment) {
        logger.warn('Event normalized without enrollment correlation', {
          provider,
          channel,
          providerMessageId: rawEvent.providerMessageId,
          providerActionId: rawEvent.providerActionId,
          eventType: normalized.event_type
        });
      }

      logger.debug('Event normalized', { normalized });

      return normalized;
    } catch (error) {
      logger.error('Event normalization failed', {
        error: error.message,
        stack: error.stack,
        provider,
        channel,
        rawEvent
      });
      throw new Error(`Failed to normalize ${channel} event from ${provider}: ${error.message}`);
    }
  }

  /**
   * Validate raw event has required fields
   */
  static validateRawEvent(rawEvent) {
    if (!rawEvent) {
      throw new Error('Raw event is required');
    }

    if (!rawEvent.type) {
      throw new Error('Event type is required');
    }

    if (!rawEvent.providerEventId) {
      throw new Error('Provider event ID is required for deduplication');
    }

    if (!rawEvent.timestamp) {
      throw new Error('Event timestamp is required');
    }
  }

  /**
   * Normalize event type to standard format
   */
  static normalizeEventType(providerEventType, channel) {
    // Map provider-specific event types to standard types
    const eventTypeMap = {
      // Email event mappings
      'email.sent': EVENT_TYPES.EMAIL_SENT,
      'email.delivered': EVENT_TYPES.EMAIL_DELIVERED,
      'email.opened': EVENT_TYPES.EMAIL_OPENED,
      'email.clicked': EVENT_TYPES.EMAIL_CLICKED,
      'email.replied': EVENT_TYPES.EMAIL_REPLIED,
      'email.bounced': EVENT_TYPES.EMAIL_BOUNCED,
      'email.unsubscribed': EVENT_TYPES.EMAIL_UNSUBSCRIBED,
      'spam_complaint': EVENT_TYPES.EMAIL_SPAM_REPORTED,

      // Postmark-specific
      'Delivery': EVENT_TYPES.EMAIL_DELIVERED,
      'Bounce': EVENT_TYPES.EMAIL_BOUNCED,
      'Open': EVENT_TYPES.EMAIL_OPENED,
      'Click': EVENT_TYPES.EMAIL_CLICKED,
      'SpamComplaint': EVENT_TYPES.EMAIL_SPAM_REPORTED,

      // LinkedIn event mappings
      'linkedin.profile_visited': EVENT_TYPES.LINKEDIN_PROFILE_VISITED,
      'linkedin.connection_sent': EVENT_TYPES.LINKEDIN_CONNECTION_SENT,
      'linkedin.connection_accepted': EVENT_TYPES.LINKEDIN_CONNECTION_ACCEPTED,
      'linkedin.connection_rejected': EVENT_TYPES.LINKEDIN_CONNECTION_REJECTED,
      'linkedin.message_sent': EVENT_TYPES.LINKEDIN_MESSAGE_SENT,
      'linkedin.message_read': EVENT_TYPES.LINKEDIN_MESSAGE_READ,
      'linkedin.message_replied': EVENT_TYPES.LINKEDIN_MESSAGE_REPLIED,

      // Video event mappings
      'video.completed': EVENT_TYPES.VIDEO_GENERATED,
      'video.failed': EVENT_TYPES.VIDEO_GENERATION_FAILED,
      'video.viewed': EVENT_TYPES.VIDEO_VIEWED,
      'video.watch_completed': EVENT_TYPES.VIDEO_COMPLETED,
      'video.shared': EVENT_TYPES.VIDEO_SHARED
    };

    const normalized = eventTypeMap[providerEventType] || providerEventType;

    // Validate normalized type is in our standard types
    const validTypes = Object.values(EVENT_TYPES);
    if (!validTypes.includes(normalized)) {
      logger.warn('Unknown event type, using as-is', {
        providerEventType,
        normalized,
        channel
      });
    }

    return normalized;
  }

  /**
   * Normalize channel to standard format
   */
  static normalizeChannel(channel) {
    const channelMap = {
      'email': CHANNELS.EMAIL,
      'linkedin': CHANNELS.LINKEDIN,
      'video': CHANNELS.VIDEO,
      'sms': CHANNELS.SMS,
      'phone': CHANNELS.PHONE
    };

    const normalized = channelMap[channel.toLowerCase()] || channel;

    // Validate normalized channel
    const validChannels = Object.values(CHANNELS);
    if (!validChannels.includes(normalized)) {
      logger.warn('Unknown channel type, using as-is', { channel, normalized });
    }

    return normalized;
  }

  /**
   * Normalize timestamp to Date object
   */
  static normalizeTimestamp(timestamp) {
    if (timestamp instanceof Date) {
      return timestamp;
    }

    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }

    if (typeof timestamp === 'number') {
      // Unix timestamp (seconds or milliseconds)
      const msTimestamp = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
      return new Date(msTimestamp);
    }

    logger.warn('Invalid timestamp format, using current time', { timestamp });
    return new Date();
  }

  /**
   * Normalize event data (provider-specific details)
   */
  static normalizeEventData(rawData, provider, channel) {
    if (!rawData) {
      return {};
    }

    // Ensure event_data is a plain object (not nested objects that cause issues)
    const normalized = {
      provider,
      channel,
      ...rawData
    };

    // Remove any undefined or null values
    Object.keys(normalized).forEach(key => {
      if (normalized[key] === undefined || normalized[key] === null) {
        delete normalized[key];
      }
    });

    return normalized;
  }

  /**
   * Batch normalize multiple events
   *
   * @param {Array<Object>} rawEvents - Array of raw events
   * @param {string} provider - Provider name
   * @param {string} channel - Channel type
   * @returns {Promise<Array<Object>>} Array of normalized events
   */
  static async normalizeBatch(rawEvents, provider, channel) {
    const results = await Promise.allSettled(
      rawEvents.map(rawEvent => this.normalize(rawEvent, provider, channel))
    );

    const successful = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const failed = results
      .filter(r => r.status === 'rejected')
      .map((r, idx) => ({
        event: rawEvents[idx],
        error: r.reason.message
      }));

    if (failed.length > 0) {
      logger.warn('Partial batch normalization failure', {
        provider,
        channel,
        total: rawEvents.length,
        successful: successful.length,
        failed: failed.length,
        failures: failed
      });
    }

    // Return partial success - don't fail entire batch for one bad event
    return successful;
  }

  /**
   * Get event type category (email, linkedin, video)
   *
   * @param {string} eventType - Event type from EVENT_TYPES
   * @returns {string} Category (email, linkedin, video)
   */
  static getEventCategory(eventType) {
    if (eventType.startsWith('EMAIL_') || ['sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced'].includes(eventType)) {
      return 'email';
    }

    if (eventType.startsWith('LINKEDIN_') || eventType.includes('profile_') || eventType.includes('connection_') || eventType.includes('message_')) {
      return 'linkedin';
    }

    if (eventType.startsWith('VIDEO_') || eventType.includes('video_')) {
      return 'video';
    }

    return 'unknown';
  }

  /**
   * Check if event type should increment campaign counters
   *
   * @param {string} eventType - Event type from EVENT_TYPES
   * @returns {Object} Counter increments { total_sent: 1, total_delivered: 1, ... }
   */
  static getCounterIncrements(eventType) {
    const increments = {};

    switch (eventType) {
      case EVENT_TYPES.EMAIL_SENT:
      case EVENT_TYPES.LINKEDIN_MESSAGE_SENT:
        increments.total_sent = 1;
        break;

      case EVENT_TYPES.EMAIL_DELIVERED:
        increments.total_delivered = 1;
        break;

      case EVENT_TYPES.EMAIL_OPENED:
        increments.total_opened = 1;
        break;

      case EVENT_TYPES.EMAIL_CLICKED:
        increments.total_clicked = 1;
        break;

      case EVENT_TYPES.EMAIL_REPLIED:
      case EVENT_TYPES.LINKEDIN_MESSAGE_REPLIED:
        increments.total_replied = 1;
        break;

      // Video events don't increment email/linkedin counters
      case EVENT_TYPES.VIDEO_GENERATED:
      case EVENT_TYPES.VIDEO_VIEWED:
      case EVENT_TYPES.VIDEO_COMPLETED:
        // Could add video-specific counters in future
        break;
    }

    return increments;
  }
}

export default EventNormalizer;
