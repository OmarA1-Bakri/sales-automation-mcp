# Enterprise-Grade B-mad Integration - EXECUTION PLAN

**Date**: 2025-11-22
**Status**: READY TO EXECUTE
**Work-Critic Grade**: C+ (Prototype) → Target: A- (Production-Ready)
**Estimated Effort**: 65 hours (9 days)

---

## Executive Summary

This plan transforms the B-mad workflow engine from a working prototype into an enterprise-grade production system. The current implementation has **5 BLOCKING security/reliability issues** that prevent deployment, plus **14 TODO markers** where mock data must be replaced with real API integrations.

### Critical Path
1. **Security Fixes First** (16 hours) - Fix all 5 BLOCKING issues
2. **API Integrations** (24 hours) - Replace mock data with real APIs
3. **Infrastructure Hardening** (15 hours) - Rate limiting, validation, parallel execution
4. **Testing & Validation** (10 hours) - Comprehensive test suite

---

## Phase 1: Security & Reliability Fixes (16 hours)

### 1.1 Fix Unsafe YAML Loading (1 hour)
**BLOCKING ISSUE #1 - CRITICAL SECURITY VULNERABILITY**

**Current Code** (`WorkflowEngine.ts:25`):
```typescript
const doc: any = yaml.load(fileContents);  // UNSAFE!
```

**Fix**:
```typescript
const doc = yaml.load(fileContents, {
  schema: yaml.JSON_SCHEMA,  // Prevents code execution
  onWarning: (warning) => logger.warn('YAML Warning', warning)
}) as WorkflowDocument;
```

**Why Critical**: Allows arbitrary code execution via malicious YAML files.

**Files Modified**: `src/bmad/WorkflowEngine.ts`

**Validation**: Security scan shows no YAML injection vulnerabilities

---

### 1.2 Add Comprehensive Input Validation (4 hours)
**BLOCKING ISSUE #2 - DATA INTEGRITY**

**Implementation**:
1. Install Zod: `npm install zod`
2. Create validation schemas for all 14 actions
3. Validate inputs before execution

**Example Schema** (`src/bmad/validation-schemas.ts`):
```typescript
import { z } from 'zod';

export const CompanySearchInputSchema = z.object({
  icp_profile: z.object({
    firmographic_criteria: z.any(),
    technographic_criteria: z.array(z.any()),
    behavioral_criteria: z.any(),
    scoring_weights: z.object({
      firmographic: z.number(),
      technographic: z.number(),
      behavioral: z.number(),
      intent: z.number(),
    }),
  }),
  data_sources: z.array(z.string()),
  search_params: z.object({
    max_results: z.number().int().positive().max(10000),
    exclude_existing_customers: z.boolean(),
    exclude_active_prospects: z.boolean(),
  }),
});

export const ContactListSchema = z.array(z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  title: z.string().optional(),
  company: z.string().min(1),
}));

export const EnrichmentInputSchema = z.object({
  contact_list: ContactListSchema,
  enrichment_fields: z.array(z.string()),
});

// ... schemas for all 14 actions
```

**Updated ToolRegistry**:
```typescript
this.register('execute_company_search', async (inputs) => {
  const validated = CompanySearchInputSchema.parse(inputs);
  const explorium = new ExploriumClient(this.credentials.get('EXPLORIUM_API_KEY'));
  return await explorium.searchCompanies(validated);
});

this.register('enrich_with_explorium', async (inputs) => {
  const validated = EnrichmentInputSchema.parse(inputs);
  const explorium = new ExploriumClient(this.credentials.get('EXPLORIUM_API_KEY'));
  return await explorium.enrichContacts(validated);
});
```

**Files Created**:
- `src/bmad/validation-schemas.ts` (all 14 schemas)

**Files Modified**:
- `src/bmad/ToolRegistry.ts` (add validation to all actions)

**Validation**: All actions throw clear validation errors for invalid inputs

---

### 1.3 Implement Retry Logic & Error Recovery (6 hours)
**BLOCKING ISSUE #3 - SYSTEM STABILITY**

**Implementation**:
1. Install retry library: `npm install ts-retry-promise`
2. Add retry logic to executeStep
3. Implement state persistence for recovery

**Updated WorkflowEngine** (`src/bmad/WorkflowEngine.ts`):
```typescript
import { retry } from 'ts-retry-promise';

export class WorkflowEngine {
  private workflowId: string;
  private stateManager: WorkflowStateManager;

  async runWorkflow(workflowName: string, initialInputs: any) {
    this.workflowId = randomUUID();

    logger.info('Workflow started', {
      workflowId: this.workflowId,
      workflowName,
      inputKeys: Object.keys(initialInputs)
    });

    // Load saved state if resuming from failure
    const savedState = await this.stateManager.loadState(this.workflowId);
    if (savedState) {
      logger.info('Resuming workflow from saved state', {
        workflowId: this.workflowId,
        lastCompletedStep: savedState.lastCompletedStep
      });
      this.context = savedState.context;
    }

    // ... rest of execution
  }

  private async executeStep(step: any, previousStepId: string | null) {
    const stepStartTime = Date.now();

    logger.info('Step started', {
      workflowId: this.workflowId,
      stepId: step.id,
      agent: step.agent,
      action: step.action
    });

    const inputs = this.resolveInputs(step.inputs, previousStepId);
    const toolFn = this.registry.getTool(step.action);

    if (!toolFn) {
      logger.warn('Tool not found', { stepId: step.id, action: step.action });
      return;
    }

    try {
      // Retry with exponential backoff
      const result = await retry(
        () => toolFn(inputs),
        {
          retries: 3,
          delay: 1000,
          backoff: 'EXPONENTIAL',
          timeout: 30000,
          retryIf: (error: any) => {
            // Retry on transient errors only
            const isTransient =
              error.code === 'ECONNRESET' ||
              error.code === 'ETIMEDOUT' ||
              error.status === 429 ||  // Rate limit
              error.status === 503;     // Service unavailable

            if (isTransient) {
              logger.warn('Transient error, retrying', {
                workflowId: this.workflowId,
                stepId: step.id,
                error: error.message,
                attempt: error.attemptNumber
              });
            }

            return isTransient;
          }
        }
      );

      this.context[step.id] = result;

      // Persist state after each successful step
      await this.stateManager.saveState({
        workflowId: this.workflowId,
        workflowName: this.workflowName,
        lastCompletedStep: step.id,
        context: this.context,
        timestamp: new Date()
      });

      logger.info('Step completed', {
        workflowId: this.workflowId,
        stepId: step.id,
        duration: Date.now() - stepStartTime
      });

    } catch (error) {
      logger.error('Step failed', {
        workflowId: this.workflowId,
        stepId: step.id,
        error: error.message,
        stack: error.stack
      });

      // Save failure state
      await this.stateManager.saveFailure({
        workflowId: this.workflowId,
        failedStep: step.id,
        error: error.message,
        context: this.context
      });

      // Check if step is required
      if (step.required !== false) {
        throw error;
      } else {
        logger.warn('Non-critical step failed, continuing', {
          stepId: step.id
        });
      }
    }
  }
}
```

**New File** (`src/bmad/state-manager.ts`):
```typescript
import { Pool } from 'pg';

interface WorkflowState {
  workflowId: string;
  workflowName: string;
  lastCompletedStep: string;
  context: any;
  timestamp: Date;
}

export class WorkflowStateManager {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  async saveState(state: WorkflowState): Promise<void> {
    await this.db.query(
      `INSERT INTO workflow_states (workflow_id, workflow_name, last_completed_step, context, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (workflow_id)
       DO UPDATE SET
         last_completed_step = $3,
         context = $4,
         updated_at = $5`,
      [state.workflowId, state.workflowName, state.lastCompletedStep,
       JSON.stringify(state.context), state.timestamp]
    );
  }

  async loadState(workflowId: string): Promise<WorkflowState | null> {
    const result = await this.db.query(
      'SELECT * FROM workflow_states WHERE workflow_id = $1',
      [workflowId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      workflowId: row.workflow_id,
      workflowName: row.workflow_name,
      lastCompletedStep: row.last_completed_step,
      context: row.context,
      timestamp: row.updated_at
    };
  }

  async saveFailure(failure: any): Promise<void> {
    await this.db.query(
      `INSERT INTO workflow_failures (workflow_id, failed_step, error_message, context, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [failure.workflowId, failure.failedStep, failure.error,
       JSON.stringify(failure.context), new Date()]
    );
  }
}
```

**Database Migration**:
```sql
CREATE TABLE workflow_states (
  workflow_id UUID PRIMARY KEY,
  workflow_name VARCHAR(255) NOT NULL,
  last_completed_step VARCHAR(255) NOT NULL,
  context JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workflow_failures (
  id SERIAL PRIMARY KEY,
  workflow_id UUID NOT NULL,
  failed_step VARCHAR(255) NOT NULL,
  error_message TEXT NOT NULL,
  context JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workflow_states_id ON workflow_states(workflow_id);
CREATE INDEX idx_workflow_failures_id ON workflow_failures(workflow_id);
```

**Files Created**:
- `src/bmad/state-manager.ts`
- `migrations/XXXX-create-workflow-state-tables.sql`

**Files Modified**:
- `src/bmad/WorkflowEngine.ts`

**Validation**:
- Workflow resumes from failure point
- Retry logic tested with mocked API failures

---

### 1.4 Secure API Key Management (3 hours)
**BLOCKING ISSUE #4 - SECURITY**

**Implementation** (`src/config/api-credentials.ts`):
```typescript
import { readFileSync } from 'fs';

export class ApiCredentials {
  private static instance: ApiCredentials;
  private secrets: Map<string, string>;

  private constructor() {
    this.secrets = new Map();
    this.loadSecrets();
  }

  private loadSecrets() {
    const requiredKeys = [
      'EXPLORIUM_API_KEY',
      'LEMLIST_API_KEY',
      'HUBSPOT_API_KEY',
      'ANTHROPIC_API_KEY'
    ];

    requiredKeys.forEach(key => {
      const value = process.env[key];
      if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
      this.secrets.set(key, value);
    });

    console.log(`✅ Loaded ${this.secrets.size} API credentials`);
  }

  static getInstance(): ApiCredentials {
    if (!ApiCredentials.instance) {
      ApiCredentials.instance = new ApiCredentials();
    }
    return ApiCredentials.instance;
  }

  get(key: string): string {
    const value = this.secrets.get(key);
    if (!value) {
      throw new Error(`API credential not found: ${key}`);
    }
    return value;
  }

  async rotateKey(key: string, newValue: string): Promise<void> {
    this.secrets.set(key, newValue);
  }
}
```

**Environment Variables** (`.env.example`):
```bash
# Explorium API
EXPLORIUM_API_KEY=your_explorium_key_here

# Lemlist API
LEMLIST_API_KEY=your_lemlist_key_here

# HubSpot API
HUBSPOT_API_KEY=your_hubspot_key_here

# Claude AI API
ANTHROPIC_API_KEY=your_anthropic_key_here

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sales_automation

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

**Updated ToolRegistry**:
```typescript
import { ApiCredentials } from '../config/api-credentials';

export class ToolRegistry {
  private credentials: ApiCredentials;

  constructor() {
    this.credentials = ApiCredentials.getInstance();
    this.registerCoreTools();
  }

  private registerCoreTools() {
    this.register('execute_company_search', async (inputs) => {
      const validated = CompanySearchInputSchema.parse(inputs);
      const apiKey = this.credentials.get('EXPLORIUM_API_KEY');
      const explorium = new ExploriumClient({ apiKey });
      return await explorium.searchCompanies(validated);
    });
  }
}
```

**Files Created**:
- `src/config/api-credentials.ts`
- `.env.example`

**Files Modified**:
- `src/bmad/ToolRegistry.ts`
- `.gitignore` (add `.env`)

**Validation**: Environment variables loaded successfully, API keys never in code

---

### 1.5 Structured Logging (4 hours)
**BLOCKING ISSUE #5 - OBSERVABILITY**

**Implementation**:
```bash
npm install winston
```

**Logger Setup** (`src/utils/logger.ts`):
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bmad-workflow-engine' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}
```

**Usage in WorkflowEngine** (see section 1.3 for examples)

**Files Created**:
- `src/utils/logger.ts`

**Files Modified**:
- `src/bmad/WorkflowEngine.ts`
- `src/bmad/ToolRegistry.ts`

**Validation**: All workflow executions logged with correlation IDs

---

## Phase 2: API Integrations (24 hours)

### 2.1 Explorium API Integration (8 hours)

**Install SDK**:
```bash
npm install axios axios-retry
```

**Create Explorium Client** (`src/integrations/explorium-client.ts`):
```typescript
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { logger } from '../utils/logger';

export interface CompanySearchParams {
  icp_profile: {
    firmographic_criteria: any;
    technographic_criteria: any[];
  };
  data_sources: string[];
  search_params: {
    max_results: number;
    exclude_existing_customers: boolean;
  };
}

export interface Company {
  name: string;
  domain: string;
  industry: string;
  employee_count: number;
  revenue_estimate?: string;
  location?: string;
  tech_stack?: string[];
}

export interface Contact {
  first_name: string;
  last_name: string;
  email: string;
  title?: string;
  company: string;
  linkedin_url?: string;
  phone?: string;
}

export class ExploriumClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey;

    this.client = axios.create({
      baseURL: 'https://api.explorium.ai/v1',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Retry on network errors and rate limits
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               error.response?.status === 429 ||
               error.response?.status === 503;
      },
    });
  }

  async searchCompanies(params: CompanySearchParams): Promise<Company[]> {
    logger.info('Explorium: Searching companies', {
      maxResults: params.search_params.max_results
    });

    try {
      const response = await this.client.post('/companies/search', {
        filters: {
          industry: params.icp_profile.firmographic_criteria.industry,
          employee_count: params.icp_profile.firmographic_criteria.company_size,
          tech_stack: params.icp_profile.technographic_criteria,
        },
        limit: params.search_params.max_results,
      });

      logger.info('Explorium: Companies found', {
        count: response.data.companies.length
      });

      return response.data.companies;

    } catch (error) {
      logger.error('Explorium: Company search failed', {
        error: error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  async findContacts(companies: Company[], criteria: any): Promise<Contact[]> {
    logger.info('Explorium: Finding contacts', {
      companies: companies.length
    });

    try {
      const response = await this.client.post('/contacts/search', {
        companies: companies.map(c => c.domain),
        titles: criteria.titles,
        seniority: criteria.seniority,
        departments: criteria.departments,
        per_company_limit: criteria.per_company_limit || 3,
      });

      logger.info('Explorium: Contacts found', {
        count: response.data.contacts.length
      });

      return response.data.contacts;

    } catch (error) {
      logger.error('Explorium: Contact search failed', {
        error: error.message
      });
      throw error;
    }
  }

  async enrichContacts(contacts: Contact[]): Promise<Contact[]> {
    logger.info('Explorium: Enriching contacts', {
      count: contacts.length
    });

    try {
      const response = await this.client.post('/contacts/enrich', {
        contacts: contacts.map(c => ({ email: c.email })),
        fields: [
          'verify_email',
          'find_linkedin',
          'get_phone_number',
          'extract_bio',
        ],
      });

      logger.info('Explorium: Enrichment complete', {
        enriched: response.data.contacts.length
      });

      return response.data.contacts;

    } catch (error) {
      logger.error('Explorium: Enrichment failed', {
        error: error.message
      });
      throw error;
    }
  }
}
```

**Update ToolRegistry**:
```typescript
import { ExploriumClient } from '../integrations/explorium-client';

this.register('execute_company_search', async (inputs) => {
  const validated = CompanySearchInputSchema.parse(inputs);
  const apiKey = this.credentials.get('EXPLORIUM_API_KEY');
  const explorium = new ExploriumClient({ apiKey });
  return await explorium.searchCompanies(validated);
});

this.register('extract_contacts', async (inputs) => {
  const validated = z.object({
    company_list: z.array(z.any()),
    target_criteria: z.any(),
  }).parse(inputs);

  const apiKey = this.credentials.get('EXPLORIUM_API_KEY');
  const explorium = new ExploriumClient({ apiKey });
  return await explorium.findContacts(validated.company_list, validated.target_criteria);
});

this.register('enrich_with_explorium', async (inputs) => {
  const validated = EnrichmentInputSchema.parse(inputs);
  const apiKey = this.credentials.get('EXPLORIUM_API_KEY');
  const explorium = new ExploriumClient({ apiKey });
  return await explorium.enrichContacts(validated.contact_list);
});
```

**Files Created**:
- `src/integrations/explorium-client.ts`

**Files Modified**:
- `src/bmad/ToolRegistry.ts`

**Validation**: All 3 Explorium actions work with real API

---

### 2.2 Lemlist API Integration (6 hours)

**Create Lemlist Client** (`src/integrations/lemlist-client.ts`):
```typescript
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { logger } from '../utils/logger';

export interface Campaign {
  campaign_id: string;
  name: string;
  prospects_enrolled: number;
  campaign_start_date: string;
  estimated_completion_date: string;
}

export class LemlistClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey;

    this.client = axios.create({
      baseURL: 'https://api.lemlist.com/api',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
    });
  }

  async createCampaign(params: any): Promise<Campaign> {
    logger.info('Lemlist: Creating campaign', {
      name: params.campaign_config?.name,
      prospects: params.auto_approve_list?.length || 0
    });

    try {
      // 1. Create campaign
      const campaignResp = await this.client.post('/campaigns', {
        name: params.campaign_config.name,
        sendingSchedule: {
          type: 'daily',
          dailyLimit: params.campaign_config.daily_send_limit || 50,
        },
      });

      const campaignId = campaignResp.data._id;

      // 2. Add prospects to campaign
      if (params.auto_approve_list && params.auto_approve_list.length > 0) {
        await Promise.all(
          params.auto_approve_list.map((contact: any) =>
            this.client.post(`/campaigns/${campaignId}/leads`, {
              email: contact.email,
              firstName: contact.first_name,
              lastName: contact.last_name,
              companyName: contact.company,
              customFields: {
                title: contact.title,
                linkedin: contact.linkedin_url,
              },
            })
          )
        );
      }

      // 3. Start campaign
      await this.client.patch(`/campaigns/${campaignId}`, {
        status: 'active',
      });

      logger.info('Lemlist: Campaign created', {
        campaignId,
        prospectsEnrolled: params.auto_approve_list?.length || 0
      });

      return {
        campaign_id: campaignId,
        name: params.campaign_config.name,
        prospects_enrolled: params.auto_approve_list?.length || 0,
        campaign_start_date: new Date().toISOString(),
        estimated_completion_date: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

    } catch (error) {
      logger.error('Lemlist: Campaign creation failed', {
        error: error.message
      });
      throw error;
    }
  }

  async sendEmail(params: any): Promise<any> {
    logger.info('Lemlist: Sending email', {
      to: params.contact?.email
    });

    try {
      const response = await this.client.post('/emails/send', {
        to: params.contact.email,
        subject: params.message.subject,
        body: params.message.body,
      });

      return {
        status: 'sent',
        message_id: response.data.id,
      };

    } catch (error) {
      logger.error('Lemlist: Email send failed', {
        error: error.message
      });
      throw error;
    }
  }
}
```

**Update ToolRegistry**:
```typescript
import { LemlistClient } from '../integrations/lemlist-client';

this.register('setup_lemlist_campaign', async (inputs) => {
  const apiKey = this.credentials.get('LEMLIST_API_KEY');
  const lemlist = new LemlistClient({ apiKey });
  return await lemlist.createCampaign(inputs);
});

this.register('send_outreach_email', async (inputs) => {
  const apiKey = this.credentials.get('LEMLIST_API_KEY');
  const lemlist = new LemlistClient({ apiKey });
  return await lemlist.sendEmail(inputs);
});
```

**Files Created**:
- `src/integrations/lemlist-client.ts`

**Files Modified**:
- `src/bmad/ToolRegistry.ts`

---

### 2.3 HubSpot API Integration (6 hours)

**Install SDK**:
```bash
npm install @hubspot/api-client
```

**Create HubSpot Client** (`src/integrations/hubspot-client.ts`):
```typescript
import { Client } from '@hubspot/api-client';
import { logger } from '../utils/logger';

export class HubSpotClient {
  private client: Client;

  constructor(config: { apiKey: string }) {
    this.client = new Client({ accessToken: config.apiKey });
  }

  async syncContacts(params: any): Promise<any> {
    logger.info('HubSpot: Syncing contacts', {
      autoApprove: params.auto_approve_list?.length || 0,
      reviewQueue: params.review_queue?.length || 0
    });

    const allContacts = [
      ...(params.auto_approve_list || []),
      ...(params.review_queue || [])
    ];

    let contactsSynced = 0;
    let companiesCreated = 0;
    const syncErrors: any[] = [];

    try {
      // Batch create contacts
      for (const contact of allContacts) {
        try {
          // 1. Create/update company
          const companyResp = await this.client.crm.companies.basicApi.create({
            properties: {
              name: contact.company,
              domain: contact.domain || `${contact.company.toLowerCase().replace(/ /g, '')}.com`,
            },
          });

          companiesCreated++;

          // 2. Create/update contact
          await this.client.crm.contacts.basicApi.create({
            properties: {
              email: contact.email,
              firstname: contact.first_name,
              lastname: contact.last_name,
              jobtitle: contact.title,
              company: contact.company,
              hs_lead_status: params.auto_approve_list?.includes(contact)
                ? 'OPEN'
                : 'IN_PROGRESS',
            },
            associations: [{
              to: { id: companyResp.id },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }],
            }],
          });

          contactsSynced++;

        } catch (error) {
          syncErrors.push({
            contact: contact.email,
            error: error.message,
          });
        }
      }

      logger.info('HubSpot: Sync complete', {
        contactsSynced,
        companiesCreated,
        errors: syncErrors.length
      });

      return {
        contacts_synced: contactsSynced,
        companies_created: companiesCreated,
        tasks_created: 0,
        sync_errors: syncErrors,
      };

    } catch (error) {
      logger.error('HubSpot: Sync failed', {
        error: error.message
      });
      throw error;
    }
  }
}
```

**Update ToolRegistry**:
```typescript
import { HubSpotClient } from '../integrations/hubspot-client';

this.register('sync_contacts_to_crm', async (inputs) => {
  const apiKey = this.credentials.get('HUBSPOT_API_KEY');
  const hubspot = new HubSpotClient({ apiKey });
  return await hubspot.syncContacts(inputs);
});
```

**Files Created**:
- `src/integrations/hubspot-client.ts`

**Files Modified**:
- `src/bmad/ToolRegistry.ts`

---

### 2.4 Claude AI Integration (4 hours)

**Create Claude Client** (`src/integrations/claude-client.ts`):
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

export class ClaudeClient {
  private client: Anthropic;

  constructor(config: { apiKey: string }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async generateMessage(params: any): Promise<any> {
    logger.info('Claude: Generating personalized message', {
      contact: params.contact?.email
    });

    try {
      const prompt = `Generate a highly personalized sales outreach email for:

Contact: ${params.contact.first_name} ${params.contact.last_name}
Title: ${params.contact.title}
Company: ${params.contact.company}
Industry: ${params.contact.industry || 'Technology'}

Context:
- ICP Score: ${params.context?.icp_score || 'N/A'}
- Recent Activity: ${params.context?.recent_activity || 'None'}
- Pain Points: ${params.context?.pain_points || 'General'}

Generate:
1. A compelling subject line (5-7 words)
2. A personalized email body (100-150 words) that:
   - References their role and company
   - Addresses specific pain points
   - Provides clear value proposition
   - Includes soft call-to-action

Format as JSON:
{
  "subject": "...",
  "body": "..."
}`;

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      const messageData = JSON.parse(content.type === 'text' ? content.text : '{}');

      logger.info('Claude: Message generated', {
        subjectLength: messageData.subject?.length,
        bodyLength: messageData.body?.length
      });

      return messageData;

    } catch (error) {
      logger.error('Claude: Message generation failed', {
        error: error.message
      });
      throw error;
    }
  }
}
```

**Update ToolRegistry**:
```typescript
import { ClaudeClient } from '../integrations/claude-client';

this.register('generate_personalized_message', async (inputs) => {
  const apiKey = this.credentials.get('ANTHROPIC_API_KEY');
  const claude = new ClaudeClient({ apiKey });
  return await claude.generateMessage(inputs);
});
```

**Files Created**:
- `src/integrations/claude-client.ts`

**Files Modified**:
- `src/bmad/ToolRegistry.ts`

---

## Phase 3: Infrastructure Hardening (15 hours)

### 3.1 Rate Limiting (3 hours)

**Install Bottleneck**:
```bash
npm install bottleneck
```

**Implement in ToolRegistry**:
```typescript
import Bottleneck from 'bottleneck';

export class ToolRegistry {
  private exploriumLimiter: Bottleneck;
  private lemlistLimiter: Bottleneck;
  private hubspotLimiter: Bottleneck;
  private claudeLimiter: Bottleneck;

  constructor() {
    // Explorium: 10 req/sec, 1000/hour
    this.exploriumLimiter = new Bottleneck({
      maxConcurrent: 5,
      minTime: 100,
      reservoir: 1000,
      reservoirRefreshAmount: 1000,
      reservoirRefreshInterval: 60 * 60 * 1000,
    });

    // Lemlist: 5 req/sec
    this.lemlistLimiter = new Bottleneck({
      maxConcurrent: 3,
      minTime: 200,
    });

    // HubSpot: 10 req/sec, burst 100
    this.hubspotLimiter = new Bottleneck({
      maxConcurrent: 10,
      minTime: 100,
      reservoir: 100,
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 10 * 1000,
    });

    // Claude: 5 req/sec (conservative)
    this.claudeLimiter = new Bottleneck({
      maxConcurrent: 3,
      minTime: 200,
    });

    this.credentials = ApiCredentials.getInstance();
    this.registerCoreTools();
  }

  private registerCoreTools() {
    this.register('execute_company_search', async (inputs) => {
      return this.exploriumLimiter.schedule(async () => {
        const validated = CompanySearchInputSchema.parse(inputs);
        const apiKey = this.credentials.get('EXPLORIUM_API_KEY');
        const explorium = new ExploriumClient({ apiKey });
        return await explorium.searchCompanies(validated);
      });
    });

    // ... wrap all other API calls similarly
  }
}
```

**Validation**: No rate limit errors under load test

---

### 3.2 Type Safety (8 hours)

Create comprehensive TypeScript interfaces for all workflow components.

**New File** (`src/bmad/types.ts`):
```typescript
export interface WorkflowMetadata {
  name: string;
  title: string;
  description: string;
  version: string;
  track: string;
  phases: string[];
  module: string;
  execution_mode: 'sequential' | 'parallel';
}

export interface WorkflowStep {
  id: string;
  phase: string;
  agent: string;
  action: string;
  description: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  required?: boolean;
}

export interface WorkflowDocument {
  workflow: {
    metadata: WorkflowMetadata;
    agents: Array<{ role: string; module: string; when: string }>;
    steps: WorkflowStep[];
    guardrails?: any;
    error_handling?: any;
    success_criteria?: any;
  };
}

export interface WorkflowContext {
  [stepId: string]: unknown;
}

export type ToolFunction<TInput = unknown, TOutput = unknown> =
  (inputs: TInput) => Promise<TOutput>;
```

**Update WorkflowEngine**:
```typescript
import { WorkflowDocument, WorkflowContext, WorkflowStep } from './types';

export class WorkflowEngine {
  private context: WorkflowContext = {};

  async runWorkflow(
    workflowName: string,
    initialInputs: Record<string, unknown>
  ): Promise<WorkflowContext> {
    const doc = yaml.load(fileContents, {
      schema: yaml.JSON_SCHEMA
    }) as WorkflowDocument;

    // ... rest of implementation
  }

  private async executeStep(step: WorkflowStep, previousStepId: string | null): Promise<void> {
    // ... implementation
  }
}
```

---

### 3.3 Parallel Execution (4 hours)

**Implement Dependency Graph**:
```typescript
private buildDependencyGraph(steps: WorkflowStep[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  steps.forEach(step => {
    const dependencies = new Set<string>();
    this.findDependencies(step.inputs, dependencies);
    graph.set(step.id, dependencies);
  });

  return graph;
}

private topologicalSort(graph: Map<string, Set<string>>): string[][] {
  const levels: string[][] = [];
  const processed = new Set<string>();

  while (processed.size < graph.size) {
    const currentLevel: string[] = [];

    for (const [stepId, deps] of graph.entries()) {
      if (!processed.has(stepId)) {
        const allDepsProcessed = Array.from(deps).every(d => processed.has(d));
        if (allDepsProcessed) {
          currentLevel.push(stepId);
        }
      }
    }

    if (currentLevel.length === 0) {
      throw new Error('Circular dependency detected in workflow');
    }

    levels.push(currentLevel);
    currentLevel.forEach(id => processed.add(id));
  }

  return levels;
}

async runWorkflow(workflowName: string, initialInputs: any): Promise<WorkflowContext> {
  const doc = yaml.load(fileContents, { schema: yaml.JSON_SCHEMA }) as WorkflowDocument;

  if (doc.workflow.metadata.execution_mode === 'parallel') {
    const graph = this.buildDependencyGraph(doc.workflow.steps);
    const levels = this.topologicalSort(graph);

    for (const level of levels) {
      await Promise.all(
        level.map(stepId => {
          const step = doc.workflow.steps.find(s => s.id === stepId);
          return this.executeStep(step!, null);
        })
      );
    }
  } else {
    // Sequential execution (existing code)
  }

  return this.context;
}
```

---

## Phase 4: Testing & Validation (10 hours)

### 4.1 Unit Tests (6 hours)

**Create Test Suite** (`tests/bmad/workflow-engine.test.ts`):
```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { WorkflowEngine } from '../../src/bmad/WorkflowEngine';

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = new WorkflowEngine();
  });

  describe('Input Resolution', () => {
    it('resolves from_previous_step correctly', async () => {
      // Test implementation
    });

    it('resolves from_step_id correctly', async () => {
      // Test implementation
    });

    it('resolves dotted notation correctly', async () => {
      // Test implementation
    });
  });

  describe('Error Handling', () => {
    it('retries on transient errors', async () => {
      // Test implementation
    });

    it('saves state on failure', async () => {
      // Test implementation
    });

    it('resumes from saved state', async () => {
      // Test implementation
    });
  });

  describe('Parallel Execution', () => {
    it('detects circular dependencies', async () => {
      // Test implementation
    });

    it('executes independent steps in parallel', async () => {
      // Test implementation
    });
  });
});
```

**Create ToolRegistry Tests** (`tests/bmad/tool-registry.test.ts`):
```typescript
describe('ToolRegistry', () => {
  describe('Explorium Integration', () => {
    it('searches companies successfully', async () => {
      // Test with mocked Explorium API
    });

    it('handles rate limits correctly', async () => {
      // Test rate limiting
    });
  });

  describe('Input Validation', () => {
    it('validates company search inputs', async () => {
      // Test Zod validation
    });

    it('rejects invalid inputs', async () => {
      // Test validation errors
    });
  });
});
```

**Target**: 80% code coverage

---

### 4.2 Integration Tests (4 hours)

**Create Integration Tests** (`tests/integration/bmad-workflows.test.ts`):
```typescript
describe('prospect-discovery Workflow', () => {
  it('executes full workflow with real APIs', async () => {
    const engine = new WorkflowEngine();
    const result = await engine.runWorkflow('prospect-discovery', {
      market_segment: {
        industry: 'SaaS',
        company_size: '50-200',
      },
    });

    expect(result['segment-by-score'].auto_approve_list.length).toBeGreaterThan(0);
    expect(result['prepare-campaigns'].campaign_id).toBeDefined();
  });

  it('recovers from mid-workflow failure', async () => {
    // Simulate failure and recovery
  });
});
```

---

## Summary: Implementation Checklist

### Phase 1: Security Fixes (16 hours) ✅
- [ ] Fix unsafe YAML loading (1h)
- [ ] Add input validation with Zod (4h)
- [ ] Implement retry logic and error recovery (6h)
- [ ] Secure API key management (3h)
- [ ] Structured logging with Winston (4h)

### Phase 2: API Integrations (24 hours) ✅
- [ ] Explorium integration (8h)
  - [ ] Company search
  - [ ] Contact extraction
  - [ ] Data enrichment
- [ ] Lemlist integration (6h)
  - [ ] Campaign creation
  - [ ] Email sending
- [ ] HubSpot integration (6h)
  - [ ] CRM sync
  - [ ] Contact/company creation
- [ ] Claude AI integration (4h)
  - [ ] Message generation

### Phase 3: Infrastructure (15 hours) ✅
- [ ] Rate limiting with Bottleneck (3h)
- [ ] TypeScript type safety (8h)
- [ ] Parallel workflow execution (4h)

### Phase 4: Testing (10 hours) ✅
- [ ] Unit tests for WorkflowEngine (3h)
- [ ] Unit tests for ToolRegistry (3h)
- [ ] Integration tests (4h)

### Total: 65 hours (9 days) ✅

---

## Success Validation

**Before Deployment**:
- ✅ All 5 BLOCKING issues resolved
- ✅ Work-critic review shows Grade A- or higher
- ✅ Security scan shows zero CRITICAL vulnerabilities
- ✅ All 14 actions use real APIs (zero mock data)
- ✅ Test coverage ≥ 80%
- ✅ Load test: 1000 prospects processed without errors
- ✅ Error recovery validated
- ✅ Parallel execution 5x faster than sequential

**Documentation Required**:
- ✅ API integration guide
- ✅ Troubleshooting runbook
- ✅ Deployment checklist
- ✅ Security audit report

---

**READY TO EXECUTE - All blocking issues identified and solutions provided**
