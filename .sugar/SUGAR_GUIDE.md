# Sugar Autonomous Development System - RTGS Sales Automation

## Welcome to Sugar!

Sugar is your autonomous development orchestration system for the RTGS Sales Automation project. This guide will help you understand how to use Sugar to manage the multi-week Phase 6-7 implementation.

---

## What is Sugar?

Sugar is an AI-powered task management and autonomous execution system that:

- Breaks down complex development phases into manageable tasks
- Assigns specialized agents to appropriate work
- Monitors quality and progress
- Coordinates handoffs between different development roles
- Ensures comprehensive testing and documentation

---

## Project Overview

**Project:** RTGS Sales Automation v2.0
**Current Phase:** Phase 6-7 (Backend Foundation + Multi-Provider Outreach)
**Timeline:** Weeks 1-6 (approximately 8-12 weeks total to MVP)
**Status:** Ready to begin

### Two-Path Strategy

1. **Structured Outreach** (Weeks 1-8) - Template-based campaigns
2. **Dynamic AI Outreach** (Weeks 11-20) - AI-generated personalized messages

---

## Phase 6-7 Task Breakdown

### Phase 6: Backend Foundation (Weeks 1-2)

#### Phase 6A: PostgreSQL Database Architecture
- **Duration:** 3-5 days
- **Priority:** CRITICAL
- **Agent:** Backend Developer
- **Deliverables:**
  - 6 database tables: `campaign_templates`, `campaign_instances`, `email_sequences`, `linkedin_sequences`, `campaign_enrollments`, `campaign_events`
  - Migration scripts
  - Database seeding
  - Connection pool setup

**Task File:** `/home/omar/claude - sales_auto_skill/.sugar/tasks/phase-6a-database.json`

#### Phase 6B: Campaign CRUD API
- **Duration:** 2-3 days
- **Priority:** CRITICAL
- **Agent:** Backend Developer
- **Deliverables:**
  - 9 RESTful API endpoints
  - Sequelize ORM models (6 models)
  - Input validation with Zod
  - Frontend integration (replace mock data)

**Task File:** `/home/omar/claude - sales_auto_skill/.sugar/tasks/phase-6b-crud-api.json`

---

### Phase 7: Multi-Provider Outreach (Weeks 3-6)

#### Phase 7C: Provider Abstraction Layer
- **Duration:** 2-3 days
- **Priority:** HIGH
- **Agent:** Backend Developer
- **Deliverables:**
  - `EmailProvider` interface
  - `LinkedInProvider` interface
  - Provider factory pattern
  - Configuration management
  - Provider capability matrix

**Task File:** `/home/omar/claude - sales_auto_skill/.sugar/tasks/phase-7c-provider-abstraction.json`

#### Phase 7D: Lemlist Integration (PRIMARY - ACTIVE)
- **Duration:** 4-5 days
- **Priority:** HIGH
- **Agent:** Backend Developer
- **Status:** ACTIVE by default
- **Capabilities:** Email + LinkedIn multi-channel
- **Deliverables:**
  - `LemlistEmailProvider` implementation
  - `LemlistLinkedInProvider` implementation
  - Multi-channel orchestrator
  - Webhook receiver (11 event types)
  - Data mapper

**Task File:** `/home/omar/claude - sales_auto_skill/.sugar/tasks/phase-7d-lemlist-integration.json`

#### Phase 7E: Postmark Integration (SECONDARY - INACTIVE)
- **Duration:** 2-3 days
- **Priority:** MEDIUM
- **Agent:** Backend Developer
- **Status:** INACTIVE until approval
- **Capabilities:** Email-only (batch up to 500)
- **Deliverables:**
  - `PostmarkEmailProvider` implementation
  - Webhook receiver
  - Template rendering
  - Config flag controlled

**Task File:** `/home/omar/claude - sales_auto_skill/.sugar/tasks/phase-7e-postmark-integration.json` (create when ready)

#### Phase 7F: Phantombuster Integration (SECONDARY - INACTIVE)
- **Duration:** 2-3 days
- **Priority:** MEDIUM
- **Agent:** Backend Developer
- **Status:** INACTIVE until approval
- **Capabilities:** LinkedIn-only automation
- **Deliverables:**
  - `PhantombusterLinkedInProvider` implementation
  - Phantom orchestrator
  - Rate limiting (20 connections/day conservative)
  - Config flag controlled

**Task File:** `/home/omar/claude - sales_auto_skill/.sugar/tasks/phase-7f-phantombuster-integration.json` (create when ready)

#### Phase 7G: Reply Detection and Classification
- **Duration:** 3-4 days
- **Priority:** HIGH
- **Agent:** Backend Developer + AI Integration
- **Deliverables:**
  - Reply classifier using Claude API
  - Sentiment analysis (positive/negative/neutral)
  - Intent classification (interested, not_interested, question, OOO)
  - Auto-pause on positive replies
  - Inbox UI component

**Task File:** `/home/omar/claude - sales_auto_skill/.sugar/tasks/phase-7g-reply-detection.json` (create when ready)

---

## How to Use Sugar

### 1. Starting a Task

```bash
# View all tasks
cat /home/omar/claude - sales_auto_skill/.sugar/config.json

# View specific task details
cat /home/omar/claude - sales_auto_skill/.sugar/tasks/phase-6a-database.json

# Update task status to in_progress
# (Use TodoWrite tool or manual JSON edit)
```

### 2. Task Assignment Pattern

Sugar uses specialized agent roles:

| Agent Role | Responsibilities | Assigned Phases |
|------------|------------------|-----------------|
| **Backend Developer** | Database, API, integrations | 6A, 6B, 7C, 7D, 7E, 7F |
| **Frontend Developer** | React components, UI updates | Desktop app integration |
| **QA Test Engineer** | Testing, quality assurance | All phases (testing) |
| **Tech Lead** | Architecture, code review | All phases (review) |
| **Quality Guardian** | Final review, security audit | All phases (final check) |

### 3. Quality Checkpoints

Each task goes through:

1. **Implementation** - Assigned agent completes work
2. **Testing** - QA Test Engineer validates
3. **Code Review** - Tech Lead reviews
4. **Quality Audit** - Quality Guardian final check
5. **Completion** - Mark task as completed

### 4. Tracking Progress

Use the TodoWrite tool to track progress:

```javascript
// Current task list
[
  { "content": "Set up Sugar autonomous development system", "status": "in_progress" },
  { "content": "Phase 6A: PostgreSQL database architecture", "status": "pending" },
  { "content": "Phase 6B: Campaign CRUD API", "status": "pending" },
  // ... etc
]
```

---

## Success Criteria by Phase

### Phase 6A Success
- [ ] All 6 tables created successfully
- [ ] Foreign key relationships work
- [ ] Indexes improve query performance
- [ ] Sample data seeds correctly
- [ ] Connection pool tested

### Phase 6B Success
- [ ] All 9 API endpoints return correct status codes
- [ ] Request validation works
- [ ] Frontend can CRUD templates
- [ ] API response time < 200ms
- [ ] No data loss on restart

### Phase 7C Success
- [ ] Interfaces defined and documented
- [ ] Factory creates correct providers
- [ ] Configuration loaded from environment
- [ ] Can switch providers without code changes
- [ ] Capability matrix documented

### Phase 7D Success
- [ ] Send 100+ emails via Lemlist
- [ ] LinkedIn connection requests work
- [ ] Webhook events processed correctly
- [ ] Multi-channel sequences execute
- [ ] Conditional triggers work
- [ ] Rate limiting enforced

---

## File Structure

```
/home/omar/claude - sales_auto_skill/
├── .sugar/
│   ├── config.json                          # Sugar configuration
│   ├── SUGAR_GUIDE.md                       # This file
│   └── tasks/
│       ├── phase-6a-database.json           # Database task definition
│       ├── phase-6b-crud-api.json           # CRUD API task definition
│       ├── phase-7c-provider-abstraction.json # Provider abstraction
│       ├── phase-7d-lemlist-integration.json  # Lemlist integration
│       ├── phase-7e-postmark-integration.json # (Create when ready)
│       ├── phase-7f-phantombuster-integration.json # (Create when ready)
│       └── phase-7g-reply-detection.json    # (Create when ready)
│
├── mcp-server/
│   ├── src/
│   │   ├── db/                              # Phase 6A deliverables
│   │   │   ├── schema.sql
│   │   │   ├── migrations/
│   │   │   ├── seed.sql
│   │   │   └── connection.js
│   │   ├── models/                          # Phase 6B deliverables
│   │   │   ├── CampaignTemplate.js
│   │   │   ├── CampaignInstance.js
│   │   │   ├── EmailSequence.js
│   │   │   ├── LinkedInSequence.js
│   │   │   ├── CampaignEnrollment.js
│   │   │   ├── CampaignEvent.js
│   │   │   └── index.js
│   │   ├── routes/
│   │   │   └── campaigns.js
│   │   ├── controllers/
│   │   │   └── campaign-controller.js
│   │   ├── validators/
│   │   │   └── campaign-validator.js
│   │   ├── providers/                       # Phase 7C-7F deliverables
│   │   │   ├── email-provider.interface.js
│   │   │   ├── linkedin-provider.interface.js
│   │   │   ├── provider-factory.js
│   │   │   ├── lemlist-email-provider.js
│   │   │   ├── lemlist-linkedin-provider.js
│   │   │   ├── postmark-email-provider.js
│   │   │   └── phantombuster-linkedin-provider.js
│   │   ├── services/
│   │   │   └── multi-channel-orchestrator.js
│   │   ├── webhooks/
│   │   │   ├── lemlist-webhook.js
│   │   │   ├── postmark-webhook.js
│   │   │   └── phantombuster-webhook.js
│   │   ├── mappers/
│   │   │   ├── lemlist-mapper.js
│   │   │   ├── postmark-mapper.js
│   │   │   └── phantombuster-mapper.js
│   │   └── config/
│   │       └── provider-config.js
│   └── tests/                               # QA deliverables
│
└── desktop-app/
    └── src/
        ├── services/
        │   └── api.js                       # Updated for real API
        ├── pages/
        │   └── CampaignsPage.jsx            # Updated for real data
        └── hooks/
            └── useCampaigns.js              # New custom hook
```

---

## Next Steps

### This Week (Week 1)

1. **Day 1-2:** Phase 6A - Database Architecture
   - Design PostgreSQL schema
   - Create migrations
   - Set up connection pool
   - Seed test data

2. **Day 3-5:** Phase 6B - CRUD API (start)
   - Build Sequelize models
   - Create API routes
   - Implement validation

### Next Week (Week 2)

1. **Day 1-3:** Phase 6B - CRUD API (finish)
   - Frontend integration
   - Testing
   - Deploy to staging

2. **Day 4-5:** Phase 7C - Provider Abstraction
   - Design interfaces
   - Build factory pattern
   - Document capabilities

---

## Environment Variables Needed

Add to `/home/omar/claude - sales_auto_skill/mcp-server/.env`:

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=rtgs_sales_automation
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password

# Provider Selection
EMAIL_PROVIDER=lemlist                    # lemlist | postmark
LINKEDIN_PROVIDER=lemlist-linkedin        # lemlist-linkedin | phantombuster
PROVIDER_SWITCH_ENABLED=true              # Allow runtime switching

# Lemlist (PRIMARY - ACTIVE)
LEMLIST_API_KEY=your_lemlist_api_key
LEMLIST_WEBHOOK_SECRET=your_webhook_secret
LEMLIST_TEAM_ID=your_team_id

# Postmark (SECONDARY - INACTIVE)
POSTMARK_API_KEY=your_postmark_server_token

# Phantombuster (SECONDARY - INACTIVE)
PHANTOMBUSTER_API_KEY=your_phantombuster_key
```

---

## NPM Dependencies to Install

```bash
cd /home/omar/claude - sales_auto_skill/mcp-server

# Phase 6A-6B dependencies
npm install pg pg-pool sequelize

# Phase 7E (Postmark) dependencies
npm install postmark

# Validation and utilities
npm install zod express-validator

# Already installed: axios, cors, express, dotenv
```

---

## Testing Strategy

### Unit Tests
- Each model has tests
- Each provider implementation has tests
- Each API endpoint has tests

### Integration Tests
- Database migrations
- API endpoints with database
- Provider integrations with external APIs
- Webhook event processing

### End-to-End Tests
- Create campaign template → Start instance → Enroll contacts → Send messages → Track events
- Multi-channel sequence execution
- Provider switching

---

## Metrics to Track

### Development Metrics
- Tasks completed per week
- Code coverage percentage
- API response times
- Bug count and resolution time

### Campaign Metrics (Phase 7)
- Email open rate: 40-60% (target)
- Email reply rate: 5-10% (target)
- LinkedIn accept rate: 30-40% (target)
- LinkedIn reply rate: 15-25% (target)
- Meeting booked rate: 1-2% (target)

---

## Common Commands

```bash
# Start MCP server
cd /home/omar/claude - sales_auto_skill/mcp-server
npm run api-server

# Run migrations
psql -U your_user -d rtgs_sales_automation -f src/db/migrations/001_campaign_architecture.sql

# Seed database
psql -U your_user -d rtgs_sales_automation -f src/db/seed.sql

# Run tests
npm test

# Start desktop app
cd /home/omar/claude - sales_auto_skill/desktop-app
npm run dev
```

---

## Agent Communication

When working with Sugar agents:

### Requesting Work
"Please implement Phase 6A: PostgreSQL database architecture according to the task specification in `.sugar/tasks/phase-6a-database.json`"

### Checking Status
"What's the current status of Phase 6B? Show me the API endpoints that are completed."

### Quality Review
"Please review the Phase 6A implementation for code quality, security, and performance."

### Testing
"Run comprehensive tests for Phase 6B CRUD API including unit, integration, and validation tests."

---

## Troubleshooting

### Issue: Database connection fails
**Solution:** Check PostgreSQL is running and credentials in `.env` are correct

### Issue: Provider API returns 401
**Solution:** Verify API keys in `.env` match your provider account

### Issue: Webhook events not received
**Solution:** Ensure webhook URL is publicly accessible and secret matches provider settings

### Issue: Rate limiting errors
**Solution:** Check provider-config.js settings and adjust maxEmailsPerDay/maxLinkedInPerDay

---

## Resources

### Documentation
- **ROADMAP.md** - Full 13-phase development plan
- **PLAN.md** - Executive summary and timeline
- **MULTI-PROVIDER-SUMMARY.md** - Provider comparison and architecture
- **docs/technical/** - Technical documentation

### External APIs
- **Lemlist API:** https://developer.lemlist.com/
- **Postmark API:** https://postmarkapp.com/developer
- **Phantombuster API:** https://hub.phantombuster.com/reference

---

## Success!

When Phase 6-7 is complete, you will have:

- Persistent PostgreSQL backend
- Full campaign CRUD API
- Multi-provider architecture (Lemlist PRIMARY, Postmark + Phantombuster SECONDARY)
- Email and LinkedIn outreach capabilities
- Reply detection and classification
- Real-time performance tracking
- Configuration-driven provider switching

**Ready to start?** Begin with Phase 6A!

---

**Sugar System Version:** 1.0.0
**Last Updated:** 2025-01-09
**Project:** RTGS Sales Automation v2.0
