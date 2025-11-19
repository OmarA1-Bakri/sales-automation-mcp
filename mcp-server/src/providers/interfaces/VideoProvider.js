/**
 * Video Provider Interface
 * Abstract base class for all video generation providers (HeyGen)
 *
 * All video providers must implement these methods to ensure
 * consistent behavior across different video generation services.
 */

export class VideoProvider {
  /**
   * Provider name (e.g., 'heygen')
   * @type {string}
   */
  get name() {
    throw new Error('VideoProvider.name must be implemented');
  }

  /**
   * Generate a personalized video
   *
   * @param {Object} params - Video generation parameters
   * @param {string} params.avatarId - Avatar ID to use
   * @param {string} params.voiceId - Voice ID to use
   * @param {string} params.script - Video script with {{variables}}
   * @param {Object} params.variables - Personalization variables (firstName, company, etc.)
   * @param {Object} params.options - Additional options
   * @param {string} params.options.background - Background color or URL
   * @param {Object} params.options.dimensions - Video dimensions {width, height}
   * @param {boolean} params.options.captions - Enable captions
   * @param {string} params.campaignId - Campaign instance ID for tracking
   * @param {string} params.enrollmentId - Enrollment ID for tracking
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<Object>} Result with video ID
   * @returns {string} result.videoId - Provider's video ID
   * @returns {string} result.status - Generation status (pending, processing, completed, failed)
   * @throws {Error} If video generation fails to start
   */
  async generateVideo(params) {
    throw new Error('VideoProvider.generateVideo() must be implemented');
  }

  /**
   * Get video generation status
   *
   * @param {string} videoId - Provider-specific video ID
   * @returns {Promise<Object>} Status object
   * @returns {string} status.status - Status (pending, processing, completed, failed)
   * @returns {string} status.videoUrl - Video URL (when completed)
   * @returns {string} status.thumbnailUrl - Thumbnail URL (when completed)
   * @returns {string} status.captionUrl - Caption file URL (if captions enabled)
   * @returns {string} status.gifUrl - GIF preview URL (if available)
   * @returns {number} status.duration - Video duration in seconds (when completed)
   * @returns {number} status.progress - Generation progress percentage (0-100)
   * @returns {string} status.error - Error message (if failed)
   */
  async getVideoStatus(videoId) {
    throw new Error('VideoProvider.getVideoStatus() must be implemented');
  }

  /**
   * Download video file
   *
   * @param {string} videoUrl - Video URL from getVideoStatus()
   * @param {string} destinationPath - Local path to save video
   * @returns {Promise<string>} Path to downloaded video file
   * @throws {Error} If download fails
   */
  async downloadVideo(videoUrl, destinationPath) {
    throw new Error('VideoProvider.downloadVideo() must be implemented');
  }

  /**
   * List available avatars
   *
   * @returns {Promise<Array<Object>>} Array of avatar objects
   * @returns {string} avatar.id - Avatar ID
   * @returns {string} avatar.name - Avatar display name
   * @returns {string} avatar.gender - Avatar gender
   * @returns {string} avatar.previewUrl - Avatar preview image URL
   * @returns {Array<string>} avatar.supportedLanguages - Supported languages
   */
  async listAvatars() {
    throw new Error('VideoProvider.listAvatars() must be implemented');
  }

  /**
   * List available voices
   *
   * @returns {Promise<Array<Object>>} Array of voice objects
   * @returns {string} voice.id - Voice ID
   * @returns {string} voice.name - Voice display name
   * @returns {string} voice.language - Voice language code
   * @returns {string} voice.gender - Voice gender
   * @returns {string} voice.accent - Voice accent
   * @returns {string} voice.sampleUrl - Voice sample audio URL
   */
  async listVoices() {
    throw new Error('VideoProvider.listVoices() must be implemented');
  }

  /**
   * Verify webhook signature (if provider supports webhooks)
   *
   * @param {Object} req - Express request object with headers and rawBody
   * @param {string} secret - Webhook secret for this provider
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(req, secret) {
    throw new Error('VideoProvider.verifyWebhookSignature() must be implemented');
  }

  /**
   * Parse webhook payload into normalized event format
   *
   * @param {Object} payload - Raw webhook payload from provider
   * @returns {Object} Normalized event object
   * @returns {string} event.type - Event type (video.completed, video.failed, video.viewed, etc.)
   * @returns {string} event.providerEventId - Provider's unique event ID
   * @returns {string} event.videoId - Provider's video ID
   * @returns {Date} event.timestamp - Event timestamp
   * @returns {Object} event.data - Provider-specific event data
   */
  parseWebhookEvent(payload) {
    throw new Error('VideoProvider.parseWebhookEvent() must be implemented');
  }

  /**
   * Get provider capabilities
   *
   * @returns {Object} Capabilities object
   * @returns {boolean} capabilities.supportsCustomAvatars - Can upload custom avatars
   * @returns {boolean} capabilities.supportsCustomVoices - Can upload custom voices
   * @returns {boolean} capabilities.supportsCaptions - Supports auto-generated captions
   * @returns {boolean} capabilities.supportsBackgrounds - Supports custom backgrounds
   * @returns {number} capabilities.maxVideoDuration - Maximum video duration in seconds
   * @returns {number} capabilities.maxVideoWidth - Maximum video width in pixels
   * @returns {number} capabilities.maxVideoHeight - Maximum video height in pixels
   * @returns {Array<string>} capabilities.supportedFormats - Supported video formats
   */
  getCapabilities() {
    return {
      supportsCustomAvatars: false,
      supportsCustomVoices: false,
      supportsCaptions: true,
      supportsBackgrounds: true,
      maxVideoDuration: 600, // 10 minutes
      maxVideoWidth: 1920,
      maxVideoHeight: 1080,
      supportedFormats: ['mp4']
    };
  }

  /**
   * Get quota status
   * Check remaining video credits/quota
   *
   * @returns {Promise<Object>} Quota status
   * @returns {number} quota.remaining - Remaining video credits/seconds
   * @returns {number} quota.total - Total video credits/seconds for billing period
   * @returns {number} quota.used - Used video credits/seconds
   * @returns {Date} quota.resetsAt - When quota resets
   */
  async getQuotaStatus() {
    throw new Error('VideoProvider.getQuotaStatus() must be implemented');
  }

  /**
   * Validate configuration
   * Check if provider is properly configured with API keys, etc.
   *
   * @returns {Promise<boolean>} True if configuration is valid
   * @throws {Error} If configuration is invalid
   */
  async validateConfig() {
    throw new Error('VideoProvider.validateConfig() must be implemented');
  }

  /**
   * Cancel video generation
   *
   * @param {string} videoId - Provider-specific video ID
   * @returns {Promise<boolean>} True if cancellation successful
   * @throws {Error} If cancellation fails
   */
  async cancelVideo(videoId) {
    throw new Error('VideoProvider.cancelVideo() must be implemented');
  }
}

export default VideoProvider;
