# Lemlist MCP Integration Guide

## Overview

The sales automation plugin integrates with Lemlist via **two complementary MCP servers**:

1. **Lemlist MCP Server** (`lemlist`) - Full Lemlist API access with 50+ tools
2. **Sales Automation MCP Server** (`sales-automation`) - Orchestration layer with simplified lemlist client

This dual-server architecture provides both **direct API control** (for advanced users) and **high-level automation workflows** (for most use cases).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code                              │
│                                                              │
│  ┌─────────────────────┐      ┌──────────────────────────┐ │
│  │  Lemlist MCP Server │      │ Sales Automation MCP     │ │
│  │  (50+ lemlist tools)│      │ (Orchestration + Jobs)   │ │
│  └──────────┬──────────┘      └───────────┬──────────────┘ │
│             │                               │                │
└─────────────┼───────────────────────────────┼────────────────┘
              │                               │
              │                               │
      ┌───────▼────────┐            ┌─────────▼───────┐
      │ Lemlist API    │            │ Lemlist Client  │
      │ (Direct)       │            │ (Simplified)    │
      └────────────────┘            └─────────────────┘
              │                               │
              └───────────┬───────────────────┘
                          │
                  ┌───────▼────────┐
                  │  Lemlist.com   │
                  │  API Platform  │
                  └────────────────┘
```

---

## When to Use Each Server

### Use **Lemlist MCP Server** (`lemlist`) for:

- **Direct campaign management** - Create, update, delete campaigns
- **Advanced lead searches** - Complex filtering and segmentation
- **LinkedIn enrichment** - Get real LinkedIn URLs via waterfall enrichment
- **Webhook configuration** - Real-time event notifications
- **Template management** - Email template CRUD operations
- **Bulk operations** - Large-scale lead imports
- **Analytics deep-dives** - Detailed activity breakdowns

**Example:**
```
"Use the lemlist server to search for John Doe at acme.com and get their real LinkedIn URL"
```

### Use **Sales Automation MCP Server** (`sales-automation`) for:

- **Integrated workflows** - Lead discovery → enrichment → CRM sync → outreach
- **Background job processing** - Async enrichment and sync operations
- **Multi-API coordination** - HubSpot + Explorium + Lemlist together
- **ICP-based lead scoring** - Intelligent lead prioritization
- **Automated sequences** - Trigger-based outreach campaigns
- **Quality gates** - Validation before outreach

**Example:**
```
"Use /sales-outreach to enroll these 50 enriched contacts in the liquidity_management sequence"
```

---

## Lemlist MCP Server Tools (50+ Available)

### Campaign Management (5 tools)
- `get_campaigns` - List all campaigns
- `get_campaign` - Get campaign details
- `create_campaign` - Create new campaign with email sequence
- `update_campaign` - Modify existing campaign
- `delete_campaign` - Remove campaign

### Lead Management (6 tools)
- `get_leads` - Retrieve leads (with campaign filtering)
- `add_lead` - Add single lead to campaign
- `bulk_add_leads` - Efficient bulk import
- `update_lead` - Modify lead information
- `delete_lead` - Remove lead from campaign
- `search_leads_advanced` - Advanced search with filters

### LinkedIn Enrichment (4 tools)
- `search_database_for_linkedin` - Search Lemlist database for LinkedIn URLs
- `search_and_enrich_person` - Find person + get LinkedIn URL
- `enrich_lead_linkedin` - Enrich existing lead with LinkedIn
- `get_enriched_lead_data` - Retrieve enrichment results

### Analytics & Activities (7 tools)
- `get_activities` - Campaign activities (opens, clicks, replies)
- `get_activities_with_filters` - Advanced activity filtering
- `get_grouped_activities` - Activities grouped by type/date/lead
- `get_campaign_stats` - Detailed performance metrics
- `get_detailed_campaign_stats` - Stats with date ranges
- `get_multi_campaign_stats` - Cross-campaign analytics
- `get_activity_types` - Available activity types

### Webhooks (4 tools)
- `create_webhook` - Set up real-time event notifications
- `get_webhooks` - List configured webhooks
- `update_webhook` - Modify webhook configuration
- `delete_webhook` - Remove webhook

### Unsubscribe Management (4 tools)
- `get_unsubscribes` - List unsubscribed emails
- `add_to_unsubscribes` - Add email to unsubscribe list
- `remove_from_unsubscribes` - Resubscribe email
- `unsubscribe_from_campaign` - Campaign-specific unsubscribe

### Templates (2 tools)
- `get_templates` - List email templates
- `create_template` - Create new email template

### High-Level Workflows (3 tools)
- `create_complete_campaign` - Campaign + leads in one operation
- `validate_lead_data` - Pre-import validation
- `export_leads` - Export campaign leads

### Search & Filtering (2 tools)
- `search_campaigns` - Search campaigns by criteria
- `search_leads_advanced` - Multi-parameter lead search

### Team & Account (2 tools)
- `get_team_members` - List team members
- `get_account_info` - Account limits and info

### Utility (2 tools)
- `health_check` - API connection status
- `get_rate_limit_status` - Current rate limit info

---

## Sales Automation Lemlist Client

The `sales-automation` MCP server includes a simplified **Lemlist Client** wrapper that provides focused methods for common workflows:

### Core Methods

```javascript
// Campaign Operations
getCampaigns(options)
getCampaign(campaignId)
createCampaign({ name, emails, settings })
getCampaignStats(campaignId)

// Lead Operations
addLead({ campaignId, email, firstName, lastName, companyName })
bulkAddLeads(campaignId, leads)
getLeads(options)
updateLead(leadId, updateData)
deleteLead(leadId)

// LinkedIn Enrichment
enrichLeadWithLinkedIn(leadId)
getEnrichedLeadData(leadId)
searchAndEnrichPerson(firstName, lastName, companyDomain)

// Activities & Analytics
getActivities(options)
exportLeads(campaignId, options)

// Compliance
getUnsubscribes(options)
addToUnsubscribes(email)
unsubscribeFromCampaign(campaignId, leadId)

// Workflows
createCompleteCampaign({ campaignName, emailSequence, leads, settings })
validateLeadData(leads)

// Utility
healthCheck()
getRateLimitStatus()
```

---

## Integration Patterns

### Pattern 1: Direct LinkedIn Enrichment

**Scenario:** You have a name and company, need LinkedIn URL

**Using Lemlist MCP Server:**
```
"Use lemlist server to search and enrich John Smith at acme.com for their real LinkedIn profile URL"
```

**What happens:**
1. Lemlist MCP creates temporary lead in campaign
2. Triggers waterfall enrichment (RocketReach, Lusha, etc.)
3. Returns real LinkedIn URL when found
4. Stores in `lead_linkedin_url` field

**Result:**
```json
{
  "success": true,
  "leadId": "abc123",
  "linkedinUrl": "https://linkedin.com/in/johnsmith-real",
  "enrichmentId": "xyz789"
}
```

---

### Pattern 2: Integrated Outreach Workflow

**Scenario:** Complete workflow from discovery to outreach

**Using Sales Automation Commands:**
```
1. /sales-discover "Find 50 PSP treasury leaders in CEMEA"
2. /sales-enrich "Enrich these contacts with pain points"
3. /sales-outreach "Launch liquidity_management sequence"
```

**What happens:**
1. **Discovery**: Multi-source search → ICP scoring → deduplication
2. **Enrichment**:
   - Explorium for firmographics
   - Apollo for contact data
   - Lemlist for LinkedIn URLs
   - Intelligence generation (pain hypotheses, hooks)
3. **CRM Sync**: Create/update HubSpot contacts with enriched data
4. **Outreach**:
   - Create lemlist campaign
   - Generate personalized variables
   - Enroll leads with multi-channel sequence
   - LinkedIn tasks created based on engagement

**Lemlist Integration Points:**
- Uses `createCampaign()` to set up sequence
- Uses `bulkAddLeads()` to enroll contacts
- Uses `enrichLeadWithLinkedIn()` for social data
- Uses `getActivities()` for engagement tracking

---

### Pattern 3: LinkedIn Enrichment at Scale

**Scenario:** Enrich 100 contacts with LinkedIn URLs

**Using Background Jobs:**
```javascript
// Queue enrichment job
await jobQueue.enqueue({
  type: 'linkedin_enrichment',
  priority: 'normal',
  parameters: {
    contacts: [
      { firstName: 'John', lastName: 'Doe', companyDomain: 'acme.com' },
      // ... 99 more contacts
    ]
  }
});
```

**Worker Process:**
```javascript
// enrichment-worker.js
for (const contact of contacts) {
  // Use lemlist client for enrichment
  const result = await lemlistClient.searchAndEnrichPerson(
    contact.firstName,
    contact.lastName,
    contact.companyDomain
  );

  if (result.success && result.linkedinUrl) {
    // Update HubSpot contact with LinkedIn URL
    await hubspotClient.updateContact(contact.hubspotId, {
      linkedin_url: result.linkedinUrl
    });
  }
}
```

---

### Pattern 4: Event-Driven Automation

**Scenario:** Auto-respond to lemlist events

**Setup Webhook:**
```
"Use lemlist server to create a webhook for email.replied events pointing to our webhook URL"
```

**Hook Configuration** (`hooks/hooks.json`):
```json
{
  "trigger": "webhook",
  "event": "lemlist.email.replied",
  "action": {
    "type": "agent",
    "agent": "crm-integration-agent",
    "task": "Process reply and update HubSpot lifecycle stage to 'Engaged'"
  }
}
```

---

## RTGS.global Use Case: Multi-Channel Sequences

### Email + LinkedIn Coordination

The RTGS.global templates (`config/rtgs-global-templates.yaml`) define multi-channel sequences that leverage lemlist's LinkedIn integration:

```yaml
liquidity_management_hook:
  sequence:
    - step: 1
      channel: email
      delay_hours: 0
      subject: "{{companyName}}'s treasury workflows - scaling blockers?"
      body: |
        Hi {{firstName}},

        I noticed {{companyName}} {{personalizationHook}}.

        Are inefficient treasury workflows limiting your ability to scale?

        RTGS.global enables smart liquidity management with just-in-time
        funding - eliminating collateral demands and optimizing 24/7.

        Worth exploring?

        Best,
        {{senderFirstName}}

    - step: 2
      channel: linkedin
      delay_hours: 48
      condition: "email_opened && !replied"
      message: |
        Hi {{firstName}}, I sent you an email about {{companyName}}'s
        treasury workflows. Since you're expanding {{region}}, thought
        the liquidity optimization angle might be relevant.

        Open to a quick chat?

    - step: 3
      channel: email
      delay_hours: 120
      condition: "!replied"
      subject: "Quick question about {{companyName}}'s liquidity management"
      body: |
        {{firstName}},

        Following up on my previous email...
```

**Implementation via Sales Automation:**

The `outreach-coordinator` agent handles this:

1. **Email Step 1** - Sent via lemlist campaign
2. **Monitor Engagement** - Checks `get_activities()` for opens
3. **LinkedIn Conditional** - If opened + not replied:
   - Uses lemlist's LinkedIn integration
   - Sends connection request (via lemlist)
   - Queues follow-up message
4. **Email Step 3** - Breakup email if still no reply

**Key Advantage:** Unified tracking across channels in lemlist dashboard.

---

## Configuration

### Environment Variables

```bash
# Required
LEMLIST_API_KEY=your_lemlist_api_key_here

# Optional
DEFAULT_LEMLIST_CAMPAIGN_ID=campaign_abc123
```

### Plugin Configuration

The plugin automatically configures both MCP servers when installed. See `.claude-plugin/plugin.json`:

```json
{
  "mcpServers": {
    "sales-automation": {
      "env": {
        "LEMLIST_API_KEY": "${env:LEMLIST_API_KEY}"
      }
    },
    "lemlist": {
      "env": {
        "LEMLIST_API_KEY": "${env:LEMLIST_API_KEY}"
      }
    }
  }
}
```

---

## API Rate Limits

Lemlist implements the following rate limits (managed by `rate-limiter.js`):

```javascript
lemlist: {
  maxConcurrent: 3,
  minTime: 500,  // 2 req/sec (conservative)
  reservoir: 20,
  reservoirRefreshInterval: 10 * 1000  // 10 seconds
}
```

**Why Conservative?**
- Protects email deliverability
- Prevents spam flags
- Maintains sender reputation
- Complies with lemlist best practices

**Override if Needed:**
```javascript
rateLimiter.updateConfig('lemlist', {
  minTime: 250  // 4 req/sec (use with caution)
});
```

---

## LinkedIn Enrichment Details

### How Lemlist's Waterfall Enrichment Works

1. **Lead Created** - Add lead to lemlist campaign
2. **Enrichment Triggered** - Call `/leads/{id}/enrich?linkedinEnrichment=true`
3. **Waterfall Process**:
   - Checks lemlist's 400M+ contact database first
   - If not found, queries RocketReach, Lusha, Snov.io, etc.
   - Returns **real verified LinkedIn URL** (not pattern-generated)
4. **Result Stored** - `lead_linkedin_url` field populated

### Checking Enrichment Status

```javascript
// Immediate check (may be processing)
const result = await lemlistClient.getEnrichedLeadData(leadId);

if (result.success && result.linkedinUrl) {
  console.log('LinkedIn URL:', result.linkedinUrl);
} else {
  console.log('Enrichment still processing...');
}
```

### Best Practices

✅ **DO:**
- Provide accurate `firstName`, `lastName`, `companyDomain`
- Wait 10-30 seconds for enrichment to complete
- Cache LinkedIn URLs in HubSpot to avoid re-enrichment
- Use for high-value leads only (enrichment costs credits)

❌ **DON'T:**
- Use for bulk enrichment of >1000 leads (slow + expensive)
- Assume immediate results (waterfall takes time)
- Re-enrich same contact multiple times
- Use as primary contact discovery method

---

## Troubleshooting

### Issue: Lemlist MCP Server Not Connecting

**Symptoms:**
- "lemlist server unavailable"
- Tools not showing in Claude Code

**Solutions:**
1. Check API key: `echo $LEMLIST_API_KEY`
2. Verify plugin installation: `npm install --prefix mcp-server`
3. Check server logs: `tail -f mcp-server/logs/lemlist.log`
4. Test direct connection:
   ```bash
   node mcp-server/src/lemlist/index.js
   ```

---

### Issue: LinkedIn Enrichment Returning Empty

**Symptoms:**
- `enrichLeadWithLinkedIn()` succeeds but no LinkedIn URL

**Solutions:**
1. **Wait longer** - Waterfall enrichment takes 10-60 seconds
2. **Check name accuracy** - Typos prevent matches
3. **Verify company domain** - Must be exact (e.g., `acme.com` not `acme.io`)
4. **Check enrichment credits** - May have exhausted quota
5. **Search database first**:
   ```
   "Use lemlist server to search database for John Doe before enriching"
   ```

---

### Issue: Bulk Lead Import Failing

**Symptoms:**
- `bulkAddLeads()` returns errors
- Only partial leads added

**Solutions:**
1. **Validate data first**:
   ```javascript
   const validation = await lemlistClient.validateLeadData(leads);
   ```
2. **Check required fields** - email, firstName, lastName required
3. **Batch size** - Max 1000 leads per batch
4. **Deduplicate** - lemlist rejects duplicate emails

---

### Issue: Multi-Channel Sequence Not Triggering LinkedIn

**Symptoms:**
- Email sent, but LinkedIn step skipped

**Solutions:**
1. **Check lemlist LinkedIn integration** - Must be enabled in lemlist account
2. **Verify connection limits** - LinkedIn limits 30-50 connections/day
3. **Check conditional logic** - May not meet `email_opened` condition
4. **Review campaign settings** - LinkedIn automation must be active

---

## Best Practices

### 1. **Use Lemlist for What It's Best At**

✅ **Good use cases:**
- Multi-channel email + LinkedIn sequences
- LinkedIn URL enrichment (waterfall)
- Campaign performance tracking
- Unsubscribe management

❌ **Not ideal for:**
- Primary lead discovery (use Apollo/LinkedIn Sales Nav)
- Company firmographics (use Explorium/Clearbit)
- Real-time event processing (use webhooks + own queue)

---

### 2. **Optimize Enrichment Costs**

**Strategy:**
1. Check lemlist database first (`search_database_for_linkedin`)
2. If not found, enrich only high-ICP-score leads
3. Cache results in HubSpot custom field
4. Batch enrichments overnight (cheaper)

**Example:**
```javascript
// Check database first (free)
const dbResult = await lemlistClient.searchPersonByName(firstName, lastName, domain);

if (!dbResult.linkedinUrl) {
  // Only enrich if ICP score > 0.75
  if (lead.icpScore > 0.75) {
    await lemlistClient.enrichLeadWithLinkedIn(leadId);
  }
}
```

---

### 3. **Respect Rate Limits**

- Use the built-in rate limiter (2 req/sec default)
- Don't bypass rate limits for bulk operations
- Spread large imports over hours/days
- Monitor deliverability metrics

---

### 4. **Handle Unsubscribes Immediately**

```javascript
// In webhook handler
if (event.type === 'lead.unsubscribed') {
  // 1. Add to lemlist unsubscribe list
  await lemlistClient.addToUnsubscribes(event.email);

  // 2. Update HubSpot contact
  await hubspotClient.updateContact(event.hubspotId, {
    hs_email_optout: true
  });

  // 3. Remove from all active sequences
  await outreachCoordinator.removeFromAllSequences(event.email);
}
```

---

## Advanced: Extending Lemlist Integration

### Adding Custom Tools to Sales Automation MCP

```javascript
// mcp-server/src/server.js

// Add custom lemlist tool
{
  name: 'lemlist_create_ab_test_campaign',
  description: 'Create A/B test campaign with variant tracking',
  inputSchema: {
    type: 'object',
    properties: {
      baselineCampaign: { type: 'object' },
      variants: { type: 'array' }
    }
  },
  handler: async (params) => {
    // Use lemlistClient to create multiple campaigns
    const results = await Promise.all(
      params.variants.map(variant =>
        lemlistClient.createCampaign({
          name: `${params.baselineCampaign.name} - ${variant.name}`,
          emails: variant.emails
        })
      )
    );

    return {
      success: true,
      campaigns: results,
      trackingEnabled: true
    };
  }
}
```

---

## Summary

The Lemlist integration provides:

✅ **50+ specialized tools** via Lemlist MCP Server
✅ **Simplified client** for common workflows
✅ **LinkedIn enrichment** with waterfall verification
✅ **Multi-channel sequences** (email + LinkedIn)
✅ **Campaign analytics** and engagement tracking
✅ **Compliance management** (unsubscribes, opt-outs)
✅ **Rate-limited** API access for deliverability
✅ **Event-driven** automation via webhooks

**Next Steps:**
1. Set `LEMLIST_API_KEY` environment variable
2. Run `/sales-discover` to find leads
3. Use `/sales-outreach` to launch first campaign
4. Monitor with `/sales-monitor` for performance

For RTGS.global-specific workflows, see `RTGS_QUICKSTART.md`.

---

**Questions or Issues?**

- Check Lemlist API docs: https://developer.lemlist.com
- Review `mcp-server/src/lemlist/lemlist-client.js` for available methods
- Test direct API: `node mcp-server/src/lemlist/index.js`
- Enable debug logging: `DEBUG=lemlist npm start`
