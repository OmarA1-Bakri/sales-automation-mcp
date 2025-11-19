# Sales Automation Suite - Setup Guide

Complete installation and configuration guide for the sales automation plugin.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [API Keys Configuration](#api-keys-configuration)
4. [ICP Profiles Setup](#icp-profiles-setup)
5. [Email Templates Setup](#email-templates-setup)
6. [Verification](#verification)
7. [Deployment Modes](#deployment-modes)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Claude Code**: Latest version
- **Git**: For cloning repository

### Required Accounts & API Keys

You'll need API keys for the following services:

1. **HubSpot** - CRM operations
   - Sign up: https://www.hubspot.com
   - Create Private App: Settings → Integrations → Private Apps
   - Required scopes: `crm.objects.contacts`, `crm.objects.companies`, `crm.objects.deals`, `crm.schemas.contacts`, `timeline`

2. **Lemlist** - Email + LinkedIn outreach
   - Sign up: https://www.lemlist.com
   - Get API key: Settings → Integrations → API
   - Pricing: Starts at $59/month

3. **Explorium** - Data enrichment
   - Sign up: https://www.explorium.ai
   - Contact sales for API access
   - Pricing: Credit-based, ~$0.50 per enrichment

4. **Anthropic** - Claude API (for API server mode only)
   - Sign up: https://console.anthropic.com
   - Get API key: Account → API Keys
   - Pricing: Haiku $0.25/1M input, Sonnet $3/1M input

---

## Installation

### 1. Clone or Copy Plugin

If using as Claude Code plugin:

```bash
# Navigate to Claude Code plugins directory
cd ~/.claude-code/plugins

# Clone this repository (or copy plugin folder)
git clone <repository-url> sales-automation-suite

cd sales-automation-suite
```

### 2. Install Dependencies

```bash
# Install MCP server dependencies
cd mcp-server
npm install

# Return to plugin root
cd ..
```

### 3. Create Configuration Directories

```bash
# Create sales automation config directory
mkdir -p .sales-automation

# Create logs directory
mkdir -p .sales-automation/logs
```

---

## API Keys Configuration

### Option 1: Environment Variables (Recommended)

Create `.env` file in project root:

```bash
# Copy example env file
cp .env.example .env

# Edit with your API keys
nano .env
```

**.env file**:

```bash
# HubSpot API Key
HUBSPOT_API_KEY=pat-na1-xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Lemlist API Key
LEMLIST_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Explorium API Key
EXPLORIUM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Anthropic API Key (for API server mode)
ANTHROPIC_API_KEY=sk-ant-xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Optional: Logging
SALES_AUTO_LOG_LEVEL=info

# Optional: API Server Port
API_PORT=3000
```

### Option 2: System Environment Variables

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export HUBSPOT_API_KEY="pat-na1-xxxxx..."
export LEMLIST_API_KEY="xxxxxxxxxxxxx..."
export EXPLORIUM_API_KEY="xxxxxxxxxxxxx..."
export ANTHROPIC_API_KEY="sk-ant-xxxxx..."
```

Reload shell:
```bash
source ~/.bashrc  # or ~/.zshrc
```

---

## ICP Profiles Setup

ICP (Ideal Customer Profile) profiles define your target companies and contacts.

### 1. Copy Example Configuration

```bash
cp config/icp-profiles.example.yaml .sales-automation/icp-profiles.yaml
```

### 2. Edit ICP Profiles

Edit `.sales-automation/icp-profiles.yaml`:

```yaml
# Example ICP: Payment Service Provider Treasury Leaders
icp_psp_treasury:
  name: "PSP Treasury & Operations Leaders"

  # Industries to target
  industry:
    - "Payment Service Provider"
    - "Payment Processing"
    - "Financial Services"

  # Company size
  employees:
    min: 100
    max: 5000

  # Revenue range
  revenue:
    min: "$10M"
    max: "$500M"

  # Target geographies
  geography:
    - "United Kingdom"
    - "Germany"
    - "France"
    - "Netherlands"
    - "United Arab Emirates"
    - "Singapore"

  # Technology stack indicators
  technologies:
    - "Stripe"
    - "AWS"
    - "Banking APIs"
    - "Payment Gateway"

  # Buying intent signals
  signals:
    - "funding"
    - "expansion"
    - "hiring"
    - "new_product"

  # Target job titles
  target_titles:
    - "Head of Treasury"
    - "VP Finance"
    - "CFO"
    - "Treasury Operations Manager"
    - "Finance Director"

  # Target departments
  departments:
    - "Finance"
    - "Treasury"
    - "Operations"
    - "Corporate Development"

# Add more ICP profiles as needed
icp_fintech_operators:
  name: "Fintech Operational Leaders"
  industry:
    - "Fintech"
    - "Digital Banking"
  # ... (similar structure)
```

### 3. Validate ICP Configuration

```bash
# In Claude Code, run:
/sales-diagnose

# Or via CLI:
node mcp-server/src/scripts/validate-icp.js
```

---

## Email Templates Setup

Email templates define multi-step sequences with personalization.

### 1. Copy Example Templates

```bash
cp config/templates.example.yaml .sales-automation/templates.yaml
```

### 2. Edit Templates

Edit `.sales-automation/templates.yaml`:

```yaml
# Template for liquidity management pain point
liquidity_management_hook:
  name: "Liquidity Management - Multi-Market Expansion"
  pain_point: "liquidity_management"

  emails:
    # Email 1: Initial outreach
    - subject: "{{firstName}}, question about {{companyName}} liquidity"
      body: |
        Hi {{firstName}},

        {{personalization_hook}}

        I work with payment companies like {{companyName}} that are scaling into multiple markets. Given {{why_now}}, I wanted to reach out about how you're handling liquidity management across currencies.

        Most PSPs we work with face challenges with:
        - Real-time visibility across nostro accounts
        - Manual reconciliation eating up finance team time
        - Suboptimal FX conversion timing

        Would it be helpful to share how companies like [Social Proof] automated their treasury operations?

        Best,
        [Your Name]
      delay: 0  # Send immediately

    # Email 2: Follow-up (3 days later)
    - subject: "Re: {{companyName}} liquidity"
      body: |
        {{firstName}},

        Just following up on my note from earlier this week about treasury automation.

        Given your recent {{recent_signal}}, I imagine liquidity management is top of mind.

        Would a quick 15-minute call next week be useful? I can share how we helped [Similar Company] reduce manual treasury work by 80%.

        Best,
        [Your Name]
      delay: 3  # 3 days after email 1

    # Email 3: Break-up (7 days after email 2)
    - subject: "Moving on"
      body: |
        {{firstName}},

        I haven't heard back, so I'll assume this isn't a priority right now.

        If treasury automation becomes relevant in the future, feel free to reach out.

        All the best with {{companyName}}'s growth!

        [Your Name]
      delay: 7  # 7 days after email 2

# Add more templates for different pain points
cost_reduction_hook:
  name: "Cost Reduction - Banking Fees"
  pain_point: "cost_reduction"
  emails:
    # ... (similar structure)
```

### 3. Template Variables

Available personalization variables (auto-generated from enrichment):

- `{{firstName}}`, `{{lastName}}` - Contact name
- `{{companyName}}` - Company name
- `{{pain_point}}` - Identified pain point
- `{{pain_reasoning}}` - Why we think they have this pain
- `{{personalization_hook}}` - Recent event/signal to reference
- `{{hook_usage}}` - Suggested usage of the hook
- `{{why_now}}` - Urgency trigger
- `{{urgency}}` - Urgency level (high/medium/low)
- `{{company_industry}}` - Company's industry
- `{{company_employees}}` - Employee count
- `{{company_funding}}` - Funding stage
- `{{recent_signal}}` - Most recent growth signal

---

## YOLO Mode Configuration (Optional)

YOLO Mode enables fully autonomous operation.

### 1. Copy Example Configuration

```bash
cp config/yolo-config.example.yaml .sales-automation/yolo-config.yaml
```

### 2. Edit YOLO Configuration

Edit `.sales-automation/yolo-config.yaml`:

```yaml
yolo_mode:
  enabled: true

  # Discovery Settings
  discovery:
    schedule: "0 8 * * *"  # Daily at 8am (cron format)
    leads_per_day: 50
    icp_profiles:
      - icp_psp_treasury  # Primary ICP
    min_icp_score: 0.75
    geographic_focus: ["CEMEA", "APAC"]

  # Enrichment Settings
  enrichment:
    auto_enrich: true
    min_data_quality: 0.70
    required_fields: ["email", "firstName", "lastName", "title", "company"]

  # CRM Sync Settings
  crm_sync:
    auto_create_contacts: true
    auto_deduplicate: true
    skip_if_exists: true

  # Outreach Settings
  outreach:
    auto_enroll: true
    require_approval: false  # ⚠️ Set to true for semi-autonomous
    daily_enrollment_limit: 50
    template_selection: "auto"  # AI selects based on pain point

  # Monitoring Settings
  monitoring:
    check_interval_hours: 2
    auto_route_replies: true
    auto_create_tasks: true

  # Safety Limits
  safety:
    max_daily_sends: 200
    max_linkedin_connections: 30
    pause_on_bounce_rate: 0.05  # Pause if >5% bounce rate
```

**⚠️ IMPORTANT**: Start with `require_approval: true` for the first week to review before enabling full autonomy.

---

## Verification

### 1. Health Check

In Claude Code:

```
/sales-diagnose
```

Expected output:
```
✅ HubSpot: Connected (120,000 API calls remaining)
✅ Lemlist: Connected (42 campaigns, 1,234 leads)
✅ Explorium: Connected (8,432 credits remaining)
✅ ICP Profiles: 2 loaded
✅ Email Templates: 3 loaded
✅ Database: Initialized (5 tables)
✅ Workers: All operational
```

### 2. Test Discovery

```
/sales-discover

# Select:
# - ICP Profile: icp_psp_treasury
# - Count: 10 (small test)
# - Min Score: 0.75
```

Expected: Discover 10 companies with ICP scores displayed.

### 3. Test Enrichment

```
/sales-enrich

# Provide a test contact:
# Email: test@example.com
# Company Domain: example.com
```

Expected: Enriched data with quality score and intelligence.

### 4. Test CRM Sync

```
/sales-sync

# Use enriched contact from previous step
```

Expected: Contact created in HubSpot with custom properties.

### 5. Test Outreach (Dry Run)

```
/sales-outreach --dry-run

# Select:
# - Campaign: Test Campaign
# - Contacts: [enriched contacts]
```

Expected: Preview of personalized emails, no actual enrollment.

---

## Deployment Modes

### Mode 1: Claude Code Plugin (Interactive)

**Use Case**: Interactive workflows, manual approval, testing.

**Start**:
- Open project in Claude Code
- Plugin auto-starts with MCP servers
- Use slash commands: `/sales-discover`, `/sales-enrich`, etc.

**Advantages**:
- Interactive UI
- Manual approval gates
- Real-time feedback
- Easy debugging

### Mode 2: API Server (Headless Autonomous)

**Use Case**: Production automation, YOLO mode, scheduled jobs.

**Start**:

```bash
# Standard mode
npm run api-server

# YOLO mode (fully autonomous)
npm run api-server:yolo

# Custom port
npm run api-server -- --port 3000

# With PM2 (production)
pm2 start mcp-server/src/api-server.js --name sales-automation
```

**API Endpoints**:

```bash
# Health check
curl http://localhost:3000/health

# Start discovery
curl -X POST http://localhost:3000/api/discover \
  -H "Content-Type: application/json" \
  -d '{"icpProfileName": "icp_psp_treasury", "count": 50}'

# Get YOLO status
curl http://localhost:3000/api/yolo/status

# WebSocket (real-time updates)
wscat -c ws://localhost:3000
```

**Dashboard**:
- Open http://localhost:3000/dashboard in browser
- View real-time job progress
- Monitor campaign performance
- Check system health

**Advantages**:
- Fully autonomous operation
- Scheduled jobs (cron)
- REST API for integrations
- WebSocket for real-time updates
- Scalable (can run on server)

---

## Troubleshooting

### Issue: MCP Servers Not Starting

**Symptoms**: Error messages about MCP server connections.

**Solutions**:

1. Check Node.js version:
   ```bash
   node --version  # Must be >= 18.0.0
   ```

2. Reinstall dependencies:
   ```bash
   cd mcp-server
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Check environment variables:
   ```bash
   echo $HUBSPOT_API_KEY
   echo $LEMLIST_API_KEY
   echo $EXPLORIUM_API_KEY
   ```

4. Check MCP server logs:
   ```bash
   tail -f .sales-automation/logs/mcp-server.log
   ```

### Issue: API Key Invalid

**Symptoms**: "Unauthorized" or "Invalid API key" errors.

**Solutions**:

1. Verify API key in dashboard:
   - HubSpot: Settings → Integrations → Private Apps
   - Lemlist: Settings → Integrations → API
   - Explorium: Contact support

2. Check environment variable:
   ```bash
   echo $HUBSPOT_API_KEY | head -c 20  # Should show: pat-na1-xxxxx
   ```

3. Reload environment:
   ```bash
   source ~/.bashrc
   # OR restart Claude Code
   ```

### Issue: Rate Limit Exceeded

**Symptoms**: "Rate limit exceeded" errors, slow execution.

**Solutions**:

1. Check rate limiter status:
   ```
   /sales-diagnose
   ```

2. Reduce batch sizes in config:
   ```yaml
   enrichment:
     batch_size: 25  # Reduce from 50
   ```

3. Add delays between batches (in `.sales-automation/yolo-config.yaml`):
   ```yaml
   enrichment:
     batch_delay_seconds: 5
   ```

### Issue: Low Data Quality Scores

**Symptoms**: Most contacts have quality scores < 0.70.

**Solutions**:

1. Check Explorium credits:
   ```
   /sales-diagnose
   ```

2. Improve ICP targeting (more specific criteria = better data):
   ```yaml
   employees:
     min: 100  # Was: 50
     max: 1000  # Was: 5000
   ```

3. Add technology filters (companies using specific tech have better data):
   ```yaml
   technologies:
     - "Stripe"
     - "AWS"
   ```

### Issue: Low Reply Rates

**Symptoms**: < 3% reply rate after 100+ sends.

**Solutions**:

1. Review email templates:
   - Too salesy? Make more consultative
   - Generic? Add more personalization variables
   - Weak CTA? Make clear ask (15-min call, not demo)

2. Check personalization quality:
   ```
   /sales-enrich --test
   # Review generated personalization hooks
   ```

3. A/B test subject lines:
   ```yaml
   emails:
     - subject: "{{firstName}}, quick question about {{companyName}} treasury"
     - subject: "Treasury automation for {{companyName}}"
     # Test which performs better
   ```

4. Analyze campaign performance:
   ```
   /sales-monitor

   # Review suggestions from campaign analyzer
   ```

### Issue: High Bounce Rate

**Symptoms**: > 5% email bounce rate.

**Solutions**:

1. Improve email verification:
   ```yaml
   enrichment:
     require_email_verified: true
   ```

2. Check discovery quality:
   ```
   /sales-discover --validate-emails
   ```

3. Update ICP to focus on companies with better email data:
   ```yaml
   employees:
     min: 200  # Larger companies = better data quality
   ```

### Issue: YOLO Mode Not Running

**Symptoms**: No automated discovery/outreach happening.

**Solutions**:

1. Check YOLO configuration:
   ```bash
   cat .sales-automation/yolo-config.yaml
   # Ensure enabled: true
   ```

2. Check cron job schedule:
   ```bash
   # Verify cron syntax
   # "0 8 * * *" = Daily at 8am UTC
   # Adjust timezone if needed
   ```

3. Check API server logs:
   ```bash
   pm2 logs sales-automation
   # OR
   tail -f .sales-automation/logs/api-server.log
   ```

4. Manually trigger YOLO cycle:
   ```bash
   curl -X POST http://localhost:3000/api/yolo/trigger
   ```

---

## Next Steps

1. **Test Workflows**: Run `/sales-discover`, `/sales-enrich`, `/sales-sync` with test data
2. **Configure ICPs**: Customize ICP profiles in `.sales-automation/icp-profiles.yaml`
3. **Create Templates**: Customize email templates in `.sales-automation/templates.yaml`
4. **Enable YOLO Mode**: Start with `require_approval: true`, then go full autonomous
5. **Monitor Performance**: Check `/sales-monitor` daily, optimize campaigns

---

## Documentation

- **[INTEGRATIONS.md](./INTEGRATIONS.md)** - Complete integration guide
- **[CLAUDE.md](./CLAUDE.md)** - Technical architecture for AI agents
- **[RTGS_QUICKSTART.md](./RTGS_QUICKSTART.md)** - RTGS.global-specific workflows
- **[README.md](./README.md)** - Plugin overview

---

## Support

**Issues**: https://github.com/your-org/sales-automation-suite/issues

**Documentation**: All documentation files in project root

**Logs**: `.sales-automation/logs/` directory

---

**Ready to automate your sales?** Start with `/sales-discover` and work through the workflow! 🚀
