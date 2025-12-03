/**
 * CORS Security Tests - Stage 1 Security Remediation
 *
 * Tests for T2.7: CORS Bypass Vulnerability Fix
 * Validates that invalid origins receive 403 Forbidden (not 500 Internal Server Error)
 */

import request from 'supertest';
import { jest } from '@jest/globals';

describe('CORS Security - T2.7 Fix Validation', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = 'https://trusted.com,https://app.example.com';
    process.env.API_KEYS = 'test_cors_security_key_123';

    // Import API server
    const module = await import('../../src/server.js');
    const { SalesAutomationAPIServer } = module;
    server = new SalesAutomationAPIServer({
      enableHttps: false,
      yoloMode: false
    });
    app = server.app;
  });

  afterAll(async () => {
    if (server && server.stop) {
      await server.stop();
    }
  });

  describe('CRITICAL: CORS Policy Violation Returns 403 (not 500)', () => {
    test('should return 403 for unauthorized origin (not 500)', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://evil-hacker.com')
        .set('X-API-Key', 'test_cors_security_key_123');

      // CRITICAL: Must be 403, not 500
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toContain('CORS policy violation');
    });

    test('should return 403 for malicious origin attempt', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .set('Origin', 'https://attacker.com')
        .set('X-API-Key', 'test_cors_security_key_123')
        .send({ test: 'data' });

      // CRITICAL: Must be 403, not 500
      expect(response.status).toBe(403);
      expect(response.body.statusCode).toBe(403);
    });

    test('should return 403 for non-whitelisted subdomain', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .set('Origin', 'https://malicious.trusted.com.evil.com')
        .set('X-API-Key', 'test_cors_security_key_123');

      // CRITICAL: Must be 403, not 500
      expect(response.status).toBe(403);
    });
  });

  describe('Valid Origins - Should Allow', () => {
    test('should allow whitelisted origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://trusted.com');

      // Should succeed (200) or require auth (401), not CORS error (403)
      expect(response.status).not.toBe(403);
      expect(response.headers['access-control-allow-origin']).toBe('https://trusted.com');
    });

    test('should allow requests with no origin', async () => {
      const response = await request(app).get('/health');

      // No origin = server-to-server, mobile app, or curl - should be allowed
      expect(response.status).toBe(200);
    });
  });

  describe('CORS Preflight Requests', () => {
    test('should handle OPTIONS request from unauthorized origin', async () => {
      const response = await request(app)
        .options('/api/campaigns')
        .set('Origin', 'https://evil.com')
        .set('Access-Control-Request-Method', 'POST');

      // Should return 403, not 204 (successful preflight)
      expect(response.status).toBe(403);
    });

    test('should handle OPTIONS request from authorized origin', async () => {
      const response = await request(app)
        .options('/api/campaigns')
        .set('Origin', 'https://trusted.com')
        .set('Access-Control-Request-Method', 'POST');

      // Should succeed (204 or 200)
      expect([200, 204]).toContain(response.status);
      expect(response.headers['access-control-allow-origin']).toBe('https://trusted.com');
    });
  });

  describe('CORS Error Logging', () => {
    test('should log CORS violations without crashing', async () => {
      // Capture console output
      const originalWarn = console.warn;
      const warnLogs = [];
      console.warn = (...args) => {
        warnLogs.push(args.join(' '));
      };

      const response = await request(app)
        .get('/api/campaigns')
        .set('Origin', 'https://suspicious.com')
        .set('X-API-Key', 'test_cors_security_key_123');

      // Restore console
      console.warn = originalWarn;

      // Should have logged the violation
      const corsLog = warnLogs.find(log => log.includes('CORS'));
      expect(corsLog).toBeDefined();

      // Should still return proper 403
      expect(response.status).toBe(403);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null origin header', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'null'); // Some browsers send 'null' as string

      // Should not crash, should either allow or deny properly
      expect(response.status).not.toBe(500);
    });

    test('should handle malformed origin header', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'not-a-valid-url!!!');

      // Should not crash with 500
      expect(response.status).not.toBe(500);
      // Should likely return 403
      expect(response.status).toBe(403);
    });

    test('should handle extremely long origin', async () => {
      const longOrigin = 'https://' + 'a'.repeat(10000) + '.com';
      const response = await request(app)
        .get('/health')
        .set('Origin', longOrigin);

      // Should not crash
      expect(response.status).not.toBe(500);
    });
  });
});
