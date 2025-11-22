import { WorkflowEngine } from './src/bmad/WorkflowEngine';

async function test() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  B-MAD WORKFLOW ENGINE - INTEGRATION TEST');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const engine = new WorkflowEngine();

    console.log('Testing Workflow: prospect-discovery\n');
    const result = await engine.runWorkflow('prospect-discovery', {
      market_segment: {
        industry: 'SaaS',
        company_size: '50-200',
        location: 'North America'
      }
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  WORKFLOW EXECUTION COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\nFinal Context:', JSON.stringify(result, null, 2));
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

test();
