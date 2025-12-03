# Priority Test Implementation Guide

**Purpose**: Detailed guidance for implementing critical tests in priority order
**Target Audience**: Test Engineers, Backend/Frontend Developers
**Status**: Active Development Guide

---

## Phase 1: Critical Security Tests (Week 1-2)

### 1.1 Authentication Middleware Tests

**File to Create**: `/home/omar/claude - sales_auto_skill/sales-automation-api/tests/middleware/authenticate.test.js`

```javascript
/**
 * Authentication Middleware Tests
 * CRITICAL: Tests for API authentication and authorization
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';

describe('Authentication Middleware', () => {
  let app, sequelize, testUser, validApiKey;

  beforeAll(async () => {
    // Setup test database and app
    const { setupTestApp } = await import('./helpers/test-app.js');
    ({ app, sequelize } = await setupTestApp());

    // Create test API key
    const ApiKey = sequelize.models.api_keys;
    const apiKeyRecord = await ApiKey.create({
      key_hash: await hashApiKey('test_key_123'),
      name: 'Test Key',
      is_active: true
    });
    validApiKey = 'test_key_123';
  });

  describe('API Key Authentication', () => {
    it('should accept valid API key in X-API-Key header', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .set('X-API-Key', validApiKey);

      expect(response.status).not.toBe(401);
    });

    it('should reject request without API key', async () => {
      const response = await request(app)
        .get('/api/campaigns');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toContain('API key required');
    });

    it('should reject invalid API key', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .set('X-API-Key', 'invalid_key_999');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid API key');
    });

    it('should reject revoked API key', async () => {
      const ApiKey = sequelize.models.api_keys;
      const revokedKey = await ApiKey.create({
        key_hash: await hashApiKey('revoked_key_123'),
        name: 'Revoked Key',
        is_active: false
      });

      const response = await request(app)
        .get('/api/campaigns')
        .set('X-API-Key', 'revoked_key_123');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('revoked');
    });

    it('should reject expired API key', async () => {
      const ApiKey = sequelize.models.api_keys;
      const expiredKey = await ApiKey.create({
        key_hash: await hashApiKey('expired_key_123'),
        name: 'Expired Key',
        is_active: true,
        expires_at: new Date('2020-01-01')
      });

      const response = await request(app)
        .get('/api/campaigns')
        .set('X-API-Key', 'expired_key_123');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('expired');
    });

    it('should log authentication attempts', async () => {
      const ApiKeyLog = sequelize.models.api_key_logs;
      const beforeCount = await ApiKeyLog.count();

      await request(app)
        .get('/api/campaigns')
        .set('X-API-Key', validApiKey);

      const afterCount = await ApiKeyLog.count();
      expect(afterCount).toBe(beforeCount + 1);

      const lastLog = await ApiKeyLog.findOne({
        order: [['created_at', 'DESC']]
      });
      expect(lastLog.endpoint).toBe('/api/campaigns');
      expect(lastLog.method).toBe('GET');
      expect(lastLog.status_code).toBe(200);
    });
  });

  describe('Rate Limiting by API Key', () => {
    it('should enforce per-key rate limits', async () => {
      const requests = [];
      for (let i = 0; i < 102; i++) {
        requests.push(
          request(app)
            .get('/api/campaigns')
            .set('X-API-Key', validApiKey)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should not affect other API keys', async () => {
      // Create second API key
      const ApiKey = sequelize.models.api_keys;
      await ApiKey.create({
        key_hash: await hashApiKey('test_key_2'),
        name: 'Test Key 2',
        is_active: true
      });

      // Exhaust rate limit for first key
      for (let i = 0; i < 102; i++) {
        await request(app)
          .get('/api/campaigns')
          .set('X-API-Key', validApiKey);
      }

      // Second key should still work
      const response = await request(app)
        .get('/api/campaigns')
        .set('X-API-Key', 'test_key_2');

      expect(response.status).not.toBe(429);
    });
  });

  describe('Security Headers', () => {
    it('should not expose API key in response', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .set('X-API-Key', validApiKey);

      expect(response.headers).not.toHaveProperty('x-api-key');
      expect(JSON.stringify(response.body)).not.toContain(validApiKey);
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .set('X-API-Key', validApiKey);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });
});

// Helper function
async function hashApiKey(key) {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(key).digest('hex');
}
```

**Expected Results**:
- 15+ tests for authentication
- Coverage: 95%+ for `authenticate.js` and `authenticate-db.js`
- Tests run in <5 seconds

---

### 1.2 Webhook Authentication Tests

**File to Create**: `/home/omar/claude - sales_auto_skill/sales-automation-api/tests/middleware/webhook-auth.test.js`

```javascript
/**
 * Webhook Authentication Tests
 * Tests HMAC signature verification and IP whitelisting
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import crypto from 'crypto';

describe('Webhook Authentication', () => {
  let app;

  beforeAll(async () => {
    process.env.LEMLIST_WEBHOOK_SECRET = 'test_lemlist_secret';
    process.env.POSTMARK_WEBHOOK_SECRET = 'test_postmark_secret';
    process.env.PHANTOMBUSTER_WEBHOOK_TOKEN = 'test_phantombuster_token';

    const { setupTestApp } = await import('./helpers/test-app.js');
    ({ app } = await setupTestApp());
  });

  describe('Lemlist Webhook Signature', () => {
    it('should accept webhook with valid signature', async () => {
      const payload = {
        type: 'email.sent',
        email: 'test@example.com',
        campaignId: 'test_campaign'
      };

      const signature = crypto
        .createHmac('sha256', process.env.LEMLIST_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');

      const response = await request(app)
        .post('/api/campaigns/events/webhook/lemlist')
        .set('X-Lemlist-Signature', signature)
        .send(payload);

      expect(response.status).toBe(200);
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = {
        type: 'email.sent',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/campaigns/events/webhook/lemlist')
        .set('X-Lemlist-Signature', 'invalid_signature')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toContain('Invalid webhook signature');
    });

    it('should reject webhook with missing signature', async () => {
      const payload = { type: 'email.sent' };

      const response = await request(app)
        .post('/api/campaigns/events/webhook/lemlist')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('signature required');
    });

    it('should reject replayed webhook', async () => {
      const payload = {
        type: 'email.sent',
        timestamp: Date.now() - (10 * 60 * 1000) // 10 minutes ago
      };

      const signature = crypto
        .createHmac('sha256', process.env.LEMLIST_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');

      const response = await request(app)
        .post('/api/campaigns/events/webhook/lemlist')
        .set('X-Lemlist-Signature', signature)
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('expired');
    });

    it('should use timing-safe comparison', async () => {
      // Test that signature comparison is not vulnerable to timing attacks
      const payload = { type: 'email.sent' };

      const validSignature = crypto
        .createHmac('sha256', process.env.LEMLIST_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');

      // Create signature that differs in first character
      const invalidSignature = 'a' + validSignature.slice(1);

      const start1 = process.hrtime.bigint();
      await request(app)
        .post('/api/campaigns/events/webhook/lemlist')
        .set('X-Lemlist-Signature', invalidSignature)
        .send(payload);
      const end1 = process.hrtime.bigint();

      // Create signature that differs in last character
      const invalidSignature2 = validSignature.slice(0, -1) + 'a';

      const start2 = process.hrtime.bigint();
      await request(app)
        .post('/api/campaigns/events/webhook/lemlist')
        .set('X-Lemlist-Signature', invalidSignature2)
        .send(payload);
      const end2 = process.hrtime.bigint();

      const time1 = Number(end1 - start1);
      const time2 = Number(end2 - start2);

      // Timing difference should be minimal (constant-time comparison)
      const timeDiff = Math.abs(time1 - time2);
      expect(timeDiff).toBeLessThan(1_000_000); // 1ms
    });
  });

  describe('IP Whitelist', () => {
    beforeEach(() => {
      process.env.WEBHOOK_IP_WHITELIST = '192.168.1.100,10.0.0.0/8';
    });

    it('should accept webhook from whitelisted IP', async () => {
      const response = await request(app)
        .post('/api/campaigns/events/webhook/lemlist')
        .set('X-Forwarded-For', '192.168.1.100')
        .send({ type: 'test' });

      expect(response.status).not.toBe(403);
    });

    it('should accept webhook from whitelisted CIDR range', async () => {
      const response = await request(app)
        .post('/api/campaigns/events/webhook/lemlist')
        .set('X-Forwarded-For', '10.0.5.123')
        .send({ type: 'test' });

      expect(response.status).not.toBe(403);
    });

    it('should reject webhook from non-whitelisted IP', async () => {
      const response = await request(app)
        .post('/api/campaigns/events/webhook/lemlist')
        .set('X-Forwarded-For', '1.2.3.4')
        .send({ type: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('IP not whitelisted');
    });
  });
});
```

**Expected Results**:
- 12+ tests for webhook auth
- Coverage: 95%+ for `webhook-auth.js` and `webhook-ip-whitelist.js`
- Tests run in <3 seconds

---

## Phase 2: Provider Integration Tests (Week 3-4)

### 2.1 HeyGen Video Provider Tests

**File to Create**: `/home/omar/claude - sales_auto_skill/sales-automation-api/tests/providers/heygen.test.js`

```javascript
/**
 * HeyGen Video Provider Tests
 * Tests video generation API integration
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { HeyGenVideoProvider } from '../../src/providers/heygen/HeyGenVideoProvider.js';

describe('HeyGenVideoProvider', () => {
  let provider;
  let mockAxios;

  beforeEach(() => {
    // Mock axios for API calls
    mockAxios = {
      post: jest.fn(),
      get: jest.fn()
    };

    provider = new HeyGenVideoProvider({
      apiKey: 'test_heygen_key',
      httpClient: mockAxios
    });
  });

  describe('generateVideo', () => {
    it('should generate video with valid parameters', async () => {
      const mockResponse = {
        data: {
          video_id: 'video_123',
          status: 'pending',
          webhook_url: 'https://api.example.com/webhook'
        }
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await provider.generateVideo({
        avatarId: 'avatar_1',
        voiceId: 'voice_1',
        script: 'Hello {{firstName}}, welcome to our platform!',
        variables: {
          firstName: 'John'
        }
      });

      expect(result.videoId).toBe('video_123');
      expect(result.status).toBe('pending');
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.heygen.com/v1/video.generate',
        expect.objectContaining({
          avatar_id: 'avatar_1',
          voice_id: 'voice_1',
          script: 'Hello John, welcome to our platform!'
        }),
        expect.any(Object)
      );
    });

    it('should handle API errors gracefully', async () => {
      mockAxios.post.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(provider.generateVideo({
        avatarId: 'avatar_1',
        voiceId: 'voice_1',
        script: 'Test'
      })).rejects.toThrow('API rate limit exceeded');
    });

    it('should validate required parameters', async () => {
      await expect(provider.generateVideo({
        avatarId: 'avatar_1'
        // Missing voiceId and script
      })).rejects.toThrow('voiceId is required');
    });

    it('should retry on transient failures', async () => {
      // First two calls fail, third succeeds
      mockAxios.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { video_id: 'video_123', status: 'pending' }
        });

      const result = await provider.generateVideo({
        avatarId: 'avatar_1',
        voiceId: 'voice_1',
        script: 'Test'
      });

      expect(result.videoId).toBe('video_123');
      expect(mockAxios.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('getVideoStatus', () => {
    it('should fetch video status', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          video_id: 'video_123',
          status: 'completed',
          video_url: 'https://cdn.heygen.com/video_123.mp4'
        }
      });

      const status = await provider.getVideoStatus('video_123');

      expect(status.status).toBe('completed');
      expect(status.videoUrl).toBeDefined();
    });

    it('should handle video not found', async () => {
      mockAxios.get.mockRejectedValue({
        response: { status: 404 }
      });

      await expect(provider.getVideoStatus('nonexistent'))
        .rejects.toThrow('Video not found');
    });
  });

  describe('listAvatars', () => {
    it('should fetch available avatars', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          avatars: [
            { id: 'avatar_1', name: 'Alex', gender: 'male' },
            { id: 'avatar_2', name: 'Sarah', gender: 'female' }
          ]
        }
      });

      const avatars = await provider.listAvatars();

      expect(avatars).toHaveLength(2);
      expect(avatars[0].name).toBe('Alex');
    });
  });
});
```

**Expected Results**:
- 15+ tests per provider
- Coverage: 90%+ for provider files
- Mocked API calls (no actual API usage)

---

## Phase 3: Business Logic Tests (Week 5-6)

### 3.1 Workflow Execution Service Tests

**File to Create**: `/home/omar/claude - sales_auto_skill/sales-automation-api/tests/services/workflow-execution.test.js`

```javascript
/**
 * Workflow Execution Service Tests
 * Tests campaign workflow orchestration
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { WorkflowExecutionService } from '../../src/services/WorkflowExecutionService.js';

describe('WorkflowExecutionService', () => {
  let service;
  let mockProviders;
  let sequelize;

  beforeEach(async () => {
    // Setup test database
    const { setupTestDB } = await import('./helpers/test-db.js');
    sequelize = await setupTestDB();

    // Mock providers
    mockProviders = {
      email: {
        sendEmail: jest.fn().mockResolvedValue({ messageId: 'msg_123' })
      },
      linkedin: {
        sendConnectionRequest: jest.fn().mockResolvedValue({ success: true })
      },
      video: {
        generateVideo: jest.fn().mockResolvedValue({ videoId: 'vid_123' })
      }
    };

    service = new WorkflowExecutionService({
      providers: mockProviders,
      sequelize
    });
  });

  describe('executeWorkflow', () => {
    it('should execute email sequence workflow', async () => {
      // Create test campaign
      const template = await sequelize.models.campaign_templates.create({
        name: 'Test Email Campaign',
        type: 'email',
        sequences: {
          email: [
            { step: 1, subject: 'Hello {{name}}', body: 'Welcome!', delay: 0 },
            { step: 2, subject: 'Follow-up', body: 'Still interested?', delay: 86400 }
          ]
        }
      });

      const instance = await sequelize.models.campaign_instances.create({
        template_id: template.id,
        status: 'active'
      });

      const enrollment = await sequelize.models.campaign_enrollments.create({
        instance_id: instance.id,
        contact_id: 'contact_123',
        contact_email: 'test@example.com',
        variables: { name: 'John' }
      });

      // Execute workflow
      await service.executeWorkflow(enrollment.id);

      // Verify email was sent
      expect(mockProviders.email.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Hello John',
        body: 'Welcome!',
        enrollmentId: enrollment.id
      });

      // Verify event was created
      const events = await sequelize.models.campaign_events.findAll({
        where: { enrollment_id: enrollment.id }
      });
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe('sent');
    });

    it('should handle provider failures and retry', async () => {
      // First call fails, second succeeds
      mockProviders.email.sendEmail
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({ messageId: 'msg_123' });

      const enrollment = await createTestEnrollment(sequelize);

      await service.executeWorkflow(enrollment.id);

      expect(mockProviders.email.sendEmail).toHaveBeenCalledTimes(2);
    });

    it('should execute multi-channel workflow', async () => {
      const template = await sequelize.models.campaign_templates.create({
        name: 'Multi-Channel Campaign',
        sequences: {
          email: [{ step: 1, subject: 'Email', body: 'Check video' }],
          video: [{ step: 1, avatarId: 'avatar_1', script: 'Hi!' }],
          linkedin: [{ step: 1, message: 'Connect?' }]
        }
      });

      const enrollment = await createTestEnrollment(sequelize, { template_id: template.id });

      await service.executeWorkflow(enrollment.id);

      expect(mockProviders.email.sendEmail).toHaveBeenCalled();
      expect(mockProviders.video.generateVideo).toHaveBeenCalled();
      expect(mockProviders.linkedin.sendConnectionRequest).toHaveBeenCalled();
    });
  });

  describe('scheduleNextStep', () => {
    it('should schedule follow-up email after delay', async () => {
      const enrollment = await createTestEnrollment(sequelize);

      await service.scheduleNextStep(enrollment.id, 2, 86400); // 24 hours

      const scheduledJobs = await sequelize.models.scheduled_jobs.findAll({
        where: { enrollment_id: enrollment.id }
      });

      expect(scheduledJobs).toHaveLength(1);
      expect(scheduledJobs[0].execute_at).toBeInstanceOf(Date);
      expect(scheduledJobs[0].step_number).toBe(2);
    });
  });
});

// Helper function
async function createTestEnrollment(sequelize, overrides = {}) {
  const template = await sequelize.models.campaign_templates.create({
    name: 'Test Campaign',
    type: 'email',
    sequences: { email: [{ step: 1, subject: 'Test', body: 'Test' }] },
    ...overrides
  });

  const instance = await sequelize.models.campaign_instances.create({
    template_id: template.id,
    status: 'active'
  });

  return await sequelize.models.campaign_enrollments.create({
    instance_id: instance.id,
    contact_id: 'contact_123',
    contact_email: 'test@example.com',
    variables: { name: 'John' }
  });
}
```

**Expected Results**:
- 20+ tests for workflow service
- Coverage: 85%+ for `WorkflowExecutionService.js`
- Tests include retry logic, error handling, scheduling

---

## Phase 4: Frontend Component Tests (Week 7-8)

### 4.1 Campaign Editor Component Tests

**File to Create**: `/home/omar/claude - sales_auto_skill/desktop-app/src/components/CampaignEditor.test.jsx`

```javascript
/**
 * CampaignEditor Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CampaignEditor from './CampaignEditor';

// Mock API service
vi.mock('../services/api', () => ({
  default: {
    createCampaign: vi.fn(),
    updateCampaign: vi.fn(),
    getCampaign: vi.fn()
  }
}));

import api from '../services/api';

describe('CampaignEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  describe('Create Mode', () => {
    it('should render empty form for new campaign', () => {
      renderWithRouter(
        <CampaignEditor
          mode="create"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('Campaign Name')).toHaveValue('');
      expect(screen.getByLabelText('Campaign Type')).toHaveValue('email');
      expect(screen.getByRole('button', { name: 'Create Campaign' })).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <CampaignEditor
          mode="create"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Try to submit without filling fields
      await user.click(screen.getByRole('button', { name: 'Create Campaign' }));

      expect(screen.getByText('Campaign name is required')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should create campaign with valid data', async () => {
      const user = userEvent.setup();
      api.createCampaign.mockResolvedValue({
        id: 'campaign_123',
        name: 'Test Campaign'
      });

      renderWithRouter(
        <CampaignEditor
          mode="create"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Fill form
      await user.type(screen.getByLabelText('Campaign Name'), 'Test Campaign');
      await user.selectOptions(screen.getByLabelText('Campaign Type'), 'email');
      await user.type(screen.getByLabelText('Description'), 'Test description');

      // Submit
      await user.click(screen.getByRole('button', { name: 'Create Campaign' }));

      await waitFor(() => {
        expect(api.createCampaign).toHaveBeenCalledWith({
          name: 'Test Campaign',
          type: 'email',
          description: 'Test description'
        });
        expect(mockOnSave).toHaveBeenCalledWith({ id: 'campaign_123', name: 'Test Campaign' });
      });
    });

    it('should handle API errors', async () => {
      const user = userEvent.setup();
      api.createCampaign.mockRejectedValue(new Error('API error'));

      renderWithRouter(
        <CampaignEditor
          mode="create"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('Campaign Name'), 'Test Campaign');
      await user.click(screen.getByRole('button', { name: 'Create Campaign' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to create campaign')).toBeInTheDocument();
        expect(mockOnSave).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edit Mode', () => {
    const existingCampaign = {
      id: 'campaign_123',
      name: 'Existing Campaign',
      type: 'linkedin',
      description: 'Existing description'
    };

    it('should load existing campaign data', async () => {
      api.getCampaign.mockResolvedValue(existingCampaign);

      renderWithRouter(
        <CampaignEditor
          mode="edit"
          campaignId="campaign_123"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Campaign Name')).toHaveValue('Existing Campaign');
        expect(screen.getByLabelText('Campaign Type')).toHaveValue('linkedin');
        expect(screen.getByLabelText('Description')).toHaveValue('Existing description');
      });
    });

    it('should update campaign', async () => {
      const user = userEvent.setup();
      api.getCampaign.mockResolvedValue(existingCampaign);
      api.updateCampaign.mockResolvedValue({ ...existingCampaign, name: 'Updated Campaign' });

      renderWithRouter(
        <CampaignEditor
          mode="edit"
          campaignId="campaign_123"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Campaign Name')).toHaveValue('Existing Campaign');
      });

      // Update name
      const nameInput = screen.getByLabelText('Campaign Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Campaign');

      // Submit
      await user.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        expect(api.updateCampaign).toHaveBeenCalledWith('campaign_123', {
          name: 'Updated Campaign',
          type: 'linkedin',
          description: 'Existing description'
        });
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  describe('Sequence Editor', () => {
    it('should add email sequence step', async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <CampaignEditor
          mode="create"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Select email type
      await user.selectOptions(screen.getByLabelText('Campaign Type'), 'email');

      // Add sequence step
      await user.click(screen.getByRole('button', { name: 'Add Email Step' }));

      expect(screen.getByLabelText('Subject Line')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Body')).toBeInTheDocument();
    });

    it('should remove sequence step', async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <CampaignEditor
          mode="create"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.selectOptions(screen.getByLabelText('Campaign Type'), 'email');
      await user.click(screen.getByRole('button', { name: 'Add Email Step' }));

      // Remove step
      await user.click(screen.getByRole('button', { name: 'Remove Step' }));

      expect(screen.queryByLabelText('Subject Line')).not.toBeInTheDocument();
    });
  });

  describe('Cancel Action', () => {
    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <CampaignEditor
          mode="create"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should prompt for confirmation if form has unsaved changes', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => true);

      renderWithRouter(
        <CampaignEditor
          mode="create"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Make changes
      await user.type(screen.getByLabelText('Campaign Name'), 'Test');

      // Cancel
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(window.confirm).toHaveBeenCalledWith(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});
```

**Expected Results**:
- 25+ tests for CampaignEditor
- Coverage: 85%+ for component
- User interactions fully tested

---

## Phase 5: Integration & E2E Tests (Week 9-10)

### 5.1 E2E Campaign Creation Flow

**File to Create**: `/home/omar/claude - sales_auto_skill/tests/e2e/campaign-creation.spec.js`

```javascript
/**
 * E2E Test: Campaign Creation Flow
 * Tests complete user journey from login to sending first email
 */
import { test, expect } from '@playwright/test';

test.describe('Campaign Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');

    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should create email campaign and enroll contacts', async ({ page }) => {
    // Step 1: Navigate to Campaigns
    await page.click('text=Campaigns');
    await expect(page).toHaveURL(/.*campaigns/);

    // Step 2: Create new campaign
    await page.click('button:has-text("New Campaign")');
    await expect(page.getByRole('heading', { name: 'Create Campaign' })).toBeVisible();

    // Step 3: Fill campaign details
    await page.fill('[name="campaignName"]', 'E2E Test Campaign');
    await page.selectOption('[name="campaignType"]', 'email');
    await page.fill('[name="description"]', 'Automated test campaign');

    // Step 4: Add email sequence
    await page.click('button:has-text("Add Email Step")');
    await page.fill('[name="emailSubject"]', 'Welcome to our platform {{firstName}}');
    await page.fill('[name="emailBody"]', 'Hi {{firstName}}, welcome!');

    // Step 5: Save campaign
    await page.click('button:has-text("Create Campaign")');

    // Wait for success message
    await expect(page.getByText('Campaign created successfully')).toBeVisible();

    // Verify redirect to campaign details
    await expect(page).toHaveURL(/.*campaigns\/.*/);