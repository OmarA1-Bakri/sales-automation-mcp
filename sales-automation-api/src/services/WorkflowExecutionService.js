/**
 * WorkflowExecutionService
 * Bridge between JobQueue and B-MAD WorkflowEngine
 *
 * B-MAD Integration Phase 1: MVP
 *
 * This service provides:
 * - Async workflow execution via JobQueue
 * - Optional sync execution with timeout
 * - WebSocket broadcasts for workflow state changes
 * - Integration with WorkflowStateManager for crash recovery
 */

import { randomUUID } from 'crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('WorkflowExecutionService');

// Lazy-load WorkflowEngine to allow TypeScript import via tsx loader
let WorkflowEngineClass = null;
let workflowEngineInstance = null;

/**
 * Initialize the WorkflowEngine (lazy loading)
 * @private
 */
async function getWorkflowEngine() {
  if (!workflowEngineInstance) {
    if (!WorkflowEngineClass) {
      try {
        // Dynamic import of TypeScript module (requires tsx loader)
        const module = await import('../bmad/WorkflowEngine.ts');
        WorkflowEngineClass = module.WorkflowEngine;
        logger.info('WorkflowEngine loaded successfully');
      } catch (error) {
        logger.error('Failed to load WorkflowEngine', {
          error: error.message,
          hint: 'Ensure server is started with: node --import tsx src/server.js'
        });
        throw new Error(`WorkflowEngine not available: ${error.message}. Start server with tsx loader.`);
      }
    }
    workflowEngineInstance = new WorkflowEngineClass();
  }
  return workflowEngineInstance;
}

/**
 * WorkflowExecutionService
 */
export class WorkflowExecutionService {
  /**
   * @param {Object} options
   * @param {Object} options.jobQueue - JobQueue instance for async processing
   * @param {Object} options.db - Database instance
   * @param {Object} options.wss - WebSocketServer for broadcasting
   */
  constructor(options = {}) {
    this.jobQueue = options.jobQueue;
    this.db = options.db;
    this.wss = options.wss;

    logger.info('WorkflowExecutionService initialized');
  }

  /**
   * Execute a workflow asynchronously (job-based)
   *
   * @param {string} workflowName - Name of the workflow to execute
   * @param {Object} inputs - Initial inputs for the workflow
   * @param {Object} options - Execution options
   * @param {string} options.priority - Job priority (low, normal, high, critical)
   * @returns {Object} Job info with jobId and status URL
   */
  async executeAsync(workflowName, inputs = {}, options = {}) {
    const jobId = `workflow_${randomUUID().split('-')[0]}`;
    const priority = options.priority || 'normal';

    logger.info('Enqueueing workflow for async execution', {
      jobId,
      workflowName,
      priority,
      inputKeys: Object.keys(inputs)
    });

    // Enqueue job
    const job = await this.jobQueue.enqueue('workflow', {
      workflowName,
      inputs,
      jobId
    }, priority);

    // Broadcast job created event
    this._broadcast('workflow.queued', {
      jobId,
      workflowName,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    return {
      jobId,
      status: 'pending',
      statusUrl: `/api/workflows/${jobId}`,
      message: 'Workflow queued for execution'
    };
  }

  /**
   * Execute a workflow synchronously (blocking)
   *
   * @param {string} workflowName - Name of the workflow to execute
   * @param {Object} inputs - Initial inputs for the workflow
   * @param {Object} options - Execution options
   * @param {number} options.timeout - Timeout in milliseconds (default: 60000)
   * @returns {Object} Workflow result
   */
  async executeSync(workflowName, inputs = {}, options = {}) {
    const timeout = options.timeout || 60000;
    const startTime = Date.now();

    logger.info('Executing workflow synchronously', {
      workflowName,
      timeout,
      inputKeys: Object.keys(inputs)
    });

    // Broadcast execution started
    this._broadcast('workflow.started', {
      workflowName,
      mode: 'sync',
      startedAt: new Date().toISOString()
    });

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Workflow execution timed out after ${timeout}ms`));
        }, timeout);
      });

      // Get the workflow engine
      const engine = await getWorkflowEngine();

      // Execute with timeout
      const result = await Promise.race([
        engine.runWorkflow(workflowName, inputs),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;

      // Broadcast completion
      this._broadcast('workflow.completed', {
        workflowName,
        mode: 'sync',
        durationMs: duration,
        completedAt: new Date().toISOString()
      });

      logger.info('Workflow completed synchronously', {
        workflowName,
        durationMs: duration
      });

      return {
        success: true,
        workflowName,
        result,
        durationMs: duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      // Broadcast failure
      this._broadcast('workflow.failed', {
        workflowName,
        mode: 'sync',
        error: error.message,
        durationMs: duration,
        failedAt: new Date().toISOString()
      });

      logger.error('Workflow failed (sync)', {
        workflowName,
        error: error.message,
        durationMs: duration
      });

      throw error;
    }
  }

  /**
   * Process a workflow job (called by job processor)
   *
   * @param {Object} job - Job object from queue
   * @returns {Object} Workflow result
   */
  async processWorkflowJob(job) {
    const { workflowName, inputs, jobId } = job.parameters || job;
    const startTime = Date.now();

    logger.info('Processing workflow job', {
      jobId,
      workflowName
    });

    // Update job status to processing
    if (this.jobQueue) {
      await this.jobQueue.updateStatus(jobId, 'processing');
    }

    // Broadcast execution started
    this._broadcast('workflow.started', {
      jobId,
      workflowName,
      mode: 'async',
      startedAt: new Date().toISOString()
    });

    try {
      const engine = await getWorkflowEngine();
      const result = await engine.runWorkflow(workflowName, inputs);

      const duration = Date.now() - startTime;

      // Update job status to completed
      if (this.jobQueue) {
        await this.jobQueue.updateStatus(jobId, 'completed', result);
      }

      // Broadcast completion
      this._broadcast('workflow.completed', {
        jobId,
        workflowName,
        mode: 'async',
        durationMs: duration,
        completedAt: new Date().toISOString()
      });

      logger.info('Workflow job completed', {
        jobId,
        workflowName,
        durationMs: duration
      });

      return {
        success: true,
        jobId,
        workflowName,
        result,
        durationMs: duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      // Update job status to failed
      if (this.jobQueue) {
        await this.jobQueue.updateStatus(jobId, 'failed', null, error.message);
      }

      // Broadcast failure
      this._broadcast('workflow.failed', {
        jobId,
        workflowName,
        mode: 'async',
        error: error.message,
        durationMs: duration,
        failedAt: new Date().toISOString()
      });

      logger.error('Workflow job failed', {
        jobId,
        workflowName,
        error: error.message,
        durationMs: duration
      });

      throw error;
    }
  }

  /**
   * Get workflow job status
   *
   * @param {string} jobId - Workflow job ID
   * @returns {Object} Job status
   */
  async getWorkflowStatus(jobId) {
    if (!this.jobQueue) {
      throw new Error('JobQueue not initialized');
    }

    const status = await this.jobQueue.getStatus(jobId);

    if (!status || status.error) {
      return {
        error: 'Workflow job not found',
        jobId
      };
    }

    // Enhance with workflow-specific info
    return {
      jobId: status.job_id,
      workflowName: status.parameters?.workflowName,
      status: status.status,
      progress: status.progress || 0,
      result: status.result,
      error: status.error,
      createdAt: status.created_at,
      startedAt: status.started_at,
      completedAt: status.completed_at,
      durationSeconds: status.duration_seconds
    };
  }

  /**
   * List workflow executions
   *
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Filter by status
   * @param {string} filters.workflowName - Filter by workflow name
   * @param {number} filters.limit - Max results
   * @param {number} filters.offset - Results offset
   * @returns {Array} List of workflow jobs
   */
  async listWorkflows(filters = {}) {
    if (!this.jobQueue) {
      throw new Error('JobQueue not initialized');
    }

    const jobs = await this.jobQueue.list({
      type: 'workflow',
      status: filters.status,
      limit: filters.limit || 20,
      offset: filters.offset || 0
    });

    // Filter by workflowName if specified
    let results = jobs;
    if (filters.workflowName) {
      results = jobs.filter(job =>
        job.parameters?.workflowName === filters.workflowName
      );
    }

    return results.map(job => ({
      jobId: job.job_id,
      workflowName: job.parameters?.workflowName,
      status: job.status,
      priority: job.priority,
      progress: job.progress || 0,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at
    }));
  }

  /**
   * Cancel a pending workflow
   *
   * @param {string} jobId - Workflow job ID
   * @param {string} reason - Cancellation reason
   * @returns {Object} Cancellation result
   */
  async cancelWorkflow(jobId, reason = 'User requested cancellation') {
    if (!this.jobQueue) {
      throw new Error('JobQueue not initialized');
    }

    const result = await this.jobQueue.cancel(jobId);

    if (result.success) {
      // Broadcast cancellation
      this._broadcast('workflow.cancelled', {
        jobId,
        reason,
        cancelledAt: new Date().toISOString()
      });

      logger.info('Workflow cancelled', { jobId, reason });
    }

    return result;
  }

  /**
   * Broadcast WebSocket message
   * @private
   */
  _broadcast(event, data) {
    if (!this.wss) return;

    const message = JSON.stringify({
      type: event,
      data,
      timestamp: new Date().toISOString()
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(message);
        } catch (error) {
          logger.warn('Failed to broadcast to WebSocket client', {
            error: error.message
          });
        }
      }
    });
  }
}

export default WorkflowExecutionService;
