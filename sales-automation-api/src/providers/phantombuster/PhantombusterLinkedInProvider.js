/**
 * PhantomBuster LinkedIn Provider
 * Implementation of LinkedInProvider interface for PhantomBuster automation
 *
 * Docs: https://hub.phantombuster.com/docs/api
 * API Version: v2
 *
 * IMPORTANT: This provider uses PhantomBuster's automation which may violate
 * LinkedIn's Terms of Service. Use at your own risk and implement appropriate
 * rate limiting and safety measures.
 */

import { LinkedInProvider } from '../interfaces/LinkedInProvider.js';
import { createLogger } from '../../utils/logger.js';
import { providerConfig } from '../../config/provider-config.js';

const logger = createLogger('PhantombusterLinkedInProvider');

export class PhantombusterLinkedInProvider extends LinkedInProvider {
  constructor() {
    super();

    const config = providerConfig.getProviderConfig('phantombuster');
    this.apiKey = config?.apiKey;
    this.webhookSecret = config?.webhookSecret;
    this.apiUrl = config?.apiUrl || 'https://api.phantombuster.com/api/v2';

    // LinkedIn safety limits (2025 recommendations)
    this.dailyConnectionLimit = 20; // Conservative limit
    this.dailyMessageLimit = 50;
    this.dailyProfileViewLimit = 500;

    if (!this.apiKey) {
      logger.warn('PhantomBuster API key not configured');
    }
  }

  get name() {
    return 'phantombuster';
  }

  /**
   * Make authenticated API request to PhantomBuster
   */
  async _makeRequest(endpoint, method = 'GET', body = null) {
    const url = `${this.apiUrl}${endpoint}`;

    const options = {
      method,
      headers: {
        'X-Phantombuster-Key-1': this.apiKey,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    logger.debug('PhantomBuster API request', { method, endpoint });

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        logger.error('PhantomBuster API error', {
          status: response.status,
          endpoint,
          error: data
        });

        throw new Error(
          data.message ||
          `PhantomBuster API error: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      logger.error('PhantomBuster API request failed', {
        endpoint,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Launch a PhantomBuster agent
   */
  async _launchAgent(agentId, argument = {}) {
    try {
      const response = await this._makeRequest(
        `/agents/launch`,
        'POST',
        {
          id: agentId,
          argument
        }
      );

      return {
        containerId: response.containerId,
        agentId
      };
    } catch (error) {
      logger.error('Failed to launch PhantomBuster agent', {
        agentId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get agent execution results
   */
  async _getAgentOutput(agentId) {
    try {
      const response = await this._makeRequest(
        `/agents/fetch-output?id=${agentId}`,
        'GET'
      );

      // Construct download URL for results
      // PhantomBuster returns s3Folder, need to combine with org folder
      if (response.s3Folder) {
        const resultUrl = `https://phantombuster.s3.amazonaws.com/${response.orgS3Folder}/${response.s3Folder}/result.json`;

        // Fetch the actual results
        const resultsResponse = await fetch(resultUrl);
        const results = await resultsResponse.json();

        return {
          status: response.status,
          results,
          s3Folder: response.s3Folder
        };
      }

      return {
        status: response.status,
        results: null
      };
    } catch (error) {
      logger.error('Failed to fetch PhantomBuster output', {
        agentId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Visit a LinkedIn profile
   */
  async visitProfile(params) {
    const {
      profileUrl,
      campaignId,
      enrollmentId,
      metadata = {}
    } = params;

    logger.info('Visiting LinkedIn profile via PhantomBuster', {
      profileUrl,
      campaignId,
      enrollmentId
    });

    // Use LinkedIn Profile Visitor phantom
    // Note: You need to create and configure this agent in your PhantomBuster account
    const agentId = process.env.PHANTOMBUSTER_PROFILE_VISITOR_AGENT_ID;

    if (!agentId) {
      throw new Error('PHANTOMBUSTER_PROFILE_VISITOR_AGENT_ID not configured');
    }

    try {
      const result = await this._launchAgent(agentId, {
        profileUrl,
        sessionCookie: process.env.LINKEDIN_SESSION_COOKIE,
        metadata: {
          campaignId,
          enrollmentId,
          ...metadata
        }
      });

      return {
        actionId: result.containerId,
        status: 'pending',
        profileUrl,
        metadata: {
          ...metadata,
          containerId: result.containerId,
          agentId: result.agentId,
          campaignId,
          enrollmentId
        }
      };
    } catch (error) {
      logger.error('Failed to visit LinkedIn profile', {
        error: error.message,
        profileUrl,
        campaignId
      });
      throw error;
    }
  }

  /**
   * Send connection request
   */
  async sendConnectionRequest(params) {
    const {
      profileUrl,
      message,
      campaignId,
      enrollmentId,
      variables = {},
      metadata = {}
    } = params;

    // Validate connection request
    this.validateConnectionRequest({ message, profileUrl });

    // Replace variables in message
    let personalizedMessage = message;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      personalizedMessage = personalizedMessage.replace(regex, value || '');
    });

    // Double-check character limit after personalization
    if (personalizedMessage.length > 300) {
      throw new Error(
        `Personalized message exceeds LinkedIn's 300 character limit (${personalizedMessage.length} characters)`
      );
    }

    logger.info('Sending LinkedIn connection request via PhantomBuster', {
      profileUrl,
      messageLength: personalizedMessage.length,
      campaignId,
      enrollmentId
    });

    // Use LinkedIn Auto Connect phantom
    const agentId = process.env.PHANTOMBUSTER_AUTO_CONNECT_AGENT_ID;

    if (!agentId) {
      throw new Error('PHANTOMBUSTER_AUTO_CONNECT_AGENT_ID not configured');
    }

    try {
      const result = await this._launchAgent(agentId, {
        profileUrl,
        message: personalizedMessage,
        sessionCookie: process.env.LINKEDIN_SESSION_COOKIE,
        metadata: {
          campaignId,
          enrollmentId,
          ...metadata
        }
      });

      return {
        actionId: result.containerId,
        status: 'pending',
        profileUrl,
        message: personalizedMessage,
        metadata: {
          ...metadata,
          containerId: result.containerId,
          agentId: result.agentId,
          campaignId,
          enrollmentId
        }
      };
    } catch (error) {
      logger.error('Failed to send LinkedIn connection request', {
        error: error.message,
        profileUrl,
        campaignId
      });
      throw error;
    }
  }

  /**
   * Send LinkedIn message
   */
  async sendMessage(params) {
    const {
      profileUrl,
      message,
      campaignId,
      enrollmentId,
      variables = {},
      metadata = {}
    } = params;

    // Replace variables in message
    let personalizedMessage = message;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      personalizedMessage = personalizedMessage.replace(regex, value || '');
    });

    logger.info('Sending LinkedIn message via PhantomBuster', {
      profileUrl,
      messageLength: personalizedMessage.length,
      campaignId,
      enrollmentId
    });

    // Use LinkedIn Message Sender phantom
    const agentId = process.env.PHANTOMBUSTER_MESSAGE_SENDER_AGENT_ID;

    if (!agentId) {
      throw new Error('PHANTOMBUSTER_MESSAGE_SENDER_AGENT_ID not configured');
    }

    try {
      const result = await this._launchAgent(agentId, {
        profileUrl,
        message: personalizedMessage,
        sessionCookie: process.env.LINKEDIN_SESSION_COOKIE,
        metadata: {
          campaignId,
          enrollmentId,
          ...metadata
        }
      });

      return {
        messageId: result.containerId,
        status: 'pending',
        profileUrl,
        message: personalizedMessage,
        metadata: {
          ...metadata,
          containerId: result.containerId,
          agentId: result.agentId,
          campaignId,
          enrollmentId
        }
      };
    } catch (error) {
      logger.error('Failed to send LinkedIn message', {
        error: error.message,
        profileUrl,
        campaignId
      });
      throw error;
    }
  }

  /**
   * Send voice message (not supported)
   */
  async sendVoiceMessage(params) {
    logger.warn('Voice messages not supported via PhantomBuster');
    return { supported: false };
  }

  /**
   * Get action status
   */
  async getStatus(actionId) {
    try {
      // actionId is the container ID from PhantomBuster
      const response = await this._makeRequest(
        `/containers/fetch?id=${actionId}`,
        'GET'
      );

      return {
        actionId,
        status: this._normalizeStatus(response.status),
        executedAt: response.launchedAt ? new Date(response.launchedAt) : null,
        completedAt: response.finishedAt ? new Date(response.finishedAt) : null,
        error: response.exitMessage
      };
    } catch (error) {
      logger.error('Failed to get PhantomBuster status', {
        actionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * PhantomBuster doesn't provide signature verification
   */
  verifyWebhookSignature(req, secret) {
    // PhantomBuster webhooks don't include signatures
    // Recommend using HTTPS + IP whitelisting
    logger.debug('PhantomBuster webhook received (no signature verification available)');

    // If you've configured a secret token, check it
    const token = req.headers['x-phantombuster-token'] || req.query.token;

    if (secret && token) {
      return token === secret;
    }

    // Allow if no secret configured (not recommended for production)
    return !secret || secret === '';
  }

  /**
   * Parse webhook payload into normalized event format
   */
  parseWebhookEvent(payload) {
    const { status, agentId, containerId, exitMessage, output } = payload;

    // Determine event type based on agent type and status
    let eventType = 'action.completed';

    if (status === 'error') {
      eventType = 'action.failed';
    }

    return {
      type: eventType,
      providerEventId: containerId,
      providerActionId: containerId,
      timestamp: new Date(),
      data: {
        status,
        agentId,
        containerId,
        exitMessage,
        output,
        results: output?.results
      }
    };
  }

  /**
   * Get provider capabilities
   */
  getCapabilities() {
    return {
      supportsProfileVisits: true,
      supportsConnectionRequests: true,
      supportsMessages: true,
      supportsVoiceMessages: false,
      dailyConnectionLimit: this.dailyConnectionLimit,
      dailyMessageLimit: this.dailyMessageLimit,
      dailyProfileViewLimit: this.dailyProfileViewLimit,
      recommendedDelay: '5-30 seconds', // Between actions
      safetyFeatures: [
        'Randomized delays',
        'Office hours scheduling',
        'Gradual ramping',
        'Daily limits enforcement'
      ]
    };
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus() {
    // PhantomBuster doesn't track rate limits internally
    // You would need to track this in your own database

    logger.warn('Rate limit tracking not implemented - track in your database');

    return {
      connectionsToday: 0,
      messagesToday: 0,
      profileVisitsToday: 0,
      connectionsRemaining: this.dailyConnectionLimit,
      messagesRemaining: this.dailyMessageLimit,
      profileVisitsRemaining: this.dailyProfileViewLimit,
      resetsAt: this._getNextMidnight()
    };
  }

  /**
   * Validate configuration
   */
  async validateConfig() {
    if (!this.apiKey) {
      throw new Error('PHANTOMBUSTER_API_KEY not configured');
    }

    if (!process.env.LINKEDIN_SESSION_COOKIE) {
      throw new Error('LINKEDIN_SESSION_COOKIE not configured (required for PhantomBuster)');
    }

    try {
      // Test API key by fetching agents
      await this._makeRequest('/agents/fetch-all', 'GET');
      logger.info('PhantomBuster configuration validated successfully');
      return true;
    } catch (error) {
      logger.error('PhantomBuster configuration validation failed', { error: error.message });
      throw new Error(`Invalid PhantomBuster API key: ${error.message}`);
    }
  }

  /**
   * Helper: Normalize PhantomBuster status to our standard statuses
   */
  _normalizeStatus(phantombusterStatus) {
    const statusMap = {
      'running': 'processing',
      'finished': 'completed',
      'error': 'failed'
    };

    return statusMap[phantombusterStatus] || phantombusterStatus;
  }

  /**
   * Helper: Get next midnight for rate limit reset
   */
  _getNextMidnight() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * List all configured agents
   * Useful for setup and debugging
   */
  async listAgents() {
    try {
      const response = await this._makeRequest('/agents/fetch-all', 'GET');
      return response;
    } catch (error) {
      logger.error('Failed to list PhantomBuster agents', { error: error.message });
      throw error;
    }
  }
}

export default PhantombusterLinkedInProvider;
