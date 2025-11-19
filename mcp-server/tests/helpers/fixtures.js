/**
 * Test Fixtures
 * Generates realistic test data matching actual model schemas
 *
 * IMPORTANT: These fixtures match the schemas documented in tests/SCHEMA-REFERENCE.md
 * Any changes to model schemas MUST be reflected here
 */

import { faker } from '@faker-js/faker';
import crypto from 'crypto';

/**
 * Create a test campaign template
 * Matches: CampaignTemplate model (src/models/CampaignTemplate.cjs)
 */
export function createTemplateFixture(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    description: faker.lorem.sentence(),
    type: faker.helpers.arrayElement(['email', 'linkedin', 'multi_channel']),
    path_type: faker.helpers.arrayElement(['structured', 'dynamic_ai']),
    icp_profile_id: faker.string.uuid(),
    settings: {
      // Empty object is valid, but can include campaign-specific settings
      daily_limit: faker.number.int({ min: 50, max: 200 }),
      time_zone: faker.location.timeZone()
    },
    created_by: faker.string.uuid(),
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

/**
 * Create a test campaign instance
 * Matches: CampaignInstance model (src/models/CampaignInstance.cjs)
 */
export function createInstanceFixture(overrides = {}) {
  return {
    id: faker.string.uuid(),
    template_id: faker.string.uuid(),
    name: faker.commerce.productName() + ' Campaign',
    status: faker.helpers.arrayElement(['draft', 'active', 'paused', 'completed', 'failed']),
    started_at: null,
    paused_at: null,
    completed_at: null,
    total_enrolled: 0,
    total_sent: 0,
    total_delivered: 0, // CRITICAL: Don't forget this field (added in migration)
    total_opened: 0,
    total_clicked: 0,
    total_replied: 0,
    provider_config: {
      // Empty object is valid, but can include provider-specific config
      lemlist: {
        campaign_id: faker.string.alphanumeric(10),
        api_key: faker.string.alphanumeric(32)
      }
    },
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

/**
 * Create a test enrollment
 * Matches: CampaignEnrollment model (src/models/CampaignEnrollment.cjs)
 */
export function createEnrollmentFixture(overrides = {}) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const email = faker.internet.email({ firstName, lastName });

  return {
    id: faker.string.uuid(),
    instance_id: faker.string.uuid(),
    contact_id: faker.string.uuid(),
    status: faker.helpers.arrayElement(['enrolled', 'active', 'paused', 'completed', 'unsubscribed', 'bounced']),
    current_step: faker.number.int({ min: 0, max: 5 }),
    next_action_at: null,
    enrolled_at: new Date(),
    completed_at: null,
    unsubscribed_at: null,
    metadata: {
      // JSONB field - can include contact data, custom fields, etc.
      contact_data: {
        email,
        first_name: firstName,
        last_name: lastName,
        company: faker.company.name(),
        title: faker.person.jobTitle()
      },
      linkedin_profile: {
        url: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
        profile_id: faker.string.alphanumeric(20)
      }
    },
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

/**
 * Create a test campaign event
 * Matches: CampaignEvent model (src/models/CampaignEvent.cjs)
 */
export function createEventFixture(overrides = {}) {
  const eventType = overrides.event_type || faker.helpers.arrayElement([
    'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced',
    'unsubscribed', 'connection_accepted', 'connection_rejected'
  ]);

  const channel = overrides.channel || faker.helpers.arrayElement(['email', 'linkedin']);

  return {
    id: faker.string.uuid(),
    enrollment_id: faker.string.uuid(),
    event_type: eventType,
    channel,
    step_number: faker.number.int({ min: 1, max: 5 }),
    timestamp: new Date(),
    provider: channel === 'email' ? 'lemlist' : 'phantombuster',
    provider_event_id: faker.string.uuid(), // MUST be unique for deduplication
    metadata: {
      // JSONB field - structure varies by event type and channel
      subject: faker.lorem.sentence(),
      message_id: faker.string.alphanumeric(32),
      recipient: faker.internet.email()
    },
    created_at: new Date(),
    ...overrides
  };
}

/**
 * Create a webhook payload for Lemlist
 */
export function createLemlistWebhookPayload(overrides = {}) {
  const payload = {
    _id: faker.string.alphanumeric(24),
    campaignId: faker.string.alphanumeric(10),
    campaignName: faker.commerce.productName(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    eventName: faker.helpers.arrayElement([
      'emailSent',
      'emailOpened',
      'emailClicked',
      'emailReplied',
      'emailBounced'
    ]),
    eventDate: new Date().toISOString(),
    ...overrides
  };

  return payload;
}

/**
 * Create a webhook payload for Postmark
 */
export function createPostmarkWebhookPayload(overrides = {}) {
  const payload = {
    RecordType: faker.helpers.arrayElement(['Delivery', 'Bounce', 'Open', 'Click']),
    MessageID: faker.string.uuid(),
    Recipient: faker.internet.email(),
    DeliveredAt: new Date().toISOString(),
    Tag: faker.string.alphanumeric(10),
    ServerID: faker.number.int({ min: 1000, max: 9999 }),
    Metadata: {
      enrollment_id: faker.string.uuid()
    },
    ...overrides
  };

  return payload;
}

/**
 * Create a webhook payload for Phantombuster
 */
export function createPhantombusterWebhookPayload(overrides = {}) {
  const payload = {
    agentId: faker.string.alphanumeric(20),
    containerId: faker.string.alphanumeric(20),
    status: faker.helpers.arrayElement(['success', 'error']),
    output: {
      results: [
        {
          email: faker.internet.email(),
          status: faker.helpers.arrayElement(['sent', 'connected', 'replied'])
        }
      ]
    },
    timestamp: Date.now(),
    ...overrides
  };

  return payload;
}

/**
 * Generate valid HMAC signature for webhook
 * @param {Object|string} payload - Webhook payload (will be stringified if object)
 * @param {string} secret - Webhook secret key
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {string} HMAC signature in hex format
 */
export function generateWebhookSignature(payload, secret, algorithm = 'sha256') {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto
    .createHmac(algorithm, secret)
    .update(data)
    .digest('hex');
}

/**
 * Create bulk enrollments for testing
 * @param {number} count - Number of enrollments to create
 * @param {string} instanceId - Instance ID to link enrollments to
 * @param {Object} overrides - Override default values
 * @returns {Array} Array of enrollment fixtures
 */
export function createBulkEnrollments(count, instanceId, overrides = {}) {
  return Array.from({ length: count }, () =>
    createEnrollmentFixture({
      instance_id: instanceId,
      ...overrides
    })
  );
}

/**
 * Create bulk events for testing
 * @param {number} count - Number of events to create
 * @param {string} enrollmentId - Enrollment ID to link events to
 * @param {string} eventType - Event type (sent, delivered, opened, etc.)
 * @param {Object} overrides - Override default values
 * @returns {Array} Array of event fixtures
 */
export function createBulkEvents(count, enrollmentId, eventType, overrides = {}) {
  return Array.from({ length: count }, (_, index) =>
    createEventFixture({
      enrollment_id: enrollmentId,
      event_type: eventType,
      // Ensure unique provider_event_id for each event to avoid deduplication
      provider_event_id: `${eventType}_${enrollmentId}_${index}_${Date.now()}`,
      ...overrides
    })
  );
}

/**
 * Create a complete test campaign with template, instance, and enrollments
 * This uses the actual database models via the provided sequelize instance
 *
 * @param {Sequelize} sequelize - Sequelize instance with initialized models
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Created entities { template, instance, enrollments }
 */
export async function createCompleteCampaign(sequelize, options = {}) {
  const {
    enrollmentCount = 10,
    templateOverrides = {},
    instanceOverrides = {},
    enrollmentOverrides = {}
  } = options;

  // Get models from sequelize instance
  const models = {
    CampaignTemplate: sequelize.models.campaign_templates,
    CampaignInstance: sequelize.models.campaign_instances,
    CampaignEnrollment: sequelize.models.campaign_enrollments
  };

  // Create template with correct schema
  const template = await models.CampaignTemplate.create(
    createTemplateFixture(templateOverrides)
  );

  // Create instance linked to template
  const instance = await models.CampaignInstance.create(
    createInstanceFixture({
      template_id: template.id,
      ...instanceOverrides
    })
  );

  // Create enrollments linked to instance
  const enrollments = [];
  for (let i = 0; i < enrollmentCount; i++) {
    const enrollment = await models.CampaignEnrollment.create(
      createEnrollmentFixture({
        instance_id: instance.id,
        ...enrollmentOverrides
      })
    );
    enrollments.push(enrollment);
  }

  return { template, instance, enrollments };
}

/**
 * Create test data for webhook event processing tests
 * Includes instance, enrollment, and returns webhook payload with signature
 *
 * @param {Sequelize} sequelize - Sequelize instance
 * @param {string} provider - Provider name (lemlist, postmark, phantombuster)
 * @param {string} secret - Webhook secret for signature generation
 * @param {Object} overrides - Override options
 * @returns {Promise<Object>} { instance, enrollment, payload, signature }
 */
export async function createWebhookTestData(sequelize, provider, secret, overrides = {}) {
  const models = {
    CampaignTemplate: sequelize.models.campaign_templates,
    CampaignInstance: sequelize.models.campaign_instances,
    CampaignEnrollment: sequelize.models.campaign_enrollments
  };

  // Create campaign setup
  const template = await models.CampaignTemplate.create(
    createTemplateFixture({ type: provider === 'lemlist' ? 'email' : 'linkedin' })
  );

  const instance = await models.CampaignInstance.create(
    createInstanceFixture({
      template_id: template.id,
      status: 'active',
      ...overrides.instance
    })
  );

  const enrollment = await models.CampaignEnrollment.create(
    createEnrollmentFixture({
      instance_id: instance.id,
      status: 'active',
      ...overrides.enrollment
    })
  );

  // Generate webhook payload
  let payload;
  switch (provider) {
    case 'lemlist':
      payload = createLemlistWebhookPayload({
        Metadata: { enrollment_id: enrollment.id },
        ...overrides.payload
      });
      break;
    case 'postmark':
      payload = createPostmarkWebhookPayload({
        Metadata: { enrollment_id: enrollment.id },
        ...overrides.payload
      });
      break;
    case 'phantombuster':
      payload = createPhantombusterWebhookPayload({
        output: {
          results: [{
            enrollment_id: enrollment.id,
            status: 'sent'
          }]
        },
        ...overrides.payload
      });
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  // Generate signature
  const signature = generateWebhookSignature(payload, secret);

  return {
    template,
    instance,
    enrollment,
    payload,
    signature
  };
}
