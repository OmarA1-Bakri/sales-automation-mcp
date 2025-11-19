# Phase 6B - BLOCKER Issues Fix Plan

**Date:** November 9, 2025
**Work-Critic Grade:** 72/100 (NOT PRODUCTION READY)
**Blockers Found:** 5 critical issues preventing production deployment

---

## Executive Summary

The Campaign API has excellent security architecture but has 5 BLOCKER issues that prevent production use:
1. Transaction support broken in model methods
2. Missing sequence management endpoints
3. Missing enrollment management endpoints
4. Missing event tracking endpoints
5. No database migrations

**Estimated Total Time:** 14-16 hours of focused development

---

## BLOCKER #1: Transaction Bug in Model Methods

### Issue
**Severity:** BLOCKER
**Location:** `mcp-server/src/models/CampaignInstance.cjs:119-144`
**Time to Fix:** 30 minutes

### Problem
Model methods `start()`, `pause()`, `complete()` don't accept transaction parameters. Controller passes `{ transaction: t }` but model ignores it, breaking atomicity.

```javascript
// Controller (line 462):
await instance.start({ transaction: t });

// Model (line 119) - BROKEN:
CampaignInstance.prototype.start = async function() {
  this.status = 'active';
  return await this.save(); // ❌ Not using transaction!
}
```

### Impact
- Race conditions possible
- Partial updates during failures
- Data corruption risk
- Broken atomicity guarantees

### Fix Required

**File:** `mcp-server/src/models/CampaignInstance.cjs`

```javascript
// Update all three methods to accept options parameter:

CampaignInstance.prototype.start = async function(options = {}) {
  if (this.status !== 'draft' && this.status !== 'paused') {
    throw new Error('Can only start campaigns in draft or paused status');
  }
  this.status = 'active';
  this.started_at = new Date();
  return await this.save(options); // ✅ Pass through options (includes transaction)
};

CampaignInstance.prototype.pause = async function(options = {}) {
  if (this.status !== 'active') {
    throw new Error('Can only pause active campaigns');
  }
  this.status = 'paused';
  this.paused_at = new Date();
  return await this.save(options);
};

CampaignInstance.prototype.complete = async function(options = {}) {
  if (this.status !== 'active') {
    throw new Error('Can only complete active campaigns');
  }
  this.status = 'completed';
  this.completed_at = new Date();
  return await this.save(options);
};
```

### Verification
```bash
# Test concurrent status updates don't corrupt data
curl -X PATCH https://localhost:3457/api/campaigns/v2/instances/{id} \
  -H "Authorization: Bearer {token}" \
  -d '{"status": "active"}' &
curl -X PATCH https://localhost:3457/api/campaigns/v2/instances/{id} \
  -H "Authorization: Bearer {token}" \
  -d '{"status": "paused"}' &
```

---

## BLOCKER #2: Missing Sequence Management Endpoints

### Issue
**Severity:** BLOCKER
**Location:** New endpoints needed
**Time to Fix:** 3-4 hours

### Problem
Validators exist for email and LinkedIn sequences, but NO API endpoints to create/manage them. Templates can be created but are useless without sequences.

**Validators that exist:**
- `createEmailSequenceSchema` (campaign-validator.js:85)
- `updateEmailSequenceSchema` (campaign-validator.js:95)
- `createLinkedInSequenceSchema` (campaign-validator.js:103)
- `updateLinkedInSequenceSchema` (campaign-validator.js:137)

**Endpoints missing:**
- POST /templates/:id/sequences/email
- PUT /templates/:id/sequences/email/:seqId
- DELETE /templates/:id/sequences/email/:seqId
- POST /templates/:id/sequences/linkedin
- PUT /templates/:id/sequences/linkedin/:seqId
- DELETE /templates/:id/sequences/linkedin/:seqId

### Impact
- Templates created via API are empty shells
- Must manually insert sequences via database
- Cannot build complete campaigns via API

### Fix Required

#### 1. Add Controller Functions

**File:** `mcp-server/src/controllers/campaign-controller.js`

```javascript
/**
 * Create email sequence step for template
 */
async function createEmailSequence(req, res) {
  const { id: template_id } = req.validatedParams;
  const data = { ...req.validatedBody, template_id };
  const userId = req.user?.id || 'anonymous';

  logger.info('Email sequence creation requested', {
    userId,
    templateId: template_id,
    stepNumber: data.step_number
  });

  // Verify template exists
  const template = await CampaignTemplate.findByPk(template_id);
  if (!template) {
    logger.warn('Sequence creation failed: template not found', { templateId: template_id });
    throw new NotFoundError('Campaign template');
  }

  const sequence = await EmailSequence.create(data);

  logger.info('Email sequence created successfully', {
    userId,
    sequenceId: sequence.id,
    templateId: template_id
  });

  res.status(201).json({
    success: true,
    data: sequence
  });
}

/**
 * Update email sequence step
 */
async function updateEmailSequence(req, res) {
  const { id: template_id, seqId } = req.validatedParams;
  const data = req.validatedBody;
  const userId = req.user?.id || 'anonymous';

  logger.info('Email sequence update requested', { userId, sequenceId: seqId });

  const sequence = await EmailSequence.findOne({
    where: { id: seqId, template_id }
  });

  if (!sequence) {
    logger.warn('Sequence update failed: not found', { sequenceId: seqId });
    throw new NotFoundError('Email sequence');
  }

  await sequence.update(data);

  logger.info('Email sequence updated successfully', { userId, sequenceId: seqId });

  res.json({
    success: true,
    data: sequence
  });
}

/**
 * Delete email sequence step
 */
async function deleteEmailSequence(req, res) {
  const { id: template_id, seqId } = req.validatedParams;
  const userId = req.user?.id || 'anonymous';

  logger.info('Email sequence deletion requested', { userId, sequenceId: seqId });

  const sequence = await EmailSequence.findOne({
    where: { id: seqId, template_id }
  });

  if (!sequence) {
    logger.warn('Sequence deletion failed: not found', { sequenceId: seqId });
    throw new NotFoundError('Email sequence');
  }

  await sequence.update({ is_active: false });

  logger.info('Email sequence deleted successfully', { userId, sequenceId: seqId });

  res.status(204).send();
}

// Similar functions for LinkedIn sequences:
// - createLinkedInSequence
// - updateLinkedInSequence
// - deleteLinkedInSequence
```

#### 2. Add Routes

**File:** `mcp-server/src/routes/campaigns.js`

```javascript
// Email sequence routes
router.post(
  '/templates/:id/sequences/email',
  validateParams(uuidParamSchema),
  validateBody(createEmailSequenceSchema),
  asyncHandler(controller.createEmailSequence)
);

router.put(
  '/templates/:id/sequences/email/:seqId',
  validateParams(z.object({
    id: z.string().uuid(),
    seqId: z.string().uuid()
  })),
  validateBody(updateEmailSequenceSchema),
  asyncHandler(controller.updateEmailSequence)
);

router.delete(
  '/templates/:id/sequences/email/:seqId',
  validateParams(z.object({
    id: z.string().uuid(),
    seqId: z.string().uuid()
  })),
  asyncHandler(controller.deleteEmailSequence)
);

// LinkedIn sequence routes
router.post(
  '/templates/:id/sequences/linkedin',
  validateParams(uuidParamSchema),
  validateBody(createLinkedInSequenceSchema),
  asyncHandler(controller.createLinkedInSequence)
);

router.put(
  '/templates/:id/sequences/linkedin/:seqId',
  validateParams(z.object({
    id: z.string().uuid(),
    seqId: z.string().uuid()
  })),
  validateBody(updateLinkedInSequenceSchema),
  asyncHandler(controller.updateLinkedInSequence)
);

router.delete(
  '/templates/:id/sequences/linkedin/:seqId',
  validateParams(z.object({
    id: z.string().uuid(),
    seqId: z.string().uuid()
  })),
  asyncHandler(controller.deleteLinkedInSequence)
);
```

#### 3. Export New Functions

**File:** `mcp-server/src/controllers/campaign-controller.js` (bottom)

```javascript
export {
  // ... existing exports ...
  createEmailSequence,
  updateEmailSequence,
  deleteEmailSequence,
  createLinkedInSequence,
  updateLinkedInSequence,
  deleteLinkedInSequence
};
```

### Verification
```bash
# Create email sequence
curl -X POST https://localhost:3457/api/campaigns/v2/templates/{id}/sequences/email \
  -H "Authorization: Bearer {token}" \
  -d '{
    "step_number": 1,
    "subject": "Follow-up",
    "body": "Hi {{first_name}}, ...",
    "delay_hours": 24
  }'
```

---

## BLOCKER #3: Missing Enrollment Management Endpoints

### Issue
**Severity:** BLOCKER
**Location:** New endpoints needed
**Time to Fix:** 2-3 hours

### Problem
Cannot enroll contacts in campaigns. Validators exist but no endpoints. Without this, campaigns cannot actually execute.

**Validators that exist:**
- `createEnrollmentSchema` (campaign-validator.js:183)
- `bulkEnrollSchema` (campaign-validator.js:192)

**Endpoints needed:**
- POST /instances/:id/enrollments
- POST /instances/:id/enrollments/bulk
- GET /instances/:id/enrollments
- GET /enrollments/:enrollmentId
- PATCH /enrollments/:enrollmentId (pause/resume)
- DELETE /enrollments/:enrollmentId (unenroll)

### Impact
- Campaigns can be created but not executed
- No way to add contacts to campaigns
- Core functionality completely missing

### Fix Required

#### 1. Add Controller Functions

**File:** `mcp-server/src/controllers/campaign-controller.js`

```javascript
/**
 * Enroll single contact in campaign
 */
async function createEnrollment(req, res) {
  const { id: instance_id } = req.validatedParams;
  const data = { ...req.validatedBody, instance_id };
  const userId = req.user?.id || 'anonymous';

  logger.info('Enrollment creation requested', {
    userId,
    instanceId: instance_id,
    contactId: data.contact_id
  });

  // Verify instance exists and is active
  const instance = await CampaignInstance.findByPk(instance_id);
  if (!instance) {
    throw new NotFoundError('Campaign instance');
  }

  if (instance.status !== 'active' && instance.status !== 'paused') {
    throw new ValidationError('Can only enroll in active or paused campaigns');
  }

  // Check if already enrolled
  const existing = await CampaignEnrollment.findOne({
    where: { instance_id, contact_id: data.contact_id }
  });

  if (existing) {
    throw new ConflictError('Contact already enrolled in this campaign');
  }

  const enrollment = await CampaignEnrollment.create(data);

  logger.info('Enrollment created successfully', {
    userId,
    enrollmentId: enrollment.id,
    contactId: data.contact_id
  });

  res.status(201).json({
    success: true,
    data: enrollment
  });
}

/**
 * Bulk enroll contacts
 */
async function bulkEnroll(req, res) {
  const { id: instance_id } = req.validatedParams;
  const { contact_ids, metadata } = req.validatedBody;
  const userId = req.user?.id || 'anonymous';

  logger.info('Bulk enrollment requested', {
    userId,
    instanceId: instance_id,
    contactCount: contact_ids.length
  });

  const instance = await CampaignInstance.findByPk(instance_id);
  if (!instance) {
    throw new NotFoundError('Campaign instance');
  }

  if (instance.status !== 'active' && instance.status !== 'paused') {
    throw new ValidationError('Can only enroll in active or paused campaigns');
  }

  // Create enrollments in transaction
  const enrollments = await sequelize.transaction(async (t) => {
    const created = [];
    for (const contact_id of contact_ids) {
      // Check if already enrolled
      const existing = await CampaignEnrollment.findOne({
        where: { instance_id, contact_id },
        transaction: t
      });

      if (!existing) {
        const enrollment = await CampaignEnrollment.create({
          instance_id,
          contact_id,
          metadata: metadata || {},
          status: 'active',
          current_step: 0
        }, { transaction: t });
        created.push(enrollment);
      }
    }
    return created;
  });

  logger.info('Bulk enrollment completed', {
    userId,
    instanceId: instance_id,
    enrolled: enrollments.length,
    requested: contact_ids.length
  });

  res.status(201).json({
    success: true,
    data: {
      enrolled: enrollments.length,
      total: contact_ids.length,
      enrollments
    }
  });
}

/**
 * List enrollments for campaign instance
 */
async function listEnrollments(req, res) {
  const { id: instance_id } = req.validatedParams;
  const { page, limit, status } = req.validatedQuery;

  const offset = (page - 1) * limit;
  const where = { instance_id };
  if (status) where.status = status;

  const { rows: enrollments, count: total } = await CampaignEnrollment.findAndCountAll({
    where,
    limit,
    offset,
    order: [['created_at', 'DESC']]
  });

  res.json({
    success: true,
    data: enrollments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}
```

#### 2. Add Routes

**File:** `mcp-server/src/routes/campaigns.js`

```javascript
// Enrollment routes
router.post(
  '/instances/:id/enrollments',
  validateParams(uuidParamSchema),
  validateBody(createEnrollmentSchema),
  asyncHandler(controller.createEnrollment)
);

router.post(
  '/instances/:id/enrollments/bulk',
  validateParams(uuidParamSchema),
  validateBody(bulkEnrollSchema),
  asyncHandler(controller.bulkEnroll)
);

router.get(
  '/instances/:id/enrollments',
  validateParams(uuidParamSchema),
  validateQuery(z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['active', 'paused', 'completed', 'failed']).optional()
  })),
  asyncHandler(controller.listEnrollments)
);
```

### Verification
```bash
# Enroll single contact
curl -X POST https://localhost:3457/api/campaigns/v2/instances/{id}/enrollments \
  -H "Authorization: Bearer {token}" \
  -d '{
    "contact_id": "123e4567-e89b-12d3-a456-426614174000",
    "metadata": {"source": "manual"}
  }'

# Bulk enroll
curl -X POST https://localhost:3457/api/campaigns/v2/instances/{id}/enrollments/bulk \
  -H "Authorization: Bearer {token}" \
  -d '{
    "contact_ids": ["uuid1", "uuid2", "uuid3"]
  }'
```

---

## BLOCKER #4: Missing Event Tracking Endpoints

### Issue
**Severity:** BLOCKER
**Location:** New endpoints needed
**Time to Fix:** 1-2 hours

### Problem
Validator exists for event tracking, but no endpoint to receive webhook events. Performance analytics endpoint will always return empty data.

**Validator that exists:**
- `createEventSchema` (campaign-validator.js:212)

**Endpoints needed:**
- POST /events/webhook (receive events from email/LinkedIn providers)
- GET /enrollments/:id/events (list events for an enrollment)

### Impact
- Cannot track campaign performance
- Analytics endpoint returns no data
- No visibility into campaign execution

### Fix Required

#### 1. Add Controller Function

**File:** `mcp-server/src/controllers/campaign-controller.js`

```javascript
/**
 * Record campaign event (webhook receiver)
 */
async function createEvent(req, res) {
  const data = req.validatedBody;
  const userId = req.user?.id || 'anonymous';

  logger.info('Campaign event received', {
    userId,
    enrollmentId: data.enrollment_id,
    eventType: data.event_type
  });

  // Verify enrollment exists
  const enrollment = await CampaignEnrollment.findByPk(data.enrollment_id);
  if (!enrollment) {
    logger.warn('Event creation failed: enrollment not found', {
      enrollmentId: data.enrollment_id
    });
    throw new NotFoundError('Campaign enrollment');
  }

  const event = await CampaignEvent.create(data);

  logger.info('Campaign event recorded successfully', {
    userId,
    eventId: event.id,
    enrollmentId: data.enrollment_id,
    eventType: data.event_type
  });

  res.status(201).json({
    success: true,
    data: event
  });
}

/**
 * List events for enrollment
 */
async function listEnrollmentEvents(req, res) {
  const { id: enrollment_id } = req.validatedParams;
  const { page, limit, event_type } = req.validatedQuery;

  const offset = (page - 1) * limit;
  const where = { enrollment_id };
  if (event_type) where.event_type = event_type;

  const { rows: events, count: total } = await CampaignEvent.findAndCountAll({
    where,
    limit,
    offset,
    order: [['occurred_at', 'DESC']]
  });

  res.json({
    success: true,
    data: events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}
```

#### 2. Add Routes

**File:** `mcp-server/src/routes/campaigns.js`

```javascript
// Event tracking routes
router.post(
  '/events/webhook',
  validateBody(createEventSchema),
  asyncHandler(controller.createEvent)
);

router.get(
  '/enrollments/:id/events',
  validateParams(uuidParamSchema),
  validateQuery(z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    event_type: z.enum(['sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed']).optional()
  })),
  asyncHandler(controller.listEnrollmentEvents)
);
```

### Verification
```bash
# Record event
curl -X POST https://localhost:3457/api/campaigns/v2/events/webhook \
  -H "Authorization: Bearer {token}" \
  -d '{
    "enrollment_id": "uuid",
    "event_type": "opened",
    "occurred_at": "2025-11-09T13:00:00Z"
  }'
```

---

## BLOCKER #5: No Database Migrations

### Issue
**Severity:** BLOCKER
**Location:** Missing migration files
**Time to Fix:** 2-3 hours

### Problem
Models define schema using Sequelize `sync()`, but production explicitly warns against this. No migration files exist to safely deploy schema changes.

**Current state:**
- models/index.js uses `sequelize.sync()` (line 113)
- Warning: "Should not be used in production!" (line 109)
- No migrations directory with versioned changes

### Impact
- Cannot safely deploy schema changes
- Schema drift between environments
- Rollback impossible
- Production deployment blocked

### Fix Required

#### 1. Install Sequelize CLI

```bash
cd mcp-server
npm install --save-dev sequelize-cli
```

#### 2. Create Sequelize Config

**File:** `mcp-server/.sequelizerc`

```javascript
const path = require('path');

module.exports = {
  'config': path.resolve('src', 'db', 'config.js'),
  'models-path': path.resolve('src', 'models'),
  'migrations-path': path.resolve('src', 'db', 'migrations'),
  'seeders-path': path.resolve('src', 'db', 'seeders')
};
```

**File:** `mcp-server/src/db/config.js`

```javascript
module.exports = {
  development: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'rtgs_sales_automation',
    username: process.env.POSTGRES_USER || 'rtgs_user',
    password: process.env.POSTGRES_PASSWORD || 'rtgs_password_dev',
    dialect: 'postgres',
    logging: console.log
  },
  production: {
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT),
    database: process.env.POSTGRES_DB,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    }
  }
};
```

#### 3. Create Initial Migration

```bash
npx sequelize-cli migration:generate --name create-campaign-tables
```

**File:** `mcp-server/src/db/migrations/YYYYMMDDHHMMSS-create-campaign-tables.js`

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create campaign_templates table
    await queryInterface.createTable('campaign_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      path_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      icp_profile_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      settings: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      created_by: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create campaign_instances table
    await queryInterface.createTable('campaign_instances', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'campaign_templates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'draft'
      },
      provider_config: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      paused_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create email_sequences table
    await queryInterface.createTable('email_sequences', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'campaign_templates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      step_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      subject: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      delay_hours: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      a_b_variant: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create linkedin_sequences table
    await queryInterface.createTable('linkedin_sequences', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'campaign_templates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      step_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      message: {
        type: Sequelize.STRING(1500),
        allowNull: true
      },
      delay_hours: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create campaign_enrollments table
    await queryInterface.createTable('campaign_enrollments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      instance_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'campaign_instances',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      contact_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'active'
      },
      current_step: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create campaign_events table
    await queryInterface.createTable('campaign_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      enrollment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'campaign_enrollments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      event_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      step_number: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      occurred_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create indexes
    await queryInterface.addIndex('campaign_templates', ['type']);
    await queryInterface.addIndex('campaign_templates', ['path_type']);
    await queryInterface.addIndex('campaign_templates', ['is_active']);

    await queryInterface.addIndex('campaign_instances', ['template_id']);
    await queryInterface.addIndex('campaign_instances', ['status']);
    await queryInterface.addIndex('campaign_instances', ['is_active']);

    await queryInterface.addIndex('email_sequences', ['template_id']);
    await queryInterface.addIndex('email_sequences', ['template_id', 'step_number']);

    await queryInterface.addIndex('linkedin_sequences', ['template_id']);
    await queryInterface.addIndex('linkedin_sequences', ['template_id', 'step_number']);

    await queryInterface.addIndex('campaign_enrollments', ['instance_id']);
    await queryInterface.addIndex('campaign_enrollments', ['contact_id']);
    await queryInterface.addIndex('campaign_enrollments', ['instance_id', 'contact_id'], { unique: true });
    await queryInterface.addIndex('campaign_enrollments', ['status']);

    await queryInterface.addIndex('campaign_events', ['enrollment_id']);
    await queryInterface.addIndex('campaign_events', ['event_type']);
    await queryInterface.addIndex('campaign_events', ['occurred_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('campaign_events');
    await queryInterface.dropTable('campaign_enrollments');
    await queryInterface.dropTable('linkedin_sequences');
    await queryInterface.dropTable('email_sequences');
    await queryInterface.dropTable('campaign_instances');
    await queryInterface.dropTable('campaign_templates');
  }
};
```

#### 4. Run Migration

```bash
# Development
npx sequelize-cli db:migrate

# Production
NODE_ENV=production npx sequelize-cli db:migrate

# Rollback if needed
npx sequelize-cli db:migrate:undo
```

#### 5. Update models/index.js

**File:** `mcp-server/src/models/index.js`

```javascript
// Remove sync() calls in production
async function syncDatabase(options = {}) {
  try {
    console.log('[Models] Syncing database schema...');

    if (process.env.NODE_ENV === 'production') {
      console.warn('[Models] ⚠️  Use migrations in production! Skipping sync().');
      return false; // Don't sync in production
    }

    await sequelize.sync(options);
    console.log('[Models] ✅ Database schema synced');
    return true;
  } catch (error) {
    console.error('[Models] ❌ Database sync failed:', error.message);
    throw error;
  }
}
```

### Verification
```bash
# Check migration status
npx sequelize-cli db:migrate:status

# Verify tables exist
psql -U rtgs_user -d rtgs_sales_automation -c "\dt"
```

---

## Implementation Order

### Phase 1: Critical Bug Fix (30 min)
1. Fix transaction bug in CampaignInstance.cjs ✅

### Phase 2: Missing Endpoints (6-9 hours)
2. Add sequence management endpoints (3-4 hours)
3. Add enrollment management endpoints (2-3 hours)
4. Add event tracking endpoints (1-2 hours)

### Phase 3: Production Safety (2-3 hours)
5. Create database migrations (2-3 hours)

### Phase 4: Testing & Verification (2-3 hours)
6. Test all new endpoints
7. Verify transactions work correctly
8. Run migration in test environment
9. Test rollback procedures

---

## Success Criteria

After completing all fixes, the API should:

✅ Pass all transaction atomicity tests
✅ Support full campaign lifecycle (create template → add sequences → create instance → enroll contacts → track events)
✅ Have database migrations for production deployment
✅ Score 90+ on work-critic review
✅ Be production-ready with all BLOCKER issues resolved

---

## Timeline

**Total Estimated Time:** 14-16 hours

- Day 1 (8 hours): Fix transaction bug + Sequence endpoints + Start enrollment endpoints
- Day 2 (6-8 hours): Complete enrollment endpoints + Event endpoints + Migrations + Testing

---

## Next Steps

1. Review this plan with stakeholders
2. Prioritize which blockers to fix first
3. Begin implementation starting with transaction bug
4. Test each fix before moving to next
5. Run work-critic again after all fixes complete

**Ready to begin implementation?**
