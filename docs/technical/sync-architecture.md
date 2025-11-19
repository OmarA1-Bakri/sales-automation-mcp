# HubSpot Bi-Directional Sync Architecture

## Overview

This document describes the automatic bi-directional synchronization system between the local database and HubSpot CRM.

## Architecture Pattern

**Option B: Automatic Workflow with Webhooks**

```
HubSpot (Source of Truth)
    ↓ (1. Import)
Local Database (Staging)
    ↓ (2. Auto-Enrich)
Enriched Database
    ↓ (3. Auto-Sync)
HubSpot (Updated with enrichment)
    ↓ (4. Webhook on change)
Re-import changed contacts
```

## Data Flow

### Phase 1: Import (Current)
- **Trigger:** Manual import from CSV, Lemlist, or HubSpot
- **Action:** Store contacts in local SQLite database
- **Status:** `imported`
- **Tables:** `imported_contacts`

### Phase 2: Enrichment (In Progress)
- **Trigger:** Automatic after import OR manual via API
- **Action:**
  - Fetch company data from Explorium
  - Generate intelligence (pain points, personalization hooks)
  - Calculate data quality score
- **Status:** `enriched`
- **Cache:** 30-day TTL in `enrichment_cache` table

### Phase 3: Sync to HubSpot (In Progress)
- **Trigger:** Automatic after enrichment OR manual via API
- **Action:**
  - Deduplicate by email (contacts) and domain (companies)
  - Create or update contact in HubSpot
  - Associate contact with company
  - Log enrichment activity to timeline
- **Status:** `synced`
- **Tables:** `crm_sync_log`

### Phase 4: Webhook Re-import (Planned)
- **Trigger:** HubSpot webhook notification on contact change
- **Action:** Re-import changed contact from HubSpot
- **Status:** `imported` (re-starts cycle if significant change)

## Workers

### ImportWorker
**Location:** `/mcp-server/src/workers/import-worker.js`
- Imports from CSV, Lemlist, HubSpot
- Validates and deduplicates
- Stores in database
- Emits `contacts-imported` event

### EnrichmentWorker
**Location:** `/mcp-server/src/workers/enrichment-worker.js`
- Fetches company data from Explorium
- Generates intelligence with Claude AI
- Calculates data quality score
- Caches results for 30 days
- Emits `contacts-enriched` event

### CRMSyncWorker
**Location:** `/mcp-server/src/workers/crm-sync-worker.js`
- Deduplicates contacts and companies
- Creates or updates in HubSpot
- Associates contacts with companies
- Logs activities to HubSpot timeline
- Tracks sync status in database

## API Endpoints

### Import Endpoints
- `POST /api/import/csv` - Import from CSV
- `POST /api/import/lemlist` - Import from Lemlist
- `POST /api/import/hubspot` - Import from HubSpot

### Enrichment Endpoint
- `POST /api/enrich` - Enrich contacts

### Sync Endpoint
- `POST /api/sync/hubspot` - Sync to HubSpot

### Data Endpoint
- `GET /api/contacts` - Get contacts with filters

### Webhook Endpoint (Planned)
- `POST /webhooks/hubspot` - Receive HubSpot change notifications

## Database Schema

### contacts
- `email` (PK)
- `first_name`
- `last_name`
- `company`
- `status` (imported, enriched, synced)
- `source` (csv, lemlist, hubspot)
- `imported_at`
- `enriched_at`
- `synced_at`

### enrichment_cache
- `type` (contact, company)
- `key` (email, domain)
- `data` (JSON)
- `cached_at`

### crm_sync_log
- `type` (contact, company)
- `identifier` (email, domain)
- `hubspot_id`
- `synced_at`

## Configuration

### Environment Variables
```env
# Auto-enrich imported contacts
AUTO_ENRICH_ON_IMPORT=true

# Auto-sync enriched contacts
AUTO_SYNC_AFTER_ENRICH=true

# HubSpot webhook secret
HUBSPOT_CLIENT_SECRET=your_secret_here
```

## Workflow States

### Contact States
1. **imported** - Contact imported from source
2. **enriching** - Enrichment in progress
3. **enriched** - Enrichment complete
4. **syncing** - Sync to HubSpot in progress
5. **synced** - Successfully synced to HubSpot
6. **failed** - Enrichment or sync failed

## Error Handling

### Enrichment Failures
- Cache lookup first to avoid re-enriching
- Log error but continue with other contacts
- Mark contact as `failed` with error message
- Retry after 1 hour

### Sync Failures
- Check for existing contact in HubSpot first
- Log error but continue with batch
- Mark contact as `failed` with error message
- Retry after 15 minutes

## Performance Characteristics

- **Import:** 100 contacts/minute
- **Enrichment:** 50 contacts/minute (Explorium rate limit)
- **Sync:** 100 contacts/minute (HubSpot batch API)
- **Webhook:** Real-time (< 1 second latency)

## Future Enhancements

### Phase 5 (Planned)
- [ ] Webhook endpoint implementation
- [ ] Automatic re-import on change
- [ ] Intelligent re-enrichment triggers
- [ ] Conflict resolution strategies
- [ ] Manual override capabilities

### Phase 6 (Planned)
- [ ] Bi-directional field mapping
- [ ] Custom field sync
- [ ] Activity sync (emails, calls, meetings)
- [ ] Deal association
- [ ] List membership sync
