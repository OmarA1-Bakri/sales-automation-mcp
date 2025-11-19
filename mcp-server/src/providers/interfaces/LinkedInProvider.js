/**
 * LinkedIn Provider Interface
 * Abstract base class for all LinkedIn automation providers (Lemlist, Phantombuster)
 *
 * All LinkedIn providers must implement these methods to ensure
 * consistent behavior across different LinkedIn automation services.
 */

export class LinkedInProvider {
  /**
   * Provider name (e.g., 'lemlist', 'phantombuster')
   * @type {string}
   */
  get name() {
    throw new Error('LinkedInProvider.name must be implemented');
  }

  /**
   * Visit a LinkedIn profile
   *
   * @param {Object} params - Visit parameters
   * @param {string} params.profileUrl - LinkedIn profile URL
   * @param {string} params.campaignId - Campaign instance ID for tracking
   * @param {string} params.enrollmentId - Enrollment ID for tracking
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<Object>} Result with provider action ID
   * @throws {Error} If profile visit fails
   */
  async visitProfile(params) {
    throw new Error('LinkedInProvider.visitProfile() must be implemented');
  }

  /**
   * Send connection request
   *
   * @param {Object} params - Connection request parameters
   * @param {string} params.profileUrl - LinkedIn profile URL
   * @param {string} params.message - Personalized connection message (optional)
   * @param {string} params.campaignId - Campaign instance ID for tracking
   * @param {string} params.enrollmentId - Enrollment ID for tracking
   * @param {Object} params.variables - Personalization variables
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<Object>} Result with provider action ID
   * @throws {Error} If connection request fails
   */
  async sendConnectionRequest(params) {
    throw new Error('LinkedInProvider.sendConnectionRequest() must be implemented');
  }

  /**
   * Validate connection request parameters
   * LinkedIn enforces a 300 character limit on connection messages
   *
   * @param {Object} params - Connection request params
   * @param {string} params.message - Connection message
   * @throws {Error} If message exceeds 300 characters or is invalid
   */
  validateConnectionRequest(params) {
    if (!params) {
      throw new Error('Connection request parameters are required');
    }

    if (!params.message) {
      throw new Error('Connection message is required');
    }

    if (typeof params.message !== 'string') {
      throw new Error('Connection message must be a string');
    }

    const trimmedMessage = params.message.trim();

    if (trimmedMessage.length === 0) {
      throw new Error('Connection message cannot be empty');
    }

    if (params.message.length > 300) {
      throw new Error(
        `Connection message exceeds LinkedIn's 300 character limit (${params.message.length} characters)`
      );
    }

    if (!params.profileUrl) {
      throw new Error('Profile URL is required');
    }
  }

  /**
   * Send LinkedIn message (after connection accepted)
   *
   * @param {Object} params - Message parameters
   * @param {string} params.profileUrl - LinkedIn profile URL
   * @param {string} params.message - Message text
   * @param {string} params.campaignId - Campaign instance ID for tracking
   * @param {string} params.enrollmentId - Enrollment ID for tracking
   * @param {Object} params.variables - Personalization variables
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<Object>} Result with provider message ID
   * @throws {Error} If message send fails
   */
  async sendMessage(params) {
    throw new Error('LinkedInProvider.sendMessage() must be implemented');
  }

  /**
   * Send voice message (if supported)
   *
   * @param {Object} params - Voice message parameters
   * @param {string} params.profileUrl - LinkedIn profile URL
   * @param {string} params.audioUrl - URL to audio file
   * @param {string} params.campaignId - Campaign instance ID for tracking
   * @param {string} params.enrollmentId - Enrollment ID for tracking
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<Object>} Result with provider action ID
   * @throws {Error} If voice message send fails or not supported
   */
  async sendVoiceMessage(params) {
    throw new Error('LinkedInProvider.sendVoiceMessage() must be implemented or return { supported: false }');
  }

  /**
   * Get action status
   *
   * @param {string} actionId - Provider-specific action ID
   * @returns {Promise<Object>} Status object with state (pending, completed, failed, etc.)
   */
  async getStatus(actionId) {
    throw new Error('LinkedInProvider.getStatus() must be implemented');
  }

  /**
   * Verify webhook signature
   * Each provider uses different signature algorithms
   *
   * @param {Object} req - Express request object with headers and rawBody
   * @param {string} secret - Webhook secret for this provider
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(req, secret) {
    throw new Error('LinkedInProvider.verifyWebhookSignature() must be implemented');
  }

  /**
   * Parse webhook payload into normalized event format
   *
   * @param {Object} payload - Raw webhook payload from provider
   * @returns {Object} Normalized event object
   * @returns {string} event.type - Event type (profile_visited, connection_sent, connection_accepted, message_sent, etc.)
   * @returns {string} event.providerEventId - Provider's unique event ID
   * @returns {string} event.providerActionId - Provider's action ID
   * @returns {Date} event.timestamp - Event timestamp
   * @returns {Object} event.data - Provider-specific event data
   */
  parseWebhookEvent(payload) {
    throw new Error('LinkedInProvider.parseWebhookEvent() must be implemented');
  }

  /**
   * Get provider capabilities
   *
   * @returns {Object} Capabilities object
   * @returns {boolean} capabilities.supportsProfileVisits - Can visit profiles
   * @returns {boolean} capabilities.supportsConnectionRequests - Can send connection requests
   * @returns {boolean} capabilities.supportsMessages - Can send messages
   * @returns {boolean} capabilities.supportsVoiceMessages - Can send voice messages
   * @returns {number} capabilities.dailyConnectionLimit - Daily connection request limit
   * @returns {number} capabilities.dailyMessageLimit - Daily message limit
   */
  getCapabilities() {
    return {
      supportsProfileVisits: true,
      supportsConnectionRequests: true,
      supportsMessages: true,
      supportsVoiceMessages: false,
      dailyConnectionLimit: 100,
      dailyMessageLimit: 100
    };
  }

  /**
   * Get current rate limit status
   *
   * @returns {Promise<Object>} Rate limit status
   * @returns {number} status.connectionsToday - Connection requests sent today
   * @returns {number} status.messagesToday - Messages sent today
   * @returns {number} status.connectionsRemaining - Remaining connection requests for today
   * @returns {number} status.messagesRemaining - Remaining messages for today
   * @returns {Date} status.resetsAt - When limits reset
   */
  async getRateLimitStatus() {
    throw new Error('LinkedInProvider.getRateLimitStatus() must be implemented');
  }

  /**
   * Validate configuration
   * Check if provider is properly configured with API keys, etc.
   *
   * @returns {Promise<boolean>} True if configuration is valid
   * @throws {Error} If configuration is invalid
   */
  async validateConfig() {
    throw new Error('LinkedInProvider.validateConfig() must be implemented');
  }
}

export default LinkedInProvider;
