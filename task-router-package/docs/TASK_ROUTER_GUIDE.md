# Task Router - Installation & Usage Guide

## What is Task Router?

**Task Router** is an intelligent skill that analyzes your task description and automatically recommends the best plugins, skills, and agents to use from your installed collection. Think of it as a "smart assistant for your smart assistant."

### Key Features

✅ **Automatic Task Analysis** - Classifies your task into categories
✅ **Smart Recommendations** - Suggests optimal tools and workflows
✅ **Execution Planning** - Creates step-by-step execution plans
✅ **Complexity Estimation** - Estimates time and difficulty
✅ **Multi-Domain Support** - Sales, API, ML, DevOps, Testing, and more

## Installation

The task router is already installed! It consists of:

### 1. Slash Command
**Location**: `.claude/commands/task-router.md`

Provides an interactive command interface accessible via `/task-router`

### 2. Skill Definition
**Location**: `skills/task-router/skill.md`

Contains the intelligence engine for task analysis and plugin mapping

### 3. Documentation
- `skills/task-router/README.md` - Comprehensive guide
- `skills/task-router/QUICK_REFERENCE.md` - Quick lookup cheat sheet

## Usage

### Method 1: Slash Command (Recommended)

```bash
/task-router
```

Then describe your task when prompted.

### Method 2: Direct Mention

```
"task router: I need to build a REST API with authentication"
```

### Method 3: Question Format

```
"Which plugins should I use to deploy a microservices app?"
"What's the best way to set up a sales funnel?"
"Help me route this task: train a sentiment analysis model"
```

## How It Works

### Step 1: Task Analysis

The router analyzes your task description using keyword matching:

```javascript
Input: "Find 100 SaaS companies and send cold emails"

Analysis:
  Keywords: ['find', 'companies', 'send', 'emails']
  Category: sales
  Sub-categories: [discovery, outreach]
  Complexity: Medium
```

### Step 2: Plugin Matching

Maps your task to available plugins:

```javascript
Matches:
  - sales-discover (discovery)
  - sales-enrich (data quality)
  - sales-import (CRM sync)
  - sales-outreach (campaigns)
```

### Step 3: Workflow Planning

Creates optimal execution sequence:

```javascript
Execution Plan:
  1. /sales-discover
     - Find companies matching ICP
     - Discover contact information

  2. /sales-enrich
     - Enrich company data
     - Generate intelligence

  3. /sales-import
     - Sync to HubSpot

  4. /sales-outreach
     - Enroll in lemlist campaign
     - Start email sequence

Strategy: Sequential
Reason: Each step depends on previous results
Time: 30-45 minutes
```

### Step 4: Execution

With your approval, executes the workflow or provides commands to run.

## Examples

### Example 1: Simple Sales Task

**Input**:
```
/task-router
Task: Find 50 fintech prospects
```

**Output**:
```yaml
Task Category: sales
Complexity: Low
Time: 10-15 minutes

Recommended:
  Primary: /sales-discover
  Optional: /sales-enrich (for higher quality data)

Workflow:
  1. /sales-discover
     - Specify ICP: fintech companies
     - Set count: 50
     - Review and export

Next Steps:
  - Review discovered leads
  - Consider enrichment if needed
  - Sync to HubSpot or export CSV
```

### Example 2: Full-Stack Development

**Input**:
```
task router: Build a GraphQL API with auth, deploy to Kubernetes, add monitoring
```

**Output**:
```yaml
Task Category: api, devops
Complexity: High
Time: 90-120 minutes

Workflow:
  Phase 1 - API Creation (Sequential):
    1. /graphql-server-builder:build-graphql-server
    2. /api-authentication-builder:build-auth-system

  Phase 2 - Quality (Parallel):
    - /api-security-scanner:scan-api-security
    - /api-documentation-generator:generate-api-docs
    - /api-test-automation:api-tester

  Phase 3 - Deploy (Sequential):
    1. /docker-compose-generator:docker-compose
    2. /kubernetes-deployment-creator:k8s-deploy
    3. /monitoring-stack-deployer:monitor-deploy

Execution Strategy: Phased
  - Phase 1: Sequential (API must exist before auth)
  - Phase 2: Parallel (independent quality checks)
  - Phase 3: Sequential (deploy order matters)
```

### Example 3: ML Pipeline

**Input**:
```
Which plugins for: train a text classification model and deploy as API?
```

**Output**:
```yaml
Task Category: ml, api
Complexity: Very High
Time: 2-3 hours

Workflow:
  Phase 1 - Data Preparation:
    1. /data-preprocessing-pipeline:preprocess
    2. /feature-engineering-toolkit:feature-eng
    3. /dataset-splitter:split-data

  Phase 2 - Model Training:
    1. /classification-model-builder:build-classifier
    2. /hyperparameter-tuner:tune-hyper (optional but recommended)
    3. /model-evaluation-suite:eval-model (checkpoint)

  Phase 3 - Deployment:
    1. /model-deployment-helper:deploy-model
    2. /rest-api-generator:generate-rest-api (for serving predictions)
    3. /docker-compose-generator:docker-compose

  Phase 4 - Production (Optional):
    - /monitoring-stack-deployer:monitor-deploy
    - /api-rate-limiter:add-rate-limiting

Warnings:
  - ML training can take time; monitor progress
  - Ensure sufficient compute resources
  - Consider model versioning from start

Alternative Approaches:
  - Use AutoML: /automl-pipeline-builder:build-automl
  - Pre-trained model: /transfer-learning-adapter:*
```

## Plugin Categories Reference

### Sales & CRM (6 tools)
- `sales-discover` - Lead discovery
- `sales-enrich` - Data enrichment
- `sales-import` - HubSpot sync
- `sales-outreach` - Email campaigns
- `sales-monitor` - Performance tracking
- `sales-yolo` - Full automation

### API Development (20+ tools)
- Creation: `rest-api-generator`, `graphql-server-builder`, `grpc-service-generator`
- Security: `api-authentication-builder`, `api-security-scanner`
- Features: `api-rate-limiter`, `api-cache-manager`, `webhook-handler-creator`
- Documentation: `api-documentation-generator`, `api-contract-generator`
- Testing: `api-test-automation`, `api-load-tester`, `api-mock-server`

### DevOps & Infrastructure (25+ tools)
- Containers: `docker-compose-generator`, `kubernetes-deployment-creator`
- CI/CD: `ci-cd-pipeline-builder`, `gitops-workflow-builder`
- Infrastructure: `terraform-module-builder`, `ansible-playbook-creator`
- Monitoring: `monitoring-stack-deployer`, `log-aggregation-setup`
- Configuration: `secrets-manager-integrator`, `environment-config-manager`

### Testing & QA (15+ tools)
- API: `api-test-automation`, `api-fuzzer`
- Performance: `performance-test-suite`, `load-balancer-tester`
- Security: `security-test-scanner`
- Specialized: `visual-regression-tester`, `accessibility-test-scanner`
- Orchestration: `test-orchestrator`, `test-environment-manager`

### AI/ML (25+ tools)
- Training: `ml-model-trainer`, `hyperparameter-tuner`, `automl-pipeline-builder`
- Data: `data-preprocessing-pipeline`, `feature-engineering-toolkit`
- NLP: `nlp-text-analyzer`, `sentiment-analysis-tool`
- Vision: `computer-vision-processor`
- Deployment: `model-deployment-helper`, `experiment-tracking-setup`

### Data & Databases (5+ tools)
- `fairdb-operations-kit` - PostgreSQL operations
- `database-test-manager` - DB testing
- `orm-code-generator` - Model generation
- `data-validation-engine` - Validation rules
- `nosql-data-modeler` - NoSQL design

## Advanced Features

### Custom Plugin Mapping

Edit `skills/task-router/skill.md` to add your own plugins:

```javascript
const PLUGIN_MAP = {
  your_category: {
    your_subcategory: ['your-plugin-name']
  }
};
```

### Complexity Scoring

The router estimates complexity based on:
- Number of steps required
- Dependencies between steps
- Domain expertise needed
- Estimated execution time

```javascript
Complexity Calculation:
  Simple: 1-2 plugins, no dependencies, < 15 min
  Medium: 2-4 plugins, linear flow, 15-45 min
  High: 4-6 plugins, branching, 45-90 min
  Very High: 6+ plugins, multiple phases, 90+ min
```

### Execution Strategies

#### Sequential
All steps run one after another. Use when each step depends on the previous.

```
Step 1 → Step 2 → Step 3 → Step 4
```

#### Parallel
Independent steps run simultaneously. Use when steps don't depend on each other.

```
     ┌─ Step 2a ─┐
Step 1            → Step 4
     └─ Step 2b ─┘
```

#### Phased
Combination of sequential and parallel. Use for complex multi-stage tasks.

```
Phase 1: Step 1 → Step 2
            ↓
Phase 2: ┌─ Step 3a ─┐
         └─ Step 3b ─┘
            ↓
Phase 3: Step 4 → Step 5
```

## Tips for Best Results

### ✅ Be Specific
**Good**: "Find 100 SaaS CFOs at Series B companies and send them cold emails about treasury management"

**Bad**: "Find some leads"

### ✅ Mention Constraints
**Good**: "Build a REST API with auth in under 1 hour using Express.js"

**Bad**: "Make an API"

### ✅ State End Goal
**Good**: "Train a model and deploy to production with monitoring"

**Bad**: "Machine learning stuff"

### ✅ Ask for Alternatives
"Show me 2-3 different approaches to solve this"

### ✅ Review Before Executing
Always review the recommended plan and understand each step before proceeding.

## Troubleshooting

### No Recommendations

**Cause**: Task description too vague or doesn't match any categories

**Fix**:
- Add more keywords
- Specify the domain (e.g., "sales task: ...")
- Manually mention which category (API, ML, DevOps, etc.)

### Wrong Recommendations

**Cause**: Keyword matching confusion

**Fix**:
- Rephrase task description
- Explicitly mention tool names if you know them
- Update PLUGIN_MAP in skill.md

### Too Many Recommendations

**Cause**: Task is too broad

**Fix**:
- Break task into smaller sub-tasks
- Specify what you DON'T need
- Focus on immediate next step

## Integration with Other Tools

### Works Great With

- **sugar:task-planner** - For multi-day project planning
- **work-critic** - For quality review after execution
- **pi-pathfinder:skill-adapter** - For learning from other plugins
- **repo-research-analyst** - For codebase analysis

### Workflow Example

```bash
# 1. Plan the task
/task-router
Task: Build and deploy a new microservice

# 2. Execute recommended workflow
# (Router suggests: API creation → Testing → Deploy → Monitor)

# 3. Review quality
/work-critic

# 4. Create comprehensive plan for next sprint
/sugar:sugar-task
```

## Performance

- **Analysis time**: < 1 second
- **Recommendation quality**: Depends on task description specificity
- **Execution time**: Varies by workflow (see complexity estimates)

## Future Enhancements

Planned features:
- [ ] Learning from past task executions
- [ ] User preference tracking
- [ ] Cost estimation for cloud resources
- [ ] Integration with project management tools
- [ ] Automatic workflow optimization based on results

## Contributing

### Add New Plugins

1. Edit `skills/task-router/skill.md`
2. Add to `PLUGIN_MAP`
3. Update keywords if needed
4. Test with sample tasks
5. Update documentation

### Improve Classification

1. Analyze misclassified tasks
2. Add/refine keywords
3. Adjust scoring weights
4. Test improvements

### Share Examples

Submit PRs with:
- Real task descriptions
- Expected vs actual recommendations
- Improvements you'd like to see

## Support

For issues or questions:
1. Check `QUICK_REFERENCE.md` for quick answers
2. Review examples in `README.md`
3. Examine `skill.md` for algorithm details
4. File an issue in the repository

## Quick Start Checklist

- [ ] Verify task-router files are in place
- [ ] Try `/task-router` command
- [ ] Test with a simple task
- [ ] Review recommendations
- [ ] Execute a workflow
- [ ] Bookmark `QUICK_REFERENCE.md`

---

**Ready to get started?** Run `/task-router` and describe any task!
