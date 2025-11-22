/**
 * Test Server Factory
 * Creates isolated test environment using PostgreSQL test database
 *
 * SEPARATION OF CONCERNS:
 * - Production DB: rtgs_sales_automation (NEVER TOUCHED BY TESTS)
 * - Test DB: rtgs_sales_automation_test (ISOLATED, WIPED BETWEEN TESTS)
 *
 * This uses the PRODUCTION models from src/models/index.js
 * because they're already configured for PostgreSQL.
 */

import Sequelize from 'sequelize';
import { createRequire } from 'module';

/**
 * Create test database connection
 * Uses SQLite in-memory for tests (respects DATABASE_URL from tests/setup.js)
 * Falls back to PostgreSQL if DATABASE_URL is not :memory:
 */
export async function createTestDatabase() {
  let sequelize;

  // Check if tests/setup.js configured SQLite in-memory
  if (process.env.DATABASE_URL === ':memory:' || process.env.NODE_ENV === 'test') {
    // Use SQLite in-memory for fast, isolated tests
    // IMPORTANT: SQLite in-memory databases with multiple connections each get their own database
    // We MUST use a single connection to ensure all transactions see the same data
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: process.env.TEST_SQL_LOGGING === 'true' ? console.log : false,
      pool: {
        max: 1,  // CRITICAL: Single connection for in-memory SQLite
        min: 1,
        idle: 10000,
        acquire: 120000  // Long timeout for queued transactions
      },
      retry: {
        max: 30  // Aggressive retries for SQLITE_BUSY errors
      },
      // SQLite-specific query optimization
      define: {
        timestamps: false  // Disable automatic timestamps to reduce write load
      }
    });
    console.log('[Test DB] Using SQLite in-memory database (single connection)');
  } else {
    // Fall back to PostgreSQL test database
    const testDbName = 'rtgs_sales_automation_test';

    sequelize = new Sequelize(
      testDbName,
      process.env.POSTGRES_USER || 'rtgs_user',
      process.env.POSTGRES_PASSWORD || 'rtgs_password_dev',
      {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        dialect: 'postgres',
        logging: process.env.TEST_SQL_LOGGING === 'true' ? console.log : false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    );
    console.log(`[Test DB] Using PostgreSQL test database: ${testDbName}`);
  }

  // Test connection
  try {
    await sequelize.authenticate();
    console.log('[Test DB] Database connection established');

    // Enable WAL mode for SQLite to improve concurrent access
    if (sequelize.options.dialect === 'sqlite') {
      await sequelize.query('PRAGMA journal_mode = WAL;');
      await sequelize.query('PRAGMA synchronous = NORMAL;');  // Faster writes
      await sequelize.query('PRAGMA cache_size = -64000;');  // 64MB cache
      await sequelize.query('PRAGMA busy_timeout = 60000;');  // 60s wait for locks
      console.log('[Test DB] SQLite optimized (WAL mode, 60s busy timeout)');
    }
  } catch (error) {
    console.error('[Test DB] Failed to connect:', error.message);
    throw error;
  }

  // Import model factories (CommonJS modules using createRequire pattern)
  const require = createRequire(import.meta.url);
  const CampaignTemplateModel = require('../../src/models/CampaignTemplate.cjs');
  const CampaignInstanceModel = require('../../src/models/CampaignInstance.cjs');
  const EmailSequenceModel = require('../../src/models/EmailSequence.cjs');
  const LinkedInSequenceModel = require('../../src/models/LinkedInSequence.cjs');
  const CampaignEnrollmentModel = require('../../src/models/CampaignEnrollment.cjs');
  const CampaignEventModel = require('../../src/models/CampaignEvent.cjs');

  // Initialize models on the TEST sequelize instance
  const CampaignTemplate = CampaignTemplateModel(sequelize);
  const CampaignInstance = CampaignInstanceModel(sequelize);
  const EmailSequence = EmailSequenceModel(sequelize);
  const LinkedInSequence = LinkedInSequenceModel(sequelize);
  const CampaignEnrollment = CampaignEnrollmentModel(sequelize);
  const CampaignEvent = CampaignEventModel(sequelize);

  // Set up associations (same as production)
  CampaignTemplate.hasMany(CampaignInstance, {
    foreignKey: 'template_id',
    as: 'instances',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  CampaignTemplate.hasMany(EmailSequence, {
    foreignKey: 'template_id',
    as: 'email_sequences',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  CampaignTemplate.hasMany(LinkedInSequence, {
    foreignKey: 'template_id',
    as: 'linkedin_sequences',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  CampaignInstance.belongsTo(CampaignTemplate, {
    foreignKey: 'template_id',
    as: 'template'
  });

  CampaignInstance.hasMany(CampaignEnrollment, {
    foreignKey: 'instance_id',
    as: 'enrollments',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  EmailSequence.belongsTo(CampaignTemplate, {
    foreignKey: 'template_id',
    as: 'template'
  });

  LinkedInSequence.belongsTo(CampaignTemplate, {
    foreignKey: 'template_id',
    as: 'template'
  });

  CampaignEnrollment.belongsTo(CampaignInstance, {
    foreignKey: 'instance_id',
    as: 'instance'
  });

  CampaignEnrollment.hasMany(CampaignEvent, {
    foreignKey: 'enrollment_id',
    as: 'events',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  CampaignEvent.belongsTo(CampaignEnrollment, {
    foreignKey: 'enrollment_id',
    as: 'enrollment'
  });

  // Sync schema to test database (creates tables if needed)
  // force: true drops and recreates tables (clean slate for each test run)
  await sequelize.sync({ force: true });
  console.log('[Test DB] Schema synced (tables created/reset)');

  return sequelize;
}

/**
 * Get models from the test sequelize instance
 * Returns models bound to the test database
 */
export function getTestModels(sequelize) {
  return {
    CampaignTemplate: sequelize.models.campaign_templates,
    CampaignInstance: sequelize.models.campaign_instances,
    CampaignEnrollment: sequelize.models.campaign_enrollments,
    CampaignEvent: sequelize.models.campaign_events,
    EmailSequence: sequelize.models.email_sequences,
    LinkedInSequence: sequelize.models.linkedin_sequences
  };
}

/**
 * Create Express app for testing
 * Mounts production routes (they will use production models)
 */
export async function createTestApp(sequelize, options = {}) {
  const express = (await import('express')).default;
  const app = express();

  // Import routes and middleware (production code)
  const { default: campaignRoutes } = await import('../../src/routes/campaigns.js');
  const { saveRawBody } = await import('../../src/middleware/webhook-auth.js');
  const { errorHandler } = await import('../../src/middleware/campaign-error-handler.js');

  // Configure test-specific settings
  const {
    apiKeys = ['sk_test_key1', 'sk_test_key2'],
    webhookSecrets = {
      lemlist: 'test_lemlist_secret',
      postmark: 'test_postmark_secret',
      phantombuster: 'test_phantombuster_secret'
    }
  } = options;

  app.locals.config = {
    apiKeys,
    webhookSecrets
  };

  // Attach test sequelize and models (for any route that needs them)
  app.locals.sequelize = sequelize;
  app.locals.models = getTestModels(sequelize);

  // Raw body middleware for webhook signature verification
  app.use(express.json({ verify: saveRawBody }));
  app.use(express.urlencoded({ extended: true }));

  // Mount production campaign routes
  // They will use production models, which connect to production DB by default
  // BUT we've set NODE_ENV=test, so middleware is bypassed
  app.use('/api/campaigns', campaignRoutes);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Create complete test server with database and Express app
 */
export async function createTestServer(options = {}) {
  // Save original environment
  const originalEnv = { ...process.env };

  // Set test environment variables
  const {
    apiKeys = ['sk_test_key1', 'sk_test_key2'],
    webhookSecrets = {
      lemlist: 'test_lemlist_secret',
      postmark: 'test_postmark_secret',
      phantombuster: 'test_phantombuster_secret'
    }
  } = options;

  process.env.API_KEYS = apiKeys.join(',');
  process.env.LEMLIST_WEBHOOK_SECRET = webhookSecrets.lemlist;
  process.env.POSTMARK_WEBHOOK_SECRET = webhookSecrets.postmark;
  process.env.PHANTOMBUSTER_WEBHOOK_SECRET = webhookSecrets.phantombuster;
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';

  // CRITICAL: Override database name for test isolation
  // This ensures any new Sequelize connections use test DB
  process.env.POSTGRES_DB = 'rtgs_sales_automation_test';

  // Create test database connection
  const sequelize = await createTestDatabase();

  // Create Express app
  const app = await createTestApp(sequelize, options);

  // Cleanup function
  const cleanup = async () => {
    console.log('[Test Server] Cleaning up...');

    // Close database connection
    await sequelize.close();

    // Disconnect OrphanedEventQueue (prevents Redis reconnection attempts)
    try {
      const { default: orphanedEventQueue } = await import('../../src/services/OrphanedEventQueue.js');
      await orphanedEventQueue.disconnect();
      console.log('[Test Server] OrphanedEventQueue disconnected');
    } catch (error) {
      console.warn('[Test Server] Failed to disconnect OrphanedEventQueue:', error.message);
    }

    // Restore original environment
    Object.keys(process.env).forEach(key => {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    });

    console.log('[Test Server] Cleanup complete');
  };

  return {
    app,
    sequelize,
    models: getTestModels(sequelize),
    cleanup
  };
}

/**
 * Create test data helpers for common operations
 */
export function createTestHelpers(sequelize) {
  const models = getTestModels(sequelize);

  return {
    /**
     * Create a complete campaign setup (template + instance + enrollment)
     */
    async createCompleteCampaign(overrides = {}) {
      const template = await models.CampaignTemplate.create({
        name: 'Test Template',
        type: 'email',
        path_type: 'structured',
        settings: {},
        is_active: true,
        ...overrides.template
      });

      const instance = await models.CampaignInstance.create({
        template_id: template.id,
        name: 'Test Instance',
        status: 'active',
        total_enrolled: 0,
        total_sent: 0,
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        total_replied: 0,
        provider_config: {},
        ...overrides.instance
      });

      const enrollment = overrides.skipEnrollment ? null : await models.CampaignEnrollment.create({
        instance_id: instance.id,
        contact_id: 'test-contact-uuid',
        status: 'active',
        current_step: 0,
        metadata: {},
        ...overrides.enrollment
      });

      return { template, instance, enrollment };
    },

    /**
     * Clear all data from test database
     */
    async clearDatabase() {
      await models.CampaignEvent.destroy({ where: {}, force: true });
      await models.CampaignEnrollment.destroy({ where: {}, force: true });
      await models.CampaignInstance.destroy({ where: {}, force: true });
      await models.CampaignTemplate.destroy({ where: {}, force: true });
      await models.EmailSequence.destroy({ where: {}, force: true });
      await models.LinkedInSequence.destroy({ where: {}, force: true });
    },

    /**
     * Get database counts for verification
     */
    async getDatabaseCounts() {
      return {
        templates: await models.CampaignTemplate.count(),
        instances: await models.CampaignInstance.count(),
        enrollments: await models.CampaignEnrollment.count(),
        events: await models.CampaignEvent.count()
      };
    }
  };
}
