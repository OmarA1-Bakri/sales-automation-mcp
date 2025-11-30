/**
 * Workflow API Validation Schemas
 * Zod validation for workflow execution endpoints
 *
 * B-MAD Integration Phase 1: MVP
 */

import { z } from 'zod';
import { UUIDSchema, SafeJSONBSchema } from './complete-schemas.js';

// =============================================================================
// WORKFLOW ENUMS
// =============================================================================

/**
 * Available workflow names - matches YAML workflow files
 */
export const WorkflowNameEnum = z.enum([
  'prospect-discovery',
  'dynamic-outreach',
  're-engagement'
]);

/**
 * Workflow execution status values
 */
export const WorkflowStatusEnum = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
]);

/**
 * Priority levels for workflow execution
 */
export const WorkflowPriorityEnum = z.enum([
  'low',
  'normal',
  'high',
  'critical'
]);

// =============================================================================
// EXECUTE WORKFLOW SCHEMA
// =============================================================================

/**
 * POST /api/workflows/execute
 * Start workflow execution (async default, sync optional)
 */
export const ExecuteWorkflowSchema = z.object({
  body: z.object({
    workflowName: WorkflowNameEnum.describe('Name of the workflow to execute'),
    inputs: SafeJSONBSchema.optional().default({}).describe('Initial inputs for the workflow'),
    sync: z.boolean().default(false).describe('Execute synchronously (blocks until complete)'),
    priority: WorkflowPriorityEnum.default('normal').describe('Execution priority'),
    timeout: z.number().int().min(1000).max(300000).default(60000)
      .describe('Timeout in milliseconds (for sync mode)')
  })
});

// =============================================================================
// WORKFLOW STATUS SCHEMAS
// =============================================================================

/**
 * GET /api/workflows/:jobId
 * Get workflow execution status
 */
export const GetWorkflowStatusSchema = z.object({
  params: z.object({
    jobId: z.string()
      .regex(/^workflow_[a-f0-9]+$/i, 'Invalid workflow job ID format')
      .describe('Workflow job ID')
  })
});

/**
 * GET /api/workflows
 * List workflow executions with filters
 */
export const ListWorkflowsSchema = z.object({
  query: z.object({
    status: WorkflowStatusEnum.optional().describe('Filter by status'),
    workflowName: WorkflowNameEnum.optional().describe('Filter by workflow type'),
    limit: z.coerce.number().int().min(1).max(100).default(20)
      .describe('Maximum number of results'),
    offset: z.coerce.number().int().min(0).default(0)
      .describe('Number of results to skip')
  })
});

/**
 * DELETE /api/workflows/:jobId
 * Cancel pending workflow execution
 */
export const CancelWorkflowSchema = z.object({
  params: z.object({
    jobId: z.string()
      .regex(/^workflow_[a-f0-9]+$/i, 'Invalid workflow job ID format')
      .describe('Workflow job ID to cancel')
  }),
  body: z.object({
    reason: z.string().max(500).optional().describe('Cancellation reason')
  }).optional()
});

// =============================================================================
// WORKFLOW DEFINITIONS SCHEMA
// =============================================================================

/**
 * GET /api/workflows/definitions
 * List available workflow definitions (YAML files)
 */
export const ListWorkflowDefinitionsSchema = z.object({
  query: z.object({
    includeMetadata: z.enum(['true', 'false']).optional()
      .transform(val => val === 'true')
      .describe('Include YAML metadata in response')
  })
});

// =============================================================================
// RESUME WORKFLOW SCHEMA
// =============================================================================

/**
 * POST /api/workflows/:jobId/resume
 * Resume a failed workflow from last successful step
 */
export const ResumeWorkflowSchema = z.object({
  params: z.object({
    jobId: z.string()
      .regex(/^workflow_[a-f0-9]+$/i, 'Invalid workflow job ID format')
      .describe('Workflow job ID to resume')
  })
});

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Enums
  WorkflowNameEnum,
  WorkflowStatusEnum,
  WorkflowPriorityEnum,

  // Request schemas
  ExecuteWorkflowSchema,
  GetWorkflowStatusSchema,
  ListWorkflowsSchema,
  CancelWorkflowSchema,
  ListWorkflowDefinitionsSchema,
  ResumeWorkflowSchema
};
