import { sequelize } from '../db/connection.js';
import { createLogger } from '../utils/logger.js';
import { safeJsonParse } from '../utils/prototype-protection.js';

const logger = createLogger('WorkflowStateManager');

/**
 * Manages workflow execution state persistence for crash recovery and auditing
 */
export class WorkflowStateManager {
  /**
   * Create new workflow execution record
   */
  async createWorkflow(workflowId, workflowName, initialInputs) {
    try {
      await sequelize.query(`
        INSERT INTO workflow_states (
          id, workflow_name, status, context, current_step, started_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id) DO NOTHING
      `, {
        bind: [workflowId, workflowName, 'running', JSON.stringify(initialInputs), null]
      });

      logger.info('Workflow created', { workflowId, workflowName });
      return workflowId;
    } catch (error) {
      logger.error('Failed to create workflow state', {
        workflowId,
        error: error.message
      });
      // Don't throw - workflow can continue without persistence
      return workflowId;
    }
  }

  /**
   * Update workflow state after step completion
   */
  async updateStepCompleted(workflowId, stepId, context) {
    try {
      await sequelize.query(`
        UPDATE workflow_states
        SET context = $1, current_step = $2, updated_at = NOW()
        WHERE id = $3
      `, {
        bind: [JSON.stringify(context), stepId, workflowId]
      });

      logger.debug('Workflow step updated', { workflowId, stepId });
    } catch (error) {
      logger.error('Failed to update workflow step', {
        workflowId,
        stepId,
        error: error.message
      });
      // Don't throw - workflow can continue without persistence
    }
  }

  /**
   * Mark workflow as completed
   */
  async completeWorkflow(workflowId, finalContext) {
    try {
      await sequelize.query(`
        UPDATE workflow_states
        SET status = 'completed', context = $1, completed_at = NOW()
        WHERE id = $2
      `, {
        bind: [JSON.stringify(finalContext), workflowId]
      });

      logger.info('Workflow completed', { workflowId });
    } catch (error) {
      logger.error('Failed to mark workflow as completed', {
        workflowId,
        error: error.message
      });
    }
  }

  /**
   * Mark workflow as failed and record error
   */
  async failWorkflow(workflowId, failedStep, error) {
    const transaction = await sequelize.transaction();

    try {
      // Update workflow_states
      await sequelize.query(`
        UPDATE workflow_states
        SET status = 'failed', error = $1, completed_at = NOW()
        WHERE id = $2
      `, {
        bind: [error.message || String(error), workflowId],
        transaction
      });

      // Record in workflow_failures for detailed analysis
      await sequelize.query(`
        INSERT INTO workflow_failures (
          workflow_id, failed_step, error_message, context, created_at
        )
        SELECT id, current_step, error, context, NOW()
        FROM workflow_states
        WHERE id = $1
      `, {
        bind: [workflowId],
        transaction
      });

      await transaction.commit();

      logger.error('Workflow failed', {
        workflowId,
        failedStep,
        error: error.message
      });
    } catch (err) {
      await transaction.rollback();

      logger.error('Failed to record workflow failure', {
        workflowId,
        error: err.message
      });
    }
  }

  /**
   * Get workflow state (for crash recovery)
   */
  async getWorkflowState(workflowId) {
    try {
      const [results] = await sequelize.query(`
        SELECT * FROM workflow_states WHERE id = $1
      `, {
        bind: [workflowId]
      });

      if (!results || results.length === 0) {
        return null;
      }

      const state = results[0];

      return {
        id: state.id,
        workflowName: state.workflow_name,
        status: state.status,
        // PERF-004 FIX: Use safeJsonParse to prevent prototype pollution
        context: typeof state.context === 'string' ? safeJsonParse(state.context) : state.context,
        currentStep: state.current_step,
        error: state.error,
        startedAt: state.started_at,
        completedAt: state.completed_at
      };
    } catch (error) {
      logger.error('Failed to get workflow state', {
        workflowId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Resume workflow from last successful step
   */
  async resumeWorkflow(workflowId) {
    const state = await this.getWorkflowState(workflowId);

    if (!state) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (state.status === 'completed') {
      throw new Error(`Workflow ${workflowId} already completed`);
    }

    logger.info('Resuming workflow', {
      workflowId,
      lastStep: state.currentStep,
      status: state.status
    });

    return {
      context: state.context,
      lastStep: state.currentStep
    };
  }

  /**
   * Get workflow execution statistics
   */
  async getWorkflowStats(workflowName, days = 7) {
    try {
      const [results] = await sequelize.query(`
        SELECT
          status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
        FROM workflow_states
        WHERE workflow_name = $1
          AND started_at > NOW() - ($2 * INTERVAL '1 day')
        GROUP BY status
      `, {
        bind: [workflowName, days]
      });

      return results || [];
    } catch (error) {
      logger.error('Failed to get workflow stats', {
        workflowName,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Clean up old completed workflows (retention policy)
   */
  async cleanupOldWorkflows(retentionDays = 30) {
    // Validate and sanitize retentionDays to prevent SQL injection
    const safeDays = Math.max(1, Math.min(365, parseInt(retentionDays, 10) || 30));

    try {
      const result = await sequelize.query(`
        DELETE FROM workflow_states
        WHERE status = 'completed'
          AND completed_at < NOW() - ($1 * INTERVAL '1 day')
      `, {
        bind: [safeDays]
      });

      const deletedCount = result[1] || 0;

      logger.info('Cleaned up old workflows', {
        deletedCount,
        retentionDays: safeDays
      });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old workflows', {
        error: error.message
      });
      return 0;
    }
  }
}
