/**
 * Email Provider Interface
 * Abstract base class for all email providers (Lemlist, Postmark)
 *
 * All email providers must implement these methods to ensure
 * consistent behavior across different email services.
 */

export class EmailProvider {
  /**
   * Provider name (e.g., 'lemlist', 'postmark')
   * @type {string}
   */
  get name() {
    throw new Error('EmailProvider.name must be implemented');
  }

  /**
   * Send a single email
   *
   * @param {Object} params - Email parameters
   * @param {string} params.to - Recipient email address
   * @param {string} params.subject - Email subject line
   * @param {string} params.body - HTML email body
   * @param {string} params.from - Sender email (optional, uses default)
   * @param {string} params.campaignId - Campaign instance ID for tracking
   * @param {string} params.enrollmentId - Enrollment ID for tracking
   * @param {Object} params.variables - Personalization variables
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<Object>} Result with provider message ID
   * @throws {Error} If send fails
   */
  async send(params) {
    throw new Error('EmailProvider.send() must be implemented');
  }

  /**
   * Send batch of emails (if supported by provider)
   *
   * @param {Array<Object>} emails - Array of email parameters (same structure as send())
   * @returns {Promise<Object>} Result with sent count and failures
   * @throws {Error} If batch send fails
   */
  async sendBatch(emails) {
    throw new Error('EmailProvider.sendBatch() must be implemented');
  }

  /**
   * Get email delivery status
   *
   * @param {string} messageId - Provider-specific message ID
   * @returns {Promise<Object>} Status object with state (sent, delivered, bounced, etc.)
   */
  async getStatus(messageId) {
    throw new Error('EmailProvider.getStatus() must be implemented');
  }

  /**
   * Verify webhook signature
   * Each provider uses different signature algorithms (HMAC-SHA256, etc.)
   *
   * @param {Object} req - Express request object with headers and rawBody
   * @param {string} secret - Webhook secret for this provider
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(req, secret) {
    throw new Error('EmailProvider.verifyWebhookSignature() must be implemented');
  }

  /**
   * Parse webhook payload into normalized event format
   *
   * @param {Object} payload - Raw webhook payload from provider
   * @returns {Object} Normalized event object
   * @returns {string} event.type - Event type (sent, delivered, opened, clicked, bounced, etc.)
   * @returns {string} event.providerEventId - Provider's unique event ID
   * @returns {string} event.providerMessageId - Provider's message ID
   * @returns {Date} event.timestamp - Event timestamp
   * @returns {Object} event.data - Provider-specific event data
   */
  parseWebhookEvent(payload) {
    throw new Error('EmailProvider.parseWebhookEvent() must be implemented');
  }

  /**
   * Get provider capabilities
   *
   * @returns {Object} Capabilities object
   * @returns {boolean} capabilities.supportsBatch - Supports batch sending
   * @returns {number} capabilities.maxBatchSize - Maximum batch size (if supported)
   * @returns {boolean} capabilities.supportsTemplates - Supports email templates
   * @returns {boolean} capabilities.supportsTracking - Supports open/click tracking
   */
  getCapabilities() {
    return {
      supportsBatch: false,
      maxBatchSize: 1,
      supportsTemplates: false,
      supportsTracking: true
    };
  }

  /**
   * Validate configuration
   * Check if provider is properly configured with API keys, etc.
   *
   * @returns {Promise<boolean>} True if configuration is valid
   * @throws {Error} If configuration is invalid
   */
  async validateConfig() {
    throw new Error('EmailProvider.validateConfig() must be implemented');
  }
}

export default EmailProvider;
