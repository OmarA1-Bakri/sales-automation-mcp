# RTGS Sales Automation - Product Roadmap

**Version:** 2.0 - Dual-Path Outreach Strategy
**Last Updated:** January 2025

---

## Vision

Transform RTGS Sales Automation into a **best-in-class outreach platform** with two complementary paths:

1. **Structured Outreach** - Reliable, template-based campaigns (proven ROI)
2. **Dynamic AI Outreach** - Adaptive, AI-agentic system (cutting-edge performance)

---

## Current State (v1.0.0)

### Completed ✅
- Desktop application (6 views)
- AI chat assistant (Claude Haiku 4-5)
- Campaign visibility (email + LinkedIn metrics)
- Campaign template editor (UI only, no backend)
- Contact import and enrichment
- ICP profiling system
- Basic CRM integration structure

### Gaps ⚠️
- No backend persistence (uses mock data)
- No actual email/LinkedIn sending
- No contact enrollment automation
- No reply detection/processing
- Template and analytics data mixed
- No A/B testing
- No scheduling/automation engine

---

## Development Phases

## Phase 6: Backend Foundation & Data Architecture
**Timeline:** Weeks 1-2
**Priority:** CRITICAL - Foundation for both paths
**Status:** Not Started

### Objectives
- Separate campaign templates from performance analytics
- Create persistent backend with PostgreSQL
- Build RESTful API for campaign CRUD operations

### Phase 6A: Data Architecture Refactor
**Duration:** 3-5 days

**Database Schema:**
```sql
campaign_templates (id, name, type, path_type, icp_profile_id, settings)
  -- path_type: 'structured' | 'dynamic_ai'

campaign_instances (id, template_id, status, started_at, paused_at)

email_sequences (id, template_id, step, subject, body, delay_hours)

linkedin_sequences (id, template_id, step, type, message, delay_hours)

campaign_enrollments (id, instance_id, contact_id, status, current_step)

campaign_events (id, enrollment_id, event_type, timestamp, metadata)
  -- event_type: 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced'
```

**Deliverables:**
- ✅ PostgreSQL schema and migrations
- ✅ Campaign template model (separate from performance)
- ✅ Campaign instance model (runtime data)
- ✅ Database seeding scripts

**Files to Create:**
- `mcp-server/src/db/schema.sql`
- `mcp-server/src/db/migrations/001_campaign_architecture.sql`
- `mcp-server/src/models/campaign-template.js`
- `mcp-server/src/models/campaign-instance.js`
- `mcp-server/src/models/campaign-enrollment.js`

### Phase 6B: Campaign CRUD API
**Duration:** 2-3 days

**API Endpoints:**
```
POST   /api/campaigns/templates          # Create template
GET    /api/campaigns/templates          # List templates
GET    /api/campaigns/templates/:id      # Get template
PUT    /api/campaigns/templates/:id      # Update template
DELETE /api/campaigns/templates/:id      # Delete template

POST   /api/campaigns/instances          # Start campaign from template
GET    /api/campaigns/instances/:id      # Get campaign details
PATCH  /api/campaigns/instances/:id      # Pause/resume
GET    /api/campaigns/instances/:id/performance  # Analytics
```

**Deliverables:**
- ✅ RESTful API endpoints
- ✅ Campaign controller with business logic
- ✅ Input validation and error handling
- ✅ API documentation

**Files to Create:**
- `mcp-server/src/routes/campaigns.js`
- `mcp-server/src/controllers/campaign-controller.js`
- `mcp-server/src/validators/campaign-validator.js`

**Files to Modify:**
- `desktop-app/src/services/api.js` - Replace mock data with real API calls
- `desktop-app/src/pages/CampaignsPage.jsx` - Use API for all operations

---

## Phase 7: Structured Outreach Path (Path 1)
**Timeline:** Weeks 3-6
**Priority:** HIGH - Immediate ROI
**Status:** Not Started

### Objectives
- Launch template-based campaigns with proven performance
- **Multi-Provider Architecture:** Implement 3 providers with abstraction layer
  - **PRIMARY (Active):** Lemlist (email + LinkedIn multi-channel)
  - **SECONDARY (Inactive):** Postmark (email-only alternative)
  - **SECONDARY (Inactive):** Phantombuster (LinkedIn-only alternative)
- Enable automatic enrollment and sending
- Implement reply detection and classification
- Configuration-driven provider switching

### Phase 7A: Template Engine & Library
**Duration:** 3-4 days

**Template System:**
- Pre-built email sequences (3 ICP templates)
- Pre-built LinkedIn sequences (2 templates)
- Variable substitution ({{firstName}}, {{companyName}}, etc.)
- Conditional logic support
- Template versioning

**Deliverables:**
- ✅ Template rendering engine (Handlebars.js)
- ✅ Variable substitution service (Explorium integration)
- ✅ 3 email template libraries
- ✅ 2 LinkedIn template libraries
- ✅ Template validation (subject length, variable presence)

**Files to Create:**
- `mcp-server/src/services/template-engine.js`
- `mcp-server/src/services/variable-substitution.js`
- `mcp-server/src/templates/email/treasury-executive.json`
- `mcp-server/src/templates/email/fintech-cfo.json`
- `mcp-server/src/templates/email/ecommerce-high-volume.json`
- `mcp-server/src/templates/linkedin/connection-request.json`
- `desktop-app/src/components/TemplateLibrary.jsx`
- `desktop-app/src/components/TemplatePreview.jsx`

### Phase 7B: Contact Enrollment System
**Duration:** 4-5 days

**Enrollment Features:**
- ICP matching criteria
- Contact filters (size, industry, role)
- Exclusion rules (already contacted, unsubscribed)
- Daily limits per campaign
- Manual bulk enrollment UI
- Auto-enrollment (scheduled cron job)

**Deliverables:**
- ✅ Enrollment rules engine
- ✅ Enrollment worker (cron-based)
- ✅ Manual enrollment UI
- ✅ Conflict detection (duplicate enrollments)
- ✅ Daily limit enforcement

**Files to Create:**
- `mcp-server/src/workers/enrollment-worker.js`
- `mcp-server/src/services/enrollment-service.js`
- `mcp-server/src/rules/enrollment-rules.js`
- `desktop-app/src/components/EnrollmentModal.jsx`
- `desktop-app/src/components/EnrollmentPreview.jsx`

### Phase 7C: Multi-Provider Architecture & Abstraction Layer
**Duration:** 2-3 days

**Architecture Design:**
- Provider abstraction interfaces (EmailProvider, LinkedInProvider)
- Configuration-driven provider selection
- Unified API regardless of underlying provider
- Feature parity tracking across providers

**Deliverables:**
- ✅ Provider abstraction interfaces
- ✅ Provider factory pattern
- ✅ Configuration management
- ✅ Provider capability matrix

**Files to Create:**
- `mcp-server/src/providers/email-provider.interface.js`
- `mcp-server/src/providers/linkedin-provider.interface.js`
- `mcp-server/src/providers/provider-factory.js`
- `mcp-server/src/config/provider-config.js`

### Phase 7D: Lemlist Integration (PRIMARY - Email + LinkedIn)
**Duration:** 4-5 days
**Status:** ACTIVE by default

**Multi-Channel Features:**
- Email + LinkedIn in unified sequences
- Conditional triggers (email → LinkedIn fallback)
- Dynamic message personalization
- Webhook handling for all channels
- Native multi-channel orchestration

**Email Capabilities:**
- Campaign creation and management
- Variable mapping and personalization
- Send tracking (opens, clicks, bounces)
- Reply detection
- Unsubscribe handling

**LinkedIn Capabilities:**
- Profile visits, connection requests
- Text and voice messages
- Conditional sequencing
- Acceptance tracking
- Unified inbox

**Deliverables:**
- ✅ LemlistEmailProvider implementation
- ✅ LemlistLinkedInProvider implementation
- ✅ Multi-channel sequence orchestration
- ✅ Webhook receiver for all events
- ✅ Event storage in campaign_events table
- ✅ Real-time performance updates
- ✅ **ACTIVE by default**

**Files to Modify:**
- `mcp-server/src/clients/lemlist-client.js` - Full API implementation

**Files to Create:**
- `mcp-server/src/providers/lemlist-email-provider.js`
- `mcp-server/src/providers/lemlist-linkedin-provider.js`
- `mcp-server/src/services/multi-channel-orchestrator.js`
- `mcp-server/src/webhooks/lemlist-webhook.js`
- `mcp-server/src/mappers/lemlist-mapper.js`

### Phase 7E: Postmark Integration (SECONDARY - Email Only)
**Duration:** 2-3 days
**Status:** INACTIVE until internal approval

**Email-Only Features:**
- Single and batch email sending
- Template-based sending
- Open and click tracking
- Webhook events (bounce, delivery, open, click, spam)
- Message streams (transactional vs broadcast)
- Metadata and tagging

**Deliverables:**
- ✅ PostmarkEmailProvider implementation
- ✅ Template rendering
- ✅ Batch sending (up to 500 emails)
- ✅ Webhook receiver
- ✅ **Config flag controlled: EMAIL_PROVIDER=postmark**
- ✅ **INACTIVE by default**

**Files to Create:**
- `mcp-server/src/clients/postmark-client.js`
- `mcp-server/src/providers/postmark-email-provider.js`
- `mcp-server/src/webhooks/postmark-webhook.js`
- `mcp-server/src/mappers/postmark-mapper.js`

### Phase 7F: Phantombuster Integration (SECONDARY - LinkedIn Only)
**Duration:** 2-3 days
**Status:** INACTIVE until internal approval

**LinkedIn-Only Features:**
- Connection request automation
- Message sending after acceptance
- Profile visits
- Rate limiting (conservative: 20 connections/day)
- Activity tracking and reporting

**Deliverables:**
- ✅ PhantombusterLinkedInProvider implementation
- ✅ Phantom selection and execution
- ✅ Rate limit enforcement
- ✅ Acceptance detection
- ✅ **Config flag controlled: LINKEDIN_PROVIDER=phantombuster**
- ✅ **INACTIVE by default**

**Files to Create:**
- `mcp-server/src/clients/phantombuster-client.js`
- `mcp-server/src/providers/phantombuster-linkedin-provider.js`
- `mcp-server/src/services/phantombuster-orchestrator.js`
- `mcp-server/src/workers/phantombuster-worker.js`

### Phase 7G: Reply Detection & Classification
**Duration:** 3-4 days
**Supports:** All providers (Lemlist, Postmark, Phantombuster)

**Reply Features:**
- Email reply webhook (Lemlist)
- LinkedIn message polling (Phantombuster)
- Sentiment analysis (positive/negative/neutral)
- Intent classification (interested, not_interested, question, OOO)
- Auto-actions (pause on positive, unsubscribe on negative)

**Deliverables:**
- ✅ Reply classifier (Claude API)
- ✅ Sentiment analysis service
- ✅ Auto-pause on positive reply
- ✅ Inbox UI for managing replies
- ✅ Suggested responses

**Files to Create:**
- `mcp-server/src/services/reply-classifier.js`
- `mcp-server/src/services/sentiment-analyzer.js`
- `desktop-app/src/pages/InboxPage.jsx`
- `desktop-app/src/components/ReplyCard.jsx`

**Files to Modify:**
- `desktop-app/src/App.jsx` - Add Inbox route

---

## Phase 8: Campaign Optimization
**Timeline:** Weeks 7-8
**Priority:** MEDIUM - Improve structured path ROI
**Status:** Not Started

### Objectives
- A/B testing for templates
- Advanced analytics dashboard
- Performance recommendations

### Phase 8A: A/B Testing Framework
**Duration:** 4-5 days

**A/B Testing Features:**
- Test variants (subject, body, delay, send time)
- Split allocation (50/50, 33/33/33)
- Statistical significance calculation
- Auto-winner promotion
- Test result visualization

**Deliverables:**
- ✅ A/B test configuration UI
- ✅ Contact split algorithm
- ✅ Performance tracking by variant
- ✅ Statistical significance calculator
- ✅ Winner auto-promotion

**Files to Create:**
- `mcp-server/src/models/ab-test.js`
- `mcp-server/src/services/ab-testing-service.js`
- `mcp-server/src/algorithms/split-algorithm.js`
- `desktop-app/src/components/ABTestBuilder.jsx`
- `desktop-app/src/components/ABTestResults.jsx`

### Phase 8B: Performance Analytics
**Duration:** 3-4 days

**Analytics Features:**
- Time series graphs (sends, opens, clicks, replies)
- Cohort analysis (week-over-week performance)
- Conversion funnel visualization
- ICP performance comparison
- Best performing sequences

**Deliverables:**
- ✅ Analytics dashboard page
- ✅ Time series charts (Chart.js/Recharts)
- ✅ Funnel visualization
- ✅ Recommendations engine

**Files to Create:**
- `desktop-app/src/pages/AnalyticsPage.jsx`
- `desktop-app/src/components/TimeSeriesChart.jsx`
- `desktop-app/src/components/ConversionFunnel.jsx`
- `mcp-server/src/services/recommendations-engine.js`

---

## Phase 9: CRM Integrations
**Timeline:** Weeks 9-10
**Priority:** MEDIUM - Sales team productivity
**Status:** Not Started

### Objectives
- Two-way HubSpot/Salesforce sync
- Calendly integration for meeting booking
- Slack notifications for positive replies

### Phase 9A: HubSpot Bi-Directional Sync
**Duration:** 3-4 days

**Sync Features:**
- Contact/company sync (RTGS → HubSpot)
- Deal creation on positive reply
- Activity logging (emails, LinkedIn messages)
- Custom properties (ICP score, Explorium data)
- Conflict resolution (last-write-wins)

**Deliverables:**
- ✅ Bi-directional sync worker
- ✅ Conflict resolution logic
- ✅ Sync status dashboard

**Files to Modify:**
- `mcp-server/src/workers/crm-sync-worker.js` - Add bi-directional logic

**Files to Create:**
- `mcp-server/src/services/hubspot-deal-service.js`
- `desktop-app/src/components/SyncStatusDashboard.jsx`

### Phase 9B: Calendly Integration
**Duration:** 2 days

**Calendly Features:**
- Auto-send booking link on positive reply
- Embed Calendly in email signatures
- Sync booked meetings to HubSpot
- Meeting confirmation tracking

**Deliverables:**
- ✅ Calendly API integration
- ✅ Auto-send on positive reply
- ✅ Meeting sync to CRM

**Files to Create:**
- `mcp-server/src/integrations/calendly-integration.js`

### Phase 9C: Slack Notifications
**Duration:** 2 days

**Slack Features:**
- New positive replies → Slack channel
- Campaign milestones (100 sent, 10 replies)
- Error alerts (high bounce rate, API failures)
- Digest notifications (daily/weekly)

**Deliverables:**
- ✅ Slack webhook integration
- ✅ Notification rules engine
- ✅ Digest scheduler

**Files to Create:**
- `mcp-server/src/integrations/slack-notifier.js`
- `mcp-server/src/services/notification-rules.js`

---

## Phase 10: Dynamic AI Foundation
**Timeline:** Weeks 11-14
**Priority:** HIGH - Future competitive advantage
**Status:** Not Started

### Objectives
- Build RAG (Retrieval-Augmented Generation) system
- Set up vector database for embeddings
- Train ML models (send time, channel preference)
- Create AI agent framework

### Phase 10A: Vector Database & RAG
**Duration:** 4-5 days

**RAG System:**
- Vector database setup (Pinecone or Weaviate)
- Embedding generation (OpenAI Ada-002)
- Contact profile embeddings
- Successful message pattern storage
- Company intelligence storage
- Similarity search

**Deliverables:**
- ✅ Vector DB setup and configuration
- ✅ Embedding service (batch + real-time)
- ✅ RAG query service
- ✅ Context retrieval for AI agents

**Files to Create:**
- `mcp-server/src/rag/vector-store.js`
- `mcp-server/src/rag/embedding-service.js`
- `mcp-server/src/rag/context-builder.js`

**Infrastructure:**
- Pinecone account + index creation
- Embedding pipeline (scheduled job)

### Phase 10B: ML Model Training
**Duration:** 5-6 days

**ML Models:**
1. **Send Time Optimizer** (XGBoost)
   - Features: timezone, title, industry, historical open rates
   - Target: Optimal send hour (9am, 2pm, 4pm)

2. **Channel Preference** (Random Forest)
   - Features: age, title, company size, LinkedIn activity
   - Target: Email, LinkedIn, or Both

3. **Reply Likelihood** (Neural Network)
   - Features: message quality, ICP score, personalization
   - Target: Reply probability (0.0-1.0)

**Deliverables:**
- ✅ Training data collection pipeline
- ✅ Model training scripts (Python)
- ✅ Model versioning (MLflow or Weights & Biases)
- ✅ Inference API (FastAPI or Flask)
- ✅ Model monitoring dashboard

**Files to Create:**
- `mcp-server/src/ml/train_send_time_model.py`
- `mcp-server/src/ml/train_channel_model.py`
- `mcp-server/src/ml/train_reply_model.py`
- `mcp-server/src/ml/inference_server.py`
- `mcp-server/src/ml/model_monitor.py`

---

## Phase 11: Dynamic AI Agents (MVP)
**Timeline:** Weeks 15-17
**Priority:** HIGH - Core AI capability
**Status:** Not Started

### Objectives
- Research Agent (deep contact intelligence)
- Decision Agent (should we reach out?)
- Copywriting Agent (generate personalized messages)
- Human-in-loop approval workflow

### Phase 11A: Research Agent
**Duration:** 4-5 days

**Research Capabilities:**
- Explorium deep enrichment (10-point research)
- Recent news search (company + contact)
- Funding events (Crunchbase API)
- Tech stack detection (BuiltWith API)
- LinkedIn activity scraping
- Competitive intelligence
- Context storage in vector DB

**Deliverables:**
- ✅ Research orchestrator
- ✅ Multi-source data aggregation
- ✅ Intelligence synthesis
- ✅ Context builder for AI agents

**Files to Create:**
- `mcp-server/src/ai/research-agent.js`
- `mcp-server/src/services/news-search.js`
- `mcp-server/src/services/competitive-intel.js`

### Phase 11B: Decision Agent
**Duration:** 3-4 days

**Decision Logic:**
- Should we reach out? (Yes/No + confidence)
- Primary channel? (Email/LinkedIn/Both)
- Best angle/hook? (Pain point/ROI/Case study)
- Sequence length? (1-7 steps)
- Urgency? (High/Medium/Low)
- Human review needed? (Yes/No)

**Deliverables:**
- ✅ Decision agent (Claude Sonnet 4)
- ✅ Confidence scoring
- ✅ Human escalation rules
- ✅ Decision logging for audit

**Files to Create:**
- `mcp-server/src/ai/decision-agent.js`
- `mcp-server/src/ai/confidence-scorer.js`

### Phase 11C: Copywriting Agent
**Duration:** 4-5 days

**Copywriting Capabilities:**
- Generate subject lines (email)
- Generate message body (email or LinkedIn)
- Personalization based on RAG context
- Brand voice consistency
- Compliance checking
- Similar message retrieval (RAG)

**Deliverables:**
- ✅ Copywriting agent (Claude Sonnet 4)
- ✅ Brand voice guidelines enforcement
- ✅ Compliance checker
- ✅ Quality scoring

**Files to Create:**
- `mcp-server/src/ai/copywriting-agent.js`
- `mcp-server/src/ai/compliance-checker.js`
- `mcp-server/src/ai/quality-scorer.js`

### Phase 11D: Human Approval Workflow
**Duration:** 2-3 days

**Approval Features:**
- Review queue for low-confidence messages
- Approve/reject/edit interface
- Feedback loop to AI (why rejected)
- Batch approval for trusted patterns

**Deliverables:**
- ✅ Approval queue UI
- ✅ Feedback collection system
- ✅ Approval analytics

**Files to Create:**
- `desktop-app/src/pages/ApprovalQueuePage.jsx`
- `desktop-app/src/components/MessageApproval.jsx`

---

## Phase 12: Dynamic AI - Full System
**Timeline:** Weeks 18-20
**Priority:** HIGH - Complete AI path
**Status:** Not Started

### Objectives
- Response Agent (handle replies intelligently)
- Learning Agent (continuous improvement)
- Auto-send for high-confidence messages
- Production launch

### Phase 12A: Response Agent
**Duration:** 4-5 days

**Response Capabilities:**
- Sentiment analysis (positive/negative/neutral)
- Intent classification (interested, question, OOO, not_interested)
- Auto-response generation
- Calendar link auto-send
- Question answering
- Polite exit messages

**Deliverables:**
- ✅ Response agent (Claude Sonnet 4)
- ✅ Intent classifier
- ✅ Auto-response templates
- ✅ Human escalation rules

**Files to Create:**
- `mcp-server/src/ai/response-agent.js`
- `mcp-server/src/ai/intent-classifier.js`

### Phase 12B: Learning Agent
**Duration:** 5-6 days

**Learning Capabilities:**
- Campaign performance analysis
- Pattern extraction (successful hooks, subjects)
- Optimal timing analysis
- Persona-based insights
- Model retraining triggers
- Recommendation generation

**Deliverables:**
- ✅ Learning agent
- ✅ Pattern extraction algorithms
- ✅ Model update pipeline
- ✅ Insights dashboard

**Files to Create:**
- `mcp-server/src/ai/learning-agent.js`
- `mcp-server/src/ml/retrain_models.py`
- `desktop-app/src/components/AIInsightsDashboard.jsx`

### Phase 12C: Auto-Send & Production Launch
**Duration:** 3-4 days

**Production Features:**
- Auto-send for confidence > 0.9
- Rate limiting per ICP
- Error handling and retries
- Monitoring and alerts
- Rollback mechanism

**Deliverables:**
- ✅ Auto-send engine
- ✅ Monitoring dashboard
- ✅ Error alerting (Slack/email)
- ✅ Production documentation

**Files to Create:**
- `mcp-server/src/services/auto-send-engine.js`
- `desktop-app/src/pages/AIMonitoringPage.jsx`

---

## Phase 13: Enterprise Features
**Timeline:** Weeks 21+
**Priority:** LOW-MEDIUM - Scale to teams
**Status:** Not Started

### Phase 13A: Multi-User & Team Management
**Duration:** 5-6 days

**Team Features:**
- User authentication (OAuth)
- Role-based access control (Admin, SDR, Manager)
- Team workspaces
- Campaign ownership
- Activity audit log
- Permission management

**Deliverables:**
- ✅ Auth system (Auth0 or Clerk)
- ✅ RBAC implementation
- ✅ Team management UI
- ✅ Audit log viewer

### Phase 13B: Advanced AI Features
**Duration:** 6-8 days

**AI Features:**
- Lead scoring (predict close probability)
- Smart lead routing (assign to best rep)
- Predictive analytics (forecast pipeline)
- Conversation intelligence (call transcript analysis)

**Deliverables:**
- ✅ Lead scoring model
- ✅ Routing algorithm
- ✅ Forecasting dashboard

---

## Success Metrics

### Structured Path (Phase 7-9)
- ✅ Email open rate: 40-60%
- ✅ Email reply rate: 5-10%
- ✅ LinkedIn accept rate: 30-40%
- ✅ LinkedIn reply rate: 15-25%
- ✅ Meeting booked rate: 1-2%
- ✅ Campaign launch time: < 10 minutes

### Dynamic AI Path (Phase 10-12)
- ✅ Email reply rate: 15-25%
- ✅ Positive reply rate: 60-70%
- ✅ Meeting booked rate: 5-8%
- ✅ AI confidence score: > 0.8 for 80%+ messages
- ✅ Human escalation rate: < 15%
- ✅ Learning loop improvement: +10% reply rate in 30 days

---

## Technical Decisions

### Stack Additions

**Database:**
- PostgreSQL (relational data)
- Redis (queue, cache)

**Queue System:**
- BullMQ (job processing)

**Vector Database:**
- Pinecone (managed, easy) OR Weaviate (self-hosted, cheaper)

**ML/AI:**
- Claude Sonnet 4 (quality) OR GPT-4 Turbo (speed)
- OpenAI Ada-002 (embeddings)
- Scikit-learn + XGBoost (ML models)

**Email Provider:**
- Lemlist (sequences) + SendGrid (transactional)

**LinkedIn:**
- Phantombuster (safe, proven)

---

## Risk Mitigation

### Risk 1: LinkedIn Account Bans
**Mitigation:**
- Start with manual action tracking
- Conservative daily limits (20 connections/day)
- Gradual ramp-up strategy
- User disclaimer and acceptance

### Risk 2: Email Deliverability
**Mitigation:**
- Domain warming strategy
- SPF, DKIM, DMARC setup
- Monitor spam complaints
- Auto-pause on high bounce rate

### Risk 3: AI Message Quality
**Mitigation:**
- Human approval for first 50 messages per ICP
- Compliance keyword flagging
- Brand voice consistency scoring
- Confidence threshold for auto-send (0.9)

### Risk 4: Scope Creep
**Mitigation:**
- Strict phase prioritization
- MVP-first approach for AI features
- User feedback drives Phase 13+ roadmap
- Feature flags for beta features

---

## Cost Estimates

### Structured Path (Phase 6-9)

**Configuration A: Lemlist Multi-Channel (DEFAULT - ACTIVE)**
| Component | Monthly Cost |
|-----------|--------------|
| PostgreSQL (AWS RDS) | $50 |
| Redis (AWS ElastiCache) | $30 |
| Lemlist Multichannel Expert (email + LinkedIn + phone) | $149 |
| Explorium | $500 |
| **Total** | **$729** |

**Configuration B: Postmark + Phantombuster (INACTIVE - Ready when approved)**
| Component | Monthly Cost |
|-----------|--------------|
| PostgreSQL (AWS RDS) | $50 |
| Redis (AWS ElastiCache) | $30 |
| Postmark (50k emails/month) | $15 |
| Phantombuster | $69 |
| Explorium | $500 |
| **Total** | **$664** |

**Configuration C: Hybrid (Postmark Email + Lemlist LinkedIn)**
| Component | Monthly Cost |
|-----------|--------------|
| PostgreSQL (AWS RDS) | $50 |
| Redis (AWS ElastiCache) | $30 |
| Postmark (50k emails/month) | $15 |
| Lemlist Email Only | $59 |
| Explorium | $500 |
| **Total** | **$654** |

### Dynamic AI Path (Phase 10-12)

**Configuration A: Lemlist + AI (DEFAULT)**
| Component | Monthly Cost |
|-----------|--------------|
| Structured Path (Lemlist) | $729 |
| Claude Sonnet 4 API | $200 |
| Pinecone (1M vectors) | $70 |
| OpenAI Embeddings | $50 |
| Explorium (deep enrichment) | +$300 |
| ML Inference (AWS) | $50 |
| **Total** | **$1,399** |

**Configuration B: Postmark + Phantombuster + AI (Full Ownership)**
| Component | Monthly Cost |
|-----------|--------------|
| Structured Path (Postmark + PB) | $664 |
| Claude Sonnet 4 API | $200 |
| Pinecone (1M vectors) | $70 |
| OpenAI Embeddings | $50 |
| Explorium (deep enrichment) | +$300 |
| ML Inference (AWS) | $50 |
| **Total** | **$1,334** |

**Savings with Configuration B:** $65/month ($780/year)

**ROI Analysis:**
- Structured: 7% reply rate → $107 per reply
- Dynamic AI: 20% reply rate → $71 per reply (better ROI)

---

## Timeline Summary

| Phase | Duration | Start Week | End Week |
|-------|----------|------------|----------|
| Phase 6: Backend Foundation | 2 weeks | 1 | 2 |
| Phase 7: Structured Outreach | 4 weeks | 3 | 6 |
| Phase 8: Optimization | 2 weeks | 7 | 8 |
| Phase 9: CRM Integrations | 2 weeks | 9 | 10 |
| Phase 10: AI Foundation | 4 weeks | 11 | 14 |
| Phase 11: AI Agents MVP | 3 weeks | 15 | 17 |
| Phase 12: Full AI System | 3 weeks | 18 | 20 |
| **MVP (Structured Path)** | **8 weeks** | **1** | **8** |
| **Full System (Both Paths)** | **20 weeks** | **1** | **20** |

---

## Next Actions

### Immediate (This Week)
1. ✅ Stakeholder approval on dual-path strategy
2. ⏳ Set up PostgreSQL database
3. ⏳ Begin Phase 6A (data architecture)
4. ⏳ Design campaign template schema

### Next 2 Weeks (Phase 6)
1. ⏳ Complete database migrations
2. ⏳ Build campaign CRUD API
3. ⏳ Replace mock data with real API
4. ⏳ Test persistence across app restarts

### Month 2 (Phase 7)
1. ⏳ Build template library (3 email, 2 LinkedIn)
2. ⏳ Integrate Lemlist API
3. ⏳ Launch first structured campaign (internal test)
4. ⏳ Collect baseline metrics

---

**Questions for Stakeholders:**

1. **Priority:** Structured path first (reliable ROI) or parallel development?
2. **Vector DB:** Pinecone (managed, $70/mo) or Weaviate (self-hosted, more work)?
3. **LLM Provider:** Claude Sonnet 4 (quality, Anthropic) or GPT-4 Turbo (speed, OpenAI)?
4. **LinkedIn Risk:** Phantombuster (safer) or manual tracking only?
5. **AI Approval:** Human approval for all AI messages initially, or auto-send if confidence > 0.9?

---

**Made with ❤️ for the RTGS Team**
