import { sequelize } from '../sales-automation-api/src/db/connection.js';
import { WorkflowStateManager } from '../sales-automation-api/src/bmad/WorkflowStateManager.js';

async function checkBmadStatus() {
    console.log('=== BMAD AGENT STATUS ===');

    const stateManager = new WorkflowStateManager();

    try {
        // 1. Get Overall Stats
        console.log('\n--- Workflow Statistics (Last 7 Days) ---');
        // We'll query for all workflow types
        const workflows = await sequelize.query(`
      SELECT DISTINCT workflow_name FROM workflow_states
    `);

        if (workflows[0].length === 0) {
            console.log('No workflows found.');
        } else {
            for (const row of workflows[0]) {
                const stats = await stateManager.getWorkflowStats(row.workflow_name);
                console.log(`\nWorkflow: ${row.workflow_name}`);
                if (stats.length === 0) {
                    console.log('  No execution data.');
                } else {
                    console.table(stats.map(s => ({
                        status: s.status,
                        count: s.count,
                        avg_duration: parseFloat(s.avg_duration_seconds).toFixed(2) + 's'
                    })));
                }
            }
        }

        // 2. Recent Failures
        console.log('\n--- Recent Failures (Last 5) ---');
        const [failures] = await sequelize.query(`
      SELECT 
        w.workflow_name,
        f.failed_step,
        f.error_message,
        f.created_at
      FROM workflow_failures f
      JOIN workflow_states w ON f.workflow_id = w.id
      ORDER BY f.created_at DESC
      LIMIT 5
    `);

        if (failures.length === 0) {
            console.log('No recent failures recorded.');
        } else {
            failures.forEach(f => {
                console.log(`[${f.created_at}] ${f.workflow_name} (Step: ${f.failed_step}): ${f.error_message}`);
            });
        }

        // 3. Recent Executions
        console.log('\n--- Recent Executions (Last 5) ---');
        const [executions] = await sequelize.query(`
      SELECT 
        id,
        workflow_name,
        status,
        current_step,
        started_at,
        completed_at
      FROM workflow_states
      ORDER BY started_at DESC
      LIMIT 5
    `);

        if (executions.length === 0) {
            console.log('No recent executions.');
        } else {
            executions.forEach(e => {
                console.log(`[${e.started_at}] ${e.workflow_name} - ${e.status.toUpperCase()} (Step: ${e.current_step || 'Start'})`);
            });
        }

    } catch (error) {
        console.error('Error checking BMAD status:', error);
    } finally {
        await sequelize.close();
    }
}

checkBmadStatus();
