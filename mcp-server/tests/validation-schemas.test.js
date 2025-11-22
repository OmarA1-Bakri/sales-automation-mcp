/**
 * Validation Schema Tests
 * Tests for complete-schemas.js Zod validation
 *
 * Stage 2 Phase 1: Security Architecture
 * Verifies input validation prevents injection attacks
 */

import { describe, it, expect } from '@jest/globals';
import {
  // API Key Schemas
  CreateAPIKeySchema,
  ListAPIKeysSchema,
  RotateAPIKeySchema,

  // Campaign Schemas
  CreateCampaignTemplateSchema,
  UpdateCampaignTemplateSchema,
  ListCampaignTemplatesSchema,

  // Email Sequence Schemas
  CreateEmailSequenceSchema,
  UpdateEmailSequenceSchema,

  // LinkedIn Sequence Schemas
  CreateLinkedInSequenceSchema,

  // Instance Schemas
  CreateCampaignInstanceSchema,
  UpdateCampaignInstanceStatusSchema,

  // Enrollment Schemas
  CreateEnrollmentSchema,
  BulkEnrollSchema,
  UpdateEnrollmentSchema,

  // Event Schemas
  CreateCampaignEventSchema,

  // Chat Schemas
  ChatMessageSchema,
  ChatHistorySchema,

  // Import Schemas
  ImportFromLemlistSchema,
  ImportFromHubSpotSchema,
  SyncToHubSpotSchema,

  // Discovery & Enrichment
  DiscoverByICPSchema,
  EnrichContactsSchema,
  EnrollInCampaignSchema,

  // Base Schemas
  EmailSchema,
  DomainSchema,
  UUIDSchema,
  URLSchema,
  SafeJSONBSchema
} from '../src/validators/complete-schemas.js';

// =============================================================================
// BASE SCHEMA TESTS
// =============================================================================

describe('Base Schemas', () => {
  describe('EmailSchema', () => {
    it('should accept valid email addresses', async () => {
      const validEmails = [
        'user@example.com',
        'first.last@company.co.uk',
        'user+tag@subdomain.example.com',
        'test_user123@test-domain.com'
      ];

      for (const email of validEmails) {
        const result = await EmailSchema.parseAsync(email);
        expect(result).toBe(email.toLowerCase().trim());
      }
    });

    it('should reject invalid email addresses', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        'a'.repeat(255) + '@example.com' // Too long
      ];

      for (const email of invalidEmails) {
        await expect(EmailSchema.parseAsync(email)).rejects.toThrow();
      }
    });

    it('should transform emails to lowercase and trim', async () => {
      const result = await EmailSchema.parseAsync('  USER@EXAMPLE.COM  ');
      expect(result).toBe('user@example.com');
    });
  });

  describe('DomainSchema', () => {
    it('should accept valid domain names', async () => {
      const validDomains = [
        'example.com',
        'subdomain.example.com',
        'test-domain.co.uk',
        'a.b.c.d.example.com'
      ];

      for (const domain of validDomains) {
        const result = await DomainSchema.parseAsync(domain);
        expect(result).toBeTruthy();
      }
    });

    it('should clean domain names (remove protocol, www, trailing slash)', async () => {
      const tests = [
        { input: 'https://www.example.com/', expected: 'example.com' },
        { input: 'http://example.com', expected: 'example.com' },
        { input: 'www.example.com', expected: 'example.com' },
        { input: 'example.com/', expected: 'example.com' }
      ];

      for (const { input, expected } of tests) {
        const result = await DomainSchema.parseAsync(input);
        expect(result).toBe(expected);
      }
    });

    it('should reject invalid domain names', async () => {
      const invalidDomains = [
        'not a domain',
        'example',
        '-example.com',
        'example.com-',
        'a'.repeat(254) + '.com' // Too long
      ];

      for (const domain of invalidDomains) {
        await expect(DomainSchema.parseAsync(domain)).rejects.toThrow();
      }
    });
  });

  describe('UUIDSchema', () => {
    it('should accept valid UUIDs', async () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '00000000-0000-0000-0000-000000000000'
      ];

      for (const uuid of validUUIDs) {
        const result = await UUIDSchema.parseAsync(uuid);
        expect(result).toBe(uuid);
      }
    });

    it('should reject invalid UUIDs', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '550e8400-e29b-41d4-a716',
        '550e8400-e29b-41d4-a716-44665544000G' // Invalid character
      ];

      for (const uuid of invalidUUIDs) {
        await expect(UUIDSchema.parseAsync(uuid)).rejects.toThrow();
      }
    });
  });

  describe('SafeJSONBSchema', () => {
    it('should accept valid JSON objects', async () => {
      const validObjects = [
        { key: 'value' },
        { nested: { object: { deep: 'value' } } },
        { array: [1, 2, 3] },
        { mixed: { string: 'text', number: 123, bool: true } }
      ];

      for (const obj of validObjects) {
        const result = await SafeJSONBSchema.parseAsync(obj);
        expect(result).toEqual(obj);
      }
    });

    it('should reject objects with dangerous keys', async () => {
      // Use JSON.parse to simulate real API input where __proto__ becomes a real property
      const dangerousObjects = [
        JSON.parse('{"__proto__": {"admin": true}}'),
        JSON.parse('{"constructor": {"name": "evil"}}'),
        JSON.parse('{"prototype": {"inject": "malicious"}}'),
        JSON.parse('{"nested": {"__proto__": {"polluted": true}}}')
      ];

      for (const obj of dangerousObjects) {
        await expect(SafeJSONBSchema.parseAsync(obj)).rejects.toThrow(/forbidden keys/);
      }
    });

    it('should reject objects exceeding max depth', async () => {
      // Create deeply nested object (depth > 5)
      const deepObject = { a: { b: { c: { d: { e: { f: { g: 'too deep' } } } } } } };

      await expect(SafeJSONBSchema.parseAsync(deepObject)).rejects.toThrow(/forbidden keys/);
    });

    it('should reject objects exceeding max size (10KB)', async () => {
      // Create object larger than 10KB
      const largeObject = { data: 'x'.repeat(11000) };

      await expect(SafeJSONBSchema.parseAsync(largeObject)).rejects.toThrow(/too large/);
    });
  });
});

// =============================================================================
// API KEY SCHEMA TESTS
// =============================================================================

describe('API Key Schemas', () => {
  describe('CreateAPIKeySchema', () => {
    it('should accept valid API key creation request', async () => {
      const validRequest = {
        body: {
          name: 'Production API Key',
          scopes: ['campaigns:read', 'campaigns:write', 'admin:*'],
          expiresInDays: 90,
          ipWhitelist: ['192.168.1.100', '10.0.0.5'],
          userId: '550e8400-e29b-41d4-a716-446655440000'
        }
      };

      const result = await CreateAPIKeySchema.parseAsync(validRequest);
      expect(result.body.name).toBe('Production API Key');
      expect(result.body.scopes).toHaveLength(3);
    });

    it('should reject missing name', async () => {
      const invalidRequest = {
        body: {
          scopes: ['campaigns:read']
        }
      };

      await expect(CreateAPIKeySchema.parseAsync(invalidRequest)).rejects.toThrow(/Name is required/);
    });

    it('should reject invalid expiration days', async () => {
      const invalidRequest = {
        body: {
          name: 'Test Key',
          expiresInDays: 400 // Exceeds max 365
        }
      };

      await expect(CreateAPIKeySchema.parseAsync(invalidRequest)).rejects.toThrow(/cannot exceed 365 days/);
    });

    it('should reject invalid IP addresses', async () => {
      const invalidRequest = {
        body: {
          name: 'Test Key',
          ipWhitelist: ['not-an-ip', '256.256.256.256']
        }
      };

      await expect(CreateAPIKeySchema.parseAsync(invalidRequest)).rejects.toThrow();
    });
  });

  describe('RotateAPIKeySchema', () => {
    it('should accept valid rotation request', async () => {
      const validRequest = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { gracePeriodHours: 48 }
      };

      const result = await RotateAPIKeySchema.parseAsync(validRequest);
      expect(result.params.id).toBeTruthy();
      expect(result.body.gracePeriodHours).toBe(48);
    });

    it('should reject grace period exceeding 168 hours', async () => {
      const invalidRequest = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { gracePeriodHours: 200 }
      };

      await expect(RotateAPIKeySchema.parseAsync(invalidRequest)).rejects.toThrow(/cannot exceed 168 hours/);
    });
  });
});

// =============================================================================
// CAMPAIGN SCHEMA TESTS
// =============================================================================

describe('Campaign Schemas', () => {
  describe('CreateCampaignTemplateSchema', () => {
    it('should accept valid campaign template', async () => {
      const validRequest = {
        body: {
          name: 'Enterprise Outreach Template',
          description: 'Multi-channel outreach for enterprise prospects',
          type: 'multi_channel',
          path_type: 'dynamic_ai',
          icp_profile_id: '550e8400-e29b-41d4-a716-446655440000',
          settings: { dailyLimit: 50, enableAI: true }
        }
      };

      const result = await CreateCampaignTemplateSchema.parseAsync(validRequest);
      expect(result.body.name).toBe('Enterprise Outreach Template');
      expect(result.body.type).toBe('multi_channel');
    });

    it('should reject invalid campaign type', async () => {
      const invalidRequest = {
        body: {
          name: 'Test Campaign',
          type: 'invalid_type',
          path_type: 'structured'
        }
      };

      await expect(CreateCampaignTemplateSchema.parseAsync(invalidRequest)).rejects.toThrow();
    });

    it('should reject campaign with dangerous JSON settings', async () => {
      const invalidRequest = {
        body: {
          name: 'Test Campaign',
          type: 'email',
          path_type: 'structured',
          settings: JSON.parse('{"__proto__": {"admin": true}}')
        }
      };

      await expect(CreateCampaignTemplateSchema.parseAsync(invalidRequest)).rejects.toThrow(/forbidden keys/);
    });
  });

  describe('CreateEmailSequenceSchema', () => {
    it('should accept valid email sequence', async () => {
      const validRequest = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          template_id: '550e8400-e29b-41d4-a716-446655440000',
          step_number: 1,
          subject: 'Quick question about {{company}}',
          body: 'Hi {{firstName}},\n\nI noticed your company is {{painPoint}}...',
          delay_hours: 24
        }
      };

      const result = await CreateEmailSequenceSchema.parseAsync(validRequest);
      expect(result.body.step_number).toBe(1);
      expect(result.body.delay_hours).toBe(24);
    });

    it('should reject email body shorter than 10 characters', async () => {
      const invalidRequest = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          template_id: '550e8400-e29b-41d4-a716-446655440000',
          step_number: 1,
          body: 'Hi' // Too short
        }
      };

      await expect(CreateEmailSequenceSchema.parseAsync(invalidRequest)).rejects.toThrow(/at least 10 characters/);
    });

    it('should reject delay exceeding 720 hours', async () => {
      const invalidRequest = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          template_id: '550e8400-e29b-41d4-a716-446655440000',
          step_number: 1,
          body: 'Test email body content',
          delay_hours: 1000 // Exceeds max
        }
      };

      await expect(CreateEmailSequenceSchema.parseAsync(invalidRequest)).rejects.toThrow();
    });
  });

  describe('CreateLinkedInSequenceSchema', () => {
    it('should accept valid LinkedIn sequence', async () => {
      const validRequest = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          template_id: '550e8400-e29b-41d4-a716-446655440000',
          step_number: 1,
          type: 'connection_request',
          message: "Hi {{firstName}}, I'd love to connect!",
          delay_hours: 0
        }
      };

      const result = await CreateLinkedInSequenceSchema.parseAsync(validRequest);
      expect(result.body.type).toBe('connection_request');
    });

    it('should reject connection request without message', async () => {
      const invalidRequest = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          template_id: '550e8400-e29b-41d4-a716-446655440000',
          step_number: 1,
          type: 'connection_request'
          // Missing message
        }
      };

      await expect(CreateLinkedInSequenceSchema.parseAsync(invalidRequest)).rejects.toThrow(/Message is required/);
    });

    it('should reject connection request message exceeding 300 characters', async () => {
      const invalidRequest = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          template_id: '550e8400-e29b-41d4-a716-446655440000',
          step_number: 1,
          type: 'connection_request',
          message: 'x'.repeat(301) // Too long for connection request
        }
      };

      await expect(CreateLinkedInSequenceSchema.parseAsync(invalidRequest)).rejects.toThrow(/300 characters or less/);
    });

    it('should accept profile visit without message', async () => {
      const validRequest = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          template_id: '550e8400-e29b-41d4-a716-446655440000',
          step_number: 1,
          type: 'profile_visit'
          // Message optional for profile_visit
        }
      };

      const result = await CreateLinkedInSequenceSchema.parseAsync(validRequest);
      expect(result.body.type).toBe('profile_visit');
    });
  });
});

// =============================================================================
// ENROLLMENT SCHEMA TESTS
// =============================================================================

describe('Enrollment Schemas', () => {
  describe('BulkEnrollSchema', () => {
    it('should accept valid bulk enrollment', async () => {
      const validRequest = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          contact_ids: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003'
          ]
        }
      };

      const result = await BulkEnrollSchema.parseAsync(validRequest);
      expect(result.body.contact_ids).toHaveLength(3);
    });

    it('should reject empty contact array', async () => {
      const invalidRequest = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          contact_ids: []
        }
      };

      await expect(BulkEnrollSchema.parseAsync(invalidRequest)).rejects.toThrow(/At least one contact required/);
    });

    it('should reject more than 1000 contacts', async () => {
      const tooManyContacts = Array(1001).fill('550e8400-e29b-41d4-a716-446655440000');
      const invalidRequest = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          contact_ids: tooManyContacts
        }
      };

      await expect(BulkEnrollSchema.parseAsync(invalidRequest)).rejects.toThrow(/Maximum 1000 contacts/);
    });
  });
});

// =============================================================================
// CHAT SCHEMA TESTS
// =============================================================================

describe('Chat Schemas', () => {
  describe('ChatMessageSchema', () => {
    it('should accept valid chat message', async () => {
      const validRequest = {
        body: {
          message: 'Find 50 companies in the SaaS industry with 50-200 employees',
          context: {
            taskType: 'discovery',
            campaignId: '550e8400-e29b-41d4-a716-446655440000'
          },
          model: 'claude-3-5-sonnet-20241022'
        }
      };

      const result = await ChatMessageSchema.parseAsync(validRequest);
      expect(result.body.message).toBeTruthy();
      expect(result.body.context.taskType).toBe('discovery');
    });

    it('should reject empty message', async () => {
      const invalidRequest = {
        body: {
          message: ''
        }
      };

      await expect(ChatMessageSchema.parseAsync(invalidRequest)).rejects.toThrow(/cannot be empty/);
    });

    it('should reject message exceeding 10,000 characters', async () => {
      const invalidRequest = {
        body: {
          message: 'x'.repeat(10001)
        }
      };

      await expect(ChatMessageSchema.parseAsync(invalidRequest)).rejects.toThrow(/too long/);
    });
  });
});

// =============================================================================
// IMPORT SCHEMA TESTS
// =============================================================================

describe('Import Schemas', () => {
  describe('SyncToHubSpotSchema', () => {
    it('should accept valid HubSpot sync request', async () => {
      const validRequest = {
        body: {
          contactIds: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002'
          ],
          createIfNew: true,
          updateIfExists: true,
          associateCompany: true
        }
      };

      const result = await SyncToHubSpotSchema.parseAsync(validRequest);
      expect(result.body.contactIds).toHaveLength(2);
      expect(result.body.createIfNew).toBe(true);
    });

    it('should reject more than 100 contacts', async () => {
      const tooManyContacts = Array(101).fill('550e8400-e29b-41d4-a716-446655440000');
      const invalidRequest = {
        body: {
          contactIds: tooManyContacts
        }
      };

      await expect(SyncToHubSpotSchema.parseAsync(invalidRequest)).rejects.toThrow();
    });
  });
});

// =============================================================================
// DISCOVERY & ENRICHMENT SCHEMA TESTS
// =============================================================================

describe('Discovery & Enrichment Schemas', () => {
  describe('DiscoverByICPSchema', () => {
    it('should accept valid discovery request with query', async () => {
      const validRequest = {
        body: {
          query: 'SaaS companies with 50-200 employees in San Francisco',
          count: 50,
          minScore: 0.8,
          excludeExisting: true
        }
      };

      const result = await DiscoverByICPSchema.parseAsync(validRequest);
      expect(result.body.query).toBeTruthy();
      expect(result.body.minScore).toBe(0.8);
    });

    it('should accept valid discovery request with ICP profile', async () => {
      const validRequest = {
        body: {
          icpProfileName: 'icp_enterprise_saas',
          count: 100
        }
      };

      const result = await DiscoverByICPSchema.parseAsync(validRequest);
      expect(result.body.icpProfileName).toBe('icp_enterprise_saas');
    });

    it('should reject request without query or icpProfileName', async () => {
      const invalidRequest = {
        body: {
          count: 50
        }
      };

      await expect(DiscoverByICPSchema.parseAsync(invalidRequest)).rejects.toThrow(/query or icpProfileName must be provided/);
    });

    it('should reject count exceeding 1000', async () => {
      const invalidRequest = {
        body: {
          query: 'Test query',
          count: 1500
        }
      };

      await expect(DiscoverByICPSchema.parseAsync(invalidRequest)).rejects.toThrow();
    });
  });

  describe('EnrichContactsSchema', () => {
    it('should accept valid enrichment request', async () => {
      const validRequest = {
        body: {
          contacts: [
            {
              email: 'john@example.com',
              firstName: 'John',
              lastName: 'Doe',
              companyDomain: 'example.com'
            },
            {
              email: 'jane@company.com',
              firstName: 'Jane',
              lastName: 'Smith'
            }
          ],
          sources: ['explorium', 'apollo'],
          parallel: true,
          batchSize: 10
        }
      };

      const result = await EnrichContactsSchema.parseAsync(validRequest);
      expect(result.body.contacts).toHaveLength(2);
      expect(result.body.sources).toContain('explorium');
    });

    it('should reject more than 100 contacts', async () => {
      const tooManyContacts = Array(101).fill({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      });

      const invalidRequest = {
        body: {
          contacts: tooManyContacts
        }
      };

      await expect(EnrichContactsSchema.parseAsync(invalidRequest)).rejects.toThrow(/Maximum 100 contacts/);
    });
  });

  describe('EnrollInCampaignSchema', () => {
    it('should accept valid enrollment request', async () => {
      const validRequest = {
        body: {
          campaignId: 'test-campaign-123',
          leads: [
            {
              email: 'lead@example.com',
              firstName: 'Lead',
              lastName: 'User',
              companyName: 'Example Corp',
              variables: { industry: 'SaaS' }
            }
          ],
          skipUnsubscribed: true
        }
      };

      const result = await EnrollInCampaignSchema.parseAsync(validRequest);
      expect(result.body.campaignId).toBe('test-campaign-123');
      expect(result.body.leads).toHaveLength(1);
    });

    it('should reject invalid email in leads', async () => {
      const invalidRequest = {
        body: {
          campaignId: 'test-campaign-123',
          leads: [
            {
              email: 'invalid-email',
              firstName: 'Test',
              lastName: 'User'
            }
          ]
        }
      };

      await expect(EnrollInCampaignSchema.parseAsync(invalidRequest)).rejects.toThrow(/Invalid email/);
    });
  });
});

// =============================================================================
// SQL INJECTION PREVENTION TESTS
// =============================================================================

describe('SQL Injection Prevention', () => {
  it('should reject SQL injection attempts in email field', async () => {
    const sqlInjections = [
      "admin'--",
      "admin' OR '1'='1",
      "'; DROP TABLE users; --",
      "admin' UNION SELECT * FROM passwords--"
    ];

    for (const malicious of sqlInjections) {
      await expect(EmailSchema.parseAsync(malicious)).rejects.toThrow();
    }
  });

  it('should reject SQL injection attempts in UUID field', async () => {
    const sqlInjections = [
      "550e8400' OR '1'='1",
      "123; DROP TABLE campaigns; --",
      "' UNION SELECT password FROM users--"
    ];

    for (const malicious of sqlInjections) {
      await expect(UUIDSchema.parseAsync(malicious)).rejects.toThrow();
    }
  });

  it('should reject SQL injection attempts in domain field', async () => {
    const sqlInjections = [
      "example.com'; DROP TABLE companies; --",
      "example.com' OR '1'='1",
      "'; SELECT * FROM passwords; --"
    ];

    for (const malicious of sqlInjections) {
      await expect(DomainSchema.parseAsync(malicious)).rejects.toThrow();
    }
  });
});

// =============================================================================
// XSS PREVENTION TESTS
// =============================================================================

describe('XSS Prevention', () => {
  it('should allow safe HTML/JavaScript in campaign name (backend responsibility to encode)', async () => {
    // Note: Zod validation allows these strings; backend must encode before rendering
    const xssAttempts = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>'
    ];

    for (const xss of xssAttempts) {
      // Schema should accept (validation layer), but these should be:
      // 1. Stored safely in database (Sequelize handles this)
      // 2. Encoded when rendered (frontend/template responsibility)
      const request = {
        body: {
          name: xss,
          type: 'email',
          path_type: 'structured'
        }
      };

      // Validation passes (we don't reject HTML in names)
      const result = await CreateCampaignTemplateSchema.parseAsync(request);
      expect(result.body.name).toBe(xss);
    }
  });
});

// =============================================================================
// PROTOTYPE POLLUTION TESTS
// =============================================================================

describe('Prototype Pollution Prevention', () => {
  it('should reject __proto__ pollution attempts', async () => {
    // Use JSON.parse to simulate real API input where __proto__ becomes a real property
    const pollutionAttempts = [
      JSON.parse('{"__proto__": {"admin": true}}'),
      JSON.parse('{"constructor": {"prototype": {"admin": true}}}')
    ];

    for (const malicious of pollutionAttempts) {
      await expect(SafeJSONBSchema.parseAsync(malicious)).rejects.toThrow(/forbidden keys/);
    }
  });

  it('should reject nested __proto__ pollution', async () => {
    const nestedPollution = JSON.parse('{"settings": {"nested": {"__proto__": {"polluted": true}}}}');

    await expect(SafeJSONBSchema.parseAsync(nestedPollution)).rejects.toThrow(/forbidden keys/);
  });
});
