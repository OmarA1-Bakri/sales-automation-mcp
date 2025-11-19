# Codebase Structure

## Top-Level Directories

### `/desktop-app` - Frontend Application
Electron-based desktop UI with React 18, Vite 5, and Tailwind CSS

**Key Subdirectories:**
- `src/components/` - Reusable UI components (StatsCard, Badge, Button, Sidebar, TitleBar)
- `src/pages/` - Main views (Dashboard, ChatPage, CampaignsPage, ContactsPage, ImportPage, ICPPage, SettingsPage)
- `src/services/` - API client for backend communication
- `src/store/` - Zustand global state management
- `src/mocks/` - Mock data for development/testing
- `electron/` - Electron main process configuration
- `public/` - Static assets (images, icons)

**Entry Point:** `src/main.jsx` → `src/App.jsx`

### `/mcp-server` - Backend API Server
Express.js API server with worker processes, database, and integrations

**Key Subdirectories:**
- `src/api-server.js` - Main API server class (2,099 lines)
- `src/clients/` - Integration clients
  - `hubspot-client.js` - HubSpot CRM v3 API
  - `lemlist-client.js` - Lemlist campaign management
  - `explorium-client.js` - Explorium enrichment (8 endpoints)
- `src/workers/` - Background workers
  - `import-worker.js` - CSV, Lemlist, HubSpot import
  - `enrichment-worker.js` - Contact/company enrichment
  - `crm-sync-worker.js` - HubSpot synchronization
  - `outreach-worker.js` - Campaign enrollment
- `src/controllers/` - Campaign controllers (Phase 6B)
- `src/routes/` - API route definitions
  - `campaigns.js` - Campaign management routes
- `src/middleware/` - Express middleware
  - `authenticate.js` - API key authentication
  - `validate.js` - Request validation
  - `webhook-auth.js` - Webhook signature verification
- `src/models/` - Sequelize ORM models
  - Database models for campaigns, events, enrollments
- `src/services/` - Business logic services
  - `OrphanedEventQueue.js` - Background event processing
- `src/utils/` - Utility modules
  - `database.js` - SQLite database wrapper
  - `job-queue.js` - Job queue management
  - `rate-limiter.js` - Rate limiting
  - `logger.js` - Structured logging
  - `validation-schemas.js` - Zod validation schemas
  - `prototype-protection.js` - Security utilities
  - `metrics.js` - Prometheus metrics
- `src/db/` - Database layer
  - `connection.js` - Sequelize connection
  - `migrations/` - Database migrations
- `agents/` - AI agent prompts for Claude
  - `lead-finder.md`
  - `enrichment-specialist.md`
  - `outreach-coordinator.md`
  - `sales-orchestrator.md`
- `tests/` - Integration tests
  - `integration/` - Full pipeline tests

**Entry Point:** `src/api-server.js` (CLI) or `src/server.js` (MCP server)

### `/config` - Configuration Files
Project-wide configuration (not heavily used in current structure)

### `/docs` - Documentation
Comprehensive documentation for users and developers

**Key Files:**
- `user-guides/` - Quickstart, Desktop App, YOLO Mode guides
- `technical/` - Architecture, integrations, dual-path strategy
- `api-reference/` - API endpoints, Explorium API docs
- `development/` - Setup, contributing, testing guides
- `archive/` - Historical implementation summaries

### `/templates` - Email & Campaign Templates
Email sequences and campaign templates for outreach

### `/logs` - Application Logs
Runtime logs from API server and desktop app
- `mcp-server.log`
- `desktop-app.log`

### `/agents` - AI Agent Prompts
Markdown files containing Claude agent instructions

### `/commands` - Custom Slash Commands
User-defined slash commands for automation

### `/skills` - Plugin Skills
Skills and capabilities for the sales automation system

### `/hooks` - Git Hooks
Git hooks for automation and validation

### `/.sales-automation` - Runtime Data
SQLite database and cache files (gitignored)

### `/.sugar`, `/.claude`, `/.serena` - Tool Metadata
Metadata directories for various tools

## Key Configuration Files

### Root Level
- `package.json` - Root dependencies (dotenv only)
- `.env.example` - Environment variables template
- `.gitignore` - Ignored files and directories
- `Dockerfile` - Docker container configuration
- `docker-compose.yml` - Docker Compose setup
- `rtgs-sales-automation.sh` - Launch script
- `install.sh` - Installation script
- `stop.sh` - Shutdown script
- `start-postgres.sh` - PostgreSQL startup

### Desktop App
- `package.json` - Frontend dependencies (React, Vite, Electron, Tailwind)
- `vite.config.js` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `index.html` - HTML entry point

### MCP Server
- `package.json` - Backend dependencies (Express, Sequelize, Anthropic SDK)
- `jest.config.js` - Jest test configuration
- `.sequelizerc` - Sequelize CLI configuration

## Important File Patterns

### React Components
- Location: `desktop-app/src/components/*.jsx`
- Pattern: PascalCase, default export, PropTypes validation

### API Routes
- Location: `mcp-server/src/routes/*.js`
- Pattern: Express router exports

### Database Models
- Location: `mcp-server/src/models/*.js`
- Pattern: Sequelize model definitions

### Integration Tests
- Location: `mcp-server/tests/integration/*.test.js`
- Pattern: Jest test files

### Migrations
- Location: `mcp-server/migrations/*.js`
- Pattern: Sequelize migration files (timestamp-prefixed)

## Data Flow

1. **User Interaction** → Desktop App (React)
2. **API Request** → API Server (Express)
3. **Authentication** → Middleware (API key validation)
4. **Validation** → Zod schemas
5. **Business Logic** → Workers/Controllers
6. **External APIs** → Clients (HubSpot, Lemlist, Explorium)
7. **Database** → SQLite/PostgreSQL (Sequelize ORM)
8. **WebSocket** → Real-time updates to Desktop App
9. **Job Queue** → Background processing
10. **Logging** → Structured logs

## Entry Points

### Desktop App
1. Browser → `index.html`
2. Vite → `src/main.jsx`
3. React → `src/App.jsx`
4. Router → Pages based on Zustand state

### API Server
1. CLI → `src/api-server.js`
2. Express → `setupMiddleware()` → `setupRoutes()`
3. WebSocket → `setupWebSocket()`
4. Workers → Background tasks
5. YOLO Mode → `setupYoloMode()` (if enabled)