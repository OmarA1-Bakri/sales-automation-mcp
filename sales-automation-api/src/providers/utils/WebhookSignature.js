/**
 * Webhook Signature Utilities
 * Common utilities for HMAC-SHA256 webhook verification
 */

import crypto from 'crypto';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('WebhookSignature');

export class WebhookSignature {
  /**
   * Compute HMAC-SHA256 signature
   *
   * @param {string|Buffer} payload - Webhook payload
   * @param {string} secret - Webhook secret
   * @returns {string} Hex-encoded signature
   */
  static computeSignature(payload, secret) {
    const payloadString = typeof payload === 'string'
      ? payload
      : JSON.stringify(payload);

    return crypto
      .createHmac('sha256', secret)
      .update(payloadString, 'utf8')
      .digest('hex');
  }

  /**
   * Verify webhook signature with timing-safe comparison
   *
   * @param {string} receivedSignature - Signature from webhook header
   * @param {string|Buffer} payload - Webhook payload
   * @param {string} secret - Webhook secret
   * @returns {boolean} True if signature valid
   */
  static verify(receivedSignature, payload, secret) {
    if (!receivedSignature || !secret) {
      logger.warn('Missing signature or secret for verification');
      return false;
    }

    const expectedSignature = this.computeSignature(payload, secret);

    // Timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      // Buffer lengths don't match or invalid hex
      logger.warn('Signature verification failed', {
        error: error.message,
        receivedLength: receivedSignature.length,
        expectedLength: expectedSignature.length
      });
      return false;
    }
  }

  /**
   * Extract signature from header (common patterns)
   *
   * @param {Object} headers - HTTP headers object
   * @param {string} headerName - Header name (e.g., 'x-lemlist-signature')
   * @returns {string|null} Extracted signature or null
   */
  static extractSignature(headers, headerName) {
    // Try exact header name
    let signature = headers[headerName];

    if (!signature) {
      // Try lowercase
      signature = headers[headerName.toLowerCase()];
    }

    if (!signature) {
      logger.warn('Signature header not found', { headerName, headers: Object.keys(headers) });
      return null;
    }

    // Some providers prefix with "sha256=" or similar
    const prefixMatch = signature.match(/^sha256=(.+)$/);
    if (prefixMatch) {
      return prefixMatch[1];
    }

    return signature;
  }

  /**
   * Verify webhook from Express request
   *
   * @param {Object} req - Express request object
   * @param {string} secret - Webhook secret
   * @param {string} signatureHeader - Header containing signature
   * @param {Object} options - Verification options
   * @param {number} options.maxAgeMs - Maximum webhook age in milliseconds (default: 300000 = 5 minutes)
   * @param {string} options.timestampHeader - Header containing timestamp (default: 'x-timestamp')
   * @returns {boolean} True if valid
   */
  static verifyRequest(req, secret, signatureHeader = 'x-signature', options = {}) {
    const {
      maxAgeMs = 300000, // 5 minutes default
      timestampHeader = 'x-timestamp'
    } = options;

    // Check timestamp to prevent replay attacks
    const timestamp = req.headers[timestampHeader] || req.headers[timestampHeader.toLowerCase()];
    if (timestamp && maxAgeMs) {
      const webhookTime = parseInt(timestamp, 10);
      if (isNaN(webhookTime)) {
        logger.warn('Invalid timestamp format in webhook', { timestamp });
        return false;
      }

      const age = Date.now() - webhookTime;
      if (age > maxAgeMs) {
        logger.warn('Webhook too old, possible replay attack', {
          age,
          maxAgeMs,
          webhookTime,
          currentTime: Date.now()
        });
        return false;
      }

      if (age < -60000) { // More than 1 minute in the future
        logger.warn('Webhook timestamp is in the future', {
          age,
          webhookTime,
          currentTime: Date.now()
        });
        return false;
      }
    }

    const signature = this.extractSignature(req.headers, signatureHeader);

    if (!signature) {
      return false;
    }

    // Use raw body for verification (must be buffered by middleware)
    const payload = req.rawBody || JSON.stringify(req.body);

    return this.verify(signature, payload, secret);
  }
}

export default WebhookSignature;
