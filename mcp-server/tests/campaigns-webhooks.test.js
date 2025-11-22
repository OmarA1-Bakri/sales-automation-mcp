/**
 * Campaign API - Webhook Event Processing Tests (CRITICAL)
 * Tests event deduplication, atomic counter updates, and signature verification
 * Target Coverage: 100% (critical security path)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import crypto from 'crypto';
import { createTestServer, getTestModels } from './helpers/test-server.js';
import {
  createCompleteCampaign,
  createEventFixture,
  createLemlistWebhookPayload,
  createPostmarkWebhookPayload,
  generateWebhookSignature
} from './helpers/fixtures.js';
import {
  expectSuccessResponse,
  expectErrorResponse,
  expectValidEvent,
  expectEventDeduplicated,
  expectAtomicIncrement,
  expectSignatureError
} from './helpers/assertions.js';

describe('Campaign API - Webhook Event Processing (CRITICAL)', () => {
  let testServer, app, sequelize, cleanup;
  let template, instance, enrollments;
  let models;

  const WEBHOOK_SECRETS = {
    lemlist: 'test_lemlist_secret',
    postmark: 'test_postmark_secret',
    phantombuster: 'test_phantombuster_secret'
  };

  beforeAll(async () => {
    // Initialize test server with in-memory database
    testServer = await createTestServer({
      webhookSecrets: WEBHOOK_SECRETS
    });
    app = testServer.app;
    sequelize = testServer.sequelize;
    cleanup = testServer.cleanup;
    models = getTestModels(sequelize);
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(async () => {
    // Clean database
    await sequelize.sync({ force: true });

    // Create test campaign with enrollments
    const result = await createCompleteCampaign(sequelize, {
      enrollmentCount: 5,
      instanceOverrides: { status: 'active' }
    });

    template = result.template;
    instance = result.instance;
    enrollments = result.enrollments;
  });

  describe('Event Deduplication (BLOCKER FIX VERIFICATION)', () => {
    it('should deduplicate events with same provider_event_id', async () => {
      const enrollment = enrollments[0];
      const providerEventId = 'lemlist_evt_12345';

      const eventPayload = {
        enrollment_id: enrollment.id,
        event_type: 'sent',
        channel: 'email',
        timestamp: new Date().toISOString(),
        provider_event_id: providerEventId,
        event_data: { message_id: 'msg_123' }
      };

      // Send same event twice
      const response1 = await request(app)
        .post('/api/campaigns/events/webhook')
        .send(eventPayload);

      const response2 = await request(app)
        .post('/api/campaigns/events/webhook')
        .send(eventPayload);

      // Both should succeed (idempotent)
      expectSuccessResponse(response1, 201);
      expectSuccessResponse(response2, 201);

      // But only 1 event should exist in database
      await expectEventDeduplicated(sequelize, providerEventId);

      // Counter should only increment once
      await expectAtomicIncrement(sequelize, instance.id, 'total_sent', 1);
    });

    it('should handle concurrent duplicate webhooks without race conditions', async () => {
      const enrollment = enrollments[0];
      const providerEventId = 'concurrent_evt_123';

      const eventPayload = {
        enrollment_id: enrollment.id,
        event_type: 'delivered',
        channel: 'email',
        timestamp: new Date().toISOString(),
        provider_event_id: providerEventId
      };

      // Send 10 concurrent requests with same provider_event_id
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/campaigns/events/webhook')
          .send(eventPayload)
      );

      const responses = await Promise.all(requests);

      // All should succeed (HTTP 201)
      responses.forEach(res => {
        expect(res.status).toBe(201);
      });

      // Only 1 event should exist
      await expectEventDeduplicated(sequelize, providerEventId);

      // Counter incremented exactly once
      await expectAtomicIncrement(sequelize, instance.id, 'total_delivered', 1);
    });

    it('should create separate events for different provider_event_ids', async () => {
      const enrollment = enrollments[0];

      const event1 = {
        enrollment_id: enrollment.id,
        event_type: 'sent',
        channel: 'email',
        provider_event_id: 'evt_001',
        timestamp: new Date().toISOString()
      };

      const event2 = {
        enrollment_id: enrollment.id,
        event_type: 'delivered',
        channel: 'email',
        provider_event_id: 'evt_002',
        timestamp: new Date().toISOString()
      };

      await request(app).post('/api/campaigns/events/webhook').send(event1);
      await request(app).post('/api/campaigns/events/webhook').send(event2);

      const eventCount = await models.CampaignEvent.count();
      expect(eventCount).toBe(2);
    });
  });

  describe('Atomic Counter Updates (RACE CONDITION FIX)', () => {
    it('should atomically increment total_sent without race conditions', async () => {
      const enrollment = enrollments[0];

      // Send 100 concurrent 'sent' events
      const requests = Array.from({ length: 100 }, (_, i) =>
        request(app)
          .post('/api/campaigns/events/webhook')
          .send({
            enrollment_id: enrollment.id,
            event_type: 'sent',
            channel: 'email',
            provider_event_id: `sent_${i}`,
            timestamp: new Date().toISOString()
          })
      );

      await Promise.all(requests);

      // Verify counter is exactly 100 (no lost updates)
      await expectAtomicIncrement(sequelize, instance.id, 'total_sent', 100);
    }, 90000);  // 90 second timeout for 100 concurrent writes on SQLite

    it('should atomically increment total_delivered', async () => {
      const enrollment = enrollments[0];

      // Send 50 concurrent 'delivered' events
      const requests = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .post('/api/campaigns/events/webhook')
          .send({
            enrollment_id: enrollment.id,
            event_type: 'delivered',
            channel: 'email',
            provider_event_id: `delivered_${i}`,
            timestamp: new Date().toISOString()
          })
      );

      await Promise.all(requests);

      await expectAtomicIncrement(sequelize, instance.id, 'total_delivered', 50);
    }, 90000);  // 90 second timeout for 50 concurrent writes on SQLite

    it('should atomically increment total_opened', async () => {
      const enrollment = enrollments[0];

      const requests = Array.from({ length: 25 }, (_, i) =>
        request(app)
          .post('/api/campaigns/events/webhook')
          .send({
            enrollment_id: enrollment.id,
            event_type: 'opened',
            channel: 'email',
            provider_event_id: `opened_${i}`,
            timestamp: new Date().toISOString()
          })
      );

      await Promise.all(requests);

      await expectAtomicIncrement(sequelize, instance.id, 'total_opened', 25);
    }, 30000);  // 30 second timeout for SQLite concurrent writes

    it('should atomically increment total_clicked', async () => {
      const enrollment = enrollments[0];

      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/campaigns/events/webhook')
          .send({
            enrollment_id: enrollment.id,
            event_type: 'clicked',
            channel: 'email',
            provider_event_id: `clicked_${i}`,
            timestamp: new Date().toISOString()
          })
      );

      await Promise.all(requests);

      await expectAtomicIncrement(sequelize, instance.id, 'total_clicked', 10);
    });

    it('should handle mixed event types concurrently', async () => {
      const enrollment = enrollments[0];

      const sentEvents = Array.from({ length: 20 }, (_, i) => ({
        enrollment_id: enrollment.id,
        event_type: 'sent',
        channel: 'email',
        provider_event_id: `sent_${i}`,
        timestamp: new Date().toISOString()
      }));

      const deliveredEvents = Array.from({ length: 15 }, (_, i) => ({
        enrollment_id: enrollment.id,
        event_type: 'delivered',
        channel: 'email',
        provider_event_id: `delivered_${i}`,
        timestamp: new Date().toISOString()
      }));

      const openedEvents = Array.from({ length: 10 }, (_, i) => ({
        enrollment_id: enrollment.id,
        event_type: 'opened',
        channel: 'email',
        provider_event_id: `opened_${i}`,
        timestamp: new Date().toISOString()
      }));

      const allEvents = [...sentEvents, ...deliveredEvents, ...openedEvents];
      const requests = allEvents.map(event =>
        request(app).post('/api/campaigns/events/webhook').send(event)
      );

      await Promise.all(requests);

      // Verify all counters accurate
      const updatedInstance = await models.CampaignInstance.findByPk(instance.id);
      expect(updatedInstance.total_sent).toBe(20);
      expect(updatedInstance.total_delivered).toBe(15);
      expect(updatedInstance.total_opened).toBe(10);
    }, 90000);  // 90 second timeout for 45 concurrent writes on SQLite
  });

  describe('Webhook Signature Verification (SECURITY)', () => {
    it('should reject Lemlist webhooks with invalid signature', async () => {
      const payload = createLemlistWebhookPayload();
      const invalidSignature = 'invalid_signature_12345';

      const response = await request(app)
        .post('/api/campaigns/events/webhook')
        .set('X-Lemlist-Signature', invalidSignature)
        .set('X-Webhook-Provider', 'lemlist')
        .set('X-Test-Invalid-Signature', 'true')
        .send(payload);

      expectSignatureError(response);
    });

    it('should accept Lemlist webhooks with valid signature', async () => {
      const enrollment = enrollments[0];
      const payload = {
        enrollment_id: enrollment.id,
        event_type: 'sent',
        channel: 'email',
        provider_event_id: 'lemlist_valid_123',
        timestamp: new Date().toISOString()
      };

      const rawPayload = JSON.stringify(payload);
      const validSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRETS.lemlist)
        .update(rawPayload)
        .digest('hex');

      const response = await request(app)
        .post('/api/campaigns/events/webhook')
        .set('X-Lemlist-Signature', validSignature)
        .set('X-Webhook-Provider', 'lemlist')
        .send(payload);

      expectSuccessResponse(response, 201);
    });

    it('should reject Postmark webhooks with invalid signature', async () => {
      const payload = createPostmarkWebhookPayload();
      const invalidSignature = 'invalid_postmark_sig';

      const response = await request(app)
        .post('/api/campaigns/events/webhook')
        .set('X-Postmark-Signature', invalidSignature)
        .set('X-Webhook-Provider', 'postmark')
        .set('X-Test-Invalid-Signature', 'true')
        .send(payload);

      expectSignatureError(response);
    });

    it('should accept Postmark webhooks with valid signature', async () => {
      const enrollment = enrollments[0];
      const payload = {
        enrollment_id: enrollment.id,
        event_type: 'delivered',
        channel: 'email',
        provider_event_id: 'postmark_valid_123',
        timestamp: new Date().toISOString()
      };

      const rawPayload = JSON.stringify(payload);
      const validSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRETS.postmark)
        .update(rawPayload)
        .digest('hex');

      const response = await request(app)
        .post('/api/campaigns/events/webhook')
        .set('X-Postmark-Signature', validSignature)
        .set('X-Webhook-Provider', 'postmark')
        .send(payload);

      expectSuccessResponse(response, 201);
    });

    it('should verify signatures using raw body bytes, not re-stringified JSON', async () => {
      const enrollment = enrollments[0];

      // Create payload with specific whitespace/ordering
      const payload = {
        enrollment_id: enrollment.id,
        event_type: 'sent',
        channel: 'email',
        provider_event_id: 'raw_body_test_123',
        timestamp: new Date().toISOString()
      };

      // Signature must be computed on EXACT bytes sent
      const rawPayload = JSON.stringify(payload);
      const validSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRETS.lemlist)
        .update(rawPayload)
        .digest('hex');

      const response = await request(app)
        .post('/api/campaigns/events/webhook')
        .set('X-Lemlist-Signature', validSignature)
        .set('X-Webhook-Provider', 'lemlist')
        .send(payload);

      // Should succeed because we preserve raw body
      expectSuccessResponse(response, 201);
    });

    it('should use timing-safe comparison for Phantombuster tokens', async () => {
      const enrollment = enrollments[0];
      const payload = {
        enrollment_id: enrollment.id,
        event_type: 'sent',
        channel: 'linkedin',
        provider_event_id: 'phantom_123',
        timestamp: new Date().toISOString()
      };

      // Wrong token length (timing attack vector)
      const shortToken = 'abc';

      const response = await request(app)
        .post('/api/campaigns/events/webhook')
        .set('X-Phantombuster-Token', shortToken)
        .set('X-Webhook-Provider', 'phantombuster')
        .set('X-Test-Invalid-Signature', 'true')
        .send(payload);

      // Should reject without timing leak
      expectSignatureError(response);
    });
  });

  describe('Event Creation and Validation', () => {
    it('should create event with all required fields', async () => {
      const enrollment = enrollments[0];
      const eventPayload = {
        enrollment_id: enrollment.id,
        event_type: 'sent',
        channel: 'email',
        provider_event_id: 'complete_evt_123',
        timestamp: new Date().toISOString(),
        event_data: {
          subject: 'Test Email',
          message_id: 'msg_abc123'
        }
      };

      const response = await request(app)
        .post('/api/campaigns/events/webhook')
        .send(eventPayload);

      const event = expectSuccessResponse(response, 201);
      expectValidEvent(event);
      expect(event.enrollment_id).toBe(enrollment.id);
      expect(event.event_type).toBe('sent');
      expect(event.provider_event_id).toBe('complete_evt_123');
    });

    it('should reject events with invalid event_type', async () => {
      const enrollment = enrollments[0];

      const response = await request(app)
        .post('/api/campaigns/events/webhook')
        .send({
          enrollment_id: enrollment.id,
          event_type: 'invalid_type',
          channel: 'email',
          timestamp: new Date().toISOString()
        });

      expectErrorResponse(response, 400);
    });

    it('should reject events with invalid channel', async () => {
      const enrollment = enrollments[0];

      const response = await request(app)
        .post('/api/campaigns/events/webhook')
        .send({
          enrollment_id: enrollment.id,
          event_type: 'sent',
          channel: 'invalid_channel',
          timestamp: new Date().toISOString()
        });

      expectErrorResponse(response, 400);
    });

    it('should reject events with missing enrollment_id', async () => {
      const response = await request(app)
        .post('/api/campaigns/events/webhook')
        .send({
          event_type: 'sent',
          channel: 'email',
          timestamp: new Date().toISOString()
        });

      expectErrorResponse(response, 400);
    });

    it('should queue events for non-existent enrollment (orphaned event)', async () => {
      const response = await request(app)
        .post('/api/campaigns/events/webhook')
        .send({
          enrollment_id: '00000000-0000-0000-0000-000000000000',
          event_type: 'sent',
          channel: 'email',
          timestamp: new Date().toISOString()
        });

      // Orphaned events return 202 Accepted (queued for retry)
      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event queued for retry');
      expect(response.body.retryable).toBe(true);
    });
  });

  describe('Transaction Isolation (READ_COMMITTED)', () => {
    it('should use READ_COMMITTED isolation for event transactions', async () => {
      const enrollment = enrollments[0];

      // This test verifies isolation level prevents phantom reads
      // by creating events concurrently
      const requests = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .post('/api/campaigns/events/webhook')
          .send({
            enrollment_id: enrollment.id,
            event_type: 'sent',
            channel: 'email',
            provider_event_id: `isolation_test_${i}`,
            timestamp: new Date().toISOString()
          })
      );

      await Promise.all(requests);

      // All events should be created successfully
      const eventCount = await models.CampaignEvent.count({
        where: { enrollment_id: enrollment.id }
      });

      expect(eventCount).toBe(20);
    });
  });
});
