# B-MAD Security Fixes - Quick Reference

**Date:** 2025-11-22
**Status:** URGENT - DO NOT DEPLOY WITHOUT THESE FIXES

---

## Critical Vulnerabilities Summary

| ID | Severity | Issue | Fix Time | Files |
|----|----------|-------|----------|-------|
| BMAD-001 | **CRITICAL** | YAML RCE | 30 min | WorkflowEngine.ts:25 |
| BMAD-002 | **CRITICAL** | PII Logging | 2 hours | ToolRegistry.ts (14 locations), WorkflowEngine.ts (5 locations) |
| BMAD-003 | **CRITICAL** | No Input Validation | 8 hours | ToolRegistry.ts (14 actions) |
| BMAD-004 | **CRITICAL** | Path Traversal | 1 hour | WorkflowEngine.ts:16-18 |

**Total Fix Time: ~12 hours**

---

## Fix #1: YAML RCE (CRITICAL) - 30 minutes

**File:** `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/WorkflowEngine.ts`
**Line:** 25

### Current Code (VULNERABLE)
```typescript
const doc: any = yaml.load(fileContents);
```

### Fixed Code
```typescript
const doc: any = yaml.load(fileContents, {
  schema: yaml.JSON_SCHEMA,  // Prevents arbitrary code execution
  json: true                  // Strict JSON compatibility
});
```

**Why this works:** `yaml.JSON_SCHEMA` only allows JSON-compatible types (strings, numbers, objects, arrays). It blocks `!!js/function` and other dangerous YAML tags that enable code execution.

---

## Fix #2: Path Traversal (CRITICAL) - 1 hour

**File:** `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/WorkflowEngine.ts`
**Lines:** 16-22

### Current Code (VULNERABLE)
```typescript
async runWorkflow(workflowName: string, initialInputs: any) {
  console.log(`🚀 Starting Workflow: ${workflowName}`);
  const workflowPath = path.join(this.rootPath, 'workflows', `${workflowName}.workflow.yaml`);
  // No validation - allows ../../../etc/passwd
```

### Fixed Code
```typescript
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('WorkflowEngine');

// Whitelist of allowed workflows
const ALLOWED_WORKFLOWS = [
  'prospect-discovery',
  're-engagement',
  'dynamic-outreach'
];

async runWorkflow(workflowName: string, initialInputs: any) {
  // Validate workflow name format
  const validatedName = z.string()
    .regex(/^[a-z0-9-]+$/, 'Workflow name must be alphanumeric with hyphens')
    .min(1)
    .max(100)
    .parse(workflowName);

  // Whitelist check
  if (!ALLOWED_WORKFLOWS.includes(validatedName)) {
    logger.error('Unauthorized workflow access attempt', { workflowName: validatedName });
    throw new Error(`Workflow not found: ${validatedName}`);
  }

  logger.info('Starting workflow execution', { workflowName: validatedName });

  const workflowPath = path.join(this.rootPath, 'workflows', `${validatedName}.workflow.yaml`);

  // Path traversal protection
  const resolvedPath = path.resolve(workflowPath);
  const rootDir = path.resolve(this.rootPath, 'workflows');

  if (!resolvedPath.startsWith(rootDir)) {
    logger.error('Path traversal attempt detected', {
      workflowName: validatedName,
      attemptedPath: resolvedPath
    });
    throw new Error('Invalid workflow path');
  }

  // ... rest of code
```

---

## Fix #3: PII Logging (CRITICAL) - 2 hours

**Files:**
- `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/ToolRegistry.ts` (14 locations)
- `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/WorkflowEngine.ts` (5 locations)

### Current Code (VULNERABLE)
```typescript
this.register('extract_contacts', async (inputs) => {
  console.log("👥 Extracting contacts from companies:", inputs);
  return [
    { first_name: "John", last_name: "Doe", email: "john.doe@techcorp.com" }
    // ^^^ LOGS PII: emails, names, phone numbers
  ];
});
```

### Fixed Code
```typescript
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ToolRegistry');

this.register('extract_contacts', async (inputs) => {
  logger.info('Extracting contacts', {
    companyCount: inputs.company_list?.length
    // ^^^ Log metadata only, not actual PII
  });

  const contacts = [
    { first_name: "John", last_name: "Doe", email: "john.doe@techcorp.com" }
  ];

  // Don't log the actual contact data
  return contacts;
});
```

### All Locations Requiring Fix

**ToolRegistry.ts:**
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

**WorkflowEngine.ts:**
1. Line 17: Replace `console.log` with `logger.info`
2. Line 38: Replace `console.log` with `logger.info`
3. Line 43: Replace `console.warn` with `logger.warn`
4. Line 50: Replace `console.log` with `logger.info`
5. Line 52: Replace `console.error` with `logger.error`

---

## Fix #4: Input Validation (CRITICAL) - 8 hours

**File:** `/home/omar/claude - sales_auto_skill/mcp-server/src/bmad/ToolRegistry.ts`

### Current Code (VULNERABLE)
```typescript
this.register('create_icp_profile', async (inputs) => {
  // No validation - inputs could be anything:
  // - undefined
  // - { __proto__: { isAdmin: true } }  (prototype pollution)
  // - { market_segment: "<script>alert('xss')</script>" }
  // - { market_segment: { industry: ["'; DROP TABLE contacts; --"] } }

  return {
    icp_profile: {
      firmographic_criteria: inputs.market_segment,  // UNVALIDATED
```

### Fixed Code
```typescript
import { z } from 'zod';
import { SafeStringSchema, SafeJSONBSchema } from '../validators/complete-schemas.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ToolRegistry');

// Define schemas at top of file
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
    max_results: z.number().int().min(1).max(10000).default(1000),
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

const EnrichContactsInputSchema = z.object({
  contact_list: ContactListSchema,
  enrichment_fields: z.array(z.string()).optional()
});

// In registerCoreTools():
this.register('create_icp_profile', async (inputs) => {
  const validated = ICPProfileInputSchema.parse(inputs);  // Throws ZodError on invalid input

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
    maxResults: validated.search_params?.max_results
  });

  // TODO: Implement with real API
  return [...];
});

this.register('extract_contacts', async (inputs) => {
  const validated = z.object({
    company_list: z.array(z.any()).max(1000)
  }).parse(inputs);

  logger.info('Extracting contacts', {
    companyCount: validated.company_list.length
  });

  const contacts = [...];
  return ContactListSchema.parse(contacts);  // Validate outputs too
});

this.register('enrich_with_explorium', async (inputs) => {
  const validated = EnrichContactsInputSchema.parse(inputs);

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
```

### Schemas Needed for Remaining Actions

```typescript
// Add these schemas:
const CalculateScoreInputSchema = z.object({
  enriched_contacts: ContactListSchema,
  icp_profile: z.any()
});

const SegmentProspectsInputSchema = z.object({
  scored_contacts: z.array(z.any()).max(10000)
});

const QualityCheckInputSchema = z.object({
  auto_approve_list: z.array(z.any()).max(10000),
  review_queue: z.array(z.any()).max(10000)
});

const LemlistCampaignInputSchema = z.object({
  auto_approve_list: z.array(z.any()).max(10000),
  campaign_config: z.object({
    name: SafeStringSchema.max(255),
    sequence_type: z.string(),
    daily_send_limit: z.number().int().min(1).max(1000)
  }).optional()
});

const CRMSyncInputSchema = z.object({
  auto_approve_list: z.array(z.any()).max(10000),
  review_queue: z.array(z.any()).max(10000)
});

const ReportInputSchema = z.object({
  all_workflow_data: z.any()
});

const EngagementAnalysisInputSchema = z.object({
  contact_id: z.string().uuid().optional(),
  engagement_data: z.any().optional()
});

const MessageGenerationInputSchema = z.object({
  contact: z.object({
    first_name: SafeStringSchema,
    last_name: SafeStringSchema,
    company: SafeStringSchema
  }),
  context: z.any().optional()
});

const EmailSendInputSchema = z.object({
  to: z.string().email(),
  subject: SafeStringSchema.max(255),
  body: SafeStringSchema.max(50000)
});

const FollowUpInputSchema = z.object({
  contact_id: z.string().uuid(),
  delay_hours: z.number().int().min(0).max(720)
});
```

---

## Implementation Checklist

### Phase 1: CRITICAL (Day 1)

- [ ] **Fix YAML RCE** (30 min)
  - [ ] Update WorkflowEngine.ts line 25
  - [ ] Test with malicious YAML file
  - [ ] Verify JSON_SCHEMA prevents code execution

- [ ] **Fix Path Traversal** (1 hour)
  - [ ] Add workflow name validation
  - [ ] Add ALLOWED_WORKFLOWS whitelist
  - [ ] Add path traversal protection
  - [ ] Test with ../../../etc/passwd

- [ ] **Replace console.log with logger** (2 hours)
  - [ ] Import createLogger in both files
  - [ ] Replace 14 instances in ToolRegistry.ts
  - [ ] Replace 5 instances in WorkflowEngine.ts
  - [ ] Verify no PII in logs

### Phase 2: CRITICAL (Day 2)

- [ ] **Add Input Validation** (8 hours)
  - [ ] Create all Zod schemas
  - [ ] Add validation to create_icp_profile
  - [ ] Add validation to execute_company_search
  - [ ] Add validation to extract_contacts
  - [ ] Add validation to enrich_with_explorium
  - [ ] Add validation to calculate_icp_score
  - [ ] Add validation to segment_prospects
  - [ ] Add validation to quality_assurance_check
  - [ ] Add validation to setup_lemlist_campaign
  - [ ] Add validation to sync_contacts_to_crm
  - [ ] Add validation to create_discovery_summary
  - [ ] Add validation to analyze_engagement_patterns
  - [ ] Add validation to generate_personalized_message
  - [ ] Add validation to send_outreach_email
  - [ ] Add validation to schedule_follow_up
  - [ ] Test with prototype pollution payloads
  - [ ] Test with XSS payloads
  - [ ] Test with malformed data

### Phase 3: Testing (Day 3)

- [ ] **Security Tests**
  - [ ] Test YAML RCE prevention
  - [ ] Test path traversal prevention
  - [ ] Test input validation (prototype pollution)
  - [ ] Test input validation (XSS)
  - [ ] Test PII redaction in logs
  - [ ] Test with real workflow files

- [ ] **Integration Tests**
  - [ ] Run test-bmad.ts
  - [ ] Verify workflows execute correctly
  - [ ] Check all validations pass with valid input
  - [ ] Check all validations reject invalid input

---

## Testing Commands

```bash
# Run B-MAD integration test
npm run test:bmad

# Run full test suite
npm test

# Check for console.log (should find ZERO in src/bmad/)
grep -r "console\." src/bmad/

# Verify logger usage (should find all instances)
grep -r "logger\." src/bmad/

# Test with malicious workflow (should fail safely)
echo 'workflow:
  steps:
    - id: exploit
      action: !!js/function "require(\"fs\").unlinkSync(\"/tmp/test\")"' > /tmp/malicious.yaml
tsx test-bmad.ts  # Should reject with schema error
```

---

## Verification After Fixes

Run these checks to verify security fixes:

```bash
# 1. No console.log in bmad code
grep -r "console\." src/bmad/ || echo "✅ No console.log found"

# 2. Logger is imported
grep -r "createLogger" src/bmad/ && echo "✅ Logger imported"

# 3. YAML schema is safe
grep "yaml.JSON_SCHEMA" src/bmad/WorkflowEngine.ts && echo "✅ Safe YAML loading"

# 4. Whitelist exists
grep "ALLOWED_WORKFLOWS" src/bmad/WorkflowEngine.ts && echo "✅ Whitelist implemented"

# 5. Zod validation exists
grep "\.parse(inputs)" src/bmad/ToolRegistry.ts && echo "✅ Input validation active"

# 6. Run security tests
npm test -- test-bmad-security
```

---

## Quick Start: Apply All Fixes

```bash
# 1. Backup current files
cp src/bmad/WorkflowEngine.ts src/bmad/WorkflowEngine.ts.backup
cp src/bmad/ToolRegistry.ts src/bmad/ToolRegistry.ts.backup

# 2. Apply fixes (see detailed code above)
# Edit WorkflowEngine.ts:
#   - Line 25: Add yaml.JSON_SCHEMA
#   - Lines 16-22: Add validation + whitelist
#   - Lines 17, 38, 43, 50, 52: Replace console with logger

# Edit ToolRegistry.ts:
#   - Add all Zod schemas at top
#   - Replace 14 console.log statements with logger
#   - Add validation to all 14 register() calls

# 3. Test
npm run test:bmad

# 4. Verify security
grep -r "console\." src/bmad/ | wc -l  # Should be 0
grep -r "logger\." src/bmad/ | wc -l   # Should be 19+
```

---

## Emergency Contact

If you encounter issues during implementation:

1. **Zod validation errors:** Check that schemas match workflow YAML structure
2. **Logger not found:** Verify import path `'../utils/logger.js'` (with .js extension)
3. **YAML parsing fails:** Ensure workflow YAML files are valid JSON-compatible YAML
4. **Path traversal tests fail:** Verify ALLOWED_WORKFLOWS includes all workflow names

---

**DO NOT SKIP THESE FIXES**

These are CRITICAL vulnerabilities that could lead to:
- Complete system compromise (YAML RCE)
- GDPR fines up to €20M (PII logging)
- Data corruption and injection attacks (No validation)
- Unauthorized file access (Path traversal)

**Estimated Total Time: 12 hours**
**Priority: URGENT - Block production deployment until complete**
