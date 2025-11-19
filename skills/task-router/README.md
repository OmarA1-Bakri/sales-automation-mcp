# Task Router Skill

> Smart plugin and skill selector that analyzes your task and recommends the optimal workflow

## Quick Start

### As a Slash Command

```bash
/task-router

# Then describe your task when prompted
```

### Direct Usage

Just describe your task and mention "task router" or "which plugin should I use":

```
User: "task router: I need to build a REST API with authentication"
User: "Which plugins should I use to create a sentiment analysis model?"
User: "Help me route this task: deploy a microservices app to Kubernetes"
```

## What It Does

1. **Analyzes** your task description
2. **Classifies** the task into categories (sales, API, ML, DevOps, etc.)
3. **Recommends** the best plugins, skills, and agents
4. **Plans** the execution workflow (sequential vs parallel)
5. **Estimates** complexity and time
6. **Executes** the workflow (with your approval)

## Use Cases

### 🎯 Perfect For

- Complex tasks requiring multiple tools
- Uncertainty about which plugin to use
- Optimizing workflow efficiency
- Learning what tools are available

### 🚫 Not Needed For

- Simple single-tool tasks
- Tasks where you already know the exact tool
- Very short/trivial operations

## Examples

### Example 1: Sales Automation

**Input**: "Find 50 SaaS CFOs and send them a cold email campaign"

**Output**:
```yaml
Task Category: sales
Complexity: Medium
Time: 30-40 minutes

Workflow:
  1. /sales-discover - Find SaaS companies and CFO contacts
  2. /sales-enrich - Enrich with company data and intelligence
  3. /sales-import - Sync to HubSpot CRM
  4. /sales-outreach - Enroll in lemlist campaign

Execution: Sequential (each step feeds the next)
```

### Example 2: Full-Stack Development

**Input**: "Build a GraphQL API, add authentication, containerize it, and deploy to Kubernetes"

**Output**:
```yaml
Task Category: api, devops
Complexity: High
Time: 90-120 minutes

Workflow:
  Phase 1 - API Creation:
    - /graphql-server-builder:build-graphql-server
    - /api-authentication-builder:build-auth-system

  Phase 2 - Quality & Docs (Parallel):
    - /api-security-scanner:scan-api-security
    - /api-documentation-generator:generate-api-docs
    - /api-test-automation:api-tester

  Phase 3 - Deploy:
    - /docker-compose-generator:docker-compose
    - /kubernetes-deployment-creator:k8s-deploy
    - /monitoring-stack-deployer:monitor-deploy

Execution: Sequential phases, parallel within phases
```

### Example 3: ML Pipeline

**Input**: "Train a text classification model and deploy it as an API"

**Output**:
```yaml
Task Category: ml, api
Complexity: High
Time: 2-3 hours

Workflow:
  Phase 1 - Data Prep:
    - /data-preprocessing-pipeline:preprocess
    - /feature-engineering-toolkit:feature-eng
    - /dataset-splitter:split-data

  Phase 2 - Training:
    - /classification-model-builder:build-classifier
    - /hyperparameter-tuner:tune-hyper
    - /model-evaluation-suite:eval-model

  Phase 3 - Deploy:
    - /model-deployment-helper:deploy-model
    - /rest-api-generator:generate-rest-api (for serving)
    - /docker-compose-generator:docker-compose

Execution: Sequential with validation checkpoints
```

## How It Works

### 1. Task Analysis

The skill uses pattern matching and keyword extraction:

```javascript
// Sales keywords
['lead', 'prospect', 'crm', 'outreach', 'email', 'hubspot']

// API keywords
['endpoint', 'rest', 'graphql', 'api', 'webhook', 'server']

// ML keywords
['model', 'training', 'prediction', 'ml', 'ai', 'dataset']

// DevOps keywords
['deploy', 'docker', 'kubernetes', 'ci/cd', 'infrastructure']
```

### 2. Plugin Mapping

Maintains a comprehensive map of all installed plugins:

```javascript
{
  sales: {
    discovery: ['sales-discover'],
    enrichment: ['sales-enrich'],
    crm: ['sales-import'],
    outreach: ['sales-outreach']
  },
  api: {
    creation: ['rest-api-generator', 'graphql-server-builder'],
    security: ['api-authentication-builder'],
    testing: ['api-test-automation']
  }
  // ... etc
}
```

### 3. Execution Planning

Determines optimal execution strategy:

- **Sequential**: Steps depend on each other
- **Parallel**: Independent steps can run simultaneously
- **Phased**: Mix of sequential and parallel
- **Conditional**: Branch based on intermediate results

### 4. Risk Assessment

Identifies potential issues:

- Missing dependencies
- Rate limits
- Data quality concerns
- Security considerations

## Configuration

### Update Plugin Map

When you install new plugins, update the `PLUGIN_MAP` in [skill.md](./skill.md):

```javascript
const PLUGIN_MAP = {
  your_category: {
    your_subcategory: ['your-new-plugin']
  }
};
```

### Customize Decision Rules

Modify the decision trees based on your workflow preferences.

## Integration

### Works With

- **sugar:task-planner** - For multi-day project planning
- **work-critic** - For post-execution quality review
- **pi-pathfinder:skill-adapter** - For discovering new capabilities

### Complementary Commands

- `/sales-*` - Sales automation workflows
- `/api-*` - API development tools
- `/ml-*` - Machine learning pipelines
- Various DevOps and testing tools

## Tips

1. **Be specific** - More detail = better recommendations
2. **Mention constraints** - Time limits, tech stack, etc.
3. **Ask for alternatives** - Get multiple approaches
4. **Review before executing** - Understand the plan
5. **Update regularly** - Keep plugin map current

## Troubleshooting

### "No plugins recommended"

- Task description may be too vague
- Try rephrasing with more keywords
- Manually specify domain (e.g., "sales task: ...")

### "Too many plugins suggested"

- Task may be too broad
- Break into smaller sub-tasks
- Specify what you DON'T need

### "Wrong plugins recommended"

- Update PLUGIN_MAP with better mappings
- Provide feedback to improve classification
- Override with manual selection

## Contributing

To improve this skill:

1. Add new plugins to `PLUGIN_MAP`
2. Enhance keyword classifications
3. Add new decision tree branches
4. Submit examples of good/bad recommendations

## License

MIT - Same as parent sales-automation-suite plugin
