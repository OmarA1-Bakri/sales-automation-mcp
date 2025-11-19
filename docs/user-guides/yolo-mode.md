# YOLO Mode User Guide

**YOLO (You Only Live Once) Mode** - Fully autonomous sales automation from discovery to outreach.

---

## Overview

YOLO Mode transforms your sales automation from manual to fully autonomous. Once configured and enabled, the system automatically:

1. **Discovers** new prospects matching your ICP profiles
2. **Enriches** contacts with company and personal data
3. **Syncs** to your HubSpot CRM with intelligence
4. **Enrolls** qualified contacts in email campaigns
5. **Monitors** replies and routes to your sales team

**Zero manual intervention required** - the system runs 24/7 within your configured safety limits.

---

## How YOLO Mode Works

### The Autonomous Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    YOLO Autonomous Cycle                    │
└─────────────────────────────────────────────────────────────┘

1. DISCOVERY (Scheduled: Daily at 9 AM)
   ↓
   Find companies matching active ICP profiles
   Score: Fit (35%) + Intent (35%) + Reachability (20%) + Freshness (10%)
   Quality Gate: ICP Score ≥ 0.75
   ↓

2. CONTACT SEARCH (Automatic)
   ↓
   Find contacts at discovered companies
   Target: Primary titles (Head of Treasury, VP Treasury, etc.)
   Fallback: Secondary titles (CFO, Head of Operations, etc.)
   Quality Gate: Contact Score ≥ 0.65
   ↓

3. ENRICHMENT (Automatic)
   ↓
   Enrich company (firmographics, tech stack, signals)
   Enrich contact (email verification, LinkedIn, phone)
   Generate intelligence (pain points, hooks, "why now")
   Quality Gate: Data Quality ≥ 0.70
   ↓

4. CRM SYNC (Automatic)
   ↓
   Check for duplicates in HubSpot
   Create/update contacts and companies
   Associate contact to company
   Log enrichment activity to timeline
   Quality Gate: Email verified = true
   ↓

5. CAMPAIGN ENROLLMENT (Automatic)
   ↓
   Select campaign based on ICP profile
   Generate personalization variables
   Enroll in Lemlist sequence
   Enrich LinkedIn profile (optional)
   Safety Limit: 200 emails/day max
   ↓

6. REPLY MONITORING (Continuous)
   ↓
   Check for email replies every 2 hours
   Classify sentiment (positive/negative/neutral)
   Create high-priority tasks for positive replies
   Process unsubscribe requests
   Update contact lifecycle stages
```

### Quality Gates

Each step has **quality gates** to ensure only qualified prospects proceed:

| Stage | Quality Gate | Threshold | Action if Below |
|-------|-------------|-----------|-----------------|
| Discovery | ICP Score | ≥ 0.75 | Skip |
| Contact Search | Contact Score | ≥ 0.65 | Try secondary titles |
| Enrichment | Data Quality | ≥ 0.70 | Re-queue for retry |
| CRM Sync | Email Verified | = true | Skip enrollment |
| Enrollment | Not in active sequence | N/A | Skip |

### Safety Limits

**Daily Caps** (configurable):
- Discovery: 50 new companies/day (default)
- Enrichment: 50 contacts/day (API quota protection)
- Outreach: 200 emails/day (spam prevention)
- LinkedIn: 30 connections/day (account safety)

**Rate Limits**:
- Explorium: 50 requests/minute
- HubSpot: 100 requests/10 seconds
- Lemlist: 100 requests/minute

**Bounce Rate Monitor**:
- If bounce rate > 5%: Emergency stop triggered
- Review email list quality
- Check email verification process

---

## Configuration

### Step 1: Create ICP Profiles

Before enabling YOLO mode, define at least one ICP profile:

1. Navigate to **ICP Profiles** view
2. Click "Create Profile"
3. **Enter Basic Info**:
   ```
   Name: PSP Treasury Leaders
   Description: Treasury heads at global PSPs
   Tier: Core
   ```

4. **Set Firmographics**:
   ```
   Company Size: 10-2000 employees
   Industries: Payment Service Provider, PSP, Fintech
   Revenue: $5M - $500M
   Geographies: UK, Germany, Singapore, Hong Kong, UAE
   ```

5. **Define Target Titles**:
   ```
   Primary: Head of Treasury, VP Treasury, Treasury Director
   Secondary: CFO, Head of Operations, VP Operations
   ```

6. **Set Scoring Thresholds**:
   ```
   Auto-Approve: 0.75 (green zone)
   Review Required: 0.60 (amber zone)
   Disqualify: 0.45 (red zone)
   ```

7. **Save & Activate** profile

**Recommendation**: Start with 1-2 highly specific profiles for better results.

### Step 2: Configure API Keys

Ensure all required integrations are configured:

1. Navigate to **Settings** view
2. **Required**:
   - HubSpot API Key (CRM sync)
   - Lemlist API Key (outreach)
3. **Optional**:
   - Explorium API Key (enrichment - highly recommended)
   - Anthropic API Key (AI chat assistant)
4. Test each connection

**Note**: YOLO mode requires at minimum HubSpot + Lemlist to function.

### Step 3: Configure YOLO Settings

1. Navigate to **Dashboard**
2. Click "Configure YOLO" button
3. **Set Discovery Schedule**:
   ```
   Cron Expression: "0 9 * * *"  (Daily at 9 AM)
   Time Zone: UTC

   Common Schedules:
   - "0 9 * * *"    - Daily at 9 AM
   - "0 9 * * 1-5"  - Weekdays at 9 AM
   - "0 */6 * * *"  - Every 6 hours
   - "0 9,15 * * *" - 9 AM and 3 PM daily
   ```

4. **Set Daily Limits**:
   ```
   Discovery: 50 companies/day (start conservative)
   Enrichment: 50 contacts/day (API quota protection)
   Outreach: 200 emails/day (maximum safe limit)
   ```

5. **Quality Thresholds**:
   ```
   Min ICP Score: 0.75 (only high-quality matches)
   Min Data Quality: 0.70 (good enrichment required)
   Email Verification: Required
   ```

6. **Enable Workflows**:
   - ✅ Discovery
   - ✅ Enrichment
   - ✅ CRM Sync
   - ✅ Campaign Enrollment
   - ✅ Reply Monitoring

7. **Test Mode** (Recommended First):
   - ✅ Enable Test Mode
   - Runs full pipeline but doesn't enroll in campaigns
   - Perfect for validating configuration
   - Disable after 1-2 successful test cycles

8. Click "Save Configuration"

---

## Enabling YOLO Mode

### First-Time Activation

**Recommended Approach** - Test Mode:

1. Configure YOLO settings (above)
2. Enable "Test Mode" checkbox
3. Click "Enable YOLO Mode"
4. Monitor Dashboard for 24 hours
5. Review discovered/enriched contacts
6. If results look good:
   - Click "Configure YOLO"
   - Disable "Test Mode"
   - Click "Save Configuration"
7. YOLO now enrolls in campaigns

**Production Activation**:

1. Verify ICP profiles configured and active
2. Verify API keys tested and working
3. Configure YOLO settings (see above)
4. Click "Enable YOLO Mode" button
5. Confirm in modal dialog
6. Status changes to 🟢 "Running"

### Monitoring Active YOLO Mode

**Dashboard Indicators**:
- 🟢 **Running**: Autonomous cycles executing
- 🟡 **Paused**: Temporarily halted (manual or safety trigger)
- 🔴 **Stopped**: Manually stopped
- ⚪ **Disabled**: Not active

**Activity Feed**:
Real-time updates showing:
- Discovery jobs (companies found)
- Enrichment jobs (contacts enriched)
- Sync jobs (HubSpot updates)
- Enrollment jobs (campaign additions)
- Reply jobs (responses detected)

**Metrics to Watch**:
- Discovered count (should match daily limit)
- ICP score distribution (should be >0.75)
- Data quality scores (should be >0.70)
- Enrollment success rate (should be >90%)
- Bounce rate (should be <5%)

---

## Controlling YOLO Mode

### Pause/Resume

**When to Pause**:
- Taking vacation (no one to monitor replies)
- Testing new ICP profiles
- Investigating quality issues
- Approaching API quota limits
- End of month (budget concerns)

**How to Pause**:
1. Navigate to Dashboard
2. Click "Pause YOLO" button
3. Current cycle finishes, then pauses
4. Status changes to 🟡 "Paused"

**How to Resume**:
1. Click "Resume YOLO" button
2. Next scheduled cycle executes
3. Status returns to 🟢 "Running"

**Note**: Paused YOLO does NOT process scheduled cycles but continues reply monitoring.

### Emergency Stop

**When to Use**:
- Bounce rate suddenly spikes
- Spam complaints received
- Incorrect ICP profile activated
- API quota exhausted
- Data quality issues detected

**How to Emergency Stop**:
1. Navigate to Dashboard
2. Click "Emergency Stop" button (red)
3. Confirm in modal
4. All activity immediately halts:
   - All active Lemlist campaigns paused
   - Pending jobs cancelled
   - YOLO mode disabled

**After Emergency Stop**:
1. Investigate root cause
2. Review recent activity in logs
3. Check bounce rates in campaigns
4. Verify data quality of recent contacts
5. Fix issues identified
6. Manually resume when ready

### Disable YOLO Mode

**Difference from Pause**:
- **Pause**: Temporary halt, easy to resume
- **Disable**: Full shutdown, requires reconfiguration

**How to Disable**:
1. Navigate to Dashboard
2. Click "Disable YOLO" button
3. Confirm in modal
4. All scheduled jobs stopped
5. Configuration preserved (can re-enable anytime)

---

## YOLO Activity Monitoring

### Activity Log

View detailed activity in **Dashboard**:

**Activity Types**:

1. **Discovery** 🔍
   - Companies searched: X
   - ICP matches found: Y
   - Avg ICP score: 0.XX
   - Timestamp

2. **Enrichment** ⚡
   - Contacts enriched: X
   - Data sources: Explorium, Apollo
   - Avg quality score: 0.XX
   - Failed enrichments: Y
   - Timestamp

3. **CRM Sync** 🔄
   - Contacts created: X
   - Contacts updated: Y
   - Companies created: Z
   - Duplicates skipped: N
   - Timestamp

4. **Outreach** 📧
   - Contacts enrolled: X
   - Campaign: Campaign Name
   - Personalization success: Y/X
   - Timestamp

5. **Replies** 💬
   - Replies detected: X
   - Positive: Y (task created)
   - Negative: Z (unsubscribed)
   - Neutral: N (logged)
   - Timestamp

### Job Queue Status

View real-time job status:

**Job States**:
- ⏳ **Pending**: Waiting in queue
- ⚙️ **Processing**: Currently executing
- ✅ **Completed**: Successfully finished
- ❌ **Failed**: Error occurred
- 🚫 **Cancelled**: Manually stopped

**Queue Stats** (in Dashboard):
- Total jobs: X
- Pending: Y
- Processing: Z
- Completed today: N
- Failed today: M

**Job Details** (click to expand):
- Job ID
- Type (discovery, enrichment, etc.)
- Parameters
- Status
- Progress (%)
- Started at
- Completed at
- Result summary
- Error message (if failed)

---

## Performance Optimization

### Improving Discovery Quality

**Low Match Rate** (< 20 companies/day):

**Causes**:
- ICP criteria too narrow
- Target industries too specific
- Geographic restrictions too tight

**Solutions**:
1. Broaden industry keywords
2. Expand geography to adjacent regions
3. Widen company size range
4. Add secondary industries
5. Test scoring thresholds (lower to 0.70)

**High Match, Low Quality**:

**Causes**:
- ICP criteria too broad
- Scoring weights incorrect
- Intent signals not prioritized

**Solutions**:
1. Tighten firmographic criteria
2. Increase ICP score threshold to 0.80
3. Add technology stack requirements
4. Focus on intent signals (funding, expansion)
5. Review discovered companies manually

### Improving Enrichment Quality

**Low Quality Scores** (< 0.70):

**Causes**:
- Poor source data (bad emails)
- API limitations (Explorium credits)
- Contact info not public

**Solutions**:
1. Improve discovery source quality
2. Verify emails before enrichment
3. Use multiple data sources (Apollo + Explorium)
4. Increase quality threshold to 0.75
5. Manual research for key accounts

**High API Costs**:

**Causes**:
- Enriching too many contacts
- Re-enriching same contacts
- Not using cache effectively

**Solutions**:
1. Lower daily enrichment limit
2. Enable 30-day cache
3. Skip enrichment for existing HubSpot contacts
4. Filter by ICP score before enriching
5. Prioritize high-value prospects only

### Improving Campaign Performance

**Low Open Rates** (< 30%):

**Causes**:
- Poor subject lines
- Spam-triggering content
- Wrong send times
- Poor sender reputation

**Solutions**:
1. A/B test subject lines
2. Avoid spam words ("free", "guaranteed")
3. Send 8-10 AM in recipient timezone
4. Warm up domain if new
5. Personalize subject with {{company}} or {{pain}}

**Low Reply Rates** (< 5%):

**Causes**:
- Generic messaging
- Poor targeting
- Weak value proposition
- Too sales-y tone

**Solutions**:
1. Increase personalization (use intelligence hooks)
2. Tighten ICP targeting (higher scores)
3. Lead with insight, not pitch
4. Shorten emails (< 100 words)
5. Clear, low-friction CTA

**High Bounce Rates** (> 5%):

**Causes**:
- Email verification not working
- Outdated contact data
- Spam trap emails
- Incorrect email formats

**Solutions**:
1. Enable email verification in enrichment
2. Remove bounced emails from list
3. Use double opt-in for manual imports
4. Clean list quarterly
5. Emergency stop if > 10% bounce rate

---

## Safety & Compliance

### Email Deliverability

**Best Practices**:
- **Warm Up**: New domains send 10-20/day for 2 weeks
- **Daily Limit**: Never exceed 200 emails/day
- **Bounce Rate**: Keep < 3% (emergency stop at 5%)
- **Spam Reports**: Zero tolerance (pause immediately)
- **Unsubscribe**: Always honor within 24 hours

**Monitoring**:
1. Check Lemlist bounce/spam rates daily
2. Review unsubscribe requests weekly
3. Monitor sender reputation (Google Postmaster, etc.)
4. Maintain suppression list
5. Use dedicated domain for cold email

### Data Privacy (GDPR/CCPA)

**Compliance Requirements**:
- ✅ **Legitimate Interest**: B2B prospecting allowed in EU
- ✅ **Opt-Out**: Unsubscribe link in every email
- ✅ **Data Minimization**: Only collect necessary data
- ✅ **Storage Limits**: Delete after 90 days inactive
- ✅ **Right to Erasure**: Honor deletion requests

**YOLO Mode Compliance**:
- Automatic unsubscribe processing
- Data retention policies enforced
- No sensitive data collected
- All data stored locally (not cloud)
- Audit trail in database

### Account Safety

**HubSpot**:
- Respect 100 req/10sec rate limit
- Use batch APIs (100 objects/request)
- Don't exceed daily quota (150K requests/day)
- Test API key monthly for permission changes

**Lemlist**:
- Stay under plan limits (varies by tier)
- Don't send from personal email
- Use authenticated domains only
- Monitor deliverability daily

**Explorium**:
- Track credit usage (dashboard or API)
- Set alerts at 80% consumed
- Cache aggressively (30-day TTL)
- Don't enrich duplicate records

---

## Troubleshooting YOLO Mode

### YOLO Won't Start

**Symptoms**: "Enable YOLO" button does nothing

**Checks**:
1. At least 1 ICP profile active?
2. HubSpot + Lemlist API keys configured?
3. YOLO configuration saved?
4. Check browser console for errors
5. Check `/logs/mcp-server.log` for errors

**Solutions**:
- Activate an ICP profile
- Test API connections in Settings
- Reconfigure and save YOLO settings
- Restart app: `./stop.sh && ./rtgs-sales-automation.sh`

### No Discovery Results

**Symptoms**: Discovery job completes but 0 companies found

**Checks**:
1. ICP criteria too narrow?
2. Geographic restrictions too tight?
3. Explorium API key configured?
4. Explorium credits available?
5. Network connectivity?

**Solutions**:
- Test ICP profile with "Test Scoring"
- Broaden firmographic criteria
- Check Explorium API status
- Review discovery job logs
- Try manual discovery first

### Enrichment Failing

**Symptoms**: Contacts stuck in "Imported" status

**Checks**:
1. Explorium API key valid?
2. API credits remaining?
3. Email addresses valid format?
4. Rate limit exceeded?
5. Job queue backed up?

**Solutions**:
- Verify Explorium connection in Settings
- Check credit balance
- Validate email formats
- Wait for rate limit reset (1 minute)
- Check job queue status in Dashboard

### Sync Not Working

**Symptoms**: Contacts not appearing in HubSpot

**Checks**:
1. HubSpot API key valid?
2. API key has crm.objects.contacts.write permission?
3. Duplicates being skipped?
4. Required fields missing?
5. HubSpot rate limit?

**Solutions**:
- Test HubSpot connection
- Regenerate API key with proper scopes
- Check HubSpot for existing records
- Verify email field exists
- Wait for rate limit reset (10 seconds)

### Campaigns Not Enrolling

**Symptoms**: Contacts enriched/synced but not in Lemlist

**Checks**:
1. Campaign exists in Lemlist?
2. Campaign is active (not paused)?
3. Lemlist API key valid?
4. Contact already in campaign?
5. Daily send limit reached?

**Solutions**:
- Verify campaign in Lemlist dashboard
- Resume paused campaigns
- Test Lemlist connection
- Check for duplicates
- Check daily limit in YOLO config

### High Bounce Rate

**Symptoms**: >5% bounce rate triggers emergency stop

**Causes**:
- Email verification not enabled
- Poor quality contact data
- Purchased email lists (never do this)
- Spam trap addresses

**Solutions**:
1. Enable email verification in enrichment settings
2. Review data sources (Explorium vs. Apollo)
3. Clean contact list (remove bounced)
4. Test with small batch (10 contacts) first
5. Use double opt-in for manual imports

---

## Best Practices

### Starting Out

**Week 1 - Test Mode**:
- Configure 1 tight ICP profile
- Enable test mode
- Set limit: 10 companies/day
- Run for 7 days
- Review results daily
- Don't enroll in campaigns yet

**Week 2 - Limited Production**:
- Disable test mode
- Increase to 20 companies/day
- Create 1 simple email sequence (2 emails)
- Enroll best prospects only (ICP > 0.80)
- Monitor open/reply rates
- Adjust based on feedback

**Week 3-4 - Scale Up**:
- Increase to 50 companies/day
- Add 2nd ICP profile
- Expand email sequence (3-4 emails)
- Lower ICP threshold to 0.75
- Optimize based on metrics
- Consider adding secondary titles

### Ongoing Operations

**Daily** (5 minutes):
- Check Dashboard activity feed
- Review bounce/spam rates in Lemlist
- Respond to positive replies

**Weekly** (30 minutes):
- Review campaign performance
- Analyze ICP score distribution
- Check API credit usage
- Update ICP profiles based on learnings
- Export contact data (backup)

**Monthly** (2 hours):
- Full performance review
- A/B test new email sequences
- Audit data quality
- Clean database (remove old jobs)
- Update documentation

### Scaling YOLO Mode

**From 50 to 100 prospects/day**:
- Proven reply rate > 8%
- Bounce rate < 3%
- Data quality > 0.75 average
- 2+ ICP profiles active
- 90+ days experience

**From 100 to 200 prospects/day**:
- Reply rate > 10%
- Bounce rate < 2%
- Team to handle replies
- Dedicated email domain
- 180+ days experience

**At Scale (200+/day)**:
- Multiple team members
- Dedicated infrastructure
- Advanced personalization
- Multi-channel (email + LinkedIn)
- Full-time monitoring

---

## Advanced Configuration

### Custom Cron Schedules

**Examples**:

```
# Every day at 9 AM
0 9 * * *

# Weekdays only at 9 AM
0 9 * * 1-5

# Twice daily (9 AM and 2 PM)
0 9,14 * * *

# Every 6 hours
0 */6 * * *

# First day of month at 8 AM
0 8 1 * *

# Monday and Thursday at 10 AM
0 10 * * 1,4
```

**Cron Format**:
```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, 0 & 7 = Sunday)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

### Multiple ICP Profiles

**Strategy**:
1. **Core Tier** - Best fit, high priority
   - Tight criteria
   - High thresholds (0.80+)
   - Daily priority

2. **Growth Tier** - Good fit, scale
   - Moderate criteria
   - Standard thresholds (0.75+)
   - Alternate days

3. **Strategic Tier** - Specific targets
   - Narrow criteria
   - Very high thresholds (0.85+)
   - Weekly or manual

**Rotation**:
- Monday: Core tier
- Tuesday: Growth tier
- Wednesday: Core tier
- Thursday: Strategic tier
- Friday: Core tier

### Campaign Mapping

**By ICP Profile**:
```
ICP Profile → Campaign Mapping:
- PSP Treasury Leaders → Campaign: Treasury Pain Points
- Fintech Growth → Campaign: Scaling Challenges
- E-commerce High Volume → Campaign: Payment Efficiency
```

**By Pain Point**:
```
Intelligence "Why Now" → Campaign:
- Recent funding → Campaign: Growth Infrastructure
- Geographic expansion → Campaign: Multi-Currency
- Hiring spike → Campaign: Team Scaling
```

**By Seniority**:
```
Title Level → Campaign:
- C-Level → Campaign: Strategic (short, high-level)
- VP/Director → Campaign: Tactical (detailed, ROI)
- Manager → Campaign: Operational (features, ease)
```

---

## Metrics & KPIs

### Discovery Metrics

| Metric | Target | Good | Poor |
|--------|--------|------|------|
| Companies Found/Day | 50 | 40-60 | < 30 |
| Avg ICP Score | 0.78 | > 0.75 | < 0.70 |
| Intent Signals | 40% | > 30% | < 20% |
| Geo Distribution | Even | Balanced | Heavily skewed |

### Enrichment Metrics

| Metric | Target | Good | Poor |
|--------|--------|------|------|
| Success Rate | 95% | > 90% | < 85% |
| Avg Quality Score | 0.80 | > 0.75 | < 0.70 |
| Email Verified | 100% | > 95% | < 90% |
| LinkedIn Found | 70% | > 60% | < 50% |

### CRM Sync Metrics

| Metric | Target | Good | Poor |
|--------|--------|------|------|
| Success Rate | 98% | > 95% | < 90% |
| Duplicates Skipped | 10% | 5-15% | > 30% |
| Avg Sync Time | < 3s | < 5s | > 10s |
| Association Rate | 100% | > 98% | < 95% |

### Outreach Metrics

| Metric | Target | Good | Poor |
|--------|--------|------|------|
| Enrollment Rate | 95% | > 90% | < 85% |
| Open Rate | 50% | > 40% | < 30% |
| Click Rate | 15% | > 10% | < 7% |
| Reply Rate | 10% | > 7% | < 5% |
| Bounce Rate | 2% | < 3% | > 5% |
| Positive Reply Rate | 70% | > 60% | < 50% |

---

## Next Steps

Now that you understand YOLO mode:

1. **Configure**: Set up your first ICP profile
2. **Test**: Run in test mode for 1 week
3. **Launch**: Enable production with conservative limits
4. **Monitor**: Check daily metrics
5. **Optimize**: Iterate based on performance

**Related Guides**:
- [Desktop App Guide](desktop-app.md) - UI walkthrough
- [RTGS Quickstart](rtgs-quickstart.md) - RTGS workflows
- [Integration Details](../technical/integrations.md) - API deep dive

---

**Questions?** Use the AI Assistant in the app - it knows all about YOLO mode!
