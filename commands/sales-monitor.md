---
name: sales-monitor
description: Monitor background jobs, campaign performance, and system health
model: sonnet
---

# Sales Automation Monitoring Command

Track the status of background jobs, monitor campaign performance, review system health, and access daily/weekly reports.

## What would you like to monitor?

1. **Job Status** - Check progress of enrichment, discovery, or sync jobs
2. **Campaign Performance** - View outreach metrics and engagement
3. **System Health** - Monitor API quotas, deliverability, data quality
4. **Daily Digest** - Summary of today's automation activity
5. **Weekly Report** - Performance trends and insights

---

## Usage Examples

### Example 1: Check Job Status
```
User: /sales-monitor enrich_job_abc123
Assistant:
Enrichment Job: enrich_job_abc123
Status: Processing
Progress: 67% (134/200 complete)
ETA: 12 minutes

Successfully Enriched: 126
Failed: 8 (invalid emails)
Current: Processing acme.com batch
```

### Example 2: Campaign Performance
```
User: Show me campaign stats
Assistant: [Shows performance dashboard with metrics]
```

### Example 3: System Health Check
```
User: /sales-monitor system
Assistant: [Shows API quotas, deliverability health, error rates]
```

---

## Job Monitoring

### Check Specific Job

Provide the job ID to see detailed status:

```
Job ID: enrich_job_abc123
Type: Batch Enrichment
Status: Processing
Created: 2024-11-06 10:30:00
Started: 2024-11-06 10:31:15
Progress: 67% (134/200)
ETA: 12 minutes

Results:
  ✓ Successfully Enriched: 126
  ⚠ Partial Data: 8
  ✗ Failed: 8
  ⏳ Pending: 66

Failed Items:
  - invalid@example.com (invalid email format)
  - bounce@test.com (domain does not exist)
  [6 more...]

Current Batch: Processing 10 contacts from acme.com

Actions:
  - View successful results
  - Download failure report
  - Retry failed items
  - Cancel remaining
```

### List All Jobs

```
Recent Jobs (Last 7 days):

Active Jobs (3):
  1. enrich_job_abc123 (Processing, 67% complete)
  2. discover_job_def456 (Queued, waiting for rate limit)
  3. sync_job_ghi789 (Processing, 80% complete)

Completed Jobs (12):
  ✓ enrich_job_xyz001 (200/200 contacts, 32 minutes)
  ✓ outreach_job_xyz002 (94 enrolled, 5 minutes)
  ✓ discover_job_xyz003 (127 leads found, 18 minutes)
  [9 more...]

Failed Jobs (1):
  ✗ sync_job_xyz004 (HubSpot API error, retry available)
```

---

## Campaign Performance Dashboard

### Overall Metrics

```
===========================================
Sales Automation Performance - Last 30 Days
===========================================

Lead Generation:
  Leads Discovered: 342
  ICP Match Rate: 81% (Core: 62%, Adjacent: 19%)
  Avg Fit Score: 0.74

Enrichment:
  Contacts Enriched: 287
  Companies Enriched: 94
  Data Completeness: 76% → 91% (+15%)
  Avg Confidence: 0.89

CRM Sync:
  HubSpot Contacts Created: 218
  HubSpot Contacts Updated: 69
  Companies Created: 94
  Deals Created: 12

Outreach:
  Campaigns Active: 3
  Contacts Enrolled: 247
  Emails Sent: 876
  Open Rate: 41% (baseline: 38%) +3% ⬆
  Click Rate: 6.8%
  Reply Rate: 8.2% (baseline: 6.0%) +2.2% ⬆
  Positive Replies: 22
  Meetings Booked: 11
  Unsubscribes: 7 (0.8%)

Pipeline Impact:
  SQL Created: 22
  Opportunities: 12
  Pipeline Value: $340K
  Avg Deal Size: $28K
```

### Campaign Breakdown

```
Campaign: Fintech VP Finance - Snowflake Users
Status: Active | Started: Oct 15, 2024

Volume:
  Enrolled: 94
  Active: 67
  Completed: 27

Engagement (Last 30 days):
  Sent: 247 emails
  Open Rate: 42.3% ⬆ +4.3% vs baseline
  Click Rate: 7.5%
  Reply Rate: 9.1% ⬆ +3.1% vs baseline

Conversions:
  Positive Replies: 14 (5.8%)
  Meetings Booked: 8 (3.3%)
  Opportunities: 3
  Pipeline: $95K

Top Performers:
  Subject Line: "{{firstName}}, quick question..." (12% reply)
  Hook Type: Funding (15% reply rate)
  Persona: VP Finance 200-500 emp (11% reply)
  Send Time: Tuesday 9-10 AM

Recommendations:
  ✓ Strong performance - scale to lookalike audience
  ✓ Funding hook outperforming - prioritize funded companies
  ⚠ LinkedIn touch has low completion rate - review task description
```

---

## System Health

### API Quotas & Rate Limits

```
API Health Check - Nov 6, 2024 14:30

HubSpot API:
  Status: ✓ Healthy
  Daily Quota: 847 / 10,000 (8.5% used)
  Rate Limit: 95 / 100 requests per 10s
  Last Error: None
  Uptime: 100%

Explorium API:
  Status: ✓ Healthy
  Monthly Credits: 2,847 / 5,000 (57% used)
  Rate Limit: Within limits
  Avg Response Time: 1.8s
  Last Error: None

Apollo API:
  Status: ⚠ Warning
  Monthly Credits: 4,832 / 5,000 (97% used)
  Rate Limit: 47 / 50 requests per minute
  Last Error: None
  Warning: Approaching monthly limit

lemlist API:
  Status: ✓ Healthy
  Daily Send Quota: 487 / 500 (97% used)
  Active Campaigns: 3
  Warm-up Mode: Enabled (Day 18)
  Deliverability: Excellent (bounce <2%)

LinkedIn:
  Status: ⚠ Manual Tasks Only
  Connection Requests: 15 pending
  Weekly Limit: 45 / 100 used
  Note: Using task-based approach for compliance
```

### Deliverability Health

```
Email Deliverability - Last 7 Days

Sender Reputation: ✓ Excellent
  Domain: sales.yourcompany.com
  IP Reputation: 98/100
  SPF: ✓ Pass
  DKIM: ✓ Pass
  DMARC: ✓ Pass

Sending Metrics:
  Sent: 487 emails
  Delivered: 479 (98.4%) ✓ Excellent
  Bounced: 8 (1.6%) ✓ Healthy
    - Hard Bounces: 4
    - Soft Bounces: 4
  Spam Complaints: 0 (0.0%) ✓ Excellent

Engagement:
  Opens: 203 (42.4%)
  Clicks: 37 (7.7%)
  Unsubscribes: 3 (0.6%) ✓ Normal

Recommendations:
  ✓ Deliverability is excellent
  ✓ Continue current sending patterns
  ✓ Ready to increase volume gradually
```

### Data Quality Metrics

```
Data Quality Report

Enrichment Quality:
  Avg Completeness: 91% ✓ Excellent
  Avg Confidence: 0.89 ✓ High
  Email Verification Rate: 87%
  Data Freshness: 94% <30 days

Common Issues:
  - Missing phone numbers: 32% of contacts
  - LinkedIn profile not found: 8%
  - Company tech stack incomplete: 15%

HubSpot Data Health:
  Duplicate Contacts: 3 (reviewed & merged)
  Missing Lifecycle Stage: 0
  Missing Owner: 12 (auto-assigned to round-robin)
  Data Quality Score: A- (92/100)
```

---

## Daily Digest

Automatically generated each morning:

```
===========================================
Sales Automation Daily Report - Nov 6, 2024
===========================================

Yesterday's Activity:

Lead Generation:
  New Leads Discovered: 23
  ICP Match Rate: 87% (20 Core, 3 Adjacent)
  Avg Fit Score: 0.79

Enrichment:
  Contacts Enriched: 28
  Companies Enriched: 12
  Avg Quality Score: A (93/100)

CRM Updates:
  HubSpot Contacts Created: 18
  HubSpot Contacts Updated: 10
  Companies Created: 12
  Timeline Events: 45

Outreach:
  Emails Sent: 67
  Opens: 28 (42%)
  Replies: 6 (9%)
    - Positive: 4
    - Neutral: 1
    - Negative: 1
  Meetings Booked: 2

Top Wins:
  🎉 2 discovery meetings scheduled
  📈 Reply rate 3% above baseline
  ✅ Zero deliverability issues

Action Items:
  [ ] Review 4 positive replies
  [ ] Follow up on 2 booked meetings
  [ ] Address 1 negative reply (mark unqualified)

Alerts:
  ⚠ Apollo API approaching monthly limit (97%)
  ℹ️ 15 LinkedIn connection tasks pending
```

---

## Weekly Learning Report

Generated every Monday for RevOps:

```
===========================================
Sales Automation Weekly Insights
Week of Nov 4-10, 2024
===========================================

Performance Summary:
  Leads Discovered: 127 (+15% vs prev week)
  Enrichment Jobs: 8 (287 contacts)
  Outreach Contacts: 94 enrolled
  Meetings Booked: 11 (+37% vs prev week)
  Pipeline Created: $340K

ICP Optimization Insights:

1. Funding Signal = Strong Predictor
   - Contacts with funding signal: 18% reply rate
   - Contacts without: 6% reply rate
   - Recommendation: Prioritize companies with funding <90 days

2. Company Size Sweet Spot
   - 200-500 employees: 11% reply rate
   - 500-1000 employees: 7% reply rate
   - <200 employees: 4% reply rate
   - Recommendation: Focus on 200-500 range

3. Tech Stack Indicator
   - Companies using Snowflake: 13% reply rate
   - Companies without: 5% reply rate
   - Recommendation: Add Snowflake as required technographic

Messaging Insights:

1. Subject Line Performance
   - Winner: "{{firstName}}, quick question about {{company}}'s {{painPoint}}"
     (12% reply rate, +6% vs avg)
   - Runner-up: "{{company}}'s {{fundingSeries}} → scaling challenges?"
     (10% reply rate, +4% vs avg)

2. Hook Performance Ranking
   1. Funding hook: 15% reply rate
   2. Hiring hook: 9% reply rate
   3. Tech adoption: 8% reply rate
   4. Generic: 4% reply rate

3. Sequence Optimization
   - Email #1 → LinkedIn → Email #2 path: 14% conversion
   - Email #1 → Email #2 → Email #3 path: 6% conversion
   - Recommendation: Prioritize LinkedIn touch for opened emails

Data Quality Insights:
  - Explorium confidence avg: 0.91 (excellent)
  - Apollo match rate: 89%
  - Email verification pass: 87%
  - Recommendation: Continue current data source mix

Next Week Goals:
  [ ] Scale winning campaign by 50% (140 contacts)
  [ ] Test new subject line variants
  [ ] Implement LinkedIn-first sequence for high-intent leads
  [ ] Update ICP to prioritize funded + Snowflake companies
```

---

## Custom Reports

### Generate Custom Report

```
User: Show me performance by persona
Assistant: [Breaks down metrics by VP Finance, CFO, Controller, etc.]

User: Compare fintech vs SaaS performance
Assistant: [Industry comparison analysis]

User: Show conversion funnel
Assistant: [Lead → Enrich → CRM → Outreach → Reply → Meeting → Opp]
```

---

## Alerts & Notifications

I'll automatically alert you when:

- ✅ High-value lead discovered (score >0.85)
- ✅ Positive reply received
- ✅ Meeting booked
- ⚠️ API quota approaching limit (>90%)
- ⚠️ Deliverability issue detected (bounce rate >5%)
- ⚠️ Job failed after retries
- 🔔 Daily digest ready
- 🔔 Weekly report ready

Configure alert preferences in `.sales-automation/config.yaml`

---

Ready to monitor? Choose:
- Specific job ID to check
- "campaigns" for outreach performance
- "system" for health check
- "daily" for today's digest
- "weekly" for insights report
