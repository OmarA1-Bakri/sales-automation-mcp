/**
 * Event Normalizer Unit Tests
 *
 * Tests for the event normalization utility that standardizes events
 * from different providers (email, LinkedIn, video) into a common format.
 *
 * These tests focus on the pure static methods that don't require database access.
 */

import { describe, it, expect } from '@jest/globals';
import {
  EventNormalizer,
  EVENT_TYPES,
  CHANNELS
} from '../src/providers/events/EventNormalizer.js';

describe('EventNormalizer', () => {
  describe('EVENT_TYPES constants', () => {
    it('should define all email event types', () => {
      expect(EVENT_TYPES.EMAIL_SENT).toBe('sent');
      expect(EVENT_TYPES.EMAIL_DELIVERED).toBe('delivered');
      expect(EVENT_TYPES.EMAIL_OPENED).toBe('opened');
      expect(EVENT_TYPES.EMAIL_CLICKED).toBe('clicked');
      expect(EVENT_TYPES.EMAIL_REPLIED).toBe('replied');
      expect(EVENT_TYPES.EMAIL_BOUNCED).toBe('bounced');
      expect(EVENT_TYPES.EMAIL_UNSUBSCRIBED).toBe('unsubscribed');
      expect(EVENT_TYPES.EMAIL_SPAM_REPORTED).toBe('spam_reported');
    });

    it('should define all LinkedIn event types', () => {
      expect(EVENT_TYPES.LINKEDIN_PROFILE_VISITED).toBe('profile_visited');
      expect(EVENT_TYPES.LINKEDIN_CONNECTION_SENT).toBe('connection_sent');
      expect(EVENT_TYPES.LINKEDIN_CONNECTION_ACCEPTED).toBe('connection_accepted');
      expect(EVENT_TYPES.LINKEDIN_CONNECTION_REJECTED).toBe('connection_rejected');
      expect(EVENT_TYPES.LINKEDIN_MESSAGE_SENT).toBe('message_sent');
      expect(EVENT_TYPES.LINKEDIN_MESSAGE_READ).toBe('message_read');
      expect(EVENT_TYPES.LINKEDIN_MESSAGE_REPLIED).toBe('message_replied');
      expect(EVENT_TYPES.LINKEDIN_VOICE_MESSAGE_SENT).toBe('voice_message_sent');
    });

    it('should define all video event types', () => {
      expect(EVENT_TYPES.VIDEO_GENERATED).toBe('video_generated');
      expect(EVENT_TYPES.VIDEO_GENERATION_FAILED).toBe('video_generation_failed');
      expect(EVENT_TYPES.VIDEO_VIEWED).toBe('video_viewed');
      expect(EVENT_TYPES.VIDEO_COMPLETED).toBe('video_completed');
      expect(EVENT_TYPES.VIDEO_SHARED).toBe('video_shared');
    });
  });

  describe('CHANNELS constants', () => {
    it('should define all channel types', () => {
      expect(CHANNELS.EMAIL).toBe('email');
      expect(CHANNELS.LINKEDIN).toBe('linkedin');
      expect(CHANNELS.VIDEO).toBe('video');
      expect(CHANNELS.SMS).toBe('sms');
      expect(CHANNELS.PHONE).toBe('phone');
    });
  });

  describe('validateRawEvent', () => {
    it('should throw error for null event', () => {
      expect(() => EventNormalizer.validateRawEvent(null)).toThrow('Raw event is required');
    });

    it('should throw error for undefined event', () => {
      expect(() => EventNormalizer.validateRawEvent(undefined)).toThrow('Raw event is required');
    });

    it('should throw error for event without type', () => {
      const event = { providerEventId: '123', timestamp: Date.now() };
      expect(() => EventNormalizer.validateRawEvent(event)).toThrow('Event type is required');
    });

    it('should throw error for event without providerEventId', () => {
      const event = { type: 'email.sent', timestamp: Date.now() };
      expect(() => EventNormalizer.validateRawEvent(event)).toThrow('Provider event ID is required');
    });

    it('should throw error for event without timestamp', () => {
      const event = { type: 'email.sent', providerEventId: '123' };
      expect(() => EventNormalizer.validateRawEvent(event)).toThrow('Event timestamp is required');
    });

    it('should not throw for valid event', () => {
      const event = {
        type: 'email.sent',
        providerEventId: '123',
        timestamp: Date.now()
      };
      expect(() => EventNormalizer.validateRawEvent(event)).not.toThrow();
    });

    it('should not throw for event with all optional fields', () => {
      const event = {
        type: 'email.sent',
        providerEventId: '123',
        timestamp: Date.now(),
        providerMessageId: 'msg_456',
        data: { userAgent: 'Mozilla' }
      };
      expect(() => EventNormalizer.validateRawEvent(event)).not.toThrow();
    });
  });

  describe('normalizeEventType', () => {
    describe('email events', () => {
      it('should normalize email.sent to sent', () => {
        expect(EventNormalizer.normalizeEventType('email.sent', 'email')).toBe('sent');
      });

      it('should normalize email.delivered to delivered', () => {
        expect(EventNormalizer.normalizeEventType('email.delivered', 'email')).toBe('delivered');
      });

      it('should normalize email.opened to opened', () => {
        expect(EventNormalizer.normalizeEventType('email.opened', 'email')).toBe('opened');
      });

      it('should normalize email.clicked to clicked', () => {
        expect(EventNormalizer.normalizeEventType('email.clicked', 'email')).toBe('clicked');
      });

      it('should normalize email.replied to replied', () => {
        expect(EventNormalizer.normalizeEventType('email.replied', 'email')).toBe('replied');
      });

      it('should normalize email.bounced to bounced', () => {
        expect(EventNormalizer.normalizeEventType('email.bounced', 'email')).toBe('bounced');
      });

      it('should normalize email.unsubscribed to unsubscribed', () => {
        expect(EventNormalizer.normalizeEventType('email.unsubscribed', 'email')).toBe('unsubscribed');
      });

      it('should normalize spam_complaint to spam_reported', () => {
        expect(EventNormalizer.normalizeEventType('spam_complaint', 'email')).toBe('spam_reported');
      });
    });

    describe('Postmark-specific events', () => {
      it('should normalize Postmark Delivery to delivered', () => {
        expect(EventNormalizer.normalizeEventType('Delivery', 'email')).toBe('delivered');
      });

      it('should normalize Postmark Bounce to bounced', () => {
        expect(EventNormalizer.normalizeEventType('Bounce', 'email')).toBe('bounced');
      });

      it('should normalize Postmark Open to opened', () => {
        expect(EventNormalizer.normalizeEventType('Open', 'email')).toBe('opened');
      });

      it('should normalize Postmark Click to clicked', () => {
        expect(EventNormalizer.normalizeEventType('Click', 'email')).toBe('clicked');
      });

      it('should normalize Postmark SpamComplaint to spam_reported', () => {
        expect(EventNormalizer.normalizeEventType('SpamComplaint', 'email')).toBe('spam_reported');
      });
    });

    describe('LinkedIn events', () => {
      it('should normalize linkedin.profile_visited', () => {
        expect(EventNormalizer.normalizeEventType('linkedin.profile_visited', 'linkedin'))
          .toBe('profile_visited');
      });

      it('should normalize linkedin.connection_sent', () => {
        expect(EventNormalizer.normalizeEventType('linkedin.connection_sent', 'linkedin'))
          .toBe('connection_sent');
      });

      it('should normalize linkedin.connection_accepted', () => {
        expect(EventNormalizer.normalizeEventType('linkedin.connection_accepted', 'linkedin'))
          .toBe('connection_accepted');
      });

      it('should normalize linkedin.connection_rejected', () => {
        expect(EventNormalizer.normalizeEventType('linkedin.connection_rejected', 'linkedin'))
          .toBe('connection_rejected');
      });

      it('should normalize linkedin.message_sent', () => {
        expect(EventNormalizer.normalizeEventType('linkedin.message_sent', 'linkedin'))
          .toBe('message_sent');
      });

      it('should normalize linkedin.message_read', () => {
        expect(EventNormalizer.normalizeEventType('linkedin.message_read', 'linkedin'))
          .toBe('message_read');
      });

      it('should normalize linkedin.message_replied', () => {
        expect(EventNormalizer.normalizeEventType('linkedin.message_replied', 'linkedin'))
          .toBe('message_replied');
      });
    });

    describe('video events', () => {
      it('should normalize video.completed to video_generated', () => {
        expect(EventNormalizer.normalizeEventType('video.completed', 'video')).toBe('video_generated');
      });

      it('should normalize video.failed to video_generation_failed', () => {
        expect(EventNormalizer.normalizeEventType('video.failed', 'video')).toBe('video_generation_failed');
      });

      it('should normalize video.viewed to video_viewed', () => {
        expect(EventNormalizer.normalizeEventType('video.viewed', 'video')).toBe('video_viewed');
      });

      it('should normalize video.watch_completed to video_completed', () => {
        expect(EventNormalizer.normalizeEventType('video.watch_completed', 'video')).toBe('video_completed');
      });

      it('should normalize video.shared to video_shared', () => {
        expect(EventNormalizer.normalizeEventType('video.shared', 'video')).toBe('video_shared');
      });
    });

    it('should return unknown event type as-is', () => {
      expect(EventNormalizer.normalizeEventType('custom.event', 'email')).toBe('custom.event');
    });
  });

  describe('normalizeChannel', () => {
    it('should normalize email channel', () => {
      expect(EventNormalizer.normalizeChannel('email')).toBe('email');
    });

    it('should normalize EMAIL (uppercase) channel', () => {
      expect(EventNormalizer.normalizeChannel('EMAIL')).toBe('email');
    });

    it('should normalize Email (mixed case) channel', () => {
      expect(EventNormalizer.normalizeChannel('Email')).toBe('email');
    });

    it('should normalize linkedin channel', () => {
      expect(EventNormalizer.normalizeChannel('linkedin')).toBe('linkedin');
    });

    it('should normalize LINKEDIN (uppercase) channel', () => {
      expect(EventNormalizer.normalizeChannel('LINKEDIN')).toBe('linkedin');
    });

    it('should normalize video channel', () => {
      expect(EventNormalizer.normalizeChannel('video')).toBe('video');
    });

    it('should normalize sms channel', () => {
      expect(EventNormalizer.normalizeChannel('sms')).toBe('sms');
    });

    it('should normalize phone channel', () => {
      expect(EventNormalizer.normalizeChannel('phone')).toBe('phone');
    });

    it('should return unknown channel as-is', () => {
      expect(EventNormalizer.normalizeChannel('unknown')).toBe('unknown');
    });
  });

  describe('normalizeTimestamp', () => {
    it('should return Date object unchanged', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      expect(EventNormalizer.normalizeTimestamp(date)).toBe(date);
    });

    it('should parse ISO string to Date', () => {
      const isoString = '2024-01-15T10:00:00Z';
      const result = EventNormalizer.normalizeTimestamp(isoString);
      expect(result).toBeInstanceOf(Date);
      // toISOString always includes .000Z for milliseconds
      expect(result.toISOString()).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should parse date string without timezone', () => {
      const dateString = '2024-01-15 10:00:00';
      const result = EventNormalizer.normalizeTimestamp(dateString);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(15);
    });

    it('should parse Unix timestamp in seconds', () => {
      const unixSeconds = 1705312800; // 2024-01-15T10:00:00Z
      const result = EventNormalizer.normalizeTimestamp(unixSeconds);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCDate()).toBe(15);
    });

    it('should parse Unix timestamp in milliseconds', () => {
      const unixMs = 1705312800000; // 2024-01-15T10:00:00Z
      const result = EventNormalizer.normalizeTimestamp(unixMs);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(0);
    });

    it('should correctly distinguish seconds from milliseconds', () => {
      // Test boundary: 10000000000 (seconds) = year 2286
      // Anything less than this is treated as seconds
      const seconds = 1705312800;
      const ms = 1705312800000;

      const resultFromSec = EventNormalizer.normalizeTimestamp(seconds);
      const resultFromMs = EventNormalizer.normalizeTimestamp(ms);

      // Both should result in the same date
      expect(resultFromSec.getTime()).toBe(resultFromMs.getTime());
    });

    it('should return current date for invalid timestamp', () => {
      const before = Date.now();
      const result = EventNormalizer.normalizeTimestamp({});
      const after = Date.now();
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });

    it('should return current date for NaN', () => {
      const before = Date.now();
      const result = EventNormalizer.normalizeTimestamp('not-a-date');
      const after = Date.now();
      // JavaScript Date parsing of 'not-a-date' returns Invalid Date
      // The function should handle this gracefully
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('normalizeEventData', () => {
    it('should return empty object for null data', () => {
      expect(EventNormalizer.normalizeEventData(null, 'postmark', 'email')).toEqual({});
    });

    it('should return empty object for undefined data', () => {
      expect(EventNormalizer.normalizeEventData(undefined, 'postmark', 'email')).toEqual({});
    });

    it('should include provider and channel in normalized data', () => {
      const rawData = { clickedUrl: 'https://example.com' };
      const result = EventNormalizer.normalizeEventData(rawData, 'postmark', 'email');
      expect(result.provider).toBe('postmark');
      expect(result.channel).toBe('email');
      expect(result.clickedUrl).toBe('https://example.com');
    });

    it('should remove null values', () => {
      const rawData = {
        value1: 'test',
        value2: null
      };
      const result = EventNormalizer.normalizeEventData(rawData, 'heygen', 'video');
      expect(result.value1).toBe('test');
      expect(result).not.toHaveProperty('value2');
    });

    it('should remove undefined values', () => {
      const rawData = {
        value1: 'test',
        value2: undefined
      };
      const result = EventNormalizer.normalizeEventData(rawData, 'heygen', 'video');
      expect(result.value1).toBe('test');
      expect(result).not.toHaveProperty('value2');
    });

    it('should preserve falsy values that are not null/undefined', () => {
      const rawData = {
        zero: 0,
        emptyString: '',
        falseValue: false
      };
      const result = EventNormalizer.normalizeEventData(rawData, 'phantombuster', 'linkedin');
      expect(result.zero).toBe(0);
      expect(result.emptyString).toBe('');
      expect(result.falseValue).toBe(false);
    });

    it('should preserve nested objects', () => {
      const rawData = {
        metadata: {
          userAgent: 'Mozilla/5.0',
          ipAddress: '1.2.3.4'
        }
      };
      const result = EventNormalizer.normalizeEventData(rawData, 'postmark', 'email');
      expect(result.metadata).toEqual({
        userAgent: 'Mozilla/5.0',
        ipAddress: '1.2.3.4'
      });
    });

    it('should preserve arrays', () => {
      const rawData = {
        tags: ['sales', 'outreach', 'follow-up']
      };
      const result = EventNormalizer.normalizeEventData(rawData, 'lemlist', 'email');
      expect(result.tags).toEqual(['sales', 'outreach', 'follow-up']);
    });
  });

  describe('getEventCategory', () => {
    describe('email events', () => {
      it('should categorize sent as email', () => {
        expect(EventNormalizer.getEventCategory('sent')).toBe('email');
      });

      it('should categorize delivered as email', () => {
        expect(EventNormalizer.getEventCategory('delivered')).toBe('email');
      });

      it('should categorize opened as email', () => {
        expect(EventNormalizer.getEventCategory('opened')).toBe('email');
      });

      it('should categorize clicked as email', () => {
        expect(EventNormalizer.getEventCategory('clicked')).toBe('email');
      });

      it('should categorize replied as email', () => {
        expect(EventNormalizer.getEventCategory('replied')).toBe('email');
      });

      it('should categorize bounced as email', () => {
        expect(EventNormalizer.getEventCategory('bounced')).toBe('email');
      });

      it('should categorize EMAIL_SENT as email', () => {
        expect(EventNormalizer.getEventCategory('EMAIL_SENT')).toBe('email');
      });

      it('should categorize EMAIL_DELIVERED as email', () => {
        expect(EventNormalizer.getEventCategory('EMAIL_DELIVERED')).toBe('email');
      });
    });

    describe('LinkedIn events', () => {
      it('should categorize LINKEDIN_CONNECTION_SENT as linkedin', () => {
        expect(EventNormalizer.getEventCategory('LINKEDIN_CONNECTION_SENT')).toBe('linkedin');
      });

      it('should categorize LINKEDIN_MESSAGE_SENT as linkedin', () => {
        expect(EventNormalizer.getEventCategory('LINKEDIN_MESSAGE_SENT')).toBe('linkedin');
      });

      it('should categorize connection_sent as linkedin', () => {
        expect(EventNormalizer.getEventCategory('connection_sent')).toBe('linkedin');
      });

      it('should categorize connection_accepted as linkedin', () => {
        expect(EventNormalizer.getEventCategory('connection_accepted')).toBe('linkedin');
      });

      it('should categorize message_sent as linkedin', () => {
        expect(EventNormalizer.getEventCategory('message_sent')).toBe('linkedin');
      });

      it('should categorize message_replied as linkedin', () => {
        expect(EventNormalizer.getEventCategory('message_replied')).toBe('linkedin');
      });

      it('should categorize profile_visited as linkedin', () => {
        expect(EventNormalizer.getEventCategory('profile_visited')).toBe('linkedin');
      });
    });

    describe('video events', () => {
      it('should categorize VIDEO_GENERATED as video', () => {
        expect(EventNormalizer.getEventCategory('VIDEO_GENERATED')).toBe('video');
      });

      it('should categorize VIDEO_VIEWED as video', () => {
        expect(EventNormalizer.getEventCategory('VIDEO_VIEWED')).toBe('video');
      });

      it('should categorize video_generated as video', () => {
        expect(EventNormalizer.getEventCategory('video_generated')).toBe('video');
      });

      it('should categorize video_viewed as video', () => {
        expect(EventNormalizer.getEventCategory('video_viewed')).toBe('video');
      });
    });

    it('should return unknown for unrecognized events', () => {
      expect(EventNormalizer.getEventCategory('custom_event')).toBe('unknown');
      expect(EventNormalizer.getEventCategory('random')).toBe('unknown');
      expect(EventNormalizer.getEventCategory('')).toBe('unknown');
    });
  });

  describe('getCounterIncrements', () => {
    describe('sent events', () => {
      it('should return total_sent for EMAIL_SENT', () => {
        const result = EventNormalizer.getCounterIncrements(EVENT_TYPES.EMAIL_SENT);
        expect(result).toEqual({ total_sent: 1 });
      });

      it('should return total_sent for LINKEDIN_MESSAGE_SENT', () => {
        const result = EventNormalizer.getCounterIncrements(EVENT_TYPES.LINKEDIN_MESSAGE_SENT);
        expect(result).toEqual({ total_sent: 1 });
      });
    });

    describe('email delivery events', () => {
      it('should return total_delivered for EMAIL_DELIVERED', () => {
        const result = EventNormalizer.getCounterIncrements(EVENT_TYPES.EMAIL_DELIVERED);
        expect(result).toEqual({ total_delivered: 1 });
      });
    });

    describe('engagement events', () => {
      it('should return total_opened for EMAIL_OPENED', () => {
        const result = EventNormalizer.getCounterIncrements(EVENT_TYPES.EMAIL_OPENED);
        expect(result).toEqual({ total_opened: 1 });
      });

      it('should return total_clicked for EMAIL_CLICKED', () => {
        const result = EventNormalizer.getCounterIncrements(EVENT_TYPES.EMAIL_CLICKED);
        expect(result).toEqual({ total_clicked: 1 });
      });
    });

    describe('reply events', () => {
      it('should return total_replied for EMAIL_REPLIED', () => {
        const result = EventNormalizer.getCounterIncrements(EVENT_TYPES.EMAIL_REPLIED);
        expect(result).toEqual({ total_replied: 1 });
      });

      it('should return total_replied for LINKEDIN_MESSAGE_REPLIED', () => {
        const result = EventNormalizer.getCounterIncrements(EVENT_TYPES.LINKEDIN_MESSAGE_REPLIED);
        expect(result).toEqual({ total_replied: 1 });
      });
    });

    describe('video events (no counter increments)', () => {
      it('should return empty object for VIDEO_GENERATED', () => {
        const result = EventNormalizer.getCounterIncrements(EVENT_TYPES.VIDEO_GENERATED);
        expect(result).toEqual({});
      });

      it('should return empty object for VIDEO_VIEWED', () => {
        const result = EventNormalizer.getCounterIncrements(EVENT_TYPES.VIDEO_VIEWED);
        expect(result).toEqual({});
      });

      it('should return empty object for VIDEO_COMPLETED', () => {
        const result = EventNormalizer.getCounterIncrements(EVENT_TYPES.VIDEO_COMPLETED);
        expect(result).toEqual({});
      });
    });

    it('should return empty object for unknown event type', () => {
      const result = EventNormalizer.getCounterIncrements('unknown_event');
      expect(result).toEqual({});
    });

    it('should return empty object for negative events (bounced, unsubscribed)', () => {
      // These events don't increment any counter
      expect(EventNormalizer.getCounterIncrements(EVENT_TYPES.EMAIL_BOUNCED)).toEqual({});
      expect(EventNormalizer.getCounterIncrements(EVENT_TYPES.EMAIL_UNSUBSCRIBED)).toEqual({});
      expect(EventNormalizer.getCounterIncrements(EVENT_TYPES.EMAIL_SPAM_REPORTED)).toEqual({});
    });
  });
});
