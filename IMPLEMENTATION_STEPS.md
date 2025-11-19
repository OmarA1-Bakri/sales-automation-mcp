# Circuit Breaker Implementation Steps

This document provides a step-by-step implementation plan for integrating circuit breakers into your Node.js 18 Express backend with HubSpot, Lemlist, and Explorium API clients.

## Prerequisites

- Node.js 18+
- Express backend
- Existing API clients (axios/fetch)
- Redis (for caching)
- Prometheus (optional, for monitoring)

## Phase 1: Foundation Setup (Day 1)

### Step 1.1: Install Dependencies

```bash
npm install --save opossum opossum-prometheus ioredis
npm install --save-dev @types/opossum chai mocha sinon
```

### Step 1.2: Create Circuit Breaker Factory

**File**: `src/utils/circuitBreakerFactory.js`

Copy the factory implementation from `examples/circuitBreakerFactory.js`

Key features:
- Singleton pattern
- Pre-configured service templates
- Shared bucket rotation
- Event logging

**Validation**:
```javascript
// Test factory creation
const factory = require('./utils/circuitBreakerFactory');
const testBreaker = factory.create('test', async () => 'success');
console.log(testBreaker.name); // Should output: 'test'
```

### Step 1.3: Setup Redis Connection

**File**: `src/config/redis.js`

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

module.exports = redis;
```

**Environment Variables**:
```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password_here
```

**Validation**:
```bash
# Test Redis connection
node -e "require('./src/config/redis').ping().then(console.log)"
# Should output: PONG
```

## Phase 2: API Client Integration (Days 2-3)

### Step 2.1: Integrate HubSpot Client

**File**: `src/services/hubspot/hubspotClient.js`

1. Copy implementation from `examples/hubspotClient.js`
2. Update environment variables:

```bash
# .env
HUBSPOT_API_KEY=your_hubspot_api_key
```

3. Update existing HubSpot API calls:

**Before**:
```javascript
// Old direct axios call
const response = await axios.get('https://api.hubspot.com/crm/v3/objects/contacts/123');
```

**After**:
```javascript
// New circuit breaker protected call
const hubspotClient = require('./services/hubspot/hubspotClient');
const contact = await hubspotClient.getContact('123');
```

**Validation**:
```javascript
// Test HubSpot client
const hubspotClient = require('./services/hubspot/hubspotClient');

hubspotClient.getContact('test-id')
  .then(data => console.log('Success:', data))
  .catch(err => console.error('Error:', err));

// Check circuit state
console.log(hubspotClient.getCircuitState());
```

### Step 2.2: Integrate Lemlist Client

**File**: `src/services/lemlist/lemlistClient.js`

Similar pattern to HubSpot:

```javascript
const axios = require('axios');
const axiosRetry = require('axios-retry');
const circuitBreakerFactory = require('../../utils/circuitBreakerFactory');

const lemlistAxios = axios.create({
  baseURL: 'https://api.lemlist.com/api',
  timeout: 12000,
  headers: {
    'Authorization': `Bearer ${process.env.LEMLIST_API_KEY}`
  }
});

axiosRetry(lemlistAxios, {
  retries: 5,
  retryDelay: (retryCount) => Math.pow(2, retryCount - 1) * 1000
});

async function makeLemlistRequest(method, endpoint, data) {
  const response = await lemlistAxios.request({ method, url: endpoint, data });
  return response.data;
}

const lemlistBreaker = circuitBreakerFactory.createForService(
  'lemlist',
  makeLemlistRequest
);

// Add fallback for non-critical operations
lemlistBreaker.fallback((method, endpoint, data) => {
  console.log('[Lemlist] Circuit open, operation queued');
  // Queue for retry or return empty result
  return { queued: true, endpoint, data };
});

class LemlistClient {
  async createCampaign(campaignData) {
    return lemlistBreaker.fire('POST', '/campaigns', campaignData);
  }

  async addLead(campaignId, leadData) {
    return lemlistBreaker.fire('POST', `/campaigns/${campaignId}/leads`, leadData);
  }

  getCircuitState() {
    return {
      name: 'lemlist',
      state: lemlistBreaker.opened ? 'OPEN' : 'CLOSED',
      stats: lemlistBreaker.stats
    };
  }
}

module.exports = new LemlistClient();
```

**Environment Variables**:
```bash
# .env
LEMLIST_API_KEY=your_lemlist_api_key
```

### Step 2.3: Integrate Explorium Client

**File**: `src/services/explorium/exploriumClient.js`

Using Fetch API:

```javascript
const CircuitBreaker = require('opossum');
const circuitBreakerFactory = require('../../utils/circuitBreakerFactory');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 3600 });

async function fetchWithRetry(url, options, maxRetries = 5) {
  const backoffDelays = [1000, 2000, 4000, 8000, 16000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = new Error(`Explorium error: ${response.status}`);
        error.statusCode = response.status;

        if (response.status >= 400 && response.status < 500) {
          throw error; // Don't retry client errors
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, backoffDelays[attempt]));
          continue;
        }

        throw error;
      }

      return response.json();

    } catch (error) {
      if (attempt === maxRetries || error.name === 'AbortError') {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, backoffDelays[attempt]));
    }
  }
}

async function makeExploriumRequest(endpoint, options, signal) {
  const url = `https://api.explorium.ai/v1/${endpoint}`;
  const cacheKey = `explorium:${endpoint}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const result = await fetchWithRetry(url, {
    headers: {
      'Authorization': `Bearer ${process.env.EXPLORIUM_API_KEY}`,
      'Content-Type': 'application/json',
      ...options?.headers
    },
    signal,
    ...options
  });

  cache.set(cacheKey, result);
  return result;
}

const abortController = new AbortController();
const exploriumBreaker = circuitBreakerFactory.createForService(
  'explorium',
  makeExploriumRequest,
  {
    abortController,
    autoRenewAbortController: true
  }
);

exploriumBreaker.fallback((endpoint, options) => {
  const cacheKey = `explorium:${endpoint}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return { ...cached, _cached: true, _fallback: true };
  }

  return {
    enriched: false,
    error: 'Enrichment temporarily unavailable',
    _fallback: true
  };
});

class ExploriumClient {
  async enrichCompany(domain) {
    return exploriumBreaker.fire(
      'enrichment/company',
      {
        method: 'POST',
        body: JSON.stringify({ domain })
      },
      exploriumBreaker.getSignal()
    );
  }

  getCircuitState() {
    return {
      name: 'explorium',
      state: exploriumBreaker.opened ? 'OPEN' : 'CLOSED',
      stats: exploriumBreaker.stats
    };
  }
}

module.exports = new ExploriumClient();
```

**Environment Variables**:
```bash
# .env
EXPLORIUM_API_KEY=your_explorium_api_key
```

## Phase 3: Health Checks & Monitoring (Day 4)

### Step 3.1: Add Health Check Endpoints

**File**: `src/routes/healthCheck.js`

Copy implementation from `examples/healthCheckRouter.js`

### Step 3.2: Integrate Health Checks in Express App

**File**: `src/app.js` or `src/server.js`

```javascript
const express = require('express');
const healthCheckRouter = require('./routes/healthCheck');
const circuitBreakerFactory = require('./utils/circuitBreakerFactory');

const app = express();

// Health check endpoints
app.use(healthCheckRouter);

// Your existing routes
app.use('/api', require('./routes/api'));

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');

  circuitBreakerFactory.shutdown();

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const server = app.listen(3000, () => {
  console.log('Server started on port 3000');
});
```

**Validation**:
```bash
# Test health endpoints
curl http://localhost:3000/health
curl http://localhost:3000/health/detailed
curl http://localhost:3000/health/ready
curl http://localhost:3000/health/live
```

### Step 3.3: Setup Prometheus Metrics

**File**: `src/monitoring/prometheusMetrics.js`

Copy implementation from `examples/prometheusMetrics.js`

**Update app.js**:
```javascript
const { getMetrics, getContentType } = require('./monitoring/prometheusMetrics');

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', getContentType());
    const metrics = await getMetrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error.message);
  }
});
```

**Validation**:
```bash
curl http://localhost:3000/metrics
# Should return Prometheus formatted metrics
```

### Step 3.4: Configure Prometheus Scraping

**File**: `prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'sales-auto-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

**Start Prometheus**:
```bash
docker run -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

**Validation**:
- Open http://localhost:9090
- Query: `circuit_breaker_state`
- Should show circuit breaker states

## Phase 4: Testing (Day 5)

### Step 4.1: Unit Tests

**File**: `test/unit/circuitBreaker.test.js`

Copy implementation from `examples/circuitBreaker.test.js`

**Run tests**:
```bash
npm test
```

### Step 4.2: Integration Tests

**File**: `test/integration/apiClients.test.js`

```javascript
const { expect } = require('chai');
const hubspotClient = require('../../src/services/hubspot/hubspotClient');
const lemlistClient = require('../../src/services/lemlist/lemlistClient');
const exploriumClient = require('../../src/services/explorium/exploriumClient');

describe('API Client Integration Tests', () => {
  describe('HubSpot Client', () => {
    it('should handle successful contact retrieval', async () => {
      const contact = await hubspotClient.getContact('test-id');
      expect(contact).to.be.an('object');
    });

    it('should use cache on repeated requests', async () => {
      const contact1 = await hubspotClient.getContact('test-id');
      const contact2 = await hubspotClient.getContact('test-id');

      expect(contact2._cached).to.be.true;
    });
  });

  // Similar tests for Lemlist and Explorium
});
```

### Step 4.3: Load Testing

**File**: `test/load/circuitBreakerLoad.test.js`

```javascript
const CircuitBreaker = require('opossum');

async function loadTest() {
  let requestCount = 0;

  async function simulateApiCall() {
    requestCount++;
    // Simulate degradation
    if (requestCount > 100) {
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
    if (Math.random() < 0.1) throw new Error('Random error');
    return { data: 'Success' };
  }

  const breaker = new CircuitBreaker(simulateApiCall, {
    timeout: 5000,
    errorThresholdPercentage: 50,
    volumeThreshold: 20
  });

  const metrics = { total: 0, success: 0, rejected: 0 };

  breaker.on('success', () => metrics.success++);
  breaker.on('reject', () => metrics.rejected++);

  // Send 500 requests
  for (let i = 0; i < 500; i++) {
    metrics.total++;
    await breaker.fire().catch(() => {});
  }

  console.log(`Success: ${metrics.success}/${metrics.total}`);
  console.log(`Rejected: ${metrics.rejected} (saved time)`);
}

loadTest().catch(console.error);
```

**Run load test**:
```bash
node test/load/circuitBreakerLoad.test.js
```

## Phase 5: Deployment (Day 6)

### Step 5.1: Update Environment Variables

**Production `.env`**:
```bash
NODE_ENV=production
APP_VERSION=1.0.0

# API Keys
HUBSPOT_API_KEY=prod_hubspot_key
LEMLIST_API_KEY=prod_lemlist_key
EXPLORIUM_API_KEY=prod_explorium_key

# Redis
REDIS_HOST=redis.prod.example.com
REDIS_PORT=6379
REDIS_PASSWORD=prod_redis_password

# Circuit Breaker Overrides (optional)
HUBSPOT_CIRCUIT_TIMEOUT=10000
LEMLIST_CIRCUIT_TIMEOUT=15000
EXPLORIUM_CIRCUIT_TIMEOUT=30000
```

### Step 5.2: Kubernetes Configuration

**File**: `k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sales-auto-api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: sales-auto-api:latest
        ports:
        - containerPort: 3000

        # Health checks
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10

        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5

        # Environment variables
        env:
        - name: NODE_ENV
          value: "production"
        - name: HUBSPOT_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: hubspot-api-key
```

### Step 5.3: Monitoring Setup

1. **Configure Grafana Dashboard**:
   - Import circuit breaker dashboard
   - Add panels for each service
   - Configure alerts

2. **Setup Alerting Rules**:

**File**: `alerting_rules.yml`

```yaml
groups:
  - name: circuit_breaker_alerts
    rules:
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state == 2
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Circuit breaker {{ $labels.circuit_name }} is OPEN"

      - alert: HighErrorRate
        expr: |
          rate(circuit_breaker_failure_total[5m]) /
          rate(circuit_breaker_fire_total[5m]) > 0.25
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate on {{ $labels.circuit_name }}"
```

## Phase 6: Validation & Tuning (Week 2)

### Step 6.1: Monitor Initial Performance

**Week 1 Monitoring Checklist**:
- [ ] Track P50, P95, P99 latencies
- [ ] Monitor error rates
- [ ] Check circuit open/close frequency
- [ ] Analyze fallback usage
- [ ] Review cache hit rates

### Step 6.2: Tune Configuration

Based on monitoring data, adjust:

1. **If circuit opens too frequently**:
   - Increase `errorThresholdPercentage`
   - Increase `volumeThreshold`
   - Increase `timeout`

2. **If circuit doesn't open when it should**:
   - Decrease `errorThresholdPercentage`
   - Decrease `volumeThreshold`
   - Add more specific error filters

3. **If recovery is too slow/fast**:
   - Adjust `resetTimeout`

### Step 6.3: Document Runbooks

**File**: `docs/runbooks/circuit-breaker-runbook.md`

Create runbook covering:
- How to check circuit status
- Manual circuit reset procedure
- Common failure scenarios
- Escalation paths

## Success Criteria

- [ ] All three API clients integrated with circuit breakers
- [ ] Health check endpoints responding correctly
- [ ] Prometheus metrics being scraped
- [ ] Grafana dashboard displaying circuit states
- [ ] Alerts configured and tested
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Load test demonstrating circuit breaker behavior
- [ ] Documentation complete
- [ ] Production deployment successful
- [ ] Zero production incidents related to cascading failures

## Expected Outcomes

1. **Resilience Score**: 85-90/100
2. **Reduced cascading failures**: 95%+ reduction
3. **Faster failure detection**: < 10 seconds
4. **Improved availability**: 99.9%+ uptime
5. **Better observability**: Real-time circuit status

## Rollback Plan

If issues arise:

1. **Disable circuit breakers temporarily**:
```javascript
breaker.disable(); // Circuit always closed, no protection
```

2. **Increase thresholds to be very tolerant**:
```javascript
breaker.options.errorThresholdPercentage = 95;
breaker.options.volumeThreshold = 100;
```

3. **Remove circuit breaker integration**:
   - Revert to direct API calls
   - Keep monitoring in place
   - Plan for re-integration

## Support Resources

- Team contact: devops@company.com
- On-call rotation: PagerDuty
- Documentation: https://wiki.company.com/circuit-breakers
- Slack channel: #circuit-breaker-support
