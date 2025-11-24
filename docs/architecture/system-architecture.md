# Sales Automation Platform - System Architecture

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A1[Desktop App<br/>React + Vite]
        A2[Browser<br/>Port 5173]
    end

    subgraph "API Layer - Port 3000"
        B1[Express Server<br/>server.js]
        B2[WebSocket Server<br/>ws://]
        B3[REST API<br/>/api/*]
        B4[Health & Metrics<br/>/health, /metrics]
    end

    subgraph "Middleware Stack"
        M1[Raw Body Preservation]
        M2[HTTPS Redirect]
        M3[Security Headers<br/>Helmet]
        M4[CORS + Error Handler]
        M5[Rate Limiting<br/>100/15min]
        M6[Prototype Pollution<br/>Protection]
        M7[Request Logging]
        M8[API Authentication<br/>DB + .env]
        M9[CSRF Protection<br/>Double Submit]
    end

    subgraph "MCP Server - stdio"
        C1[MCP Server<br/>mcp-server.js]
        C2[Tool Handlers<br/>90+ tools]
    end

    subgraph "AI Orchestration"
        D1[AI Provider<br/>Anthropic/Gemini]
        D2[Model Selector<br/>Haiku/Sonnet]
        D3[Tool Definitions]
        D4[Prompt Loader<br/>Agent MD files]
    end

    subgraph "Job Processing"
        E1[Job Queue<br/>SQLite]
        E2[Job Processor<br/>Background]
        E3[YOLO Manager<br/>Autonomous]
        E4[Orphaned Event<br/>Queue - Redis]
    end

    subgraph "Worker Layer"
        F1[Import Worker<br/>CSV/Lemlist/HubSpot]
        F2[Enrichment Worker<br/>Explorium]
        F3[CRM Sync Worker<br/>HubSpot]
        F4[Outreach Worker<br/>Lemlist]
        F5[Lead Discovery<br/>Worker]
    end

    subgraph "Database Layer"
        G1[(PostgreSQL<br/>Port 5432)]
        G2[(SQLite<br/>Local)]
        G3[(Redis<br/>Port 6379)]
    end

    subgraph "External APIs"
        H1[HubSpot CRM<br/>v3 API]
        H2[Lemlist<br/>Campaigns]
        H3[Explorium<br/>Enrichment]
        H4[Anthropic<br/>Claude AI]
        H5[Gemini<br/>Google AI]
        H6[Apollo.io<br/>Optional]
    end

    subgraph "Container Orchestration"
        I1[Docker Compose]
        I2[rtgs-sales-automation<br/>Container]
        I3[postgres<br/>Container]
        I4[redis<br/>Container]
        I5[Shared Network<br/>rtgs-network]
    end

    A1 --> A2
    A2 -->|HTTP/WS| B1

    B1 --> M1
    M1 --> M2
    M2 --> M3
    M3 --> M4
    M4 --> M5
    M5 --> M6
    M6 --> M7
    M7 --> M8
    M8 --> M9
    M9 --> B3

    B1 --> B2
    B3 --> E1

    C1 --> C2
    C2 --> F1
    C2 --> F2
    C2 --> F3
    C2 --> F4
    C2 --> F5

    B3 --> D1
    D1 --> D2
    D2 --> D3
    D3 --> D4

    E1 --> E2
    E2 --> F1
    E2 --> F2
    E2 --> F3
    E2 --> F4
    E3 --> E2

    F1 --> G1
    F1 --> G2
    F2 --> G1
    F2 --> G2
    F3 --> G1
    F4 --> G1
    F5 --> G1

    E4 --> G3

    F1 --> H1
    F1 --> H2
    F2 --> H3
    F3 --> H1
    F4 --> H2
    F5 --> H3
    F5 --> H6

    D1 --> H4
    D1 --> H5

    I1 --> I2
    I1 --> I3
    I1 --> I4
    I2 --> I5
    I3 --> I5
    I4 --> I5

    I2 -.->|contains| B1
    I2 -.->|contains| C1
    I3 -.->|hosts| G1
    I4 -.->|hosts| G3

    B4 --> E4

    style B1 fill:#4f46e5,stroke:#333,stroke-width:2px,color:#fff
    style C1 fill:#7c3aed,stroke:#333,stroke-width:2px,color:#fff
    style D1 fill:#dc2626,stroke:#333,stroke-width:2px,color:#fff
    style E1 fill:#059669,stroke:#333,stroke-width:2px,color:#fff
    style G1 fill:#0891b2,stroke:#333,stroke-width:2px,color:#fff
    style G2 fill:#0891b2,stroke:#333,stroke-width:2px,color:#fff
    style G3 fill:#0891b2,stroke:#333,stroke-width:2px,color:#fff
```

## 2. AI Workflow Execution Flow

```mermaid
sequenceDiagram
    participant Client as Client/Desktop App
    participant API as Express Server
    participant Queue as Job Queue<br/>(SQLite)
    participant Processor as Job Processor<br/>(Background)
    participant AI as AI Provider<br/>(Anthropic/Gemini)
    participant Tools as Tool Executors
    participant Workers as Workers<br/>(Import/Enrich/Sync)
    participant External as External APIs<br/>(HubSpot/Lemlist/Explorium)
    participant DB as PostgreSQL
    participant WS as WebSocket

    Note over Client,WS: Phase 1: Job Submission
    Client->>API: POST /api/discover<br/>{query, icpProfile, count}
    API->>API: validate(DiscoverByICPSchema)
    API->>API: executeWorkflow('discover', params)
    API->>Queue: enqueue(type, params, priority)
    Queue->>DB: INSERT INTO jobs
    Queue-->>API: jobId
    API-->>Client: {success: true, jobId, status: '/api/jobs/{id}'}
    API->>WS: broadcast('job.queued')
    WS-->>Client: Real-time update

    Note over Processor,AI: Phase 2: Background Processing (Async)
    Processor->>Queue: dequeue()
    Queue-->>Processor: job {id, type, params}
    Processor->>Queue: updateStatus(jobId, 'processing')
    Processor->>WS: broadcast('job.started')

    Note over Processor,AI: Phase 3: AI Orchestration
    Processor->>Processor: selectModel(type)<br/>haiku/sonnet
    Processor->>Processor: loadAgentPrompt(type)<br/>lead-finder.md
    Processor->>Processor: getToolDefinitions(type)

    Processor->>AI: generateText(systemPrompt,<br/>userPrompt, model, tools)

    Note over AI,Tools: Phase 4: AI Decision Making
    AI->>AI: Analyze request
    AI->>AI: Determine tools needed
    AI-->>Processor: response.content[<br/>{type: 'tool_use',<br/>name: 'explorium_enrich',<br/>input: {...}}]

    Note over Processor,External: Phase 5: Tool Execution
    Processor->>Processor: processToolCalls(response)

    loop For each tool_use
        Processor->>Tools: executeTool(name, input)

        alt HubSpot Tool
            Tools->>Workers: hubspotClient.createContact()
            Workers->>External: POST /crm/v3/objects/contacts
            External-->>Workers: {id: 'contact-123'}
            Workers-->>Tools: result
        else Lemlist Tool
            Tools->>Workers: lemlistClient.addLead()
            Workers->>External: POST /api/campaigns/{id}/leads
            External-->>Workers: {success: true}
            Workers-->>Tools: result
        else Explorium Tool
            Tools->>Workers: exploriumClient.enrichCompany()
            Workers->>External: POST /api/enrich/company
            External-->>Workers: {firmographics, signals}
            Workers-->>Tools: result
        end

        Tools->>DB: Save result
        Tools-->>Processor: toolResult
    end

    Note over Processor,WS: Phase 6: Job Completion
    Processor->>Queue: updateStatus(jobId,<br/>'completed', results)
    Processor->>DB: UPDATE jobs SET status=completed
    Processor->>WS: broadcast('job.completed')
    WS-->>Client: Real-time completion

    Note over Client,API: Phase 7: Status Polling (Alternative)
    Client->>API: GET /api/jobs/{jobId}
    API->>Queue: getStatus(jobId)
    Queue->>DB: SELECT * FROM jobs
    DB-->>Queue: job data
    Queue-->>API: {status, result, progress}
    API-->>Client: Job status response

    Note over Processor,WS: Error Handling Flow
    alt Job Fails
        Processor->>Queue: updateStatus(jobId,<br/>'failed', null, error)
        Processor->>WS: broadcast('job.failed')
        WS-->>Client: Error notification
    end
```

## 3. Data Flow Architecture

```mermaid
graph LR
    subgraph "Ingestion Layer"
        A1[CSV Upload]
        A2[Lemlist Import]
        A3[HubSpot Import]
        A4[Lead Discovery]
    end

    subgraph "Processing Pipeline"
        B1[Import Worker]
        B2[Enrichment Worker]
        B3[CRM Sync Worker]
        B4[Outreach Worker]
    end

    subgraph "Data Storage"
        C1[(PostgreSQL<br/>Campaign Data)]
        C2[(SQLite<br/>Jobs & Cache)]
        C3[(Redis<br/>Event Queue)]
    end

    subgraph "External Sync"
        D1[HubSpot CRM]
        D2[Lemlist Campaigns]
        D3[Explorium API]
    end

    A1 --> B1
    A2 --> B1
    A3 --> B1
    A4 --> B1

    B1 --> C1
    B1 --> C2

    B1 -.->|auto-enrich| B2
    B2 --> C1
    B2 --> C2
    B2 --> D3

    B2 -.->|auto-sync| B3
    B3 --> C1
    B3 --> D1

    B3 -.->|auto-outreach| B4
    B4 --> C1
    B4 --> D2

    D2 -.->|webhooks| C3
    C3 -.->|orphaned events| C1

    style B1 fill:#8b5cf6,stroke:#333,stroke-width:2px,color:#fff
    style B2 fill:#8b5cf6,stroke:#333,stroke-width:2px,color:#fff
    style B3 fill:#8b5cf6,stroke:#333,stroke-width:2px,color:#fff
    style B4 fill:#8b5cf6,stroke:#333,stroke-width:2px,color:#fff
```

## 4. YOLO Mode Autonomous Flow

```mermaid
stateDiagram-v2
    [*] --> Disabled

    Disabled --> Enabled: POST /api/yolo/enable<br/>{config}
    Enabled --> Paused: POST /api/yolo/pause
    Paused --> Enabled: POST /api/yolo/resume
    Enabled --> Disabled: POST /api/yolo/disable
    Paused --> Disabled: POST /api/yolo/disable

    state Enabled {
        [*] --> Discovery

        Discovery --> Enrichment: Auto-trigger
        note right of Discovery
            Cron: Daily 8am
            - Search ICP matches
            - Score leads
            - Store in DB
        end note

        Enrichment --> CRMSync: Auto-trigger
        note right of Enrichment
            - Explorium enrichment
            - Generate intelligence
            - Quality scoring
        end note

        CRMSync --> Outreach: Auto-trigger
        note right of CRMSync
            - Deduplicate
            - Create/update in HubSpot
            - Associate companies
        end note

        Outreach --> Monitoring: Auto-trigger
        note right of Outreach
            - Add to Lemlist campaigns
            - Start sequences
            - Track enrollment
        end note

        Monitoring --> Discovery: Cron schedule
        note right of Monitoring
            Cron: Every 2 hours
            - Check replies
            - Classify sentiment
            - Create follow-up tasks
        end note
    }

    state EmergencyStop {
        Enabled --> EmergencyStop: POST /api/yolo/emergency-stop
        EmergencyStop --> Paused: Immediate halt
        note right of EmergencyStop
            - Stop all cron jobs
            - Pause active campaigns
            - Log incident
        end note
    }
```

## 5. Database Architecture

```mermaid
erDiagram
    JOBS ||--o{ JOB_RESULTS : has
    JOBS {
        string id PK
        string type
        string status
        string priority
        float progress
        timestamp created_at
        timestamp started_at
        timestamp completed_at
        json parameters
        json result
        text error
    }

    CAMPAIGN_TEMPLATES ||--o{ CAMPAIGN_INSTANCES : spawns
    CAMPAIGN_TEMPLATES {
        uuid id PK
        uuid user_id FK
        string name
        text description
        string provider
        string status
        json structure
        json default_variables
        timestamp created_at
    }

    CAMPAIGN_INSTANCES ||--o{ CAMPAIGN_ENROLLMENTS : contains
    CAMPAIGN_INSTANCES {
        uuid id PK
        uuid template_id FK
        uuid user_id FK
        string name
        string status
        int total_enrolled
        int total_sent
        int total_delivered
        int total_opened
        int total_clicked
        int total_replied
        timestamp started_at
    }

    CAMPAIGN_ENROLLMENTS ||--o{ CAMPAIGN_EVENTS : tracks
    CAMPAIGN_ENROLLMENTS {
        uuid id PK
        uuid instance_id FK
        string contact_email
        string status
        int current_step
        json variables
        timestamp enrolled_at
        timestamp completed_at
    }

    CAMPAIGN_EVENTS {
        uuid id PK
        uuid enrollment_id FK
        string event_type
        string provider_event_id
        json event_data
        timestamp timestamp
    }

    DEAD_LETTER_EVENTS {
        uuid id PK
        string email
        string event_type
        uuid enrollment_id
        string status
        int retry_count
        timestamp created_at
        timestamp replayed_at
        json event_data
    }

    API_KEYS {
        uuid id PK
        uuid user_id FK
        string name
        string key_hash
        string key_prefix
        array scopes
        timestamp expires_at
        timestamp last_used_at
        boolean revoked
    }

    IMPORTED_CONTACTS {
        string email PK
        string source
        string status
        json data
        timestamp imported_at
        timestamp enriched_at
        timestamp synced_at
    }

    ENRICHMENT_CACHE {
        string key PK
        string source
        json data
        timestamp cached_at
        timestamp expires_at
    }

    CHAT_CONVERSATIONS ||--o{ CHAT_MESSAGES : contains
    CHAT_CONVERSATIONS {
        string id PK
        timestamp created_at
        timestamp updated_at
    }

    CHAT_MESSAGES {
        int id PK
        string conversation_id FK
        string role
        text content
        timestamp created_at
    }

    YOLO_ACTIVITY {
        int id PK
        string cycle_id
        string phase
        string status
        json metrics
        timestamp started_at
        timestamp completed_at
    }
```

## 6. Security Architecture

```mermaid
graph TB
    subgraph "Request Pipeline"
        A[Incoming Request]
        A --> B{Origin Check}
        B -->|Invalid| C[403 CORS Error]
        B -->|Valid| D[HTTPS Redirect]
        D --> E[Security Headers<br/>Helmet]
        E --> F[Rate Limiter<br/>100/15min]
        F -->|Exceeded| G[429 Too Many]
        F -->|OK| H{Route Type}

        H -->|Public| I[/health, /dashboard, /webhooks]
        H -->|API| J[Auth Check]

        J --> K{DB Auth Available}
        K -->|Yes| L[Database Auth<br/>Argon2id]
        K -->|No| M[.env Auth<br/>Fallback]

        L -->|Invalid| N[401 Unauthorized]
        M -->|Invalid| N
        L -->|Valid| O{CSRF Check}
        M -->|Valid| O

        O -->|POST/PUT/DELETE| P[Verify CSRF Token]
        O -->|GET/HEAD| Q[Process Request]

        P -->|Invalid| R[403 CSRF Error]
        P -->|Valid| Q

        Q --> S[Prototype Pollution<br/>Protection]
        S --> T[Request Handler]
    end

    subgraph "API Key Management"
        U[Create API Key]
        U --> V[Generate Secure Key<br/>32 bytes crypto]
        V --> W[Hash with Argon2id<br/>timeCost:3, mem:65536]
        W --> X[Store Hash + Prefix]
        X --> Y[Return Plain Key<br/>ONCE]
    end

    subgraph "CSRF Protection"
        Z1[Client Requests<br/>/api/csrf-token]
        Z1 --> Z2[Generate Token<br/>UUID v4]
        Z2 --> Z3[Store in Redis<br/>TTL: 1 hour]
        Z3 --> Z4[Set Cookie<br/>SameSite:Strict]
        Z4 --> Z5[Client Includes<br/>X-CSRF-Token Header]
        Z5 --> Z6[Verify: Cookie = Header<br/>AND Redis Entry Exists]
    end

    style C fill:#dc2626,color:#fff
    style G fill:#dc2626,color:#fff
    style N fill:#dc2626,color:#fff
    style R fill:#dc2626,color:#fff
    style Q fill:#059669,color:#fff
    style T fill:#059669,color:#fff
```

## Architecture Analysis

### 1. Compliance with Architectural Principles

**SOLID Principles:**
- ✅ **Single Responsibility**: Each worker has one clear purpose (Import, Enrich, CRM Sync, Outreach)
- ✅ **Open/Closed**: AI Provider abstraction allows adding new providers (Gemini, Anthropic) without modifying core
- ✅ **Liskov Substitution**: AIProvider interface enables swapping between Anthropic/Gemini transparently
- ✅ **Interface Segregation**: Clients expose only relevant methods (HubSpot, Lemlist, Explorium)
- ✅ **Dependency Inversion**: High-level modules depend on abstractions (AIProvider, not concrete Anthropic)

**Architectural Patterns:**
- ✅ **Layered Architecture**: Clear separation (API → Workers → Clients → External APIs)
- ✅ **Repository Pattern**: Database abstraction (JobQueue, Database utilities)
- ✅ **Strategy Pattern**: AI model selection (Haiku for speed, Sonnet for intelligence)
- ✅ **Observer Pattern**: Event-driven automation (import → enrich → sync → outreach)
- ✅ **Queue-Based Processing**: Background job execution with Job Queue

### 2. Component Boundaries & Coupling

**Strong Boundaries:**
- ✅ API Layer: Express server isolated from business logic
- ✅ Worker Layer: Each worker is independent, communicates via database
- ✅ Client Layer: External API clients are isolated and mockable
- ✅ Database Layer: Dual storage (PostgreSQL for production data, SQLite for jobs/cache)

**Coupling Metrics:**
- **API Server** → Workers: Low coupling (via Job Queue)
- **Workers** → Clients: Medium coupling (direct instantiation, but interface-based)
- **MCP Server** → Workers: Direct coupling (could be improved with event bus)

**Potential Circular Dependencies:**
- ⚠️ **server.js** imports Workers, Workers import Clients - linear, no circles detected
- ✅ No circular dependencies found in import analysis

### 3. Microservice Boundaries (Future Consideration)

**Potential Service Decomposition for Scale:**

1. **API Gateway Service** (Current: server.js)
   - HTTP/WebSocket endpoints
   - Authentication, CSRF, rate limiting
   - Request routing

2. **Job Processing Service** (Current: Job Queue + Workers)
   - Background job orchestration
   - Worker execution
   - Result aggregation

3. **AI Orchestration Service** (Current: AI Provider + Tool Executors)
   - AI model selection
   - Tool definition management
   - Prompt loading and execution

4. **Campaign Service** (Partially extracted)
   - Campaign management
   - Enrollment tracking
   - Event processing

5. **Integration Service** (Current: Clients)
   - HubSpot, Lemlist, Explorium adapters
   - Rate limiting per provider
   - Retry logic

### 4. Architectural Risks & Technical Debt

**Current Risks:**

1. **Risk: SQLite for High-Volume Jobs**
   - **Impact**: SQLite may become bottleneck at scale
   - **Mitigation**: Migrating job queue to PostgreSQL or Redis-based queue (BullMQ)
   - **Evidence**: `/home/omar/claude - sales_auto_skill/sales-automation-api/src/utils/job-queue.js` uses SQLite

2. **Risk: Synchronous AI Tool Execution**
   - **Impact**: Long-running tool calls block job processor
   - **Mitigation**: Implement async tool execution with timeout handling
   - **Evidence**: `processToolCalls()` in server.js processes tools sequentially

3. **Risk: Missing Circuit Breaker for External APIs**
   - **Impact**: Cascading failures from HubSpot/Lemlist/Explorium downtime
   - **Mitigation**: Implement circuit breaker pattern (e.g., using `opossum`)
   - **Evidence**: No resilience layer in client files

4. **Risk: Orphaned Event Queue Processing**
   - **Impact**: Redis memory growth if events aren't drained
   - **Mitigation**: TTL on Redis keys + monitoring queue depth
   - **Evidence**: `/home/omar/claude - sales_auto_skill/sales-automation-api/src/server.js` lines 2064-2156

**Technical Debt:**

1. **Dual Database System Complexity**
   - PostgreSQL for campaigns, SQLite for jobs
   - Should consolidate to single database (PostgreSQL)

2. **Mixed Authentication Strategy**
   - Database auth with .env fallback
   - Should complete migration to database-only auth

3. **WebSocket Broadcasting Without Rooms**
   - All clients receive all messages
   - Should implement user-scoped rooms

### 5. Scalability Assessment

**Current Limits (MVP for <10 users):**
- ✅ Single Node.js process handles all traffic
- ✅ SQLite for job queue (good for low volume)
- ✅ In-memory WebSocket connections
- ⚠️ No horizontal scaling capability

**Scaling Path (10-100 users):**
1. Migrate job queue to PostgreSQL or Redis
2. Implement WebSocket room partitioning
3. Add connection pooling for external APIs
4. Introduce job processor clustering

**Scaling Path (100+ users):**
1. Extract workers into separate service
2. Implement message queue (RabbitMQ/Kafka)
3. Horizontal scaling with load balancer
4. Distributed caching (Redis cluster)

### 6. Recommendations

**Immediate (No Breaking Changes):**
1. ✅ Add circuit breaker for external API calls
2. ✅ Implement timeout handling for AI tool execution
3. ✅ Add Prometheus metrics for job queue depth
4. ✅ Document service boundaries in code comments

**Short-term (Minor Refactoring):**
1. 🔄 Migrate job queue from SQLite to PostgreSQL
2. 🔄 Consolidate authentication to database-only
3. 🔄 Add event bus for worker decoupling
4. 🔄 Implement WebSocket rooms for user isolation

**Long-term (Major Architecture Changes):**
1. 📅 Extract workers into separate microservice
2. 📅 Implement API Gateway pattern for routing
3. 📅 Add distributed tracing (OpenTelemetry)
4. 📅 Migrate to event-driven architecture (Kafka/RabbitMQ)

---

**Conclusion**: This is a well-architected MVP following SOLID principles and clear layering. The main architectural risks are scalability-related, not design flaws. The dual database strategy and synchronous job processing are acceptable for <10 users but should be addressed before scaling.
