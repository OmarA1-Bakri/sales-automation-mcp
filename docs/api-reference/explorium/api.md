# Explorium API - Comprehensive Integration Documentation

**Research Date**: 2025-11-08
**API Key Provided**: `76de0beb57e3440faf85f5691be52b4a`
**Base URL**: `https://api.explorium.ai`

---

## Table of Contents

1. [Authentication](#authentication)
2. [API Endpoints Overview](#api-endpoints-overview)
3. [Contact Enrichment](#contact-enrichment)
4. [Company Enrichment](#company-enrichment)
5. [Business Discovery & Matching](#business-discovery--matching)
6. [Prospect Discovery & Matching](#prospect-discovery--matching)
7. [Rate Limits](#rate-limits)
8. [Error Handling](#error-handling)
9. [Node.js Code Examples](#nodejs-code-examples)
10. [Best Practices](#best-practices)

---

## Authentication

### Method
Explorium API uses **API Key authentication** via HTTP headers.

### Header Format
```javascript
{
  'api_key': 'YOUR_API_KEY_HERE',
  'Content-Type': 'application/json'
}
```

**Note**: The header name can be either `api_key` or `API_KEY` (both are accepted).

### Getting Your API Key
1. Log in to the Explorium Admin Portal at https://admin.explorium.ai
2. Navigate to **Access & Authentication > Getting Your API Key**
3. Click **"Show Key"** to reveal your API key
4. Use the **"Copy Key"** button to copy it securely

### Your API Key
```
76de0beb57e3440faf85f5691be52b4a
```

---

## API Endpoints Overview

### Base URL
```
https://api.explorium.ai
```

### API Version
All endpoints use `/v1/` prefix.

### Endpoint Categories

| Category | Purpose | Key Endpoints |
|----------|---------|---------------|
| **Businesses** | Company search, matching, enrichment | `/v1/businesses`, `/v1/businesses/bulk-enrich`, `/v1/businesses/firmographics/enrich`, `/v1/businesses/technographics/enrich` |
| **Prospects** | Contact search, matching, enrichment | `/v1/prospects`, `/v1/prospects/contacts_information/enrich`, `/v1/prospects/bulk-enrich` |
| **Events** | Business & prospect activity tracking | `/v1/businesses/events`, `/v1/prospects/events` |
| **Enrichments** | Detailed data enrichment | Various `/enrich` endpoints |

---

## Contact Enrichment

### Endpoint: Enrich Contact Information

**URL**: `POST https://api.explorium.ai/v1/prospects/contacts_information/enrich`

**Purpose**: Retrieve verified contact details including emails, phone numbers, and professional information.

### Request Schema

```typescript
{
  prospect_id: string;        // Required: 40-character hex string from Match Prospects
  request_context?: object;   // Optional: Metadata for the request
  parameters?: object;        // Optional: Additional configuration
}
```

### Request Example

```javascript
const fetch = require('node-fetch');

async function enrichContact(prospectId) {
  const response = await fetch('https://api.explorium.ai/v1/prospects/contacts_information/enrich', {
    method: 'POST',
    headers: {
      'api_key': '76de0beb57e3440faf85f5691be52b4a',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prospect_id: prospectId,
      request_context: {},
      parameters: {}
    })
  });

  const data = await response.json();
  return data;
}

// Usage
enrichContact('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0')
  .then(result => console.log(result))
  .catch(error => console.error('Error:', error));
```

### Response Schema

```typescript
{
  response_context: {
    correlation_id: string;           // Unique request identifier
    request_status: 'success' | 'miss' | 'failure';
    time_took_in_seconds: number;
  },
  data: {
    emails: Array<{                   // All email addresses found
      email: string;
      type: string;
      verified: boolean;
    }>,
    professions_email: string;        // Primary work email
    professional_email_status: 'valid' | 'catch-all' | 'invalid',
    phone_numbers: Array<{            // All phone numbers
      number: string;
      type: string;
      verified: boolean;
    }>,
    mobile_phone: string;             // Mobile contact number
  },
  entity_id: string;                  // 32 or 40-character hex identifier
}
```

### Response Example

```json
{
  "response_context": {
    "correlation_id": "abc123-def456-ghi789",
    "request_status": "success",
    "time_took_in_seconds": 2.5
  },
  "data": {
    "emails": [
      {
        "email": "john.doe@example.com",
        "type": "work",
        "verified": true
      }
    ],
    "professions_email": "john.doe@example.com",
    "professional_email_status": "valid",
    "phone_numbers": [
      {
        "number": "+1-555-123-4567",
        "type": "mobile",
        "verified": true
      }
    ],
    "mobile_phone": "+1-555-123-4567"
  },
  "entity_id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
}
```

### Fields Mapping for Sales Automation

Based on the CLAUDE.md architecture document, map these fields:

```javascript
const contact = {
  // From enrichment response
  email: data.professions_email,
  emailVerified: data.professional_email_status === 'valid',
  phoneNumber: data.mobile_phone,

  // Additional fields (may need separate prospect enrichment)
  title: '<from prospect enrichment>',
  seniority: '<from prospect enrichment>',
  department: '<from prospect enrichment>',
  linkedinUrl: '<from prospect enrichment>',
  location: '<from prospect enrichment>',
  confidenceScore: '<calculated from request_status>'
};
```

---

## Company Enrichment

### Endpoint: Bulk Business Enrichment

**URL**: `POST https://api.explorium.ai/v1/businesses/bulk-enrich`

**Purpose**: Enrich up to 50 businesses simultaneously with firmographics, technographics, and business intelligence.

### Request Schema

```typescript
{
  business_ids: string[];       // Array of up to 50 business IDs
  request_context?: object;     // Optional metadata
  parameters?: object;          // Optional configuration
}
```

### Request Example

```javascript
async function bulkEnrichBusinesses(businessIds) {
  const response = await fetch('https://api.explorium.ai/v1/businesses/bulk-enrich', {
    method: 'POST',
    headers: {
      'api_key': '76de0beb57e3440faf85f5691be52b4a',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      business_ids: businessIds
    })
  });

  const data = await response.json();
  return data;
}

// Usage
bulkEnrichBusinesses([
  '8adce3ca1cef0c986b22310e369a0793',
  'a34bacf839b923770b2c360eefa26748'
])
  .then(result => console.log(result))
  .catch(error => console.error('Error:', error));
```

### Response Format

Returns enriched data with firmographics, financials, and workforce attributes suitable for analytics, CRM, or decision-making processes.

---

### Endpoint: Firmographics Enrichment

**URL**: `POST https://api.explorium.ai/v1/businesses/firmographics/enrich`

**Purpose**: Get essential business details like revenue, company size, industry classification.

### Request Example

```bash
curl --request POST \
  --url https://api.explorium.ai/v1/businesses/firmographics/enrich \
  --header 'accept: application/json' \
  --header 'api_key: 76de0beb57e3440faf85f5691be52b4a' \
  --header 'content-type: application/json' \
  --data '{
    "business_id": "8adce3ca1cef0c986b22310e369a0793"
  }'
```

### Response Example (Microsoft Corporation)

```json
{
  "response_context": {
    "correlation_id": "xyz789",
    "request_status": "success"
  },
  "data": {
    "business_id": "8adce3ca1cef0c986b22310e369a0793",
    "name": "Microsoft Corporation",
    "website": "microsoft.com",
    "country": "United States",
    "ticker": "xnas:msft",
    "naics": {
      "code": "511210",
      "description": "Software Publishers"
    },
    "sic": {
      "code": "7372",
      "description": "Prepackaged Software"
    },
    "employee_range": "10001+",
    "revenue_range": "$100B-1T",
    "linkedin_url": "https://www.linkedin.com/company/microsoft",
    "founded_year": 1975,
    "headquarters": {
      "city": "Redmond",
      "state": "WA",
      "country": "United States"
    }
  }
}
```

### Fields Available

- **Basic Info**: name, domain, website, country
- **Industry**: NAICS code/description, SIC code/description, Google category, LinkedIn category
- **Size**: employee_range, revenue_range
- **Financial**: ticker symbol (for public companies)
- **Location**: headquarters city/state/country, region
- **Social**: LinkedIn URL
- **History**: founded_year

---

### Endpoint: Technographics Enrichment

**URL**: `POST https://api.explorium.ai/v1/businesses/technographics/enrich`

**Purpose**: Get insights into technologies used by companies (tech stack).

### Request Example

```javascript
async function getTechnographics(businessId) {
  const response = await fetch('https://api.explorium.ai/v1/businesses/technographics/enrich', {
    method: 'POST',
    headers: {
      'api_key': '76de0beb57e3440faf85f5691be52b4a',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      business_id: businessId
    })
  });

  const data = await response.json();
  return data;
}
```

### Response Fields

Returns array of technologies organized by category:

- **Analytics**: Google Analytics, Mixpanel, etc.
- **CRM**: Salesforce, HubSpot, etc.
- **Payment**: Stripe, PayPal, etc.
- **Infrastructure**: AWS, Azure, GCP, etc.
- **Marketing**: Marketo, Mailchimp, etc.
- **Development**: GitHub, GitLab, etc.

---

### Endpoint: Funding & Acquisitions

**URL**: `POST https://api.explorium.ai/v1/businesses/funding_and_acquisition/enrich`

**Purpose**: Get detailed insights into funding rounds, acquisitions, and IPOs.

### Coverage
Over 300,000 private and public companies worldwide.

---

### Endpoint: Financial Metrics (Public Companies)

**URL**: `POST https://api.explorium.ai/v1/businesses/financial-metrics/enrich`

**Purpose**: Get key financial indicators for publicly traded companies.

### Request Example

```javascript
async function getFinancialMetrics(businessId) {
  const response = await fetch('https://api.explorium.ai/v1/businesses/financial-metrics/enrich', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api_key': '76de0beb57e3440faf85f5691be52b4a',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      business_id: businessId
    })
  });

  const data = await response.json();
  return data;
}
```

---

## Business Discovery & Matching

### Endpoint: Fetch Businesses

**URL**: `POST https://api.explorium.ai/v1/businesses`

**Purpose**: Search and filter companies by location, industry, size, and other criteria. Returns business_id for use in enrichment endpoints.

### Request Schema

```typescript
{
  mode: 'full' | 'preview';      // Required: Fetch type
  size: number;                  // Required: 1-60,000 businesses to fetch
  page_size: number;             // Required: 1-500 results per page
  page?: number;                 // Optional: Page number (default: 1)
  exclude?: string[];            // Optional: Max 1,000 business IDs to exclude
  filters?: {                    // Optional: Filter criteria
    country_code?: string[];
    employee_range?: string[];
    revenue_range?: string[];
    company_age_range?: string[];
    industry?: {
      naics?: string[];
      sic?: string[];
      google?: string[];
      linkedin?: string[];
    };
    technologies?: string[];
    company_name?: string;
    city?: string;
    region?: string;
    website_keywords?: string[];
    business_intent_topics?: Array<{
      topic: string;
      intent_level?: string;
    }>;
  };
  next_cursor?: string;          // For cursor-based pagination
}
```

### Filter Options

#### Employee Ranges
- `1-10`
- `11-50`
- `51-200`
- `201-500`
- `501-1000`
- `1001-5000`
- `5001-10000`
- `10001+`

#### Revenue Ranges
- `$0-500K`
- `$500K-1M`
- `$1M-10M`
- `$10M-50M`
- `$50M-100M`
- `$100M-500M`
- `$500M-1B`
- `$1B-10B`
- `$10B-100B`
- `$100B-1T`
- `$1T+`

#### Company Age Ranges
- `0-3 years`
- `3-5 years`
- `5-10 years`
- `10-20 years`
- `20+ years`

#### Intent Levels
- `low`
- `medium`
- `high`

### Request Example

```javascript
async function fetchBusinesses(filters) {
  const response = await fetch('https://api.explorium.ai/v1/businesses', {
    method: 'POST',
    headers: {
      'api_key': '76de0beb57e3440faf85f5691be52b4a',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mode: 'full',
      size: 100,
      page_size: 100,
      page: 1,
      filters: filters
    })
  });

  const data = await response.json();
  return data;
}

// Usage: Find payment processing companies
fetchBusinesses({
  country_code: ['US', 'GB'],
  employee_range: ['201-500', '501-1000'],
  revenue_range: ['$10M-50M', '$50M-100M'],
  industry: {
    naics: ['522320']  // Financial Transactions Processing
  },
  business_intent_topics: [
    { topic: 'funding', intent_level: 'high' },
    { topic: 'expansion', intent_level: 'high' }
  ]
})
  .then(result => console.log(result))
  .catch(error => console.error('Error:', error));
```

### Response Schema

```typescript
{
  response_context: {
    correlation_id: string;
    request_status: 'success' | 'miss' | 'failure';
    time_took_in_seconds: number;
  },
  data: Array<{
    business_id: string;           // 32-character hex string - USE THIS FOR ENRICHMENT
    name: string;
    domain: string;
    country_name: string;
    number_of_employees_range: string;
    yearly_revenue_range: string;
    region: string;                // ISO 3166-2 format
    naics: {
      code: string;
      description: string;
    };
    business_intent_topics: Array<{
      topic: string;
      intent_level: 'low' | 'medium' | 'high';
      detected_at: string;
    }>;
  }>,
  total_results: number;
  page: number;
  total_pages: number;
}
```

### Pagination

Use `next_cursor` for cursor-based pagination or `page` parameter for offset pagination.

---

## Prospect Discovery & Matching

### Endpoint: Fetch Prospects

**URL**: `POST https://api.explorium.ai/v1/prospects`

**Purpose**: Search for professionals/contacts based on job level, department, company, and other criteria. Returns prospect_id for use in enrichment.

### Request Schema

```typescript
{
  mode: 'full' | 'preview';      // Required
  size?: number;                 // Max prospects to return
  page_size: number;             // Results per page (1-500)
  page: number;                  // Page number
  filters: {
    business_id?: {              // Company filter
      values: string[];
    };
    job_level?: {                // Seniority filter
      values: string[];          // e.g., ['director', 'manager', 'c-level']
    };
    department?: {
      values: string[];          // e.g., ['engineering', 'sales', 'finance']
    };
    has_email?: {
      value: boolean;            // Filter for contacts with verified email
    };
    has_phone?: {
      value: boolean;            // Filter for contacts with phone
    };
    total_experience_months?: {
      gte?: number;              // Minimum experience in months
      lte?: number;              // Maximum experience in months
    };
    current_role_months?: {
      gte?: number;
      lte?: number;
    };
    location?: {
      values: string[];          // City or country
    };
  };
}
```

### Job Levels Available
- `c-level` (CEO, CFO, CTO, etc.)
- `vp` (VP, Senior VP)
- `director`
- `manager`
- `individual` (Individual contributor)

### Departments Available
- `engineering`
- `sales`
- `marketing`
- `finance`
- `operations`
- `product`
- `hr`
- `legal`

### Request Example

```javascript
async function fetchProspects(filters) {
  const response = await fetch('https://api.explorium.ai/v1/prospects', {
    method: 'POST',
    headers: {
      'api_key': '76de0beb57e3440faf85f5691be52b4a',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mode: 'full',
      size: 100,
      page_size: 100,
      page: 1,
      filters: filters
    })
  });

  const data = await response.json();
  return data;
}

// Usage: Find finance directors at specific companies
fetchProspects({
  business_id: {
    values: ['8adce3ca1cef0c986b22310e369a0793']
  },
  job_level: {
    values: ['director', 'c-level']
  },
  department: {
    values: ['finance', 'treasury']
  },
  has_email: {
    value: true
  },
  total_experience_months: {
    gte: 36,   // At least 3 years experience
    lte: 72    // Max 6 years experience
  }
})
  .then(result => console.log(result))
  .catch(error => console.error('Error:', error));
```

### Response Schema

```typescript
{
  response_context: {
    correlation_id: string;
    request_status: 'success' | 'miss' | 'failure';
    time_took_in_seconds: number;
  },
  data: Array<{
    prospect_id: string;         // 40-character hex - USE THIS FOR ENRICHMENT
    full_name: string;
    first_name: string;
    last_name: string;
    job_title: string;
    job_level: string;
    department: string;
    company_name: string;
    business_id: string;
    location: string;
    has_email: boolean;
    has_phone: boolean;
    linkedin_url?: string;
    current_role_months: number;
    total_experience_months: number;
  }>,
  total_results: number;
  page: number;
  total_pages: number;
}
```

---

## Rate Limits

### Global Rate Limit
**200 requests per minute** per API key

### Bulk Endpoints
- **Businesses**: Up to 50 business IDs per request
- **Prospects**: Up to 50 prospect IDs per request

### Best Practices
1. Use bulk endpoints when enriching multiple entities
2. Implement exponential backoff on rate limit errors
3. Use pagination (max 500 results per page) for large datasets
4. Check `stats` endpoint before fetching to gauge dataset size
5. Use multiple filtering layers to get precise results

### Rate Limit Headers
Monitor these response headers:
- `X-RateLimit-Limit`: Requests allowed per window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Timestamp when limit resets

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| `200` | Success | Process response data |
| `400` | Bad Request | Check request body schema |
| `401` | Unauthorized | Verify API key |
| `404` | Not Found | Entity doesn't exist |
| `422` | Validation Error | Fix request parameters |
| `429` | Rate Limit Exceeded | Wait and retry (see Retry-After header) |
| `500` | Server Error | Retry with exponential backoff |

### Error Response Schema

```typescript
{
  error: {
    code: string;
    message: string;
    details?: Array<{
      location: string[];
      message: string;
      type: string;
    }>;
  }
}
```

### Validation Error Example (422)

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid request parameters",
    "details": [
      {
        "location": ["body", "prospect_id"],
        "message": "prospect_id must be a 40-character hexadecimal string",
        "type": "string_pattern"
      }
    ]
  }
}
```

### Rate Limit Error Example (429)

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit of 200 requests per minute exceeded",
    "retry_after": 60
  }
}
```

### Retry Strategy

```javascript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Handle rate limit
      if (error.statusCode === 429) {
        const retryAfter = error.headers['retry-after'] || 60;
        await sleep(retryAfter * 1000);
        continue;
      }

      // Handle server errors with exponential backoff
      if (error.statusCode >= 500) {
        await sleep(1000 * Math.pow(2, i));
        continue;
      }

      // Don't retry client errors
      throw error;
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## Node.js Code Examples

### Complete ExploriumClient Class

```javascript
const fetch = require('node-fetch');

class ExploriumClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.explorium.ai/v1';
    this.maxRetries = 3;
  }

  async request(endpoint, body) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'api_key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Explorium API Error: ${error.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  async withRetry(fn) {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === this.maxRetries - 1) throw error;

        if (error.message.includes('rate limit')) {
          await this.sleep(60000);
        } else if (error.message.includes('500')) {
          await this.sleep(1000 * Math.pow(2, i));
        } else {
          throw error;
        }
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== BUSINESS METHODS ====================

  async fetchBusinesses(filters, options = {}) {
    return this.withRetry(() => this.request('/businesses', {
      mode: options.mode || 'full',
      size: options.size || 100,
      page_size: options.pageSize || 100,
      page: options.page || 1,
      filters: filters
    }));
  }

  async enrichBusinessBulk(businessIds) {
    if (businessIds.length > 50) {
      throw new Error('Maximum 50 business IDs per request');
    }

    return this.withRetry(() => this.request('/businesses/bulk-enrich', {
      business_ids: businessIds
    }));
  }

  async enrichFirmographics(businessId) {
    return this.withRetry(() => this.request('/businesses/firmographics/enrich', {
      business_id: businessId
    }));
  }

  async enrichTechnographics(businessId) {
    return this.withRetry(() => this.request('/businesses/technographics/enrich', {
      business_id: businessId
    }));
  }

  async enrichFinancialMetrics(businessId) {
    return this.withRetry(() => this.request('/businesses/financial-metrics/enrich', {
      business_id: businessId
    }));
  }

  async enrichFundingAcquisitions(businessId) {
    return this.withRetry(() => this.request('/businesses/funding_and_acquisition/enrich', {
      business_id: businessId
    }));
  }

  async fetchBusinessEvents(eventTypes, businessIds) {
    return this.withRetry(() => this.request('/businesses/events', {
      event_types: eventTypes,
      business_ids: businessIds
    }));
  }

  // ==================== PROSPECT METHODS ====================

  async fetchProspects(filters, options = {}) {
    return this.withRetry(() => this.request('/prospects', {
      mode: options.mode || 'full',
      size: options.size || 100,
      page_size: options.pageSize || 100,
      page: options.page || 1,
      filters: filters
    }));
  }

  async enrichContactInformation(prospectId) {
    return this.withRetry(() => this.request('/prospects/contacts_information/enrich', {
      prospect_id: prospectId,
      request_context: {},
      parameters: {}
    }));
  }

  async enrichProspectBulk(prospectIds) {
    if (prospectIds.length > 50) {
      throw new Error('Maximum 50 prospect IDs per request');
    }

    return this.withRetry(() => this.request('/prospects/bulk-enrich', {
      prospect_ids: prospectIds
    }));
  }

  // ==================== COMBINED WORKFLOW METHODS ====================

  async discoverAndEnrichCompanies(filters, options = {}) {
    // Step 1: Fetch businesses matching criteria
    const fetchResult = await this.fetchBusinesses(filters, options);
    const businesses = fetchResult.data;

    if (!businesses || businesses.length === 0) {
      return { businesses: [], enriched: [] };
    }

    // Step 2: Extract business IDs
    const businessIds = businesses.map(b => b.business_id);

    // Step 3: Enrich in batches of 50
    const enriched = [];
    for (let i = 0; i < businessIds.length; i += 50) {
      const batch = businessIds.slice(i, i + 50);
      const batchResult = await this.enrichBusinessBulk(batch);
      enriched.push(...batchResult.data);
    }

    return { businesses, enriched };
  }

  async findAndEnrichContacts(businessIds, jobLevels, departments) {
    // Step 1: Fetch prospects at target companies
    const fetchResult = await this.fetchProspects({
      business_id: { values: businessIds },
      job_level: { values: jobLevels },
      department: { values: departments },
      has_email: { value: true }
    });

    const prospects = fetchResult.data;

    if (!prospects || prospects.length === 0) {
      return { prospects: [], enriched: [] };
    }

    // Step 2: Extract prospect IDs
    const prospectIds = prospects.map(p => p.prospect_id);

    // Step 3: Enrich contact information in batches of 50
    const enriched = [];
    for (let i = 0; i < prospectIds.length; i += 50) {
      const batch = prospectIds.slice(i, i + 50);
      const batchResult = await this.enrichProspectBulk(batch);
      enriched.push(...batchResult.data);
    }

    return { prospects, enriched };
  }

  async enrichCompanyComplete(businessId) {
    // Get all enrichment data for a company
    const [firmographics, technographics, financial, funding] = await Promise.all([
      this.enrichFirmographics(businessId).catch(() => null),
      this.enrichTechnographics(businessId).catch(() => null),
      this.enrichFinancialMetrics(businessId).catch(() => null),
      this.enrichFundingAcquisitions(businessId).catch(() => null)
    ]);

    return {
      businessId,
      firmographics: firmographics?.data,
      technographics: technographics?.data,
      financial: financial?.data,
      funding: funding?.data
    };
  }
}

module.exports = ExploriumClient;
```

### Usage Examples

#### Example 1: Find Payment Processing Companies with Growth Signals

```javascript
const ExploriumClient = require('./explorium-client');

const client = new ExploriumClient('76de0beb57e3440faf85f5691be52b4a');

async function findGrowingPaymentProcessors() {
  const result = await client.discoverAndEnrichCompanies({
    country_code: ['US', 'GB'],
    employee_range: ['201-500', '501-1000', '1001-5000'],
    revenue_range: ['$10M-50M', '$50M-100M', '$100M-500M'],
    industry: {
      naics: ['522320', '522390']  // Payment processing
    },
    business_intent_topics: [
      { topic: 'funding', intent_level: 'high' },
      { topic: 'expansion', intent_level: 'high' },
      { topic: 'hiring', intent_level: 'medium' }
    ]
  }, {
    size: 50,
    pageSize: 50
  });

  console.log(`Found ${result.businesses.length} companies`);
  console.log(`Enriched ${result.enriched.length} companies`);

  return result;
}

findGrowingPaymentProcessors()
  .then(result => console.log(JSON.stringify(result, null, 2)))
  .catch(error => console.error('Error:', error));
```

#### Example 2: Find Finance Leaders at Specific Companies

```javascript
async function findFinanceLeaders(companyDomains) {
  // First, get business IDs for companies
  const businessResults = await client.fetchBusinesses({
    domain: { values: companyDomains }
  });

  const businessIds = businessResults.data.map(b => b.business_id);

  // Then find finance leaders
  const result = await client.findAndEnrichContacts(
    businessIds,
    ['director', 'vp', 'c-level'],  // Job levels
    ['finance', 'treasury']          // Departments
  );

  console.log(`Found ${result.prospects.length} finance leaders`);
  console.log(`Enriched ${result.enriched.length} contacts with email/phone`);

  return result;
}

findFinanceLeaders(['stripe.com', 'adyen.com', 'checkout.com'])
  .then(result => console.log(JSON.stringify(result, null, 2)))
  .catch(error => console.error('Error:', error));
```

#### Example 3: Complete Company Intelligence Gathering

```javascript
async function gatherCompanyIntel(companyName) {
  // Step 1: Find the company
  const businesses = await client.fetchBusinesses({
    company_name: companyName
  }, { size: 1, pageSize: 1 });

  if (!businesses.data || businesses.data.length === 0) {
    throw new Error(`Company not found: ${companyName}`);
  }

  const businessId = businesses.data[0].business_id;

  // Step 2: Get complete enrichment
  const intel = await client.enrichCompanyComplete(businessId);

  console.log('Company Intelligence:');
  console.log('- Firmographics:', intel.firmographics ? 'Available' : 'N/A');
  console.log('- Technographics:', intel.technographics ? 'Available' : 'N/A');
  console.log('- Financial Data:', intel.financial ? 'Available' : 'N/A');
  console.log('- Funding History:', intel.funding ? 'Available' : 'N/A');

  return intel;
}

gatherCompanyIntel('Microsoft')
  .then(intel => console.log(JSON.stringify(intel, null, 2)))
  .catch(error => console.error('Error:', error));
```

---

## Best Practices

### 1. Workflow Optimization

**Always use this sequence:**
```
Fetch Businesses → Get business_ids → Enrich Businesses
Fetch Prospects → Get prospect_ids → Enrich Contacts
```

Never call enrichment endpoints without first getting the proper IDs from fetch endpoints.

### 2. Batch Processing

Use bulk endpoints for multiple entities:
```javascript
// GOOD: Batch enrichment (1 API call)
await client.enrichBusinessBulk([id1, id2, id3, ...id50]);

// BAD: Individual enrichment (50 API calls)
for (const id of businessIds) {
  await client.enrichFirmographics(id);
}
```

### 3. Caching

Implement 30-day caching for enrichment data:
```javascript
const cache = new Map();

async function enrichWithCache(businessId) {
  const cacheKey = `business:${businessId}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 30 * 24 * 60 * 60 * 1000) {
    return cached.data;
  }

  const data = await client.enrichFirmographics(businessId);
  cache.set(cacheKey, { data, timestamp: Date.now() });

  return data;
}
```

### 4. Error Handling

Always handle missing data gracefully:
```javascript
const enriched = await client.enrichFirmographics(businessId).catch(() => null);

if (enriched && enriched.data) {
  // Process data
} else {
  // Log miss, use defaults
  console.warn(`No firmographics data for ${businessId}`);
}
```

### 5. Rate Limit Management

Implement rate limiting on your side:
```javascript
class RateLimiter {
  constructor(maxPerMinute) {
    this.maxPerMinute = maxPerMinute;
    this.queue = [];
  }

  async execute(fn) {
    const now = Date.now();
    this.queue = this.queue.filter(t => now - t < 60000);

    if (this.queue.length >= this.maxPerMinute) {
      const oldestRequest = this.queue[0];
      const waitTime = 60000 - (now - oldestRequest);
      await this.sleep(waitTime);
    }

    this.queue.push(Date.now());
    return await fn();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const limiter = new RateLimiter(150);  // 80% of 200 limit

await limiter.execute(() => client.fetchBusinesses(...));
```

### 6. Pagination for Large Datasets

Use stats endpoint first, then paginate:
```javascript
async function fetchAllBusinesses(filters) {
  const allBusinesses = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await client.fetchBusinesses(filters, {
      page,
      pageSize: 500  // Maximum
    });

    allBusinesses.push(...result.data);

    hasMore = page < result.total_pages;
    page++;

    // Respect rate limits
    if (hasMore) {
      await client.sleep(300);  // 200/min = 1 request per 300ms
    }
  }

  return allBusinesses;
}
```

### 7. Data Quality Validation

Validate enriched data before use:
```javascript
function validateContact(contactData) {
  const quality = {
    score: 0,
    issues: []
  };

  if (contactData.professional_email_status === 'valid') {
    quality.score += 0.4;
  } else {
    quality.issues.push('Email not verified');
  }

  if (contactData.mobile_phone) {
    quality.score += 0.3;
  } else {
    quality.issues.push('No phone number');
  }

  if (quality.score < 0.5) {
    quality.usable = false;
  } else {
    quality.usable = true;
  }

  return quality;
}
```

---

## Integration with Sales Automation Suite

### Mapping to ICP Discovery Worker

```javascript
// In lead-discovery-worker.js

const ExploriumClient = require('./explorium-client');
const client = new ExploriumClient(process.env.EXPLORIUM_API_KEY);

async function discoverByICP(icpProfile) {
  // Convert ICP profile to Explorium filters
  const filters = {
    country_code: icpProfile.geography,
    employee_range: [`${icpProfile.employees.min}-${icpProfile.employees.max}`],
    revenue_range: [icpProfile.revenue.min + '-' + icpProfile.revenue.max],
    industry: {
      naics: icpProfile.industryCodes  // Map from ICP
    },
    business_intent_topics: icpProfile.signals.map(signal => ({
      topic: signal,
      intent_level: 'high'
    }))
  };

  // Discover and enrich
  const result = await client.discoverAndEnrichCompanies(filters, {
    size: 50,
    pageSize: 50
  });

  // Calculate ICP scores
  return result.enriched.map(company => ({
    domain: company.domain,
    name: company.name,
    icpScore: calculateICPScore(company, icpProfile),
    intentScore: calculateIntentScore(company.business_intent_topics),
    data: company
  }));
}
```

### Mapping to Enrichment Worker

```javascript
// In enrichment-worker.js

async function enrichContact(contactEmail, companyDomain) {
  // Step 1: Find the business
  const businesses = await client.fetchBusinesses({
    domain: { values: [companyDomain] }
  }, { size: 1, pageSize: 1 });

  if (!businesses.data || businesses.data.length === 0) {
    throw new Error('Company not found');
  }

  const businessId = businesses.data[0].business_id;

  // Step 2: Find the prospect
  const prospects = await client.fetchProspects({
    business_id: { values: [businessId] }
    // Could add email filter if available
  });

  // Step 3: Match by email and enrich
  const prospect = prospects.data.find(p =>
    p.emails && p.emails.some(e => e.email === contactEmail)
  );

  if (!prospect) {
    throw new Error('Contact not found');
  }

  // Step 4: Enrich contact information
  const enriched = await client.enrichContactInformation(prospect.prospect_id);

  // Step 5: Enrich company
  const companyData = await client.enrichCompanyComplete(businessId);

  // Step 6: Generate intelligence
  const intelligence = generateIntelligence(companyData, enriched.data);

  return {
    contact: enriched.data,
    company: companyData,
    intelligence,
    dataQuality: calculateQualityScore(enriched.data, companyData)
  };
}
```

---

## Support & Resources

### Official Documentation
- API Reference: https://developers.explorium.ai/reference/introduction
- Quick Starts: https://developers.explorium.ai/reference/quick-starts
- Support Center: https://developers.explorium.ai/reference/support-help-center

### Support Channels
- Email: support@explorium.ai
- Slack: Available for customers (request access)

### Additional Resources
- Admin Portal: https://admin.explorium.ai (for API key management)
- MCP Server: https://github.com/explorium-ai/mcp-explorium
- Data Catalog: Browse available data at https://www.explorium.ai/data-catalog

---

## Summary

### Quick Reference Card

```
Base URL: https://api.explorium.ai/v1
Auth Header: api_key: 76de0beb57e3440faf85f5691be52b4a
Rate Limit: 200 requests/minute
Batch Size: Max 50 IDs per bulk request
Max Results: 500 per page

Key Endpoints:
  POST /businesses              → Search companies, get business_id
  POST /businesses/bulk-enrich  → Enrich up to 50 companies
  POST /prospects               → Search contacts, get prospect_id
  POST /prospects/contacts_information/enrich → Get email/phone

Workflow:
  1. Fetch → Get IDs
  2. Enrich → Get data
  3. Cache → 30 days
  4. Retry → On rate limit/errors
```

### Next Steps

1. Test authentication with provided API key
2. Implement ExploriumClient class in `/home/omar/claude - sales_auto_skill/mcp-server/src/clients/explorium-client.js`
3. Update workers to use real Explorium API instead of mocks
4. Add caching layer (SQLite table: `enrichment_cache`)
5. Implement rate limiting (Token bucket algorithm)
6. Add comprehensive error handling
7. Test full discovery → enrichment → sync workflow

---

**Documentation Generated**: 2025-11-08
**Research Status**: Complete
**Implementation Ready**: Yes
