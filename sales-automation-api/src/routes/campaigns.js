/**
 * Campaign Routes
 * RESTful API endpoints for campaign template and instance management
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
const router = express.Router();

import * as controller from '../controllers/campaign-controller.js';
import { asyncHandler } from '../middleware/campaign-error-handler.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateWebhookSignature } from '../middleware/webhook-auth.js';
import { validate } from '../middleware/validate.js';
import {
  CreateCampaignTemplateSchema,
  UpdateCampaignTemplateSchema,
  ListCampaignTemplatesSchema,
  CampaignTemplateParamSchema,
  CampaignInstanceParamSchema,
  CreateCampaignInstanceSchema,
  ListCampaignInstancesSchema,
  GetCampaignInstanceSchema,
  UpdateCampaignInstanceStatusSchema,
  GetCampaignPerformanceSchema,
  CreateEmailSequenceSchema,
  UpdateEmailSequenceSchema,
  DeleteEmailSequenceSchema,
  CreateLinkedInSequenceSchema,
  UpdateLinkedInSequenceSchema,
  DeleteLinkedInSequenceSchema,
  CreateEnrollmentSchema,
  UpdateEnrollmentSchema,
  DeleteEnrollmentSchema,
  BulkEnrollSchema,
  GetEnrollmentSchema,
  ListEnrollmentsSchema,
  GetEnrollmentEventsSchema,
  CreateCampaignEventSchema
} from '../validators/complete-schemas.js';

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

/**
 * General campaign operations rate limit
 * 100 requests per 15 minutes
 */
const campaignRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded. Maximum 100 requests per 15 minutes.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Analytics endpoint rate limit (more restrictive)
 * 20 requests per 5 minutes
 */
const analyticsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded for analytics. Maximum 20 requests per 5 minutes.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================================================

/**
 * Webhook rate limit (more restrictive than general API)
 * 100 requests per minute per IP
 * NOTE: Disabled in test mode (NODE_ENV === 'test')
 */
const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    error: 'Webhook rate limit exceeded',
    message: 'Maximum 100 webhook requests per minute',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test'  // Skip rate limiting in tests
});

/**
 * POST /api/campaigns/events/webhook
 * Webhook receiver for provider events (lemlist, postmark, phantombuster)
 * Note: Uses webhook signature validation instead of API key authentication
 */
router.post(
  '/events/webhook',
  webhookRateLimit,
  validateWebhookSignature,
  validate(CreateCampaignEventSchema),
  asyncHandler(controller.createEvent)
);

// ============================================================================
// GLOBAL MIDDLEWARE (Applied to all routes below)
// ============================================================================

// Apply authentication to ALL remaining campaign routes
router.use(authenticate);

// Apply general rate limiting to ALL remaining campaign routes
router.use(campaignRateLimit);

// ============================================================================
// CAMPAIGN TEMPLATE ROUTES
// ============================================================================

/**
 * POST /api/campaigns/templates
 * Create new campaign template
 */
router.post(
  '/templates',
  validate(CreateCampaignTemplateSchema),
  asyncHandler(controller.createTemplate)
);

/**
 * GET /api/campaigns/templates
 * List all campaign templates with pagination and filters
 */
router.get(
  '/templates',
  validate(ListCampaignTemplatesSchema),
  asyncHandler(controller.listTemplates)
);

/**
 * GET /api/campaigns/templates/:id
 * Get single template with sequences
 */
router.get(
  '/templates/:id',
  validate(CampaignTemplateParamSchema),
  asyncHandler(controller.getTemplate)
);

/**
 * PUT /api/campaigns/templates/:id
 * Update existing template
 */
router.put(
  '/templates/:id',
  validate(CampaignTemplateParamSchema),
  validate(UpdateCampaignTemplateSchema),
  asyncHandler(controller.updateTemplate)
);

/**
 * DELETE /api/campaigns/templates/:id
 * Soft delete template (set is_active = false)
 */
router.delete(
  '/templates/:id',
  validate(CampaignTemplateParamSchema),
  asyncHandler(controller.deleteTemplate)
);

// ============================================================================
// EMAIL SEQUENCE ROUTES
// ============================================================================

/**
 * POST /api/campaigns/templates/:id/sequences/email
 * Add email sequence step to template
 */
router.post(
  '/templates/:id/sequences/email',
  validate(CampaignTemplateParamSchema),
  validate(CreateEmailSequenceSchema),
  asyncHandler(controller.createEmailSequence)
);

/**
 * PUT /api/campaigns/templates/:templateId/sequences/email/:id
 * Update email sequence step
 */
router.put(
  '/templates/:templateId/sequences/email/:id',
  validate(CampaignTemplateParamSchema),
  validate(UpdateEmailSequenceSchema),
  asyncHandler(controller.updateEmailSequence)
);

/**
 * DELETE /api/campaigns/templates/:templateId/sequences/email/:id
 * Delete email sequence step
 */
router.delete(
  '/templates/:templateId/sequences/email/:id',
  validate(CampaignTemplateParamSchema),
  asyncHandler(controller.deleteEmailSequence)
);

// ============================================================================
// LINKEDIN SEQUENCE ROUTES
// ============================================================================

/**
 * POST /api/campaigns/templates/:id/sequences/linkedin
 * Add LinkedIn sequence step to template
 */
router.post(
  '/templates/:id/sequences/linkedin',
  validate(CampaignTemplateParamSchema),
  validate(CreateLinkedInSequenceSchema),
  asyncHandler(controller.createLinkedInSequence)
);

/**
 * PUT /api/campaigns/templates/:templateId/sequences/linkedin/:id
 * Update LinkedIn sequence step
 */
router.put(
  '/templates/:templateId/sequences/linkedin/:id',
  validate(CampaignTemplateParamSchema),
  validate(UpdateLinkedInSequenceSchema),
  asyncHandler(controller.updateLinkedInSequence)
);

/**
 * DELETE /api/campaigns/templates/:templateId/sequences/linkedin/:id
 * Delete LinkedIn sequence step
 */
router.delete(
  '/templates/:templateId/sequences/linkedin/:id',
  validate(CampaignTemplateParamSchema),
  asyncHandler(controller.deleteLinkedInSequence)
);

// ============================================================================
// CAMPAIGN INSTANCE ROUTES
// ============================================================================

/**
 * GET /api/campaigns/instances
 * List all campaign instances with pagination and filters
 */
router.get(
  '/instances',
  validate(ListCampaignInstancesSchema),
  asyncHandler(controller.listInstances)
);

/**
 * POST /api/campaigns/instances
 * Start new campaign from template
 */
router.post(
  '/instances',
  validate(CreateCampaignInstanceSchema),
  asyncHandler(controller.createInstance)
);

/**
 * GET /api/campaigns/instances/:id
 * Get campaign instance with statistics
 * Uses CampaignInstanceParamSchema to accept both UUID and MongoDB-style IDs
 */
router.get(
  '/instances/:id',
  validate(CampaignInstanceParamSchema),
  asyncHandler(controller.getInstance)
);

/**
 * PATCH /api/campaigns/instances/:id
 * Update instance status (pause/resume/complete)
 * Uses CampaignInstanceParamSchema to accept both UUID and MongoDB-style IDs
 */
router.patch(
  '/instances/:id',
  validate(CampaignInstanceParamSchema),
  validate(UpdateCampaignInstanceStatusSchema),
  asyncHandler(controller.updateInstanceStatus)
);

/**
 * GET /api/campaigns/instances/:id/performance
 * Get detailed performance analytics
 * Note: Has additional rate limiting (20 req/5min) due to expensive queries
 * Uses CampaignInstanceParamSchema to accept both UUID and MongoDB-style IDs
 */
router.get(
  '/instances/:id/performance',
  analyticsRateLimit,  // Additional rate limit for analytics
  validate(CampaignInstanceParamSchema),
  asyncHandler(controller.getInstancePerformance)
);

// ============================================================================
// ENROLLMENT ROUTES
// ============================================================================

/**
 * POST /api/campaigns/instances/:id/enrollments
 * Enroll a contact in a campaign instance
 * Uses CampaignInstanceParamSchema to accept both UUID and MongoDB-style IDs
 */
router.post(
  '/instances/:id/enrollments',
  validate(CampaignInstanceParamSchema),
  validate(CreateEnrollmentSchema),
  asyncHandler(controller.createEnrollment)
);

/**
 * POST /api/campaigns/instances/:id/enrollments/bulk
 * Bulk enroll multiple contacts in a campaign instance
 * Uses CampaignInstanceParamSchema to accept both UUID and MongoDB-style IDs
 */
router.post(
  '/instances/:id/enrollments/bulk',
  validate(CampaignInstanceParamSchema),
  validate(BulkEnrollSchema),
  asyncHandler(controller.bulkEnroll)
);

/**
 * GET /api/campaigns/instances/:id/enrollments
 * List all enrollments for a campaign instance
 * Uses CampaignInstanceParamSchema to accept both UUID and MongoDB-style IDs
 */
router.get(
  '/instances/:id/enrollments',
  validate(CampaignInstanceParamSchema),
  asyncHandler(controller.listEnrollments)
);

/**
 * GET /api/campaigns/enrollments/:id
 * Get single enrollment with event history
 */
router.get(
  '/enrollments/:id',
  validate(CampaignTemplateParamSchema),
  asyncHandler(controller.getEnrollment)
);

/**
 * PATCH /api/campaigns/enrollments/:id
 * Update enrollment status (pause/resume)
 */
router.patch(
  '/enrollments/:id',
  validate(CampaignTemplateParamSchema),
  validate(UpdateEnrollmentSchema),
  asyncHandler(controller.updateEnrollment)
);

/**
 * DELETE /api/campaigns/enrollments/:id
 * Unenroll a contact from campaign
 */
router.delete(
  '/enrollments/:id',
  validate(CampaignTemplateParamSchema),
  asyncHandler(controller.deleteEnrollment)
);

// ============================================================================
// EVENT TRACKING ROUTES
// ============================================================================

// Note: Webhook route is defined at the top of this file (before authentication middleware)

/**
 * GET /api/campaigns/enrollments/:id/events
 * Get all events for a specific enrollment
 */
router.get(
  '/enrollments/:id/events',
  validate(CampaignTemplateParamSchema),
  asyncHandler(controller.getEnrollmentEvents)
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;
