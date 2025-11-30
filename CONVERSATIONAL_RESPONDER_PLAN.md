# ConversationalResponder Implementation Plan

## Overview

Build a dynamic AI response system that enables real-time, context-aware replies to incoming emails and LinkedIn messages, making each communication specifically tailored to that moment.

## User Vision
> "The AI should be able to respond to emails and LinkedIn outreach as it comes in, as if it was the user. This way each response and each communication is specifically tailored to that moment making it far more powerful"

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INCOMING REPLY                               │
│              (Lemlist webhook: event_type='replied')                 │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    campaign-controller.js                            │
│                 handleWebhookEvent (existing)                        │
│                          │                                           │
│                          ▼                                           │
│              ┌─────────────────────────┐                            │
│              │ NEW: Trigger dynamic    │                            │
│              │ response if campaign    │                            │
│              │ path_type='dynamic_ai'  │                            │
│              └─────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│              ConversationalResponder.js (NEW SERVICE)                │
│                                                                      │
│  1. Load conversation history for this lead                         │
│  2. Load lead profile + company intelligence                        │
│  3. Load KnowledgeService context (persona, objections, cases)      │
│  4. Detect intent/sentiment of incoming message                     │
│  5. Generate contextual AI response                                 │
│  6. Send response via Lemlist API                                   │
│  7. Store in conversation history                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       LemlistClient                                  │
│                    sendReply() (NEW METHOD)                          │
│                                                                      │
│  - Email: Reply to thread via Lemlist API                           │
│  - LinkedIn: Send message in conversation                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Components to Build

### 1. Database: Lead Conversation Tracking

**File**: `sales-automation-api/src/utils/database.js`

Add new tables for lead-specific conversations (separate from internal chat):

```sql
-- Lead conversation threads
CREATE TABLE IF NOT EXISTS lead_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_email TEXT NOT NULL,
  campaign_id TEXT,
  enrollment_id TEXT,
  channel TEXT DEFAULT 'email',  -- 'email' or 'linkedin'
  thread_id TEXT,                -- Lemlist thread ID for replies
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lead_email, campaign_id)
);

-- Individual messages in conversation
CREATE TABLE IF NOT EXISTS lead_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  direction TEXT NOT NULL,       -- 'outbound' or 'inbound'
  content TEXT NOT NULL,
  message_type TEXT,             -- 'initial', 'follow_up', 'reply'
  sentiment TEXT,                -- 'positive', 'neutral', 'negative', 'objection'
  ai_generated BOOLEAN DEFAULT FALSE,
  lemlist_activity_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES lead_conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_lead_conversations_email ON lead_conversations(lead_email);
CREATE INDEX IF NOT EXISTS idx_lead_messages_conv ON lead_messages(conversation_id, created_at);
```

**New Methods**:
- `getOrCreateLeadConversation(leadEmail, campaignId, channel)`
- `addLeadMessage(conversationId, direction, content, options)`
- `getLeadConversationHistory(leadEmail, campaignId)`

---

### 2. ConversationalResponder Service

**File**: `sales-automation-api/src/services/ConversationalResponder.js`

```javascript
class ConversationalResponder {
  constructor(db, aiProvider, lemlistClient) {
    this.db = db;
    this.ai = aiProvider;
    this.lemlist = lemlistClient;
  }

  /**
   * Main entry point - handle an incoming reply
   */
  async handleIncomingReply(webhookData) {
    // 1. Extract message content and lead info
    // 2. Load conversation history
    // 3. Load lead context (profile, company, intelligence)
    // 4. Load knowledge context (persona, objections, case studies)
    // 5. Detect intent/sentiment
    // 6. Generate AI response
    // 7. Send via Lemlist
    // 8. Store in conversation history
  }

  /**
   * Build context for AI prompt
   */
  async _buildContext(lead, conversationHistory) {
    // Combine:
    // - Lead profile (title, company, industry)
    // - Previous messages in thread
    // - KnowledgeService context for persona
    // - Relevant case studies
    // - Objection handling if detected
  }

  /**
   * Generate AI response using Claude/Gemini
   */
  async _generateResponse(context, incomingMessage) {
    const systemPrompt = this._buildSystemPrompt(context);
    const userPrompt = this._buildUserPrompt(context, incomingMessage);
    
    return await this.ai.generateText(systemPrompt, userPrompt, 'claude-3-5-sonnet');
  }

  /**
   * Detect intent/sentiment of incoming message
   */
  _detectIntent(message) {
    // Categories:
    // - 'interested' - wants to learn more
    // - 'objection' - price, timing, competitor mention
    // - 'meeting_request' - wants to schedule
    // - 'not_interested' - polite decline
    // - 'question' - asking for info
    // - 'out_of_office' - auto-reply detection
  }
}
```

---

### 3. LemlistClient Enhancement

**File**: `sales-automation-api/src/clients/lemlist-client.js`

**New Method**: `sendReply()`

```javascript
/**
 * Send a reply to an existing conversation thread
 * @param {string} leadEmail - The lead's email
 * @param {string} campaignId - The campaign ID
 * @param {string} message - The reply content
 * @param {object} options - Additional options
 */
async sendReply(leadEmail, campaignId, message, options = {}) {
  // Lemlist API endpoint for sending replies
  // POST /api/campaigns/{campaignId}/leads/{leadEmail}/reply
  
  // For LinkedIn, use appropriate endpoint
  // POST /api/campaigns/{campaignId}/leads/{leadEmail}/linkedin-message
}
```

**Note**: Need to verify Lemlist API supports programmatic replies. If not, fallback options:
- Use direct email (Postmark) with proper threading headers
- Use LinkedIn API directly for LinkedIn messages

---

### 4. Webhook Integration

**File**: `sales-automation-api/src/controllers/campaign-controller.js`

Modify the `handleWebhookEvent` method to trigger ConversationalResponder:

```javascript
// After line ~1427 (case 'replied':)
case 'replied':
  await OutcomeTracker.recordReply(eventData.enrollment_id, eventData.sentiment);
  await OutcomeTracker.updateLearnings();
  
  // NEW: Trigger dynamic AI response if campaign uses dynamic_ai path
  setImmediate(async () => {
    try {
      const campaign = await getCampaignById(eventData.campaign_id);
      if (campaign?.path_type === 'dynamic_ai') {
        await ConversationalResponder.handleIncomingReply({
          leadEmail: eventData.lead_email,
          campaignId: eventData.campaign_id,
          enrollmentId: eventData.enrollment_id,
          messageContent: eventData.reply_content,
          channel: campaign.type, // 'email' or 'linkedin'
          threadId: eventData.thread_id
        });
      }
    } catch (err) {
      logger.warn('Dynamic response generation failed', { error: err.message });
    }
  });
  break;
```

---

### 5. AI Prompt Engineering

**System Prompt Template**:

```
You are {sender_name}, a {sender_role} at RTGS.global, responding to a sales outreach conversation.

CONTEXT:
- Lead: {lead_name}, {lead_title} at {company_name}
- Industry: {industry}
- Previous conversation: {conversation_summary}

YOUR KNOWLEDGE:
{knowledge_context}

RESPONSE GUIDELINES:
1. Be conversational and natural - you ARE the sender
2. Address their specific question/concern directly
3. Keep response concise (2-3 paragraphs max)
4. If they show interest, suggest a specific next step
5. If they raise an objection, address it with relevant evidence
6. Never reveal you are AI - respond as the human would
7. Match the tone of their message (formal/casual)

DETECTED INTENT: {intent}
{intent_specific_guidance}
```

**Intent-Specific Guidance**:
- **interested**: Propose a concrete next step (call, demo, case study)
- **objection**: Use relevant battle card or case study to address
- **question**: Answer directly, then pivot to value proposition
- **meeting_request**: Confirm enthusiasm, propose specific times
- **not_interested**: Graceful exit, offer to reconnect later

---

## Implementation Steps

### Phase 1: Database Schema (30 min)
1. Add lead_conversations table
2. Add lead_messages table
3. Add database helper methods

### Phase 2: ConversationalResponder Service (2 hours)
1. Create service class structure
2. Implement context building
3. Implement intent detection
4. Implement AI response generation
5. Add comprehensive logging

### Phase 3: LemlistClient Enhancement (1 hour)
1. Research Lemlist API for reply capability
2. Implement sendReply method
3. Add fallback for direct email if needed

### Phase 4: Webhook Integration (30 min)
1. Modify webhook handler to trigger responder
2. Add campaign path_type check
3. Add error handling and logging

### Phase 5: Testing & Tuning (1 hour)
1. Test with mock webhook data
2. Tune AI prompts for natural responses
3. Test conversation history tracking
4. Verify thread continuity

---

## Configuration

New environment variables:
```
DYNAMIC_AI_ENABLED=true
DYNAMIC_AI_RESPONSE_DELAY_MS=30000  # Delay to seem human (30s)
DYNAMIC_AI_MAX_RESPONSES_PER_THREAD=5  # Prevent infinite loops
```

Campaign schema addition:
```javascript
// In campaign creation
path_type: 'dynamic_ai',  // vs 'structured' for templates
dynamic_ai_config: {
  auto_respond: true,
  response_delay_ms: 30000,
  max_responses: 5,
  excluded_intents: ['not_interested'],  // Don't respond to these
  require_review: false  // If true, queue for human review
}
```

---

## Risk Mitigations

1. **Infinite reply loops**: Max response limit per thread
2. **Out-of-office replies**: Detect and skip auto-replies
3. **Inappropriate responses**: Sentiment check before sending
4. **Rate limiting**: Respect Lemlist API limits
5. **Data privacy**: Don't include sensitive data in AI prompts

---

## Success Metrics

- Response time: < 60 seconds from webhook to reply sent
- Response quality: Human review sampling for first 100 responses
- Engagement: Track reply-to-reply rate improvement
- Conversion: Compare dynamic_ai vs structured path outcomes

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/ConversationalResponder.js` | CREATE | Main service |
| `src/utils/database.js` | MODIFY | Add conversation tables/methods |
| `src/clients/lemlist-client.js` | MODIFY | Add sendReply method |
| `src/controllers/campaign-controller.js` | MODIFY | Trigger responder on reply |

---

## Questions to Resolve

1. Does Lemlist API support programmatic replies to threads?
2. Should responses be queued for human review initially?
3. What's the appropriate response delay to seem human?
4. Should we support different AI models per campaign?

---

## Future Enhancement: Neo4j Knowledge Graph

**Decision**: For scale, Neo4j is the correct architecture. Current implementation uses SQLite with a schema designed for future migration.

**Why Neo4j Later**:
- Complex relationship traversal (lead → similar leads → what worked)
- Semantic connections between knowledge nodes
- "Find case studies relevant to this conversation" via graph traversal
- Pattern recognition across outcomes

**Migration Path**:
1. Current: SQLite with junction tables (relationships as foreign keys)
2. Future: Neo4j with nodes (Lead, Company, Conversation, Knowledge) and edges (WORKS_FOR, DISCUSSED, SIMILAR_TO, RESPONDED_TO)

**Graph Schema (Future)**:
```cypher
// Nodes
(:Lead {email, name, title})
(:Company {name, domain, industry})
(:Conversation {id, channel})
(:Message {content, direction, sentiment})
(:Knowledge {type, content})  // case_study, value_prop, objection_handler
(:Outcome {type, success})

// Relationships
(lead)-[:WORKS_FOR]->(company)
(lead)-[:HAD_CONVERSATION]->(conversation)
(conversation)-[:CONTAINS]->(message)
(message)-[:USED_KNOWLEDGE]->(knowledge)
(message)-[:RESULTED_IN]->(outcome)
(lead)-[:SIMILAR_TO {score}]->(lead)
(knowledge)-[:RELEVANT_TO]->(industry)
```

**For Now**: SQLite schema below is designed with explicit relationship tables that map cleanly to graph edges later.