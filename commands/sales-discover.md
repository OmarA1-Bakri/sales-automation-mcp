---
name: sales-discover
description: Discover and score high-fit sales prospects matching ICP criteria
model: sonnet
---

# Sales Lead Discovery Command

This command helps you discover high-quality sales prospects that match your Ideal Customer Profile (ICP) from multiple data sources.

## What would you like to discover?

Please specify what you're looking for:

1. **ICP-Driven Discovery** - Find leads matching a specific ICP profile
2. **Account-Based Discovery** - Find contacts at specific target companies
3. **Intent-Driven Discovery** - Find leads showing recent buying signals
4. **Lookalike Discovery** - Find prospects similar to your best customers

---

## Usage Examples

### Example 1: ICP-Driven Discovery
```
User: Find 100 VP Finance prospects at fintech companies using Snowflake
Assistant: I'll use the sales-orchestrator agent to coordinate this discovery workflow.
```

### Example 2: Account-Based Discovery
```
User: Find the CFO and VP Finance at Acme Inc (acme.com)
Assistant: I'll discover decision-makers at Acme Inc and enrich their profiles.
```

### Example 3: Intent-Driven Discovery
```
User: Find companies that raised Series B funding in the last 60 days
Assistant: I'll search for recent funding signals and identify finance leaders at those companies.
```

---

## How It Works

When you run this command, I will:

### Step 1: Understand Your Requirements
- ICP profile to target
- Number of leads needed
- Data sources to use
- Minimum quality thresholds

### Step 2: Execute Multi-Source Search
- Query LinkedIn Sales Navigator (via proxy)
- Search Apollo.io contact database
- Check intent signal providers
- Aggregate and deduplicate results

### Step 3: Score & Filter Leads
- Calculate composite fit score
- Identify intent signals
- Assess data quality and reachability
- Filter by minimum threshold

### Step 4: Present Results
- Top-ranked prospects
- Score breakdown and reasoning
- Recommended next actions
- Option to enrich or enroll in outreach

---

## What's Next?

After I discover leads, you can:

1. **Enrich selected leads** - Use `/sales-enrich` to gather comprehensive data
2. **Sync to HubSpot** - Create CRM records with enriched data
3. **Launch outreach** - Enroll in lemlist campaigns with personalized messaging
4. **Export results** - Download CSV for manual review

---

Ready to discover leads? Please tell me:
- What ICP profile or criteria should I use?
- How many leads do you need?
- Any specific companies or industries to target/exclude?
