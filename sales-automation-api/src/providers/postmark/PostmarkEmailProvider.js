/**
 * Postmark Email Provider
 * Implementation of EmailProvider interface for Postmark transactional email
 *
 * Docs: https://postmarkapp.com/developer
 * API Version: Latest
 */

import { EmailProvider } from '../interfaces/EmailProvider.js';
import { createLogger } from '../../utils/logger.js';
import { providerConfig } from '../../config/provider-config.js';
import { metrics } from '../../utils/metrics.js';
import { replaceMultiple } from '../utils/variable-replacer.js';
import crypto from 'crypto';

const logger = createLogger('PostmarkEmailProvider');

export class PostmarkEmailProvider extends EmailProvider {
  constructor() {
    super();

    const config = providerConfig.getProviderConfig('postmark');
    this.serverToken = config?.serverToken || config?.apiKey;
    this.webhookSecret = config?.webhookSecret;
    this.senderEmail = config?.senderEmail;
    this.apiUrl = config?.apiUrl || 'https://api.postmarkapp.com';

    if (!this.serverToken) {
      logger.warn('Postmark server token not configured');
    }

    if (!this.senderEmail) {
      logger.warn('Postmark sender email not configured - will need to be provided per-email');
    }
  }

  get name() {
    return 'postmark';
  }

  /**
   * Make authenticated API request to Postmark
   */
  async _makeRequest(endpoint, method = 'GET', body = null) {
    const url = `${this.apiUrl}${endpoint}`;
    const startTime = Date.now();

    const options = {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': this.serverToken
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    logger.debug('Postmark API request', { method, endpoint });

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      const latency = Date.now() - startTime;

      // Track API latency
      metrics.histogram('provider.api_latency_ms', latency, {
        provider: 'postmark',
        endpoint: endpoint.split('/')[1] || endpoint
      });

      if (!response.ok) {
        // Track API error
        metrics.counter('provider.api_calls', 1, {
          provider: 'postmark',
          endpoint: endpoint.split('/')[1] || endpoint,
          status: 'error'
        });
        metrics.counter('provider.api_errors', 1, {
          provider: 'postmark',
          error_type: this._mapPostmarkErrorType(data.ErrorCode)
        });

        logger.error('Postmark API error', {
          status: response.status,
          endpoint,
          error: data
        });

        throw new Error(
          data.Message ||
          `Postmark API error: ${response.status} - ${data.ErrorCode || 'Unknown'}`
        );
      }

      // Track successful API call
      metrics.counter('provider.api_calls', 1, {
        provider: 'postmark',
        endpoint: endpoint.split('/')[1] || endpoint,
        status: 'success'
      });

      return data;
    } catch (error) {
      // Track network/timeout errors
      if (!error.message.includes('Postmark API error')) {
        metrics.counter('provider.api_calls', 1, {
          provider: 'postmark',
          endpoint: endpoint.split('/')[1] || endpoint,
          status: 'error'
        });
        metrics.counter('provider.api_errors', 1, {
          provider: 'postmark',
          error_type: 'network'
        });
      }

      logger.error('Postmark API request failed', {
        endpoint,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send a single email
   */
  async send(params) {
    const {
      to,
      subject,
      body,
      from,
      campaignId,
      enrollmentId,
      variables = {},
      metadata = {}
    } = params;

    // Use provided from or default sender
    const fromEmail = from || this.senderEmail;

    if (!fromEmail) {
      throw new Error('Sender email not configured. Set POSTMARK_SENDER_EMAIL or provide "from" parameter');
    }

    // Replace variables in subject and body using shared utility
    const { subject: personalizedSubject, body: personalizedBody } = replaceMultiple(
      { subject, body },
      variables
    );

    const requestBody = {
      From: fromEmail,
      To: to,
      Subject: personalizedSubject,
      HtmlBody: personalizedBody,
      MessageStream: 'outbound',
      TrackOpens: true,
      TrackLinks: 'HtmlAndText',
      Metadata: {
        campaignId: campaignId || '',
        enrollmentId: enrollmentId || '',
        ...metadata
      }
    };

    logger.info('Sending Postmark email', {
      to,
      subject: personalizedSubject,
      campaignId,
      enrollmentId
    });

    try {
      const response = await this._makeRequest('/email', 'POST', requestBody);

      return {
        messageId: response.MessageID,
        status: 'sent',
        to,
        submittedAt: new Date(response.SubmittedAt),
        metadata: {
          ...metadata,
          postmarkMessageId: response.MessageID,
          campaignId,
          enrollmentId
        }
      };
    } catch (error) {
      logger.error('Failed to send Postmark email', {
        error: error.message,
        to,
        campaignId
      });
      throw error;
    }
  }

  /**
   * Send batch of emails
   * Postmark supports up to 500 emails per batch
   */
  async sendBatch(emails) {
    if (emails.length > 500) {
      throw new Error('Postmark batch limit is 500 emails. Split into smaller batches.');
    }

    const requestBodies = emails.map(params => {
      const {
        to,
        subject,
        body,
        from,
        campaignId,
        enrollmentId,
        variables = {},
        metadata = {}
      } = params;

      const fromEmail = from || this.senderEmail;

      if (!fromEmail) {
        throw new Error('Sender email required for each email in batch or set POSTMARK_SENDER_EMAIL');
      }

      // Replace variables using shared utility
      const { subject: personalizedSubject, body: personalizedBody } = replaceMultiple(
        { subject, body },
        variables
      );

      return {
        From: fromEmail,
        To: to,
        Subject: personalizedSubject,
        HtmlBody: personalizedBody,
        MessageStream: 'outbound',
        TrackOpens: true,
        TrackLinks: 'HtmlAndText',
        Metadata: {
          campaignId: campaignId || '',
          enrollmentId: enrollmentId || '',
          ...metadata
        }
      };
    });

    logger.info('Sending Postmark batch', { count: emails.length });

    try {
      const responses = await this._makeRequest('/email/batch', 'POST', requestBodies);

      // Postmark returns 200 even if individual messages fail
      // Check each response for errors
      const successes = [];
      const failures = [];

      responses.forEach((response, index) => {
        if (response.ErrorCode === 0) {
          successes.push({
            messageId: response.MessageID,
            to: emails[index].to,
            submittedAt: new Date(response.SubmittedAt)
          });
        } else {
          failures.push({
            to: emails[index].to,
            error: response.Message,
            errorCode: response.ErrorCode
          });
        }
      });

      logger.info('Postmark batch sent', {
        total: emails.length,
        successes: successes.length,
        failures: failures.length
      });

      return {
        sent: successes.length,
        failed: failures.length,
        successes,
        failures
      };
    } catch (error) {
      logger.error('Failed to send Postmark batch', {
        error: error.message,
        count: emails.length
      });
      throw error;
    }
  }

  /**
   * Get email delivery status
   */
  async getStatus(messageId) {
    try {
      // Postmark uses "outbound messages" endpoint to get message details
      const response = await this._makeRequest(
        `/messages/outbound/${messageId}/details`,
        'GET'
      );

      return {
        messageId,
        status: this._normalizeStatus(response.Status),
        to: response.Recipients?.[0] || '',
        subject: response.Subject,
        sentAt: new Date(response.ReceivedAt),
        events: response.MessageEvents?.map(event => ({
          type: event.Type.toLowerCase(),
          timestamp: new Date(event.ReceivedAt),
          details: event.Details
        })) || []
      };
    } catch (error) {
      logger.error('Failed to get Postmark status', {
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * Postmark does NOT provide signature verification
   * Recommend using Basic Auth + HTTPS + IP whitelisting instead
   */
  verifyWebhookSignature(req, secret) {
    // SECURITY FIX: FAIL CLOSED - Reject ALL webhooks if secret not configured
    // Postmark doesn't support HMAC signatures, so we use Basic Auth
    // Additional security via IP whitelisting middleware (see webhook-ip-whitelist.js)

    // P0 SECURITY: FAIL CLOSED - Never allow webhooks without secret configured
    if (!secret) {
      logger.error('POSTMARK_WEBHOOK_SECRET not configured - REJECTING all webhooks for security');
      return false;
    }

    // Check if Basic Auth header is present
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      logger.warn('Postmark webhook missing Authorization header');
      return false;
    }

    if (!authHeader.startsWith('Basic ')) {
      logger.warn('Postmark webhook has invalid Authorization header format');
      return false;
    }

    try {
      const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();

      // Timing-safe comparison to prevent timing attacks
      const secretBuffer = Buffer.from(secret);
      const credentialsBuffer = Buffer.from(credentials);

      // Lengths must match for timingSafeEqual
      if (secretBuffer.length !== credentialsBuffer.length) {
        logger.warn('Postmark webhook credentials length mismatch');
        return false;
      }

      const isValid = crypto.timingSafeEqual(secretBuffer, credentialsBuffer);

      if (!isValid) {
        logger.warn('Postmark webhook credentials mismatch');
      }

      return isValid;
    } catch (error) {
      logger.error('Postmark webhook signature verification error', { error: error.message });
      return false;
    }
  }

  /**
   * Parse webhook payload into normalized event format
   */
  parseWebhookEvent(payload) {
    const { RecordType, MessageID, Recipient, DeliveredAt, BouncedAt, Details, Tag, Metadata } = payload;

    // Map Postmark record types to our event types
    const eventTypeMap = {
      'Delivery': 'delivered',
      'Bounce': 'bounced',
      'SpamComplaint': 'spam',
      'Open': 'opened',
      'Click': 'clicked',
      'SubscriptionChange': 'unsubscribed'
    };

    const eventType = eventTypeMap[RecordType] || RecordType.toLowerCase();

    return {
      type: eventType,
      providerEventId: `${MessageID}-${RecordType}-${Date.now()}`,
      providerMessageId: MessageID,
      recipient: Recipient,
      timestamp: new Date(DeliveredAt || BouncedAt || Date.now()),
      data: {
        recordType: RecordType,
        tag: Tag,
        metadata: Metadata,
        details: Details,
        bounceType: payload.Type, // For bounce events
        description: payload.Description,
        email: payload.Email,
        clickedLink: payload.OriginalLink, // For click events
        userAgent: payload.UserAgent
      }
    };
  }

  /**
   * Get provider capabilities
   */
  getCapabilities() {
    return {
      supportsBatch: true,
      maxBatchSize: 500,
      supportsTemplates: true,
      supportsTracking: true,
      supportsAttachments: true,
      maxAttachmentSize: 10 * 1024 * 1024, // 10MB per message
      supportedEvents: [
        'delivery',
        'bounce',
        'spam',
        'open',
        'click',
        'subscription_change'
      ]
    };
  }

  /**
   * Validate configuration
   */
  async validateConfig() {
    if (!this.serverToken) {
      throw new Error('POSTMARK_SERVER_TOKEN not configured');
    }

    try {
      // Test API key by fetching server info
      await this._makeRequest('/server', 'GET');
      logger.info('Postmark configuration validated successfully');
      return true;
    } catch (error) {
      logger.error('Postmark configuration validation failed', { error: error.message });
      throw new Error(`Invalid Postmark server token: ${error.message}`);
    }
  }

  /**
   * Helper: Normalize Postmark status to our standard statuses
   */
  _normalizeStatus(postmarkStatus) {
    const statusMap = {
      'Sent': 'sent',
      'Processed': 'delivered',
      'Delivered': 'delivered',
      'Bounced': 'bounced',
      'Opened': 'opened',
      'Clicked': 'clicked'
    };

    return statusMap[postmarkStatus] || postmarkStatus.toLowerCase();
  }

  /**
   * Send email with template
   * Postmark-specific method for template-based emails
   */
  async sendWithTemplate(params) {
    const {
      to,
      templateId,
      templateModel = {},
      from,
      campaignId,
      enrollmentId,
      metadata = {}
    } = params;

    const fromEmail = from || this.senderEmail;

    if (!fromEmail) {
      throw new Error('Sender email required');
    }

    const requestBody = {
      From: fromEmail,
      To: to,
      TemplateId: templateId,
      TemplateModel: templateModel,
      MessageStream: 'outbound',
      TrackOpens: true,
      TrackLinks: 'HtmlAndText',
      Metadata: {
        campaignId: campaignId || '',
        enrollmentId: enrollmentId || '',
        ...metadata
      }
    };

    logger.info('Sending Postmark template email', {
      to,
      templateId,
      campaignId
    });

    try {
      const response = await this._makeRequest('/email/withTemplate', 'POST', requestBody);

      return {
        messageId: response.MessageID,
        status: 'sent',
        to,
        submittedAt: new Date(response.SubmittedAt)
      };
    } catch (error) {
      logger.error('Failed to send Postmark template email', {
        error: error.message,
        templateId
      });
      throw error;
    }
  }

  /**
   * Map Postmark error codes to standardized error types for metrics
   * @private
   */
  _mapPostmarkErrorType(errorCode) {
    // Postmark error codes: https://postmarkapp.com/developer/api/overview#error-codes
    const errorMap = {
      10: 'auth',           // Bad or missing API token
      300: 'validation',    // Invalid email request
      400: 'validation',    // Sender signature not found
      401: 'validation',    // Sender signature not confirmed
      402: 'validation',    // Invalid JSON
      403: 'validation',    // Incompatible JSON
      405: 'validation',    // Not allowed to send
      406: 'validation',    // Inactive recipient
      409: 'validation',    // Attachment size limit exceeded
      429: 'rate_limit',    // Rate limit exceeded
      500: 'server_error',  // Internal server error
      503: 'server_error'   // Service unavailable
    };

    return errorMap[errorCode] || 'other';
  }

  /**
   * Health check for the Postmark provider
   * @returns {Promise<{status: string, message: string}>}
   */
  async healthCheck() {
    if (!this.serverToken) {
      return { status: 'disabled', message: 'Postmark not configured' };
    }

    try {
      // Use Postmark's server info endpoint as health check
      const response = await this._makeRequest('/server', 'GET');

      return {
        status: 'healthy',
        message: 'Postmark connection successful',
        serverName: response.Name || 'Unknown'
      };
    } catch (error) {
      logger.error('Postmark health check failed:', error);
      return {
        status: 'unhealthy',
        message: error.message || 'Health check failed'
      };
    }
  }
}

export default PostmarkEmailProvider;
