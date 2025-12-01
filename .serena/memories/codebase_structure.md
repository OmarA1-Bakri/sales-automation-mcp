# Codebase Structure (Updated December 2025)

## Top-Level Directories

### `/desktop-app` - Electron Frontend Application
Electron-based desktop UI with React 18, Vite 5, and Tailwind CSS

**Key Subdirectories:**
- `src/components/` - Reusable UI components (StatsCard, Badge, Button, Sidebar, TitleBar)
- `src/pages/` - Main views (Dashboard, ChatPage, CampaignsPage, ContactsPage, ImportPage, ICPPage, WorkflowsPage, SettingsPage)
- `src/services/` - API client (`api.js`) for backend communication
- `src/stores/` - Zustand global state management
- `electron/` - Electron main process configuration
- `public/` - Static assets (images, icons)

**Entry Point:** `src/main.jsx` → `src/App.jsx`

### `/sales-automation-api` - Backend API Server
Express.js API server with Docker deployment, PostgreSQL, Redis

**Key Subdirectories:**
- `src/server.js` - Main API server class (~2,100 lines) with:
  - REST API endpoints
  - Agentic AI chat with tool use (10 tools)
  - WebSocket server
  - YOLO Mode manager
- `src/routes/` - API route handlers
  - `campaigns.js` - Campaign management
  - `icp.js` - ICP profile CRUD
  - `heygen.js` - Video personalization
- `src/providers/` - Integration providers
  - `postmark/` - Email delivery
  - `phantombuster/` - LinkedIn automation
  - `hubspot/` - CRM sync
  - `explorium/` - Data enrichment
- `src/middleware/` - Express middleware
  - `authenticate.js` - API key auth (Argon2id)
  - `validate.js` - Zod request validation
  - `csrf-protection.js` - CSRF tokens
  - `webhook-auth.js` - Webhook signatures
- `src/models/` - Sequelize ORM models
  - `Contact.cjs`, `CampaignTemplate.cjs`, `ICPProfile.cjs`
  - `ApiKey.cjs`, `OutreachOutcome.cjs`
- `src/services/` - Business logic
  - `ConversationalResponder.js` - AI email replies
  - `OrphanedEventQueue.js` - Background processing
- `src/utils/` - Utilities
  - `logger.js` - Structured logging
  - `normalizers.js` - Data normalization
- `src/validators/` - Zod schemas
  - `complete-schemas.js` - All validation schemas
- `src/db/init/` - Database initialization SQL
- `tests/` - API tests

**Entry Point:** `src/server.js`

### `/docs` - Documentation (reorganized Dec 2025)
Now contains all documentation files:
- `BACKEND_SECURITY_AUDIT_REPORT.md`
- `SECURITY_FIXES_REQUIRED.md`
- `CONVERSATIONAL_RESPONDER_PLAN.md`
- `HANDOVER_NOTE.md`
- `MIGRATION.md`, `ROADMAP.md`, `CHANGELOG.md`, `DOCKER.md`
- `user-guides/`, `technical/`, `api-reference/`

### `/data` - Data Files
CSV imports and data files (moved Dec 2025)

### `/scripts` - Utility Scripts
Shell scripts for setup and operations

### `/.claude` - Claude Code Configuration
- `settings.json` - Claude Code settings
- `commands/` - Custom slash commands
- `scripts/` - Hook scripts

### `/.serena` - Serena MCP Configuration
- `memories/` - Project memory files
- `config.yaml` - Serena configuration

## Docker Architecture

### Containers (docker-compose.yml)
```
rtgs-sales-automation  - API Server (port 3000)
  └─ Volume: ./sales-automation-api:/app/sales-automation-api

rtgs-postgres          - PostgreSQL database (port 5432)
  └─ Database: rtgs_sales_automation
  └─ User: rtgs_user

rtgs-redis             - Redis cache (port 6379)
```

## Key Configuration Files

### Root Level
- `docker-compose.yml` - Container orchestration
- `Dockerfile` - API container build
- `.env` / `.env.example` - Environment variables
- `package.json` - Root package
- `README.md` - Project documentation (v2.0.0)

### Desktop App
- `package.json` - React, Vite, Electron, Tailwind deps
- `vite.config.js` - Vite build config
- `tailwind.config.js` - Tailwind CSS config
- `.env` - `VITE_API_URL`, `VITE_API_KEY`

### Sales Automation API
- `package.json` - Express, Sequelize, Anthropic SDK deps
- `jest.config.js` - Jest test config

## Important File Patterns

### React Components
- Location: `desktop-app/src/components/*.jsx`
- Pattern: PascalCase, default export, PropTypes

### API Routes
- Location: `sales-automation-api/src/routes/*.js`
- Pattern: Express router with Zod validation

### Database Models
- Location: `sales-automation-api/src/models/*.cjs`
- Pattern: Sequelize model (CommonJS for compatibility)

### Chat Endpoint with Tool Use
- Location: `sales-automation-api/src/server.js:1692-2082`
- Pattern: Agentic loop with tool execution

## Data Flow

1. **User** → Desktop App (Electron/React)
2. **API Request** → Express server (port 3000)
3. **Auth** → API key middleware (Argon2id verification)
4. **Validation** → Zod schemas
5. **Logic** → Route handlers / Workers
6. **AI** → Claude API (tool use for chat)
7. **Database** → PostgreSQL via Sequelize
8. **Cache** → Redis
9. **External** → Postmark, PhantomBuster, HubSpot, Explorium
10. **WebSocket** → Real-time updates
