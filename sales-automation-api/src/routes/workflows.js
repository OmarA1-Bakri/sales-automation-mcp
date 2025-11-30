/**
 * Workflow Routes
 * RESTful API endpoints for B-MAD workflow execution
 *
 * B-MAD Integration Phase 1: MVP
 */

import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

import * as controller from '../controllers/workflow-controller.js';
import { asyncHandler } from '../middleware/campaign-error-handler.js';
// NOTE: Authentication handled at app level (authenticate-db middleware for /api/*)
// Do NOT add authenticate middleware here - it's redundant and uses old env-based auth
import { validate } from '../middleware/validate.js';
import {
  ExecuteWorkflowSchema,
  GetWorkflowStatusSchema,
  ListWorkflowsSchema,
  CancelWorkflowSchema,
  ListWorkflowDefinitionsSchema,
  ResumeWorkflowSchema
} from '../validators/workflow-schemas.js';

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

/**
 * Workflow execution rate limit (more restrictive)
 * 20 executions per 15 minutes
 */
const executeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    error: 'Too many workflow executions',
    message: 'Rate limit exceeded. Maximum 20 workflow executions per 15 minutes.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Uses default IP-based key generation (handles IPv6 correctly)
  // Authentication middleware already provides user context
  skip: () => process.env.NODE_ENV === 'test'
});

/**
 * General workflow operations rate limit
 * 100 requests per 15 minutes
 */
const generalRateLimit = rateLimit({
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

// ============================================================================
// GLOBAL MIDDLEWARE
// ============================================================================

// NOTE: Authentication handled at server level via authenticate-db middleware
// All /api/* routes are authenticated before reaching these route handlers

// Apply general rate limiting
router.use(generalRateLimit);

// ============================================================================
// WORKFLOW DEFINITION ROUTES (Read-Only)
// ============================================================================

/**
 * GET /api/workflows/definitions
 * List available workflow definitions (YAML files)
 *
 * Query params:
 *   - includeMetadata: Include YAML metadata in response
 *
 * Response:
 *   - name: Workflow name
 *   - file: YAML filename
 *   - metadata: (optional) Description, version, steps, triggers
 */
router.get(
  '/definitions',
  validate(ListWorkflowDefinitionsSchema),
  asyncHandler(controller.listWorkflowDefinitions)
);

// ============================================================================
// WORKFLOW EXECUTION ROUTES
// ============================================================================

/**
 * POST /api/workflows/execute
 * Execute a workflow (async default, sync optional)
 *
 * Body:
 *   - workflowName: Name of workflow to execute
 *   - inputs: Initial inputs for workflow
 *   - sync: Execute synchronously (default: false)
 *   - priority: Execution priority (low/normal/high/critical)
 *   - timeout: Timeout for sync execution (ms)
 *
 * Response (async):
 *   - 202 Accepted with jobId and statusUrl
 *
 * Response (sync):
 *   - 200 OK with workflow result
 */
router.post(
  '/execute',
  executeRateLimit,  // Additional rate limit for execution
  validate(ExecuteWorkflowSchema),
  asyncHandler(controller.executeWorkflow)
);

// ============================================================================
// WORKFLOW STATUS ROUTES
// ============================================================================

/**
 * GET /api/workflows
 * List workflow executions with filters
 *
 * Query params:
 *   - status: Filter by status (pending/running/completed/failed/cancelled)
 *   - workflowName: Filter by workflow type
 *   - limit: Max results (default: 20, max: 100)
 *   - offset: Results offset
 */
router.get(
  '/',
  validate(ListWorkflowsSchema),
  asyncHandler(controller.listWorkflows)
);

/**
 * GET /api/workflows/:jobId
 * Get workflow execution status
 *
 * Response:
 *   - jobId: Workflow job ID
 *   - workflowName: Name of workflow
 *   - status: Current status
 *   - progress: Execution progress (0-1)
 *   - result: Workflow result (if completed)
 *   - error: Error message (if failed)
 */
router.get(
  '/:jobId',
  validate(GetWorkflowStatusSchema),
  asyncHandler(controller.getWorkflowStatus)
);

/**
 * DELETE /api/workflows/:jobId
 * Cancel a pending workflow
 *
 * Note: Only pending workflows can be cancelled
 *
 * Body (optional):
 *   - reason: Cancellation reason
 */
router.delete(
  '/:jobId',
  validate(CancelWorkflowSchema),
  asyncHandler(controller.cancelWorkflow)
);

// ============================================================================
// WORKFLOW RESUME ROUTES (Phase 2)
// ============================================================================

/**
 * POST /api/workflows/:jobId/resume
 * Resume a failed workflow from last successful step
 *
 * Note: This is a Phase 2 feature, not implemented in MVP
 */
router.post(
  '/:jobId/resume',
  validate(ResumeWorkflowSchema),
  asyncHandler(controller.resumeWorkflow)
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;
