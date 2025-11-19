# Dual-Path Outreach Strategy

**Version:** 2.0
**Last Updated:** January 2025
**Status:** Architecture Design

---

## Overview

The RTGS Sales Automation Suite implements **two complementary outreach systems**, each optimized for different use cases:

### **Path 1: Structured Outreach** (Reliable, Proven)
Template-based email and LinkedIn campaigns with minimal personalization from Explorium enrichment data.

### **Path 2: Dynamic AI Outreach** (Advanced, Adaptive)
Fully AI-agentic system that dynamically initiates and responds to contacts with ultra-targeted communication, powered by RAG and continuous learning.

---

## Path 1: Structured Outreach

### **Philosophy**
> "Well-trodden path for outreach - effective, clear, and safe"

### **Use Cases**
- Campaign launches requiring high volume and predictability
- New ICP validation before investing in AI customization
- Teams with limited AI/ML expertise
- Compliance-sensitive industries requiring pre-approved messaging
- A/B testing baseline for comparing against AI approach

### **Architecture**

```
┌─────────────────────────────────────────────────────────┐
│              STRUCTURED OUTREACH PATH                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Campaign Template Creation                          │
│     ┌────────────────────────────────────┐             │
│     │ CampaignEditor UI                  │             │
│     │ • Pre-built templates              │             │
│     │ • Email sequences (3-7 steps)      │             │
│     │ • LinkedIn sequences (2-4 steps)   │             │
│     │ • Variable placeholders            │             │
│     └────────────────────────────────────┘             │
│                      ▼                                  │
│  2. Minimal Personalization (Explorium)                 │
│     ┌────────────────────────────────────┐             │
│     │ Variable Substitution Engine       │             │
│     │ {{firstName}} → John               │             │
│     │ {{companyName}} → Acme Corp        │             │
│     │ {{industry}} → FinTech              │             │
│     │ {{painPoint}} → "FX settlement"    │             │
│     └────────────────────────────────────┘             │
│                      ▼                                  │
│  3. Scheduled Delivery                                  │
│     ┌────────────────────────────────────┐             │
│     │ Sequence Orchestrator              │             │
│     │ • Step delays (2-3 days)           │             │
│     │ • Daily send limits                │             │
│     │ • Time zone optimization           │             │
│     │ • Bounce/reply detection           │             │
│     └────────────────────────────────────┘             │
│                      ▼                                  │
│  4. Delivery via Lemlist + Phantombuster                │
│     ┌────────────────────────────────────┐             │
│     │ Email: Lemlist API                 │             │
│     │ LinkedIn: Phantombuster API        │             │
│     │ Tracking: Opens, clicks, replies   │             │
│     └────────────────────────────────────┘             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### **Data Flow**

```
ICP Profile → Template Selection → Explorium Enrichment → Variable Injection → Scheduled Send
```

### **Personalization Variables**

**Basic (Required):**
- `{{firstName}}`, `{{lastName}}`
- `{{companyName}}`
- `{{jobTitle}}`

**Explorium-Enriched (Automatic):**
- `{{industry}}`
- `{{companySize}}`
- `{{fundingStage}}`
- `{{recentNews}}` (e.g., "Series B funding")
- `{{painPoint}}` (derived from ICP + industry)
- `{{technology}}` (e.g., "using Stripe for payments")

**Conditional Logic:**
```handlebars
{{#if fundingStage === 'Series B'}}
Congrats on the recent Series B!
{{else}}
I noticed {{companyName}} is growing...
{{/if}}
```

### **Template Library**

#### **Email Templates**
1. **Treasury Executive Outreach** (3-step)
   - Step 1: Problem identification + case study
   - Step 2: Thought leadership content
   - Step 3: Direct ask for 15-min call

2. **Fintech CFO Expansion** (4-step)
   - Step 1: Expansion pain points
   - Step 2: ROI calculator
   - Step 3: Competitor success story
   - Step 4: Executive demo offer

3. **E-commerce High Volume** (5-step)
   - Step 1: FX cost analysis
   - Step 2: Settlement speed benefits
   - Step 3: Integration ease
   - Step 4: Free trial offer
   - Step 5: Breakup email

#### **LinkedIn Templates**
1. **Connection Request** (1-step)
   - Personalized note (300 chars max)
   - Common ground mention

2. **Connection Follow-Up** (3-step)
   - Step 1: Thank + value add
   - Step 2: Soft pitch + resource
   - Step 3: Direct meeting request

### **Success Metrics**
- **Email Open Rate:** Target 40-60%
- **Email Reply Rate:** Target 5-10%
- **LinkedIn Accept Rate:** Target 30-40%
- **LinkedIn Reply Rate:** Target 15-25%
- **Meetings Booked:** 1-2% of contacted

### **Implementation Priority**
**Phase 6-7 (Weeks 1-6)**

**Files to Create:**
- `mcp-server/src/services/template-engine.js`
- `mcp-server/src/services/variable-substitution.js`
- `mcp-server/src/templates/email/` (template library)
- `mcp-server/src/templates/linkedin/` (template library)
- `desktop-app/src/components/TemplateLibrary.jsx`

---

## Path 2: Dynamic AI Outreach

### **Philosophy**
> "Ultimate fully AI-agentic led outreach - ultra-targeted, learns continuously"

### **Use Cases**
- High-value enterprise deals (>$50k ACV)
- Complex, multi-stakeholder sales cycles
- Accounts requiring deep personalization
- Competitive situations needing differentiation
- Ongoing account nurturing and expansion

### **Architecture**

```
┌──────────────────────────────────────────────────────────────┐
│              DYNAMIC AI OUTREACH PATH                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Deep Contact Intelligence (RAG-Powered)                  │
│     ┌────────────────────────────────────────┐              │
│     │ Vector Database (Pinecone/Weaviate)    │              │
│     │ • Contact profile embedding            │              │
│     │ • Company research (10-Point)          │              │
│     │ • News/signals/events                  │              │
│     │ • Past interactions history            │              │
│     │ • Similar contact patterns             │              │
│     └────────────────────────────────────────┘              │
│                      ▼                                       │
│  2. AI Agent Decision Engine                                 │
│     ┌────────────────────────────────────────┐              │
│     │ Claude Sonnet 4 Orchestrator           │              │
│     │                                        │              │
│     │ Inputs:                                │              │
│     │ • ICP profile + scoring                │              │
│     │ • Explorium enrichment (full data)     │              │
│     │ • RAG context (company research)       │              │
│     │ • Previous campaign performance        │              │
│     │                                        │              │
│     │ Decisions:                             │              │
│     │ • Should I reach out? (intent check)   │              │
│     │ • Email or LinkedIn first?             │              │
│     │ • What angle/hook to use?              │              │
│     │ • How many steps in sequence?          │              │
│     │ • When to follow up?                   │              │
│     └────────────────────────────────────────┘              │
│                      ▼                                       │
│  3. Dynamic Message Generation                               │
│     ┌────────────────────────────────────────┐              │
│     │ AI Copywriting Engine                  │              │
│     │ • Claude Sonnet 4 (quality)            │              │
│     │ • GPT-4 Turbo (speed)                  │              │
│     │                                        │              │
│     │ Generates:                             │              │
│     │ • Unique subject lines                 │              │
│     │ • Personalized email body              │              │
│     │ • LinkedIn connection notes            │              │
│     │ • Follow-up messages (context-aware)   │              │
│     │                                        │              │
│     │ Constraints:                           │              │
│     │ • Brand voice guidelines               │              │
│     │ • Compliance rules                     │              │
│     │ • Length limits                        │              │
│     └────────────────────────────────────────┘              │
│                      ▼                                       │
│  4. Adaptive Delivery & Response                             │
│     ┌────────────────────────────────────────┐              │
│     │ Intelligent Orchestrator               │              │
│     │ • Send time optimization (ML model)    │              │
│     │ • Channel preference learning          │              │
│     │ • Reply sentiment analysis             │              │
│     │ • Auto-response generation             │              │
│     │ • Escalation to human (if needed)      │              │
│     └────────────────────────────────────────┘              │
│                      ▼                                       │
│  5. Continuous Learning Loop (ML)                            │
│     ┌────────────────────────────────────────┐              │
│     │ Feedback System                        │              │
│     │ • Track: opens, clicks, replies        │              │
│     │ • Analyze: what worked, what didn't    │              │
│     │ • Learn: patterns by ICP/persona       │              │
│     │ • Improve: message quality over time   │              │
│     │ • Store: successful patterns in RAG    │              │
│     └────────────────────────────────────────┘              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### **Data Flow**

```
ICP → Explorium Deep Enrichment → RAG Research → AI Agent Analysis →
Dynamic Message Gen → Optimal Timing → Send → Reply Analysis → Learn → Loop
```

### **AI Agent Capabilities**

#### **1. Research Agent**
```python
# Pseudo-code for research workflow
def research_contact(contact, icp):
    """Deep research before outreach"""

    # Company intelligence
    company_data = explorium.enrich_company(contact.company)
    recent_news = search_news(contact.company, days=30)
    funding_events = check_crunchbase(contact.company)
    tech_stack = builtwith_lookup(contact.company_domain)

    # Contact intelligence
    linkedin_profile = explorium.linkedin_enrichment(contact)
    recent_posts = scrape_linkedin_activity(contact.linkedin_url)
    mutual_connections = find_mutual_connections(contact)

    # Competitive intelligence
    competitors = identify_competitors(contact.company)
    competitive_wins = find_case_studies(competitors)

    # Build context
    context = {
        "company_signals": extract_signals(recent_news, funding_events),
        "pain_points": infer_pain_points(company_data, icp),
        "buying_triggers": detect_triggers(recent_news, tech_stack),
        "personalization_hooks": find_hooks(linkedin_profile, recent_posts),
        "competitive_angle": determine_angle(competitors, competitive_wins)
    }

    # Store in vector DB for RAG
    vector_db.upsert(contact.id, context)

    return context
```

#### **2. Decision Agent**
```python
def decide_outreach_strategy(contact, context):
    """AI decides if/how/when to reach out"""

    prompt = f"""
    You are a B2B sales strategist for RTGS.

    Contact: {contact.name}, {contact.title} at {contact.company}
    ICP Score: {contact.icp_score}/100

    Context:
    {context}

    Questions:
    1. Should we reach out? (Yes/No + confidence score)
    2. Primary channel? (Email/LinkedIn/Both)
    3. Best angle/hook? (Pain point/ROI/Thought leadership/Case study)
    4. Sequence length? (1-7 steps)
    5. Urgency level? (High/Medium/Low - affects follow-up cadence)
    6. Human review needed? (Yes/No - for high-stakes accounts)

    Output JSON format.
    """

    decision = claude_sonnet_4.invoke(prompt)

    if decision.confidence < 0.7:
        # Flag for human review
        flag_for_review(contact, decision)

    return decision
```

#### **3. Copywriting Agent**
```python
def generate_message(contact, context, strategy):
    """Generate personalized message"""

    # Retrieve similar successful messages from RAG
    similar_wins = vector_db.query(
        contact.icp_profile,
        filter={"reply_sentiment": "positive"}
    )

    prompt = f"""
    Write a {strategy.channel} message for:

    Contact: {contact.name}, {contact.title} at {contact.company}
    Angle: {strategy.angle}
    Context: {context.personalization_hooks}

    Brand Voice Guidelines:
    - Conversational, not salesy
    - Value-first, not pitch-first
    - Specific, not generic
    - Concise (< 150 words for email)

    Examples of successful messages:
    {similar_wins}

    Generate:
    - Subject line (if email)
    - Message body
    - Call-to-action
    """

    message = claude_sonnet_4.invoke(prompt)

    # Quality checks
    if not passes_compliance_check(message):
        regenerate_with_constraints(message)

    if contains_generic_language(message):
        regenerate_with_more_specificity(message)

    return message
```

#### **4. Response Agent**
```python
def handle_reply(contact, reply_text):
    """Analyze reply and respond or escalate"""

    # Sentiment analysis
    sentiment = analyze_sentiment(reply_text)
    intent = classify_intent(reply_text)

    if sentiment == "positive" and intent in ["interested", "meeting_request"]:
        # Auto-respond with calendar link
        response = generate_response(
            contact,
            reply_text,
            action="send_calendar_link"
        )
        send_email(contact, response)
        create_hubspot_task("Book meeting with {contact.name}")

    elif sentiment == "question":
        # AI generates answer
        response = generate_response(
            contact,
            reply_text,
            action="answer_question"
        )
        # Flag for human approval before sending
        flag_for_approval(contact, response)

    elif sentiment == "negative" or intent == "not_interested":
        # Polite acknowledgment, remove from sequence
        send_polite_exit(contact)
        mark_as_unqualified(contact)

    elif sentiment == "out_of_office":
        # Reschedule follow-up
        reschedule_follow_up(contact, days=7)

    # Learn from this interaction
    store_interaction_pattern(contact, reply_text, sentiment, intent)
```

#### **5. Learning Agent**
```python
def learn_from_campaign(campaign_id):
    """Continuous improvement via ML"""

    # Gather performance data
    results = get_campaign_results(campaign_id)

    # Analyze patterns
    analysis = {
        "best_performing_hooks": analyze_hooks(results),
        "optimal_send_times": analyze_timing(results),
        "effective_subject_patterns": analyze_subjects(results),
        "reply_rate_by_persona": analyze_by_persona(results),
        "channel_preference": analyze_channels(results)
    }

    # Update models
    update_send_time_model(analysis.optimal_send_times)
    update_hook_library(analysis.best_performing_hooks)

    # Store in RAG for future campaigns
    vector_db.upsert_learnings(campaign_id, analysis)

    # Generate recommendations
    recommendations = generate_recommendations(analysis)
    notify_team(recommendations)

    return analysis
```

### **RAG (Retrieval-Augmented Generation) System**

#### **Vector Database Schema**
```javascript
{
  // Contact embeddings
  "contact_profiles": {
    "id": "contact_uuid",
    "embedding": [0.123, 0.456, ...],  // 1536-dim vector
    "metadata": {
      "icp_profile": "rtgs_psp_treasury",
      "company_size": "500-1000",
      "industry": "fintech",
      "title_level": "VP"
    }
  },

  // Successful message patterns
  "winning_messages": {
    "id": "message_uuid",
    "embedding": [0.789, 0.012, ...],
    "metadata": {
      "subject": "Quick question about FX settlement",
      "hook": "recent_funding",
      "reply_rate": 0.15,
      "sentiment_score": 0.85,
      "icp_profile": "rtgs_psp_treasury"
    }
  },

  // Company research
  "company_intelligence": {
    "id": "company_uuid",
    "embedding": [0.345, 0.678, ...],
    "metadata": {
      "recent_news": [...],
      "funding_events": [...],
      "pain_points": [...],
      "tech_stack": [...]
    }
  }
}
```

#### **RAG Query Examples**
```python
# Find similar successful outreach
similar_contacts = vector_db.query(
    embedding=contact.embedding,
    filter={
        "icp_profile": contact.icp_profile,
        "reply_rate": {"$gte": 0.10}
    },
    limit=5
)

# Retrieve company insights
company_context = vector_db.query(
    text="recent fintech funding news",
    filter={"company_id": contact.company_id},
    limit=10
)
```

### **Machine Learning Models**

#### **1. Send Time Optimization**
```python
# XGBoost model predicting best send time
features = [
    contact.timezone,
    contact.title_level,
    contact.industry,
    day_of_week,
    historical_open_rates_by_hour
]

optimal_hour = send_time_model.predict(features)
# Returns: 9am, 2pm, or 4pm in contact's timezone
```

#### **2. Channel Preference**
```python
# Random Forest classifier
features = [
    contact.age_estimate,
    contact.title_level,
    contact.company_size,
    contact.industry,
    linkedin_activity_score
]

preferred_channel = channel_model.predict(features)
# Returns: "email", "linkedin", or "both"
```

#### **3. Reply Likelihood**
```python
# Neural network predicting reply probability
features = [
    message.subject_length,
    message.body_length,
    message.personalization_score,
    contact.icp_score,
    contact.engagement_history,
    time_since_last_contact
]

reply_probability = reply_model.predict(features)
# Returns: 0.0 - 1.0 (threshold: 0.15 for "likely to reply")
```

### **Success Metrics**
- **Reply Rate:** Target 15-25% (vs 5-10% structured)
- **Positive Reply Rate:** Target 60-70% of replies
- **Meeting Conversion:** Target 5-8% of contacted
- **AI Confidence Score:** > 0.8 for auto-send
- **Human Escalation Rate:** < 15% of outreach

### **Implementation Priority**
**Phase 10-12 (Weeks 12-20)**

**Files to Create:**
- `mcp-server/src/ai/research-agent.js`
- `mcp-server/src/ai/decision-agent.js`
- `mcp-server/src/ai/copywriting-agent.js`
- `mcp-server/src/ai/response-agent.js`
- `mcp-server/src/ai/learning-agent.js`
- `mcp-server/src/ml/send-time-model.py`
- `mcp-server/src/ml/channel-preference-model.py`
- `mcp-server/src/rag/vector-store.js`
- `mcp-server/src/rag/embedding-service.js`

---

## Integration Strategy

### **Campaign Selection UI**

```jsx
// CampaignCreationWizard.jsx - Step 1: Choose Path

<div className="path-selection">
  <h2>Choose Your Outreach Approach</h2>

  <div className="path-card structured">
    <h3>🎯 Structured Outreach</h3>
    <p>Template-based sequences with proven performance</p>

    <ul>
      <li>✅ Launch in minutes</li>
      <li>✅ Predictable results</li>
      <li>✅ Pre-approved messaging</li>
      <li>✅ A/B testing built-in</li>
    </ul>

    <div className="metrics">
      <span>Avg Reply Rate: 5-10%</span>
      <span>Setup Time: 5 mins</span>
    </div>

    <button onClick={() => setPath('structured')}>
      Use Structured Path
    </button>
  </div>

  <div className="path-card dynamic">
    <h3>🤖 Dynamic AI Outreach</h3>
    <p>AI-powered personalization that learns and improves</p>

    <ul>
      <li>✅ Ultra-personalized</li>
      <li>✅ Learns continuously</li>
      <li>✅ Auto-responds to replies</li>
      <li>✅ Best for high-value deals</li>
    </ul>

    <div className="metrics">
      <span>Avg Reply Rate: 15-25%</span>
      <span>Setup Time: 15 mins</span>
    </div>

    <button onClick={() => setPath('dynamic')}>
      Use AI-Powered Path
    </button>
  </div>
</div>
```

### **Hybrid Mode**

Some campaigns can use **both paths** for different segments:

```
High-Value Accounts (>$100k ACV) → Dynamic AI Path
Mid-Market (25k-$100k ACV) → Structured Path + AI subject lines
SMB (<$25k ACV) → Structured Path
```

---

## Compliance & Guardrails

### **Structured Path Guardrails**
- ✅ All templates pre-approved by legal
- ✅ Unsubscribe link required in every email
- ✅ Daily send limits enforced (500/day)
- ✅ Bounce rate monitoring (auto-pause > 5%)
- ✅ Spam complaint tracking (auto-pause > 0.1%)

### **Dynamic AI Path Guardrails**
- ✅ AI-generated messages reviewed before first send (per ICP)
- ✅ Compliance keywords flagged (e.g., "guaranteed", "risk-free")
- ✅ Human-in-loop for high-stakes accounts
- ✅ Confidence threshold for auto-send (> 0.8)
- ✅ Sentiment analysis prevents aggressive messaging
- ✅ Brand voice consistency check
- ✅ All AI decisions logged for audit

---

## Cost Analysis

### **Structured Path**
| Component | Cost/Month |
|-----------|-----------|
| Lemlist (500 contacts) | $99 |
| Phantombuster (LinkedIn) | $69 |
| Explorium (enrichment) | $500 |
| **Total** | **$668** |

**Cost per contact:** $1.34

### **Dynamic AI Path**
| Component | Cost/Month |
|-----------|-----------|
| Claude Sonnet 4 API | $200 |
| Vector DB (Pinecone) | $70 |
| Explorium (deep enrichment) | $800 |
| ML Model Inference | $50 |
| Lemlist/Phantombuster | $168 |
| **Total** | **$1,288** |

**Cost per contact:** $2.58

**ROI Justification:**
- Structured: 7% reply rate = $19 per reply
- Dynamic: 20% reply rate = $13 per reply (better ROI despite higher cost)

---

## Rollout Plan

### **Phase 1: Structured Path (Weeks 1-6)**
- Build template engine
- Integrate Lemlist + Phantombuster
- Launch with 3 template libraries
- A/B test templates
- Establish baseline metrics

### **Phase 2: AI Foundation (Weeks 7-10)**
- Set up vector database
- Build RAG system
- Train send time + channel models
- Create AI agent framework

### **Phase 3: Dynamic AI MVP (Weeks 11-14)**
- Research + Decision agents
- Copywriting agent (email only)
- Manual approval workflow
- Beta test with 50 high-value contacts

### **Phase 4: Full Dynamic System (Weeks 15-20)**
- Response agent
- Learning agent
- LinkedIn support
- Auto-send for high-confidence (> 0.9)
- Production launch

---

## Success Criteria

### **Structured Path**
- ✅ 40%+ open rate
- ✅ 5-10% reply rate
- ✅ < 3% bounce rate
- ✅ 1-2% meeting booked rate
- ✅ Launch < 10 minutes per campaign

### **Dynamic AI Path**
- ✅ 15-25% reply rate
- ✅ 60%+ positive sentiment replies
- ✅ 5-8% meeting booked rate
- ✅ AI confidence > 0.8 for 80%+ of messages
- ✅ < 15% human escalation rate
- ✅ Learning loop shows improvement over 30 days

---

## Team Training

### **For SDRs (Structured Path)**
1. Template selection guide
2. Variable customization best practices
3. A/B testing workflow
4. Reply handling process

### **For AI Operators (Dynamic Path)**
1. AI agent oversight dashboard
2. Message approval workflow
3. Confidence score interpretation
4. When to override AI decisions
5. Feedback loop process

---

## Next Steps

1. ✅ Get stakeholder approval on dual-path strategy
2. ⏳ Prioritize Structured Path (Phase 6-7) for immediate ROI
3. ⏳ Run Structured campaigns for 30 days to establish baseline
4. ⏳ Collect training data for AI models (message performance)
5. ⏳ Build AI foundation (RAG, vector DB, models)
6. ⏳ Launch Dynamic AI in beta with high-value accounts only
7. ⏳ Scale Dynamic AI based on performance vs Structured

---

**Questions to Resolve:**

1. **Vector DB Choice:** Pinecone (managed) vs Weaviate (self-hosted)?
2. **LLM Provider:** Claude Sonnet 4 (quality) vs GPT-4 Turbo (speed)?
3. **Human Approval:** Required for all AI messages initially?
4. **ML Training:** Build models or use AutoML (Vertex AI)?
5. **LinkedIn Automation:** Phantombuster (safe) vs native API (risky)?

---

**Made with ❤️ for the RTGS Team**
