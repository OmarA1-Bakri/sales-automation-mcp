# Sales Automation - YOLO Mode

**Command:** `/sales-yolo`

**Description:** Enable fully autonomous sales automation mode where agents continuously discover, enrich, and engage prospects without manual intervention.

**YOLO = You Only Live Once** - Maximum autonomy, agents make all decisions based on ICP scoring and performance data.

---

## ⚠️ IMPORTANT: Use with Caution

YOLO Mode enables **fully autonomous operation** including:
- ✅ Automatic lead discovery (finds new prospects daily)
- ✅ Automatic enrichment (enriches without approval)
- ✅ Automatic CRM sync (creates HubSpot contacts)
- ✅ **Automatic outreach enrollment** (sends emails + LinkedIn without approval)
- ✅ Automatic campaign optimization (pauses/promotes variants)
- ✅ Automatic follow-up handling (routes replies, creates tasks)

**Before enabling YOLO Mode:**
1. ✅ Test with `/sales-discover`, `/sales-enrich`, `/sales-outreach` first
2. ✅ Verify your ICP profiles are accurate
3. ✅ Review and approve email templates
4. ✅ Set appropriate daily limits
5. ✅ Configure approval thresholds
6. ✅ Review compliance settings

---

## 🎯 How YOLO Mode Works

### Daily Autonomous Cycle

**Every day at 8am (configurable):**

```
1. DISCOVER (30 min)
   → Find 50 new prospects matching ICP
   → Score using composite algorithm
   → Filter: Only contacts scoring >0.75

2. ENRICH (1 hour)
   → Enrich via Explorium (company + contact)
   → Generate pain hypotheses
   → Create personalization hooks
   → Quality gate: Only contacts with >0.70 data quality

3. SYNC CRM (15 min)
   → Create/update HubSpot contacts
   → Deduplicate against existing database
   → Associate with companies
   → Log enrichment intelligence

4. OUTREACH (30 min)
   → Select best template based on pain point
   → Generate personalized variables
   → Enroll in lemlist campaign
   → Start email + LinkedIn sequence

5. MONITOR (continuous)
   → Check for replies every 2 hours
   → Route positive replies to sales team
   → Update HubSpot lifecycle stages
   → Optimize underperforming campaigns
```

**Total autonomy:** ~150-200 new prospects engaged per week

---

## 🎛️ YOLO Mode Configuration

### Enable YOLO Mode

```
/sales-yolo enable
```

**Sales Orchestrator will:**
1. Load YOLO configuration from `.sales-automation/yolo-config.yaml`
2. Validate all API credentials
3. Test ICP profiles and templates
4. Schedule daily automation job
5. Enable continuous monitoring hooks
6. Report: "YOLO Mode enabled. First run scheduled for tomorrow 8am."

### Configure YOLO Parameters

Create `.sales-automation/yolo-config.yaml`:

```yaml
yolo_mode:
  enabled: true

  # Discovery Settings
  discovery:
    schedule: "0 8 * * *"  # Daily at 8am
    leads_per_day: 50
    icp_profiles:
      - icp_rtgs_psp_treasury  # Primary ICP
      - icp_rtgs_fintech_treasury  # Secondary ICP
    min_icp_score: 0.75  # Only high-fit prospects
    geographic_focus: ["CEMEA", "APAC"]

  # Enrichment Settings
  enrichment:
    auto_enrich: true
    min_data_quality: 0.70
    required_fields: ["email", "firstName", "lastName", "title", "company"]
    sources: ["explorium"]  # Primary data source

  # CRM Sync Settings
  crm_sync:
    auto_create_contacts: true
    auto_deduplicate: true
    auto_associate_companies: true
    skip_if_exists: true  # Don't re-enrich existing contacts

  # Outreach Settings
  outreach:
    auto_enroll: true  # ⚠️ KEY SETTING: Enables auto-outreach
    require_approval: false  # Set to true for semi-autonomous
    daily_enrollment_limit: 50  # Safety limit
    template_selection: "auto"  # AI selects based on pain point

    # Campaign Rules
    campaigns:
      create_new_weekly: false  # Use existing campaigns
      default_campaign: "RTGS Treasury - Ongoing"

    # Quality Gates
    quality_gates:
      min_icp_score: 0.75
      min_data_quality: 0.70
      email_verified: true
      no_active_sequence: true  # Don't enroll if already in sequence

  # Monitoring Settings
  monitoring:
    check_interval_hours: 2
    auto_route_replies: true
    auto_create_tasks: true
    auto_update_lifecycle: true

  # Optimization Settings
  optimization:
    auto_optimize_campaigns: true
    pause_underperformers: true  # Pause if <3% reply rate after 100 sends
    promote_winners: true  # Promote variants with >10% reply rate
    min_sends_before_optimization: 100

  # Safety Limits
  safety:
    max_daily_sends: 200  # Absolute max per day
    max_linkedin_connections: 30  # LinkedIn safety limit
    pause_on_complaint: true  # Auto-pause if spam complaint
    pause_on_bounce_rate: 0.05  # Pause if >5% bounce rate

  # Alerts
  alerts:
    notify_on_hot_leads: true
    notify_on_campaign_issues: true
    notify_on_safety_triggers: true
    daily_summary: true

  # Compliance
  compliance:
    respect_unsubscribes: true  # Always
    gdpr_mode: true
    require_consent_basis: true
    log_all_actions: true
```

---

## 🤖 Agent Behaviors in YOLO Mode

### Sales Orchestrator (Main Controller)

**Daily Routine:**
```javascript
// 8:00 AM - Discovery
const prospects = await leadFinder.discover({
  count: 50,
  icpProfiles: ['icp_rtgs_psp_treasury'],
  minScore: 0.75
});

// 8:30 AM - Enrichment
const enriched = await enrichmentSpecialist.enrichBatch(prospects, {
  minQuality: 0.70,
  requireEmailVerified: true
});

// 9:30 AM - CRM Sync
await crmIntegrationAgent.syncToHubSpot(enriched, {
  deduplicate: true,
  createIfNew: true
});

// 10:00 AM - Outreach
await outreachCoordinator.enrollInCampaign(enriched, {
  campaign: 'RTGS Treasury - Ongoing',
  templateSelection: 'auto',
  startImmediately: true
});

// Report
console.log(`YOLO Mode: ${enriched.length} prospects enrolled today`);
```

**Continuous Monitoring (every 2 hours):**
```javascript
// Check for replies
const replies = await outreachCoordinator.checkForReplies();

// Route hot leads
if (replies.positive.length > 0) {
  await crmIntegrationAgent.createTasksForReplies(replies.positive);
  // Alert sales team
}

// Optimize campaigns
const campaigns = await outreachCoordinator.getActiveCampaigns();
for (const campaign of campaigns) {
  if (campaign.replyRate < 0.03 && campaign.sends > 100) {
    await outreachCoordinator.pauseCampaign(campaign.id);
    // Alert user
  }
}
```

### Lead Finder

**Autonomous Discovery Strategy:**
1. **Monday-Wednesday:** Focus on primary ICP (PSP Treasury Leaders)
2. **Thursday-Friday:** Explore adjacent ICP (Fintech Treasury Operators)
3. **Diversity:** Rotate between different geographies each day
4. **Learning:** Prioritize companies similar to those who engaged previously

### Enrichment Specialist

**Autonomous Enrichment:**
1. **Company First:** Always enrich company before contact
2. **Intelligence Generation:** Auto-generate pain hypotheses based on ICP + company data
3. **Quality Scoring:** Calculate quality score, skip if <0.70
4. **Caching:** Check enrichment cache (30-day TTL) to avoid re-enriching

### CRM Integration Agent

**Autonomous CRM Management:**
1. **Deduplication:** Always check for duplicates before creating
2. **Company Association:** Auto-create company if doesn't exist
3. **Properties:** Set custom properties (ICP score, pain points, enrichment source)
4. **Activity Logging:** Log all enrichment and outreach activities

### Outreach Coordinator

**Autonomous Campaign Management:**
1. **Template Selection:**
   - If pain = "liquidity" → use `liquidity_management_hook`
   - If pain = "cost" → use `cost_reduction_hook`
   - If pain = "expansion" → use `expansion_licensing_hook`

2. **Personalization:**
   - Auto-generate variables from enrichment data
   - Include recent signals (funding, hiring, expansion)
   - Reference specific pain point

3. **Enrollment:**
   - Enroll immediately (no approval needed)
   - Start sequence at optimal send time
   - Log enrollment in HubSpot

4. **Monitoring:**
   - Check engagement every 2 hours
   - Route replies within 1 hour
   - Update HubSpot within 5 minutes

---

## 📊 YOLO Mode Dashboard

### View Status

```
/sales-yolo status
```

**Output:**
```
🚀 YOLO Mode: ACTIVE

📅 Today's Activity (so far):
  ✅ Discovered: 50 prospects (avg ICP score: 0.82)
  ✅ Enriched: 47 prospects (3 failed quality gate)
  ✅ Synced to HubSpot: 47 contacts created
  ✅ Enrolled in campaigns: 47 (liquidity_management: 35, cost_reduction: 12)

📧 Campaign Performance (last 7 days):
  📨 Sent: 342 emails
  📬 Opened: 168 (49%)
  🔗 Clicked: 52 (15%)
  💬 Replied: 31 (9%)
  ✅ Positive replies: 18 (58% of replies)

🔗 LinkedIn Activity (last 7 days):
  🤝 Connection requests: 87
  ✅ Connections accepted: 24 (28%)
  💬 LinkedIn messages sent: 24
  📩 LinkedIn replies: 6 (25%)

🎯 Pipeline Impact:
  🔥 Hot leads created: 18
  📞 Sales tasks created: 18
  🤝 Meetings booked: 4
  💰 Opportunities created: 3

⚙️ System Health:
  ✅ HubSpot: Connected
  ✅ Explorium: Connected (credits remaining: 8,432)
  ✅ Lemlist: Connected
  ⚠️ Rate limits: All green

🔔 Recent Alerts:
  [2 hours ago] 3 positive replies - tasks created
  [4 hours ago] Campaign "RTGS Treasury Q1" hit 10% reply rate 🎉
  [Yesterday] 47 new prospects enrolled
```

---

## 🎛️ Control Commands

### Pause YOLO Mode
```
/sales-yolo pause
```
→ Stops new enrollments, keeps monitoring active

### Resume YOLO Mode
```
/sales-yolo resume
```
→ Resumes autonomous operation

### Disable YOLO Mode
```
/sales-yolo disable
```
→ Completely stops autonomous operation

### Emergency Stop
```
/sales-yolo emergency-stop
```
→ Immediately:
  - Pauses all active campaigns
  - Stops all scheduled jobs
  - Alerts user for manual review

---

## 🛡️ Safety Features

### Automatic Safety Triggers

**1. High Bounce Rate:**
```
If bounce_rate > 5%:
  → Pause all campaigns
  → Alert user: "High bounce rate detected"
  → Recommendation: "Review email list quality"
```

**2. Spam Complaints:**
```
If spam_complaints > 0:
  → Emergency stop all outreach
  → Alert user immediately
  → Require manual review before resuming
```

**3. Low Reply Rate:**
```
If reply_rate < 3% AND sends > 100:
  → Pause campaign
  → Test new variants
  → Alert user for template review
```

**4. LinkedIn Limits:**
```
If linkedin_connections_today >= 30:
  → Stop LinkedIn outreach for today
  → Continue email sequences only
  → Resume tomorrow
```

**5. Daily Send Limit:**
```
If daily_sends >= 200:
  → Pause new enrollments for today
  → Resume tomorrow at 8am
```

### Quality Gates

**Before Enrollment:**
```javascript
function canEnroll(prospect) {
  return (
    prospect.icpScore >= 0.75 &&
    prospect.dataQuality >= 0.70 &&
    prospect.emailVerified === true &&
    prospect.notInActiveSequence === true &&
    prospect.notUnsubscribed === true &&
    dailySendCount < 200
  );
}
```

---

## 🎯 YOLO Mode Best Practices

### Week 1: Testing Phase

```
/sales-yolo enable --test-mode
```

**Test mode:**
- Discovers and enriches prospects
- **Does NOT send outreach** (creates draft campaigns)
- Generates daily reports for review
- Allows you to verify quality before going live

**Review checklist:**
- Are discovered prospects on-target?
- Is enrichment data accurate?
- Are pain hypotheses reasonable?
- Are personalization hooks relevant?

### Week 2: Semi-Autonomous

```yaml
# In yolo-config.yaml
outreach:
  auto_enroll: true
  require_approval: true  # Requires /sales-approve before sending
  daily_enrollment_limit: 25  # Start small
```

**Semi-autonomous:**
- Discovers, enriches, syncs automatically
- Queues prospects for outreach
- **Waits for approval** before sending
- You run `/sales-approve` daily to review queue

### Week 3+: Full Autonomy

```yaml
outreach:
  auto_enroll: true
  require_approval: false  # Full YOLO
  daily_enrollment_limit: 50
```

**Full autonomous:**
- Everything happens automatically
- You just monitor `/sales-yolo status` daily
- Respond to alert notifications
- Let agents handle the rest

---

## 🎨 Customization Options

### A/B Testing in YOLO Mode

```yaml
yolo_mode:
  optimization:
    auto_ab_test: true
    test_variants: 3
    traffic_split: [50, 25, 25]  # 50% control, 25% each variant
    promote_threshold: 0.10  # Promote if >10% reply rate
    test_duration_days: 7
```

**Agents will:**
1. Create 3 subject line variants
2. Split traffic automatically
3. Monitor performance
4. Promote winner after 7 days
5. Sunset losers

### Geographic Rotation

```yaml
discovery:
  geographic_rotation:
    enabled: true
    schedule:
      monday: ["United Kingdom", "Germany"]
      tuesday: ["France", "Netherlands"]
      wednesday: ["United Arab Emirates", "Saudi Arabia"]
      thursday: ["Singapore", "Hong Kong"]
      friday: ["Australia", "Japan"]
```

### Industry Rotation

```yaml
discovery:
  industry_rotation:
    enabled: true
    schedule:
      week_1: "Payment Service Provider"
      week_2: "Fintech"
      week_3: "Financial Services"
      week_4: "Digital Banking"
```

---

## 📈 Expected Performance (YOLO Mode)

### Conservative Estimates

**Input:**
- 50 prospects discovered/day
- 5 days/week
- 250 prospects/week
- 1,000 prospects/month

**Output (based on RTGS benchmarks):**
- Email open rate: 45-50%
- Reply rate: 8-12%
- LinkedIn acceptance: 25-35%
- Meeting conversion: 3-5% of total outreach

**Monthly Pipeline:**
- ~450 emails opened
- ~80-120 replies
- ~40-60 positive replies
- ~30-50 meetings booked
- ~12-20 opportunities created

### ROI Calculation

**Manual Process:**
- SDR time: 20 hours/week
- Prospects contacted: ~100/week
- Cost: $40/hour × 20 hours = $800/week

**YOLO Mode:**
- Agent cost: $0 (automated)
- Prospects contacted: 250/week
- Human time needed: 2 hours/week (monitoring)
- Cost: $40/hour × 2 hours = $80/week

**Savings:** $720/week = $2,880/month

---

## 🚨 Troubleshooting

### YOLO Mode Not Starting

**Check:**
```
/sales-yolo diagnose
```

**Common issues:**
- ❌ Missing API keys
- ❌ Invalid ICP profiles
- ❌ No email templates configured
- ❌ yolo-config.yaml not found

### Too Many/Too Few Leads

**Adjust:**
```yaml
discovery:
  leads_per_day: 30  # Reduce from 50
  min_icp_score: 0.80  # Increase threshold
```

### Low Reply Rates

**Agents will auto-optimize, but you can:**
```
/sales-yolo optimize --aggressive
```
→ Tests more variants
→ Adjusts send times
→ Refines ICP criteria

---

## 💡 Pro Tips

1. **Start Conservative:** Begin with 25 leads/day, scale up after validation
2. **Monitor Weekly:** Review `/sales-yolo status` every Monday
3. **Trust the Agents:** Let them optimize campaigns automatically
4. **Review Monthly:** Adjust ICP profiles based on who's engaging
5. **Celebrate Wins:** When agents book meetings, acknowledge success! 🎉

---

## 🎯 YOLO Mode for RTGS.global

**Recommended Configuration:**

```yaml
yolo_mode:
  discovery:
    leads_per_day: 50
    icp_profiles: ["icp_rtgs_psp_treasury"]  # Treasury primary
    min_icp_score: 0.80  # High bar for quality
    geographic_focus: ["CEMEA"]  # Start with CEMEA

  outreach:
    auto_enroll: true
    require_approval: false  # Full autonomy
    template_selection: "auto"  # AI selects pain point

  safety:
    max_daily_sends: 150  # Conservative start
    max_linkedin_connections: 25
```

**Expected:**
- 10-15 qualified meetings/month
- 30-40% meeting → SQL conversion
- 3-5 new opportunities/month

---

**Ready to go full YOLO?** 🚀

```
/sales-yolo enable
```

Let the agents handle your outbound! 🤖💼
