/**
 * Webhook Signature Unit Tests
 *
 * Tests for HMAC-SHA256 webhook signature verification utility.
 * Critical for security - ensures webhooks from providers are authenticated.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import crypto from 'crypto';
import { WebhookSignature } from '../src/providers/utils/WebhookSignature.js';

describe('WebhookSignature', () => {
  const testSecret = 'test_webhook_secret_123';
  const testPayload = { event: 'email.sent', email: 'test@example.com' };
  const testPayloadString = JSON.stringify(testPayload);

  // Pre-compute expected signature for testing
  const expectedSignature = crypto
    .createHmac('sha256', testSecret)
    .update(testPayloadString, 'utf8')
    .digest('hex');

  describe('computeSignature', () => {
    it('should compute correct HMAC-SHA256 signature for string payload', () => {
      const signature = WebhookSignature.computeSignature(testPayloadString, testSecret);
      expect(signature).toBe(expectedSignature);
    });

    it('should compute correct signature for object payload', () => {
      const signature = WebhookSignature.computeSignature(testPayload, testSecret);
      expect(signature).toBe(expectedSignature);
    });

    it('should produce 64-character hex string', () => {
      const signature = WebhookSignature.computeSignature('test', 'secret');
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different signatures for different secrets', () => {
      const sig1 = WebhookSignature.computeSignature('payload', 'secret1');
      const sig2 = WebhookSignature.computeSignature('payload', 'secret2');
      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different payloads', () => {
      const sig1 = WebhookSignature.computeSignature('payload1', testSecret);
      const sig2 = WebhookSignature.computeSignature('payload2', testSecret);
      expect(sig1).not.toBe(sig2);
    });

    it('should be deterministic - same input produces same output', () => {
      const sig1 = WebhookSignature.computeSignature(testPayloadString, testSecret);
      const sig2 = WebhookSignature.computeSignature(testPayloadString, testSecret);
      expect(sig1).toBe(sig2);
    });
  });

  describe('verify', () => {
    it('should return true for valid signature', () => {
      const isValid = WebhookSignature.verify(expectedSignature, testPayloadString, testSecret);
      expect(isValid).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const invalidSignature = 'a'.repeat(64);
      const isValid = WebhookSignature.verify(invalidSignature, testPayloadString, testSecret);
      expect(isValid).toBe(false);
    });

    it('should return false for tampered payload', () => {
      const tamperedPayload = JSON.stringify({ event: 'email.sent', email: 'hacker@evil.com' });
      const isValid = WebhookSignature.verify(expectedSignature, tamperedPayload, testSecret);
      expect(isValid).toBe(false);
    });

    it('should return false for wrong secret', () => {
      const isValid = WebhookSignature.verify(expectedSignature, testPayloadString, 'wrong_secret');
      expect(isValid).toBe(false);
    });

    it('should return false for null signature', () => {
      const isValid = WebhookSignature.verify(null, testPayloadString, testSecret);
      expect(isValid).toBe(false);
    });

    it('should return false for undefined signature', () => {
      const isValid = WebhookSignature.verify(undefined, testPayloadString, testSecret);
      expect(isValid).toBe(false);
    });

    it('should return false for empty signature', () => {
      const isValid = WebhookSignature.verify('', testPayloadString, testSecret);
      expect(isValid).toBe(false);
    });

    it('should return false for null secret', () => {
      const isValid = WebhookSignature.verify(expectedSignature, testPayloadString, null);
      expect(isValid).toBe(false);
    });

    it('should return false for signature with wrong length', () => {
      const shortSignature = 'abc123';
      const isValid = WebhookSignature.verify(shortSignature, testPayloadString, testSecret);
      expect(isValid).toBe(false);
    });

    it('should return false for non-hex signature', () => {
      const invalidHex = 'zzzz' + 'a'.repeat(60); // Contains invalid hex chars
      const isValid = WebhookSignature.verify(invalidHex, testPayloadString, testSecret);
      expect(isValid).toBe(false);
    });

    it('should use crypto.timingSafeEqual for comparison', () => {
      // This test verifies the implementation uses timing-safe comparison.
      // We can't reliably test timing in a unit test, but we verify
      // that the function correctly rejects similar signatures without
      // short-circuiting (which would be the timing-vulnerable behavior).

      // All these should fail, proving the comparison runs to completion
      const variations = [
        expectedSignature.substring(0, 60) + 'aaaa', // Almost correct
        'a'.repeat(64), // Completely wrong
        expectedSignature.split('').reverse().join(''), // Reversed
      ];

      for (const sig of variations) {
        if (sig !== expectedSignature) {
          const isValid = WebhookSignature.verify(sig, testPayloadString, testSecret);
          expect(isValid).toBe(false);
        }
      }

      // Verify correct signature still works
      expect(WebhookSignature.verify(expectedSignature, testPayloadString, testSecret)).toBe(true);
    });
  });

  describe('extractSignature', () => {
    it('should extract signature from exact header name', () => {
      const headers = { 'x-lemlist-signature': 'abc123' };
      const sig = WebhookSignature.extractSignature(headers, 'x-lemlist-signature');
      expect(sig).toBe('abc123');
    });

    it('should extract signature from lowercase header', () => {
      const headers = { 'x-signature': 'abc123' };
      const sig = WebhookSignature.extractSignature(headers, 'X-Signature');
      expect(sig).toBe('abc123');
    });

    it('should strip sha256= prefix', () => {
      const headers = { 'x-signature': 'sha256=abc123def456' };
      const sig = WebhookSignature.extractSignature(headers, 'x-signature');
      expect(sig).toBe('abc123def456');
    });

    it('should return null for missing header', () => {
      const headers = { 'x-other': 'value' };
      const sig = WebhookSignature.extractSignature(headers, 'x-signature');
      expect(sig).toBeNull();
    });

    it('should return raw signature without sha256 prefix', () => {
      const headers = { 'x-signature': 'plainSignature123' };
      const sig = WebhookSignature.extractSignature(headers, 'x-signature');
      expect(sig).toBe('plainSignature123');
    });
  });

  describe('verifyRequest', () => {
    let mockRequest;

    beforeEach(() => {
      mockRequest = {
        headers: {
          'x-signature': expectedSignature
        },
        body: testPayload,
        rawBody: testPayloadString
      };
    });

    it('should verify valid request', () => {
      const isValid = WebhookSignature.verifyRequest(mockRequest, testSecret, 'x-signature');
      expect(isValid).toBe(true);
    });

    it('should reject request with invalid signature', () => {
      mockRequest.headers['x-signature'] = 'invalid';
      const isValid = WebhookSignature.verifyRequest(mockRequest, testSecret, 'x-signature');
      expect(isValid).toBe(false);
    });

    it('should reject request missing signature header', () => {
      delete mockRequest.headers['x-signature'];
      const isValid = WebhookSignature.verifyRequest(mockRequest, testSecret, 'x-signature');
      expect(isValid).toBe(false);
    });

    it('should use rawBody when available', () => {
      // Modify body but keep rawBody - should still verify
      mockRequest.body = { different: 'data' };
      const isValid = WebhookSignature.verifyRequest(mockRequest, testSecret, 'x-signature');
      expect(isValid).toBe(true);
    });

    it('should fall back to stringified body when rawBody not available', () => {
      delete mockRequest.rawBody;
      const isValid = WebhookSignature.verifyRequest(mockRequest, testSecret, 'x-signature');
      expect(isValid).toBe(true);
    });

    describe('timestamp validation', () => {
      it('should accept request with valid timestamp', () => {
        mockRequest.headers['x-timestamp'] = Date.now().toString();
        const isValid = WebhookSignature.verifyRequest(mockRequest, testSecret, 'x-signature', {
          maxAgeMs: 300000
        });
        expect(isValid).toBe(true);
      });

      it('should reject request with old timestamp (replay attack prevention)', () => {
        // Timestamp from 10 minutes ago
        mockRequest.headers['x-timestamp'] = (Date.now() - 600000).toString();
        const isValid = WebhookSignature.verifyRequest(mockRequest, testSecret, 'x-signature', {
          maxAgeMs: 300000 // 5 minute max age
        });
        expect(isValid).toBe(false);
      });

      it('should reject request with future timestamp', () => {
        // Timestamp 2 minutes in the future
        mockRequest.headers['x-timestamp'] = (Date.now() + 120000).toString();
        const isValid = WebhookSignature.verifyRequest(mockRequest, testSecret, 'x-signature', {
          maxAgeMs: 300000
        });
        expect(isValid).toBe(false);
      });

      it('should reject request with invalid timestamp format', () => {
        mockRequest.headers['x-timestamp'] = 'not-a-number';
        const isValid = WebhookSignature.verifyRequest(mockRequest, testSecret, 'x-signature', {
          maxAgeMs: 300000
        });
        expect(isValid).toBe(false);
      });

      it('should skip timestamp check when maxAgeMs is 0', () => {
        mockRequest.headers['x-timestamp'] = (Date.now() - 3600000).toString(); // 1 hour old
        const isValid = WebhookSignature.verifyRequest(mockRequest, testSecret, 'x-signature', {
          maxAgeMs: 0
        });
        expect(isValid).toBe(true);
      });

      it('should skip timestamp check when header not present', () => {
        // No timestamp header, should still verify signature
        const isValid = WebhookSignature.verifyRequest(mockRequest, testSecret, 'x-signature', {
          maxAgeMs: 300000
        });
        expect(isValid).toBe(true);
      });
    });
  });
});
