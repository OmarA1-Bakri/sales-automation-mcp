# RTGS Sales Automation

**Production-ready autonomous sales prospecting system** with a beautiful Electron desktop UI, agentic AI assistant, and complete integration with HubSpot, Lemlist, Explorium, Postmark, and PhantomBuster.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Status](https://img.shields.io/badge/status-production--ready-green)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ What's New in v2.0.0 (December 2025)

### 🤖 Agentic AI Assistant
- **Tool Use Integration** - AI can directly create ICP profiles, manage campaigns, trigger discovery
- **10 Built-in Tools** - ICP CRUD, campaigns, stats, discovery, enrichment, CRM sync
- **Agentic Loop** - AI chains multiple actions autonomously until task complete
- **Action-Oriented** - AI executes actions, doesn't just explain how

### 🐳 Docker-Based Architecture
- **PostgreSQL** - Production database replacing SQLite
- **Redis** - Caching and job queue
- **Docker Compose** - One-command deployment
- **Volume Mounts** - Live code reloading in development

### 📧 Multi-Channel Outreach
- **Postmark Integration** - Email delivery with webhooks
- **PhantomBuster** - LinkedIn automation
- **HeyGen** - AI video personalization (coming soon)
- **Webhook Handlers** - Real-time delivery tracking

### 🎯 ICP Profile Management
- **Full CRUD API** - `/api/icp` endpoints
- **Visual Editor** - Firmographics, titles, scoring thresholds
- **Tier System** - Core, Expansion, Strategic profiles
- **Stats Tracking** - Discovered, enriched, enrolled counts

---

## 🚀 Quick Start

### Docker Deployment (Recommended)
```bash
# Start all services
docker-compose up -d

# Start desktop app
cd desktop-app && npm run dev
```

### Access Points
- **Desktop App**: Electron window (auto-launches)
- **API Server**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard

---

## ✨ Key Features

### 🎯 Electron Desktop Application
- **Modern UI** - React 18, Vite 5, Tailwind CSS
- **8 Complete Views** - Dashboard, Chat, Campaigns, Contacts, Import, ICP, Workflows, Settings
- **Dark Theme** - Professional Slate color palette
- **Real-Time Updates** - WebSocket integration
- **System Tray** - Background operation support

### 🤖 Agentic AI Assistant
- **Claude Integration** - Powered by Claude Haiku for speed
- **Tool Use** - Directly executes actions in the system
- **Available Tools**:
  | Tool | Description |
  |------|-------------|
  | `create_icp_profile` | Create new ICP profiles |
  | `list_icp_profiles` | View all profiles |
  | `update_icp_profile` | Modify existing profiles |
  | `delete_icp_profile` | Remove profiles |
  | `list_campaigns` | View campaigns |
  | `get_system_stats` | System metrics |
  | `discover_leads` | Trigger discovery |
  | `enrich_contacts` | Enrichment jobs |
  | `sync_to_hubspot` | CRM sync |

### ⚡ YOLO Mode (Autonomous Operation)
- **Fully Automated Pipeline** - Discovery → Enrichment → Sync → Outreach
- **Smart Scheduling** - Configurable cron cycles
- **Safety Guardrails** - Quality gates, rate limits, daily caps
- **Emergency Stop** - Pause automation instantly

### 📊 Campaign Management
- **Multi-Channel** - Email (Postmark) + LinkedIn (PhantomBuster)
- **Video Personalization** - HeyGen integration
- **Performance Tracking** - Opens, clicks, replies
- **A/B Testing** - Subject lines and content variants

### 🔐 Security & Privacy
- **API Key Hashing** - Argon2id with secure comparison
- **Rate Limiting** - Global (100 req/15min) + Chat (10 msg/min)
- **Input Validation** - Zod schemas on all endpoints
- **Security Headers** - Helmet middleware (CSP, HSTS)
- **CORS Protection** - Strict origin validation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    RTGS Sales Automation                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────────────────┐ │
│  │  Desktop App     │◄───────►│   API Server (Docker)        │ │
│  │  (Electron)      │  HTTP   │   rtgs-sales-automation      │ │
│  │                  │         │                              │ │
│  │  • React 18      │  :5173  │  • Express.js                │ │
│  │  • Zustand       │ ──────► │  • Sequelize ORM             │ │
│  │  • Tailwind CSS  │         │  • Claude AI (Tool Use)      │ │
│  │  • AI Chat UI    │  :3000  │  • Job Queue Workers         │ │
│  │  • WebSocket     │ ◄────── │  • Rate Limiters             │ │
│  └──────────────────┘         └──────────────────────────────┘ │
│                                         │                      │
│                    ┌────────────────────┼────────────────────┐ │
│                    ▼                    ▼                    ▼ │
│           ┌──────────────┐    ┌──────────────┐    ┌─────────┐ │
│           │  PostgreSQL  │    │    Redis     │    │ Volumes │ │
│           │  rtgs-postgres│    │  rtgs-redis  │    │  Data   │ │
│           │              │    │              │    │  Logs   │ │
│           │  • Contacts  │    │  • Cache     │    │         │ │
│           │  • Campaigns │    │  • Jobs      │    │         │ │
│           │  • ICP       │    │  • Sessions  │    │         │ │
│           │  • API Keys  │    │              │    │         │ │
│           └──────────────┘    └──────────────┘    └─────────┘ │
│                                                                 │
│  External Integrations:                                         │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐ │
│  │ HubSpot │ │ Lemlist │ │Explorium │ │Postmark │ │Phantom- │ │
│  │   CRM   │ │Outreach │ │Enrichment│ │  Email  │ │ Buster  │ │
│  └─────────┘ └─────────┘ └──────────┘ └─────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```
├── desktop-app/              # Electron + React frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Main view pages
│   │   ├── services/         # API client
│   │   └── stores/           # Zustand state
│   └── electron/             # Electron main process
│
├── sales-automation-api/     # Backend API server
│   ├── src/
│   │   ├── routes/           # Express route handlers
│   │   ├── models/           # Sequelize models
│   │   ├── providers/        # Integration clients
│   │   ├── middleware/       # Auth, validation, security
│   │   └── services/         # Business logic
│   └── tests/                # API tests
│
├── docs/                     # Documentation
├── data/                     # Data files (CSV imports)
├── scripts/                  # Utility scripts
└── docker-compose.yml        # Container orchestration
```

---

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Database
POSTGRES_HOST=postgres
POSTGRES_DB=rtgs_sales_automation
POSTGRES_USER=rtgs_user
POSTGRES_PASSWORD=your_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Integrations
HUBSPOT_ACCESS_TOKEN=pat-...
EXPLORIUM_API_KEY=...
POSTMARK_SERVER_TOKEN=...
PHANTOMBUSTER_API_KEY=...

# Security
API_SECRET_KEY=your_secret
```

---

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker logs rtgs-sales-automation -f

# Restart API after code changes
docker-compose restart rtgs-sales-automation

# Stop all services
docker-compose down

# Rebuild containers
docker-compose up -d --build
```

---

## 📊 Database Schema

### Key Tables
| Table | Description |
|-------|-------------|
| `contacts` | Lead/contact records |
| `campaign_templates` | Email/LinkedIn campaigns |
| `icp_profiles` | Ideal Customer Profiles |
| `api_keys` | Hashed API credentials |
| `outreach_outcomes` | Campaign performance |
| `enrichment_cache` | Explorium data cache |
| `jobs` | Background job queue |

---

## 🧪 Testing

```bash
# API tests
cd sales-automation-api
npm test

# Frontend tests
cd desktop-app
npm test

# Integration tests
cd tests/integration
node test-full-pipeline.js
```

---

## 📝 API Reference

### ICP Profiles
```
GET    /api/icp          # List all profiles
GET    /api/icp/:id      # Get single profile
POST   /api/icp          # Create profile
PATCH  /api/icp/:id      # Update profile
DELETE /api/icp/:id      # Delete profile
```

### Campaigns
```
GET    /api/campaigns    # List campaigns
POST   /api/campaigns    # Create campaign
PATCH  /api/campaigns/:id
DELETE /api/campaigns/:id
```

### Chat (AI Assistant)
```
POST   /api/chat         # Send message (with tool use)
GET    /api/chat/history # Get conversation history
```

### System
```
GET    /api/stats/system # System statistics
POST   /api/yolo/enable  # Enable YOLO mode
POST   /api/yolo/disable # Disable YOLO mode
```

---

## 🔐 Security

- **Authentication**: API key via `X-API-Key` header
- **Key Storage**: Argon2id hashing with prefix storage
- **Rate Limiting**: Express rate-limit middleware
- **Validation**: Zod schemas on all inputs
- **Headers**: Helmet security headers
- **CORS**: Whitelist-based origin control

---

## 📝 Version History

### v2.0.0 (December 2025)
- ✅ Agentic AI assistant with tool use
- ✅ Docker-based architecture (PostgreSQL + Redis)
- ✅ ICP Profile management API
- ✅ Multi-channel outreach (Postmark, PhantomBuster)
- ✅ Enhanced security (Argon2id, Zod validation)

### v1.0.0 (November 2025)
- ✅ Complete desktop application
- ✅ Basic AI chat assistant
- ✅ HubSpot, Lemlist, Explorium integrations
- ✅ YOLO mode automation

---

## 🤝 Contributing

This is a private RTGS project. Contact the development team for access.

---

## 📝 License

MIT License - RTGS Team

---

**Made with ❤️ for the RTGS Team**
