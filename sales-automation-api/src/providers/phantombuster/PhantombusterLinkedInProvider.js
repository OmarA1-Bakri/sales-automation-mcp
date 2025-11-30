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
import { metrics } from '../../utils/metrics.js';
import { replaceTemplateVariables } from '../utils/variable-replacer.js';
import crypto from 'crypto';

const logger = createLogger('PhantombusterLinkedInProvider');

export class PhantombusterLinkedInProvider extends LinkedInProvider {
  constructor() {
    super();

    const config = providerConfig.getProviderConfig('phantombuster');
    this.apiKey = config?.apiKey;
    this.webhookSecret = config?.webhookSecret;
    this.apiUrl = config?.apiUrl || 'https://api.phantombuster.com/api/v2';

    // LinkedIn safety limits (2025 recommendations) - configurable via env vars
    this.dailyConnectionLimit = parseInt(process.env.LINKEDIN_DAILY_CONNECTION_LIMIT || '20', 10);
    this.dailyMessageLimit = parseInt(process.env.LINKEDIN_DAILY_MESSAGE_LIMIT || '50', 10);
    this.dailyProfileViewLimit = parseInt(process.env.LINKEDIN_DAILY_PROFILE_LIMIT || '500', 10);

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
    const startTime = Date.now();

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
      const latency = Date.now() - startTime;

      // Track API latency
      metrics.histogram('provider.api_latency_ms', latency, {
        provider: 'phantombuster',
        endpoint: endpoint.split('/')[1] || endpoint
      });

      if (!response.ok) {
        // Track API error
        metrics.counter('provider.api_calls', 1, {
          provider: 'phantombuster',
          endpoint: endpoint.split('/')[1] || endpoint,
          status: 'error'
        });
        metrics.counter('provider.api_errors', 1, {
          provider: 'phantombuster',
          error_type: response.status === 429 ? 'rate_limit' : (response.status >= 500 ? 'server_error' : 'validation')
        });

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

      // Track successful API call
      metrics.counter('provider.api_calls', 1, {
        provider: 'phantombuster',
        endpoint: endpoint.split('/')[1] || endpoint,
        status: 'success'
      });

      return data;
    } catch (error) {
      // Track network/timeout errors
      if (!error.message.includes('PhantomBuster API error')) {
        metrics.counter('provider.api_calls', 1, {
          provider: 'phantombuster',
          endpoint: endpoint.split('/')[1] || endpoint,
          status: 'error'
        });
        metrics.counter('provider.api_errors', 1, {
          provider: 'phantombuster',
          error_type: 'network'
        });
      }

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

    // Replace variables in message using shared utility
    const personalizedMessage = replaceTemplateVariables(message, variables);

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
   * Verify webhook signature using HMAC-SHA256
   *
   * SECURITY FIX: FAIL CLOSED - Reject ALL webhooks if secret not configured
   *
   * For PhantomBuster webhooks, we implement our own HMAC verification:
   * 1. Set up a webhook URL with query param: ?token=YOUR_SECRET
   * 2. Or use x-phantombuster-signature header with HMAC-SHA256 of body
   */
  verifyWebhookSignature(req, secret) {
    // P0 SECURITY: FAIL CLOSED - Never allow webhooks without secret configured
    if (!secret) {
      logger.error('PHANTOMBUSTER_WEBHOOK_SECRET not configured - REJECTING all webhooks for security');
      return false;
    }

    // Method 1: Check HMAC signature header (preferred)
    const signature = req.headers['x-phantombuster-signature'];
    if (signature) {
      return this._verifyHMACSignature(req.body, signature, secret);
    }

    // Method 2: Check token in header or query param (fallback)
    const token = req.headers['x-phantombuster-token'] || req.query.token;
    if (token) {
      return this._verifyToken(token, secret);
    }

    // No authentication provided - reject
    logger.warn('PhantomBuster webhook missing authentication (signature or token)');
    return false;
  }

  /**
   * Verify HMAC-SHA256 signature
   * @private
   */
  _verifyHMACSignature(body, signature, secret) {
    try {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);

      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(bodyString)
        .digest('hex');

      // Timing-safe comparison
      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSig);

      if (signatureBuffer.length !== expectedBuffer.length) {
        logger.warn('PhantomBuster webhook HMAC signature length mismatch');
        return false;
      }

      const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

      if (!isValid) {
        logger.warn('PhantomBuster webhook HMAC signature mismatch');
      }

      return isValid;
    } catch (error) {
      logger.error('PhantomBuster HMAC verification error', { error: error.message });
      return false;
    }
  }

  /**
   * Verify token using timing-safe comparison
   * @private
   */
  _verifyToken(token, secret) {
    try {
      const tokenBuffer = Buffer.from(token);
      const secretBuffer = Buffer.from(secret);

      if (tokenBuffer.length !== secretBuffer.length) {
        logger.warn('PhantomBuster webhook token length mismatch');
        return false;
      }

      const isValid = crypto.timingSafeEqual(tokenBuffer, secretBuffer);

      if (!isValid) {
        logger.warn('PhantomBuster webhook token mismatch');
      }

      return isValid;
    } catch (error) {
      logger.error('PhantomBuster token verification error', { error: error.message });
      return false;
    }
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
   * Get current rate limit status from database
   *
   * P0 FIX: Now queries actual database instead of returning fake data
   */
  async getRateLimitStatus() {
    try {
      const accountId = this._getAccountIdentifier();
      const today = this._getTodayInLinkedInTimezone();

      // Query database for today's counts
      const { sequelize } = await import('../../models/index.js');

      const [results] = await sequelize.query(`
        SELECT connections_sent, messages_sent, profile_visits
        FROM linkedin_rate_limits
        WHERE account_identifier = :accountId AND date = :today
      `, {
        replacements: { accountId, today },
        type: sequelize.QueryTypes.SELECT
      });

      const row = results || { connections_sent: 0, messages_sent: 0, profile_visits: 0 };

      // Update rate limit usage gauges for Prometheus/Grafana
      const connectionUsage = (row.connections_sent || 0) / this.dailyConnectionLimit;
      const messageUsage = (row.messages_sent || 0) / this.dailyMessageLimit;
      const profileVisitUsage = (row.profile_visits || 0) / this.dailyProfileViewLimit;

      metrics.gauge('provider.rate_limit_usage', connectionUsage, {
        provider: 'linkedin',
        action_type: 'connection'
      });
      metrics.gauge('provider.rate_limit_usage', messageUsage, {
        provider: 'linkedin',
        action_type: 'message'
      });
      metrics.gauge('provider.rate_limit_usage', profileVisitUsage, {
        provider: 'linkedin',
        action_type: 'profile_visit'
      });

      // Update daily usage gauges
      metrics.gauge('linkedin.daily_usage', row.connections_sent || 0, { action_type: 'connection' });
      metrics.gauge('linkedin.daily_usage', row.messages_sent || 0, { action_type: 'message' });
      metrics.gauge('linkedin.daily_usage', row.profile_visits || 0, { action_type: 'profile_visit' });

      return {
        connectionsToday: row.connections_sent || 0,
        messagesToday: row.messages_sent || 0,
        profileVisitsToday: row.profile_visits || 0,
        connectionsRemaining: Math.max(0, this.dailyConnectionLimit - (row.connections_sent || 0)),
        messagesRemaining: Math.max(0, this.dailyMessageLimit - (row.messages_sent || 0)),
        profileVisitsRemaining: Math.max(0, this.dailyProfileViewLimit - (row.profile_visits || 0)),
        resetsAt: this._getNextMidnight(),
        accountIdentifier: accountId.substring(0, 8) + '...' // Show partial hash for debugging
      };
    } catch (error) {
      logger.error('Failed to get rate limit status', { error: error.message });

      // Return safe defaults on error (assume limits reached for safety)
      return {
        connectionsToday: this.dailyConnectionLimit,
        messagesToday: this.dailyMessageLimit,
        profileVisitsToday: this.dailyProfileViewLimit,
        connectionsRemaining: 0,
        messagesRemaining: 0,
        profileVisitsRemaining: 0,
        resetsAt: this._getNextMidnight(),
        error: error.message
      };
    }
  }

  /**
   * Check if action is allowed under rate limits
   * @private
   */
  async _checkRateLimit(actionType) {
    try {
      const accountId = this._getAccountIdentifier();
      const today = this._getTodayInLinkedInTimezone();

      const { sequelize } = await import('../../models/index.js');

      // Get or create today's rate limit row with FOR UPDATE lock
      const [results] = await sequelize.query(`
        INSERT INTO linkedin_rate_limits (account_identifier, date, connections_sent, messages_sent, profile_visits)
        VALUES (:accountId, :today, 0, 0, 0)
        ON CONFLICT (account_identifier, date) DO UPDATE SET updated_at = NOW()
        RETURNING *
      `, {
        replacements: { accountId, today },
        type: sequelize.QueryTypes.SELECT
      });

      const row = results || { connections_sent: 0, messages_sent: 0, profile_visits: 0 };

      // Get current count based on action type
      let used, limit;
      switch (actionType) {
        case 'connection':
          used = row.connections_sent || 0;
          limit = this.dailyConnectionLimit;
          break;
        case 'message':
          used = row.messages_sent || 0;
          limit = this.dailyMessageLimit;
          break;
        case 'profile':
          used = row.profile_visits || 0;
          limit = this.dailyProfileViewLimit;
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      const allowed = used < limit;

      if (!allowed) {
        // Track rate limit hit
        metrics.counter('provider.rate_limit_hits', 1, {
          provider: 'linkedin',
          action_type: actionType
        });

        logger.warn(`Rate limit reached for ${actionType}`, {
          accountId: accountId.substring(0, 8) + '...',
          used,
          limit,
          resetsAt: this._getNextMidnight()
        });
      }

      return {
        allowed,
        used,
        limit,
        remaining: Math.max(0, limit - used)
      };
    } catch (error) {
      logger.error(`Rate limit check failed for ${actionType}`, { error: error.message });

      // Fail SAFE - block action if we can't verify limits
      return {
        allowed: false,
        used: 0,
        limit: 0,
        remaining: 0,
        error: error.message
      };
    }
  }

  /**
   * Increment rate limit counter after successful action
   * @private
   */
  async _incrementRateLimit(actionType) {
    try {
      const accountId = this._getAccountIdentifier();
      const today = this._getTodayInLinkedInTimezone();

      const { sequelize } = await import('../../models/index.js');

      // SECURITY: Whitelist of allowed columns to prevent SQL injection
      const ALLOWED_COLUMNS = {
        'connection': 'connections_sent',
        'message': 'messages_sent',
        'profile': 'profile_visits'
      };

      const column = ALLOWED_COLUMNS[actionType];
      if (!column) {
        throw new Error(`Unknown action type: ${actionType}`);
      }

      // Atomic increment with upsert
      // Note: column is validated above from ALLOWED_COLUMNS whitelist
      await sequelize.query(`
        INSERT INTO linkedin_rate_limits (account_identifier, date, ${column})
        VALUES (:accountId, :today, 1)
        ON CONFLICT (account_identifier, date)
        DO UPDATE SET ${column} = linkedin_rate_limits.${column} + 1, updated_at = NOW()
      `, {
        replacements: { accountId, today }
      });

      logger.debug(`Rate limit incremented for ${actionType}`, {
        accountId: accountId.substring(0, 8) + '...',
        column
      });
    } catch (error) {
      logger.error(`Failed to increment rate limit for ${actionType}`, { error: error.message });
      // Don't throw - action already succeeded, just log the error
    }
  }

  /**
   * Get account identifier (hash of session cookie)
   * @private
   */
  _getAccountIdentifier() {
    const sessionCookie = process.env.LINKEDIN_SESSION_COOKIE || 'default';
    return crypto.createHash('sha256').update(sessionCookie).digest('hex');
  }

  /**
   * Get today's date in LinkedIn HQ timezone (America/Los_Angeles)
   * @private
   */
  _getTodayInLinkedInTimezone() {
    // Use date-fns-tz or similar in production; this is a simple implementation
    const now = new Date();
    // LinkedIn HQ is in Pacific Time (PST/PDT)
    const options = { timeZone: 'America/Los_Angeles' };
    const laDate = new Date(now.toLocaleString('en-US', options));
    return laDate.toISOString().split('T')[0]; // YYYY-MM-DD
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
