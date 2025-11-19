# Phase 6B API Testing Guide

**Campaign Management API - PostgreSQL Backend**

---

## 🚀 Quick Start

### 1. Start PostgreSQL Database

```bash
# From Windows PowerShell or Docker Desktop:
cd "C:\path\to\claude - sales_auto_skill"
docker-compose up -d postgres

# Verify it's running:
docker ps | grep postgres
# Should show: rtgs-postgres on port 5432
```

### 2. Start API Server

```bash
# From project directory:
cd mcp-server
npm run api-server

# Server will start on http://localhost:3000
# Campaign API available at /api/campaigns/v2
```

---

## 📋 API Endpoints Reference

**Base URL:** `http://localhost:3000/api/campaigns/v2`

### Campaign Templates

#### 1. Create Template
```bash
POST /api/campaigns/v2/templates
Content-Type: application/json

{
  "name": "Welcome Email Series",
  "description": "3-email welcome sequence for new signups",
  "type": "email",
  "path_type": "structured",
  "settings": {
    "timezone": "America/New_York",
    "send_window_start": "09:00",
    "send_window_end": "17:00"
  }
}
```

**Expected Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "Welcome Email Series",
    "type": "email",
    "path_type": "structured",
    "is_active": true,
    "created_at": "2025-11-09T...",
    ...
  }
}
```

#### 2. List Templates
```bash
GET /api/campaigns/v2/templates?page=1&limit=20

# With filters:
GET /api/campaigns/v2/templates?type=email&is_active=true&page=1&limit=10
```

**Expected Response:** (200 OK)
```json
{
  "success": true,
  "data": [...templates...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

#### 3. Get Single Template
```bash
GET /api/campaigns/v2/templates/{template-uuid}
```

**Expected Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Welcome Email Series",
    "email_sequences": [...],
    "linkedin_sequences": [...],
    "instances": [...]
  }
}
```

#### 4. Update Template
```bash
PUT /api/campaigns/v2/templates/{template-uuid}
Content-Type: application/json

{
  "name": "Updated Welcome Series",
  "description": "New description",
  "is_active": true
}
```

#### 5. Delete Template (Soft Delete)
```bash
DELETE /api/campaigns/v2/templates/{template-uuid}
```

**Expected Response:** (204 No Content)

**Error if active instances:** (409 Conflict)
```json
{
  "error": "Cannot delete template with 3 active campaign(s)",
  "statusCode": 409,
  "details": {
    "activeInstances": 3
  }
}
```

---

### Campaign Instances

#### 6. Create Instance (Start Campaign)
```bash
POST /api/campaigns/v2/instances
Content-Type: application/json

{
  "template_id": "template-uuid-here",
  "name": "Q4 Welcome Campaign",
  "provider_config": {
    "email_provider": "lemlist",
    "linkedin_provider": "lemlist"
  }
}
```

**Expected Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "instance-uuid",
    "template_id": "template-uuid",
    "name": "Q4 Welcome Campaign",
    "status": "draft",
    "total_enrolled": 0,
    "total_sent": 0,
    ...
  }
}
```

#### 7. Get Instance with Statistics
```bash
GET /api/campaigns/v2/instances/{instance-uuid}
```

**Expected Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Q4 Welcome Campaign",
    "status": "active",
    "template": {...},
    "enrollments": [...],
    "metrics": {
      "enrolled": 100,
      "sent": 80,
      "open_rate": "45.00",
      "click_rate": "12.50",
      "reply_rate": "5.00"
    }
  }
}
```

#### 8. Update Instance Status
```bash
PATCH /api/campaigns/v2/instances/{instance-uuid}
Content-Type: application/json

{
  "status": "active"
}
```

**Valid Status Transitions:**
- `draft` → `active`
- `active` → `paused`, `completed`
- `paused` → `active`, `completed`
- `completed` → (none - terminal state)
- `failed` → (none - terminal state)

**Error for invalid transition:** (400 Bad Request)
```json
{
  "error": "Cannot transition from 'completed' to 'active'",
  "statusCode": 400,
  "details": {
    "currentStatus": "completed",
    "requestedStatus": "active",
    "allowedTransitions": []
  }
}
```

#### 9. Get Performance Analytics
```bash
GET /api/campaigns/v2/instances/{instance-uuid}/performance
```

**Expected Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "instance": {
      "id": "uuid",
      "name": "Q4 Welcome Campaign",
      "status": "active",
      "started_at": "2025-11-01T..."
    },
    "metrics": {
      "enrolled": 100,
      "sent": 80,
      "open_rate": "45.00",
      "click_rate": "12.50",
      "reply_rate": "5.00"
    },
    "eventBreakdown": {
      "email_sent": 240,
      "email_delivered": 230,
      "email_opened": 108,
      "email_clicked": 30,
      "email_replied": 12
    },
    "timeSeries": [
      { "date": "2025-11-01", "events": 80 },
      { "date": "2025-11-02", "events": 120 },
      ...
    ],
    "funnel": {
      "enrolled": 100,
      "sent": 240,
      "delivered": 230,
      "opened": 108,
      "clicked": 30,
      "replied": 12
    },
    "stepPerformance": [
      {
        "step": 1,
        "events": {
          "sent": 80,
          "delivered": 78,
          "opened": 35
        }
      },
      ...
    ],
    "enrollmentStatus": {
      "active": 75,
      "completed": 20,
      "paused": 5
    }
  }
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Create and Launch Campaign

```bash
# 1. Create a template
curl -X POST http://localhost:3000/api/campaigns/v2/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "type": "email",
    "path_type": "structured"
  }'
# Note the template ID from response

# 2. Create an instance
curl -X POST http://localhost:3000/api/campaigns/v2/instances \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "TEMPLATE_ID_HERE",
    "name": "Test Instance"
  }'
# Note the instance ID from response

# 3. Start the campaign
curl -X PATCH http://localhost:3000/api/campaigns/v2/instances/INSTANCE_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'

# 4. Check performance
curl http://localhost:3000/api/campaigns/v2/instances/INSTANCE_ID_HERE/performance
```

### Scenario 2: Validation Error Testing

```bash
# Invalid template type
curl -X POST http://localhost:3000/api/campaigns/v2/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "type": "invalid_type",
    "path_type": "structured"
  }'

# Expected: 400 Bad Request with validation details
```

### Scenario 3: Pagination Testing

```bash
# Create multiple templates (run 5 times with different names)
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/campaigns/v2/templates \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Campaign $i\", \"type\": \"email\", \"path_type\": \"structured\"}"
done

# Test pagination
curl "http://localhost:3000/api/campaigns/v2/templates?page=1&limit=2"
curl "http://localhost:3000/api/campaigns/v2/templates?page=2&limit=2"
```

---

## ❌ Common Error Responses

### 404 Not Found
```json
{
  "error": "Campaign template not found",
  "statusCode": 404
}
```

### 400 Bad Request (Validation)
```json
{
  "error": "Validation failed",
  "statusCode": 400,
  "details": [
    {
      "path": "name",
      "message": "Required"
    },
    {
      "path": "type",
      "message": "Invalid enum value. Expected 'email' | 'linkedin' | 'multi_channel'"
    }
  ]
}
```

### 409 Conflict
```json
{
  "error": "Cannot delete template with 3 active campaign(s)",
  "statusCode": 409,
  "details": {
    "activeInstances": 3
  }
}
```

### 500 Internal Server Error
```json
{
  "error": "Database error: connection refused",
  "statusCode": 500
}
```

---

## 🔧 Troubleshooting

### PostgreSQL Not Running
```bash
# Check if container is running
docker ps | grep postgres

# If not running, start it
docker-compose up -d postgres

# Check logs if issues
docker logs rtgs-postgres
```

### API Server Not Starting
```bash
# Check if port 3000 is in use
lsof -i :3000

# Verify environment variables
cat mcp-server/.env | grep POSTGRES

# Check Node.js version
node --version  # Should be 18+
```

### Module Import Errors
```bash
# Verify ES6 files exist
ls mcp-server/src/routes/campaigns.mjs
ls mcp-server/src/controllers/campaign-controller.mjs
ls mcp-server/src/validators/campaign-validator.mjs
ls mcp-server/src/middleware/campaign-error-handler.mjs

# Check api-server.js has import
grep "import campaignRoutes" mcp-server/src/api-server.js
```

---

## 📊 Success Criteria

Phase 6B testing is successful when:

- ✅ All 9 endpoints return expected responses
- ✅ Validation errors are caught and formatted correctly
- ✅ Status transitions follow business rules
- ✅ Pagination works correctly
- ✅ Metrics calculations are accurate
- ✅ Error handling provides clear messages
- ✅ Database constraints are enforced (unique, foreign keys)
- ✅ Soft deletes prevent deletion of active templates

---

## 🎯 Next Phase

Once testing is complete, proceed to **Phase 6C: Frontend Integration**
- Update `desktop-app/src/services/api.js`
- Replace mock data with real API calls to `/api/campaigns/v2`
- Update `CampaignsPage.jsx` with real-time metrics
