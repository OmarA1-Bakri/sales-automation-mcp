# Task Router Skill

**Purpose**: Analyze user tasks and recommend + execute the optimal combination of plugins, skills, and agents.

## Capabilities

1. **Task Analysis** - Understand user intent and requirements
2. **Tool Mapping** - Match tasks to available plugins, skills, and agents
3. **Smart Recommendations** - Suggest optimal workflow with reasoning
4. **Auto-Execution** - Optionally execute the recommended workflow

## When to Use This Skill

Invoke this skill at the start of ANY new task when:
- User describes a complex multi-step task
- Task could benefit from multiple tools/plugins
- Uncertain which plugin/skill is best suited
- Want to optimize workflow efficiency

## Analysis Framework

### Step 1: Task Classification

```javascript
function classifyTask(description) {
  const categories = {
    sales: ['lead', 'prospect', 'crm', 'hubspot', 'outreach', 'email'],
    testing: ['test', 'qa', 'validation', 'coverage', 'mock'],
    api: ['endpoint', 'rest', 'graphql', 'api', 'webhook'],
    devops: ['deploy', 'docker', 'kubernetes', 'ci/cd', 'infrastructure'],
    ml: ['model', 'training', 'prediction', 'ml', 'ai', 'neural'],
    data: ['database', 'postgres', 'sql', 'migration', 'schema'],
    frontend: ['react', 'component', 'ui', 'frontend', 'web'],
    backend: ['server', 'backend', 'service', 'microservice']
  };

  // Match task keywords to categories
  const matches = {};
  for (const [category, keywords] of Object.entries(categories)) {
    matches[category] = keywords.filter(kw =>
      description.toLowerCase().includes(kw)
    ).length;
  }

  return Object.entries(matches)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, _]) => category);
}
```

### Step 2: Plugin Matching

```javascript
const PLUGIN_MAP = {
  sales: {
    discovery: ['sales-discover', 'explorium'],
    enrichment: ['sales-enrich', 'explorium'],
    crm: ['sales-import', 'hubspot'],
    outreach: ['sales-outreach', 'lemlist'],
    monitoring: ['sales-monitor'],
    automation: ['sales-yolo']
  },

  testing: {
    api: ['api-test-automation', 'api-fuzzer'],
    performance: ['performance-test-suite', 'load-balancer-tester'],
    security: ['security-test-scanner', 'api-security-scanner'],
    visual: ['visual-regression-tester'],
    accessibility: ['accessibility-test-scanner'],
    contract: ['contract-test-validator'],
    orchestration: ['test-orchestrator']
  },

  api: {
    creation: ['rest-api-generator', 'graphql-server-builder'],
    management: ['api-gateway-builder', 'api-versioning-manager'],
    security: ['api-authentication-builder', 'api-security-scanner'],
    optimization: ['api-cache-manager', 'api-rate-limiter'],
    documentation: ['api-documentation-generator'],
    testing: ['api-load-tester', 'api-mock-server']
  },

  devops: {
    containers: ['docker-compose-generator', 'kubernetes-deployment-creator'],
    cicd: ['ci-cd-pipeline-builder', 'gitops-workflow-builder'],
    infrastructure: ['terraform-module-builder', 'infrastructure-as-code-generator'],
    monitoring: ['monitoring-stack-deployer', 'log-aggregation-setup'],
    security: ['container-security-scanner', 'compliance-checker']
  },

  ml: {
    training: ['ml-model-trainer', 'hyperparameter-tuner'],
    data: ['data-preprocessing-pipeline', 'feature-engineering-toolkit'],
    nlp: ['nlp-text-analyzer', 'sentiment-analysis-tool'],
    vision: ['computer-vision-processor'],
    deployment: ['model-deployment-helper', 'experiment-tracking-setup']
  },

  data: {
    postgres: ['fairdb-operations-kit'],
    migration: ['database-test-manager'],
    modeling: ['nosql-data-modeler', 'orm-code-generator']
  }
};
```

### Step 3: Execution Strategy

```javascript
function buildExecutionPlan(task, matchedPlugins) {
  const plan = {
    phase1_setup: [],      // Preparation and configuration
    phase2_core: [],       // Main execution
    phase3_quality: [],    // Testing and validation
    phase4_deploy: []      // Deployment and monitoring
  };

  // Example: API creation task
  if (task.includes('api')) {
    plan.phase1_setup.push('rest-api-generator');
    plan.phase2_core.push('api-authentication-builder');
    plan.phase3_quality.push('api-security-scanner', 'api-test-automation');
    plan.phase4_deploy.push('docker-compose-generator');
  }

  return plan;
}
```

## Usage Examples

### Example 1: Sales Task

**User**: "I need to find 100 fintech prospects and enroll them in an outreach campaign"

**Analysis**:
```yaml
Task Classification: [sales]
Primary Category: sales/discovery + sales/outreach
Complexity: Medium
Estimated Time: 30-45 minutes

Recommended Workflow:
  1. /sales-discover
     - Find prospects matching fintech ICP
     - Score and filter top 100

  2. /sales-enrich
     - Enrich contact and company data
     - Generate intelligence and personalization

  3. /sales-import
     - Sync to HubSpot CRM
     - Create contacts and companies

  4. /sales-outreach
     - Enroll in lemlist campaign
     - Start outreach sequence

Execution Mode: Sequential (each step depends on previous)
```

### Example 2: API Development

**User**: "Build a REST API with auth, rate limiting, and deploy with Docker"

**Analysis**:
```yaml
Task Classification: [api, devops]
Primary Category: api/creation + api/security + devops/containers
Complexity: High
Estimated Time: 60-90 minutes

Recommended Workflow:
  Phase 1 - Core API:
    - /rest-api-generator:generate-rest-api
    - /api-authentication-builder:build-auth-system

  Phase 2 - Features (Parallel):
    - /api-rate-limiter:add-rate-limiting
    - /api-cache-manager:implement-caching
    - /api-documentation-generator:generate-api-docs

  Phase 3 - Quality (Parallel):
    - /api-security-scanner:scan-api-security
    - /api-test-automation:api-tester

  Phase 4 - Deploy:
    - /docker-compose-generator:docker-compose
    - /monitoring-stack-deployer:monitor-deploy

Execution Mode: Mixed (sequential phases, parallel within phases)
```

### Example 3: ML Pipeline

**User**: "Create a sentiment analysis model and deploy it"

**Analysis**:
```yaml
Task Classification: [ml]
Primary Category: ml/nlp + ml/deployment
Complexity: High
Estimated Time: 90-120 minutes

Recommended Workflow:
  Phase 1 - Data:
    - /data-preprocessing-pipeline:preprocess
    - /feature-engineering-toolkit:feature-eng
    - /dataset-splitter:split-data

  Phase 2 - Training:
    - /nlp-text-analyzer:analyze-text
    - /sentiment-analysis-tool:analyze-sentiment
    - /hyperparameter-tuner:tune-hyper

  Phase 3 - Evaluation:
    - /model-evaluation-suite:eval-model
    - /experiment-tracking-setup:track-experiments

  Phase 4 - Deploy:
    - /model-deployment-helper:deploy-model
    - /api-gateway-builder:build-api-gateway (for serving)

Execution Mode: Sequential with checkpoints
```

## Decision Trees

### Should I use this skill?

```
Is task description > 10 words AND involves multiple tools?
├─ YES → Use task-router
└─ NO → Continue with direct tool selection

Does task mention multiple domains (e.g., "build API and deploy")?
├─ YES → Use task-router
└─ NO → May use task-router for optimization

Is user unsure which plugin/skill to use?
├─ YES → Definitely use task-router
└─ NO → Optional but recommended
```

### Execution Strategy Selection

```
Are all steps independent?
├─ YES → Execute in parallel
└─ NO → Sequential execution

Can failures be isolated?
├─ YES → Continue on error
└─ NO → Stop on first error

Does task have natural phases?
├─ YES → Group by phase, parallel within phase
└─ NO → Optimize based on dependencies
```

## Output Format

When this skill executes, provide:

### 1. Task Summary
- Classified categories
- Identified requirements
- Complexity assessment

### 2. Recommended Tools
- Primary tools (must use)
- Supporting tools (should use)
- Optional tools (nice to have)

### 3. Execution Plan
- Step-by-step workflow
- Parallel vs sequential execution
- Estimated time per step

### 4. Risk Assessment
- Potential issues
- Mitigation strategies
- Fallback options

### 5. Next Steps
- Confirm plan with user
- Execute automatically (if approved)
- Provide alternative approaches

## Integration with Other Skills

This skill works well with:
- **sugar:task-planner** - For complex project planning
- **work-critic** - For quality review after execution
- **pi-pathfinder:skill-adapter** - For learning from other plugins

## Maintenance

Update `PLUGIN_MAP` when new plugins are installed:
1. Add plugin to appropriate category
2. Update decision trees if needed
3. Test with sample tasks from that domain
