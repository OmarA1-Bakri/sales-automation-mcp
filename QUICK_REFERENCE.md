# Circuit Breaker Quick Reference Guide

## Installation

```bash
npm install opossum opossum-prometheus axios-retry ioredis
```

## Basic Usage

### Simple Circuit Breaker

```javascript
const CircuitBreaker = require('opossum');

async function apiCall() {
  const response = await fetch('https://api.example.com/data');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const breaker = new CircuitBreaker(apiCall, {
  timeout: 10000,                  // 10s timeout
  errorThresholdPercentage: 50,    // Open at 50% errors
  resetTimeout: 30000,             // Try recovery after 30s
  volumeThreshold: 5               // Need 5 requests before opening
});

// Use it
breaker.fire()
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

### With Fallback

```javascript
breaker.fallback(() => {
  return { data: 'cached', _fallback: true };
});
```

### With Events

```javascript
breaker.on('open', () => console.error('Circuit OPEN'));
breaker.on('halfOpen', () => console.warn('Circuit testing recovery'));
breaker.on('close', () => console.info('Circuit recovered'));
```

## Configuration Cheat Sheet

### Recommended Values by Use Case

**Fast API (< 1s response)**
```javascript
{
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 20000,
  volumeThreshold: 10
}
```

**Normal API (1-5s response)**
```javascript
{
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5
}
```

**Slow API (5-30s response)**
```javascript
{
  timeout: 30000,
  errorThresholdPercentage: 40,
  resetTimeout: 60000,
  volumeThreshold: 3
}
```

### Critical Configuration Parameters

| Parameter | Purpose | Typical Values |
|-----------|---------|----------------|
| `timeout` | Max request duration | 5000-30000ms |
| `errorThresholdPercentage` | Error rate to open circuit | 40-60% |
| `resetTimeout` | Time before retry attempt | 20000-60000ms |
| `volumeThreshold` | Min requests before opening | 3-10 requests |
| `rollingCountTimeout` | Stats window duration | 10000-60000ms |
| `rollingCountBuckets` | Stats window granularity | 10-12 buckets |

## Common Patterns

### Circuit Breaker + Retry (CORRECT ORDER)

```javascript
const axios = require('axios');
const axiosRetry = require('axios-retry');
const CircuitBreaker = require('opossum');

// 1. Setup axios with retry
const axiosInstance = axios.create({ timeout: 8000 });
axiosRetry(axiosInstance, {
  retries: 5,
  retryDelay: (retryCount) => Math.pow(2, retryCount - 1) * 1000
});

// 2. Wrap in circuit breaker
async function apiCall() {
  const response = await axiosInstance.get('/endpoint');
  return response.data;
}

const breaker = new CircuitBreaker(apiCall, {
  timeout: 90000 // Must accommodate all retries!
});
```

### Axios Integration

```javascript
const axios = require('axios');
const CircuitBreaker = require('opossum');

async function makeRequest(url, options) {
  const response = await axios.get(url, options);
  return response.data;
}

const breaker = new CircuitBreaker(makeRequest, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  errorFilter: (err) => {
    // Exclude 4xx from circuit statistics
    return err.response?.status >= 400 && err.response?.status < 500;
  }
});
```

### Fetch Integration (Node.js 18+)

```javascript
const CircuitBreaker = require('opossum');

// IMPORTANT: Fetch doesn't throw on HTTP errors!
async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

const breaker = new CircuitBreaker(fetchData, {
  timeout: 10000,
  errorThresholdPercentage: 50
});
```

### Cache-Based Fallback

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function apiCall(id) {
  const data = await fetch(`/api/data/${id}`).then(r => r.json());

  // Cache on success
  await redis.setex(`data:${id}`, 300, JSON.stringify(data));

  return data;
}

const breaker = new CircuitBreaker(apiCall, { ... });

breaker.fallback(async (id) => {
  // Return cached data when circuit is open
  const cached = await redis.get(`data:${id}`);
  if (cached) {
    return { ...JSON.parse(cached), _cached: true };
  }
  throw new Error('No cached data available');
});
```

## Factory Pattern

```javascript
const CircuitBreaker = require('opossum');

class CircuitBreakerFactory {
  constructor() {
    this.breakers = new Map();
  }

  create(name, action, options = {}) {
    if (this.breakers.has(name)) {
      return this.breakers.get(name);
    }

    const breaker = new CircuitBreaker(action, {
      ...defaultOptions,
      ...options,
      name
    });

    this.breakers.set(name, breaker);
    return breaker;
  }

  getAll() {
    return Array.from(this.breakers.values());
  }
}

module.exports = new CircuitBreakerFactory();
```

## Health Check Endpoint

```javascript
const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  const states = circuitBreakerFactory.getStates();

  const anyOpen = Object.values(states).some(s => s.state === 'OPEN');

  res.status(anyOpen ? 503 : 200).json({
    status: anyOpen ? 'degraded' : 'healthy',
    circuits: states
  });
});
```

## Prometheus Metrics

```javascript
const PrometheusMetrics = require('opossum-prometheus');
const client = require('prom-client');

const register = new client.Registry();
const prometheusMetrics = new PrometheusMetrics({
  circuits: [breaker1, breaker2],
  registry: register
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Testing

### Test Circuit Opening

```javascript
it('should open circuit after error threshold', async () => {
  async function failingFunction() {
    throw new Error('Failed');
  }

  const breaker = new CircuitBreaker(failingFunction, {
    timeout: 1000,
    errorThresholdPercentage: 50,
    volumeThreshold: 5
  });

  // Trigger 10 failures
  for (let i = 0; i < 10; i++) {
    await breaker.fire().catch(() => {});
  }

  expect(breaker.opened).to.be.true;
});
```

### Test Half-Open Recovery

```javascript
it('should recover via half-open state', async function() {
  this.timeout(5000);

  let callCount = 0;

  async function recoveryFunction() {
    callCount++;
    if (callCount <= 10) throw new Error('Failing');
    return 'Success';
  }

  const breaker = new CircuitBreaker(recoveryFunction, {
    resetTimeout: 100,
    volumeThreshold: 5
  });

  // Open circuit
  for (let i = 0; i < 10; i++) {
    await breaker.fire().catch(() => {});
  }

  // Wait for half-open
  await new Promise(resolve => setTimeout(resolve, 150));

  // Should succeed and close
  const result = await breaker.fire();
  expect(result).to.equal('Success');
  expect(breaker.opened).to.be.false;
});
```

## Common Pitfalls

### DON'T: Circuit timeout shorter than HTTP timeout
```javascript
// ❌ BAD
const breaker = new CircuitBreaker(apiCall, { timeout: 3000 });
axios.get(url, { timeout: 5000 }); // Circuit times out first!
```

### DO: Circuit timeout longer than HTTP timeout
```javascript
// ✅ GOOD
const breaker = new CircuitBreaker(apiCall, { timeout: 10000 });
axios.get(url, { timeout: 8000 }); // HTTP times out first
```

### DON'T: Forget to check response.ok with fetch
```javascript
// ❌ BAD
async function fetchData() {
  const response = await fetch(url);
  return response.json(); // Returns even on 500 errors!
}
```

### DO: Manually check HTTP status
```javascript
// ✅ GOOD
async function fetchData() {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
```

### DON'T: Retry wrapping circuit breaker
```javascript
// ❌ BAD
async function withRetry() {
  for (let i = 0; i < 5; i++) {
    try {
      return await breaker.fire(); // Retries even when open!
    } catch {}
  }
}
```

### DO: Circuit breaker wrapping retry
```javascript
// ✅ GOOD
async function apiCallWithRetry() {
  for (let i = 0; i < 5; i++) {
    try {
      return await axios.get(url);
    } catch {}
  }
}

const breaker = new CircuitBreaker(apiCallWithRetry, { ... });
```

## State Diagram

```
        [Errors exceed threshold]
CLOSED ────────────────────────────> OPEN
  ↑                                    │
  │                                    │ [resetTimeout expires]
  │                                    ↓
  │                                HALF_OPEN
  │                                    │
  │ [Request succeeds]                 │ [Request fails]
  └────────────────────────────────────┴──────────────> OPEN
```

## Events Reference

| Event | When Emitted | Use Case |
|-------|-------------|----------|
| `fire` | Request initiated | Log all requests |
| `success` | Request succeeded | Track success metrics |
| `failure` | Request failed | Log errors |
| `timeout` | Request timed out | Alert on slow responses |
| `reject` | Circuit open, request rejected | Track rejected requests |
| `open` | Circuit opened | CRITICAL ALERT |
| `halfOpen` | Testing recovery | Log recovery attempts |
| `close` | Circuit recovered | Log recovery success |
| `fallback` | Fallback executed | Track degraded service |
| `semaphoreLocked` | At capacity | Scale up alerts |

## Monitoring Checklist

- [ ] Circuit state gauges (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
- [ ] Request rate per circuit
- [ ] Error rate per circuit
- [ ] Fallback usage rate
- [ ] Circuit open/close events
- [ ] Latency percentiles (P50, P95, P99)
- [ ] Health check endpoint
- [ ] Alerting on circuit open events
- [ ] Dashboard with circuit states
- [ ] Logs for state transitions

## Quick Debug Commands

### Check circuit state
```javascript
console.log(breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED');
```

### Get statistics
```javascript
console.log(breaker.stats);
// { fires: 100, successes: 60, failures: 40, ... }
```

### Manual reset
```javascript
breaker.close(); // Force close circuit
```

### Disable circuit
```javascript
breaker.disable(); // Circuit always closed
breaker.enable();  // Re-enable
```

## Resources

- Official Docs: https://nodeshift.dev/opossum/
- GitHub: https://github.com/nodeshift/opossum
- Prometheus Integration: https://github.com/nodeshift/opossum-prometheus
- Examples: https://github.com/nodeshift-starters/opossum-examples
