/**
 * Models Index
 * Initializes all Sequelize models and defines their associations
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { sequelize } from '../db/connection.js';

// Import model definitions (CommonJS modules)
const CampaignTemplateModel = require('./CampaignTemplate.cjs');
const CampaignInstanceModel = require('./CampaignInstance.cjs');
const EmailSequenceModel = require('./EmailSequence.cjs');
const LinkedInSequenceModel = require('./LinkedInSequence.cjs');
const CampaignEnrollmentModel = require('./CampaignEnrollment.cjs');
const CampaignEventModel = require('./CampaignEvent.cjs');
const DeadLetterEventModel = require('./DeadLetterEvent.cjs');  // FIX #6: DLQ
const ApiKeyModel = require('./ApiKey.cjs');  // API key management with Argon2id
const ApiKeyLogModel = require('./ApiKeyLog.cjs');  // API key audit trail
const OutreachOutcomeModel = require('./OutreachOutcome.cjs');  // AI learning outcomes
const LinkedInRateLimitModel = require('./LinkedInRateLimit.cjs');  // LinkedIn rate limit tracking
const VideoGenerationModel = require('./VideoGeneration.cjs');  // HeyGen video tracking
const ICPProfileModel = require('./ICPProfile.cjs');  // ICP profile management

// Initialize models
const CampaignTemplate = CampaignTemplateModel(sequelize);
const CampaignInstance = CampaignInstanceModel(sequelize);
const EmailSequence = EmailSequenceModel(sequelize);
const LinkedInSequence = LinkedInSequenceModel(sequelize);
const CampaignEnrollment = CampaignEnrollmentModel(sequelize);
const CampaignEvent = CampaignEventModel(sequelize);
const DeadLetterEvent = DeadLetterEventModel(sequelize);  // FIX #6: DLQ
const ApiKey = ApiKeyModel(sequelize, sequelize.Sequelize.DataTypes);
const ApiKeyLog = ApiKeyLogModel(sequelize, sequelize.Sequelize.DataTypes);
const OutreachOutcome = OutreachOutcomeModel(sequelize);
const LinkedInRateLimit = LinkedInRateLimitModel(sequelize);
const VideoGeneration = VideoGenerationModel(sequelize);
const ICPProfile = ICPProfileModel(sequelize);

// ============================================================================
// ASSOCIATIONS
// ============================================================================

// CampaignTemplate associations
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

// CampaignInstance associations
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

// EmailSequence associations
EmailSequence.belongsTo(CampaignTemplate, {
  foreignKey: 'template_id',
  as: 'template'
});

// LinkedInSequence associations
LinkedInSequence.belongsTo(CampaignTemplate, {
  foreignKey: 'template_id',
  as: 'template'
});

// CampaignEnrollment associations
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

// CampaignEvent associations
CampaignEvent.belongsTo(CampaignEnrollment, {
  foreignKey: 'enrollment_id',
  as: 'enrollment'
});

// ApiKey associations
ApiKey.hasMany(ApiKeyLog, {
  foreignKey: 'api_key_id',
  as: 'logs',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// ApiKeyLog associations
ApiKeyLog.belongsTo(ApiKey, {
  foreignKey: 'api_key_id',
  as: 'apiKey'
});

// OutreachOutcome associations
OutreachOutcome.belongsTo(CampaignEnrollment, {
  foreignKey: 'enrollment_id',
  as: 'enrollment'
});

CampaignEnrollment.hasOne(OutreachOutcome, {
  foreignKey: 'enrollment_id',
  as: 'outcome'
});

// ICPProfile associations
ICPProfile.hasMany(CampaignTemplate, {
  foreignKey: 'icp_profile_id',
  as: 'campaigns'
});

CampaignTemplate.belongsTo(ICPProfile, {
  foreignKey: 'icp_profile_id',
  as: 'icpProfile'
});

// ============================================================================
// SYNC DATABASE (Development only)
// ============================================================================

/**
 * Sync all models with database
 * WARNING: Only use in development! Use migrations in production.
 * @param {Object} options Sequelize sync options
 */
async function syncDatabase(options = {}) {
  try {
    console.log('[Models] Syncing database schema...');

    // In production, we should NEVER use sync - always use migrations
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Models] ⚠️  sync() should not be used in production! Use migrations instead.');
      return false;
    }

    await sequelize.sync(options);
    console.log('[Models] ✅ Database schema synced');
    return true;
  } catch (error) {
    console.error('[Models] ❌ Database sync failed:', error.message);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Sequelize instance
  sequelize,

  // Models
  CampaignTemplate,
  CampaignInstance,
  EmailSequence,
  LinkedInSequence,
  CampaignEnrollment,
  CampaignEvent,
  DeadLetterEvent,  // FIX #6: DLQ
  ApiKey,  // API key management
  ApiKeyLog,  // API key audit trail
  OutreachOutcome,  // AI learning outcomes
  LinkedInRateLimit,  // LinkedIn rate limit tracking
  VideoGeneration,  // HeyGen video tracking
  ICPProfile,  // ICP profile management

  // Utilities
  syncDatabase
};
