# RTGS Sales Automation - System Architecture

**Last Updated:** November 22, 2024
**Version:** 2.0 (Post-Refactor)

---

## 📊 High-Level Overview

The RTGS Sales Automation platform consists of **two separate frontend applications** that share a **common backend API**:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                            │
├──────────────────────────┬──────────────────────────────────┤
│  Desktop App (Electron)  │  Future: Web App, Mobile App     │
│  • Visual UI for humans  │  • Browser-based access          │
│  • Non-technical users   │  • Mobile responsive             │
└──────────────────────────┴──────────────────────────────────┘
                         │
                         │ HTTP REST API (localhost:3000)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND API LAYER (Main Backend)                │
│             sales-automation-api/src/server.js               │
├─────────────────────────────────────────────────────────────┤
│ • Express HTTP REST API                                      │
│ • WebSocket support for real-time updates                   │
│ • Authentication & Authorization (API keys, JWT)            │
│ • Campaign management (create, update, track)               │
│ • Contact management (import, enrich, segment)              │
│ • YOLO Mode (autonomous operation)                          │
│ • B-mad Workflow Engine (declarative workflows)             │
│ • Job Queue (background processing)                         │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                              │
├─────────────────────────────────────────────────────────────┤
│ • HubSpot Client    • Lemlist Client    • Explorium Client  │
│ • Apollo Client     • LinkedIn Client                        │
│ • Workers (enrichment, CRM sync, outreach)                  │
│ • Circuit Breakers  • Rate Limiters    • Retry Logic        │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│              PostgreSQL Database                             │
├─────────────────────────────────────────────────────────────┤
│ • Contacts & Companies        • Campaign Templates           │
│ • Campaign Instances          • Enrollments                  │
│ • Events (email open/click)   • ICP Profiles                 │
│ • API Keys                    • Workflow States              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Directory Structure

```
rtgs-sales-automation/
├── desktop-app/                    # Electron Desktop Application
│   ├── electron/                   # Electron main process
│   │   ├── main.js                 # Window management, API server launcher
│   │   └── preload.js              # IPC bridge (security)
│   ├── src/                        # React UI
│   │   ├── pages/                  # Main views (Dashboard, Campaigns, etc.)
│   │   ├── components/             # Reusable UI components
│   │   ├── services/               # API client (calls backend)
│   │   └── store/                  # State management (Zustand)
│   └── package.json
│
├── sales-automation-api/           # Backend API (formerly "mcp-server")
│   ├── src/
│   │   ├── server.js               # MAIN ENTRY POINT (HTTP REST API)
│   │   ├── mcp-server.js           # Optional MCP server (future use)
│   │   ├── routes/                 # Express routes
│   │   ├── controllers/            # Business logic
│   │   ├── middleware/             # Auth, CSRF, rate limiting, validation
│   │   ├── models/                 # Sequelize models (database ORM)
│   │   ├── clients/                # API clients (HubSpot, Lemlist, etc.)
│   │   ├── workers/                # Background job workers
│   │   ├── services/               # Business services
│   │   ├── validators/             # Zod validation schemas
│   │   ├── utils/                  # Utilities (logger, queue, etc.)
│   │   ├── bmad/                   # B-mad workflow engine
│   │   │   ├── WorkflowEngine.ts   # YAML workflow executor
│   │   │   ├── ToolRegistry.ts     # Action-to-API mapping
│   │   │   ├── WorkflowStateManager.js  # Crash recovery
│   │   │   ├── validation-schemas.ts    # Input validation
│   │   │   └── types.ts            # TypeScript definitions
│   │   └── ai/                     # AI providers
│   │       ├── AIProvider.js       # Base class
│   │       ├── AnthropicProvider.js  # Claude integration
│   │       └── GeminiProvider.js   # Google Gemini integration
│   ├── migrations/                 # Database migrations
│   ├── tests/                      # Test suite
│   ├── bmad-library/               # B-mad workflow definitions (YAML)
│   └── package.json
│
├── bmad-workflows/                 # B-mad workflow examples
├── docs/                           # Documentation
├── scripts/                        # Deployment & utility scripts
└── package.json                    # Root workspace config
```

---

## 🔑 Key Components

### 1. Desktop App (Electron + React)

**Purpose:** Visual interface for non-technical users

**Tech Stack:**
- Electron 28 (desktop wrapper)
- React 18 (UI framework)
- Vite 5 (build tool)
- Tailwind CSS (styling)
- Zustand (state management)

**Key Features:**
- Dashboard with metrics
- Campaign builder
- Contact management
- AI chat assistant
- YOLO mode controls
- Settings & API key management

**Entry Point:** `desktop-app/electron/main.js`

**How it works:**
1. Electron launches and creates a window
2. Spawns the backend API server (`sales-automation-api/src/server.js`)
3. Loads React UI (http://localhost:5173 in dev, or bundled in production)
4. React app makes HTTP calls to backend API (localhost:3000)

---

### 2. Backend API Server (Express)

**Purpose:** Main backend orchestrating all business logic and integrations

**Tech Stack:**
- Node.js 18+
- Express (HTTP framework)
- Sequelize (PostgreSQL ORM)
- WebSocket (real-time updates)
- Zod (validation)
- Jest (testing)

**Key Features:**
- RESTful API endpoints
- JWT authentication
- CSRF protection
- Rate limiting
- Input validation (XSS, SQL injection protection)
- Campaign management
- Contact enrichment pipeline
- B-mad workflow execution
- YOLO autonomous mode
- Background job processing

**Entry Point:** `sales-automation-api/src/server.js`

**How to run:**
```bash
cd sales-automation-api
npm start              # Production
npm run dev            # Development (auto-reload)
npm run yolo           # With YOLO mode enabled
```

---

### 3. MCP Server (Optional - Future Use)

**Purpose:** Model Context Protocol interface for AI agents (like Claude Code)

**Tech Stack:**
- @modelcontextprotocol/sdk
- Stdio transport

**Status:** **PRESERVED FOR FUTURE USE** - Not currently integrated

**Entry Point:** `sales-automation-api/src/mcp-server.js`

**How to run:**
```bash
cd sales-automation-api
npm run mcp            # Start MCP server
```

**Why it exists:**
- Original idea was to enable easy UI implementation via AI agents
- Never came to fruition in v1.0
- Kept for potential future integration with Claude Desktop or Claude Code
- Would allow AI agents to control the sales automation system via tools

---

### 4. B-mad Workflow Engine

**Purpose:** Declarative YAML-based workflow orchestration

**Key Components:**
- `WorkflowEngine.ts` - Executes workflows step-by-step
- `ToolRegistry.ts` - Maps workflow actions to real API calls
- `WorkflowStateManager.js` - Persists state for crash recovery
- `validation-schemas.ts` - Zod schemas for input validation
- `types.ts` - TypeScript type definitions

**How it works:**
1. Workflow defined in YAML (e.g., `prospect-discovery.workflow.yaml`)
2. WorkflowEngine loads and validates YAML
3. Each step calls a tool from ToolRegistry
4. ToolRegistry executes real API calls (HubSpot, Lemlist, Explorium)
5. State persisted to database after each successful step
6. If workflow crashes, can resume from last successful step

**Example workflow:**
```yaml
workflow:
  metadata:
    name: prospect-discovery
    title: "Prospect Discovery Pipeline"
  steps:
    - id: define-icp
      action: create_icp_profile
      inputs:
        market_segment: { industry: "SaaS", size: "50-200" }

    - id: search-companies
      action: execute_company_search
      inputs:
        icp_profile: from_step_define-icp
```

**Security:**
- YAML loaded with `JSON_SCHEMA` (prevents code injection)
- All inputs validated with Zod
- PII automatically redacted in logs

---

## 🔄 Request Flow

### Example: User clicks "Create Campaign" in Desktop App

```
1. User Action
   Desktop App (React) → Button Click

2. Frontend Call
   services/api.js → POST /api/campaigns
   Headers: { Authorization: "Bearer <token>" }
   Body: { name, emails, schedule }

3. Backend Processing
   server.js → Express routes
   ↓
   authenticate middleware → Verify JWT token
   ↓
   validate middleware → Zod schema validation
   ↓
   csrfMiddleware → CSRF token check
   ↓
   campaignController.createCampaign()
   ↓
   - Validate inputs
   - Create campaign in database
   - Enqueue background job (if needed)
   - Return response

4. Database
   PostgreSQL → INSERT INTO campaign_templates

5. Response
   JSON response → { success: true, campaignId: "..." }

6. UI Update
   React → Update state, show success toast
```

---

## 🔐 Security Architecture

### Authentication Flow

**API Key Authentication:**
```
Client → X-API-Key header → Middleware → Argon2 hash verification → Grant access
```

**Database-backed JWT (Future):**
```
Client → JWT token → Middleware → Verify signature + check revocation → Grant access
```

### Security Layers

1. **Input Validation** (Zod schemas)
   - XSS protection
   - SQL injection prevention
   - Prototype pollution protection

2. **CSRF Protection**
   - Double-submit cookie pattern
   - Token validation on state-changing requests

3. **Rate Limiting**
   - Per-endpoint limits (e.g., 10 req/min for chat)
   - Prevents abuse and quota exhaustion

4. **Secure Logging**
   - Automatic PII redaction (emails, phones, SSNs)
   - GDPR compliant

5. **HTTPS/TLS**
   - Enforced in production
   - Helmet.js security headers

---

## 📊 Database Schema (Simplified)

```sql
-- Campaign Management
campaign_templates (id, name, email_sequence, settings)
campaign_instances (id, template_id, status, metrics)
enrollments (id, instance_id, contact_id, status)
campaign_events (id, enrollment_id, type, timestamp)

-- Contact Management
contacts (id, email, first_name, last_name, company, icp_score)
companies (id, domain, name, industry, employee_count)

-- B-mad Workflows
workflow_states (id, workflow_name, status, context, current_step)
workflow_failures (id, workflow_id, failed_step, error)

-- Auth
api_keys (id, key_hash, name, scopes, last_used_at)
```

---

## 🚀 Deployment

### Production Deployment

```bash
# 1. Build desktop app
cd desktop-app
npm run build

# 2. Start API server
cd ../sales-automation-api
npm start

# 3. Run migrations
npm run db:migrate

# 4. Start YOLO mode (optional)
npm run yolo
```

### Docker Deployment (Future)

```bash
docker-compose up -d
```

---

## 🧪 Testing Strategy

### Backend Tests
```bash
cd sales-automation-api
npm test                  # Run all tests
npm run test:coverage     # Coverage report
npm run test:watch        # Watch mode
```

**Test Coverage Targets:**
- Critical paths: 80%+
- Security-sensitive code: 95%+
- B-mad workflow engine: 65%+ (current gap)

### Manual Testing Checklist
- [ ] Campaign creation flow
- [ ] Contact import & enrichment
- [ ] YOLO mode activation
- [ ] B-mad workflow execution
- [ ] Crash recovery (kill process mid-workflow)
- [ ] API key authentication
- [ ] Rate limiting enforcement

---

## 📈 Future Enhancements

### Phase 1: MCP Integration
- [ ] Fully integrate `mcp-server.js`
- [ ] Expose tools to Claude Desktop
- [ ] Enable natural language control

### Phase 2: Web App
- [ ] Replace Electron with React web app
- [ ] Responsive design for mobile
- [ ] PWA support

### Phase 3: Advanced Workflows
- [ ] Visual workflow builder
- [ ] Conditional branching in B-mad
- [ ] Parallel step execution
- [ ] Workflow templates marketplace

### Phase 4: AI Enhancements
- [ ] AI-powered ICP discovery
- [ ] Automated email optimization
- [ ] Predictive lead scoring
- [ ] Conversational workflow creation

---

## 🎯 Key Design Decisions

### Why Separate Desktop App and API?

**Benefits:**
- **Separation of Concerns** - UI and backend can evolve independently
- **Multiple Frontends** - Can build web app, mobile app, CLI using same API
- **Testability** - Can test backend without UI
- **Scalability** - API can scale separately from UI

### Why Keep MCP Server?

**Rationale:**
- **Future AI Integration** - Will enable Claude Code/Desktop to control system
- **Low Maintenance** - Isolated file, no overhead
- **Strategic Option** - Keeps door open for AI agent ecosystem

### Why B-mad in TypeScript?

**Rationale:**
- **Type Safety** - Complex workflow logic benefits from static typing
- **Better IDE Support** - Autocomplete, refactoring tools
- **Gradual Migration** - Can coexist with JavaScript (`.js` and `.ts` mixed)

---

## 🔗 External Dependencies

### Core Services
- **PostgreSQL** - Primary database
- **Redis** (optional) - Job queue, caching
- **HubSpot API** - CRM integration
- **Lemlist API** - Email outreach
- **Explorium API** - Data enrichment
- **Apollo.io** (optional) - Lead discovery
- **Anthropic/Gemini** - AI providers

### Monitoring & Observability
- Logs: Winston logger with PII redaction
- Metrics: prom-client (Prometheus)
- Errors: Console + file logging

---

## 📞 Support & Maintenance

**Documentation:**
- `/docs` - Full documentation
- `README.md` - Quick start guide
- `ARCHITECTURE.md` - This document

**Troubleshooting:**
- Check logs: `tail -f logs/sales-automation-api.log`
- Database status: `npm run db:migrate:status`
- Test suite: `npm test`

---

**Last Review:** November 22, 2024
**Next Review:** Q1 2025 (Post-MCP integration)
