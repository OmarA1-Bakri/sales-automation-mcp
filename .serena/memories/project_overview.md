# RTGS Sales Automation - Project Overview

## Purpose
Production-ready autonomous sales prospecting system with a beautiful desktop UI, AI assistant, and complete integration with HubSpot, Lemlist, and Explorium.

## Key Features
- **Desktop Application**: Modern Electron UI with React 18, Vite 5, Tailwind CSS
- **AI-Powered Assistant**: Claude Haiku 4-5 integration for real-time help
- **YOLO Mode**: Fully autonomous sales automation pipeline (Discovery → Enrichment → Sync → Outreach)
- **Campaign Management**: Visual campaign builder with performance tracking
- **Contact Management**: Import from multiple sources (CSV, Lemlist, HubSpot)
- **ICP Profile Manager**: Define ideal customer criteria
- **Integration Hub**: HubSpot CRM, Lemlist Outreach, Explorium Enrichment

## Architecture

### Main Components
1. **Desktop App** (`desktop-app/`) - Electron + React 18 + Vite 5
   - ~3,300 LOC
   - 6 complete views: Dashboard, AI Chat, Campaigns, Contacts, Import, ICP Profiles, Settings
   - Zustand for state management
   - WebSocket client for real-time updates

2. **API Server** (`mcp-server/`) - Express + Node.js
   - ~3,000 LOC
   - REST API (20+ endpoints)
   - WebSocket server for real-time broadcasting
   - Claude Haiku 4-5 integration for AI chat
   - YOLO Mode autonomous operation manager
   - Job queue for background tasks

3. **Database Layer** (`mcp-server/src/db/`) - SQLite + Sequelize
   - ~600 LOC
   - 9 tables including jobs, contacts, campaigns, chat history
   - Safe JSON parsing for corrupted data

4. **Workers** (`mcp-server/src/workers/`)
   - Import Worker: CSV, Lemlist, HubSpot import
   - Enrichment Worker: Explorium data enrichment
   - CRM Sync Worker: HubSpot synchronization
   - Outreach Worker: Campaign enrollment

5. **Integration Clients** (`mcp-server/src/clients/`)
   - HubSpot Client: Full CRM v3 API
   - Lemlist Client: Campaign and lead management
   - Explorium Client: 8 enrichment endpoints
   - Claude AI: Anthropic Messages API

## Tech Stack

### Frontend (Desktop App)
- React 18.2.0
- Vite 5.0.8
- Tailwind CSS 3.4.0
- Zustand 4.4.7 (state management)
- Framer Motion 10.16.16 (animations)
- Lucide React 0.300.0 (icons)
- React Hot Toast 2.4.1 (notifications)
- PropTypes 15.8.1 (runtime type checking)
- Axios 1.6.0

### Backend (API Server)
- Node.js 18+
- Express 4.18.0
- WebSocket (ws 8.16.0)
- Anthropic SDK 0.20.0
- Better-SQLite3 9.2.2
- Sequelize 6.37.7 (ORM)
- PostgreSQL (pg 8.16.3)
- Redis (ioredis 5.8.2)
- Node-Cron 3.0.3 (scheduling)
- Helmet 8.1.0 (security)
- Express Rate Limit 8.2.1
- Zod 3.25.76 (validation)

### Testing
- Jest 30.2.0
- Supertest 7.1.4
- Faker.js 10.1.0

### DevOps
- Docker & Docker Compose
- Electron 28.0.0
- Electron Builder 24.9.1

## Project Structure
```
/
├── desktop-app/          # Electron + React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Main views (Dashboard, Chat, etc.)
│   │   ├── services/     # API client
│   │   ├── store/        # Zustand state management
│   │   └── mocks/        # Mock data for development
│   ├── electron/         # Electron main process
│   └── public/           # Static assets
│
├── mcp-server/          # API Server + Workers
│   ├── src/
│   │   ├── api-server.js      # Main API server class
│   │   ├── clients/           # Integration clients (HubSpot, Lemlist, Explorium)
│   │   ├── controllers/       # Campaign controllers
│   │   ├── db/                # Database connection & models
│   │   ├── middleware/        # Auth, validation, webhooks
│   │   ├── models/            # Sequelize models
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic (OrphanedEventQueue)
│   │   ├── utils/             # Database, job queue, rate limiting, logging
│   │   ├── validators/        # Request validation schemas
│   │   └── workers/           # Background workers
│   ├── agents/                # AI agent prompts
│   ├── migrations/            # Database migrations
│   └── tests/                 # Integration tests
│
├── config/              # Configuration files
├── docs/                # Documentation
├── logs/                # Application logs
├── templates/           # Email/campaign templates
└── .env.example         # Environment variables template
```

## Version
**v2.0.0 (December 2025)** - Agentic AI & Docker Architecture

### Key Features
- **Agentic AI Assistant** - Claude with tool use (10 tools for ICP, campaigns, discovery, etc.)
- **Docker Architecture** - PostgreSQL + Redis + API container
- **Multi-Channel Outreach** - Postmark email + PhantomBuster LinkedIn
- **ICP Management** - Full CRUD API at `/api/icp`

## Recent Changes (Dec 2025)
- Added tool use to chat endpoint (10 tools)
- Agentic loop for autonomous multi-step actions
- Updated system prompt to be action-oriented
- Root directory cleanup (docs/, data/ folders)
- README.md updated to v2.0.0
- Serena memories updated