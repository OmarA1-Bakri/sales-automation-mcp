# Sales Automation Suite - Integration Guide

Complete guide to all integrations, MCP servers, workers, and automation workflows.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [MCP Server Configuration](#mcp-server-configuration)
3. [Worker System](#worker-system)
4. [Integration APIs](#integration-apis)
5. [Workflow Orchestration](#workflow-orchestration)
6. [Model Configuration](#model-configuration)
7. [Data Flow](#data-flow)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [Deployment Modes](#deployment-modes)

---

## Architecture Overview

The sales automation suite uses a **multi-layered architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
│  (Claude Code Plugin UI / API Server Dashboard / CLI)       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│               Orchestration Layer                            │
│  • Sales Orchestrator Agent                                  │
│  • Job Queue & Scheduler                                     │
│  • Claude API Integration (Haiku 4-5 / Sonnet 4-5)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Worker Layer                               │
│  ┌──────────────┬──────────────┬──────────────┬───────────┐ │
│  │ Lead         │ Enrichment   │ CRM Sync     │ Outreach  │ │
│  │ Discovery    │ Specialist   │ Worker       │ Worker    │ │
│  └──────────────┴──────────────┴──────────────┴───────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                 MCP Server Layer                             │
│  ┌────────────┬────────────┬────────────┬────────────────┐  │
│  │ HubSpot    │ Lemlist    │ Explorium  │ Sales          │  │
│  │ MCP        │ MCP        │ MCP        │ Automation MCP │  │
│  └────────────┴────────────┴────────────┴────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              External Service APIs                           │
│  • HubSpot CRM API    • Lemlist API    • Explorium API      │
└─────────────────────────────────────────────────────────────┘
```

---

## MCP Server Configuration

### 1. Sales Automation MCP (Main Orchestrator)

**Purpose**: Background job orchestration, worker coordination, and automation scheduling.

**Configuration** (`.claude-plugin/plugin.json`):

```json
{
  "mcpServers": {
    "sales-automation": {
      "command": "node",
      "args": ["${pluginDir}/mcp-server/src/server.js"],
      "env": {
        "NODE_ENV": "production",
        "SALES_AUTO_LOG_LEVEL": "info",
        "HUBSPOT_API_KEY": "${env:HUBSPOT_API_KEY}",
        "EXPLORIUM_API_KEY": "${env:EXPLORIUM_API_KEY}",
        "LEMLIST_API_KEY": "${env:LEMLIST_API_KEY}"
      },
      "description": "Background job orchestration for lead enrichment, CRM sync, and outreach automation"
    }
  }
}
```

**Tools Provided**:
- `discover_leads_by_icp` - Find companies matching ICP profiles
- `discover_leads_by_intent` - Find companies showing buying signals
- `discover_contacts_at_account` - Find contacts at target companies
- `enrich_contact` - Enrich contact with Explorium data
- `enrich_company` - Enrich company with firmographics
- `sync_to_hubspot` - Sync enriched data to HubSpot CRM
- `enroll_in_campaign` - Add leads to lemlist campaigns
- `check_campaign_replies` - Monitor for new replies
- `optimize_campaign` - Analyze and optimize performance

### 2. Lemlist MCP

**Purpose**: Email + LinkedIn multi-channel outreach automation.

**Configuration**:

```json
{
  "lemlist": {
    "command": "node",
    "args": ["${pluginDir}/mcp-server/src/lemlist/index.js"],
    "env": {
      "LEMLIST_API_KEY": "${env:LEMLIST_API_KEY}"
    },
    "description": "Lemlist API integration for email campaign management, lead enrichment, and LinkedIn URL discovery"
  }
}
```

**Key Tools** (50+ available):

**Campaign Management**:
- `lemlist_getCampaigns` - List all campaigns
- `lemlist_createCampaign` - Create new campaign
- `lemlist_updateCampaign` - Update campaign settings
- `lemlist_deleteCampaign` - Delete campaign
- `lemlist_pauseCampaign` - Pause campaign
- `lemlist_unpauseCampaign` - Resume campaign

**Lead Management**:
- `lemlist_addLead` - Add single lead to campaign
- `lemlist_bulkAddLeads` - Add multiple leads (batch)
- `lemlist_updateLead` - Update lead data
- `lemlist_deleteLead` - Remove lead from campaign
- `lemlist_getLeadsFromCampaign` - List campaign leads

**LinkedIn Integration**:
- `lemlist_enrichLeadWithLinkedIn` - Auto-find LinkedIn profile
- `lemlist_searchLinkedInPerson` - Search for person on LinkedIn
- `lemlist_getLinkedInProfile` - Get LinkedIn profile data

**Analytics**:
- `lemlist_getCampaignStats` - Campaign performance metrics
- `lemlist_getLeadActivity` - Lead engagement history
- `lemlist_getUnsubscribes` - List unsubscribed emails

### 3. HubSpot MCP

**Purpose**: CRM operations for contacts, companies, deals, and engagements.

**Configuration**:

```json
{
  "hubspot": {
    "command": "npx",
    "args": ["@shinzolabs/hubspot-mcp"],
    "env": {
      "HUBSPOT_ACCESS_TOKEN": "${env:HUBSPOT_API_KEY}",
      "TELEMETRY_ENABLED": "false"
    },
    "description": "HubSpot CRM API integration with 100+ tools for contacts, companies, deals, and engagements"
  }
}
```

**Key Tool Categories** (100+ tools available):

**Contacts**:
- `create_contact` - Create new contact
- `get_contact` - Retrieve contact details
- `update_contact` - Update contact properties
- `delete_contact` - Delete contact
- `search_contacts` - Advanced contact search
- `batch_create_contacts` - Bulk contact creation
- `merge_contacts` - Merge duplicate contacts

**Companies**:
- `create_company` - Create new company
- `get_company` - Retrieve company details
- `update_company` - Update company properties
- `search_companies` - Advanced company search
- `associate_company_with_contact` - Link company to contact

**Deals**:
- `create_deal` - Create new deal
- `update_deal` - Update deal stage/properties
- `get_deals` - List deals with filters
- `associate_deal_with_contact` - Link deal to contact

**Engagements**:
- `create_note` - Add note to timeline
- `create_task` - Create follow-up task
- `create_email` - Log email activity
- `create_call` - Log call activity
- `create_meeting` - Schedule meeting

**Properties**:
- `get_contact_properties` - List available properties
- `create_custom_property` - Add custom field
- `update_property` - Modify property definition

### 4. Explorium MCP

**Purpose**: Data enrichment and intelligence gathering.

**Configuration**:

```json
{
  "explorium": {
    "command": "npx",
    "args": ["-y", "@explorium/mcp-server"],
    "env": {
      "EXPLORIUM_API_KEY": "${env:EXPLORIUM_API_KEY}"
    },
    "description": "Explorium data enrichment with live company and contact intelligence for prospecting and research"
  }
}
```

**Features**:
- Company enrichment (firmographics, technographics, financials)
- Contact enrichment (job details, email verification, social profiles)
- Target discovery (find companies matching criteria)
- Natural language queries (ask questions about companies/people)
- Growth signals detection (funding, hiring, expansion)
- Real-time business intelligence

**Example Natural Language Queries**:
```
"Find payment processing companies in UK with 100-500 employees"
"Get recent funding rounds for fintech companies in APAC"
"Find companies using Stripe that recently raised Series B"
"Enrich contact john@acme.com with LinkedIn profile and job history"
```

---

## Worker System

### 1. Lead Discovery Worker

**Location**: `mcp-server/src/workers/lead-discovery-worker.js`

**Purpose**: Intelligent prospect discovery using ICP profiles, intent signals, and account-based targeting.

**Key Methods**:

```javascript
// ICP-based discovery
await leadDiscovery.discoverByICP({
  icpProfileName: 'icp_rtgs_psp_treasury',
  count: 50,
  minScore: 0.75,
  geography: 'CEMEA',
  excludeExisting: true
});

// Intent signal discovery
await leadDiscovery.discoverByIntent({
  signals: ['funding', 'expansion', 'hiring'],
  industry: 'Payment Processing',
  count: 50,
  minIntentScore: 0.7
});

// Account-based discovery
await leadDiscovery.discoverByAccount({
  companyDomain: 'acme.com',
  targetTitles: ['Head of Treasury', 'VP Finance'],
  departments: ['Finance', 'Operations'],
  count: 10
});
```

**Scoring Algorithm**:

```
ICP Score = (Fit × 0.35) + (Intent × 0.35) + (Reachability × 0.20) + (Freshness × 0.10)

Where:
  Fit = Industry match + Employee range + Revenue + Tech stack + Geography
  Intent = Presence of buying signals (funding, expansion, hiring)
  Reachability = Email verification rate + Contact availability
  Freshness = Data recency (decays over 90 days)
```

**ICP Profile Configuration** (`.sales-automation/icp-profiles.yaml`):

```yaml
icp_rtgs_psp_treasury:
  name: "PSP Treasury & Operations Leaders"
  industry:
    - "Payment Service Provider"
    - "Payment Processing"
    - "Financial Services"
  employees:
    min: 100
    max: 5000
  revenue:
    min: "$10M"
    max: "$500M"
  geography:
    - "United Kingdom"
    - "Germany"
    - "France"
    - "Netherlands"
    - "United Arab Emirates"
  technologies:
    - "Stripe"
    - "AWS"
    - "Banking APIs"
  signals:
    - "funding"
    - "expansion"
    - "hiring"
  target_titles:
    - "Head of Treasury"
    - "VP Finance"
    - "CFO"
    - "Treasury Operations Manager"
  departments:
    - "Finance"
    - "Treasury"
    - "Operations"
```

### 2. Enrichment Worker

**Location**: `mcp-server/src/workers/enrichment-worker.js`

**Purpose**: Background enrichment of contacts and companies with intelligence generation.

**Key Features**:
- Batch enrichment with configurable batch sizes
- Automatic rate limit management (50 req/min)
- Enrichment caching (30-day TTL)
- Data quality scoring (0-1 scale)
- Pain point hypothesis generation
- Personalization hook extraction

**Usage**:

```javascript
// Single contact enrichment
const result = await enrichmentWorker.enrichContact({
  email: 'john@acme.com',
  firstName: 'John',
  lastName: 'Doe',
  companyDomain: 'acme.com'
});

// Result includes:
// - Enriched contact data (title, LinkedIn, phone, location)
// - Company data (firmographics, tech stack, signals)
// - Quality score (0-1)
// - Intelligence:
//   - painHypotheses: [{ pain, confidence, reasoning }]
//   - personalizationHooks: [{ hook, strength, usage }]
//   - whyNow: { trigger, urgency, reasoning }

// Batch enrichment
const batchResult = await enrichmentWorker.batchEnrichContacts(contacts, {
  batchSize: 50,
  minQuality: 0.7,
  parallel: false
});
```

**Data Quality Scoring**:

```
Quality Score = (Contact Data × 0.40) + (Company Data × 0.40) + (Confidence × 0.20)

Contact Data (40 points):
  - Email: 10 pts
  - Email verified: 10 pts
  - Title: 5 pts
  - LinkedIn URL: 5 pts
  - Phone: 5 pts
  - Location: 5 pts

Company Data (40 points):
  - Name: 5 pts
  - Domain: 5 pts
  - Industry: 5 pts
  - Employees: 5 pts
  - Revenue: 5 pts
  - Technologies: 5 pts
  - Funding stage: 5 pts
  - Signals: 5 pts

Confidence (20 points):
  - Contact confidence score: 10 pts
  - Company confidence score: 10 pts
```

### 3. CRM Sync Worker

**Location**: `mcp-server/src/workers/crm-sync-worker.js`

**Purpose**: Synchronize enriched data to HubSpot CRM with deduplication and association.

**Key Features**:
- Automatic deduplication (email for contacts, domain for companies)
- Company-contact association
- Custom property mapping (ICP scores, pain points, signals)
- Activity timeline logging
- Batch operations with error handling

**Usage**:

```javascript
// Sync enriched contact to HubSpot
const result = await crmSyncWorker.syncContact(enrichedContact, {
  deduplicate: true,
  createIfNew: true,
  updateIfExists: true,
  associateCompany: true,
  logActivity: true
});

// Batch sync
const batchResult = await crmSyncWorker.batchSyncContacts(enrichedContacts, {
  batchSize: 100,
  continueOnError: true
});
```

**Property Mapping**:

Standard HubSpot properties:
- `email`, `firstname`, `lastname`, `jobtitle`, `phone`, `linkedin_url`
- `company`, `domain`, `industry`, `numberofemployees`, `annualrevenue`

Custom properties (for sales intelligence):
- `pain_points` - Identified pain hypotheses (semicolon-separated)
- `pain_confidence` - Max confidence score for pain points
- `personalization_hooks` - Personalization opportunities
- `why_now_trigger` - Urgency trigger (funding, expansion, etc.)
- `why_now_urgency` - Urgency level (high, medium, low)
- `data_quality_score` - Enrichment quality (0-1)
- `last_enriched` - ISO timestamp of enrichment
- `enrichment_source` - "explorium"

### 4. Outreach Worker

**Location**: `mcp-server/src/workers/outreach-worker.js`

**Purpose**: Campaign management, lead enrollment, and engagement tracking.

**Key Features**:
- Campaign creation with multi-channel sequences (Email + LinkedIn)
- Lead enrollment with personalization variables
- LinkedIn enrichment (auto-find profiles)
- Reply monitoring with sentiment classification
- Campaign optimization suggestions
- Unsubscribe compliance

**Usage**:

```javascript
// Create campaign
const campaign = await outreachWorker.createCampaign({
  name: 'RTGS Treasury - Q1 2025',
  emails: [
    {
      subject: '{{firstName}}, question about {{companyName}} liquidity',
      body: 'Hi {{firstName}},\n\n{{personalization_hook}}\n\nI noticed {{why_now}}...',
      delay: 0
    },
    {
      subject: 'Re: Liquidity management',
      body: 'Just following up...',
      delay: 3 // 3 days after first email
    }
  ],
  linkedinEnabled: true,
  settings: {
    dailyLimit: 50,
    sendingWindow: { start: '09:00', end: '17:00' }
  }
});

// Enroll lead with intelligence
const enrollment = await outreachWorker.enrollLead(lead, campaignId, {
  enrichLinkedIn: true,
  startImmediately: true,
  customVariables: {} // Auto-generated from intelligence
});

// Check for replies
const replies = await outreachWorker.checkForReplies();
// Returns: { positive: [...], negative: [...], neutral: [...], total: N }

// Analyze performance
const analysis = await outreachWorker.analyzeCampaignPerformance(campaignId);
// Returns optimization suggestions based on open/reply/bounce rates
```

**Personalization Variables** (auto-generated from enrichment):

- `{{pain_point}}` - Top identified pain point
- `{{pain_reasoning}}` - Why we think they have this pain
- `{{personalization_hook}}` - Recent signal or event to reference
- `{{hook_usage}}` - Suggested way to use the hook in copy
- `{{why_now}}` - Urgency trigger
- `{{urgency}}` - Urgency level
- `{{company_industry}}` - Company's industry
- `{{company_employees}}` - Employee count
- `{{company_funding}}` - Funding stage
- `{{recent_signal}}` - Most recent growth signal

---

## Model Configuration

The system uses **two Claude models** for optimal cost and performance:

### Claude Haiku 4-5 (Routine Tasks)

**Model**: `claude-haiku-4-5-20250617`

**Used For**:
- Lead discovery (ICP matching, intent scoring)
- Data enrichment (parsing and structuring data)
- CRM synchronization (deduplication, property mapping)
- Monitoring and health checks
- Job queue processing

**Characteristics**:
- Fast execution (< 1 second per task)
- Low cost ($0.25/1M input tokens, $1.25/1M output tokens)
- Efficient for structured, rule-based tasks

### Claude Sonnet 4-5 (High-Intelligence Tasks)

**Model**: `claude-sonnet-4-5-20250929`

**Used For**:
- Outreach content creation (email copy, subject lines)
- Personalization (generating hooks and messaging)
- Campaign optimization (analyzing performance, A/B test decisions)
- Complex data analysis (pattern recognition, insights)

**Characteristics**:
- Superior reasoning and creativity
- Natural language generation
- Context-aware decision making
- Higher cost, used selectively for value-add tasks

**Configuration** (`mcp-server/src/api-server.js`):

```javascript
selectModel(type) {
  const sonnetTasks = [
    'outreach',      // Email/message content creation
    'personalize',   // Personalization and copywriting
    'optimize',      // Campaign optimization decisions
    'analyze',       // Complex data analysis
  ];

  return sonnetTasks.includes(type)
    ? 'claude-sonnet-4-5-20250929'   // High intelligence
    : 'claude-haiku-4-5-20250617';    // Fast & efficient
}
```

---

## Workflow Orchestration

### Standard Workflow: Discovery → Enrichment → Sync → Outreach

```javascript
// 1. Discover leads matching ICP
const discovery = await leadDiscovery.discoverByICP({
  icpProfileName: 'icp_rtgs_psp_treasury',
  count: 50,
  minScore: 0.75
});

// 2. Enrich discovered companies + find contacts
const contacts = await leadDiscovery.discoverContactsAtCompanies({
  companies: discovery.companies,
  titles: ['Head of Treasury', 'VP Finance'],
  departments: ['Finance', 'Operations']
});

// 3. Enrich contacts with intelligence
const enriched = await enrichmentWorker.batchEnrichContacts(contacts.contacts, {
  minQuality: 0.7
});

// 4. Sync to HubSpot
const synced = await crmSyncWorker.batchSyncContacts(enriched.enriched, {
  deduplicate: true,
  associateCompany: true,
  logActivity: true
});

// 5. Enroll in outreach campaign
const enrolled = await outreachWorker.batchEnrollLeads(
  enriched.enriched,
  campaignId,
  {
    enrichLinkedIn: true,
    startImmediately: false // Review before sending
  }
);

// 6. Monitor replies (run every 2 hours)
const replies = await outreachWorker.checkForReplies();

// 7. Create tasks in HubSpot for positive replies
for (const reply of replies.positive) {
  await hubspot.createTask({
    subject: `Follow up with ${reply.firstName} ${reply.lastName}`,
    body: `Positive reply received: "${reply.reply}"`,
    status: 'NOT_STARTED',
    priority: 'HIGH',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
}
```

### YOLO Mode (Fully Autonomous)

**Configuration** (`.sales-automation/yolo-config.yaml`):

```yaml
yolo_mode:
  enabled: true

  discovery:
    schedule: "0 8 * * *"  # Daily at 8am
    leads_per_day: 50
    icp_profiles: ["icp_rtgs_psp_treasury"]
    min_icp_score: 0.75

  enrichment:
    auto_enrich: true
    min_data_quality: 0.70

  crm_sync:
    auto_create_contacts: true
    auto_deduplicate: true

  outreach:
    auto_enroll: true
    require_approval: false  # Full autonomy
    daily_enrollment_limit: 50

  monitoring:
    check_interval_hours: 2
    auto_route_replies: true
    auto_create_tasks: true

  safety:
    max_daily_sends: 200
    max_linkedin_connections: 30
    pause_on_bounce_rate: 0.05
```

**Daily Autonomous Cycle**:

```
08:00 - Discover 50 prospects matching ICP (avg score: 0.82)
08:30 - Enrich prospects (min quality: 0.70)
09:30 - Sync to HubSpot (deduplicate + associate)
10:00 - Enroll in campaigns (auto-select template by pain point)
12:00 - Check for replies → Route positive replies to sales
14:00 - Check for replies
16:00 - Check for replies → Optimize underperforming campaigns
```

---

## Rate Limiting

### Explorium API

- **Limit**: 50 requests/minute
- **Strategy**: Token bucket with automatic backoff
- **Implementation**: `mcp-server/src/utils/rate-limiter.js`

```javascript
const rateLimiter = new RateLimiter({
  maxRequests: 50,
  timeWindowMs: 60000
});

await rateLimiter.acquire(); // Waits if limit exceeded
```

### Lemlist API

- **Limit**: Varies by plan (typically 100 req/min)
- **Strategy**: Batch operations with delays
- **Batch Sizes**: 100 leads per bulk operation

### HubSpot API

- **Limit**: 100 requests/10 seconds (burst), 150,000/day
- **Strategy**: Batch APIs for bulk operations
- **Monitoring**: Track remaining quota via headers

---

## Deployment Modes

### 1. Claude Code Plugin Mode

**Usage**: Interactive plugin within Claude Code IDE

**Start**:
```bash
# Plugin auto-starts when Claude Code opens project
# MCP servers launch automatically
```

**Slash Commands**:
- `/sales-discover` - Find new leads
- `/sales-enrich` - Enrich contacts
- `/sales-outreach` - Launch campaigns
- `/sales-monitor` - Check performance
- `/sales-yolo enable` - Enable autonomous mode

### 2. API Server Mode

**Usage**: Standalone headless server with REST API + WebSocket

**Start**:
```bash
# Standard mode
npm run api-server

# YOLO mode (autonomous)
npm run api-server:yolo

# Custom port
npm run api-server -- --port 3000
```

**API Endpoints**:

```bash
# Workflows
POST /api/discover       # Start lead discovery
POST /api/enrich         # Start enrichment
POST /api/outreach       # Launch campaign
GET  /api/monitor        # Get stats

# YOLO Mode
POST /api/yolo/enable    # Enable autonomous mode
POST /api/yolo/disable   # Disable autonomous mode
GET  /api/yolo/status    # Get YOLO status

# Jobs
GET  /api/jobs/:jobId    # Get job status
GET  /api/jobs           # List all jobs

# Dashboard
GET  /dashboard          # Web dashboard
```

**WebSocket** (Real-time updates):
```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  // event.type: 'job.started', 'job.completed', 'job.failed'
  // event.jobId, event.result
});
```

---

## Error Handling

### Retry Strategy

```javascript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

### Error Categories

1. **Rate Limit Errors**: Automatic backoff and retry
2. **Network Errors**: Retry with exponential backoff
3. **Data Quality Errors**: Skip and log, continue with batch
4. **API Authentication Errors**: Fail fast, alert user

### Logging

```javascript
console.log('[Discovery] Finding leads...');    // Info
console.warn('[Enrichment] Low quality...');    // Warning
console.error('[CRM Sync] Failed...');          // Error
```

---

## Next Steps

1. **Setup**: Follow [SETUP.md](./SETUP.md) for installation
2. **Architecture**: Read [CLAUDE.md](./CLAUDE.md) for technical details
3. **Quickstart**: See [RTGS_QUICKSTART.md](./RTGS_QUICKSTART.md) for RTGS.global-specific workflows
4. **Commands**: Explore `/sales-*` slash commands in Claude Code

---

**Need Help?**
- Check logs in `.sales-automation/logs/`
- Run `/sales-diagnose` to check system health
- Review [Troubleshooting](#) section in SETUP.md
