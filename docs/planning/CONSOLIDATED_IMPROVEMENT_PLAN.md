# RTGS Sales Automation - Consolidated Improvement Plan

**Context:** 10-person sales team focused on outreach quality
**Total Effort:** 78 hours over 6 weeks (~13 hours/week)
**Priority Focus:** Outreach Quality, AI Learning, Knowledge Repository

---

## Sprint Overview

```
Week 1-2: FOUNDATION (Security + Knowledge Base)
         ├── Critical security fix (SQL injection)
         ├── Knowledge repository structure
         └── Data quality validation

Week 3-4: INTELLIGENCE (AI Learning + Metrics)
         ├── Outcome tracking system
         ├── Agent performance metrics
         └── Template performance ranking

Week 5-6: QUALITY (Scoring + Dashboard)
         ├── Pre-send quality scoring
         ├── Agent success dashboard
         └── What's working insights
```

---

## Week 1-2: Foundation Sprint (26 hours)

### Priority 1: Critical Security Fix (2h)
**Why:** SQL injection could corrupt your workflow data

| Task | File | Hours |
|------|------|-------|
| Fix SQL injection | `WorkflowStateManager.js:224` | 1h |
| Add input validation | Same file | 0.5h |
| Test fix | Manual verification | 0.5h |

```javascript
// BEFORE (vulnerable)
DELETE FROM workflow_states WHERE completed_at < NOW() - INTERVAL '${retentionDays} days'

// AFTER (safe)
DELETE FROM workflow_states WHERE completed_at < NOW() - INTERVAL $1 DAY
// With: [parseInt(retentionDays, 10)]
```

### Priority 2: Knowledge Repository Structure (12h)
**Why:** AI needs accessible knowledge to improve outreach quality

| Task | Hours | Output |
|------|-------|--------|
| Create `knowledge/` folder structure | 1h | Folder hierarchy |
| Migrate case studies from YAML | 2h | `knowledge/company/case-studies.md` |
| Create value propositions doc | 2h | `knowledge/company/value-propositions.md` |
| Write PSP industry playbook | 2h | `knowledge/industry/psp-playbook.md` |
| Create competitive battle cards | 3h | `knowledge/competitive/battle-cards.md` |
| Build basic KnowledgeService | 2h | Load markdown at runtime |

**Deliverable: Knowledge folder structure**
```
knowledge/
├── company/
│   ├── case-studies.md           # 5 detailed case studies
│   ├── value-propositions.md     # 4 core value props
│   └── product-facts.md          # Key capabilities
├── competitive/
│   ├── battle-cards.md           # SWIFT, competitors
│   └── switch-stories.md         # Why customers switched
├── industry/
│   ├── psp-playbook.md           # PSP-specific messaging
│   └── treasury-playbook.md      # Treasury personas
└── learnings/
    ├── what-works.md             # Effective patterns (starts empty)
    └── what-doesnt-work.md       # Failed approaches (starts empty)
```

### Priority 3: Data Quality Agent (12h)
**Why:** Bad data = wasted outreach = poor reputation

| Task | Hours | Output |
|------|-------|--------|
| Create data-quality-guardian agent YAML | 2h | Agent definition |
| Implement email validation | 3h | MX check, format validation |
| Implement duplicate detection | 2h | Cross-campaign dedup |
| Add data completeness scoring | 2h | Score each contact |
| Integrate into prospect-discovery workflow | 3h | Pre-enrichment validation |

**Agent Capabilities:**
- Email format validation
- Domain MX record verification
- Duplicate detection (same email, similar name+company)
- Data completeness score (0-100)
- Block sends to low-quality contacts

---

## Week 3-4: Intelligence Sprint (28 hours)

### Priority 4: Outcome Tracking System (12h)
**Why:** Can't improve what you don't measure

| Task | Hours | Output |
|------|-------|--------|
| Create OutcomeTracking database schema | 2h | New table |
| Hook Lemlist webhooks for opens/replies | 4h | Capture events |
| Link outcomes to templates used | 2h | Template attribution |
| Build outcome summary queries | 2h | Performance by template |
| Auto-update learnings files | 2h | Write to what-works.md |

**Schema:**
```sql
CREATE TABLE outreach_outcomes (
  id SERIAL PRIMARY KEY,
  outreach_id VARCHAR(255),
  template_used VARCHAR(100),
  persona VARCHAR(100),
  industry VARCHAR(100),

  -- Outcomes
  sent_at TIMESTAMP,
  opened BOOLEAN DEFAULT FALSE,
  open_count INTEGER DEFAULT 0,
  replied BOOLEAN DEFAULT FALSE,
  reply_sentiment VARCHAR(20),  -- positive/neutral/negative
  meeting_booked BOOLEAN DEFAULT FALSE,

  -- Learning
  effective_elements JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Priority 5: Agent Performance Metrics (8h)
**Why:** Know which agents are working

| Task | Hours | Output |
|------|-------|--------|
| Add agent execution tracking to metrics.js | 2h | Prometheus metrics |
| Track success/failure per agent | 2h | Counter metrics |
| Track execution time per agent | 2h | Histogram metrics |
| Create basic Grafana dashboard | 2h | Visual monitoring |

**New Metrics:**
```javascript
// Agent metrics to add
agent_execution_total{agent_role, status}      // Counter
agent_execution_duration_ms{agent_role}        // Histogram
agent_quality_score{agent_role}                // Gauge
```

### Priority 6: Template Performance Ranking (8h)
**Why:** Automatically surface what's working

| Task | Hours | Output |
|------|-------|--------|
| Build TemplateRanker service | 3h | Ranking logic |
| Calculate performance by persona | 2h | Persona-specific rankings |
| Create "best template" selector | 2h | AI uses top performers |
| Add weekly performance digest | 1h | Email summary |

**Output Example:**
```
Weekly Template Performance (Auto-Generated)
────────────────────────────────────────────────
Template                  │ Sent │ Reply% │ Meeting%
────────────────────────────────────────────────
expansion_licensing_hook  │   47 │  14.9% │   4.3%  ⭐
liquidity_management_hook │   62 │  11.3% │   3.2%
cost_reduction_hook       │   38 │   7.9% │   2.6%
────────────────────────────────────────────────

Best by Persona:
• Head of Treasury → liquidity_management_hook
• Head of Partnerships → expansion_licensing_hook
• CFO → cost_reduction_hook
```

---

## Week 5-6: Quality Sprint (24 hours)

### Priority 7: Pre-Send Quality Scoring (10h)
**Why:** Prevent bad outreach before it damages reputation

| Task | Hours | Output |
|------|-------|--------|
| Build QualityScorer service | 4h | Scoring logic |
| Implement data quality checks | 2h | Email, title, company |
| Implement message quality checks | 2h | Personalization, length |
| Add quality gates (block low scores) | 2h | Prevent bad sends |

**Quality Score Components:**
```
Data Quality (40%)
├── Email verified: +15
├── Title matches ICP: +10
├── Company validated: +10
└── Recent activity signal: +5

Message Quality (40%)
├── Has personalization: +15
├── Appropriate length: +10
├── Clear CTA: +10
└── No spam triggers: +5

Timing Quality (20%)
├── Business hours local: +10
├── Not recent touch: +5
└── Optimal day: +5

THRESHOLD: Score >= 70 to send
```

### Priority 8: Agent Success Dashboard (8h)
**Why:** Team visibility into AI performance

| Task | Hours | Output |
|------|-------|--------|
| Create dashboard page in desktop app | 4h | New page |
| Display agent metrics | 2h | Success rates |
| Display template rankings | 1h | Best performers |
| Display quality scores | 1h | Send quality trend |

**Dashboard Wireframe:**
```
┌─────────────────────────────────────────────────────┐
│  AGENT PERFORMANCE                                   │
├─────────────────────────────────────────────────────┤
│  Agent                    │ Success │ Avg Time      │
│  ─────────────────────────────────────────────────  │
│  data-quality-guardian    │   97%   │   0.8s        │
│  engagement-analyst       │   94%   │   2.1s        │
│  conversation-strategist  │   91%   │   3.2s        │
│  outreach-orchestrator    │   96%   │   1.4s        │
├─────────────────────────────────────────────────────┤
│  TEMPLATE PERFORMANCE (This Week)                    │
├─────────────────────────────────────────────────────┤
│  expansion_licensing  ████████████░  14.9% reply    │
│  liquidity_mgmt       █████████░░░░  11.3% reply    │
│  cost_reduction       ██████░░░░░░░   7.9% reply    │
├─────────────────────────────────────────────────────┤
│  OUTREACH QUALITY                                    │
├─────────────────────────────────────────────────────┤
│  Avg Quality Score: 82/100                          │
│  Blocked (low quality): 12 this week                │
│  Deliverability: 94.2%                              │
└─────────────────────────────────────────────────────┘
```

### Priority 9: What's Working Insights (6h)
**Why:** Team learns from AI learning

| Task | Hours | Output |
|------|-------|--------|
| Auto-generate weekly insights | 2h | Markdown report |
| Extract winning patterns | 2h | What elements work |
| Surface to conversation-strategist | 2h | AI uses learnings |

**Auto-Generated Insights Example:**
```markdown
# What's Working This Week

## Winning Subject Lines
1. "{{firstName}}, expanding {{company}} into {{region}} overnight" - 18% open lift
2. "Quick question about {{company}}'s treasury workflows" - 12% open lift

## Effective Personalization
- Referencing recent funding rounds: +23% reply rate
- Mentioning specific expansion markets: +18% reply rate
- Company size acknowledgment: +8% reply rate

## Best Performing Elements
- Case study: Singapore fintech (15 markets in 3 months)
- Value prop: "instant global expansion without licensing"
- CTA: Calendar link with "15 minutes" (not "30 minutes")

## What's Not Working
- Generic "hope you're well" openings: -15% reply rate
- Multiple CTAs in same email: -22% reply rate
- Emails over 200 words: -18% reply rate
```

---

## Complete Task List (Prioritized)

| # | Task | Week | Hours | Priority | Depends On |
|---|------|------|-------|----------|------------|
| 1 | Fix SQL injection | 1 | 2h | CRITICAL | - |
| 2 | Create knowledge/ folder structure | 1 | 1h | HIGH | - |
| 3 | Migrate case studies to markdown | 1 | 2h | HIGH | 2 |
| 4 | Create value propositions doc | 1 | 2h | HIGH | 2 |
| 5 | Write PSP industry playbook | 1 | 2h | HIGH | 2 |
| 6 | Create competitive battle cards | 2 | 3h | HIGH | 2 |
| 7 | Build KnowledgeService | 2 | 2h | HIGH | 2-6 |
| 8 | Create data-quality-guardian agent | 2 | 2h | HIGH | - |
| 9 | Implement email validation | 2 | 3h | HIGH | 8 |
| 10 | Implement duplicate detection | 2 | 2h | MEDIUM | 8 |
| 11 | Add data completeness scoring | 2 | 2h | MEDIUM | 8 |
| 12 | Integrate into workflow | 2 | 3h | HIGH | 8-11 |
| 13 | Create OutcomeTracking schema | 3 | 2h | HIGH | - |
| 14 | Hook Lemlist webhooks | 3 | 4h | HIGH | 13 |
| 15 | Link outcomes to templates | 3 | 2h | HIGH | 14 |
| 16 | Build outcome summary queries | 3 | 2h | MEDIUM | 15 |
| 17 | Auto-update learnings files | 4 | 2h | HIGH | 16 |
| 18 | Add agent execution metrics | 3 | 2h | MEDIUM | - |
| 19 | Track agent success/failure | 3 | 2h | MEDIUM | 18 |
| 20 | Track agent execution time | 4 | 2h | LOW | 18 |
| 21 | Create Grafana dashboard | 4 | 2h | MEDIUM | 18-20 |
| 22 | Build TemplateRanker service | 4 | 3h | HIGH | 15 |
| 23 | Calculate performance by persona | 4 | 2h | HIGH | 22 |
| 24 | Create best template selector | 4 | 2h | HIGH | 22-23 |
| 25 | Add weekly performance digest | 4 | 1h | MEDIUM | 22 |
| 26 | Build QualityScorer service | 5 | 4h | HIGH | 8 |
| 27 | Implement quality checks | 5 | 4h | HIGH | 26 |
| 28 | Add quality gates | 5 | 2h | HIGH | 26-27 |
| 29 | Create dashboard page | 6 | 4h | MEDIUM | 18-28 |
| 30 | Display metrics and rankings | 6 | 4h | MEDIUM | 29 |
| 31 | Auto-generate weekly insights | 6 | 2h | HIGH | 17, 22 |
| 32 | Surface learnings to AI | 6 | 2h | HIGH | 7, 31 |

---

## Success Metrics

### After 6 Weeks

| Metric | Current | Target | How Measured |
|--------|---------|--------|--------------|
| Reply Rate | ~10% | 15%+ | Outcome tracking |
| Data Quality | Unknown | >90% | Quality scorer |
| Meeting Rate | ~2% | 4%+ | Outcome tracking |
| Agent Success | Unknown | >95% | Agent metrics |
| Blocked Bad Sends | 0 | 10+/week | Quality gates |
| AI Using Learnings | No | Yes | Knowledge access |

### Key Capabilities Gained

```
✓ AI knows your company's value props, case studies, battle cards
✓ AI learns from every outreach outcome
✓ Bad data blocked before sending
✓ Best templates automatically surfaced
✓ Team sees what's working via dashboard
✓ Weekly insights auto-generated
✓ Quality scoring prevents reputation damage
```

---

## Files to Create/Modify

### New Files
```
knowledge/
├── company/
│   ├── case-studies.md
│   ├── value-propositions.md
│   └── product-facts.md
├── competitive/
│   ├── battle-cards.md
│   └── switch-stories.md
├── industry/
│   ├── psp-playbook.md
│   └── treasury-playbook.md
└── learnings/
    ├── what-works.md
    └── what-doesnt-work.md

sales-automation-api/src/
├── services/
│   ├── KnowledgeService.js
│   ├── OutcomeTracker.js
│   ├── TemplateRanker.js
│   └── QualityScorer.js
├── models/
│   └── OutreachOutcome.cjs

sales-automation-api/bmad-library/modules/sales/agents/
└── data-quality-guardian.agent.yaml

desktop-app/src/pages/
└── PerformanceDashboard.jsx
```

### Modified Files
```
sales-automation-api/src/bmad/WorkflowStateManager.js  # SQL fix
sales-automation-api/src/utils/metrics.js              # Agent metrics
sales-automation-api/bmad-library/.../prospect-discovery.workflow.yaml  # Add quality agent
```

---

## Quick Start (This Week)

### Day 1-2: Security + Knowledge Structure
```bash
# 1. Fix SQL injection (30 min)
# Edit WorkflowStateManager.js:224

# 2. Create knowledge structure
mkdir -p knowledge/{company,competitive,industry,learnings}
touch knowledge/company/{case-studies,value-propositions,product-facts}.md
touch knowledge/competitive/{battle-cards,switch-stories}.md
touch knowledge/industry/{psp-playbook,treasury-playbook}.md
touch knowledge/learnings/{what-works,what-doesnt-work}.md
```

### Day 3-5: Populate Knowledge
- Migrate 5 case studies from `rtgs-global-templates.yaml`
- Write detailed value propositions
- Create first battle card (SWIFT)

Would you like me to start creating the knowledge repository structure and initial content now?
