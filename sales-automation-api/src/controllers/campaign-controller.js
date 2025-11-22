/**
 * Campaign Controller
 * Business logic for campaign operations
 */

// Import models (ES6)
import {
  CampaignTemplate,
  CampaignInstance,
  EmailSequence,
  LinkedInSequence,
  CampaignEnrollment,
  CampaignEvent,
  sequelize
} from '../models/index.js';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import Sequelize operators
import Sequelize from 'sequelize';
const { Op } = Sequelize;

// Import logger
import { createLogger } from '../utils/logger.js';
const logger = createLogger('CampaignController');

// Import error classes
import {
  NotFoundError,
  ValidationError,
  ConflictError
} from '../middleware/campaign-error-handler.js';

// Import orphaned event queue for retry mechanism
import OrphanedEventQueue from '../services/OrphanedEventQueue.js';

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

/**
 * OrphanedEventError - Thrown when event arrives before enrollment exists
 * Caught and handled with 202 response to queue for retry
 */
class OrphanedEventError extends Error {
  constructor(enrollmentId) {
    super(`Enrollment ${enrollmentId} not found - event orphaned`);
    this.name = 'OrphanedEventError';
    this.enrollmentId = enrollmentId;
  }
}

// ============================================================================
// CAMPAIGN TEMPLATES
// ============================================================================

/**
 * Create new campaign template
 */
async function createTemplate(req, res) {
  const data = req.validatedBody;
  const userId = req.user?.id || 'anonymous';

  logger.info('Template creation requested', { userId, templateName: data.name });

  const template = await CampaignTemplate.create(data);

  logger.info('Template created successfully', {
    userId,
    templateId: template.id,
    templateName: template.name
  });

  res.status(201).json({
    success: true,
    data: template
  });
}

/**
 * List all campaign templates with pagination
 */
async function listTemplates(req, res) {
  const { page, limit, type, path_type, is_active } = req.validatedQuery;

  const offset = (page - 1) * limit;
  const where = {};

  if (type) where.type = type;
  if (path_type) where.path_type = path_type;
  if (is_active !== undefined) where.is_active = is_active;

  const { rows: templates, count: total } = await CampaignTemplate.findAndCountAll({
    where,
    limit,
    offset,
    order: [['created_at', 'DESC']],
    include: [
      {
        model: EmailSequence,
        as: 'email_sequences',
        attributes: ['id', 'step_number', 'subject', 'delay_hours'],
        where: { is_active: true },
        required: false
      },
      {
        model: LinkedInSequence,
        as: 'linkedin_sequences',
        attributes: ['id', 'step_number', 'type', 'delay_hours'],
        where: { is_active: true },
        required: false
      }
    ]
  });

  res.json({
    success: true,
    data: templates,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}

/**
 * Get single template with sequences
 */
async function getTemplate(req, res) {
  const { id } = req.validatedParams;

  const template = await CampaignTemplate.findByPk(id, {
    include: [
      {
        model: EmailSequence,
        as: 'email_sequences',
        separate: true,  // Allows ordering in separate query
        order: [['step_number', 'ASC']]
      },
      {
        model: LinkedInSequence,
        as: 'linkedin_sequences',
        separate: true,
        order: [['step_number', 'ASC']]
      },
      {
        model: CampaignInstance,
        as: 'instances',
        attributes: ['id', 'name', 'status', 'created_at'],
        separate: true,
        limit: 5,
        order: [['created_at', 'DESC']]
      }
    ]
  });

  if (!template) {
    throw new NotFoundError('Campaign template');
  }

  res.json({
    success: true,
    data: template
  });
}

/**
 * Update existing template
 */
async function updateTemplate(req, res) {
  const { id } = req.validatedParams;
  const data = req.validatedBody;
  const userId = req.user?.id || 'anonymous';

  logger.info('Template update requested', { templateId: id, userId });

  const template = await CampaignTemplate.findByPk(id);

  if (!template) {
    logger.warn('Template update failed: not found', { templateId: id, userId });
    throw new NotFoundError('Campaign template');
  }

  await template.update(data);

  logger.info('Template updated successfully', {
    templateId: id,
    userId,
    templateName: template.name
  });

  res.json({
    success: true,
    data: template
  });
}

/**
 * Soft delete template (set is_active = false)
 * Uses transaction with row locking to prevent race conditions
 */
async function deleteTemplate(req, res) {
  const { id } = req.validatedParams;
  const userId = req.user?.id || 'anonymous';

  logger.info('Template deletion requested', { templateId: id, userId });

  // Use transaction with row locking to prevent race conditions
  await sequelize.transaction(async (t) => {
    // Lock the template row for update
    const template = await CampaignTemplate.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!template) {
      logger.warn('Template deletion failed: not found', { templateId: id, userId });
      throw new NotFoundError('Campaign template');
    }

    // Check if template has active instances (with transaction)
    const activeInstances = await CampaignInstance.count({
      where: {
        template_id: id,
        status: 'active'
      },
      transaction: t
    });

    if (activeInstances > 0) {
      logger.warn('Template deletion blocked: active instances exist', {
        templateId: id,
        userId,
        activeInstances
      });
      throw new ConflictError(
        `Cannot delete template with ${activeInstances} active campaign(s)`,
        { activeInstances }
      );
    }

    // Soft delete
    await template.update({ is_active: false }, { transaction: t });

    logger.info('Template deleted successfully', {
      templateId: id,
      userId,
      templateName: template.name
    });
  });

  res.status(204).send();
}

// ============================================================================
// CAMPAIGN INSTANCES
// ============================================================================

/**
 * List all campaign instances with pagination
 */
async function listInstances(req, res) {
  const { page, limit, status, template_id } = req.validatedQuery;

  const offset = (page - 1) * limit;
  const where = {};

  if (status) where.status = status;
  if (template_id) where.template_id = template_id;

  const { rows: instances, count: total } = await CampaignInstance.findAndCountAll({
    where,
    limit,
    offset,
    order: [['created_at', 'DESC']],
    include: [
      {
        model: CampaignTemplate,
        as: 'template',
        attributes: ['id', 'name', 'type', 'path_type']
      }
    ]
  });

  res.json({
    success: true,
    data: instances,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}

/**
 * Start new campaign from template
 * Uses transaction to ensure template validation and instance creation are atomic
 */
async function createInstance(req, res) {
  const { template_id, name, provider_config } = req.validatedBody;
  const userId = req.user?.id || 'anonymous';

  logger.info('Campaign instance creation requested', {
    userId,
    templateId: template_id,
    instanceName: name
  });

  // Use transaction to ensure atomic validation and creation
  const instance = await sequelize.transaction(async (t) => {
    // Verify template exists and is active (with transaction)
    const template = await CampaignTemplate.findByPk(template_id, {
      transaction: t
    });

    if (!template) {
      logger.warn('Instance creation failed: template not found', {
        userId,
        templateId: template_id
      });
      throw new NotFoundError('Campaign template');
    }

    if (!template.is_active) {
      logger.warn('Instance creation failed: template inactive', {
        userId,
        templateId: template_id
      });
      throw new ValidationError('Cannot create instance from inactive template');
    }

    // Verify template has sequences (with transaction)
    const emailSeqCount = await EmailSequence.count({
      where: { template_id, is_active: true },
      transaction: t
    });
    const linkedinSeqCount = await LinkedInSequence.count({
      where: { template_id, is_active: true },
      transaction: t
    });

    if (emailSeqCount === 0 && linkedinSeqCount === 0) {
      logger.warn('Instance creation failed: no active sequences', {
        userId,
        templateId: template_id
      });
      throw new ValidationError('Template must have at least one sequence step');
    }

    // Create instance (within transaction)
    const newInstance = await CampaignInstance.create({
      template_id,
      name,
      provider_config: provider_config || {},
      status: 'draft'
    }, { transaction: t });

    logger.info('Campaign instance created successfully', {
      userId,
      instanceId: newInstance.id,
      templateId: template_id,
      instanceName: name
    });

    return newInstance;
  });

  // Load template for response (outside transaction)
  await instance.reload({ include: [{ model: CampaignTemplate, as: 'template' }] });

  res.status(201).json({
    success: true,
    data: instance
  });
}

/**
 * Get campaign instance with statistics
 */
async function getInstance(req, res) {
  const { id } = req.validatedParams;

  const instance = await CampaignInstance.findByPk(id, {
    include: [
      {
        model: CampaignTemplate,
        as: 'template',
        include: [
          { model: EmailSequence, as: 'email_sequences' },
          { model: LinkedInSequence, as: 'linkedin_sequences' }
        ]
      },
      {
        model: CampaignEnrollment,
        as: 'enrollments',
        attributes: ['id', 'status', 'current_step', 'enrolled_at'],
        limit: 10,
        order: [['enrolled_at', 'DESC']]
      }
    ]
  });

  if (!instance) {
    throw new NotFoundError('Campaign instance');
  }

  // Add computed metrics
  const data = instance.toJSON();
  data.metrics = instance.getMetrics();

  res.json({
    success: true,
    data
  });
}

/**
 * Update instance status (pause/resume/complete)
 * Uses transaction to ensure status transitions are atomic
 */
async function updateInstanceStatus(req, res) {
  const { id } = req.validatedParams;
  const { status } = req.validatedBody;
  const userId = req.user?.id || 'anonymous';

  logger.info('Instance status update requested', {
    userId,
    instanceId: id,
    newStatus: status
  });

  // Use transaction to ensure atomic status transition
  await sequelize.transaction(async (t) => {
    // Lock instance for update to prevent race conditions
    const instance = await CampaignInstance.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!instance) {
      logger.warn('Instance status update failed: not found', {
        userId,
        instanceId: id
      });
      throw new NotFoundError('Campaign instance');
    }

    // Validate status transitions
    const validTransitions = {
      draft: ['active'],
      active: ['paused', 'completed'],
      paused: ['active', 'completed'],
      completed: [],
      failed: []
    };

    const allowedTransitions = validTransitions[instance.status];

    if (!allowedTransitions.includes(status)) {
      logger.warn('Instance status update failed: invalid transition', {
        userId,
        instanceId: id,
        currentStatus: instance.status,
        requestedStatus: status,
        allowedTransitions
      });
      throw new ValidationError(
        `Cannot transition from '${instance.status}' to '${status}'`,
        { currentStatus: instance.status, requestedStatus: status, allowedTransitions }
      );
    }

    // Store old status before update
    const oldStatus = instance.status;

    // Apply status change using instance methods (within transaction)
    switch (status) {
      case 'active':
        await instance.start({ transaction: t });
        break;
      case 'paused':
        await instance.pause({ transaction: t });
        break;
      case 'completed':
        await instance.complete({ transaction: t });
        break;
      default:
        await instance.update({ status }, { transaction: t });
    }

    logger.info('Instance status updated successfully', {
      userId,
      instanceId: id,
      oldStatus,
      newStatus: status
    });
  });

  // Reload instance to get updated data
  const updatedInstance = await CampaignInstance.findByPk(id);

  res.json({
    success: true,
    data: updatedInstance
  });
}

/**
 * Get detailed performance analytics
 */
async function getInstancePerformance(req, res) {
  const { id } = req.validatedParams;

  const instance = await CampaignInstance.findByPk(id, {
    include: [
      { model: CampaignTemplate, as: 'template' }
    ]
  });

  if (!instance) {
    throw new NotFoundError('Campaign instance');
  }

  // Calculate metrics from instance counters
  const metrics = instance.getMetrics();

  // Use SQL aggregation for enrollment status breakdown
  const enrollmentStatusQuery = await CampaignEnrollment.findAll({
    where: { instance_id: id },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['status'],
    raw: true
  });

  const enrollmentStatus = enrollmentStatusQuery.reduce((acc, row) => {
    acc[row.status] = parseInt(row.count, 10);
    return acc;
  }, {});

  // Use SQL aggregation for event breakdown by channel and type
  const eventBreakdownQuery = await sequelize.query(`
    SELECT
      channel,
      event_type,
      COUNT(*) as count
    FROM campaign_events ce
    INNER JOIN campaign_enrollments enr ON ce.enrollment_id = enr.id
    WHERE enr.instance_id = :instanceId
    GROUP BY channel, event_type
  `, {
    replacements: { instanceId: id },
    type: Sequelize.QueryTypes.SELECT
  });

  const eventBreakdown = eventBreakdownQuery.reduce((acc, row) => {
    const key = `${row.channel}_${row.event_type}`;
    acc[key] = parseInt(row.count, 10);
    return acc;
  }, {});

  // Use SQL aggregation for time series (events per day)
  // Use database-agnostic DATE function via Sequelize.fn
  const timeSeriesQuery = await sequelize.query(`
    SELECT
      DATE(timestamp) as date,
      COUNT(*) as events
    FROM campaign_events ce
    INNER JOIN campaign_enrollments enr ON ce.enrollment_id = enr.id
    WHERE enr.instance_id = :instanceId
    GROUP BY DATE(timestamp)
    ORDER BY date ASC
  `, {
    replacements: { instanceId: id },
    type: Sequelize.QueryTypes.SELECT
  });

  const timeSeries = timeSeriesQuery.map(row => ({
    date: row.date,
    events: parseInt(row.events, 10)
  }));

  // Use SQL aggregation for funnel data
  const funnelQuery = await sequelize.query(`
    SELECT
      event_type,
      COUNT(*) as count
    FROM campaign_events ce
    INNER JOIN campaign_enrollments enr ON ce.enrollment_id = enr.id
    WHERE enr.instance_id = :instanceId
      AND event_type IN ('sent', 'delivered', 'opened', 'clicked', 'replied')
    GROUP BY event_type
  `, {
    replacements: { instanceId: id },
    type: Sequelize.QueryTypes.SELECT
  });

  const funnelCounts = funnelQuery.reduce((acc, row) => {
    acc[row.event_type] = parseInt(row.count, 10);
    return acc;
  }, {});

  const funnel = {
    enrolled: Object.values(enrollmentStatus).reduce((sum, count) => sum + count, 0),
    sent: funnelCounts.sent || 0,
    delivered: funnelCounts.delivered || 0,
    opened: funnelCounts.opened || 0,
    clicked: funnelCounts.clicked || 0,
    replied: funnelCounts.replied || 0
  };

  // Use SQL aggregation for step performance
  const stepPerformanceQuery = await sequelize.query(`
    SELECT
      step_number,
      event_type,
      COUNT(*) as count
    FROM campaign_events ce
    INNER JOIN campaign_enrollments enr ON ce.enrollment_id = enr.id
    WHERE enr.instance_id = :instanceId
      AND step_number IS NOT NULL
    GROUP BY step_number, event_type
    ORDER BY step_number ASC
  `, {
    replacements: { instanceId: id },
    type: Sequelize.QueryTypes.SELECT
  });

  // Transform step performance into structured format
  const stepPerformanceMap = {};
  stepPerformanceQuery.forEach(row => {
    const step = row.step_number;
    if (!stepPerformanceMap[step]) {
      stepPerformanceMap[step] = { step, events: {} };
    }
    stepPerformanceMap[step].events[row.event_type] = parseInt(row.count, 10);
  });

  res.json({
    success: true,
    data: {
      instance: {
        id: instance.id,
        name: instance.name,
        status: instance.status,
        started_at: instance.started_at
      },
      metrics,
      eventBreakdown,
      timeSeries,
      funnel,
      stepPerformance: Object.values(stepPerformanceMap),
      enrollmentStatus
    }
  });
}

// ============================================================================
// EMAIL SEQUENCE MANAGEMENT
// ============================================================================

/**
 * Create email sequence step for template
 */
async function createEmailSequence(req, res) {
  const { id } = req.validatedParams;
  const sequenceData = { ...req.validatedBody, template_id: id };
  const userId = req.user?.id || 'anonymous';

  logger.info('Email sequence creation requested', {
    userId,
    templateId: id,
    stepNumber: sequenceData.step_number
  });

  const sequence = await sequelize.transaction(async (t) => {
    // Verify template exists
    const template = await CampaignTemplate.findByPk(id, { transaction: t });

    if (!template) {
      logger.warn('Email sequence creation failed: template not found', {
        userId,
        templateId: id
      });
      throw new NotFoundError('Campaign template');
    }

    // Create sequence
    const newSequence = await EmailSequence.create(sequenceData, { transaction: t });

    logger.info('Email sequence created successfully', {
      userId,
      templateId: id,
      sequenceId: newSequence.id,
      stepNumber: newSequence.step_number
    });

    return newSequence;
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
  const { id } = req.validatedParams;
  const updateData = req.validatedBody;
  const userId = req.user?.id || 'anonymous';

  logger.info('Email sequence update requested', {
    userId,
    sequenceId: id
  });

  const sequence = await sequelize.transaction(async (t) => {
    const existingSequence = await EmailSequence.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

    if (!existingSequence) {
      logger.warn('Email sequence update failed: not found', {
        userId,
        sequenceId: id
      });
      throw new NotFoundError('Email sequence');
    }

    await existingSequence.update(updateData, { transaction: t });

    logger.info('Email sequence updated successfully', {
      userId,
      sequenceId: id,
      templateId: existingSequence.template_id
    });

    return existingSequence;
  });

  res.json({
    success: true,
    data: sequence
  });
}

/**
 * Delete email sequence step
 */
async function deleteEmailSequence(req, res) {
  const { id } = req.validatedParams;
  const userId = req.user?.id || 'anonymous';

  logger.info('Email sequence deletion requested', {
    userId,
    sequenceId: id
  });

  await sequelize.transaction(async (t) => {
    const sequence = await EmailSequence.findByPk(id, { transaction: t });

    if (!sequence) {
      logger.warn('Email sequence deletion failed: not found', {
        userId,
        sequenceId: id
      });
      throw new NotFoundError('Email sequence');
    }

    await sequence.destroy({ transaction: t });

    logger.info('Email sequence deleted successfully', {
      userId,
      sequenceId: id,
      templateId: sequence.template_id
    });
  });

  res.status(204).send();
}

// ============================================================================
// LINKEDIN SEQUENCE MANAGEMENT
// ============================================================================

/**
 * Create LinkedIn sequence step for template
 */
async function createLinkedInSequence(req, res) {
  const { id } = req.validatedParams;
  const sequenceData = { ...req.validatedBody, template_id: id };
  const userId = req.user?.id || 'anonymous';

  logger.info('LinkedIn sequence creation requested', {
    userId,
    templateId: id,
    stepNumber: sequenceData.step_number
  });

  const sequence = await sequelize.transaction(async (t) => {
    // Verify template exists
    const template = await CampaignTemplate.findByPk(id, { transaction: t });

    if (!template) {
      logger.warn('LinkedIn sequence creation failed: template not found', {
        userId,
        templateId: id
      });
      throw new NotFoundError('Campaign template');
    }

    // Create sequence
    const newSequence = await LinkedInSequence.create(sequenceData, { transaction: t });

    logger.info('LinkedIn sequence created successfully', {
      userId,
      templateId: id,
      sequenceId: newSequence.id,
      stepNumber: newSequence.step_number
    });

    return newSequence;
  });

  res.status(201).json({
    success: true,
    data: sequence
  });
}

/**
 * Update LinkedIn sequence step
 */
async function updateLinkedInSequence(req, res) {
  const { id } = req.validatedParams;
  const updateData = req.validatedBody;
  const userId = req.user?.id || 'anonymous';

  logger.info('LinkedIn sequence update requested', {
    userId,
    sequenceId: id
  });

  const sequence = await sequelize.transaction(async (t) => {
    const existingSequence = await LinkedInSequence.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

    if (!existingSequence) {
      logger.warn('LinkedIn sequence update failed: not found', {
        userId,
        sequenceId: id
      });
      throw new NotFoundError('LinkedIn sequence');
    }

    await existingSequence.update(updateData, { transaction: t });

    logger.info('LinkedIn sequence updated successfully', {
      userId,
      sequenceId: id,
      templateId: existingSequence.template_id
    });

    return existingSequence;
  });

  res.json({
    success: true,
    data: sequence
  });
}

/**
 * Delete LinkedIn sequence step
 */
async function deleteLinkedInSequence(req, res) {
  const { id } = req.validatedParams;
  const userId = req.user?.id || 'anonymous';

  logger.info('LinkedIn sequence deletion requested', {
    userId,
    sequenceId: id
  });

  await sequelize.transaction(async (t) => {
    const sequence = await LinkedInSequence.findByPk(id, { transaction: t });

    if (!sequence) {
      logger.warn('LinkedIn sequence deletion failed: not found', {
        userId,
        sequenceId: id
      });
      throw new NotFoundError('LinkedIn sequence');
    }

    await sequence.destroy({ transaction: t });

    logger.info('LinkedIn sequence deleted successfully', {
      userId,
      sequenceId: id,
      templateId: sequence.template_id
    });
  });

  res.status(204).send();
}

// ============================================================================
// ENROLLMENT MANAGEMENT
// ============================================================================

/**
 * Create enrollment - enroll a contact in a campaign instance
 */
async function createEnrollment(req, res) {
  const { id } = req.validatedParams;
  const enrollmentData = { ...req.validatedBody, instance_id: id };
  const userId = req.user?.id || 'anonymous';

  logger.info('Enrollment creation requested', {
    userId,
    instanceId: id,
    contactId: enrollmentData.contact_id
  });

  const enrollment = await sequelize.transaction(async (t) => {
    // Verify instance exists and is active
    const instance = await CampaignInstance.findByPk(id, { transaction: t });

    if (!instance) {
      logger.warn('Enrollment creation failed: instance not found', {
        userId,
        instanceId: id
      });
      throw new NotFoundError('Campaign instance');
    }

    if (instance.status !== 'active') {
      logger.warn('Enrollment creation failed: instance not active', {
        userId,
        instanceId: id,
        instanceStatus: instance.status
      });
      throw new ValidationError('Cannot enroll in non-active campaign', {
        instanceStatus: instance.status
      });
    }

    // PHASE 3 FIX (P3.2): Use findOrCreate to prevent race condition
    // This is atomic and leverages the unique constraint on (instance_id, contact_id)
    const [newEnrollment, created] = await CampaignEnrollment.findOrCreate({
      where: {
        instance_id: id,
        contact_id: enrollmentData.contact_id
      },
      defaults: enrollmentData,
      transaction: t
    });

    if (!created) {
      logger.warn('Enrollment creation failed: duplicate enrollment', {
        userId,
        instanceId: id,
        contactId: enrollmentData.contact_id,
        existingEnrollmentId: newEnrollment.id
      });
      throw new ConflictError('Contact already enrolled in this campaign', {
        enrollmentId: newEnrollment.id
      });
    }

    // Increment instance enrollment counter
    await instance.increment('total_enrolled', { by: 1, transaction: t });

    logger.info('Enrollment created successfully', {
      userId,
      instanceId: id,
      enrollmentId: newEnrollment.id,
      contactId: newEnrollment.contact_id
    });

    return newEnrollment;
  });

  res.status(201).json({
    success: true,
    data: enrollment
  });
}

/**
 * Bulk enroll multiple contacts
 */
async function bulkEnroll(req, res) {
  const { id } = req.validatedParams;
  const { contact_ids } = req.validatedBody;
  const userId = req.user?.id || 'anonymous';

  logger.info('Bulk enrollment requested', {
    userId,
    instanceId: id,
    contactCount: contact_ids.length
  });

  const results = await sequelize.transaction(async (t) => {
    // Verify instance exists and is active
    const instance = await CampaignInstance.findByPk(id, { transaction: t });

    if (!instance) {
      logger.warn('Bulk enrollment failed: instance not found', {
        userId,
        instanceId: id
      });
      throw new NotFoundError('Campaign instance');
    }

    if (instance.status !== 'active') {
      logger.warn('Bulk enrollment failed: instance not active', {
        userId,
        instanceId: id,
        instanceStatus: instance.status
      });
      throw new ValidationError('Cannot enroll in non-active campaign', {
        instanceStatus: instance.status
      });
    }

    // Get existing enrollments to avoid duplicates
    const existingEnrollments = await CampaignEnrollment.findAll({
      where: {
        instance_id: id,
        contact_id: contact_ids
      },
      attributes: ['contact_id'],
      transaction: t
    });

    const existingContactIds = new Set(existingEnrollments.map(e => e.contact_id));

    // Filter out duplicates
    const newContactIds = contact_ids.filter(cid => !existingContactIds.has(cid));

    if (newContactIds.length === 0) {
      logger.warn('Bulk enrollment: all contacts already enrolled', {
        userId,
        instanceId: id,
        totalContacts: contact_ids.length
      });
      return {
        created: 0,
        skipped: contact_ids.length,
        enrollments: []
      };
    }

    // Create enrollments
    const enrollmentsToCreate = newContactIds.map(contact_id => ({
      instance_id: id,
      contact_id,
      metadata: {}
    }));

    const newEnrollments = await CampaignEnrollment.bulkCreate(enrollmentsToCreate, { transaction: t });

    // Update instance counter
    await instance.increment('total_enrolled', { by: newEnrollments.length, transaction: t });

    logger.info('Bulk enrollment completed', {
      userId,
      instanceId: id,
      created: newEnrollments.length,
      skipped: existingContactIds.size
    });

    return {
      created: newEnrollments.length,
      skipped: existingContactIds.size,
      enrollments: newEnrollments
    };
  });

  res.status(201).json({
    success: true,
    data: results
  });
}

/**
 * List all enrollments for a campaign instance
 */
async function listEnrollments(req, res) {
  const { id } = req.validatedParams;

  const enrollments = await CampaignEnrollment.findAll({
    where: { instance_id: id },
    order: [['enrolled_at', 'DESC']],
    include: [
      {
        model: CampaignEvent,
        as: 'events',
        attributes: ['id', 'event_type', 'channel', 'timestamp'],
        limit: 5,
        order: [['timestamp', 'DESC']]
      }
    ]
  });

  res.json({
    success: true,
    data: enrollments
  });
}

/**
 * Get single enrollment with full event history
 */
async function getEnrollment(req, res) {
  const { id } = req.validatedParams;

  const enrollment = await CampaignEnrollment.findByPk(id, {
    include: [
      {
        model: CampaignInstance,
        as: 'instance',
        attributes: ['id', 'name', 'status'],
        include: [
          {
            model: CampaignTemplate,
            as: 'template',
            attributes: ['id', 'name', 'type']
          }
        ]
      },
      {
        model: CampaignEvent,
        as: 'events',
        order: [['timestamp', 'DESC']]
      }
    ]
  });

  if (!enrollment) {
    throw new NotFoundError('Enrollment');
  }

  res.json({
    success: true,
    data: enrollment
  });
}

/**
 * Update enrollment status (pause/resume)
 */
async function updateEnrollment(req, res) {
  const { id } = req.validatedParams;
  const updateData = req.validatedBody;
  const userId = req.user?.id || 'anonymous';

  logger.info('Enrollment update requested', {
    userId,
    enrollmentId: id,
    updates: updateData
  });

  const enrollment = await sequelize.transaction(async (t) => {
    const existing = await CampaignEnrollment.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!existing) {
      logger.warn('Enrollment update failed: not found', {
        userId,
        enrollmentId: id
      });
      throw new NotFoundError('Enrollment');
    }

    await existing.update(updateData, { transaction: t });

    logger.info('Enrollment updated', {
      userId,
      enrollmentId: id,
      updates: updateData
    });

    return existing;
  });

  res.json({
    success: true,
    data: enrollment
  });
}

/**
 * Delete enrollment (unenroll contact)
 */
async function deleteEnrollment(req, res) {
  const { id } = req.validatedParams;
  const userId = req.user?.id || 'anonymous';

  logger.info('Enrollment deletion requested', {
    userId,
    enrollmentId: id
  });

  await sequelize.transaction(async (t) => {
    const enrollment = await CampaignEnrollment.findByPk(id, { transaction: t });

    if (!enrollment) {
      logger.warn('Enrollment deletion failed: not found', {
        userId,
        enrollmentId: id
      });
      throw new NotFoundError('Enrollment');
    }

    // Update status to unsubscribed instead of hard delete
    await enrollment.update({ status: 'unsubscribed' }, { transaction: t });

    logger.info('Enrollment marked as unsubscribed', {
      userId,
      enrollmentId: id,
      instanceId: enrollment.instance_id
    });
  });

  res.status(204).send();
}

// ============================================================================
// EVENT TRACKING
// ============================================================================

/**
 * Create campaign event (webhook receiver)
 */
async function createEvent(req, res) {
  const eventData = req.body;
  const userId = req.user?.id || 'webhook';

  // Use test database in test environment (dependency injection)
  const dbSequelize = req.app?.locals?.sequelize || sequelize;
  const models = req.app?.locals?.models || {
    CampaignEnrollment,
    CampaignInstance,
    CampaignEvent
  };

  logger.info('Event creation requested', {
    userId,
    enrollmentId: eventData.enrollment_id,
    eventType: eventData.event_type,
    channel: eventData.channel
  });

  // ============================================================================
  // ORPHANED EVENT DETECTION
  // Check if enrollment_id is missing or null BEFORE starting transaction
  // This handles race condition where webhook arrives before enrollment webhook
  // ============================================================================
  if (!eventData.enrollment_id || eventData.enrollment_id === null) {
    logger.warn('Orphaned event detected: missing enrollment_id', {
      userId,
      eventType: eventData.event_type,
      channel: eventData.channel,
      providerEventId: eventData.provider_event_id
    });

    // Queue event for retry with exponential backoff
    await OrphanedEventQueue.enqueue(eventData);

    // Return 202 Accepted - webhook acknowledged but processing deferred
    return res.status(202).json({
      success: true,
      message: 'Event queued for retry',
      retryable: true,
      details: 'Enrollment not yet available, will retry automatically'
    });
  }

  // ============================================================================
  // TRANSACTION WITH RACE CONDITION HANDLING
  // Use READ_COMMITTED isolation + explicit row locking for atomic counter updates
  // SELECT FOR UPDATE prevents concurrent counter modifications without serialization failures
  // ============================================================================
  try {
    // SQLite doesn't support READ_COMMITTED isolation level
    // Use default (SERIALIZABLE for SQLite, READ_COMMITTED for PostgreSQL)
    const transactionOptions = dbSequelize.options.dialect === 'sqlite'
      ? {}
      : { isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED };

    const event = await dbSequelize.transaction(transactionOptions, async (t) => {
      // Verify enrollment exists
      const enrollment = await models.CampaignEnrollment.findByPk(eventData.enrollment_id, {
        transaction: t,
        attributes: ['id', 'instance_id', 'status']
      });

      if (!enrollment) {
        logger.warn('Event creation failed: enrollment not found (may be orphaned)', {
          userId,
          enrollmentId: eventData.enrollment_id,
          eventType: eventData.event_type
        });

        // Queue for retry - enrollment might be created soon
        await OrphanedEventQueue.enqueue(eventData);

        // Return 202 instead of throwing error
        throw new OrphanedEventError(eventData.enrollment_id);
      }

      // ============================================================================
      // CRITICAL: Lock instance row with SELECT FOR UPDATE
      // This prevents concurrent counter updates and ensures atomicity
      // All concurrent transactions queue behind this lock (no rollbacks)
      // ============================================================================
      const instance = await models.CampaignInstance.findByPk(enrollment.instance_id, {
        transaction: t,
        lock: t.LOCK.UPDATE  // SELECT FOR UPDATE - exclusive row lock
      });

      if (!instance) {
        logger.error('Instance not found for enrollment', {
          enrollmentId: enrollment.id,
          instanceId: enrollment.instance_id
        });
        throw new NotFoundError('Campaign instance');
      }

      // Use findOrCreate for idempotent event creation
      // If provider_event_id is provided, this prevents duplicate events from webhooks
      const [newEvent, created] = await models.CampaignEvent.findOrCreate({
        where: eventData.provider_event_id
          ? { provider_event_id: eventData.provider_event_id }
          : {
              enrollment_id: eventData.enrollment_id,
              event_type: eventData.event_type,
              timestamp: eventData.timestamp
            },
        defaults: eventData,
        transaction: t
      });

      // Skip counter updates if event already existed (duplicate webhook)
      if (!created) {
        logger.info('Duplicate event ignored', {
          userId,
          eventId: newEvent.id,
          providerEventId: eventData.provider_event_id
        });
        return newEvent;
      }

      // Update instance counters based on event type using atomic increments
      // Instance is locked, so these updates are serialized (no race conditions)

    switch (eventData.event_type) {
      case 'sent':
        await instance.increment('total_sent', { by: 1, transaction: t });
        break;
      case 'delivered':
        await instance.increment('total_delivered', { by: 1, transaction: t });
        break;
      case 'opened':
        await instance.increment('total_opened', { by: 1, transaction: t });
        break;
      case 'clicked':
        await instance.increment('total_clicked', { by: 1, transaction: t });
        break;
      case 'replied':
        await instance.increment('total_replied', { by: 1, transaction: t });
        break;
    }

    // Update enrollment status based on event
    if (eventData.event_type === 'bounced') {
      await enrollment.update({ status: 'bounced' }, { transaction: t });
    } else if (eventData.event_type === 'unsubscribed') {
      await enrollment.update({ status: 'unsubscribed' }, { transaction: t });
    } else if (eventData.event_type === 'replied') {
      await enrollment.update({ status: 'completed' }, { transaction: t });
    }

      logger.info('Event created successfully', {
        userId,
        eventId: newEvent.id,
        enrollmentId: eventData.enrollment_id,
        eventType: eventData.event_type
      });

      return newEvent;
    });

    // Success - return 201 with event data
    res.status(201).json({
      success: true,
      data: event
    });

  } catch (error) {
    // Handle orphaned event error specially with 202 response
    if (error instanceof OrphanedEventError) {
      logger.info('Event queued for retry due to missing enrollment', {
        enrollmentId: error.enrollmentId,
        eventType: eventData.event_type
      });

      return res.status(202).json({
        success: true,
        message: 'Event queued for retry',
        retryable: true,
        details: 'Enrollment not yet available, will retry automatically'
      });
    }

    // Re-throw other errors to be handled by asyncHandler
    throw error;
  }
}

/**
 * Get all events for an enrollment
 */
async function getEnrollmentEvents(req, res) {
  const { id } = req.validatedParams;

  // Verify enrollment exists
  const enrollment = await CampaignEnrollment.findByPk(id);

  if (!enrollment) {
    throw new NotFoundError('Enrollment');
  }

  // Get all events for this enrollment
  const events = await CampaignEvent.findAll({
    where: { enrollment_id: id },
    order: [['timestamp', 'DESC']]
  });

  res.json({
    success: true,
    data: events
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Templates
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,

  // Email Sequences
  createEmailSequence,
  updateEmailSequence,
  deleteEmailSequence,

  // LinkedIn Sequences
  createLinkedInSequence,
  updateLinkedInSequence,
  deleteLinkedInSequence,

  // Instances
  listInstances,
  createInstance,
  getInstance,
  updateInstanceStatus,
  getInstancePerformance,

  // Enrollments
  createEnrollment,
  bulkEnroll,
  listEnrollments,
  getEnrollment,
  updateEnrollment,
  deleteEnrollment,

  // Events
  createEvent,
  getEnrollmentEvents
};
