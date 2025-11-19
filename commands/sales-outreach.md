---
name: sales-outreach
description: Launch personalized multi-channel outreach campaigns with lemlist
model: sonnet
---

# Sales Outreach Campaign Command

Launch personalized, adaptive email sequences through lemlist with multi-channel touches (email, LinkedIn, phone). Automatically personalizes messaging using enrichment intelligence and adjusts cadence based on engagement signals.

## What would you like to do?

1. **Launch New Campaign** - Enroll enriched leads in outreach sequence
2. **Monitor Campaign** - Check performance metrics and engagement
3. **Manage Sequences** - Pause, resume, or modify active campaigns
4. **Review Replies** - Classify and route responses

---

## Usage Examples

### Example 1: Launch Outreach for Single Contact
```
User: Enroll ava@acme.com in the fintech VP Finance campaign
Assistant: I'll enroll Ava in the "Fintech VP Finance - Snowflake Users" sequence.
[Shows personalized email preview]
Send now? (yes/no/edit)
```

### Example 2: Bulk Campaign Launch
```
User: Launch outreach for all contacts in my discovery results (94 leads)
Assistant: I'll enroll 94 contacts in persona-matched campaigns.
Segmenting by:
  - ICP tier (Core vs Adjacent)
  - Persona (VP Finance, CFO, Controller)
  - Intent level (High, Medium, Low)

Preview sequences for each segment? (yes/no)
```

### Example 3: Campaign Performance Check
```
User: How is the fintech campaign performing?
Assistant: Fintech VP Finance Campaign (Last 30 days):
  - Sent: 247 emails
  - Open Rate: 42% (vs 38% baseline) ✓
  - Reply Rate: 9% (vs 6% baseline) ✓✓
  - Meetings Booked: 8
  - Top Performing Subject: "{{firstName}}, quick question about {{company}}'s growth"
```

---

## Outreach Workflow

### Step 1: Pre-Flight Validation (30 seconds)
Before enrolling any contact:

✓ **Email Verification**
- Valid format
- SMTP deliverable
- Not catch-all
- Not on DNC list

✓ **Compliance Check**
- GDPR consent (if EU)
- Not opted out
- Within sending window
- Daily quota available

✓ **Duplicate Check**
- Not already in active sequence
- No recent outreach (last 90 days)

### Step 2: Personalization Generation (30 seconds)

I'll generate custom variables for each contact:

**Basic Variables:**
- firstName, lastName, company, title

**Intelligence-Driven:**
- painPoint: From enrichment analysis
- hook: Best personalization hook (funding, hiring, tech)
- whyNow: Urgency trigger
- caseStudy: Relevant customer story

**Example Personalization:**
```javascript
Variables for ava@acme.com:
{
  firstName: "Ava",
  company: "Acme Inc",
  painPoint: "scaling financial operations without headcount",
  hook: "Congrats on the recent $25M Series B!",
  whyNow: "Fresh funding to invest in infrastructure",
  caseStudy: "Similar 300-person fintech reduced close time 40%",
  techStack: "Snowflake, Stripe",
  hiringSignal: "hiring 3 FP&A roles"
}
```

### Step 3: Template Selection & Preview

**Template Matching:**
I'll select the best template based on available signals:

1. **Funding Hook** (Priority 1) - If funding in last 90 days
2. **Hiring Hook** (Priority 2) - If active hiring signals
3. **Tech Stack Hook** (Priority 3) - If recent tech adoption
4. **Generic Pain-Based** (Priority 4) - Fallback

**Email Preview:**
```
To: ava@acme.com
Subject: Ava, quick question about Acme's growth

Hi Ava,

Congrats on the recent $25M Series B!

Quick question: As Acme scales with this new funding, how are you handling scaling financial operations without headcount without adding more headcount?

Similar 300-person fintech reduced close time from 15 days to 6 days.

Worth a 15-minute conversation?

Best,
John Doe
Account Executive
```

### Step 4: Sequence Enrollment

**Standard 5-Touch Sequence:**

```yaml
Day 0: Email #1 (Personalized opener)
  Send Time: 9:00 AM (recipient's timezone)

Day 2: [Conditional Branch]
  If opened + no click:
    → LinkedIn connection task
  If not opened:
    → Email #2 (variant subject)

Day 5: Email #3 (Follow-up with value)
  Condition: No reply yet

Day 7: [Conditional]
  If opened emails:
    → Phone call task
  If not opened:
    → Skip to breakup

Day 10: Email #4 (Breakup email)
  "Is this a priority?"

Auto-Pause Triggers:
  - Positive reply → Create deal, notify AE
  - Negative reply → Mark unqualified, stop sequence
  - Unsubscribe → Honor immediately, add to DNC
```

### Step 5: Adaptive Execution

As the campaign runs, I'll automatically:

**Monitor Engagement:**
- Email opens, clicks, replies
- LinkedIn connection acceptances
- Bounce notifications
- Unsubscribe requests

**Adjust Cadence:**
- High engagement → Faster follow-ups
- No engagement → Try different angles
- Positive reply → Stop sequence, create opportunity

**Quality Control:**
- Bounce rate monitoring (pause if >5%)
- Spam complaint tracking (critical if >0.1%)
- Deliverability health checks

---

## Campaign Templates

### Template 1: Fintech VP Finance (Snowflake Users)
**Target Persona:** VP Finance, CFO at fintech companies
**Tech Signal:** Uses Snowflake or BigQuery
**Sequence:** 4 emails + 1 LinkedIn + 1 phone task over 10 days

### Template 2: SaaS Finance Leaders (Growth Stage)
**Target Persona:** VP Finance at Series B+ SaaS companies
**Signal:** Recent funding or rapid hiring
**Sequence:** 3 emails + LinkedIn over 8 days

### Template 3: E-commerce Controllers
**Target Persona:** Controller, Director Finance at e-commerce
**Signal:** Revenue growth or marketplace expansion
**Sequence:** 3 emails over 7 days

---

## Performance Monitoring

### Real-Time Metrics

```
Campaign: Fintech VP Finance - Snowflake Users
Status: Active
Duration: 23 days

Volume:
  Enrolled: 94
  Active: 67
  Completed: 27

Engagement:
  Sent: 247 emails
  Delivered: 241 (97.6%)
  Opens: 102 (42.3%) ⬆ +4.3% vs baseline
  Clicks: 18 (7.5%)
  Replies: 22 (9.1%) ⬆ +3.1% vs baseline

Conversions:
  Positive Replies: 14 (5.8%)
  Meetings Booked: 8 (3.3%)
  Opportunities Created: 3

Deliverability:
  Bounces: 6 (2.4%) ✓ Healthy
  Spam Complaints: 0 ✓ Excellent
  Unsubscribes: 4 (1.7%) ✓ Normal

Top Performers:
  Best Subject: "{{firstName}}, quick question..." (12% reply rate)
  Best Hook: Funding congratulations (15% reply rate)
  Best Send Time: 9-10 AM local time
  Best Day: Tuesday
```

### Reply Classification

I automatically classify all replies:

- **Positive** (14) - Interested, book meeting
- **Question** (5) - Needs more info, send resources
- **Not Now** (2) - Timing issue, add to nurture
- **Not Interested** (1) - Unqualified, stop outreach
- **Out of Office** (0) - Auto-pause, resume later

---

## Adaptive Branching Examples

### Scenario 1: High Engagement Path
```
Ava Ng - ava@acme.com

Day 0: Email #1 sent ✓
Day 1: Opened (10:15 AM) ✓
Day 1: Clicked case study link ✓
  → High intent detected
  → Accelerate sequence

Day 2: Email #2 sent (offer discovery call)
Day 2: Replied "Interested, let's chat next week"
  → STOP SEQUENCE
  → Create HubSpot deal
  → Create task for AE: "Schedule meeting with Ava"
  → Lifecycle stage: SQL
```

### Scenario 2: No Engagement Path
```
Bob Smith - bob@widgets.io

Day 0: Email #1 sent ✓
Day 3: No open
  → Send Email #2 (different subject)

Day 5: Opened Email #2 ✓
Day 5: No click
  → LinkedIn connection task created

Day 7: LinkedIn request ignored
Day 8: Email #3 sent (breakup)
Day 10: No reply
  → COMPLETE SEQUENCE
  → Move to nurture (quarterly touches)
```

### Scenario 3: Negative Response
```
Carol Lee - carol@example.com

Day 0: Email #1 sent ✓
Day 1: Reply: "Not interested, remove me"
  → STOP SEQUENCE IMMEDIATELY
  → Update HubSpot: Unqualified
  → Add to suppression list
  → Honor opt-out across all campaigns
```

---

## Compliance & Safety

### Auto-Pause Triggers
I'll automatically pause campaigns if:
- Bounce rate > 5%
- Spam complaints > 0.1%
- Unsubscribe spike (>3% in 24 hours)
- Daily sending quota reached
- Domain reputation drops

### Unsubscribe Handling
When someone unsubscribes:
1. ✓ Stop all sequences immediately
2. ✓ Update HubSpot opt-out status
3. ✓ Add to global suppression list
4. ✓ Remove from all future campaigns
5. ✓ Honor across all tools (lemlist + HubSpot)

### Regional Compliance
- **GDPR (EU)**: Consent basis required, honor data requests
- **CAN-SPAM (US)**: Unsubscribe link, physical address
- **Send Windows**: Only during business hours (8 AM - 6 PM local time)

---

## What's Next?

After launching outreach:

1. **Monitor Daily** - Check `/sales-outreach` for metrics
2. **Review Replies** - Classify and route positive responses
3. **Optimize** - I'll auto-promote winning variants
4. **Scale** - Expand to lookalike audiences

---

Ready to launch? Please specify:
- Which contacts to enroll (email list, discovery results, or HubSpot segment)
- Campaign/sequence to use (or I'll recommend based on persona)
- Review settings (preview emails, send test, or auto-launch)
