/**
 * HeyGen Video Provider
 * Implementation of VideoProvider interface for HeyGen AI video generation
 *
 * Docs: https://docs.heygen.com/
 * API Version: v2
 */

import { VideoProvider } from '../interfaces/VideoProvider.js';
import { createLogger } from '../../utils/logger.js';
import crypto from 'crypto';
import fs from 'fs';
import https from 'https';
import { providerConfig } from '../../config/provider-config.js';
import { metrics } from '../../utils/metrics.js';
import { replaceTemplateVariables } from '../utils/variable-replacer.js';

const logger = createLogger('HeyGenVideoProvider');

export class HeyGenVideoProvider extends VideoProvider {
  constructor() {
    super();

    // E2E Mock Mode: When enabled, return mock data instead of calling real APIs
    // This allows E2E tests to run without valid external API credentials
    this.mockMode = process.env.E2E_MOCK_EXTERNAL_APIS === 'true';

    if (this.mockMode) {
      logger.info('[HeyGenVideoProvider] Running in E2E mock mode - returning mock data');
      this.apiKey = 'mock-heygen-key';
      this.webhookSecret = 'mock-webhook-secret';
      this.apiUrl = 'https://api.heygen.com';
      return; // Skip real API setup in mock mode
    }

    const config = providerConfig.getProviderConfig('heygen');
    this.apiKey = config?.apiKey;
    this.webhookSecret = config?.webhookSecret;
    this.apiUrl = config?.apiUrl || 'https://api.heygen.com';

    if (!this.apiKey) {
      logger.warn('HeyGen API key not configured');
    }
  }

  get name() {
    return 'heygen';
  }

  /**
   * Make authenticated API request to HeyGen
   */
  async _makeRequest(endpoint, method = 'GET', body = null) {
    const url = `${this.apiUrl}${endpoint}`;
    const startTime = Date.now();

    const options = {
      method,
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    logger.debug('HeyGen API request', { method, endpoint });

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      const latency = Date.now() - startTime;

      // Track API latency
      metrics.histogram('provider.api_latency_ms', latency, {
        provider: 'heygen',
        endpoint: endpoint.split('/')[1] || endpoint
      });

      if (!response.ok) {
        // Track API error
        metrics.counter('provider.api_calls', 1, {
          provider: 'heygen',
          endpoint: endpoint.split('/')[1] || endpoint,
          status: 'error'
        });
        metrics.counter('provider.api_errors', 1, {
          provider: 'heygen',
          error_type: response.status >= 500 ? 'server_error' : 'validation'
        });

        logger.error('HeyGen API error', {
          status: response.status,
          endpoint,
          error: data
        });

        throw new Error(
          data.error?.message ||
          data.message ||
          `HeyGen API error: ${response.status}`
        );
      }

      // Track successful API call
      metrics.counter('provider.api_calls', 1, {
        provider: 'heygen',
        endpoint: endpoint.split('/')[1] || endpoint,
        status: 'success'
      });

      return data;
    } catch (error) {
      // Track network/timeout errors
      if (!error.message.includes('HeyGen API error')) {
        metrics.counter('provider.api_calls', 1, {
          provider: 'heygen',
          endpoint: endpoint.split('/')[1] || endpoint,
          status: 'error'
        });
        metrics.counter('provider.api_errors', 1, {
          provider: 'heygen',
          error_type: 'network'
        });
      }

      logger.error('HeyGen API request failed', {
        endpoint,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate a personalized video
   */
  async generateVideo(params) {
    const {
      avatarId,
      voiceId,
      script,
      variables = {},
      options = {},
      campaignId,
      enrollmentId,
      metadata = {}
    } = params;

    // E2E Mock Mode: Return mock video generation response
    if (this.mockMode) {
      logger.info('[HeyGenVideoProvider] Mock generateVideo called', { campaignId, enrollmentId });
      return this._getMockGenerateVideoResponse(params);
    }

    // Replace variables in script using shared utility
    const personalizedScript = replaceTemplateVariables(script, variables);

    // Build HeyGen API request
    const requestBody = {
      video_inputs: [{
        character: {
          type: 'avatar',
          avatar_id: avatarId,
          avatar_style: 'normal'
        },
        voice: {
          type: 'text',
          input_text: personalizedScript,
          voice_id: voiceId
        }
      }],
      dimension: {
        width: options.dimensions?.width || 1280,
        height: options.dimensions?.height || 720
      },
      test: false
    };

    // Add background if specified
    if (options.background) {
      requestBody.video_inputs[0].background = {
        type: options.background.startsWith('#') ? 'color' : 'image',
        value: options.background
      };
    }

    // Add captions if requested
    if (options.captions) {
      requestBody.caption = true;
    }

    // P1 FIX: Add BOTH callback_url AND callback_id for webhooks
    // callback_url is REQUIRED for HeyGen to send webhooks
    // callback_id is metadata to identify the video in our system
    if (process.env.API_SERVER_URL) {
      requestBody.callback_url = `${process.env.API_SERVER_URL}/api/campaigns/events/webhook?provider=heygen`;
      requestBody.callback_id = `${campaignId}:${enrollmentId}`;
    } else {
      logger.warn('API_SERVER_URL not configured - HeyGen webhooks will not be received');
    }

    logger.info('Generating HeyGen video', {
      campaignId,
      enrollmentId,
      avatarId,
      voiceId,
      scriptLength: personalizedScript.length
    });

    try {
      const response = await this._makeRequest('/v2/video/generate', 'POST', requestBody);

      // Track video generation initiated
      metrics.counter('video.generations', 1, { status: 'pending' });

      return {
        videoId: response.data.video_id,
        status: this._normalizeStatus(response.data.status),
        metadata: {
          ...metadata,
          heygenVideoId: response.data.video_id,
          campaignId,
          enrollmentId
        }
      };
    } catch (error) {
      // Track video generation failure
      metrics.counter('video.generations', 1, { status: 'failed' });

      logger.error('Failed to generate HeyGen video', {
        error: error.message,
        campaignId,
        enrollmentId
      });
      throw error;
    }
  }

  /**
   * Get video generation status
   * IMPORTANT: HeyGen video URLs expire - this endpoint regenerates them
   */
  async getVideoStatus(videoId) {
    // E2E Mock Mode: Return mock video status
    if (this.mockMode) {
      logger.info('[HeyGenVideoProvider] Mock getVideoStatus called', { videoId });
      return this._getMockVideoStatus(videoId);
    }

    try {
      const response = await this._makeRequest(
        `/v1/video_status.get?video_id=${videoId}`,
        'GET'
      );

      const data = response.data;
      const status = this._normalizeStatus(data.status);

      const result = {
        videoId,
        status,
        progress: this._calculateProgress(data.status)
      };

      // Add URLs when completed
      if (status === 'completed' && data.video_url) {
        result.videoUrl = data.video_url;
        result.thumbnailUrl = data.thumbnail_url;
        result.gifUrl = data.gif_url;
        result.captionUrl = data.caption_url;
        result.duration = data.duration;
      }

      // Add error if failed
      if (status === 'failed' && data.error) {
        result.error = data.error.message || 'Video generation failed';
      }

      return result;
    } catch (error) {
      logger.error('Failed to get HeyGen video status', {
        videoId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Download video file
   */
  async downloadVideo(videoUrl, destinationPath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destinationPath);

      https.get(videoUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download video: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          logger.info('Video downloaded successfully', { destinationPath });
          resolve(destinationPath);
        });
      }).on('error', (error) => {
        fs.unlink(destinationPath, () => {});
        logger.error('Failed to download video', { error: error.message });
        reject(error);
      });
    });
  }

  /**
   * List available avatars
   */
  async listAvatars() {
    // E2E Mock Mode: Return mock avatar list
    if (this.mockMode) {
      logger.info('[HeyGenVideoProvider] Mock listAvatars called');
      return this._getMockAvatars();
    }

    try {
      const response = await this._makeRequest('/v2/avatars', 'GET');

      return response.data.avatars.map(avatar => ({
        id: avatar.avatar_id,
        name: avatar.avatar_name,
        gender: avatar.gender,
        previewUrl: avatar.preview_image_url,
        supportedLanguages: avatar.supported_languages || []
      }));
    } catch (error) {
      logger.error('Failed to list HeyGen avatars', { error: error.message });
      throw error;
    }
  }

  /**
   * List available voices
   */
  async listVoices() {
    // E2E Mock Mode: Return mock voice list
    if (this.mockMode) {
      logger.info('[HeyGenVideoProvider] Mock listVoices called');
      return this._getMockVoices();
    }

    try {
      const response = await this._makeRequest('/v2/voices', 'GET');

      return response.data.voices.map(voice => ({
        id: voice.voice_id,
        name: voice.display_name,
        language: voice.language,
        gender: voice.gender,
        accent: voice.accent,
        sampleUrl: voice.preview_audio_url
      }));
    } catch (error) {
      logger.error('Failed to list HeyGen voices', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * HeyGen uses HMAC-SHA256 signature verification
   */
  verifyWebhookSignature(req, secret) {
    // P0 SECURITY: FAIL CLOSED - Never allow webhooks without secret configured
    if (!secret) {
      logger.error('HEYGEN_WEBHOOK_SECRET not configured - REJECTING all webhooks for security');
      return false;
    }

    const signature = req.headers['x-heygen-signature'];

    if (!signature) {
      logger.warn('Missing HeyGen webhook signature');
      return false;
    }

    // HeyGen sends: timestamp,signature
    const [timestamp, receivedSignature] = signature.split(',');

    if (!timestamp || !receivedSignature) {
      logger.warn('Invalid HeyGen signature format');
      return false;
    }

    // Verify timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const timestampInt = parseInt(timestamp, 10);

    if (Math.abs(now - timestampInt) > 300) {
      logger.warn('HeyGen webhook timestamp too old', { timestamp, now });
      return false;
    }

    // Calculate expected signature
    const payload = `${timestamp}.${req.rawBody || JSON.stringify(req.body)}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      logger.warn('Invalid HeyGen webhook signature');
    }

    return isValid;
  }

  /**
   * Parse webhook payload into normalized event format
   */
  parseWebhookEvent(payload) {
    const { event_type, data } = payload;

    // Map HeyGen event types to our normalized types
    const eventTypeMap = {
      'video.completed': 'video.completed',
      'video.failed': 'video.failed',
      'video.started': 'video.processing'
    };

    return {
      type: eventTypeMap[event_type] || event_type,
      providerEventId: data.video_id,
      videoId: data.video_id,
      timestamp: new Date(data.timestamp || Date.now()),
      data: {
        status: data.status,
        videoUrl: data.video_url,
        thumbnailUrl: data.thumbnail_url,
        duration: data.duration,
        error: data.error,
        callbackId: data.callback_id
      }
    };
  }

  /**
   * Get provider capabilities
   */
  getCapabilities() {
    return {
      supportsCustomAvatars: true,
      supportsCustomVoices: false,
      supportsCaptions: true,
      supportsBackgrounds: true,
      maxVideoDuration: 300, // 5 minutes for standard plan
      maxVideoWidth: 1920,
      maxVideoHeight: 1080,
      supportedFormats: ['mp4']
    };
  }

  /**
   * Get quota status
   */
  async getQuotaStatus() {
    // E2E Mock Mode: Return mock quota status
    if (this.mockMode) {
      logger.info('[HeyGenVideoProvider] Mock getQuotaStatus called');
      return this._getMockQuotaStatus();
    }

    try {
      // HeyGen doesn't have a direct quota endpoint
      // We can check remaining credits indirectly through account info
      const response = await this._makeRequest('/v2/user/remaining_quota', 'GET');

      return {
        remaining: response.data.remaining_quota,
        total: response.data.total_quota,
        used: response.data.total_quota - response.data.remaining_quota,
        resetsAt: new Date(response.data.reset_date)
      };
    } catch (error) {
      logger.warn('Failed to get HeyGen quota status', { error: error.message });

      // Return unknown if endpoint not available
      return {
        remaining: -1,
        total: -1,
        used: -1,
        resetsAt: null
      };
    }
  }

  /**
   * Validate configuration
   */
  async validateConfig() {
    // E2E Mock Mode: Always return success
    if (this.mockMode) {
      logger.info('[HeyGenVideoProvider] Mock validateConfig - returning success');
      return true;
    }

    if (!this.apiKey) {
      throw new Error('HEYGEN_API_KEY not configured');
    }

    try {
      // Test API key by fetching avatars
      await this.listAvatars();
      logger.info('HeyGen configuration validated successfully');
      return true;
    } catch (error) {
      logger.error('HeyGen configuration validation failed', { error: error.message });
      throw new Error(`Invalid HeyGen API key: ${error.message}`);
    }
  }

  /**
   * Cancel video generation
   */
  async cancelVideo(videoId) {
    // HeyGen doesn't support cancellation via API
    // Once a video is generating, it must complete
    logger.warn('HeyGen does not support video cancellation', { videoId });
    return false;
  }

  /**
   * Helper: Normalize HeyGen status to our standard statuses
   */
  _normalizeStatus(heygenStatus) {
    const statusMap = {
      'pending': 'pending',
      'processing': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'error': 'failed'
    };

    return statusMap[heygenStatus] || 'pending';
  }

  /**
   * Helper: Calculate progress percentage based on status
   */
  _calculateProgress(status) {
    const progressMap = {
      'pending': 0,
      'processing': 50,
      'completed': 100,
      'failed': 0
    };

    return progressMap[status] || 0;
  }

  // ============================================================================
  // E2E MOCK MODE RESPONSE METHODS
  // These are only used when E2E_MOCK_EXTERNAL_APIS=true
  // ============================================================================

  /**
   * Mock response for generateVideo
   */
  _getMockGenerateVideoResponse(params) {
    const mockVideoId = `mock-video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      videoId: mockVideoId,
      status: 'pending',
      metadata: {
        ...params.metadata,
        heygenVideoId: mockVideoId,
        campaignId: params.campaignId,
        enrollmentId: params.enrollmentId,
        mockMode: true
      },
      mockMode: true
    };
  }

  /**
   * Mock response for getVideoStatus
   */
  _getMockVideoStatus(videoId) {
    // Always return completed status for mock mode
    return {
      videoId,
      status: 'completed',
      progress: 100,
      videoUrl: `https://mock-heygen.example.com/videos/${videoId}.mp4`,
      thumbnailUrl: `https://mock-heygen.example.com/thumbnails/${videoId}.jpg`,
      gifUrl: `https://mock-heygen.example.com/gifs/${videoId}.gif`,
      captionUrl: `https://mock-heygen.example.com/captions/${videoId}.vtt`,
      duration: 30,
      mockMode: true
    };
  }

  /**
   * Mock response for listAvatars
   */
  _getMockAvatars() {
    return [
      {
        id: 'mock-avatar-1',
        name: 'Sarah - Professional',
        gender: 'female',
        previewUrl: 'https://mock-heygen.example.com/avatars/sarah.jpg',
        supportedLanguages: ['en', 'es', 'fr']
      },
      {
        id: 'mock-avatar-2',
        name: 'Michael - Business',
        gender: 'male',
        previewUrl: 'https://mock-heygen.example.com/avatars/michael.jpg',
        supportedLanguages: ['en', 'de', 'it']
      },
      {
        id: 'mock-avatar-3',
        name: 'Emma - Friendly',
        gender: 'female',
        previewUrl: 'https://mock-heygen.example.com/avatars/emma.jpg',
        supportedLanguages: ['en', 'pt', 'ja']
      }
    ];
  }

  /**
   * Mock response for listVoices
   */
  _getMockVoices() {
    return [
      {
        id: 'mock-voice-1',
        name: 'Professional English',
        language: 'en-US',
        gender: 'female',
        accent: 'American',
        sampleUrl: 'https://mock-heygen.example.com/voices/professional-en.mp3'
      },
      {
        id: 'mock-voice-2',
        name: 'Friendly English',
        language: 'en-US',
        gender: 'male',
        accent: 'American',
        sampleUrl: 'https://mock-heygen.example.com/voices/friendly-en.mp3'
      },
      {
        id: 'mock-voice-3',
        name: 'British Professional',
        language: 'en-GB',
        gender: 'female',
        accent: 'British',
        sampleUrl: 'https://mock-heygen.example.com/voices/british-pro.mp3'
      }
    ];
  }

  /**
   * Mock response for getQuotaStatus
   */
  _getMockQuotaStatus() {
    return {
      remaining: 100,
      total: 120,
      used: 20,
      resetsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      mockMode: true
    };
  }
}

export default HeyGenVideoProvider;
