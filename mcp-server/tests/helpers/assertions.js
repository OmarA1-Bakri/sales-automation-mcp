/**
 * Custom Test Assertions
 * Domain-specific assertions for campaign API testing
 */

import { expect } from '@jest/globals';

/**
 * Assert that a response has the standard success structure
 */
export function expectSuccessResponse(response, statusCode = 200) {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('data');
  return response.body.data;
}

/**
 * Assert that a response has the standard error structure
 */
export function expectErrorResponse(response, statusCode, errorMessage = null) {
  expect(response.status).toBe(statusCode);

  // Error responses might have different formats:
  // 1. { success: false, error: "message" }
  // 2. { error: "message", details: [...] }
  expect(response.body).toHaveProperty('error');

  // If success property exists, it must be false
  if (response.body.hasOwnProperty('success')) {
    expect(response.body.success).toBe(false);
  }

  if (errorMessage) {
    expect(response.body.error).toContain(errorMessage);
  }

  return response.body;
}

/**
 * Assert that a campaign instance has valid structure
 */
export function expectValidCampaignInstance(instance) {
  expect(instance).toHaveProperty('id');
  expect(instance).toHaveProperty('template_id');
  expect(instance).toHaveProperty('user_id');
  expect(instance).toHaveProperty('name');
  expect(instance).toHaveProperty('status');
  expect(['draft', 'active', 'paused', 'completed']).toContain(instance.status);

  // Validate counters
  expect(instance).toHaveProperty('total_enrolled');
  expect(instance).toHaveProperty('total_sent');
  expect(instance).toHaveProperty('total_delivered');
  expect(instance).toHaveProperty('total_opened');
  expect(instance).toHaveProperty('total_clicked');
  expect(instance).toHaveProperty('total_replied');

  expect(instance.total_enrolled).toBeGreaterThanOrEqual(0);
  expect(instance.total_sent).toBeGreaterThanOrEqual(0);
  expect(instance.total_delivered).toBeGreaterThanOrEqual(0);

  return instance;
}

/**
 * Assert that an enrollment has valid structure
 */
export function expectValidEnrollment(enrollment) {
  expect(enrollment).toHaveProperty('id');
  expect(enrollment).toHaveProperty('instance_id');
  expect(enrollment).toHaveProperty('contact_id');
  expect(enrollment).toHaveProperty('user_id');
  expect(enrollment).toHaveProperty('status');
  expect(['enrolled', 'active', 'paused', 'completed', 'failed']).toContain(enrollment.status);
  expect(enrollment).toHaveProperty('contact_data');
  expect(enrollment.contact_data).toHaveProperty('email');

  return enrollment;
}

/**
 * Assert that an event has valid structure
 */
export function expectValidEvent(event) {
  expect(event).toHaveProperty('id');
  expect(event).toHaveProperty('enrollment_id');
  expect(event).toHaveProperty('event_type');
  expect(event).toHaveProperty('channel');
  expect(event).toHaveProperty('timestamp');

  const validEventTypes = ['sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed'];
  expect(validEventTypes).toContain(event.event_type);

  const validChannels = ['email', 'linkedin', 'sms', 'phone'];
  expect(validChannels).toContain(event.channel);

  return event;
}

/**
 * Assert that metrics are calculated correctly
 */
export function expectValidMetrics(metrics) {
  expect(metrics).toHaveProperty('enrolled');
  expect(metrics).toHaveProperty('sent');
  expect(metrics).toHaveProperty('delivered');
  expect(metrics).toHaveProperty('opened');
  expect(metrics).toHaveProperty('clicked');
  expect(metrics).toHaveProperty('replied');
  expect(metrics).toHaveProperty('delivery_rate');
  expect(metrics).toHaveProperty('open_rate');
  expect(metrics).toHaveProperty('click_rate');
  expect(metrics).toHaveProperty('reply_rate');

  // Validate rates are percentages (0-100)
  expect(parseFloat(metrics.delivery_rate)).toBeGreaterThanOrEqual(0);
  expect(parseFloat(metrics.delivery_rate)).toBeLessThanOrEqual(100);
  expect(parseFloat(metrics.open_rate)).toBeGreaterThanOrEqual(0);
  expect(parseFloat(metrics.open_rate)).toBeLessThanOrEqual(100);

  return metrics;
}

/**
 * Assert that delivery rate is calculated correctly
 */
export function expectCorrectDeliveryRate(metrics, expectedSent, expectedDelivered) {
  const expectedRate = expectedSent > 0
    ? (expectedDelivered / expectedSent * 100).toFixed(2)
    : '0.00';

  expect(metrics.delivery_rate).toBe(expectedRate);
  expect(metrics.sent).toBe(expectedSent);
  expect(metrics.delivered).toBe(expectedDelivered);
}

/**
 * Assert that open rate is calculated correctly (based on delivered, not sent)
 */
export function expectCorrectOpenRate(metrics, expectedDelivered, expectedOpened) {
  const expectedRate = expectedDelivered > 0
    ? (expectedOpened / expectedDelivered * 100).toFixed(2)
    : '0.00';

  expect(metrics.open_rate).toBe(expectedRate);
  expect(metrics.delivered).toBe(expectedDelivered);
  expect(metrics.opened).toBe(expectedOpened);
}

/**
 * Assert that counters satisfy logical constraints
 */
export function expectLogicalCounters(instance) {
  // Delivered cannot exceed sent
  expect(instance.total_delivered).toBeLessThanOrEqual(instance.total_sent);

  // Opened cannot exceed delivered
  expect(instance.total_opened).toBeLessThanOrEqual(instance.total_delivered);

  // Clicked cannot exceed opened
  expect(instance.total_clicked).toBeLessThanOrEqual(instance.total_opened);

  // Sent cannot exceed enrolled
  expect(instance.total_sent).toBeLessThanOrEqual(instance.total_enrolled);
}

/**
 * Assert that an array contains unique values
 */
export function expectUniqueValues(array, keyFn = (item) => item) {
  const values = array.map(keyFn);
  const uniqueValues = new Set(values);
  expect(uniqueValues.size).toBe(values.length);
}

/**
 * Assert that database counts match expected values
 */
export async function expectDatabaseCounts(sequelize, expectedCounts) {
  const models = sequelize.models;

  if (expectedCounts.templates !== undefined) {
    const count = await models.CampaignTemplate.count();
    expect(count).toBe(expectedCounts.templates);
  }

  if (expectedCounts.instances !== undefined) {
    const count = await models.CampaignInstance.count();
    expect(count).toBe(expectedCounts.instances);
  }

  if (expectedCounts.enrollments !== undefined) {
    const count = await models.CampaignEnrollment.count();
    expect(count).toBe(expectedCounts.enrollments);
  }

  if (expectedCounts.events !== undefined) {
    const count = await models.CampaignEvent.count();
    expect(count).toBe(expectedCounts.events);
  }
}

/**
 * Assert that an event was deduplicated (same provider_event_id)
 */
export async function expectEventDeduplicated(sequelize, providerEventId) {
  const CampaignEvent = sequelize.models.campaign_events;
  const count = await CampaignEvent.count({
    where: { provider_event_id: providerEventId }
  });

  expect(count).toBe(1);
}

/**
 * Assert that rate limit was enforced
 */
export function expectRateLimitError(response) {
  expectErrorResponse(response, 429);
  expect(response.body.error).toContain('rate limit');
}

/**
 * Assert that authentication failed
 */
export function expectAuthenticationError(response) {
  expectErrorResponse(response, 401);
  expect(response.body.error).toMatch(/unauthorized|authentication|api key/i);
}

/**
 * Assert that signature verification failed
 */
export function expectSignatureError(response) {
  expectErrorResponse(response, 401);
  expect(response.body.error).toMatch(/signature|verification/i);
}

/**
 * Assert that input validation failed
 */
export function expectValidationError(response, field = null) {
  expectErrorResponse(response, 400);

  if (field) {
    expect(response.body.error).toContain(field);
  }
}

/**
 * Assert that counters were incremented atomically
 */
export async function expectAtomicIncrement(sequelize, instanceId, counterName, expectedValue) {
  const CampaignInstance = sequelize.models.campaign_instances;
  const instance = await CampaignInstance.findByPk(instanceId);
  expect(instance[counterName]).toBe(expectedValue);
}

/**
 * Assert response time is within acceptable limits
 */
export function expectFastResponse(startTime, maxMs = 2000) {
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(maxMs);
}
