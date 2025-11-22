/**
 * Provider Message Lookup Service
 * Manages correlation between provider message IDs and campaign enrollments
 *
 * This service enables webhook event correlation:
 * 1. When message sent: Store provider_message_id in enrollment
 * 2. When webhook arrives: Look up enrollment by provider_message_id
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('ProviderMessageLookup');

// Lazy-load models to avoid circular dependencies
let CampaignEnrollment;

async function getEnrollmentModel() {
  if (!CampaignEnrollment) {
    const models = await import('../models/index.cjs');
    CampaignEnrollment = models.CampaignEnrollment;
  }
  return CampaignEnrollment;
}

export class ProviderMessageLookup {
  /**
   * Find enrollment by provider message ID
   *
   * @param {string} providerMessageId - Provider's message/action ID
   * @param {string} channel - Channel type (email, linkedin)
   * @returns {Promise<Object|null>} Enrollment or null if not found
   */
  static async findEnrollmentByMessageId(providerMessageId, channel) {
    if (!providerMessageId) {
      return null;
    }

    try {
      const Enrollment = await getEnrollmentModel();

      const enrollment = await Enrollment.findOne({
        where: {
          provider_message_id: providerMessageId
        }
      });

      if (!enrollment) {
        logger.warn('No enrollment found for provider message ID', {
          providerMessageId,
          channel
        });
      }

      return enrollment;
    } catch (error) {
      logger.error('Error looking up enrollment', {
        providerMessageId,
        channel,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Find enrollment by provider action ID (for LinkedIn)
   *
   * @param {string} providerActionId - Provider's action ID
   * @param {string} channel - Channel type
   * @returns {Promise<Object|null>} Enrollment or null
   */
  static async findEnrollmentByActionId(providerActionId, channel) {
    if (!providerActionId) {
      return null;
    }

    try {
      const Enrollment = await getEnrollmentModel();

      const enrollment = await Enrollment.findOne({
        where: {
          provider_action_id: providerActionId
        }
      });

      if (!enrollment) {
        logger.warn('No enrollment found for provider action ID', {
          providerActionId,
          channel
        });
      }

      return enrollment;
    } catch (error) {
      logger.error('Error looking up enrollment by action ID', {
        providerActionId,
        channel,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Update enrollment with provider message ID
   * Called when message is sent to store correlation
   *
   * @param {string} enrollmentId - Enrollment ID
   * @param {string} providerMessageId - Provider's message ID
   * @param {Object} options - Additional options
   * @param {string} options.providerActionId - Provider action ID (optional)
   */
  static async storeMessageId(enrollmentId, providerMessageId, options = {}) {
    try {
      const Enrollment = await getEnrollmentModel();

      const updateData = {
        provider_message_id: providerMessageId
      };

      if (options.providerActionId) {
        updateData.provider_action_id = options.providerActionId;
      }

      await Enrollment.update(updateData, {
        where: { id: enrollmentId }
      });

      logger.info('Stored provider message ID', {
        enrollmentId,
        providerMessageId,
        providerActionId: options.providerActionId
      });
    } catch (error) {
      logger.error('Error storing provider message ID', {
        enrollmentId,
        providerMessageId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find enrollment using either message ID or action ID
   * Tries both provider_message_id and provider_action_id
   *
   * @param {Object} identifiers - Provider identifiers
   * @param {string} identifiers.providerMessageId - Message ID
   * @param {string} identifiers.providerActionId - Action ID
   * @param {string} channel - Channel type
   * @returns {Promise<Object|null>} Enrollment or null
   */
  static async findEnrollment(identifiers, channel) {
    const { providerMessageId, providerActionId } = identifiers;

    // Try message ID first
    if (providerMessageId) {
      const enrollment = await this.findEnrollmentByMessageId(providerMessageId, channel);
      if (enrollment) return enrollment;
    }

    // Fall back to action ID
    if (providerActionId) {
      return await this.findEnrollmentByActionId(providerActionId, channel);
    }

    return null;
  }
}

export default ProviderMessageLookup;
