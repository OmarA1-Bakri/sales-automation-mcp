# Task Router - Quick Reference

## Invocation

```bash
/task-router                                    # Slash command
"task router: <your task description>"          # Direct mention
"which plugin for <task>?"                      # Question format
```

## Category → Plugin Map

### 🎯 Sales & CRM
| Task | Command | Description |
|------|---------|-------------|
| Find prospects | `/sales-discover` | ICP-based lead discovery |
| Enrich data | `/sales-enrich` | Company + contact enrichment |
| Sync to CRM | `/sales-import` | HubSpot import |
| Email campaigns | `/sales-outreach` | lemlist automation |
| Monitor campaigns | `/sales-monitor` | Performance tracking |
| Full automation | `/sales-yolo` | End-to-end autonomous |

### 🧪 Testing & QA
| Task | Plugin | Use For |
|------|--------|---------|
| API testing | `api-test-automation` | Endpoint validation |
| Performance | `performance-test-suite` | Load testing |
| Security | `security-test-scanner` | Vulnerability scans |
| Visual regression | `visual-regression-tester` | Screenshot diffs |
| Accessibility | `accessibility-test-scanner` | WCAG compliance |
| Contract testing | `contract-test-validator` | API contracts |
| Chaos engineering | `chaos-engineering-toolkit` | Resilience testing |

### 🌐 API Development
| Task | Plugin | Use For |
|------|--------|---------|
| REST API | `rest-api-generator` | Generate REST endpoints |
| GraphQL | `graphql-server-builder` | GraphQL server |
| Authentication | `api-authentication-builder` | Auth system |
| Rate limiting | `api-rate-limiter` | Throttling |
| API Gateway | `api-gateway-builder` | Gateway + routing |
| Documentation | `api-documentation-generator` | OpenAPI/Swagger |
| WebSockets | `websocket-server-builder` | Real-time comms |
| Caching | `api-cache-manager` | Multi-level cache |

### 🚀 DevOps & Infrastructure
| Task | Plugin | Use For |
|------|--------|---------|
| Docker | `docker-compose-generator` | Docker Compose |
| Kubernetes | `kubernetes-deployment-creator` | K8s manifests |
| CI/CD | `ci-cd-pipeline-builder` | Pipeline config |
| Terraform | `terraform-module-builder` | IaC modules |
| Helm | `helm-chart-generator` | Helm charts |
| Monitoring | `monitoring-stack-deployer` | Prometheus/Grafana |
| Secrets | `secrets-manager-integrator` | Secret management |

### 🤖 AI/ML
| Task | Plugin | Use For |
|------|--------|---------|
| Model training | `ml-model-trainer` | Train models |
| Data prep | `data-preprocessing-pipeline` | Data cleaning |
| NLP | `nlp-text-analyzer` | Text analysis |
| Sentiment | `sentiment-analysis-tool` | Sentiment scoring |
| Computer vision | `computer-vision-processor` | Image processing |
| Time series | `time-series-forecaster` | Forecasting |
| Recommendations | `recommendation-engine` | Rec systems |
| Model deployment | `model-deployment-helper` | Deploy models |

### 💾 Data & Databases
| Task | Plugin | Use For |
|------|--------|---------|
| PostgreSQL ops | `fairdb-operations-kit` | DB management |
| Database testing | `database-test-manager` | DB tests |
| ORM generation | `orm-code-generator` | Model generation |

## Common Workflows

### Sales Funnel (Sequential)
```
/sales-discover → /sales-enrich → /sales-import → /sales-outreach
```

### API → Deploy (Phased)
```
Phase 1: rest-api-generator + api-authentication-builder
Phase 2: api-security-scanner + api-documentation-generator (parallel)
Phase 3: docker-compose-generator + monitoring-stack-deployer
```

### ML Pipeline (Sequential with Checkpoints)
```
data-preprocessing-pipeline
    ↓
feature-engineering-toolkit
    ↓
ml-model-trainer + hyperparameter-tuner (parallel)
    ↓
model-evaluation-suite (checkpoint)
    ↓
model-deployment-helper
```

### Full-Stack App (Complex)
```
Backend:
  rest-api-generator
    ↓
  api-authentication-builder
    ↓
  api-test-automation + api-security-scanner (parallel)

DevOps:
  docker-compose-generator
    ↓
  kubernetes-deployment-creator
    ↓
  monitoring-stack-deployer + log-aggregation-setup (parallel)
```

## Decision Matrix

| If your task involves... | Use... |
|--------------------------|--------|
| Finding/contacting prospects | Sales plugins |
| Building endpoints | API plugins |
| Training models | ML plugins |
| Deploying apps | DevOps plugins |
| Testing quality | Testing plugins |
| Managing data | Data plugins |

## Execution Modes

| Pattern | When to Use | Example |
|---------|-------------|---------|
| **Sequential** | Steps depend on each other | Discovery → Enrichment → CRM → Outreach |
| **Parallel** | Independent operations | Security scan + Docs generation + Testing |
| **Phased** | Groups of steps | Phase 1: Build, Phase 2: Test, Phase 3: Deploy |
| **Conditional** | Branch based on results | If quality > 0.7, then proceed to outreach |

## Complexity Estimates

| Level | Time | Example |
|-------|------|---------|
| **Simple** | < 15 min | Single plugin, clear task |
| **Medium** | 15-45 min | 2-3 plugins, sequential workflow |
| **High** | 45-90 min | 4+ plugins, phased execution |
| **Complex** | 90+ min | Multiple domains, conditional logic |

## Tips for Better Results

### ✅ DO
- Be specific about requirements
- Mention tech stack if relevant
- State any constraints (time, cost, etc.)
- Ask for alternatives
- Review plan before executing

### ❌ DON'T
- Use vague descriptions
- Assume implied requirements
- Skip the planning phase
- Execute without understanding
- Ignore warnings/risks

## Example Phrases

### Good Task Descriptions
```
"Find 100 fintech CFOs, enrich their data, and start a cold email campaign"
"Build a REST API with JWT auth, deploy to Docker, add monitoring"
"Train a sentiment classifier on Twitter data and deploy as an API"
"Set up K8s cluster with auto-scaling and log aggregation"
```

### Too Vague
```
"Help with sales"           → Specify: discovery? outreach? CRM?
"Create an API"             → Specify: REST? GraphQL? What features?
"Deploy something"          → Specify: What? Where? How?
"Train a model"             → Specify: What type? What data?
```

## Keyboard Shortcuts (Mental Model)

```
Sales = /sales-*
API = /api-* or *-api-*
ML = /ml-* or *-model-* or data-*
DevOps = *-deployment-* or *-deploy or docker-* or kubernetes-*
Testing = *-test-* or *-tester
```

## Quick Wins

| Want to... | Just use... |
|------------|-------------|
| Find leads fast | `/sales-discover` |
| Quick API | `/rest-api-generator:generate-rest-api` |
| Dockerize anything | `/docker-compose-generator:docker-compose` |
| Security scan | `/api-security-scanner:scan-api-security` |
| Deploy to K8s | `/kubernetes-deployment-creator:k8s-deploy` |
| Train classifier | `/classification-model-builder:build-classifier` |

---

**When in doubt**: Use `/task-router` and let it guide you!
