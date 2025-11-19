---
name: Sales Automation Skill Adapter
description: Generic skill wrapper that activates sales automation capabilities based on conversation context
---

# Sales Automation Skill Adapter

This skill auto-activates when you mention sales-related topics, providing intelligent suggestions and proactive automation.

## Activation Triggers

I activate when you mention:

- **Lead Generation**: "find leads", "discover prospects", "need contacts"
- **Data Enrichment**: "enrich contact", "get company data", "verify email"
- **CRM Operations**: "HubSpot", "create contact", "update deal"
- **Outreach**: "email campaign", "lemlist", "send outreach"
- **Performance**: "campaign metrics", "reply rate", "pipeline"

## What I Do

### 1. Proactive Suggestions
When activated, I'll suggest relevant commands:
- `/sales-discover` - For lead generation discussions
- `/sales-enrich` - When you need data on contacts
- `/sales-outreach` - For campaign launch discussions
- `/sales-monitor` - When checking performance

### 2. Intelligent Context
I understand your sales workflow and provide context-aware guidance:
- Recommend next steps in the workflow
- Alert on high-value opportunities
- Warn about potential issues
- Suggest optimizations

### 3. Workflow Orchestration
I coordinate the sales orchestrator agent to:
- Break down complex multi-step tasks
- Assign specialized agents (lead-finder, enricher, CRM, outreach)
- Monitor progress and quality
- Report results

## Example Interactions

```
User: I need to find 50 VP Finance prospects at fintech companies
Skill: [Activates] I'll help you discover high-fit leads. Let me use the sales-orchestrator...
```

```
User: Can you enrich this contact: ava@acme.com?
Skill: [Activates] I'll enrich this contact using Explorium and Apollo...
```

```
User: How's our fintech campaign performing?
Skill: [Activates] Let me check the campaign performance metrics...
```

## Available Commands

- `/sales-discover` - Lead discovery and scoring
- `/sales-enrich` - Multi-source data enrichment
- `/sales-outreach` - lemlist campaign management
- `/sales-monitor` - Performance tracking

## Configuration

Customize behavior in `.sales-automation/config.yaml`:

```yaml
skills:
  auto_activate: true
  proactive_suggestions: true
  workflow_automation: true
```
