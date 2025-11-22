/**
 * Campaign Validators using Zod
 * Input validation for campaign-related API endpoints
 */

import { z } from 'zod';

// ============================================================================
// JSONB SANITIZATION
// ============================================================================

/**
 * Sanitize JSONB input to prevent injection attacks
 */
function hasDangerousKeys(obj, depth = 0) {
  if (depth > 5) return true; // Max depth 5 levels
  if (!obj || typeof obj !== 'object') return false;

  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

  for (const key in obj) {
    if (dangerousKeys.includes(key)) return true;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasDangerousKeys(obj[key], depth + 1)) return true;
    }
  }
  return false;
}

/**
 * Safe JSONB schema with validation
 */
const safeJsonbSchema = z.record(z.unknown())
  .refine(
    (obj) => {
      const jsonString = JSON.stringify(obj);
      return jsonString.length < 10000; // Max 10KB
    },
    { message: 'JSON object too large (max 10KB)' }
  )
  .refine(
    (obj) => !hasDangerousKeys(obj),
    { message: 'JSON contains forbidden keys (__proto__, constructor, prototype)' }
  );

// ============================================================================
// CAMPAIGN TEMPLATE VALIDATORS
// ============================================================================

const campaignTypeEnum = z.enum(['email', 'linkedin', 'multi_channel']);
const pathTypeEnum = z.enum(['structured', 'dynamic_ai']);

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: campaignTypeEnum,
  path_type: pathTypeEnum,
  icp_profile_id: z.string().uuid().optional(),
  settings: safeJsonbSchema.optional().default({}),
  created_by: z.string().max(255).optional()
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  type: campaignTypeEnum.optional(),
  path_type: pathTypeEnum.optional(),
  icp_profile_id: z.string().uuid().nullable().optional(),
  settings: safeJsonbSchema.optional(),
  is_active: z.boolean().optional()
});

const listTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: campaignTypeEnum.optional(),
  path_type: pathTypeEnum.optional(),
  is_active: z.enum(['true', 'false']).optional().transform(val => val === 'true')
});

// ============================================================================
// EMAIL SEQUENCE VALIDATORS
// ============================================================================

const createEmailSequenceSchema = z.object({
  template_id: z.string().uuid(),
  step_number: z.number().int().positive(),
  subject: z.string().max(255).optional(),
  body: z.string().min(10).max(50000),
  delay_hours: z.number().int().min(0).max(720).default(0),
  is_active: z.boolean().default(true),
  a_b_variant: z.string().max(50).optional()
});

const updateEmailSequenceSchema = createEmailSequenceSchema.partial().omit({ template_id: true });

// ============================================================================
// LINKEDIN SEQUENCE VALIDATORS
// ============================================================================

const linkedinActionTypeEnum = z.enum(['profile_visit', 'connection_request', 'message', 'voice_message']);

const createLinkedInSequenceSchema = z.object({
  template_id: z.string().uuid(),
  step_number: z.number().int().positive(),
  type: linkedinActionTypeEnum,
  message: z.string().max(1500).optional(),
  delay_hours: z.number().int().min(0).max(720).default(0),
  is_active: z.boolean().default(true)
}).refine(
  (data) => {
    // Message is required for connection_request, message, and voice_message
    if (['connection_request', 'message', 'voice_message'].includes(data.type)) {
      return data.message && data.message.length > 0;
    }
    return true;
  },
  {
    message: 'Message is required for connection_request, message, and voice_message types',
    path: ['message']
  }
).refine(
  (data) => {
    // Connection request messages must be 300 chars or less
    if (data.type === 'connection_request' && data.message) {
      return data.message.length <= 300;
    }
    return true;
  },
  {
    message: 'Connection request message must be 300 characters or less',
    path: ['message']
  }
);

// For update, create schema without refines, make partial, then re-add validations
const updateLinkedInSequenceSchema = z.object({
  step_number: z.number().int().positive().optional(),
  type: linkedinActionTypeEnum.optional(),
  message: z.string().max(1500).optional(),
  delay_hours: z.number().int().min(0).max(720).optional(),
  is_active: z.boolean().optional()
});

// ============================================================================
// CAMPAIGN INSTANCE VALIDATORS
// ============================================================================

const campaignStatusEnum = z.enum(['draft', 'active', 'paused', 'completed', 'failed']);

const createInstanceSchema = z.object({
  template_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  provider_config: z.object({
    email_provider: z.enum(['lemlist', 'postmark']).optional(),
    linkedin_provider: z.enum(['lemlist', 'phantombuster']).optional()
  }).optional().default({})
});

const updateInstanceStatusSchema = z.object({
  status: z.enum(['active', 'paused', 'completed'])
}).refine(
  (data) => {
    // Validate status transitions
    // This will be enhanced in the controller with current status check
    return true;
  }
);

const listInstancesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: campaignStatusEnum.optional(),
  template_id: z.string().uuid().optional()
});

// ============================================================================
// CAMPAIGN ENROLLMENT VALIDATORS
// ============================================================================

const enrollmentStatusEnum = z.enum(['enrolled', 'active', 'paused', 'completed', 'unsubscribed', 'bounced']);

const createEnrollmentSchema = z.object({
  // instance_id comes from URL params (/instances/:id/enrollments)
  contact_id: z.string().uuid(),
  metadata: safeJsonbSchema.optional().default({})
});

const bulkEnrollSchema = z.object({
  // instance_id comes from URL params (/instances/:id/enrollments/bulk)
  contact_ids: z.array(z.string().uuid()).min(1).max(1000) // Max 1000 per batch
});

const updateEnrollmentSchema = z.object({
  status: enrollmentStatusEnum.optional(),
  current_step: z.number().int().min(0).optional(),
  next_action_at: z.coerce.date().nullable().optional(),
  metadata: safeJsonbSchema.optional()
});

// ============================================================================
// CAMPAIGN EVENT VALIDATORS
// ============================================================================

const eventTypeEnum = z.enum([
  'sent',
  'delivered',
  'opened',
  'clicked',
  'replied',
  'bounced',
  'unsubscribed',
  'connection_accepted',
  'connection_rejected'
]);

const channelEnum = z.enum(['email', 'linkedin']);

const createEventSchema = z.object({
  enrollment_id: z.string().uuid(),
  event_type: eventTypeEnum,
  channel: channelEnum,
  step_number: z.number().int().positive().optional(),
  timestamp: z.coerce.date().default(() => new Date()),
  provider: z.string().max(50).optional(),
  provider_event_id: z.string().max(255).optional(),
  metadata: safeJsonbSchema.optional().default({})
});

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Creates Express middleware for validating request body
 * @param {z.ZodSchema} schema Zod schema to validate against
 * @returns {Function} Express middleware function
 */
function validateBody(schema) {
  return async (req, res, next) => {
    try {
      req.validatedBody = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}

/**
 * Creates Express middleware for validating query parameters
 * @param {z.ZodSchema} schema Zod schema to validate against
 * @returns {Function} Express middleware function
 */
function validateQuery(schema) {
  return async (req, res, next) => {
    try {
      req.validatedQuery = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}

/**
 * Creates Express middleware for validating URL parameters
 * @param {z.ZodSchema} schema Zod schema to validate against
 * @returns {Function} Express middleware function
 */
function validateParams(schema) {
  return async (req, res, next) => {
    try {
      req.validatedParams = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid URL parameters',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

const uuidParamSchema = z.object({
  id: z.string().uuid()
});

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Template schemas
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesQuerySchema,

  // Sequence schemas
  createEmailSequenceSchema,
  updateEmailSequenceSchema,
  createLinkedInSequenceSchema,
  updateLinkedInSequenceSchema,

  // Instance schemas
  createInstanceSchema,
  updateInstanceStatusSchema,
  listInstancesQuerySchema,

  // Enrollment schemas
  createEnrollmentSchema,
  updateEnrollmentSchema,
  bulkEnrollSchema,

  // Event schemas
  createEventSchema,

  // Common schemas
  uuidParamSchema,

  // Validation middleware
  validateBody,
  validateQuery,
  validateParams
};
