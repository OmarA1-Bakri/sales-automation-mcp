# Sales Automation Suite - Technical Architecture

**For Claude Code AI Agents**

This document provides comprehensive technical architecture for AI agents working with the sales automation suite.

---

## System Overview

The sales automation suite is a **multi-agent system** for autonomous B2B sales prospecting, enrichment, and outreach. It orchestrates four specialized MCP servers and four worker agents to execute end-to-end sales workflows.

### Core Principle

**Autonomous Intelligence**: Agents make decisions based on ICP scoring, data quality, and performance metrics without human intervention (when configured for YOLO mode).

---

## Architecture Layers

### 1. User Interface Layer

**Claude Code Plugin UI**:
- Slash commands (`/sales-discover`, `/sales-enrich`, etc.)
- Interactive prompts and confirmations
- Real-time progress updates
- Results visualization

**API Server Dashboard**:
- REST API (JSON endpoints)
- WebSocket (real-time events)
- Web dashboard (HTML/JS)
- Job queue monitoring

### 2. Orchestration Layer

**Sales Orchestrator Agent** (`agents/sales-orchestrator.md`):
- Coordinates all workflow execution
- Manages job scheduling and priority
- Routes tasks to appropriate workers
- Aggregates results and reports progress

**Job Queue System** (`utils/job-queue.js`):
- SQLite-based persistent queue
- Status tracking: pending → in_progress → completed/failed
- Priority levels: high, normal, low
- Automatic retry on transient failures

**Claude API Integration**:
- Model selection based on task type:
  - **Haiku 4-5**: Discovery, enrichment, sync, monitoring
  - **Sonnet 4-5**: Content creation, personalization, optimization
- Tool execution routing
- Streaming responses for long-running tasks

### 3. Worker Layer

Four specialized workers execute domain-specific logic:

#### Lead Discovery Worker

**File**: `mcp-server/src/workers/lead-discovery-worker.js`

**Responsibilities**:
1. ICP profile matching (composite scoring algorithm)
2. Intent signal detection (funding, hiring, expansion)
3. Account-based targeting (find contacts at specific companies)
4. Multi-source aggregation (Explorium, HubSpot, manual lists)
5. Deduplication against existing CRM data

**Key Algorithm** - Composite ICP Scoring:

```
ICP Score = (Fit × 0.35) + (Intent × 0.35) + (Reachability × 0.20) + (Freshness × 0.10)

Components:
  Fit Score (0.35):
    - Industry match: Binary (1.0 if match, 0 if not)
    - Employee range: 1.0 if in range, 0.5 if close, 0 if far
    - Revenue range: 0.8 default (would parse actual revenue string)
    - Technology stack: (# matching techs) / (# target techs)
    - Geography: Binary (1.0 if match, 0 if not)

  Intent Score (0.35):
    Weighted by signal type:
      - Funding: 0.90
      - Expansion: 0.85
      - New product: 0.80
      - Hiring: 0.75
      - Regulatory: 0.70
      - Partnership: 0.65
      - Media presence: 0.60

  Reachability Score (0.20):
    - Email verification rate (from enrichment data)
    - Default: 0.70 if not available

  Freshness Score (0.10):
    - Decays over 90 days: max(0, 1 - days_since_update / 90)
    - Default: 0.80 if no update date
```

**Contact Scoring**:

```
Contact Score = (Title Match × 0.40) + (Seniority × 0.30) + (Email Verified × 0.20) + (LinkedIn × 0.10)

Components:
  Title Match (0.40):
    - Exact match with target titles: 0.40
    - No match: 0.10

  Seniority (0.30):
    - C-Level: 1.0 × 0.30 = 0.30
    - VP: 0.9 × 0.30 = 0.27
    - Director: 0.8 × 0.30 = 0.24
    - Manager: 0.6 × 0.30 = 0.18
    - Individual: 0.4 × 0.30 = 0.12

  Email Verified (0.20):
    - Verified: 0.20
    - Not verified: 0.00

  LinkedIn Profile (0.10):
    - Has LinkedIn URL: 0.10
    - No LinkedIn: 0.00
```

#### Enrichment Worker

**File**: `mcp-server/src/workers/enrichment-worker.js`

**Responsibilities**:
1. Contact enrichment (job title, email verification, LinkedIn, phone)
2. Company enrichment (firmographics, technographics, signals)
3. Intelligence generation (pain hypotheses, personalization hooks, "why now")
4. Data quality scoring (0-1 scale)
5. Caching (30-day TTL to avoid re-enriching)

**Intelligence Generation Process**:

```javascript
// Step 1: Extract raw signals from enriched data
const signals = companyData.signals;          // ['funding', 'expansion']
const technologies = companyData.technologies; // ['Stripe', 'AWS']
const industry = companyData.industry;         // 'Payment Processing'
const employees = companyData.employees;       // 250
const fundingStage = companyData.fundingStage; // 'Series B'

// Step 2: Generate pain hypotheses based on profile
const painHypotheses = [];

if (signals.includes('expansion')) {
  painHypotheses.push({
    pain: 'Liquidity management across multiple markets',
    confidence: 0.85,
    reasoning: 'Company is expanding geographically',
    icpAlignment: 'High - expansion requires treasury infrastructure'
  });
}

if (signals.includes('funding')) {
  painHypotheses.push({
    pain: 'Managing increased transaction volumes',
    confidence: 0.80,
    reasoning: `Recent funding (${fundingStage}) indicates growth phase`,
    icpAlignment: 'High - growing PSPs need scalable infrastructure'
  });
}

// Step 3: Extract personalization hooks
const personalizationHooks = [];

if (signals.includes('funding')) {
  personalizationHooks.push({
    hook: `Recent ${fundingStage} funding`,
    strength: 0.90,
    usage: `Congratulations on your ${fundingStage} round. What are your plans for scaling?`
  });
}

if (signals.includes('expansion')) {
  personalizationHooks.push({
    hook: 'Geographic expansion',
    strength: 0.85,
    usage: 'I noticed you\'re expanding into new markets. How are you handling multi-currency settlement?'
  });
}

// Step 4: Determine "why now" urgency trigger
let whyNow = null;

if (signals.includes('funding')) {
  whyNow = {
    trigger: 'Recent funding round',
    urgency: 'high',
    reasoning: 'Companies prioritize infrastructure investments post-funding'
  };
} else if (signals.includes('expansion')) {
  whyNow = {
    trigger: 'Geographic expansion',
    urgency: 'high',
    reasoning: 'Expansion creates immediate need for multi-market treasury'
  };
}

// Result
const intelligence = {
  painHypotheses,      // Ranked by confidence
  personalizationHooks, // Ranked by strength
  whyNow               // Primary urgency trigger
};
```

**Data Quality Scoring**:

```
Quality Score = (Contact Data × 0.40) + (Company Data × 0.40) + (Confidence × 0.20)

Contact Data (40 points possible):
  ✓ Email: 10 pts
  ✓ Email verified: 10 pts
  ✓ Title: 5 pts
  ✓ LinkedIn URL: 5 pts
  ✓ Phone: 5 pts
  ✓ Location: 5 pts

Company Data (40 points possible):
  ✓ Name: 5 pts
  ✓ Domain: 5 pts
  ✓ Industry: 5 pts
  ✓ Employees: 5 pts
  ✓ Revenue: 5 pts
  ✓ Technologies (any): 5 pts
  ✓ Funding stage: 5 pts
  ✓ Signals (any): 5 pts

Confidence (20 points possible):
  ✓ Contact confidence score: 0-10 pts (Explorium's confidence × 10)
  ✓ Company confidence score: 0-10 pts

Final Score = Total Points / 100
```

#### CRM Sync Worker

**File**: `mcp-server/src/workers/crm-sync-worker.js`

**Responsibilities**:
1. Deduplication (email-based for contacts, domain-based for companies)
2. Property mapping (standard + custom intelligence fields)
3. Company-contact association
4. Activity timeline logging
5. Batch operations with error recovery

**Property Mapping Logic**:

```javascript
// Standard HubSpot properties
const properties = {
  // Identity
  email: contact.email,
  firstname: contact.firstName,
  lastname: contact.lastName,

  // Professional
  jobtitle: contact.title,
  phone: contact.phoneNumber,
  linkedin_url: contact.linkedinUrl,
  seniority: contact.seniority,
  department: contact.department,

  // Company (if not associating separately)
  company: company.name,
  domain: company.domain
};

// Custom intelligence properties
if (intelligence) {
  // Pain points (semicolon-separated)
  properties.pain_points = intelligence.painHypotheses
    .map(p => p.pain)
    .join('; ');

  // Max pain confidence
  properties.pain_confidence = Math.max(
    ...intelligence.painHypotheses.map(p => p.confidence)
  );

  // Personalization hooks
  properties.personalization_hooks = intelligence.personalizationHooks
    .map(h => h.hook)
    .join('; ');

  // Why now
  if (intelligence.whyNow) {
    properties.why_now_trigger = intelligence.whyNow.trigger;
    properties.why_now_urgency = intelligence.whyNow.urgency;
  }
}

// Enrichment metadata
properties.data_quality_score = dataQuality;
properties.last_enriched = enrichedAt;
properties.enrichment_source = 'explorium';
```

**Deduplication Strategy**:

```javascript
// For contacts: check by email
const existingContact = await hubspot.findContactByEmail(email);

if (existingContact) {
  if (updateIfExists) {
    // Update existing contact
    await hubspot.updateContact(existingContact.id, properties);
  } else {
    // Skip
    return { success: true, action: 'skipped', contactId: existingContact.id };
  }
} else {
  if (createIfNew) {
    // Create new contact
    const newContact = await hubspot.createContact(properties);
    return { success: true, action: 'created', contactId: newContact.id };
  }
}

// For companies: check by domain
const existingCompany = await hubspot.findCompanyByDomain(domain);
```

#### Outreach Worker

**File**: `mcp-server/src/workers/outreach-worker.js`

**Responsibilities**:
1. Campaign creation (multi-channel email + LinkedIn sequences)
2. Lead enrollment with personalization variables
3. LinkedIn profile enrichment (auto-discovery)
4. Reply monitoring with sentiment classification
5. Campaign performance analysis and optimization
6. Unsubscribe compliance

**Personalization Variable Generation**:

```javascript
// From enrichment intelligence
const variables = {};

// Pain point
if (intelligence.painHypotheses.length > 0) {
  const topPain = intelligence.painHypotheses[0];
  variables.pain_point = topPain.pain;
  variables.pain_reasoning = topPain.reasoning;
}

// Personalization hook
if (intelligence.personalizationHooks.length > 0) {
  const topHook = intelligence.personalizationHooks[0];
  variables.personalization_hook = topHook.hook;
  variables.hook_usage = topHook.usage;
}

// Why now
if (intelligence.whyNow) {
  variables.why_now = intelligence.whyNow.trigger;
  variables.urgency = intelligence.whyNow.urgency;
}

// Company data
if (lead.company) {
  variables.company_industry = lead.company.industry;
  variables.company_employees = lead.company.employees;
  variables.company_funding = lead.company.fundingStage;

  if (lead.company.signals.length > 0) {
    variables.recent_signal = lead.company.signals[0];
  }
}

// Usage in email template:
// "Hi {{firstName}}, I noticed {{personalization_hook}}. Given {{why_now}}, I wanted to reach out about {{pain_point}}."
```

**Reply Sentiment Classification**:

```javascript
function classifyReplySentiment(replyText) {
  const text = replyText.toLowerCase();

  // Positive indicators
  const positive = [
    'interested', 'yes', 'call', 'meeting', 'demo',
    'schedule', 'tell me more', 'sounds good', 'let\'s talk'
  ];

  // Negative indicators
  const negative = [
    'unsubscribe', 'not interested', 'no thank',
    'remove', 'stop', 'spam'
  ];

  if (positive.some(keyword => text.includes(keyword))) {
    return 'positive'; // Create sales task
  }

  if (negative.some(keyword => text.includes(keyword))) {
    return 'negative'; // Process unsubscribe
  }

  return 'neutral'; // Log but no action
}
```

**Campaign Optimization Logic**:

```javascript
async function analyzeCampaignPerformance(campaignId) {
  const stats = await lemlist.getCampaignStats(campaignId);
  const { sent, opened, clicked, replied, bounced } = stats;

  // Calculate rates
  const openRate = sent > 0 ? opened / sent : 0;
  const replyRate = sent > 0 ? replied / sent : 0;
  const bounceRate = sent > 0 ? bounced / sent : 0;

  const suggestions = [];

  // Low open rate (< 30% after 50+ sends)
  if (sent > 50 && openRate < 0.30) {
    suggestions.push({
      issue: 'Low open rate',
      current: `${(openRate * 100).toFixed(1)}%`,
      recommendation: 'Test new subject lines with more curiosity/urgency',
      priority: 'high'
    });
  }

  // Low reply rate (< 3% after 100+ sends)
  if (sent > 100 && replyRate < 0.03) {
    suggestions.push({
      issue: 'Low reply rate',
      current: `${(replyRate * 100).toFixed(1)}%`,
      recommendation: 'Review email copy and call-to-action',
      priority: 'high'
    });
  }

  // High bounce rate (> 5%)
  if (sent > 20 && bounceRate > 0.05) {
    suggestions.push({
      issue: 'High bounce rate',
      current: `${(bounceRate * 100).toFixed(1)}%`,
      recommendation: 'Improve email verification in enrichment',
      priority: 'critical'
    });
  }

  // Strong performance (> 10% reply rate)
  if (replyRate > 0.10) {
    suggestions.push({
      issue: 'Strong performance',
      current: `${(replyRate * 100).toFixed(1)}% reply rate`,
      recommendation: 'Scale up daily send volume',
      priority: 'low'
    });
  }

  return { stats, suggestions };
}
```

### 4. MCP Server Layer

#### Sales Automation MCP

**File**: `mcp-server/src/server.js`

**Purpose**: Main orchestration server that coordinates all workers.

**Tool Registration**:

```javascript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'discover_leads_by_icp',
        description: 'Discover companies matching ICP profile',
        inputSchema: {
          type: 'object',
          properties: {
            icpProfileName: { type: 'string', description: 'ICP profile name' },
            count: { type: 'number', default: 50 },
            minScore: { type: 'number', default: 0.75 },
            geography: { type: 'string' }
          },
          required: ['icpProfileName']
        }
      },
      // ... 20+ more tools
    ]
  };
});
```

**Tool Execution**:

```javascript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'discover_leads_by_icp':
      return await workers.leadDiscovery.discoverByICP(args);

    case 'enrich_contact':
      return await workers.enrichment.enrichContact(args);

    case 'sync_to_hubspot':
      return await workers.crmSync.syncContact(args);

    case 'enroll_in_campaign':
      return await workers.outreach.enrollLead(args);

    // ... handle all tools
  }
});
```

#### Lemlist MCP

**File**: `mcp-server/src/lemlist/index.js`

**Purpose**: Complete lemlist API wrapper with 50+ tools.

**Key Tool Categories**:
- Campaign management (create, update, delete, pause, resume)
- Lead management (add, update, delete, bulk operations)
- LinkedIn enrichment (auto-find profiles, search by name+company)
- Analytics (campaign stats, lead activity, unsubscribes)
- Template management (create, update email sequences)

#### HubSpot MCP

**Package**: `@shinzolabs/hubspot-mcp` (NPX-installed)

**Purpose**: Complete HubSpot CRM API with 100+ tools.

**Key Tool Categories**:
- Contacts (CRUD, search, merge, batch operations)
- Companies (CRUD, search, associations)
- Deals (CRUD, pipelines, stages)
- Engagements (notes, tasks, emails, calls, meetings)
- Properties (list, create custom fields, update definitions)
- Lists (create, add contacts, smart lists)
- Workflows (trigger, enrollment)

#### Explorium MCP

**Package**: `@explorium/mcp-server` (NPX-installed)

**Purpose**: Data enrichment and intelligence gathering.

**Key Capabilities**:
- Company enrichment (firmographics, technographics, financials, signals)
- Contact enrichment (job details, email verification, social profiles)
- Target discovery (natural language queries for finding companies)
- Growth signals (funding, hiring, expansion, product launches)
- Real-time data (live business intelligence, not stale databases)

### 5. External Service APIs

#### HubSpot CRM API v3

**Base URL**: `https://api.hubapi.com`

**Authentication**: Private App Access Token (Bearer)

**Key Endpoints**:
- `/crm/v3/objects/contacts`
- `/crm/v3/objects/companies`
- `/crm/v3/objects/deals`
- `/crm/v3/objects/notes`
- `/crm/v4/associations/{from}/{to}/batch/create`

**Rate Limits**:
- 100 requests per 10 seconds (burst)
- 150,000 requests per day
- Batch APIs: 100 objects per request

#### Lemlist API

**Base URL**: `https://api.lemlist.com/api`

**Authentication**: API Key (query parameter or header)

**Key Endpoints**:
- `/campaigns`
- `/campaigns/{id}/leads`
- `/leads/{id}/enrich`
- `/unsubscribes`

**Rate Limits**:
- Varies by plan (typically 100 req/min)
- Bulk operations: 100 leads per request

#### Explorium API

**Base URL**: `https://api.explorium.ai`

**Authentication**: API Key (header)

**Key Endpoints**:
- `/enrich/company`
- `/enrich/contact`
- `/discover/companies`
- `/discover/contacts`
- `/query` (natural language)

**Rate Limits**:
- 50 requests per minute
- Credit-based pricing (1 credit per enrichment)

---

## Data Flow

### Discovery → Enrichment → Sync → Outreach

```
1. Lead Discovery Worker
   Input: ICP profile name ("icp_rtgs_psp_treasury")
   Output: [{ domain, name, icpScore: 0.82, ... }]
   ↓

2. Lead Discovery Worker (find contacts)
   Input: Companies + target titles
   Output: [{ email, firstName, lastName, company, contactScore: 0.75 }]
   ↓

3. Enrichment Worker
   Input: Contacts
   Process:
     - Enrich company (firmographics, tech stack, signals)
     - Enrich contact (title, LinkedIn, phone)
     - Generate intelligence (pain points, hooks, why now)
     - Calculate quality score
   Output: [{ ...contact, company, intelligence, dataQuality: 0.85 }]
   ↓

4. CRM Sync Worker
   Input: Enriched contacts
   Process:
     - Check for duplicates (email/domain)
     - Map to HubSpot properties
     - Create/update contacts and companies
     - Associate contact to company
     - Log enrichment activity to timeline
   Output: [{ contactId, companyId, action: 'created' }]
   ↓

5. Outreach Worker
   Input: Enriched contacts + campaign ID
   Process:
     - Prepare personalization variables
     - Add lead to lemlist campaign
     - Enrich with LinkedIn profile (optional)
     - Start sequence
   Output: [{ leadId, campaignId, enrolled: true }]
   ↓

6. Outreach Worker (monitoring)
   Input: Active campaigns
   Process:
     - Fetch leads with replied: true
     - Classify reply sentiment
     - Route positive replies to sales
   Output: { positive: [...], negative: [...], neutral: [...] }
   ↓

7. CRM Sync Worker (follow-up)
   Input: Positive replies
   Process:
     - Create high-priority tasks in HubSpot
     - Update contact lifecycle stage
     - Log reply to timeline
   Output: [{ taskId, contactId }]
```

---

## Configuration Files

### ICP Profiles

**Location**: `.sales-automation/icp-profiles.yaml`

**Structure**:

```yaml
icp_profile_name:
  name: "Display Name"
  industry:
    - "Industry 1"
    - "Industry 2"
  employees:
    min: 100
    max: 5000
  revenue:
    min: "$10M"
    max: "$500M"
  geography:
    - "Country 1"
    - "Country 2"
  technologies:
    - "Tech 1"
    - "Tech 2"
  signals:
    - "funding"
    - "expansion"
    - "hiring"
  target_titles:
    - "Title 1"
    - "Title 2"
  departments:
    - "Department 1"
    - "Department 2"
```

### YOLO Mode Configuration

**Location**: `.sales-automation/yolo-config.yaml`

**Structure**: See [INTEGRATIONS.md](./INTEGRATIONS.md) for full schema.

### Email Templates

**Location**: `.sales-automation/templates.yaml`

**Structure**:

```yaml
template_name:
  name: "Display Name"
  pain_point: "liquidity_management"
  emails:
    - subject: "{{firstName}}, question about {{companyName}}"
      body: |
        Hi {{firstName}},

        {{personalization_hook}}

        Given {{why_now}}, I wanted to reach out about {{pain_point}}.

        [Rest of email...]

      delay: 0

    - subject: "Re: {{companyName}} liquidity"
      body: "Just following up..."
      delay: 3  # days
```

---

## Database Schema

**Location**: `mcp-server/src/utils/database.js`

**Tables**:

```sql
-- Job queue
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  parameters TEXT,
  result TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT
);

-- Enrichment cache (30-day TTL)
CREATE TABLE enrichment_cache (
  type TEXT NOT NULL,
  key TEXT NOT NULL,
  data TEXT NOT NULL,
  cached_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (type, key)
);

-- CRM sync log
CREATE TABLE crm_sync_log (
  type TEXT NOT NULL,
  identifier TEXT NOT NULL,
  hubspot_id TEXT NOT NULL,
  metadata TEXT,
  synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (type, identifier)
);

-- Discovered companies
CREATE TABLE discovered_companies (
  domain TEXT PRIMARY KEY,
  name TEXT,
  icp_score REAL,
  intent_score REAL,
  data TEXT,
  discovered_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Discovered contacts
CREATE TABLE discovered_contacts (
  email TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  company_domain TEXT,
  contact_score REAL,
  data TEXT,
  discovered_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT,
  settings TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Enrollments
CREATE TABLE enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT,
  email TEXT,
  lead_id TEXT,
  enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Unsubscribes
CREATE TABLE unsubscribes (
  email TEXT PRIMARY KEY,
  unsubscribed_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## Agent Prompts

### Sales Orchestrator

**Location**: `agents/sales-orchestrator.md`

**Role**: Coordinates all workers, makes high-level decisions.

**Key Responsibilities**:
- Workflow planning (determine sequence of operations)
- Resource allocation (batch sizes, parallel vs sequential)
- Error recovery (retry strategies, fallback plans)
- Progress reporting

### Lead Finder

**Location**: `agents/lead-finder.md`

**Role**: Discovers and scores prospects.

**Key Responsibilities**:
- ICP matching (apply scoring algorithm)
- Intent signal interpretation
- Contact discovery at target accounts
- Result ranking and filtering

### Enrichment Specialist

**Location**: `agents/enrichment-specialist.md`

**Role**: Enriches contacts and generates intelligence.

**Key Responsibilities**:
- Data enrichment orchestration
- Intelligence generation (pain points, hooks, why now)
- Quality assessment
- Cache management

### CRM Integration Agent

**Location**: `agents/crm-integration-agent.md`

**Role**: Syncs data to HubSpot.

**Key Responsibilities**:
- Deduplication
- Property mapping
- Association management
- Activity logging

### Outreach Coordinator

**Location**: `agents/outreach-coordinator.md`

**Role**: Manages campaigns and enrollment.

**Key Responsibilities**:
- Campaign creation
- Lead enrollment with personalization
- Reply monitoring
- Performance optimization

---

## Deployment Architecture

### Claude Code Plugin Mode

```
User's Development Machine
├── Claude Code IDE
│   ├── Sales Automation Plugin
│   │   └── Slash Commands UI
│   └── MCP Client
│       ├── Connect to: sales-automation MCP (node server.js)
│       ├── Connect to: lemlist MCP (node lemlist/index.js)
│       ├── Connect to: hubspot MCP (npx @shinzolabs/hubspot-mcp)
│       └── Connect to: explorium MCP (npx @explorium/mcp-server)
└── Local SQLite Database (.sales-automation/database.db)
```

### API Server Mode

```
Production Server
├── Sales Automation API Server (node api-server.js)
│   ├── Express REST API (:3000)
│   ├── WebSocket Server (:3000)
│   ├── Cron Jobs (YOLO mode)
│   └── Claude API Client (Anthropic SDK)
│       ├── Haiku 4-5 (routine tasks)
│       └── Sonnet 4-5 (content creation)
├── MCP Servers (internal communication)
│   ├── Sales Automation MCP
│   ├── Lemlist MCP
│   ├── HubSpot MCP
│   └── Explorium MCP
├── Workers (in-process)
│   ├── Lead Discovery Worker
│   ├── Enrichment Worker
│   ├── CRM Sync Worker
│   └── Outreach Worker
└── Local SQLite Database
```

---

## Performance Characteristics

### Throughput

- **Lead Discovery**: 50 companies/minute (Explorium rate limit)
- **Contact Discovery**: 100 contacts/minute
- **Enrichment**: 50 contacts/minute (Explorium rate limit)
- **CRM Sync**: 100 contacts/minute (HubSpot batch API)
- **Campaign Enrollment**: 100 leads/minute (lemlist bulk API)

### Latency

- **ICP Discovery**: 30-60 seconds (50 companies)
- **Contact Enrichment**: 5-10 seconds per contact
- **CRM Sync**: 2-5 seconds per contact
- **Campaign Enrollment**: 1-2 seconds per lead

### Daily Limits (YOLO Mode)

- **Discovery**: 50 new prospects/day (configurable)
- **Enrichment**: 50 contacts/day (respects safety limits)
- **Outreach**: 200 emails/day max (safety limit)
- **LinkedIn**: 30 connections/day (safety limit)

---

## Error Handling & Recovery

### Retry Strategy

```javascript
// Exponential backoff with max retries
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (error.message.includes('rate limit')) {
        await sleep(60000); // Wait 1 minute for rate limits
      } else {
        await sleep(1000 * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
}
```

### Error Categories

1. **Rate Limit Errors**: Wait and retry automatically
2. **Network Errors**: Retry with backoff
3. **Data Quality Errors**: Skip, log, continue (don't fail batch)
4. **Authentication Errors**: Fail fast, alert user
5. **API Deprecation**: Log warning, use fallback

---

## Security & Compliance

### API Key Management

- Environment variables only (`.env` file)
- Never log API keys
- Rotate keys quarterly

### Data Privacy

- GDPR/CCPA compliance mode (configurable)
- Unsubscribe handling (lemlist + database tracking)
- Data retention: 90 days for enrichment cache
- No PII stored beyond HubSpot sync

### Rate Limiting

- Token bucket algorithm
- Respect API provider limits
- Safety buffers (80% of stated limits)

---

## Monitoring & Observability

### Logging

```javascript
console.log('[Component] Message');     // Info
console.warn('[Component] Warning');    // Warning
console.error('[Component] Error');     // Error
```

### Metrics (TODO)

- Jobs completed/failed
- Average ICP score
- Enrichment quality distribution
- Campaign reply rates
- API quota remaining

### Alerts (TODO)

- High bounce rate (> 5%)
- Low reply rate (< 3% after 100 sends)
- API quota near exhaustion (< 10% remaining)
- Repeated job failures

---

## Agent Decision Making

### When to Use Which Worker

```
Discovery Task → Lead Discovery Worker
  - Find companies matching ICP
  - Find contacts at specific companies
  - Detect intent signals

Enrichment Task → Enrichment Worker
  - Get company/contact data
  - Generate intelligence
  - Calculate quality scores

CRM Task → CRM Sync Worker
  - Create/update contacts
  - Associate entities
  - Log activities

Outreach Task → Outreach Worker
  - Create campaigns
  - Enroll leads
  - Monitor replies
  - Optimize performance
```

### When to Use Which Model

```
Routine Tasks → Claude Haiku 4-5
  - Lead discovery (scoring, filtering)
  - Data enrichment (parsing, structuring)
  - CRM sync (deduplication, mapping)
  - Monitoring (checking status, aggregating metrics)

High-Intelligence Tasks → Claude Sonnet 4-5
  - Outreach content (email copy, subject lines)
  - Personalization (generating hooks, tailoring messages)
  - Campaign optimization (analyzing performance, making decisions)
  - Complex analysis (pattern recognition, insights)
```

### Autonomous Decision Framework (YOLO Mode)

```
Quality Gates:
  - ICP Score >= 0.75 → Proceed with enrichment
  - Data Quality >= 0.70 → Proceed with CRM sync
  - Email Verified = true → Proceed with outreach
  - Not in active sequence → OK to enroll

Safety Triggers:
  - Bounce Rate > 5% → Pause campaign
  - Reply Rate < 3% (after 100 sends) → Test new variants
  - Daily sends >= 200 → Stop new enrollments
  - LinkedIn connections >= 30 → Pause LinkedIn outreach
  - Spam complaint > 0 → Emergency stop

Optimization Rules:
  - Reply Rate > 10% → Scale up (increase daily limit)
  - Open Rate < 30% (after 50 sends) → Test new subject lines
  - Campaign sends > 100 + Reply Rate < 3% → Pause and review
```

---

## Best Practices for AI Agents

1. **Always check quality scores** before proceeding to next step
2. **Use batch operations** when processing > 10 items
3. **Respect rate limits** - use rate limiter, don't hammer APIs
4. **Cache enrichment data** - check cache before enriching
5. **Deduplicate** - always check for existing records in CRM
6. **Log activities** - create notes in HubSpot for audit trail
7. **Handle errors gracefully** - skip and log, don't fail entire batch
8. **Use appropriate model** - Haiku for routine, Sonnet for creativity
9. **Monitor performance** - track reply rates, optimize campaigns
10. **Comply with unsubscribes** - always check before enrolling

---

**Questions?** Refer to:
- [INTEGRATIONS.md](./INTEGRATIONS.md) - Integration details
- [SETUP.md](./SETUP.md) - Installation guide
- [RTGS_QUICKSTART.md](./RTGS_QUICKSTART.md) - RTGS.global workflows
