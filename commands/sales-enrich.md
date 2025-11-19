---
name: sales-enrich
description: Enrich contacts and companies with multi-source intelligence and actionable insights
model: sonnet
---

# Sales Contact Enrichment Command

Enrich contacts with comprehensive firmographic, technographic, and behavioral data from Explorium, Apollo, LinkedIn, and other sources. Generate actionable sales intelligence including pain hypotheses, personalization hooks, and "why now" triggers.

## What would you like to enrich?

Please specify:

1. **Single Contact** - Email, LinkedIn URL, or name + company
2. **Multiple Contacts** - CSV file or list of emails
3. **Company** - Domain name for firmographic/technographic enrichment
4. **HubSpot Records** - Enrich existing incomplete CRM records

---

## Usage Examples

### Example 1: Single Contact Enrichment
```
User: Enrich ava@acme.com
Assistant: I'll enrich this contact using Explorium, Apollo, and LinkedIn.
[Shows comprehensive profile with intelligence]
```

### Example 2: Batch Enrichment
```
User: Enrich this list of 200 contacts (uploads CSV)
Assistant: I'll submit a batch enrichment job. This will take ~30 minutes.
Job ID: enrich_job_abc123
Check status: /sales-monitor enrich_job_abc123
```

### Example 3: Company Deep Dive
```
User: Enrich Acme Inc (acme.com) and find their finance team
Assistant: I'll enrich the company and discover key decision-makers.
[Shows company profile + org chart with contacts]
```

---

## Enrichment Process

### Step 1: Identity Resolution (30 seconds)
- Normalize input data
- Search across data sources
- Resolve to canonical person/company
- Detect potential duplicates

### Step 2: Multi-Source Data Collection (2 minutes)

**Contact Enrichment:**
- **Explorium**: Firmographic context, technographics
- **Apollo**: Verified email, phone, title, seniority
- **LinkedIn**: Experience, education, skills, recent activity
- **Email Verification**: SMTP validation, catch-all detection

**Company Enrichment:**
- **Explorium**: Employee count, revenue, tech stack, buying signals
- **Crunchbase**: Funding rounds, investors, total raised
- **Clearbit**: Logo, description, social profiles
- **BuiltWith**: Website technologies

### Step 3: Signal Detection (30 seconds)
Identify recent triggers:
- Funding events (last 90 days)
- Active hiring in relevant departments
- Technology adoption
- News mentions, awards, product launches
- Leadership changes

### Step 4: Intelligence Generation (30 seconds)

**Pain Hypothesis** - Inferred challenges based on:
- Role and seniority
- Company stage and growth
- Tech stack gaps
- Industry benchmarks

**Personalization Hooks** - Specific talking points:
- Funding congratulations
- Hiring growth observations
- Technology adoption mentions
- Recent LinkedIn activity
- Shared background/education

**Why Now** - Urgency triggers:
- Fresh funding to invest
- Rapid team growth
- Recent tech investments
- Seasonal/cyclical factors

**Objection Preemption** - Anticipated concerns:
- Implementation time
- Integration requirements
- Pricing/ROI

### Step 5: Quality Scoring
- Completeness: 0-100%
- Confidence: 0-100%
- Freshness: Days since update
- Overall Quality Score

---

## Enrichment Output

### Contact Profile
```yaml
Contact:
  Name: Ava Ng
  Title: VP Finance
  Email: ava@acme.com (verified ✓)
  Phone: +1-415-555-0123
  LinkedIn: linkedin.com/in/ava-ng
  Location: San Francisco, CA

  Experience:
    - VP Finance @ Acme Inc (2022-present)
    - Director FP&A @ Previous Corp (2019-2022)

  Education:
    - MBA, Finance - Stanford (2019)
    - BS, Economics - UC Berkeley (2015)

Company:
  Name: Acme Inc
  Domain: acme.com
  Size: 450 employees (200-500 range)
  Industry: Fintech
  Revenue: $50M-$100M (est)

  Tech Stack:
    - Snowflake (Data Warehouse)
    - Stripe (Payments)
    - AWS (Cloud)
    - dbt (Data Transformation)

  Funding:
    Stage: Series B
    Total Raised: $45M
    Last Round: $25M (Oct 2024)
    Investors: Sequoia, a16z

Signals:
  - Raised $25M Series B (22 days ago) [High Value]
  - Hiring 3 finance roles [Medium Value]
  - Adopted Snowflake (45 days ago) [High Value]

Intelligence:
  Pain Hypothesis:
    1. "Scaling financial operations without headcount" (85% confidence)
    2. "Manual month-end close process" (75% confidence)

  Personalization Hooks:
    1. "Congrats on the recent $25M Series B!" (Strength: 0.9)
    2. "Noticed you're hiring 3 finance roles" (Strength: 0.7)
    3. "Saw you adopted Snowflake recently" (Strength: 0.8)

  Why Now: "Fresh funding to invest in infrastructure" (Urgency: High)

  Buyer Intent Score: 0.72 / 1.0

Quality:
  Completeness: 92%
  Confidence: 94%
  Freshness: Fresh (today)
  Overall: A+ (Excellent)
```

---

## What's Next?

After enrichment, you can:

1. **Review Intelligence** - Validate pain hypotheses and hooks
2. **Sync to HubSpot** - Create/update CRM record with enriched data
3. **Launch Outreach** - Enroll in personalized lemlist sequence
4. **Queue for Manual Review** - Flag for SDR to personalize further
5. **Export Data** - Download enriched profile

---

## Batch Enrichment

For large lists (50+ contacts):

1. I'll submit a **background job**
2. Processing time: ~1-2 minutes per contact
3. You'll get a **job ID** to track progress
4. Check status: `/sales-monitor <job_id>`
5. Results saved to database
6. Notification when complete

**Example:**
```
Batch Job Submitted: enrich_job_abc123
Total Contacts: 200
Estimated Time: 30-45 minutes
Progress: 0% (0/200 complete)

Check status: /sales-monitor enrich_job_abc123
```

---

## Configuration

Customize enrichment settings in `.sales-automation/config.yaml`:

```yaml
enrichment:
  # Data sources (priority order)
  sources:
    - explorium
    - apollo
    - linkedin
    - clearbit

  # Email verification
  verify_emails: true
  skip_role_emails: true  # Skip info@, sales@, etc.

  # Intelligence generation
  generate_pain_hypothesis: true
  generate_hooks: true
  generate_why_now: true

  # Quality thresholds
  min_confidence: 0.70
  min_completeness: 0.60
```

---

Ready to enrich? Please provide:
- Contact email(s) or LinkedIn URL(s)
- Company domain (if known)
- Any specific data fields you need
