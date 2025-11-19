# RTGS.global - Sales Automation Quick Start Guide

This guide will help you get the RTGS.global sales automation plugin running quickly.

## 📋 What You've Got

✅ **Custom ICP Configuration** (`config/rtgs-global-icp.yaml`)
- 3 ICP profiles: PSP Treasury Leaders, Fintech Treasury Operators, Financial Institutions
- Optimized for CEMEA & APAC regions
- Scoring weighted toward Treasury titles (primary stakeholder)
- Intent signals for expansion, funding, regulatory changes

✅ **Custom Email Templates** (`config/rtgs-global-templates.yaml`)
- 7 email templates mapped to RTGS.global pain points
- LinkedIn messaging templates (via lemlist integration)
- Multi-channel sequences (email + LinkedIn)
- A/B testing configuration for optimization

## 🚀 Quick Setup (5 minutes)

### 1. Install and Launch

```bash
# One-command install
./install.sh

# Launch the desktop app
./rtgs-sales-automation.sh
```

Open http://localhost:5173 in your browser.

### 2. Configure API Keys (Settings View)

Click ⚙️ **Settings** in the sidebar:

1. **HubSpot CRM**:
   - Enter your Private App Access Token
   - Click "Test Connection"

2. **Lemlist Outreach**:
   - Enter your API Key
   - Click "Test Connection"

3. **Explorium Enrichment** (optional):
   - Enter your API Key
   - Enables advanced firmographic data

4. **Claude AI Chat**:
   - Enter your Anthropic API Key
   - Powers the AI assistant

5. Click **"Save All Settings"**

### 3. Load RTGS ICP Profiles (ICP Profiles View)

Click 🎯 **ICP Profiles** in the sidebar:

**Option A - Manual Creation**:
1. Click "+ New Profile"
2. Create each of the 3 RTGS profiles:
   - PSP Treasury Leaders
   - Fintech Treasury Operators
   - Financial Institutions

**Option B - Import from YAML**:
```bash
# Copy RTGS-specific ICP profiles
cp config/rtgs-global-icp.yaml .sales-automation/icp-profiles.yaml

# Copy email templates
cp config/rtgs-global-templates.yaml .sales-automation/templates.yaml

# Restart app to load profiles
./stop.sh && ./rtgs-sales-automation.sh
```

### 4. Configure lemlist for LinkedIn Integration

In your lemlist account:
1. Go to **Settings → Integrations**
2. Connect your **LinkedIn account**
3. Enable **LinkedIn automation**
4. Set daily limits: 30 connection requests/day

The system will automatically use lemlist's LinkedIn integration for:
- Sending connection requests
- Sending messages after connection acceptance
- Coordinating multi-channel sequences (email + LinkedIn)

### 5. Test the System (Dashboard)

Click 📊 **Dashboard**:

1. Verify all metrics cards show data
2. Check YOLO Mode Control Panel appears
3. Confirm API connections in Settings are "Connected"

**You're ready!** Proceed to workflows below.

## 🎯 RTGS.global-Specific Workflows

### Workflow 1: Automated Discovery with YOLO Mode (Recommended)

**Best for**: Ongoing prospecting at scale

Click 📊 **Dashboard** and enable YOLO Mode:

1. **Configure YOLO Settings**:
   - Schedule: "0 9 * * *" (daily at 9 AM)
   - Daily discovery limit: 50 companies
   - Active ICP: "PSP Treasury Leaders"
   - Geography filter: CEMEA (UK, Germany, UAE, etc.)

2. **Enable YOLO Mode**:
   - Click blue "Enable YOLO" button
   - Status indicator turns green 🟢

3. **What Happens Automatically**:
   - Discovers PSPs matching ICP (100-500 employees, CEMEA)
   - Finds treasury leaders at discovered companies
   - Applies ICP scoring (fit × intent × reachability)
   - Enriches with Explorium (firmographics, signals)
   - Generates pain hypotheses (liquidity, licensing, etc.)
   - Syncs to HubSpot with intelligence
   - Enrolls in appropriate lemlist campaign

4. **Monitor Progress**:
   - Dashboard activity feed shows real-time updates
   - Metrics cards update automatically
   - Check Contacts view for newly discovered leads

**Time**: Runs autonomously daily. Set it and forget it!

### Workflow 2: Manual Discovery and Enrichment

**Best for**: Testing or one-off campaigns

#### Step 1: Import Target Accounts (Import View)

Click 📥 **Import**:

1. **Upload CSV** with PSP targets:
   ```csv
   company_name,domain,country
   Stripe,stripe.com,UK
   Adyen,adyen.com,Netherlands
   WorldPay,worldpay.com,UK
   ```

2. Map fields and enable **"Auto-enrich after import"**

3. Click **"Import Contacts"**

#### Step 2: Filter and Enrich (Contacts View)

Click 👥 **Contacts**:

1. **Filter** by:
   - Source: "CSV"
   - Status: "Imported"
   - ICP Score: > 0.75 (treasury leaders only)

2. **Select contacts** matching "PSP Treasury Leaders" profile

3. Click **"Enrich Selected"** button:
   - Enriches via Explorium (firmographics, tech stack, signals)
   - Generates pain hypotheses (liquidity management, etc.)
   - Creates personalization hooks (funding, expansion)
   - Calculates quality scores

4. **Review Results**:
   - Status changes to "Enriched"
   - Data quality score shown (aim for ≥ 0.70)
   - Click contact row to see full enrichment data

**Time**: ~5-10 minutes for 50 contacts

#### Step 3: Sync to HubSpot (Contacts View)

Still in 👥 **Contacts**:

1. **Filter** by:
   - Status: "Enriched"
   - Data Quality: ≥ 0.70

2. **Select contacts** to sync

3. Click **"Sync to HubSpot"** button:
   - Creates/updates contacts in HubSpot
   - Creates/updates companies
   - Associates contacts to companies
   - Adds intelligence to custom properties
   - Logs enrichment activity to timeline

4. **Verify** in HubSpot:
   - Check custom properties for pain points
   - Review enrichment notes on timeline

**Time**: ~2-5 minutes for 50 contacts

#### Step 4: Launch Outreach Campaign (Campaigns View or Lemlist)

Click 📧 **Campaigns** to monitor, but enroll via lemlist:

**In Lemlist**:
1. Create campaign with "liquidity_management_hook" template:
   - **Day 0**: Email (liquidity pain point)
   - **Day 2**: LinkedIn connection request (if email opened)
   - **Day 3**: Follow-up email (add value)
   - **Day 5**: LinkedIn message (if connected)
   - **Day 8**: Breakup email

2. **Import contacts** from HubSpot or CSV

3. **Map personalization variables**:
   - `{{firstName}}`, `{{companyName}}`
   - `{{pain_point}}` (from enrichment)
   - `{{personalization_hook}}` (funding, expansion)
   - `{{why_now}}` (urgency trigger)

4. **Start campaign**

**Back in Desktop App** - Click 📧 **Campaigns**:
- Monitor performance in real-time
- View open, click, reply rates
- See email breakdown by sequence step
- Performance color coding:
  - 🟢 Green: Reply rate > 10%
  - 🟡 Amber: Reply rate 5-10%
  - 🔴 Red: Reply rate < 5%

**Time**: ~15 minutes for campaign setup

### Workflow 3: Monitor Performance and Optimize

#### Dashboard View (Daily Check)

Click 📊 **Dashboard**:

1. **Key Metrics Cards**:
   - Total Contacts discovered
   - Active Campaigns running
   - Reply Rate trend
   - YOLO Status

2. **Activity Feed**:
   - Recent discoveries (PSP matches)
   - Enrichments completed
   - Contacts synced to HubSpot
   - Campaign enrollments

3. **Quick Actions**:
   - Pause YOLO if needed
   - Jump to Campaigns view
   - Jump to Contacts view

#### Campaigns View (Weekly Analysis)

Click 📧 **Campaigns**:

1. **View Campaign List**:
   - See all treasury-focused campaigns
   - Check performance color coding

2. **Click Campaign** for details:
   - **Email Breakdown**:
     - Day 0 email: Open rate, click rate
     - Day 3 follow-up: Performance vs Day 0
     - Day 8 breakup: Final conversions
   - **Recent Activity**: Replies, opens, clicks

3. **Identify Winners**:
   - Which pain point gets best replies?
   - Which geography performs better (CEMEA vs APAC)?
   - Which job titles respond most?

4. **Take Action**:
   - Pause underperforming campaigns
   - Scale winning templates
   - Test new subject lines

#### AI Assistant (Get Recommendations)

Click 💬 **AI Assistant**:

Ask questions like:
- "Which pain point is resonating best with PSP treasury leaders?"
- "Should I adjust my ICP score threshold?"
- "How can I improve my email open rate?"
- "What's the best time to follow up after initial email?"

**Time**: 10 minutes daily, 30 minutes weekly analysis

## 📊 RTGS.global ICP Scoring

Your custom scoring formula:

```
Composite Score = (Fit × 0.35) + (Intent × 0.35) + (Reachability × 0.20) + (Freshness × 0.10)
```

**Fit Score Breakdown:**
- Industry match (PSP/Fintech): 35%
- Company size (10-2000): 20%
- Geography (CEMEA/APAC): 15%
- Tech stack (payment platforms): 15%
- Revenue ($5M+): 15%

**Intent Signals (High Value = +0.4):**
- 🎯 Expansion signals: "cross-border", "international", "new corridor"
- 💰 Funding: $10M+ in last 120 days
- 👥 Hiring: 2+ roles in Treasury/Operations/Payments
- 📋 Regulatory: "ISO20022", "license application", "compliance upgrade"
- 🤝 Partnership: "strategic partnership", "payment network"

## 🎨 Pain Point → Template Mapping

| Pain Point | Template | When to Use |
|------------|----------|-------------|
| **Liquidity Management** | `liquidity_management_hook` | Treasury titles, companies 50+ employees |
| **High Costs** | `cost_reduction_hook` | Expansion signals, growing transaction volume |
| **Licensing Barriers** | `expansion_licensing_hook` | Funding received OR expansion signals |
| **Settlement Speed** | `settlement_speed_hook` | Operations titles, customer experience focus |
| **Regulatory** | `regulatory_compliance_hook` | Regulatory signals (ISO20022, compliance mentions) |

## 💡 Pro Tips for RTGS.global Outreach

### 1. Prioritize Treasury Titles
Your ICP data confirms **Treasury is the primary stakeholder** (access to liquidity is main benefit). Always prioritize:
- Head of Treasury
- VP Treasury
- Treasury Director
- Group Treasurer

### 2. Lead with Liquidity Pain
The **#1 pain point** is liquidity management. Most successful template is `liquidity_management_hook`:
- "Inefficient treasury workflows limiting ability to scale"
- "Just-in-time funding" as key value prop
- "Smart liquidity management 24/7"

### 3. Leverage Expansion Signals
When you detect expansion signals, use `expansion_licensing_hook`:
- Funding announcements → "What will you do with fresh capital?"
- New market mentions → "How will you handle licensing in {{region}}?"
- Partnership announcements → "Looking for settlement infrastructure?"

### 4. Multi-Channel Approach (Email + LinkedIn)
lemlist's LinkedIn integration enables:
- **Email first** to establish context
- **LinkedIn connection** if email opened (shows interest)
- **LinkedIn message** after connection (more personal)
- Higher overall engagement vs email-only

### 5. Geographic Segmentation
Different pain points resonate in different regions:

**CEMEA (Europe/Middle East/Africa):**
- Regulatory compliance (ISO20022, MiFID)
- Cost reduction (high correspondent banking fees)
- Expansion into Africa/Middle East

**APAC (Asia-Pacific):**
- Speed (settlement delays more acute)
- Regional expansion (corridor development)
- Cost (high cross-border fees)

## 📈 Expected Performance (Benchmarks)

Based on similar B2B fintech campaigns:

| Metric | Target | Notes |
|--------|--------|-------|
| **ICP Match Rate** | 80%+ | Your ICP is well-defined |
| **Email Open Rate** | 40-50% | Treasury titles have lower volume than sales |
| **Reply Rate** | 8-12% | Highly targeted = better response |
| **LinkedIn Acceptance** | 25-35% | After email contact |
| **Meeting Booking** | 3-5% | Of total outreach |
| **SQL Conversion** | 30-40% | Meetings → qualified opportunities |

## 🔧 Troubleshooting

### Issue: Low ICP match rate (<60%)
**Solution**: Tighten industry filters
```yaml
# In .sales-automation/icp-profiles.yaml
industry:
  include:
    - "Payment Service Provider"
    - "PSP"
    - "Cross-border Payments"
    # Remove generic "Fintech" if too broad
```

### Issue: Low email verification rate
**Solution**: Add domain verification
- Use Apollo's email verification API
- Require company domain match
- Flag generic email providers

### Issue: LinkedIn connection rate low
**Solution**: Improve connection request messaging
- Reference the email you sent
- Mention specific pain point
- Keep under 200 characters

### Issue: Reply rate lower than expected
**Solution**: Test different hooks
- A/B test subject lines
- Try different pain points
- Add more personalization (recent news, mutual connections)

## 📞 Next Steps

1. **Week 1**: Test discovery + enrichment workflows
   - Run `/sales-discover` for 20-30 leads
   - Enrich and validate data quality
   - Review pain hypotheses accuracy

2. **Week 2**: Launch first outreach campaign
   - Start with 50 high-fit treasury leaders
   - Use `liquidity_management_hook` template
   - Monitor daily for first 3 days

3. **Week 3**: Optimize based on data
   - Review reply rate by template
   - Analyze ICP score vs conversion
   - Adjust scoring weights if needed

4. **Week 4**: Scale winning approach
   - Double down on best-performing template
   - Expand to adjacent ICP (fintech treasury)
   - Test APAC vs CEMEA performance

## 🎯 Success Metrics for RTGS.global

Track these KPIs weekly:

- **Leads Discovered**: 100-200/week (target)
- **ICP Match Rate**: 80%+ treasury leaders at PSPs
- **Email Open Rate**: 40%+ (treasury titles)
- **Reply Rate**: 8-12% (highly targeted)
- **LinkedIn Acceptance**: 25-35%
- **Meetings Booked**: 3-5 per 100 outreach
- **SQL Created**: 30-40% of meetings

**Target**: 10-15 qualified meetings per month per SDR.

---

## 📚 Additional Resources

### Configuration Files
- **ICP Profiles**: `.sales-automation/icp-profiles.yaml`
- **Email Templates**: `.sales-automation/templates.yaml`
- **YOLO Configuration**: See [YOLO Mode Guide](yolo-mode.md)

### Documentation
- **Desktop App Guide**: Complete UI walkthrough → [desktop-app.md](desktop-app.md)
- **YOLO Mode Guide**: Autonomous operation → [yolo-mode.md](yolo-mode.md)
- **Quickstart Guide**: General setup → [quickstart.md](quickstart.md)
- **Architecture**: System design → [../technical/architecture.md](../technical/architecture.md)
- **Integrations**: API details → [../technical/integrations.md](../technical/integrations.md)
- **Claude Instructions**: AI agent docs → [../technical/claude-instructions.md](../technical/claude-instructions.md)

### Support

**In-App Help**:
- Click 💬 **AI Assistant** and ask questions
- Examples:
  - "How do I optimize for PSP treasury leaders?"
  - "What's the best pain point for CEMEA region?"
  - "Show me my best-performing campaign"

**Technical Support**:
- Check logs: `tail -f logs/mcp-server.log`
- Review documentation index: [../README.md](../README.md)
- Test integrations in Settings view

---

## 🚀 Getting Started

### Recommended Path for RTGS.global

1. **Day 1**: Setup and Configuration
   - Configure API keys in Settings
   - Load RTGS ICP profiles
   - Test with 10 manual imports

2. **Week 1**: Manual Testing
   - Run Workflow 2 (manual) for 20-50 contacts
   - Review enrichment quality
   - Test one campaign in lemlist
   - Monitor results daily

3. **Week 2**: YOLO Mode Trial
   - Enable YOLO with conservative limits (20/day)
   - Monitor activity feed daily
   - Review discovered leads for accuracy
   - Adjust ICP if needed

4. **Week 3+**: Scale and Optimize
   - Increase YOLO limits (50/day)
   - Enable multiple ICP profiles
   - A/B test email templates
   - Optimize based on reply rates

---

**You're all set!** Open the desktop app (http://localhost:5173) and start with [Workflow 1](#workflow-1-automated-discovery-with-yolo-mode-recommended) for autonomous prospecting! 🚀
