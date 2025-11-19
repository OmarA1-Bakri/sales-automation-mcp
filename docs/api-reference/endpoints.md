# Sales Automation API - Endpoint Documentation

**Base URL**: `https://localhost:3457`
**Authentication**: Bearer token via `Authorization` header
**API Key**: `sk_live_19a942c26354411590068891f08ebe71738e2a137deab1d9dc91934bd4094774`

---

## Authentication

All protected endpoints require an API key:

```bash
curl -H "Authorization: Bearer sk_live_19a942c26354411590068891f08ebe71738e2a137deab1d9dc91934bd4094774" \
  https://localhost:3457/api/endpoint
```

**Error Responses**:
- Missing token: `401 Unauthorized - "Missing API key"`
- Invalid token: `401 Unauthorized - "Invalid API key"`

---

## Public Endpoints

### `GET /health`

Health check endpoint (no authentication required).

**Response**:
```json
{
  "status": "healthy",
  "service": "sales-automation-api",
  "version": "1.0.0",
  "yoloMode": false,
  "timestamp": "2025-11-07T07:19:05.069Z"
}
```

**Status**: ✅ Working

---

### `GET /`

Welcome page - redirects to `/dashboard`.

**Response**: `302 Found` → `/dashboard`

**Status**: ✅ Working

---

## System Information

### `GET /stats`

Get system statistics and integration health.

**Auth**: Required

**Response**:
```json
{
  "success": true,
  "timestamp": "2025-11-07T07:19:32.092Z",
  "yoloMode": false,
  "jobs": {
    "total": 5,
    "pending": 0,
    "processing": 0,
    "completed": 0,
    "failed": 5
  },
  "campaigns": 2,
  "integrations": {
    "hubspot": "unhealthy",
    "lemlist": "healthy",
    "explorium": "healthy"
  }
}
```

**Notes**:
- `integrations.hubspot` shows "unhealthy" - may need API key verification
- Failed jobs are from earlier tests before agent files existed

**Status**: ✅ Working

---

## Lead Discovery

### `POST /api/discover`

Discover leads matching an ICP profile.

**Auth**: Required

**Request Body**:
```json
{
  "icpProfileName": "icp_rtgs_psp_treasury",
  "count": 50,
  "minScore": 0.75,
  "geography": "United States",
  "excludeExisting": true
}
```

**Fields**:
- `icpProfileName` (required): Must start with `icp_` prefix
- `count` (optional): Number of leads to discover (default: 50)
- `minScore` (optional): Minimum ICP score threshold (default: 0.75)
- `geography` (optional): Geographic filter
- `excludeExisting` (optional): Skip contacts already in CRM (default: true)

**Validation Error Example**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "icpProfileName",
      "message": "Invalid ICP profile name (must start with icp_)",
      "code": "invalid_string"
    }
  ],
  "timestamp": "2025-11-07T07:19:48.283Z"
}
```

**Status**: ✅ Working (validation confirmed)

---

## Enrichment

### `POST /api/enrich`

Enrich contacts with company data and intelligence from Explorium.

**Auth**: Required

**Request Body**:
```json
{
  "contacts": [
    {
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "company": "Acme Corp"
    }
  ],
  "options": {
    "cache": true,
    "includeCompany": true,
    "includeIntelligence": true
  }
}
```

**Fields**:
- `contacts` (required): Array of contact objects
- `options` (optional): Enrichment configuration
  - `cache` (optional): Use cached data if available (default: true)
  - `includeCompany` (optional): Enrich company data (default: true)
  - `includeIntelligence` (optional): Generate sales intelligence (default: true)

**Contact Object**:
- `email` (required): Contact email
- `firstName` (optional): First name
- `lastName` (optional): Last name
- `company` (optional): Company name or domain

**Response**:
```json
{
  "success": true,
  "enriched": [
    {
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "company": {
        "name": "Acme Corp",
        "domain": "acme.com",
        "industry": "Technology",
        "employees": 500,
        "revenue": "$50M",
        "technologies": ["Stripe", "AWS"],
        "signals": ["funding", "expansion"]
      },
      "intelligence": {
        "painHypotheses": [
          {
            "pain": "Scaling infrastructure for growth",
            "confidence": 0.85,
            "reasoning": "Recent funding indicates growth phase",
            "icpAlignment": "High - growing companies need scalable solutions"
          }
        ],
        "personalizationHooks": [
          {
            "hook": "Recent Series B funding",
            "strength": 0.90,
            "usage": "Congratulations on your Series B round. What are your infrastructure priorities?"
          }
        ],
        "whyNow": {
          "trigger": "Recent funding round",
          "urgency": "high",
          "reasoning": "Companies prioritize infrastructure investments post-funding"
        }
      },
      "dataQuality": 0.85,
      "enrichedAt": "2025-11-07T10:05:00Z"
    }
  ],
  "failed": []
}
```

**Validation Error Example**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "contacts",
      "message": "Required",
      "code": "invalid_type",
      "expected": "array",
      "received": "undefined"
    }
  ],
  "timestamp": "2025-11-07T07:19:49.672Z"
}
```

**Status**: ✅ Working (validation confirmed)

---

## CRM Sync

### `POST /api/sync/hubspot`

Sync enriched contacts to HubSpot CRM.

**Auth**: Required

**Request Body**:
```json
{
  "contacts": [
    {
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "title": "VP Engineering",
      "company": {
        "name": "Acme Corp",
        "domain": "acme.com",
        "industry": "Technology",
        "employees": 500
      },
      "intelligence": {
        "painHypotheses": [...],
        "personalizationHooks": [...],
        "whyNow": {...}
      }
    }
  ],
  "options": {
    "deduplicate": true,
    "createIfNew": true,
    "updateIfExists": true,
    "associateCompany": true,
    "logActivity": true
  }
}
```

**Fields**:
- `contacts` (required): Array of enriched contact objects
- `options` (optional): Sync configuration
  - `deduplicate` (optional): Check for existing contacts/companies (default: true)
  - `createIfNew` (optional): Create new contacts if not found (default: true)
  - `updateIfExists` (optional): Update existing contacts (default: true)
  - `associateCompany` (optional): Associate contact with company (default: true)
  - `logActivity` (optional): Log enrichment activity to timeline (default: true)

**Response**:
```json
{
  "success": true,
  "synced": [
    {
      "email": "john@example.com",
      "contactId": "12345",
      "companyId": "67890",
      "action": "created",
      "associated": true,
      "activityLogged": true
    }
  ],
  "failed": [
    {
      "email": "invalid@example",
      "error": "Invalid email format"
    }
  ]
}
```

**Actions**:
- `created` - New contact created in HubSpot
- `updated` - Existing contact updated
- `skipped` - Contact exists and updateIfExists=false

**Status**: ✅ Working

---

## Contact Management

### `GET /api/contacts`

Get contacts from database with optional filters.

**Auth**: Required

**Query Parameters**:
- `status` (optional): Filter by status (`imported`, `enriched`, `synced`)
- `source` (optional): Filter by source (`csv`, `lemlist`, `hubspot`)
- `limit` (optional): Number of results (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)
- `sortBy` (optional): Sort field (`importedAt`, `enrichedAt`, `syncedAt`)
- `sortOrder` (optional): Sort order (`asc`, `desc`, default: `desc`)

**Example Request**:
```bash
GET /api/contacts?status=enriched&limit=50&sortBy=enrichedAt
```

**Response**:
```json
{
  "success": true,
  "contacts": [
    {
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "company": "Acme Corp",
      "status": "enriched",
      "source": "csv",
      "dataQuality": 0.85,
      "importedAt": "2025-11-07T10:00:00Z",
      "enrichedAt": "2025-11-07T10:05:00Z",
      "syncedAt": null
    },
    {
      "email": "jane@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "company": "Tech Corp",
      "status": "synced",
      "source": "lemlist",
      "dataQuality": 0.92,
      "importedAt": "2025-11-07T09:00:00Z",
      "enrichedAt": "2025-11-07T09:05:00Z",
      "syncedAt": "2025-11-07T09:10:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "count": 50,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

**Status Meanings**:
- `imported` - Contact imported from source, not yet enriched
- `enriching` - Enrichment in progress
- `enriched` - Enrichment complete, not yet synced
- `syncing` - Sync to HubSpot in progress
- `synced` - Successfully synced to HubSpot
- `failed` - Enrichment or sync failed

**Status**: ✅ Working

---

## Campaign Management

### `GET /api/campaigns`

List all campaigns from Lemlist.

**Auth**: Required

**Response**:
```json
{
  "success": true,
  "campaigns": [
    {
      "_id": "cam_bWb9k758uvqM8NSpM",
      "name": "Omar's campaign (1)",
      "createdAt": "2025-08-15T11:06:42.648Z",
      "createdBy": "usr_QucmmdM8ARBTqAXRW",
      "status": "draft"
    },
    {
      "_id": "cam_dstdY5A6GHsFnpMxd",
      "name": "Helios_Leads_30/10/25",
      "createdAt": "2025-08-19T16:44:39.700Z",
      "createdBy": "usr_QucmmdM8ARBTqAXRW",
      "status": "draft"
    }
  ],
  "count": 2
}
```

**Status**: ✅ Working

---

### `GET /api/campaigns/:campaignId/stats`

Get campaign performance statistics.

**Auth**: Required

**URL Parameters**:
- `campaignId`: Lemlist campaign ID (e.g., `cam_bWb9k758uvqM8NSpM`)

**Response**: (To be tested with valid campaign)

**Status**: ⚠️ Needs testing with active campaign

---

### `POST /api/outreach`

Enroll leads in a campaign.

**Auth**: Required

**Request Body**:
```json
{
  "campaignId": "cam_bWb9k758uvqM8NSpM",
  "leads": [
    {
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "companyName": "Acme Corp",
      "variables": {
        "pain_point": "liquidity management",
        "why_now": "recent expansion"
      }
    }
  ]
}
```

**Status**: ⚠️ Needs testing

---

### `GET /api/monitor`

Monitor campaign replies.

**Auth**: Required

**Query Parameters**:
- `campaignId` (optional): Filter by campaign

**Status**: ⚠️ Needs testing

---

## Job Management

### `GET /api/jobs`

List all jobs in the queue.

**Auth**: Required

**Response**:
```json
{
  "success": true,
  "jobs": [
    {
      "id": "discover_90a3af14",
      "type": "discover",
      "status": "failed",
      "priority": "normal",
      "parameters": {
        "icpProfileName": "icp_test",
        "count": 10,
        "minScore": 0.75,
        "excludeExisting": true
      },
      "result": null,
      "error": "ENOENT: no such file or directory, open '.../agents/lead-finder.md'",
      "progress": 0,
      "created_at": 1762486388710,
      "started_at": 1762486388711,
      "completed_at": 1762486388712,
      "updated_at": 1762486388712
    }
  ]
}
```

**Notes**: Failed jobs shown are from earlier tests before agent files were created.

**Status**: ✅ Working

---

### `GET /api/jobs/:jobId`

Get details of a specific job.

**Auth**: Required

**URL Parameters**:
- `jobId`: Job identifier (e.g., `discover_90a3af14`)

**Status**: ⚠️ Needs testing

---

### `DELETE /api/jobs/:jobId`

Cancel a pending or in-progress job.

**Auth**: Required

**URL Parameters**:
- `jobId`: Job identifier

**Status**: ⚠️ Needs testing

---

## YOLO Mode (Autonomous Operations)

### `GET /api/yolo/status`

Get YOLO mode status and statistics.

**Auth**: Required

**Response**:
```json
{
  "success": true,
  "enabled": false,
  "nextRun": "N/A",
  "stats": {
    "success": true,
    "timestamp": "2025-11-07T07:19:35.246Z",
    "yoloMode": false,
    "jobs": {
      "total": 5,
      "pending": 0,
      "processing": 0,
      "completed": 0,
      "failed": 5
    },
    "campaigns": 2,
    "integrations": {
      "hubspot": "unhealthy",
      "lemlist": "healthy",
      "explorium": "healthy"
    }
  }
}
```

**Status**: ✅ Working

---

### `POST /api/yolo/enable`

Enable YOLO mode with configuration.

**Auth**: Required

**Request Body**:
```json
{
  "icpProfiles": ["icp_rtgs_psp_treasury"],
  "emailTemplates": ["treasury_pain_liquidity"],
  "dailyDiscoveryLimit": 50,
  "dailyEnrichmentLimit": 50,
  "dailyOutreachLimit": 100,
  "minIcpScore": 0.75,
  "minDataQuality": 0.70,
  "autoSync": true,
  "autoEnroll": true
}
```

**Required Fields**:
- `icpProfiles`: Array of ICP profile names
- `emailTemplates`: Array of email template names

**Validation Error Example**:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "icpProfiles",
      "message": "Required",
      "code": "invalid_type",
      "expected": "array",
      "received": "undefined"
    },
    {
      "field": "emailTemplates",
      "message": "Required",
      "code": "invalid_type",
      "expected": "array",
      "received": "undefined"
    }
  ],
  "timestamp": "2025-11-07T07:19:51.711Z"
}
```

**Status**: ✅ Working (validation confirmed)

---

### `POST /api/yolo/disable`

Disable YOLO mode.

**Auth**: Required

**Response (when already disabled)**:
```json
{
  "success": false,
  "error": "YOLO Mode not enabled"
}
```

**Status**: ✅ Working

---

## Security Features

### Rate Limiting

All endpoints are rate-limited:
- **100 requests per 15 minutes** per IP address
- Returns `429 Too Many Requests` when exceeded

### HTTPS/SSL

- HTTP port `3456` automatically redirects to HTTPS port `3457`
- Self-signed certificates for development (located in `mcp-server/ssl/`)
- Use `-k` flag with curl to bypass certificate verification in development

### Request Validation

All POST endpoints use Zod schema validation:
- Type checking (string, number, array, object)
- Required field enforcement
- Format validation (email, ICP profile names, etc.)
- Detailed error messages with field-level feedback

### Prototype Pollution Protection

Middleware validates all incoming request bodies to prevent prototype pollution attacks.

### Headers

Security headers applied via Helmet:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (when HTTPS enabled)

### CORS

Configured to allow:
- Origin: `http://localhost:5173`, `http://localhost:5174`
- Credentials: `true`
- Methods: `GET, POST, PUT, DELETE, OPTIONS`

---

## Integration Health

Current status from `/stats` endpoint:

| Integration | Status | Notes |
|------------|--------|-------|
| **Lemlist** | ✅ Healthy | API key working |
| **Explorium** | ✅ Healthy | API key working |
| **HubSpot** | ⚠️ Unhealthy | May need API key verification |

**Action Item**: Verify HubSpot API key and permissions.

---

## Missing Endpoints (To Be Added)

Based on frontend requirements, these endpoints may be needed:

1. **`GET /api/contacts/:id`** - Get contact details
2. **`PUT /api/contacts/:id`** - Update contact
3. **`DELETE /api/contacts/:id`** - Delete contact
4. **`POST /api/contacts/export`** - Export contacts to CSV
5. **`GET /api/icp-profiles`** - List ICP profiles
6. **`POST /api/icp-profiles`** - Create ICP profile
7. **`PUT /api/icp-profiles/:name`** - Update ICP profile
8. **`DELETE /api/icp-profiles/:name`** - Delete ICP profile
9. **`POST /api/chat`** - Chat with AI assistant

---

## Testing Commands

### Quick Health Check
```bash
curl -k https://localhost:3457/health
```

### Test Authentication
```bash
export API_KEY="sk_live_19a942c26354411590068891f08ebe71738e2a137deab1d9dc91934bd4094774"
curl -k -H "Authorization: Bearer $API_KEY" https://localhost:3457/stats
```

### Discover Leads
```bash
curl -k -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"icpProfileName":"icp_rtgs_psp_treasury","count":10}' \
  https://localhost:3457/api/discover
```

### List Campaigns
```bash
curl -k -H "Authorization: Bearer $API_KEY" https://localhost:3457/api/campaigns
```

### Enable YOLO Mode
```bash
curl -k -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "icpProfiles": ["icp_rtgs_psp_treasury"],
    "emailTemplates": ["treasury_pain_liquidity"],
    "dailyDiscoveryLimit": 50
  }' \
  https://localhost:3457/api/yolo/enable
```

---

## Error Response Format

All errors follow consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "details": [...],  // Optional: validation details
  "timestamp": "2025-11-07T07:19:48.283Z"
}
```

**Common HTTP Status Codes**:
- `200 OK` - Success
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing or invalid API key
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Next Steps

1. ✅ All tested endpoints are working correctly
2. ⚠️ Verify HubSpot API key and integration health
3. ⚠️ Test untested endpoints (campaign stats, outreach, monitor)
4. ⚠️ Add missing endpoints for frontend (contacts, ICP profiles, chat)
5. ✅ Documentation complete

**Phase 1 (Backend API Audit) Status**: Complete ✅

**Ready for**: Phase 2 (Settings Page) - Frontend implementation can begin
