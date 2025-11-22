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

      if (!response.ok) {
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

      return data;
    } catch (error) {
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

    // Replace variables in subject and body
    let personalizedSubject = subject;
    let personalizedBody = body;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      personalizedSubject = personalizedSubject.replace(regex, value || '');
      personalizedBody = personalizedBody.replace(regex, value || '');
    });

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

      // Replace variables
      let personalizedSubject = subject;
      let personalizedBody = body;

      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        personalizedSubject = personalizedSubject.replace(regex, value || '');
        personalizedBody = personalizedBody.replace(regex, value || '');
      });

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
    // Postmark doesn't support webhook signatures
    // Security should be handled via:
    // 1. Basic Authentication on webhook endpoint
    // 2. HTTPS only
    // 3. IP whitelisting (Postmark IPs: 3.134.147.250, 50.31.156.6, 50.31.156.77, 18.217.206.57)

    logger.debug('Postmark webhook received (no signature verification available)');

    // Check if Basic Auth header is present
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Basic ')) {
      const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
      const [username, password] = credentials.split(':');

      // Compare with configured secret (username:password format)
      return secret && credentials === secret;
    }

    // If no auth required, allow (not recommended for production)
    return !secret || secret === '';
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
}

export default PostmarkEmailProvider;
