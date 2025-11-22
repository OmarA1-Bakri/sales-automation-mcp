import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { randomUUID } from 'crypto';
import { ToolRegistry } from './ToolRegistry';
import { createLogger } from '../utils/logger.js';
import { WorkflowStateManager } from './WorkflowStateManager.js';

export class WorkflowEngine {
  private registry: ToolRegistry;
  private rootPath: string;
  private context: any = {};
  private logger: any;
  private workflowId: string | null = null;
  private workflowName: string | null = null;
  private stateManager: WorkflowStateManager;

  constructor() {
    this.registry = new ToolRegistry();
    this.rootPath = path.join(process.cwd(), 'bmad-library', 'modules', 'sales');
    this.logger = createLogger('WorkflowEngine');
    this.stateManager = new WorkflowStateManager();
  }

  async runWorkflow(workflowName: string, initialInputs: any) {
    this.workflowId = randomUUID();
    this.workflowName = workflowName;

    this.logger.info('Starting workflow', {
      workflowId: this.workflowId,
      workflowName,
      inputKeys: Object.keys(initialInputs)
    });

    // Create workflow state record
    await this.stateManager.createWorkflow(this.workflowId, workflowName, initialInputs);

    const workflowPath = path.join(this.rootPath, 'workflows', `${workflowName}.workflow.yaml`);

    if (!fs.existsSync(workflowPath)) {
      this.logger.error('Workflow file not found', {
        workflowId: this.workflowId,
        path: workflowPath
      });
      await this.stateManager.failWorkflow(this.workflowId, null, new Error('Workflow file not found'));
      throw new Error(`Workflow file not found at: ${workflowPath}`);
    }

    try {
      const fileContents = fs.readFileSync(workflowPath, 'utf8');

      // SECURITY FIX: Use JSON_SCHEMA to prevent arbitrary code execution
      const doc: any = yaml.load(fileContents, {
        schema: yaml.JSON_SCHEMA,
        onWarning: (warning) => {
          this.logger.warn('YAML parsing warning', {
            workflowId: this.workflowId,
            warning: warning.message
          });
        }
      });

      const steps = doc.workflow.steps;
      this.context = { ...initialInputs };

      let previousStepId: string | null = null;
      for (const step of steps) {
        await this.executeStep(step, previousStepId);
        previousStepId = step.id;
      }

      // Mark workflow as completed
      await this.stateManager.completeWorkflow(this.workflowId, this.context);

      this.logger.info('Workflow completed successfully', {
        workflowId: this.workflowId,
        workflowName,
        stepsCompleted: steps.length
      });

      return this.context;
    } catch (error) {
      // Mark workflow as failed
      await this.stateManager.failWorkflow(this.workflowId, null, error as Error);

      this.logger.error('Workflow failed', {
        workflowId: this.workflowId,
        workflowName,
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      throw error;
    }
  }

  private async executeStep(step: any, previousStepId: string | null) {
    this.logger.info('Executing step', {
      workflowId: this.workflowId,
      stepId: step.id,
      agent: step.agent,
      action: step.action
    });

    const inputs = this.resolveInputs(step.inputs, previousStepId);
    const toolFn = this.registry.getTool(step.action);

    if (!toolFn) {
      this.logger.warn('Tool not found, skipping step', {
        workflowId: this.workflowId,
        stepId: step.id,
        action: step.action
      });
      return;
    }

    try {
      const startTime = Date.now();
      const result = await toolFn(inputs);
      const duration = Date.now() - startTime;

      this.context[step.id] = result;

      // Persist state after each successful step
      await this.stateManager.updateStepCompleted(
        this.workflowId!,
        step.id,
        this.context
      );

      this.logger.info('Step completed', {
        workflowId: this.workflowId,
        stepId: step.id,
        durationMs: duration,
        resultKeys: result && typeof result === 'object' ? Object.keys(result) : []
      });
    } catch (error) {
      // Record step failure
      await this.stateManager.failWorkflow(this.workflowId!, step.id, error as Error);

      this.logger.error('Step failed', {
        workflowId: this.workflowId,
        stepId: step.id,
        action: step.action,
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      throw error;
    }
  }

  private resolveInputs(yamlInputs: any, previousStepId: string | null): any {
    if (!yamlInputs) return {};
    const resolved: any = {};

    for (const [key, value] of Object.entries(yamlInputs)) {
      if (typeof value === 'string') {
        // Handle: from_previous_step
        if (value === 'from_previous_step' && previousStepId) {
          resolved[key] = this.context[previousStepId];
        }
        // Handle: from_step_define-icp or from_icp_profile (step references)
        else if (value.startsWith('from_')) {
          const sourceStepId = value.replace('from_step_', '').replace('from_', '');

          // Handle dotted notation: from_step.property
          if (sourceStepId.includes('.')) {
            const [stepId, prop] = sourceStepId.split('.');
            resolved[key] = this.context[stepId]?.[prop];
          } else {
            resolved[key] = this.context[sourceStepId];
          }
        } else {
          resolved[key] = value;
        }
      } else if (Array.isArray(value)) {
        // Recursively resolve arrays
        resolved[key] = value.map(item =>
          typeof item === 'object' ? this.resolveInputs(item, previousStepId) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        // Recursively resolve nested objects
        resolved[key] = this.resolveInputs(value, previousStepId);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }
}
