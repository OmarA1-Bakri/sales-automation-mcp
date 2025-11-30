/**
 * Workflow Controller
 * HTTP endpoint handlers for B-MAD workflow execution
 *
 * B-MAD Integration Phase 1: MVP
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('WorkflowController');

// Path to workflow YAML files
const WORKFLOWS_PATH = path.join(process.cwd(), 'bmad-library', 'modules', 'sales', 'workflows');

/**
 * POST /api/workflows/execute
 * Execute a workflow (async default, sync optional)
 */
export async function executeWorkflow(req, res) {
  const { workflowName, inputs, sync, priority, timeout } = req.body;
  const userId = req.user?.id || 'anonymous';
  const workflowService = req.app.locals.workflowService;

  if (!workflowService) {
    logger.error('WorkflowService not initialized');
    return res.status(503).json({
      success: false,
      error: 'Workflow service unavailable',
      message: 'Workflow execution service is not initialized'
    });
  }

  logger.info('Workflow execution requested', {
    userId,
    workflowName,
    sync,
    priority,
    inputKeys: Object.keys(inputs || {})
  });

  try {
    if (sync) {
      // Synchronous execution (blocking)
      const result = await workflowService.executeSync(workflowName, inputs, { timeout });

      logger.info('Workflow executed synchronously', {
        userId,
        workflowName,
        durationMs: result.durationMs
      });

      return res.json({
        success: true,
        data: result
      });
    } else {
      // Asynchronous execution (job-based)
      const result = await workflowService.executeAsync(workflowName, inputs, { priority });

      logger.info('Workflow queued for async execution', {
        userId,
        workflowName,
        jobId: result.jobId
      });

      return res.status(202).json({
        success: true,
        data: result
      });
    }
  } catch (error) {
    logger.error('Workflow execution failed', {
      userId,
      workflowName,
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: 'Workflow execution failed',
      message: error.message
    });
  }
}

/**
 * GET /api/workflows/:jobId
 * Get workflow execution status
 */
export async function getWorkflowStatus(req, res) {
  const { jobId } = req.params;
  const workflowService = req.app.locals.workflowService;

  if (!workflowService) {
    return res.status(503).json({
      success: false,
      error: 'Workflow service unavailable'
    });
  }

  try {
    const status = await workflowService.getWorkflowStatus(jobId);

    if (status.error && status.error === 'Workflow job not found') {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
        jobId
      });
    }

    return res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get workflow status', {
      jobId,
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/workflows
 * List workflow executions with filters
 */
export async function listWorkflows(req, res) {
  const { status, workflowName, limit = 20, offset = 0 } = req.query;
  const workflowService = req.app.locals.workflowService;

  if (!workflowService) {
    return res.status(503).json({
      success: false,
      error: 'Workflow service unavailable'
    });
  }

  try {
    const workflows = await workflowService.listWorkflows({
      status,
      workflowName,
      limit,
      offset
    });

    return res.json({
      success: true,
      data: workflows,
      pagination: {
        limit,
        offset,
        count: workflows.length
      }
    });
  } catch (error) {
    logger.error('Failed to list workflows', {
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * DELETE /api/workflows/:jobId
 * Cancel a pending workflow
 */
export async function cancelWorkflow(req, res) {
  const { jobId } = req.params;
  const reason = req.body?.reason || 'User requested cancellation';
  const userId = req.user?.id || 'anonymous';
  const workflowService = req.app.locals.workflowService;

  if (!workflowService) {
    return res.status(503).json({
      success: false,
      error: 'Workflow service unavailable'
    });
  }

  logger.info('Workflow cancellation requested', {
    userId,
    jobId,
    reason
  });

  try {
    const result = await workflowService.cancelWorkflow(jobId, reason);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message || 'Cannot cancel workflow'
      });
    }

    logger.info('Workflow cancelled', {
      userId,
      jobId
    });

    return res.json({
      success: true,
      message: 'Workflow cancelled',
      jobId
    });
  } catch (error) {
    logger.error('Failed to cancel workflow', {
      jobId,
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/workflows/definitions
 * List available workflow definitions (YAML files)
 */
export async function listWorkflowDefinitions(req, res) {
  const includeMetadata = req.query?.includeMetadata === 'true' || req.query?.includeMetadata === true;

  try {
    // Check if workflows directory exists
    if (!fs.existsSync(WORKFLOWS_PATH)) {
      return res.json({
        success: true,
        data: [],
        message: 'No workflow definitions found'
      });
    }

    // Read workflow YAML files
    const files = fs.readdirSync(WORKFLOWS_PATH)
      .filter(file => file.endsWith('.workflow.yaml'));

    const workflows = files.map(file => {
      const name = file.replace('.workflow.yaml', '');
      const filePath = path.join(WORKFLOWS_PATH, file);

      const definition = {
        name,
        file
      };

      // Include YAML metadata if requested
      if (includeMetadata) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const doc = yaml.load(content, { schema: yaml.JSON_SCHEMA });

          if (doc && doc.workflow) {
            definition.metadata = {
              description: doc.workflow.description,
              version: doc.workflow.version,
              steps: doc.workflow.steps?.length || 0,
              triggers: doc.workflow.triggers
            };
          }
        } catch (yamlError) {
          logger.warn('Failed to parse workflow YAML', {
            file,
            error: yamlError.message
          });
          definition.metadata = { error: 'Failed to parse YAML' };
        }
      }

      return definition;
    });

    return res.json({
      success: true,
      data: workflows
    });
  } catch (error) {
    logger.error('Failed to list workflow definitions', {
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/workflows/:jobId/resume
 * Resume a failed workflow from last successful step
 */
export async function resumeWorkflow(req, res) {
  const { jobId } = req.params;
  const userId = req.user?.id || 'anonymous';

  logger.info('Workflow resume requested', {
    userId,
    jobId
  });

  // Phase 2 feature - not implemented in MVP
  return res.status(501).json({
    success: false,
    error: 'Not implemented',
    message: 'Workflow resumption is planned for Phase 2'
  });
}

export default {
  executeWorkflow,
  getWorkflowStatus,
  listWorkflows,
  cancelWorkflow,
  listWorkflowDefinitions,
  resumeWorkflow
};
