# Changelog

All notable changes to the RTGS Sales Automation project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2025-01-08

### Production Release 🎉

First production-ready release of the RTGS Sales Automation suite with complete desktop application, AI assistant, and autonomous YOLO mode.

---

## Phase 4: Production Quality Improvements (January 2025)

### Added
- **Chat Rate Limiting** - Dedicated rate limiter for AI chat (10 messages/minute)
  - Configurable via `CHAT_RATE_LIMIT_MAX` environment variable
  - User-friendly 429 responses with retry timing
  - Protects Claude API quota from exhaustion

- **PropTypes Type Safety** - Runtime validation for React components
  - Added PropTypes to 4 components (StatsCard, Badge, Button, Sidebar NavItem)
  - 27 prop validations defined
  - Development-mode runtime checks

- **Organized Mock Data** - Centralized mock data organization
  - Created `/desktop-app/src/mocks/` directory
  - Extracted ICP profiles, campaigns, contacts to separate files
  - Reduced page component sizes by 205 lines

- **Structured Logging in YOLO Mode** - Production-ready logging
  - Replaced 19 console statements with logger calls
  - Consistent log format with timestamps and levels
  - Filterable logging for production monitoring

### Changed
- Moved `.env.example` configuration to document new variables
- Updated imports in ICPPage and CampaignsPage to use centralized mocks

### Files Added
- `/desktop-app/src/mocks/icpProfiles.js`
- `/desktop-app/src/mocks/campaigns.js`
- `/desktop-app/src/mocks/contacts.js`
- `/desktop-app/src/mocks/index.js`
- `/desktop-app/src/components/StatsCard.jsx`
- `/desktop-app/src/components/Badge.jsx`
- `/desktop-app/src/components/Button.jsx`
- `/desktop-app/src/components/index.js`

---

## Phase 3: Complete Desktop Application (January 2025)

### Added
- **6 Fully Functional Desktop Views**:
  - **Dashboard** - Metrics, YOLO controls, activity feed, quick actions
  - **AI Chat** - Claude Haiku 4-5 powered assistant with conversation history
  - **Campaigns** - Performance tracking, email breakdown, campaign management
  - **Contacts** - Import, filter, bulk operations, pagination
  - **Import** - Multi-source import (CSV, Lemlist, HubSpot), field mapping
  - **ICP Profiles** - Visual profile editor, scoring thresholds, stats
  - **Settings** - API key management, integration configuration

- **AI Chat Backend**:
  - `POST /api/chat` - Chat with Claude Haiku 4-5
  - `GET /api/chat/history` - Retrieve conversation history
  - Database tables: `chat_conversations`, `chat_messages`
  - Context-aware system prompts for sales automation

- **Beautiful UI Components**:
  - Dark theme with Slate color palette (Tailwind CSS)
  - Icon-based navigation sidebar
  - Toast notifications (react-hot-toast)
  - Real-time WebSocket updates
  - Responsive design

- **State Management**:
  - Zustand store for global state
  - Current view tracking
  - YOLO mode status
  - Sidebar open/close state

### Changed
- Updated Electron main process for better window management
- Enhanced API server with WebSocket support
- Improved error handling across all views

### Files Added
- `/desktop-app/src/pages/Dashboard.jsx` (489 lines)
- `/desktop-app/src/pages/ChatPage.jsx` (254 lines)
- `/desktop-app/src/pages/CampaignsPage.jsx` (617 lines)
- `/desktop-app/src/pages/ContactsPage.jsx` (532 lines)
- `/desktop-app/src/pages/ImportPage.jsx` (463 lines)
- `/desktop-app/src/pages/ICPPage.jsx` (549 lines)
- `/desktop-app/src/pages/SettingsPage.jsx` (396 lines)
- `/desktop-app/src/components/Sidebar.jsx` (163 lines)
- `/desktop-app/src/components/TitleBar.jsx` (50 lines)

---

## Phase 2: Explorium Integration & Pipeline Testing (January 2025)

### Added
- **8 Explorium Enrichment Endpoints**:
  - `discover_companies_by_industry` - Industry-based discovery
  - `discover_contacts_by_title` - Title-based contact discovery
  - `enrich_company_by_domain` - Company firmographics and technographics
  - `enrich_contact_by_email` - Contact enrichment with verification
  - `get_company_technologies` - Technology stack detection
  - `get_company_funding_history` - Funding rounds and investors
  - `get_company_growth_signals` - Hiring, expansion, product launches
  - `get_contact_social_profiles` - LinkedIn, Twitter, GitHub profiles

- **Full Pipeline Integration Test**:
  - End-to-end workflow: Discovery → Enrichment → Sync → Outreach
  - Tests RTGS.global ICP profile
  - Verifies all worker integrations
  - Validates data quality scoring

- **Comprehensive Test Suite**:
  - `/tests/integration/test-explorium.js` - Explorium API tests
  - `/tests/integration/test-full-pipeline.js` - Full workflow test

### Changed
- Enhanced enrichment worker with Explorium integration
- Improved data quality scoring algorithm
- Updated intelligence generation with Explorium signals

---

## Phase 1: Core Implementation (November 2024)

### Added
- **MCP Server Architecture**:
  - Express REST API with 20+ endpoints
  - SQLite database with 9 tables
  - Job queue system for background processing
  - WebSocket server for real-time updates

- **4 Specialized Workers**:
  - **Lead Discovery Worker** - ICP matching and scoring
  - **Enrichment Worker** - Contact and company enrichment
  - **CRM Sync Worker** - HubSpot synchronization
  - **Outreach Worker** - Lemlist campaign management

- **YOLO Mode (Autonomous Operation)**:
  - Scheduled discovery cycles
  - Automatic enrichment pipeline
  - CRM sync with deduplication
  - Campaign enrollment and monitoring
  - Reply classification and routing
  - Safety guardrails and quality gates

- **Integration Clients**:
  - **HubSpot** - Full CRM v3 API integration
  - **Lemlist** - Campaign and lead management
  - **Apollo.io** (optional) - Additional enrichment source
  - **LinkedIn** (optional) - Profile enrichment

- **Database Tables**:
  - `jobs` - Job queue management
  - `enrichment_cache` - 30-day TTL cache
  - `rate_limits` - API rate limiting
  - `imported_contacts` - Contact storage
  - `yolo_activity` - YOLO mode activity log
  - `hubspot_sync_state` - Sync tracking
  - `hubspot_sync_log` - Sync history
  - `chat_conversations` - Chat sessions
  - `chat_messages` - Chat history

- **Utility Modules**:
  - Logger with Winston
  - Rate limiter with token bucket algorithm
  - Prototype pollution protection
  - Safe JSON parser
  - Job queue manager
  - YOLO manager

### Security
- API key protection (`.env` gitignored)
- Rate limiting (global + per-endpoint)
- Authentication middleware
- WebSocket error handling
- Safe JSON parsing
- Prototype pollution mitigation

---

## Development

### Documentation Structure
- Created `/docs` directory with organized structure
- User guides in `/docs/user-guides`
- Technical docs in `/docs/technical`
- API reference in `/docs/api-reference`
- Development docs in `/docs/development`
- Archived summaries in `/docs/archive`

### Testing
- Zero critical vulnerabilities in dependencies
- All integration tests passing
- Manual testing completed for all UI views

---

## [Unreleased]

### Planned for v1.1.0
- TypeScript migration for compile-time type safety
- E2E testing with Cypress
- Additional data source integrations
- Advanced analytics dashboard
- Performance optimization

### Planned for v2.0.0
- Multi-user support with authentication
- Team collaboration features
- Advanced workflow automation
- Mobile application (iOS/Android)

---

## Notes

### Migration from v0.x to v1.0.0
No migration required - this is the initial production release.

### Breaking Changes
None - initial release.

### Deprecations
None - initial release.

---

**For detailed technical documentation, see `/docs/`**
