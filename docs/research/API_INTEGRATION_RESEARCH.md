# API Integration Research: HeyGen, Postmark, and PhantomBuster

**Research Date:** 2025-11-22
**Purpose:** Node.js client library implementation guide

## Table of Contents
1. [HeyGen API - Video Generation Platform](#1-heygen-api---video-generation-platform)
2. [Postmark API - Transactional Email Service](#2-postmark-api---transactional-email-service)
3. [PhantomBuster API - LinkedIn Automation Service](#3-phantombuster-api---linkedin-automation-service)
4. [Implementation Recommendations](#4-implementation-recommendations)

---

## 1. HeyGen API - Video Generation Platform

### Official Documentation
- **Main Docs:** [https://docs.heygen.com/](https://docs.heygen.com/)
- **Quick Start:** [https://docs.heygen.com/docs/quick-start](https://docs.heygen.com/docs/quick-start)
- **API Reference:** [https://docs.heygen.com/reference/authentication](https://docs.heygen.com/reference/authentication)

### Authentication

**Method:** API Key via HTTP Header
**Header Name:** `X-Api-Key`
**Location:** Found in HeyGen App → Top-left corner → Space Settings → API tab

```javascript
// Authentication example
const headers = {
  'X-Api-Key': 'YOUR_API_KEY',
  'Content-Type': 'application/json'
};
```

**Security Note:** "Anyone with access to your API Key can make API requests on your behalf." Store securely in environment variables.

### Core API Endpoints

#### Base URL
```
https://api.heygen.com
```

#### Video Generation (V2)
```
POST /v2/video/generate
```

**Key Features:**
- Supports avatars, talking photos, AI voices
- Dynamic backgrounds
- Text input: Max 5,000 characters
- Audio input: Max 10 minutes (3,600 seconds)

#### List Avatars (V2)
```
GET /v2/avatars
```
Returns list of available avatars including instant avatars.

#### List Voices (V2)
```
GET /v2/voices
```
Returns available AI voices with properties: `voice_id`, `name`, `language`.

**Response Format:**
```javascript
{
  "data": {
    "voices": [
      {
        "voice_id": "...",
        "name": "...",
        "language": "..."
      }
    ]
  }
}
```

#### Check Video Status
```
GET /v1/video_status.get
```

**Important:** Call this endpoint to regenerate video URLs, as "each time you call it, the Expires and related query parameters in the URL are regenerated."

**Known Issues:** Some users report 503 errors. Implement retry logic with exponential backoff.

### Webhook Implementation

**Webhook Events:** Video processing success/failure notifications

**Registration:**
```
POST /v1/webhook/endpoint.add
```

**Important:** HeyGen validates webhooks via OPTIONS request with 1-second timeout. Ensure your server:
1. Responds to OPTIONS requests quickly
2. Returns appropriate CORS headers

**Signature Verification (Node.js):**
```javascript
const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.raw({ type: "*/*", limit: "10mb" }));

app.post("/webhook", (req, res) => {
  const whSecret = process.env.HEYGEN_WEBHOOK_SECRET;
  const contentStr = req.body.toString("utf-8");
  const signature = req.headers["signature"];

  // Calculate HMAC-SHA256
  const hmac = crypto.createHmac("sha256", whSecret);
  hmac.update(contentStr, "utf-8");
  const computedSignature = hmac.digest("hex");

  // Verify signature
  if (computedSignature !== signature) {
    return res.status(401).send("Invalid signature");
  }

  // Parse and process webhook data
  const { event_type, event_data } = JSON.parse(contentStr);
  console.log(`Event: ${event_type}`, event_data);

  res.status(200).send("Success");
});
```

### Rate Limits & Plans

| Plan | Credits/Month | Concurrent Jobs | Max Duration | Resolution | Cost |
|------|---------------|-----------------|--------------|------------|------|
| Free Trial | 10 | 1 | 3 min | 720p | Free |
| Pro | 100 | 3 | 5 min | 1080p | $99/mo |
| Scale | 660 | 6 | 30 min | 4K | $330/mo |
| Enterprise | Custom | Custom | Custom | 4K | Custom |

**Credit Consumption:**
- Photo Avatar: 1 credit/min (30-sec increments)
- Video Avatar: 2 credits/min
- Video Translation (fast): 3 credits/min
- Video Translation (quality): 6 credits/min
- Interactive Avatar streaming: 0.2 credits/min (30-sec minimum)
- Avatar IV video: 6 credits/min

**Additional Limits:**
- Text input: < 5,000 characters
- Audio input: ≤ 10 minutes
- Interactive Avatar text: ≤ 1,000 characters/request
- Video scenes: Max 50/video
- Resource files: Video (100MB), Images (50MB), Audio (50MB)

**Request Rate Limits:**
- Pro Plan: 3 requests per 10 seconds
- Trial Token: 3 concurrent sessions max

### Node.js SDK

**Official Streaming SDK:**
```bash
npm install @heygen/streaming-avatar
```

- **GitHub:** [https://github.com/HeyGen-Official/StreamingAvatarSDK](https://github.com/HeyGen-Official/StreamingAvatarSDK)
- **NPM:** [https://www.npmjs.com/package/@heygen/streaming-avatar](https://www.npmjs.com/package/@heygen/streaming-avatar)
- **Use Case:** Real-time Interactive Avatar integration via WebSockets
- **Features:** Real-time streaming, text-to-speech, customizable voices

**Note:** No official REST API SDK. Need to build custom wrapper for video generation endpoints.

### Error Codes

| Code | Meaning | Resolution |
|------|---------|------------|
| 40009 | INVALID_CREDENTIALS | Check API key validity |
| 401029 | Resolution Not Allowed | Upgrade plan for higher resolution |
| - | Network: EAI_AGAIN | DNS/connectivity issue, implement retry |

**Common Issues:**
- Blurry/dark video: Algorithm requires recognizable human features
- Face detection failure: No face in consent footage
- Audio detection failure: Microphone off during recording
- Invalid avatar/voice IDs: Verify IDs from list endpoints

### Best Practices

1. **Webhooks over Polling:** HeyGen recommends webhooks for production. Only poll if necessary.
2. **URL Expiration:** Always call video_status endpoint to get fresh URLs before accessing videos.
3. **Retry Logic:** Implement exponential backoff for 503 errors.
4. **Validation:** Test manually in UI before automating via API.
5. **Credit Management:** Monitor credit usage to avoid service interruptions.

---

## 2. Postmark API - Transactional Email Service

### Official Documentation
- **Main Docs:** [https://postmarkapp.com/developer](https://postmarkapp.com/developer)
- **Email API:** [https://postmarkapp.com/developer/api/email-api](https://postmarkapp.com/developer/api/email-api)
- **Webhooks:** [https://postmarkapp.com/developer/webhooks/webhooks-overview](https://postmarkapp.com/developer/webhooks/webhooks-overview)

### Authentication

**Method:** HTTP Header with Server/Account Token
**Header Name:** `X-Postmark-Server-Token` (for server-level operations)
**Alternative:** `X-Postmark-Account-Token` (for account-level operations)

**Token Location:** Postmark Server → API Tokens tab

```javascript
// Authentication example
const headers = {
  'X-Postmark-Server-Token': 'YOUR_SERVER_TOKEN',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
```

**Security:** Headers are case-insensitive. Wrong/missing headers return HTTP 401 (Unauthorized).

### Core API Endpoints

#### Base URL
```
https://api.postmarkapp.com
```

#### Send Single Email
```
POST /email
```

**Required Fields:**
- `From` - Sender address (must have confirmed Sender Signature)
- `To` - Recipient(s), max 50 addresses
- `HtmlBody` OR `TextBody`

**Optional Fields:**
- `Cc`, `Bcc`, `Subject`, `Tag`, `ReplyTo`
- `Headers`, `Attachments`, `Metadata`
- `TrackOpens` (boolean)
- `TrackLinks` (None/HtmlAndText/HtmlOnly/TextOnly)
- `MessageStream` (defaults to "outbound")

**Example Request:**
```javascript
{
  "From": "[email protected]",
  "To": "[email protected]",
  "Subject": "Hello",
  "HtmlBody": "<html><body><h1>Hello!</h1></body></html>",
  "TextBody": "Hello!",
  "TrackOpens": true,
  "TrackLinks": "HtmlAndText"
}
```

**Response:**
```javascript
{
  "To": "[email protected]",
  "SubmittedAt": "2025-11-22T10:00:00Z",
  "MessageID": "unique-id",
  "ErrorCode": 0,
  "Message": "OK"
}
```

#### Send Batch Emails
```
POST /email/batch
```

**Limits:**
- Up to 500 messages per API call
- Up to 50 MB total payload size (including attachments)

**Important:** Returns 200-level status even when individual messages fail. Check ErrorCode for each message.

#### Send Email with Template
```
POST /email/withTemplate
```

**Required Fields:**
- `TemplateId` - Template ID number
- `TemplateModel` - Key/value pairs for template variables
- `From`, `To`

**Exclude:** `Subject`, `HtmlBody`, `TextBody` (comes from template)

**Example:**
```javascript
{
  "From": "[email protected]",
  "To": "[email protected]",
  "TemplateId": 1234567,
  "TemplateModel": {
    "firstName": "John",
    "company": "Acme Corp",
    "resetToken": "abc123"
  }
}
```

### Webhook Implementation

**Webhook Events:**
1. **Bounce** - Email bounces (hard, soft, undeliverable)
2. **Delivery** - Successful delivery confirmation
3. **Open Tracking** - Email opens
4. **Click** - Link clicks
5. **Spam Complaint** - Spam reports
6. **Subscription Change** - Subscription modifications
7. **Inbound** - Incoming emails
8. **SMTP API Error** - SMTP-related failures

**Webhook Mechanism:** HTTP POST to your endpoint when event occurs.

**Retry Policies:**

*Bounce & Inbound:*
- 1, 5, 10 (×3), 15, 30 minutes
- Then 1, 2, and 6 hours
- 403 response halts all retries

*Click, Open, Delivered, Subscription Change:*
- 1, 5, 15 minutes
- 403 response halts all retries

**Security Considerations:**

Postmark **DOES NOT** use signature-based verification like other services.

**Available Security Options:**
1. **Basic HTTP Authentication:** Add credentials to webhook URL
   ```
   https://username:password@example.com/webhook
   ```

2. **Firewall/IP Whitelist:** Only allow Postmark's webhook IPs
   - See: [https://postmarkapp.com/support/article/800-ips-for-firewalls#webhooks](https://postmarkapp.com/support/article/800-ips-for-firewalls#webhooks)

3. **HTTPS Required:** Always use SSL encryption

**Webhook Payload Examples:**

*Delivery Webhook:*
```javascript
{
  "RecordType": "Delivery",
  "MessageStream": "outbound",
  "ID": "...",
  "ServerID": 123,
  "MessageID": "...",
  "Recipient": "[email protected]",
  "Tag": "...",
  "DeliveredAt": "2025-11-22T10:00:00Z",
  "Details": "..."
}
```

*Bounce Webhook:*
```javascript
{
  "RecordType": "Bounce",
  "Type": "HardBounce",
  "TypeCode": 1,
  "Email": "[email protected]",
  "From": "[email protected]",
  "BouncedAt": "2025-11-22T10:00:00Z",
  "Subject": "..."
}
```

*Spam Complaint:*
```javascript
{
  "RecordType": "SpamComplaint",
  "Type": "SpamComplaint",
  "TypeCode": 512,
  "Email": "[email protected]",
  "From": "[email protected]",
  "BouncedAt": "2025-11-22T10:00:00Z"
}
```

*Inbound with Attachments:*
```javascript
{
  "FromFull": { "Email": "...", "Name": "..." },
  "To": "...",
  "Subject": "...",
  "HtmlBody": "...",
  "TextBody": "...",
  "Attachments": [
    {
      "Name": "document.pdf",
      "Content": "base64-encoded-content",
      "ContentType": "application/pdf",
      "ContentLength": 12345
    }
  ]
}
```

**Handling Attachments:**
- Access via `Attachments[0].Content`
- Content is base64-encoded
- Max cumulative size: 35 MB
- Decode to recreate original file:
  ```javascript
  const buffer = Buffer.from(attachment.Content, 'base64');
  fs.writeFileSync(attachment.Name, buffer);
  ```

### Node.js SDK

**Official Library:** `postmark` (by ActiveCampaign)

**Installation:**
```bash
npm install postmark
```

**Requirements:**
- Minimum Node.js version: v14.0.0
- Written in TypeScript (99.8%)
- MIT License
- 348+ GitHub stars

**GitHub:** [https://github.com/ActiveCampaign/postmark.js](https://github.com/ActiveCampaign/postmark.js)
**NPM:** [https://www.npmjs.com/package/postmark](https://www.npmjs.com/package/postmark)

**Basic Usage:**
```javascript
const postmark = require("postmark");
const client = new postmark.Client("YOUR_SERVER_TOKEN");

// Send single email
await client.sendEmail({
  From: "[email protected]",
  To: "[email protected]",
  Subject: "Hello",
  HtmlBody: "<h1>Hello!</h1>",
  TextBody: "Hello!",
  TrackOpens: true
});

// Send with template
await client.sendEmailWithTemplate({
  From: "[email protected]",
  To: "[email protected]",
  TemplateId: 1234567,
  TemplateModel: {
    firstName: "John",
    company: "Acme",
    resetToken: "abc123"
  }
});

// Send batch
await client.sendEmailBatch([
  { From: "...", To: "...", Subject: "...", HtmlBody: "..." },
  { From: "...", To: "...", Subject: "...", HtmlBody: "..." }
]);
```

**Features:**
- Email sending (single, batch, template)
- Template management
- Bounce processing
- Inbound email parsing
- Statistics and analytics
- Full REST API support

### Rate Limits & Plans

**Rate Limiting:**
- Postmark doesn't publish strict per-second limits
- Monitors usage and notifies if exceeding acceptable use
- HTTP 429 returned when rate limit exceeded

**API Limits:**
- Single email payload: 10 MB max
- Batch email payload: 50 MB total max
- Batch size: 500 messages max
- Recipients per email: 50 max
- Inbound attachments: 35 MB cumulative max

### Error Codes

| HTTP Code | Meaning | Details |
|-----------|---------|---------|
| 401 | Unauthorized | Wrong/missing authentication header |
| 404 | Not Found | Resource doesn't exist |
| 413 | Payload Too Large | Exceeded 10 MB (single) or 50 MB (batch) |
| 422 | Unprocessable Entity | Malformed JSON or incorrect fields |
| 429 | Rate Limit Exceeded | Too many requests |
| 500 | Internal Server Error | Postmark server issue |
| 503 | Service Unavailable | Planned maintenance |

**Error Response Format:**
```javascript
{
  "ErrorCode": 405,
  "Message": "Details about what went wrong"
}
```

**Common Error Codes:**
- 405 - Email validation error
- 300 - Invalid email request
- 406 - Inactive recipient

### Best Practices

1. **Use Templates:** Pre-create templates for consistent branding and easier maintenance
2. **Batch When Possible:** Use batch endpoint for multiple emails (up to 500 per call)
3. **Check Individual Responses:** Batch returns 200 even if some fail - validate each ErrorCode
4. **Webhook Security:** Use HTTPS + Basic Auth + IP whitelist
5. **Handle Bounces:** Subscribe to bounce webhooks and suppress hard bounces
6. **Track Engagement:** Enable TrackOpens and TrackLinks for analytics
7. **Test Mode:** Use Postmark's test server token for development
8. **MessageStream:** Specify appropriate stream (transactional vs broadcast)

---

## 3. PhantomBuster API - LinkedIn Automation Service

### Official Documentation
- **Main Docs:** [https://hub.phantombuster.com/docs/api](https://hub.phantombuster.com/docs/api)
- **API Reference:** [https://hub.phantombuster.com/reference](https://hub.phantombuster.com/reference)
- **Developer Quick Start:** [https://hub.phantombuster.com/docs/developer-quick-start](https://hub.phantombuster.com/docs/developer-quick-start)

### Authentication

**Method:** API Key via HTTP Header (Recommended) or Query Parameter
**Header Name:** `X-Phantombuster-Key-1`
**Alternative:** `?key=YOUR_API_KEY` (not recommended - may appear in logs)

**Key Location:** Workspace Settings → API Key (shows only once upon creation)

```javascript
// Authentication example
const headers = {
  'X-Phantombuster-Key-1': 'YOUR_API_KEY',
  'Content-Type': 'application/json'
};
```

**Security Warning:** "Your key is precious as anyone who knows it can launch your agents." Regenerate immediately if compromised.

### Core API Endpoints

#### Base URL & Versioning
```
https://phantombuster.com/api/v2
```

**Note:** v1 still available but uses seconds (v2 uses milliseconds for timestamps)

#### Launch Agent
```
POST /api/v2/agent/{id}/launch
```

**Parameters:**
- `id` - Agent/Phantom ID (from URL: `phantombuster.com/xxx/phantoms/{id}/console`)
- `argument` - JSON configuration (copy from Setup page or API tab)
- `output` - **Critical parameter** - Choose carefully (see Output Formats below)

**Example:**
```javascript
const response = await fetch('https://phantombuster.com/api/v2/agent/12345/launch', {
  method: 'POST',
  headers: {
    'X-Phantombuster-Key-1': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    argument: {
      sessionCookie: 'linkedin_session_cookie',
      numberOfProfiles: 100,
      message: 'Hi {{firstName}}, let\'s connect!'
    },
    output: 'result-object'
  })
});

const data = await response.json();
// { status: "success", data: { containerId: "..." } }
```

#### Fetch Agent Data
```
GET /api/v2/agents/fetch?id={agentId}
```

Returns agent configuration and status.

#### Fetch Agent Output
```
GET /api/v2/agents/fetch-output?id={agentId}&mode=track
```

**Critical Endpoint:** Gets output from most recent container execution.

**Response includes:**
- `s3Folder` - Permanent folder path for this Phantom
- `orgS3Folder` - Organization S3 folder
- `status` - Agent status
- `progress` - Completion percentage
- `messages` - Console output

**Output Formats:**
- **CSV:** Cumulative results from all runs (Free plan: first 10 rows only)
- **JSON:** Results from most recent run only

**Constructing Download URLs:**
```javascript
// CSV Download URL
const csvUrl = `https://phantombuster.s3.amazonaws.com/${orgS3Folder}/${s3Folder}/result.csv`;

// JSON Download URL
const jsonUrl = `https://phantombuster.s3.amazonaws.com/${orgS3Folder}/${s3Folder}/result.json`;
```

#### Get Agent Output Details
```
GET /api/v2/agent/{id}/output
```

Returns console output, status, progress, and messages for agent execution.

#### Fetch Container Data
```
GET /api/v2/containers/fetch?id={containerId}
```

Gets specific container (execution) by ID.

#### List All Agents
```
GET /api/v2/agents/fetch-all
```

Returns all agents in your account with their IDs.

### Webhook Implementation

**Webhook URL Configuration:** Set in Phantom settings or via API

**Webhook Payload (POST to your endpoint):**
```javascript
{
  "agentId": "12345",
  "agentName": "LinkedIn Auto Connect",
  "containerId": "67890",
  "script": "...",
  "launchDuration": 120000,
  "runDuration": 115000,
  "resultObject": { /* agent-specific results */ },
  "exitMessage": "Execution finished",
  "exitCode": 0
}
```

**Webhook Requirements:**
- Must accept POST requests
- Must respond within 11 seconds (else considered server error)
- Returns 200 OK for successful processing

**No Signature Verification:** PhantomBuster webhooks don't include signature verification. Use:
1. HTTPS only
2. Long random webhook URL path
3. IP whitelist if possible
4. Validate payload structure

### LinkedIn Automation - Safety Best Practices

**CRITICAL WARNING:** PhantomBuster violates LinkedIn's Terms of Service. Use at your own risk.

**How It Works:**
- Uses session cookies (not official APIs)
- Simulates browser actions
- Scrapes data and automates clicks

#### Daily Limits (2025 Guidelines)

| Action | Free Account | Premium/Sales Nav | Notes |
|--------|--------------|-------------------|-------|
| Connection Requests | 100/week | 200/week | ~20/day recommended |
| Profile Views | 500/day | 1,000-2,000/day | Spread across day |
| Messages | <150/day | <150/day | Stay conservative |
| Profile Scraping | 1,500/day | 1,500/day | Total across all actions |

**Safe Automation Strategy:**

1. **Gradual Ramping:**
   - Start slow (5-10 actions/day)
   - Increase gradually over 2-3 weeks
   - Warm up new accounts

2. **Natural Pacing:**
   - Add 5-30 second delays between actions
   - Randomize delay timing
   - Run during office hours only (9am-5pm local time)
   - Take breaks between sessions

3. **Account Health:**
   - Higher SSI score = more automation capacity
   - Premium/Sales Navigator = higher limits
   - New accounts = very conservative limits

4. **Daily Recommendations:**
   - 2 launches of 10 connection requests each
   - Spread across morning and afternoon
   - Don't run 24/7 automation

5. **Avoid Detection:**
   - Don't run multiple Phantoms simultaneously
   - Use personalized messages with placeholders
   - Vary your timing and patterns
   - Monitor account for warnings

**LinkedIn Auto Connect Parameters:**
```javascript
{
  "sessionCookie": "AQEDAxxxxxx...", // Required
  "numberOfProfiles": 20,             // Conservative limit
  "message": "Hi {{firstName}},\n\nI noticed we're both in {{industry}}. Let's connect!",
  "messagePersonalization": true,
  "waitBetweenActions": true          // Add random delays
}
```

**LinkedIn Profile Scraper Parameters:**
```javascript
{
  "sessionCookie": "AQEDAxxxxxx...",
  "spreadsheetUrl": "https://docs.google.com/spreadsheets/...",
  "numberOfProfiles": 100,
  "extractEmails": true,
  "extractPhones": false
}
```

**Best Practice Workflow (via API):**
1. Configure Phantom manually in UI first
2. Test with small batch (5-10 profiles)
3. Verify output format meets needs
4. Copy JSON configuration from API tab
5. Launch via API with conservative limits
6. Monitor for LinkedIn warnings/restrictions

### Rate Limits

**Webhook Timeout:** 11 seconds max

**API Rate Limits:** Not explicitly documented. Best practices:
- Don't launch same agent repeatedly without waiting
- Space launches at least 1-2 minutes apart
- Monitor account usage dashboard

**Execution Limits:**
- Free plan: Limited to 10 CSV rows download
- Execution time varies by plan
- Container timeout depends on agent type

### Response Format

**Success (v2):**
```javascript
{
  "status": "success",
  "data": {
    // Endpoint-specific data
  }
}
```

**Error (4XX/5XX):**
```javascript
{
  "status": "error",
  "message": "Description of what happened"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid or missing parameters |
| 401 | Missing or incorrect API key |
| 404 | Requested resource not found |
| 500 | Server processing failure |

### Node.js SDK

**No Official SDK** - Must build custom wrapper

**Community Examples:**
- [Simple Launch Example (Gist)](https://gist.github.com/paps/57d389924f0b15c8b4733b0baefc0ff4)
- Integration examples via n8n, Pipedream, Make.com

**Recommended Wrapper Structure:**
```javascript
class PhantomBusterClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://phantombuster.com/api/v2';
  }

  async launchAgent(agentId, argument, output = 'result-object') {
    // Implementation
  }

  async getAgentOutput(agentId, mode = 'track') {
    // Implementation
  }

  async downloadResults(agentId, format = 'json') {
    // Get s3Folder from fetch-output
    // Construct download URL
    // Fetch and return data
  }

  async waitForCompletion(agentId, pollInterval = 30000) {
    // Poll until agent finishes
  }
}
```

### Best Practices

1. **Test Manually First:** Always configure and test Phantom in UI before API automation
2. **Conservative Limits:** Start with 20 actions/day, increase gradually
3. **Monitor Account Health:** Watch for LinkedIn warnings or restrictions
4. **Use Webhooks:** More efficient than polling for completion
5. **Handle Errors Gracefully:** LinkedIn may block actions - implement retry logic
6. **Personalize Messages:** Use placeholder variables ({{firstName}}, {{company}})
7. **Session Cookie Management:** Cookies expire - implement refresh mechanism
8. **Combined Phantoms:** Cannot launch via API - use individual agents
9. **Output Format:** Choose carefully - CSV is cumulative, JSON is per-run
10. **Legal Compliance:** Understand that this violates LinkedIn ToS

---

## 4. Implementation Recommendations

### General Node.js Client Architecture

For all three services, follow this pattern:

```javascript
class APIClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseURL = options.baseURL;
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
  }

  async request(method, endpoint, data = null) {
    // Implement retry logic with exponential backoff
    // Handle rate limiting (429)
    // Parse errors consistently
    // Log requests for debugging
  }

  // Service-specific methods
}
```

### Retry Logic Pattern

```javascript
async function retryWithBackoff(fn, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxAttempts - 1) throw error;

      // Don't retry client errors (4xx except 429)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Webhook Security Pattern

```javascript
// Express.js webhook handler
const express = require('express');
const crypto = require('crypto');

function verifyHeyGenWebhook(req, res, next) {
  const signature = req.headers['signature'];
  const secret = process.env.HEYGEN_WEBHOOK_SECRET;
  const content = req.body.toString('utf-8');

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(content, 'utf-8');
  const computed = hmac.digest('hex');

  if (computed !== signature) {
    return res.status(401).send('Invalid signature');
  }

  req.webhookData = JSON.parse(content);
  next();
}

function verifyPostmarkWebhook(req, res, next) {
  // Postmark doesn't use signatures
  // Validate via Basic Auth or IP whitelist
  const auth = req.headers.authorization;

  if (!auth || !validateBasicAuth(auth)) {
    return res.status(401).send('Unauthorized');
  }

  next();
}

app.post('/webhooks/heygen',
  express.raw({ type: '*/*', limit: '10mb' }),
  verifyHeyGenWebhook,
  handleHeyGenWebhook
);

app.post('/webhooks/postmark',
  express.json(),
  verifyPostmarkWebhook,
  handlePostmarkWebhook
);
```

### Environment Variables

```bash
# .env file structure

# HeyGen
HEYGEN_API_KEY=your_api_key_here
HEYGEN_WEBHOOK_SECRET=your_webhook_secret_here

# Postmark
POSTMARK_SERVER_TOKEN=your_server_token_here
POSTMARK_WEBHOOK_USERNAME=webhook_user
POSTMARK_WEBHOOK_PASSWORD=webhook_pass

# PhantomBuster
PHANTOMBUSTER_API_KEY=your_api_key_here
LINKEDIN_SESSION_COOKIE=your_session_cookie_here

# Webhook URLs
HEYGEN_WEBHOOK_URL=https://yourdomain.com/webhooks/heygen
POSTMARK_WEBHOOK_URL=https://user:pass@yourdomain.com/webhooks/postmark
PHANTOMBUSTER_WEBHOOK_URL=https://yourdomain.com/webhooks/phantombuster
```

### Error Handling Pattern

```javascript
class APIError extends Error {
  constructor(message, statusCode, response) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

async function handleAPIResponse(response) {
  if (!response.ok) {
    const error = await response.json();
    throw new APIError(
      error.message || error.Message || 'API request failed',
      response.status,
      error
    );
  }

  return response.json();
}
```

### Testing Recommendations

1. **Mock Webhooks:** Use RequestBin or similar for testing webhook delivery
2. **Sandbox/Test Tokens:** Use test credentials when available
3. **Rate Limit Testing:** Implement circuit breaker pattern
4. **Error Scenarios:** Test 401, 429, 500, 503 responses
5. **Timeout Handling:** Test slow responses and timeouts

### Monitoring & Logging

```javascript
// Recommended logging structure
const logger = {
  api: (service, method, endpoint, duration, status) => {
    console.log({
      timestamp: new Date().toISOString(),
      service,
      method,
      endpoint,
      duration,
      status,
      type: 'api_call'
    });
  },

  webhook: (service, event, data) => {
    console.log({
      timestamp: new Date().toISOString(),
      service,
      event,
      data,
      type: 'webhook_received'
    });
  },

  error: (service, error, context) => {
    console.error({
      timestamp: new Date().toISOString(),
      service,
      error: {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode
      },
      context,
      type: 'error'
    });
  }
};
```

### Package Structure

Recommended npm package structure for client libraries:

```
my-service-client/
├── src/
│   ├── clients/
│   │   ├── HeyGenClient.js
│   │   ├── PostmarkClient.js
│   │   └── PhantomBusterClient.js
│   ├── utils/
│   │   ├── retry.js
│   │   ├── webhook.js
│   │   └── errors.js
│   ├── types/
│   │   └── index.d.ts
│   └── index.js
├── tests/
│   ├── heygen.test.js
│   ├── postmark.test.js
│   └── phantombuster.test.js
├── examples/
│   ├── heygen-video.js
│   ├── postmark-email.js
│   └── phantombuster-linkedin.js
├── package.json
├── README.md
└── .env.example
```

---

## Sources

### HeyGen API Sources
- [HeyGen API Documentation](https://docs.heygen.com/)
- [Authentication API Reference](https://docs.heygen.com/reference/authentication)
- [Quick Start Guide](https://docs.heygen.com/docs/quick-start)
- [Webhook Events Documentation](https://docs.heygen.com/docs/write-your-endpoint-to-process-webhook-events)
- [API Limits and Usage Guidelines](https://docs.heygen.com/reference/limits)
- [Video Status Endpoint](https://docs.heygen.com/reference/video-status)
- [List Avatars V2](https://docs.heygen.com/reference/list-avatars-v2)
- [List Voices V2](https://docs.heygen.com/reference/list-voices-v2)
- [Error Responses](https://docs.heygen.com/reference/errors)
- [Streaming Avatar SDK](https://github.com/HeyGen-Official/StreamingAvatarSDK)
- [@heygen/streaming-avatar NPM](https://www.npmjs.com/package/@heygen/streaming-avatar)

### Postmark API Sources
- [Postmark Developer Documentation](https://postmarkapp.com/developer)
- [Email API Documentation](https://postmarkapp.com/developer/api/email-api)
- [Templates API](https://postmarkapp.com/developer/api/templates-api)
- [Webhooks Overview](https://postmarkapp.com/developer/webhooks/webhooks-overview)
- [Bounce Webhook](https://postmarkapp.com/developer/webhooks/bounce-webhook)
- [Delivery Webhook](https://postmarkapp.com/developer/webhooks/delivery-webhook)
- [Spam Complaint Webhook](https://postmarkapp.com/developer/webhooks/spam-complaint-webhook)
- [Inbound Webhook](https://postmarkapp.com/developer/webhooks/inbound-webhook)
- [API Overview](https://postmarkapp.com/developer/api/overview)
- [Official Postmark.js Library](https://github.com/ActiveCampaign/postmark.js)
- [Postmark NPM Package](https://www.npmjs.com/package/postmark)

### PhantomBuster API Sources
- [PhantomBuster API Documentation](https://hub.phantombuster.com/docs/api)
- [API Reference](https://hub.phantombuster.com/reference)
- [Developer Quick Start](https://hub.phantombuster.com/docs/developer-quick-start)
- [Using Webhooks](https://hub.phantombuster.com/docs/using-webhooks)
- [Agent Launch Endpoint](https://hub.phantombuster.com/reference/launchagent-1)
- [Fetch Output Endpoint](https://hub.phantombuster.com/reference/get_agents-fetch-output)
- [LinkedIn Automation Best Practices 2025](https://phantombuster.com/blog/guides/linkedin-automation-rate-limits-5pFlkXZFjtku79DltwBF0M)
- [PhantomBuster Guide: LinkedIn Automation in 2025](https://scrupp.com/blog/phontombuster)
- [LinkedIn Auto Connect Tutorial](https://support.phantombuster.com/hc/en-us/articles/26971011946130-How-to-use-the-LinkedIn-Auto-Connect)
- [Access Results via API Guide](https://support.phantombuster.com/hc/en-us/articles/23117755693458-Retrieve-Your-Results-Via-API)

---

**End of Research Document**
