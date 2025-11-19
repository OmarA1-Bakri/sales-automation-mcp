# Comprehensive Circuit Breaker Implementation Guide with Opossum

## Executive Summary

This guide provides production-ready patterns for implementing circuit breakers using the **opossum** library for Node.js 18+ Express backend with external API integrations (HubSpot, Lemlist, Explorium).

**Target Resilience Score Contribution:** 85-90/100

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Opossum Configuration Reference](#opossum-configuration-reference)
3. [Integration with Axios and Fetch](#integration-with-axios-and-fetch)
4. [Retry Logic + Circuit Breaker Architecture](#retry-logic--circuit-breaker-architecture)
5. [Production Configuration Values](#production-configuration-values)
6. [Centralized Circuit Breaker Factory](#centralized-circuit-breaker-factory)
7. [Fallback Strategies](#fallback-strategies)
8. [Health Check Integration](#health-check-integration)
9. [Monitoring with Prometheus](#monitoring-with-prometheus)
10. [Testing Strategies](#testing-strategies)
11. [Production Code Examples](#production-code-examples)
12. [Common Pitfalls](#common-pitfalls)

---

## Core Concepts

### What is Opossum?

Opossum is a Node.js circuit breaker that executes asynchronous functions and monitors their execution status. When failures accumulate beyond configured thresholds, it "plays dead and fails fast" to prevent cascading failures.

### Circuit Breaker States

1. **CLOSED** (Normal Operation)
   - All requests pass through
   - Monitors success/failure rates within rolling window
   - Transitions to OPEN when error threshold exceeded

2. **OPEN** (Failing Fast)
   - Immediately rejects all requests without attempting them
   - Returns fallback response or throws error
   - After `resetTimeout`, transitions to HALF_OPEN

3. **HALF_OPEN** (Recovery Testing)
   - Allows single test request to pass through
   - If successful: transitions back to CLOSED
   - If fails: immediately returns to OPEN

### Key Benefits

- Prevents cascading failures across microservices
- Reduces load on failing downstream services
- Enables graceful degradation with fallbacks
- Provides fast failure response to users
- Improves overall system resilience

---

## Opossum Configuration Reference

### Complete Configuration Options

```javascript
const options = {
  // === Timeout Configuration ===
  timeout: 10000,                    // Default: 10000ms (10 sec)
  // Request execution timeout before triggering failure

  // === Circuit Breaking Thresholds ===
  errorThresholdPercentage: 50,      // Default: 50%
  // Error rate percentage that triggers circuit opening

  volumeThreshold: 0,                // Default: 0 (disabled)
  // Minimum number of requests before circuit can open
  // Prevents premature opening during low traffic

  // === Reset Configuration ===
  resetTimeout: 30000,               // Default: 30000ms (30 sec)
  // Time to wait in OPEN state before attempting HALF_OPEN

  // === Rolling Statistics Window ===
  rollingCountTimeout: 10000,        // Default: 10000ms (10 sec)
  // Duration of the statistical rolling window

  rollingCountBuckets: 10,           // Default: 10 buckets
  // Number of time slices in the rolling window
  // Window slice duration = rollingCountTimeout / rollingCountBuckets
  // Default: 10000ms / 10 = 1000ms per bucket

  // === Capacity Management ===
  capacity: Number.MAX_SAFE_INTEGER, // Default: Max safe integer
  // Maximum concurrent requests allowed
  // Exceeding triggers 'semaphoreLocked' event

  // === Circuit Identification ===
  name: 'myCircuit',                 // Default: function name
  // Identifier for logging and monitoring

  // === Enable/Disable ===
  enabled: true,                     // Default: true
  // Whether circuit breaker is active on construction

  // === Warmup Configuration ===
  allowWarmUp: false,                // Default: false
  // Allow failures without opening during brief warmup period
  // Useful for services that need initialization time

  // === Error Filtering ===
  errorFilter: (err) => {            // Default: undefined
    // Return true to exclude error from failure statistics
    // Example: Ignore 404s as they aren't service failures
    return err.statusCode === 404;
  },

  // === Caching ===
  cache: false,                      // Default: false
  // Enable result caching for successful executions

  cacheTTL: 0,                       // Default: 0 (infinite)
  // Cache time-to-live in milliseconds

  cacheGetKey: (...args) => {        // Default: JSON.stringify(args)
    // Custom cache key generator
    return JSON.stringify(args);
  },

  cacheTransport: {                  // Default: built-in Map
    // Custom cache implementation (e.g., Redis)
    get: async (key) => {},
    set: async (key, value) => {},
    flush: async () => {}
  },

  // === Performance Metrics ===
  rollingPercentilesEnabled: true,   // Default: true
  // Calculate execution latency percentiles

  enableSnapshots: true,             // Default: true
  // Emit rolling stats snapshots at bucket intervals

  // === AbortController Support ===
  abortController: new AbortController(), // Default: undefined
  // Pass AbortController to cancel in-flight requests on timeout

  autoRenewAbortController: false,   // Default: false
  // Automatically refresh AbortController when transitioning
  // to HALF_OPEN or CLOSED states

  // === Shared Bucket Rotation ===
  rotateBucketController: EventEmitter // Default: undefined
  // Share EventEmitter across multiple breakers to consolidate timers
};
```

### Configuration Best Practices

1. **Start Conservative**: Begin with higher thresholds (e.g., 50% error rate) and adjust based on monitoring
2. **Match Service SLAs**: Set `timeout` based on downstream service SLA + network overhead
3. **Use volumeThreshold**: Prevent false positives during low traffic periods
4. **Enable warmUp**: For services requiring initialization (database connections, cache warmup)
5. **Custom errorFilter**: Exclude expected errors (404s, validation errors) from circuit statistics

---

## Integration with Axios and Fetch

### Axios Integration Pattern

```javascript
const CircuitBreaker = require('opossum');
const axios = require('axios');

// Method 1: Wrap axios instance method
async function makeHubSpotRequest(endpoint, options) {
  const response = await axios.get(
    `https://api.hubspot.com/crm/v3/${endpoint}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
        ...options?.headers
      },
      timeout: 8000, // Axios timeout (should be < circuit breaker timeout)
      ...options
    }
  );
  return response.data;
}

const hubspotBreaker = new CircuitBreaker(makeHubSpotRequest, {
  timeout: 10000,                  // Circuit breaker timeout > axios timeout
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
  name: 'hubspot-circuit'
});

// Method 2: Wrap axios directly with AbortController
async function makeRequestWithAbort(url, options, signal) {
  const response = await axios.get(url, {
    ...options,
    signal // Pass AbortSignal from circuit breaker
  });
  return response.data;
}

const abortController = new AbortController();
const breakerWithAbort = new CircuitBreaker(makeRequestWithAbort, {
  timeout: 10000,
  abortController,
  autoRenewAbortController: true, // Auto-renew on state transitions
  name: 'api-with-abort'
});

// Usage
breakerWithAbort.fire(
  'https://api.example.com/data',
  { headers: { 'Authorization': 'Bearer token' } },
  breakerWithAbort.getSignal() // Get current AbortSignal
);
```

### Fetch API Integration (Node.js 18+)

```javascript
const CircuitBreaker = require('opossum');

// IMPORTANT: Fetch doesn't throw on HTTP errors (4xx, 5xx)
// You MUST manually check response.ok and throw errors
async function fetchWithErrorHandling(url, options) {
  const response = await fetch(url, options);

  // Critical: Check HTTP status and throw on errors
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    error.statusCode = response.status;
    error.response = response;
    throw error;
  }

  return response.json();
}

// Fetch integration with AbortController
async function fetchExplorium(endpoint, options, signal) {
  const response = await fetch(
    `https://api.explorium.ai/v1/${endpoint}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.EXPLORIUM_API_KEY}`,
        'Content-Type': 'application/json',
        ...options?.headers
      },
      signal, // Pass AbortSignal for timeout cancellation
      ...options
    }
  );

  if (!response.ok) {
    const error = new Error(`Explorium API Error: ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  return response.json();
}

const abortController = new AbortController();
const exploriumBreaker = new CircuitBreaker(fetchExplorium, {
  timeout: 15000,
  errorThresholdPercentage: 50,
  resetTimeout: 45000,
  volumeThreshold: 3,
  name: 'explorium-circuit',
  abortController,
  autoRenewAbortController: true,

  // Exclude client errors from circuit statistics
  errorFilter: (err) => {
    return err.statusCode >= 400 && err.statusCode < 500;
  }
});

// Usage
exploriumBreaker.fire(
  'enrichment/company',
  { method: 'POST', body: JSON.stringify(data) },
  exploriumBreaker.getSignal()
)
.then(result => console.log('Success:', result))
.catch(err => console.error('Circuit breaker error:', err));
```

### Key Integration Considerations

1. **Timeout Layering**:
   - Axios/Fetch timeout < Circuit Breaker timeout
   - Example: Axios timeout 8s, Circuit timeout 10s
   - Circuit breaker acts as outer safety net

2. **Fetch API Gotcha**:
   - Fetch does NOT throw on HTTP errors (4xx, 5xx)
   - Always check `response.ok` and throw manually
   - Without this, circuit won't detect API failures

3. **AbortController Usage**:
   - Pass `signal` to axios/fetch for proper cancellation
   - Use `autoRenewAbortController: true` for automatic renewal
   - Get current signal via `breaker.getSignal()`

---

## Retry Logic + Circuit Breaker Architecture

### The Critical Question: Which Wraps Which?

**RECOMMENDED ARCHITECTURE: Circuit Breaker WRAPS Retry Logic**

```
┌─────────────────────────────────────────┐
│         Circuit Breaker (Outer)         │
│  ┌───────────────────────────────────┐  │
│  │      Retry Logic (Inner)          │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │    HTTP Request (Core)      │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Why This Order?

1. **Circuit Breaker as Guardian**: Monitors overall health across all retry attempts
2. **Fast Failure**: When circuit opens, immediately fails without wasting retry attempts
3. **Prevents Retry Storms**: Circuit stops retries to failing services
4. **Better Statistics**: Circuit sees aggregate success/failure across retries

### Anti-Pattern: Retry Wrapping Circuit Breaker

```
❌ BAD PATTERN
┌─────────────────────────────────────────┐
│         Retry Logic (Outer)             │
│  ┌───────────────────────────────────┐  │
│  │   Circuit Breaker (Inner)         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Problems**:
- Retries triggered even when circuit is open
- Each retry attempt counts as separate request to circuit
- Can trigger circuit to open prematurely
- Wastes resources retrying when service is known to be down

### Implementation with axios-retry

```javascript
const CircuitBreaker = require('opossum');
const axios = require('axios');
const axiosRetry = require('axios-retry');

// Step 1: Create axios instance with retry configuration
const axiosInstance = axios.create({
  timeout: 8000
});

// Step 2: Configure axios-retry (INNER LAYER)
axiosRetry(axiosInstance, {
  retries: 5,
  retryDelay: (retryCount) => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return Math.pow(2, retryCount - 1) * 1000;
  },
  retryCondition: (error) => {
    // Retry on network errors and 5xx server errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           (error.response?.status >= 500 && error.response?.status < 600);
  },
  shouldResetTimeout: true, // Reset timeout between retries
  onRetry: (retryCount, error, requestConfig) => {
    console.log(`Retry attempt ${retryCount} for ${requestConfig.url}`);
  }
});

// Step 3: Wrap axios request in circuit breaker (OUTER LAYER)
async function makeApiRequest(endpoint, options) {
  const response = await axiosInstance.request({
    url: endpoint,
    ...options
  });
  return response.data;
}

const breaker = new CircuitBreaker(makeApiRequest, {
  timeout: 90000, // Must accommodate all retry attempts
  // Calculation: 8s (axios timeout) + 1+2+4+8+16 (31s backoff) + overhead = ~50s
  // Use 90s to be safe

  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
  name: 'api-with-retries',

  // Don't count client errors (4xx) as failures
  errorFilter: (err) => {
    return err.response?.status >= 400 && err.response?.status < 500;
  }
});

// Usage
breaker.fire('https://api.example.com/data', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' }
})
.then(data => console.log('Success after retries:', data))
.catch(err => {
  // This error has already been retried 5 times
  // AND the circuit breaker has determined the service is unhealthy
  console.error('Final failure:', err.message);
});
```

### Custom Retry Logic (Without axios-retry)

```javascript
const CircuitBreaker = require('opossum');
const axios = require('axios');

// Inner retry function
async function makeRequestWithRetries(url, options) {
  const maxRetries = 5;
  const backoffDelays = [1000, 2000, 4000, 8000, 16000]; // ms

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.request({
        url,
        ...options,
        timeout: 8000
      });
      return response.data; // Success - return immediately

    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryable =
        error.code === 'ECONNABORTED' ||
        error.code === 'ENOTFOUND' ||
        (error.response?.status >= 500 && error.response?.status < 600);

      if (isLastAttempt || !isRetryable) {
        throw error; // Final failure or non-retryable error
      }

      // Wait before retry
      const delay = backoffDelays[attempt];
      console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Wrap in circuit breaker
const breaker = new CircuitBreaker(makeRequestWithRetries, {
  timeout: 90000, // Accommodate all retry attempts
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
  name: 'custom-retry-circuit'
});
```

### Timeout Calculation Formula

When circuit breaker wraps retry logic:

```
Circuit Timeout = (Request Timeout × Max Retries) + Total Backoff Time + Overhead

Example:
Request Timeout: 8s
Max Retries: 5
Backoff: 1s + 2s + 4s + 8s + 16s = 31s
Overhead: ~10s (network, processing)

Circuit Timeout = (8s × 5) + 31s + 10s = 81s
Recommended: 90s (round up for safety)
```

### Key Takeaways

1. **Circuit Breaker ALWAYS wraps Retry Logic**
2. **Circuit timeout must accommodate all retry attempts**
3. **Circuit sees aggregate result of all retries**
4. **Prevents retry storms when service is down**
5. **Retry handles transient failures, circuit handles systemic failures**

---

## Production Configuration Values

### Configuration by API Service Type

#### HubSpot API Configuration
```javascript
// HubSpot has rate limits: 100 requests per 10 seconds (OAuth)
// Typical response time: 200-500ms
// SLA: 99.9% uptime

const hubspotConfig = {
  timeout: 10000,                  // 10s (HubSpot max response ~5s)
  errorThresholdPercentage: 50,    // Open at 50% error rate
  resetTimeout: 30000,             // 30s recovery window
  volumeThreshold: 10,             // Need 10 requests before opening
  rollingCountTimeout: 20000,      // 20s rolling window
  rollingCountBuckets: 10,         // 2s per bucket
  capacity: 50,                    // Max 50 concurrent requests
  name: 'hubspot-circuit',
  allowWarmUp: true,               // Allow warmup on cold start

  errorFilter: (err) => {
    // Don't count rate limits or client errors as circuit failures
    const status = err.response?.status;
    return status === 429 || (status >= 400 && status < 500);
  }
};
```

#### Lemlist API Configuration
```javascript
// Lemlist is email automation - higher tolerance for slower responses
// Typical response time: 500ms-2s
// Less critical path, can tolerate higher latency

const lemlistConfig = {
  timeout: 15000,                  // 15s (generous for email operations)
  errorThresholdPercentage: 60,    // More tolerant (60% threshold)
  resetTimeout: 45000,             // 45s recovery (less critical)
  volumeThreshold: 5,              // Lower traffic volume expected
  rollingCountTimeout: 30000,      // 30s rolling window
  rollingCountBuckets: 10,         // 3s per bucket
  capacity: 20,                    // Lower concurrent limit
  name: 'lemlist-circuit',
  allowWarmUp: true,

  errorFilter: (err) => {
    const status = err.response?.status;
    return status >= 400 && status < 500; // Ignore client errors
  }
};
```

#### Explorium API Configuration
```javascript
// Explorium is data enrichment - can be slow for complex queries
// Typical response time: 2-10s
// Heavy computation, variable latency

const exploriumConfig = {
  timeout: 30000,                  // 30s (data enrichment is slow)
  errorThresholdPercentage: 40,    // More sensitive (40% threshold)
  resetTimeout: 60000,             // 60s recovery (longer for heavy ops)
  volumeThreshold: 3,              // Lower volume threshold
  rollingCountTimeout: 60000,      // 60s rolling window (longer observation)
  rollingCountBuckets: 12,         // 5s per bucket
  capacity: 10,                    // Lower concurrent (resource intensive)
  name: 'explorium-circuit',
  allowWarmUp: true,
  cache: true,                     // Enable caching for enrichment results
  cacheTTL: 3600000,              // 1 hour cache TTL

  errorFilter: (err) => {
    const status = err.response?.status;
    return status >= 400 && status < 500;
  }
};
```

### General Configuration Guidelines

#### By Environment

**Development**
```javascript
const devConfig = {
  timeout: 5000,
  errorThresholdPercentage: 75,    // More lenient
  resetTimeout: 10000,             // Faster recovery for iteration
  volumeThreshold: 2,
  enabled: true                    // Keep enabled for testing
};
```

**Staging**
```javascript
const stagingConfig = {
  timeout: 10000,
  errorThresholdPercentage: 60,
  resetTimeout: 20000,
  volumeThreshold: 5,
  enabled: true
};
```

**Production**
```javascript
const productionConfig = {
  timeout: 15000,
  errorThresholdPercentage: 50,    // Production-grade threshold
  resetTimeout: 30000,
  volumeThreshold: 10,             // Higher volume before opening
  enabled: true,
  allowWarmUp: true
};
```

#### By Service Criticality

**Critical Path Services** (blocking user operations)
```javascript
const criticalConfig = {
  timeout: 5000,                   // Fast timeout
  errorThresholdPercentage: 40,    // Sensitive threshold
  resetTimeout: 20000,             // Quick recovery attempts
  volumeThreshold: 15,             // Need strong signal
  fallback: () => cachedResponse   // Must have fallback
};
```

**Non-Critical Services** (background jobs, analytics)
```javascript
const nonCriticalConfig = {
  timeout: 30000,                  // Generous timeout
  errorThresholdPercentage: 70,    // Tolerant threshold
  resetTimeout: 60000,             // Longer recovery window
  volumeThreshold: 5,
  fallback: () => null             // Can return null
};
```

### Configuration Tuning Methodology

1. **Baseline Measurement** (Week 1)
   ```javascript
   // Start with conservative values
   {
     timeout: 10000,
     errorThresholdPercentage: 75,  // Very tolerant
     resetTimeout: 60000,            // Long recovery
     volumeThreshold: 20             // High volume requirement
   }
   ```

2. **Monitor and Analyze**
   - Track P50, P95, P99 latencies
   - Measure error rates during normal operation
   - Identify false positive circuit openings

3. **Iterative Tuning** (Weeks 2-4)
   ```javascript
   // Gradually tighten thresholds based on actual behavior
   {
     timeout: 8000,                 // Reduce based on P99 latency
     errorThresholdPercentage: 50,  // Lower based on normal error rate
     resetTimeout: 30000,            // Shorten based on recovery patterns
     volumeThreshold: 10             // Adjust based on traffic
   }
   ```

4. **Production Optimization** (Ongoing)
   - A/B test different configurations
   - Adjust per service based on actual SLAs
   - Seasonal adjustments (holiday traffic spikes)

---

## Centralized Circuit Breaker Factory

### Factory Pattern Implementation

```javascript
// circuitBreakerFactory.js
const CircuitBreaker = require('opossum');
const EventEmitter = require('events');

class CircuitBreakerFactory {
  constructor() {
    this.breakers = new Map();
    this.sharedBucketController = new EventEmitter();
    this.defaultOptions = this.getDefaultOptions();
  }

  getDefaultOptions() {
    return {
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      volumeThreshold: 5,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      capacity: Number.MAX_SAFE_INTEGER,
      enabled: true,
      allowWarmUp: true,
      rollingPercentilesEnabled: true,
      enableSnapshots: true,
      rotateBucketController: this.sharedBucketController
    };
  }

  /**
   * Create or retrieve a circuit breaker instance
   * @param {string} name - Unique identifier for the circuit
   * @param {Function} action - Async function to wrap
   * @param {Object} options - Custom circuit breaker options
   * @returns {CircuitBreaker}
   */
  create(name, action, options = {}) {
    // Return existing breaker if already created
    if (this.breakers.has(name)) {
      console.log(`Reusing existing circuit breaker: ${name}`);
      return this.breakers.get(name);
    }

    // Merge options with defaults
    const breakerOptions = {
      ...this.defaultOptions,
      ...options,
      name
    };

    // Create new circuit breaker
    const breaker = new CircuitBreaker(action, breakerOptions);

    // Attach standard event listeners
    this.attachEventListeners(breaker, name);

    // Store in registry
    this.breakers.set(name, breaker);

    console.log(`Created new circuit breaker: ${name}`);
    return breaker;
  }

  /**
   * Create a circuit breaker with pre-configured settings for specific service
   */
  createForService(service, action, customOptions = {}) {
    const serviceConfigs = {
      hubspot: {
        timeout: 10000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        volumeThreshold: 10,
        rollingCountTimeout: 20000,
        errorFilter: (err) => {
          const status = err.response?.status;
          return status === 429 || (status >= 400 && status < 500);
        }
      },
      lemlist: {
        timeout: 15000,
        errorThresholdPercentage: 60,
        resetTimeout: 45000,
        volumeThreshold: 5,
        rollingCountTimeout: 30000,
        errorFilter: (err) => {
          const status = err.response?.status;
          return status >= 400 && status < 500;
        }
      },
      explorium: {
        timeout: 30000,
        errorThresholdPercentage: 40,
        resetTimeout: 60000,
        volumeThreshold: 3,
        rollingCountTimeout: 60000,
        cache: true,
        cacheTTL: 3600000,
        errorFilter: (err) => {
          const status = err.response?.status;
          return status >= 400 && status < 500;
        }
      }
    };

    const serviceConfig = serviceConfigs[service.toLowerCase()];
    if (!serviceConfig) {
      throw new Error(`Unknown service: ${service}`);
    }

    const options = { ...serviceConfig, ...customOptions };
    return this.create(`${service}-circuit`, action, options);
  }

  /**
   * Attach standard event listeners for logging and monitoring
   */
  attachEventListeners(breaker, name) {
    breaker.on('open', () => {
      console.error(`[${name}] Circuit OPENED - failing fast`);
      // Emit metrics, send alerts, etc.
    });

    breaker.on('halfOpen', () => {
      console.warn(`[${name}] Circuit HALF_OPEN - testing recovery`);
    });

    breaker.on('close', () => {
      console.info(`[${name}] Circuit CLOSED - normal operation resumed`);
    });

    breaker.on('success', (result, latency) => {
      console.debug(`[${name}] Success (${latency}ms)`);
    });

    breaker.on('failure', (error) => {
      console.warn(`[${name}] Failure: ${error.message}`);
    });

    breaker.on('timeout', () => {
      console.warn(`[${name}] Request timeout exceeded`);
    });

    breaker.on('reject', () => {
      console.warn(`[${name}] Request rejected (circuit open)`);
    });

    breaker.on('fallback', (result) => {
      console.info(`[${name}] Fallback executed`);
    });

    breaker.on('semaphoreLocked', () => {
      console.error(`[${name}] Semaphore locked - at capacity`);
    });

    breaker.on('healthCheckFailed', (error) => {
      console.error(`[${name}] Health check failed: ${error.message}`);
    });
  }

  /**
   * Get all circuit breakers
   */
  getAll() {
    return Array.from(this.breakers.values());
  }

  /**
   * Get circuit breaker by name
   */
  get(name) {
    return this.breakers.get(name);
  }

  /**
   * Get all circuit states for health checks
   */
  getStates() {
    const states = {};
    for (const [name, breaker] of this.breakers) {
      states[name] = {
        state: breaker.opened ? 'OPEN' : (breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED'),
        stats: breaker.stats,
        enabled: breaker.enabled
      };
    }
    return states;
  }

  /**
   * Shutdown all circuit breakers
   */
  shutdown() {
    for (const breaker of this.breakers.values()) {
      breaker.shutdown();
    }
    this.breakers.clear();
  }
}

// Export singleton instance
module.exports = new CircuitBreakerFactory();
```

### Usage Examples

```javascript
// hubspotClient.js
const circuitBreakerFactory = require('./circuitBreakerFactory');
const axios = require('axios');
const axiosRetry = require('axios-retry');

// Create axios instance with retry
const axiosInstance = axios.create({ timeout: 8000 });
axiosRetry(axiosInstance, {
  retries: 5,
  retryDelay: (retryCount) => Math.pow(2, retryCount - 1) * 1000,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           (error.response?.status >= 500 && error.response?.status < 600);
  }
});

// Create circuit breaker for HubSpot
async function makeHubSpotRequest(endpoint, options) {
  const response = await axiosInstance.request({
    url: `https://api.hubspot.com/crm/v3/${endpoint}`,
    headers: {
      'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
      ...options?.headers
    },
    ...options
  });
  return response.data;
}

const hubspotBreaker = circuitBreakerFactory.createForService(
  'hubspot',
  makeHubSpotRequest
);

// Add fallback
hubspotBreaker.fallback((endpoint, options) => {
  console.log('HubSpot unavailable, returning cached data');
  return getCachedHubSpotData(endpoint);
});

// Export wrapper function
async function callHubSpot(endpoint, options) {
  return hubspotBreaker.fire(endpoint, options);
}

module.exports = { callHubSpot };
```

```javascript
// lemlistClient.js
const circuitBreakerFactory = require('./circuitBreakerFactory');
const axios = require('axios');

async function makeLemlistRequest(endpoint, options) {
  // ... similar axios setup
}

const lemlistBreaker = circuitBreakerFactory.createForService(
  'lemlist',
  makeLemlistRequest,
  {
    // Override specific options if needed
    timeout: 20000 // Custom timeout for this instance
  }
);

module.exports = { callLemlist: (endpoint, opts) => lemlistBreaker.fire(endpoint, opts) };
```

```javascript
// exploriumClient.js
const circuitBreakerFactory = require('./circuitBreakerFactory');

async function makeExploriumRequest(endpoint, options, signal) {
  const response = await fetch(
    `https://api.explorium.ai/v1/${endpoint}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.EXPLORIUM_API_KEY}`,
        ...options?.headers
      },
      signal,
      ...options
    }
  );

  if (!response.ok) {
    throw new Error(`Explorium error: ${response.status}`);
  }

  return response.json();
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

module.exports = {
  callExplorium: (endpoint, opts) =>
    exploriumBreaker.fire(endpoint, opts, exploriumBreaker.getSignal())
};
```

---

## Fallback Strategies

### Types of Fallback Strategies

#### 1. Cache-Based Fallback

```javascript
const CircuitBreaker = require('opossum');
const Redis = require('ioredis');
const redis = new Redis();

async function fetchUserData(userId) {
  const response = await axios.get(`/api/users/${userId}`);

  // Cache successful responses
  await redis.setex(
    `user:${userId}`,
    3600, // 1 hour TTL
    JSON.stringify(response.data)
  );

  return response.data;
}

const breaker = new CircuitBreaker(fetchUserData, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

// Cache fallback
breaker.fallback(async (userId) => {
  console.log(`Fetching cached data for user ${userId}`);
  const cached = await redis.get(`user:${userId}`);

  if (cached) {
    const data = JSON.parse(cached);
    return {
      ...data,
      _cached: true,
      _timestamp: Date.now()
    };
  }

  throw new Error('No cached data available');
});

// Usage
breaker.on('fallback', (result, latency) => {
  console.log('Using cached data from fallback');
});
```

#### 2. Default Value Fallback

```javascript
async function fetchRecommendations(userId) {
  const response = await axios.get(`/api/recommendations/${userId}`);
  return response.data;
}

const breaker = new CircuitBreaker(fetchRecommendations, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

// Return default recommendations
breaker.fallback((userId) => {
  console.log('Using default recommendations');
  return {
    recommendations: [
      { id: 1, title: 'Popular Item 1', score: 0.9 },
      { id: 2, title: 'Popular Item 2', score: 0.85 },
      { id: 3, title: 'Popular Item 3', score: 0.8 }
    ],
    _fallback: true
  };
});
```

#### 3. Alternative Service Fallback

```javascript
async function primarySearch(query) {
  const response = await axios.get(`https://primary-search.com/api/search`, {
    params: { q: query }
  });
  return response.data;
}

async function backupSearch(query) {
  const response = await axios.get(`https://backup-search.com/api/search`, {
    params: { q: query }
  });
  return response.data;
}

const breaker = new CircuitBreaker(primarySearch, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

// Fallback to alternative search service
breaker.fallback(async (query) => {
  console.log('Primary search unavailable, using backup service');
  try {
    const results = await backupSearch(query);
    return {
      ...results,
      _source: 'backup'
    };
  } catch (error) {
    console.error('Backup search also failed');
    return { results: [], _error: true };
  }
});
```

#### 4. Graceful Degradation Fallback

```javascript
async function enrichContactData(contact) {
  // Expensive enrichment with external APIs
  const [socialData, companyData, jobData] = await Promise.all([
    fetchSocialProfile(contact.email),
    fetchCompanyInfo(contact.domain),
    fetchJobHistory(contact.linkedin)
  ]);

  return {
    ...contact,
    social: socialData,
    company: companyData,
    jobHistory: jobData,
    _enriched: true
  };
}

const breaker = new CircuitBreaker(enrichContactData, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

// Return partial data without enrichment
breaker.fallback((contact) => {
  console.log('Enrichment unavailable, returning basic contact data');
  return {
    ...contact,
    _enriched: false,
    _partial: true
  };
});
```

#### 5. Async Queue Fallback (Background Processing)

```javascript
const Bull = require('bull');
const emailQueue = new Bull('email-queue');

async function sendEmailImmediate(emailData) {
  const response = await axios.post('https://email-api.com/send', emailData);
  return response.data;
}

const breaker = new CircuitBreaker(sendEmailImmediate, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

// Queue for background processing
breaker.fallback(async (emailData) => {
  console.log('Email service unavailable, queueing for later');

  // Add to background job queue
  const job = await emailQueue.add('send-email', emailData, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000 // 1 minute
    }
  });

  return {
    queued: true,
    jobId: job.id,
    message: 'Email queued for delivery'
  };
});
```

#### 6. Error Response Fallback

```javascript
async function chargeCreditCard(paymentData) {
  const response = await axios.post('https://payment-api.com/charge', paymentData);
  return response.data;
}

const breaker = new CircuitBreaker(chargeCreditCard, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

// Return structured error for critical operations
breaker.fallback((paymentData) => {
  console.error('Payment service unavailable - cannot process payment');

  // For critical operations, throw error instead of silent failure
  const error = new Error('Payment service temporarily unavailable');
  error.code = 'SERVICE_UNAVAILABLE';
  error.statusCode = 503;
  error.retryAfter = 30; // seconds

  throw error;
});
```

### Fallback Best Practices

1. **Always Provide Fallbacks for Non-Critical Operations**
   - Recommendations, analytics, enrichment
   - Return degraded but functional response

2. **Throw Errors for Critical Operations**
   - Payments, authentication, data writes
   - Better to fail explicitly than silently

3. **Indicate Fallback in Response**
   ```javascript
   return {
     ...data,
     _fallback: true,
     _source: 'cache',
     _timestamp: Date.now()
   };
   ```

4. **Log Fallback Usage**
   ```javascript
   breaker.on('fallback', (result, latency) => {
     metrics.increment('circuit_breaker.fallback', {
       circuit: breaker.name
     });
   });
   ```

5. **Test Fallback Functions**
   - Ensure fallbacks actually work
   - Verify fallback data quality
   - Measure fallback performance

---

## Health Check Integration

### Express Health Check Endpoint

```javascript
// healthCheck.js
const express = require('express');
const circuitBreakerFactory = require('./circuitBreakerFactory');

const router = express.Router();

/**
 * Basic health check endpoint
 * GET /health
 */
router.get('/health', (req, res) => {
  const states = circuitBreakerFactory.getStates();

  // Check if any critical circuits are open
  const criticalCircuits = ['hubspot-circuit', 'explorium-circuit'];
  const hasCriticalFailure = criticalCircuits.some(name =>
    states[name]?.state === 'OPEN'
  );

  const status = hasCriticalFailure ? 'degraded' : 'healthy';
  const statusCode = hasCriticalFailure ? 503 : 200;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    circuits: states
  });
});

/**
 * Detailed health check with circuit statistics
 * GET /health/detailed
 */
router.get('/health/detailed', (req, res) => {
  const breakers = circuitBreakerFactory.getAll();

  const circuitDetails = breakers.map(breaker => {
    const stats = breaker.stats;

    return {
      name: breaker.name,
      state: breaker.opened ? 'OPEN' : (breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED'),
      enabled: breaker.enabled,
      stats: {
        fires: stats.fires,
        successes: stats.successes,
        failures: stats.failures,
        timeouts: stats.timeouts,
        rejects: stats.rejects,
        fallbacks: stats.fallbacks,
        semaphoreRejections: stats.semaphoreRejections,
        cacheHits: stats.cacheHits || 0,
        cacheMisses: stats.cacheMisses || 0
      },
      metrics: {
        errorRate: stats.fires > 0
          ? ((stats.failures + stats.timeouts) / stats.fires * 100).toFixed(2) + '%'
          : '0%',
        successRate: stats.fires > 0
          ? (stats.successes / stats.fires * 100).toFixed(2) + '%'
          : '0%',
        cacheHitRate: (stats.cacheHits + stats.cacheMisses) > 0
          ? (stats.cacheHits / (stats.cacheHits + stats.cacheMisses) * 100).toFixed(2) + '%'
          : 'N/A'
      },
      latency: {
        mean: stats.latencyMean?.toFixed(2) + 'ms' || 'N/A',
        percentiles: breaker.options.rollingPercentilesEnabled ? {
          p50: breaker.stats.percentiles?.['0.5']?.toFixed(2) + 'ms' || 'N/A',
          p95: breaker.stats.percentiles?.['0.95']?.toFixed(2) + 'ms' || 'N/A',
          p99: breaker.stats.percentiles?.['0.99']?.toFixed(2) + 'ms' || 'N/A'
        } : null
      }
    };
  });

  // Overall system health
  const totalFires = circuitDetails.reduce((sum, c) => sum + c.stats.fires, 0);
  const totalFailures = circuitDetails.reduce((sum, c) => sum + c.stats.failures + c.stats.timeouts, 0);
  const overallErrorRate = totalFires > 0 ? (totalFailures / totalFires * 100).toFixed(2) : 0;

  const anyCircuitOpen = circuitDetails.some(c => c.state === 'OPEN');
  const status = anyCircuitOpen ? 'degraded' : 'healthy';

  res.status(anyCircuitOpen ? 503 : 200).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    overall: {
      totalRequests: totalFires,
      totalFailures,
      errorRate: overallErrorRate + '%'
    },
    circuits: circuitDetails
  });
});

/**
 * Readiness probe (for Kubernetes)
 * GET /health/ready
 */
router.get('/health/ready', (req, res) => {
  const states = circuitBreakerFactory.getStates();

  // Service is ready if no circuits are in OPEN state
  const allCircuitsClosed = Object.values(states).every(
    circuit => circuit.state !== 'OPEN'
  );

  if (allCircuitsClosed) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({
      ready: false,
      reason: 'One or more circuit breakers are open'
    });
  }
});

/**
 * Liveness probe (for Kubernetes)
 * GET /health/live
 */
router.get('/health/live', (req, res) => {
  // Service is alive if process is running
  res.status(200).json({
    alive: true,
    uptime: process.uptime()
  });
});

/**
 * Reset circuit breaker (admin endpoint, should be protected)
 * POST /health/circuits/:name/reset
 */
router.post('/health/circuits/:name/reset', (req, res) => {
  const { name } = req.params;
  const breaker = circuitBreakerFactory.get(name);

  if (!breaker) {
    return res.status(404).json({ error: `Circuit breaker '${name}' not found` });
  }

  // Close the circuit manually
  if (breaker.opened) {
    breaker.close();
    res.json({
      message: `Circuit breaker '${name}' has been closed`,
      state: 'CLOSED'
    });
  } else {
    res.json({
      message: `Circuit breaker '${name}' was already closed`,
      state: breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED'
    });
  }
});

module.exports = router;
```

### Integration in Express App

```javascript
// app.js
const express = require('express');
const healthCheckRouter = require('./healthCheck');
const circuitBreakerFactory = require('./circuitBreakerFactory');

const app = express();

// Health check endpoints
app.use(healthCheckRouter);

// Your API routes
app.use('/api', require('./routes'));

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');

  // Shutdown all circuit breakers
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

### Kubernetes Health Check Configuration

```yaml
# deployment.yaml
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

        # Liveness probe - restart if unhealthy
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        # Readiness probe - remove from load balancer if not ready
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
```

---

## Monitoring with Prometheus

### Prometheus Integration Setup

```javascript
// prometheusMetrics.js
const CircuitBreaker = require('opossum');
const PrometheusMetrics = require('opossum-prometheus');
const client = require('prom-client');
const circuitBreakerFactory = require('./circuitBreakerFactory');

// Create Prometheus registry
const register = new client.Registry();

// Add default system metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Create opossum-prometheus instance
const prometheusMetrics = new PrometheusMetrics({
  circuits: circuitBreakerFactory.getAll(),
  registry: register,
  exposePerformanceMetrics: true
});

// Custom metrics
const circuitStateGauge = new client.Gauge({
  name: 'circuit_breaker_state',
  help: 'Current state of circuit breakers (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
  labelNames: ['circuit_name'],
  registers: [register]
});

const circuitResetCounter = new client.Counter({
  name: 'circuit_breaker_resets_total',
  help: 'Total number of circuit breaker resets',
  labelNames: ['circuit_name'],
  registers: [register]
});

// Update state gauge on circuit events
function attachPrometheusListeners(breaker) {
  breaker.on('open', () => {
    circuitStateGauge.set({ circuit_name: breaker.name }, 2);
  });

  breaker.on('halfOpen', () => {
    circuitStateGauge.set({ circuit_name: breaker.name }, 1);
  });

  breaker.on('close', () => {
    circuitStateGauge.set({ circuit_name: breaker.name }, 0);
    circuitResetCounter.inc({ circuit_name: breaker.name });
  });

  // Initialize state
  const state = breaker.opened ? 2 : (breaker.halfOpen ? 1 : 0);
  circuitStateGauge.set({ circuit_name: breaker.name }, state);
}

// Attach listeners to all existing breakers
circuitBreakerFactory.getAll().forEach(breaker => {
  attachPrometheusListeners(breaker);
});

module.exports = {
  register,
  prometheusMetrics,
  attachPrometheusListeners
};
```

### Metrics Endpoint

```javascript
// app.js
const express = require('express');
const { register } = require('./prometheusMetrics');

const app = express();

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error.message);
  }
});

// ... rest of app
```

### Prometheus Configuration

```yaml
# prometheus.yml
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

### Key Metrics Exposed

**Opossum Automatic Metrics** (via opossum-prometheus):
- `circuit_breaker_fire_total` - Total requests fired
- `circuit_breaker_success_total` - Total successful requests
- `circuit_breaker_failure_total` - Total failed requests
- `circuit_breaker_timeout_total` - Total timeouts
- `circuit_breaker_reject_total` - Total rejected requests (circuit open)
- `circuit_breaker_fallback_total` - Total fallback executions
- `circuit_breaker_semaphore_locked_total` - Total capacity rejections
- `circuit_breaker_success_duration_seconds` - Success latency histogram
- `circuit_breaker_failed_duration_seconds` - Failure latency histogram

**Custom Metrics**:
- `circuit_breaker_state` - Current state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
- `circuit_breaker_resets_total` - Total resets from OPEN to CLOSED

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Circuit Breaker Monitoring",
    "panels": [
      {
        "title": "Circuit Breaker States",
        "targets": [{
          "expr": "circuit_breaker_state",
          "legendFormat": "{{circuit_name}}"
        }],
        "type": "graph"
      },
      {
        "title": "Request Rate by Circuit",
        "targets": [{
          "expr": "rate(circuit_breaker_fire_total[5m])",
          "legendFormat": "{{circuit_name}}"
        }],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [{
          "expr": "rate(circuit_breaker_failure_total[5m]) / rate(circuit_breaker_fire_total[5m])",
          "legendFormat": "{{circuit_name}}"
        }],
        "type": "graph"
      },
      {
        "title": "Circuit Open Events",
        "targets": [{
          "expr": "changes(circuit_breaker_state{circuit_breaker_state=\"2\"}[1h])",
          "legendFormat": "{{circuit_name}}"
        }],
        "type": "stat"
      },
      {
        "title": "Fallback Execution Rate",
        "targets": [{
          "expr": "rate(circuit_breaker_fallback_total[5m])",
          "legendFormat": "{{circuit_name}}"
        }],
        "type": "graph"
      },
      {
        "title": "Request Latency P95",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(circuit_breaker_success_duration_seconds_bucket[5m]))",
          "legendFormat": "{{circuit_name}}"
        }],
        "type": "graph"
      }
    ]
  }
}
```

### Alerting Rules

```yaml
# alerting_rules.yml
groups:
  - name: circuit_breaker_alerts
    interval: 30s
    rules:
      # Alert when circuit opens
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state == 2
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Circuit breaker {{ $labels.circuit_name }} is OPEN"
          description: "Circuit {{ $labels.circuit_name }} has been open for more than 1 minute"

      # Alert on high error rate
      - alert: CircuitBreakerHighErrorRate
        expr: |
          (
            rate(circuit_breaker_failure_total[5m]) /
            rate(circuit_breaker_fire_total[5m])
          ) > 0.25
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate on circuit {{ $labels.circuit_name }}"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

      # Alert on frequent circuit opens
      - alert: CircuitBreakerFlapping
        expr: changes(circuit_breaker_state[15m]) > 4
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker {{ $labels.circuit_name }} is flapping"
          description: "Circuit has changed state {{ $value }} times in 15 minutes"

      # Alert on high fallback usage
      - alert: CircuitBreakerHighFallbackRate
        expr: |
          (
            rate(circuit_breaker_fallback_total[5m]) /
            rate(circuit_breaker_fire_total[5m])
          ) > 0.10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High fallback usage on circuit {{ $labels.circuit_name }}"
          description: "{{ $value | humanizePercentage }} of requests are using fallbacks"
```

---

## Testing Strategies

### Unit Testing Circuit Breakers

```javascript
// circuitBreaker.test.js
const CircuitBreaker = require('opossum');
const { expect } = require('chai');
const sinon = require('sinon');

describe('Circuit Breaker Tests', () => {

  describe('Circuit Opening', () => {
    it('should open circuit after error threshold is exceeded', async () => {
      let callCount = 0;

      // Function that always fails
      async function failingFunction() {
        callCount++;
        throw new Error('Service unavailable');
      }

      const breaker = new CircuitBreaker(failingFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        volumeThreshold: 5,
        rollingCountTimeout: 10000
      });

      // Make enough requests to exceed volume threshold
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          breaker.fire().catch(err => err)
        );
      }

      await Promise.all(promises);

      // Circuit should be open now
      expect(breaker.opened).to.be.true;
      expect(callCount).to.be.at.least(5); // Volume threshold met
    });

    it('should not open circuit below volume threshold', async () => {
      async function failingFunction() {
        throw new Error('Service unavailable');
      }

      const breaker = new CircuitBreaker(failingFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        volumeThreshold: 10 // High threshold
      });

      // Make fewer requests than volume threshold
      for (let i = 0; i < 5; i++) {
        await breaker.fire().catch(err => err);
      }

      // Circuit should still be closed
      expect(breaker.opened).to.be.false;
    });
  });

  describe('Half-Open State', () => {
    it('should transition to HALF_OPEN after reset timeout', async (done) => {
      let callCount = 0;

      async function intermittentFunction() {
        callCount++;
        // Fail initially, succeed after circuit opens
        if (callCount <= 10) {
          throw new Error('Temporary failure');
        }
        return 'Success';
      }

      const breaker = new CircuitBreaker(intermittentFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 2000, // Short reset for testing
        volumeThreshold: 5
      });

      // Trigger circuit opening
      for (let i = 0; i < 10; i++) {
        await breaker.fire().catch(err => err);
      }

      expect(breaker.opened).to.be.true;

      // Listen for halfOpen event
      breaker.once('halfOpen', () => {
        expect(breaker.halfOpen).to.be.true;
        done();
      });
    }).timeout(5000);

    it('should close circuit on successful HALF_OPEN request', async () => {
      let callCount = 0;

      async function recoveryFunction() {
        callCount++;
        // Fail first 10 times, then succeed
        if (callCount <= 10) {
          throw new Error('Failing');
        }
        return 'Success';
      }

      const breaker = new CircuitBreaker(recoveryFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 100, // Very short for testing
        volumeThreshold: 5
      });

      // Open circuit
      for (let i = 0; i < 10; i++) {
        await breaker.fire().catch(err => err);
      }

      expect(breaker.opened).to.be.true;

      // Wait for half-open and successful recovery
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = await breaker.fire();
      expect(result).to.equal('Success');
      expect(breaker.opened).to.be.false;
      expect(breaker.halfOpen).to.be.false;
    });

    it('should re-open circuit on failed HALF_OPEN request', async () => {
      let callCount = 0;

      async function stillFailingFunction() {
        callCount++;
        throw new Error('Still failing');
      }

      const breaker = new CircuitBreaker(stillFailingFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 100,
        volumeThreshold: 5
      });

      // Open circuit
      for (let i = 0; i < 10; i++) {
        await breaker.fire().catch(err => err);
      }

      expect(breaker.opened).to.be.true;

      // Wait for half-open
      await new Promise(resolve => setTimeout(resolve, 150));

      // This should fail and re-open circuit
      await breaker.fire().catch(err => err);

      expect(breaker.opened).to.be.true;
    });
  });

  describe('Timeout Behavior', () => {
    it('should timeout long-running requests', async () => {
      async function slowFunction() {
        // Simulate slow operation
        await new Promise(resolve => setTimeout(resolve, 5000));
        return 'Too slow';
      }

      const breaker = new CircuitBreaker(slowFunction, {
        timeout: 100 // Very short timeout
      });

      let timeoutOccurred = false;
      breaker.once('timeout', () => {
        timeoutOccurred = true;
      });

      try {
        await breaker.fire();
      } catch (error) {
        expect(timeoutOccurred).to.be.true;
        expect(error.message).to.include('timed out');
      }
    });
  });

  describe('Fallback Behavior', () => {
    it('should execute fallback when circuit opens', async () => {
      async function failingFunction() {
        throw new Error('Service down');
      }

      const breaker = new CircuitBreaker(failingFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        volumeThreshold: 5
      });

      // Set fallback
      breaker.fallback(() => 'Fallback response');

      // Open circuit
      for (let i = 0; i < 10; i++) {
        await breaker.fire();
      }

      // Next request should use fallback
      const result = await breaker.fire();
      expect(result).to.equal('Fallback response');
    });

    it('should pass arguments to fallback function', async () => {
      async function failingFunction(arg1, arg2) {
        throw new Error('Failed');
      }

      const breaker = new CircuitBreaker(failingFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        volumeThreshold: 5
      });

      breaker.fallback((arg1, arg2) => {
        return `Fallback: ${arg1} ${arg2}`;
      });

      // Open circuit
      for (let i = 0; i < 10; i++) {
        await breaker.fire('test', 'args');
      }

      const result = await breaker.fire('hello', 'world');
      expect(result).to.equal('Fallback: hello world');
    });
  });

  describe('Event Emissions', () => {
    it('should emit success event on successful request', async () => {
      async function successFunction() {
        return 'Success';
      }

      const breaker = new CircuitBreaker(successFunction, {
        timeout: 1000
      });

      let successEmitted = false;
      breaker.once('success', () => {
        successEmitted = true;
      });

      await breaker.fire();
      expect(successEmitted).to.be.true;
    });

    it('should emit open, halfOpen, and close events', async () => {
      const events = [];
      let callCount = 0;

      async function recoveryFunction() {
        callCount++;
        if (callCount <= 10) {
          throw new Error('Failing');
        }
        return 'Success';
      }

      const breaker = new CircuitBreaker(recoveryFunction, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 100,
        volumeThreshold: 5
      });

      breaker.on('open', () => events.push('open'));
      breaker.on('halfOpen', () => events.push('halfOpen'));
      breaker.on('close', () => events.push('close'));

      // Open circuit
      for (let i = 0; i < 10; i++) {
        await breaker.fire().catch(() => {});
      }

      // Wait for half-open and recovery
      await new Promise(resolve => setTimeout(resolve, 150));
      await breaker.fire();

      expect(events).to.include('open');
      expect(events).to.include('halfOpen');
      expect(events).to.include('close');
    });
  });

  describe('Error Filtering', () => {
    it('should exclude filtered errors from circuit statistics', async () => {
      let callCount = 0;

      async function functionWithClientErrors() {
        callCount++;
        const error = new Error('Client error');
        error.statusCode = 404;
        throw error;
      }

      const breaker = new CircuitBreaker(functionWithClientErrors, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        volumeThreshold: 5,
        errorFilter: (err) => {
          // Exclude 4xx errors
          return err.statusCode >= 400 && err.statusCode < 500;
        }
      });

      // Make many requests with 404 errors
      for (let i = 0; i < 20; i++) {
        await breaker.fire().catch(() => {});
      }

      // Circuit should NOT be open (errors were filtered)
      expect(breaker.opened).to.be.false;
    });
  });
});
```

### Integration Testing

```javascript
// integration.test.js
const CircuitBreaker = require('opossum');
const axios = require('axios');
const nock = require('nock');
const { expect } = require('chai');

describe('Circuit Breaker Integration Tests', () => {

  afterEach(() => {
    nock.cleanAll();
  });

  it('should integrate with axios for API calls', async () => {
    // Mock API that fails 60% of the time
    let callCount = 0;
    nock('https://api.example.com')
      .get('/data')
      .times(20)
      .reply(() => {
        callCount++;
        if (callCount % 10 < 6) {
          return [500, { error: 'Server error' }];
        }
        return [200, { data: 'Success' }];
      });

    async function makeApiCall() {
      const response = await axios.get('https://api.example.com/data');
      return response.data;
    }

    const breaker = new CircuitBreaker(makeApiCall, {
      timeout: 2000,
      errorThresholdPercentage: 50,
      resetTimeout: 5000,
      volumeThreshold: 5
    });

    // Make requests until circuit opens
    let circuitOpened = false;
    breaker.once('open', () => {
      circuitOpened = true;
    });

    for (let i = 0; i < 20; i++) {
      await breaker.fire().catch(() => {});
      if (circuitOpened) break;
    }

    expect(circuitOpened).to.be.true;
  });

  it('should handle fetch API integration', async () => {
    // Mock with nock
    nock('https://api.example.com')
      .get('/users/123')
      .times(5)
      .reply(503, { error: 'Service unavailable' });

    async function fetchUser(userId) {
      const response = await fetch(`https://api.example.com/users/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    }

    const breaker = new CircuitBreaker(fetchUser, {
      timeout: 2000,
      errorThresholdPercentage: 50,
      volumeThreshold: 3
    });

    breaker.fallback((userId) => ({
      id: userId,
      name: 'Cached User',
      _cached: true
    }));

    // Make failing requests
    for (let i = 0; i < 5; i++) {
      await breaker.fire('123');
    }

    // Should be using fallback now
    const result = await breaker.fire('123');
    expect(result._cached).to.be.true;
  });
});
```

### Load Testing

```javascript
// loadTest.js
const CircuitBreaker = require('opossum');
const axios = require('axios');

async function loadTest() {
  console.log('Starting circuit breaker load test...');

  // Simulated API that becomes slow under load
  let requestCount = 0;
  async function simulateApiCall() {
    requestCount++;

    // Simulate degradation under load
    if (requestCount > 100) {
      await new Promise(resolve => setTimeout(resolve, 15000));
    } else {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 10% error rate
    if (Math.random() < 0.1) {
      throw new Error('Random error');
    }

    return { data: 'Success', requestNumber: requestCount };
  }

  const breaker = new CircuitBreaker(simulateApiCall, {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 10000,
    volumeThreshold: 20
  });

  // Track metrics
  const metrics = {
    total: 0,
    success: 0,
    failure: 0,
    timeout: 0,
    rejected: 0,
    circuitOpens: 0
  };

  breaker.on('success', () => metrics.success++);
  breaker.on('failure', () => metrics.failure++);
  breaker.on('timeout', () => metrics.timeout++);
  breaker.on('reject', () => metrics.rejected++);
  breaker.on('open', () => {
    metrics.circuitOpens++;
    console.log(`\n⚠️  Circuit opened at request ${requestCount}`);
  });
  breaker.on('close', () => {
    console.log(`\n✅ Circuit closed at request ${requestCount}`);
  });

  // Send 500 requests
  const startTime = Date.now();
  const promises = [];

  for (let i = 0; i < 500; i++) {
    metrics.total++;
    promises.push(
      breaker.fire().catch(() => {})
    );

    // Print progress every 50 requests
    if (i > 0 && i % 50 === 0) {
      console.log(`\nProgress: ${i}/500 requests`);
      console.log(`Circuit state: ${breaker.opened ? 'OPEN' : 'CLOSED'}`);
      console.log(`Success rate: ${(metrics.success / metrics.total * 100).toFixed(2)}%`);
    }
  }

  await Promise.all(promises);

  const duration = Date.now() - startTime;

  // Print final results
  console.log('\n\n=== LOAD TEST RESULTS ===');
  console.log(`Duration: ${duration}ms`);
  console.log(`Total requests: ${metrics.total}`);
  console.log(`Successful: ${metrics.success} (${(metrics.success/metrics.total*100).toFixed(2)}%)`);
  console.log(`Failed: ${metrics.failure} (${(metrics.failure/metrics.total*100).toFixed(2)}%)`);
  console.log(`Timeout: ${metrics.timeout} (${(metrics.timeout/metrics.total*100).toFixed(2)}%)`);
  console.log(`Rejected: ${metrics.rejected} (${(metrics.rejected/metrics.total*100).toFixed(2)}%)`);
  console.log(`Circuit opens: ${metrics.circuitOpens}`);
  console.log(`\nCircuit breaker prevented ${metrics.rejected} failing requests`);
  console.log(`Time saved: ~${(metrics.rejected * 5).toFixed(2)} seconds`);
}

loadTest().catch(console.error);
```

---

## Production Code Examples

### Complete HubSpot Integration

```javascript
// services/hubspot/hubspotClient.js
const axios = require('axios');
const axiosRetry = require('axios-retry');
const CircuitBreaker = require('opossum');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

// Create axios instance with retry
const axiosInstance = axios.create({
  baseURL: 'https://api.hubspot.com/crm/v3',
  timeout: 8000,
  headers: {
    'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Configure retries
axiosRetry(axiosInstance, {
  retries: 5,
  retryDelay: (retryCount) => Math.pow(2, retryCount - 1) * 1000,
  retryCondition: (error) => {
    // Retry on network errors and 5xx, but NOT on rate limits (429)
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status >= 500 && error.response?.status < 600)
    ) && error.response?.status !== 429;
  },
  shouldResetTimeout: true,
  onRetry: (retryCount, error, requestConfig) => {
    console.log(`[HubSpot] Retry ${retryCount} for ${requestConfig.url}`);
  }
});

// Core request function with caching
async function makeHubSpotRequest(method, endpoint, data = null) {
  const cacheKey = `hubspot:${method}:${endpoint}:${JSON.stringify(data)}`;

  // Try cache for GET requests
  if (method === 'GET') {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`[HubSpot] Cache hit for ${endpoint}`);
      return JSON.parse(cached);
    }
  }

  // Make request
  const response = await axiosInstance.request({
    method,
    url: endpoint,
    data
  });

  // Cache successful GET responses
  if (method === 'GET' && response.data) {
    await redis.setex(cacheKey, 300, JSON.stringify(response.data)); // 5 min cache
  }

  return response.data;
}

// Create circuit breaker
const hubspotBreaker = new CircuitBreaker(makeHubSpotRequest, {
  timeout: 90000, // Accommodate retries
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 10,
  rollingCountTimeout: 20000,
  rollingCountBuckets: 10,
  capacity: 50,
  name: 'hubspot-circuit',
  allowWarmUp: true,

  errorFilter: (err) => {
    // Exclude rate limits and client errors from circuit statistics
    const status = err.response?.status;
    return status === 429 || (status >= 400 && status < 500);
  }
});

// Fallback to cache
hubspotBreaker.fallback(async (method, endpoint, data) => {
  console.log(`[HubSpot] Circuit open, attempting cache fallback for ${endpoint}`);

  const cacheKey = `hubspot:${method}:${endpoint}:${JSON.stringify(data)}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    const result = JSON.parse(cached);
    return {
      ...result,
      _fallback: true,
      _cached: true,
      _timestamp: Date.now()
    };
  }

  throw new Error('HubSpot service unavailable and no cached data');
});

// Event listeners
hubspotBreaker.on('open', () => {
  console.error('[HubSpot] Circuit OPENED - HubSpot API is unhealthy');
  // Send alert to monitoring system
});

hubspotBreaker.on('halfOpen', () => {
  console.warn('[HubSpot] Circuit HALF_OPEN - testing HubSpot recovery');
});

hubspotBreaker.on('close', () => {
  console.info('[HubSpot] Circuit CLOSED - HubSpot API recovered');
});

// Public API
class HubSpotClient {
  async getContact(contactId) {
    return hubspotBreaker.fire('GET', `/objects/contacts/${contactId}`);
  }

  async searchContacts(query) {
    return hubspotBreaker.fire('POST', '/objects/contacts/search', query);
  }

  async createContact(contactData) {
    return hubspotBreaker.fire('POST', '/objects/contacts', contactData);
  }

  async updateContact(contactId, updates) {
    return hubspotBreaker.fire('PATCH', `/objects/contacts/${contactId}`, updates);
  }

  async deleteContact(contactId) {
    return hubspotBreaker.fire('DELETE', `/objects/contacts/${contactId}`);
  }

  getCircuitState() {
    return {
      name: 'hubspot',
      state: hubspotBreaker.opened ? 'OPEN' : (hubspotBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED'),
      stats: hubspotBreaker.stats,
      enabled: hubspotBreaker.enabled
    };
  }
}

module.exports = new HubSpotClient();
```

### Complete Explorium Integration (Fetch API)

```javascript
// services/explorium/exploriumClient.js
const CircuitBreaker = require('opossum');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour default

// AbortController for request cancellation
const abortController = new AbortController();

// Retry logic wrapper
async function fetchWithRetry(url, options, maxRetries = 5) {
  const backoffDelays = [1000, 2000, 4000, 8000, 16000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Check HTTP status
      if (!response.ok) {
        const error = new Error(`Explorium API error: ${response.status}`);
        error.statusCode = response.status;
        error.response = response;

        // Don't retry client errors
        if (response.status >= 400 && response.status < 500) {
          throw error;
        }

        // Retry server errors
        if (attempt < maxRetries) {
          const delay = backoffDelays[attempt];
          console.log(`[Explorium] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }

      return response.json();

    } catch (error) {
      if (attempt === maxRetries || error.name === 'AbortError') {
        throw error;
      }

      // Retry on network errors
      const delay = backoffDelays[attempt];
      console.log(`[Explorium] Network error, retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Core request function
async function makeExploriumRequest(endpoint, options, signal) {
  const url = `https://api.explorium.ai/v1/${endpoint}`;
  const cacheKey = `explorium:${endpoint}:${JSON.stringify(options)}`;

  // Check cache for enrichment results
  if (options.method === 'GET') {
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`[Explorium] Cache hit for ${endpoint}`);
      return cached;
    }
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.EXPLORIUM_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    signal,
    ...(options.body && { body: JSON.stringify(options.body) })
  };

  const result = await fetchWithRetry(url, fetchOptions);

  // Cache enrichment results
  if (options.method === 'GET' || endpoint.includes('enrichment')) {
    cache.set(cacheKey, result);
  }

  return result;
}

// Create circuit breaker
const exploriumBreaker = new CircuitBreaker(makeExploriumRequest, {
  timeout: 120000, // 2 minutes (enrichment can be slow)
  errorThresholdPercentage: 40,
  resetTimeout: 60000,
  volumeThreshold: 3,
  rollingCountTimeout: 60000,
  rollingCountBuckets: 12,
  capacity: 10,
  name: 'explorium-circuit',
  allowWarmUp: true,
  abortController,
  autoRenewAbortController: true,

  errorFilter: (err) => {
    // Exclude client errors
    return err.statusCode >= 400 && err.statusCode < 500;
  }
});

// Fallback
exploriumBreaker.fallback((endpoint, options) => {
  console.log(`[Explorium] Circuit open, checking cache for ${endpoint}`);

  const cacheKey = `explorium:${endpoint}:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return {
      ...cached,
      _fallback: true,
      _cached: true
    };
  }

  // Return partial data without enrichment
  return {
    enriched: false,
    error: 'Enrichment service temporarily unavailable',
    _fallback: true
  };
});

// Event listeners
exploriumBreaker.on('open', () => {
  console.error('[Explorium] Circuit OPENED - Explorium API unhealthy');
});

exploriumBreaker.on('close', () => {
  console.info('[Explorium] Circuit CLOSED - Explorium API recovered');
});

// Public API
class ExploriumClient {
  async enrichCompany(domain) {
    return exploriumBreaker.fire(
      'enrichment/company',
      {
        method: 'POST',
        body: { domain }
      },
      exploriumBreaker.getSignal()
    );
  }

  async enrichPerson(email, name) {
    return exploriumBreaker.fire(
      'enrichment/person',
      {
        method: 'POST',
        body: { email, name }
      },
      exploriumBreaker.getSignal()
    );
  }

  async batchEnrich(items) {
    return exploriumBreaker.fire(
      'enrichment/batch',
      {
        method: 'POST',
        body: { items }
      },
      exploriumBreaker.getSignal()
    );
  }

  getCircuitState() {
    return {
      name: 'explorium',
      state: exploriumBreaker.opened ? 'OPEN' : (exploriumBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED'),
      stats: exploriumBreaker.stats,
      enabled: exploriumBreaker.enabled
    };
  }
}

module.exports = new ExploriumClient();
```

---

## Common Pitfalls

### 1. Timeout Misconfiguration

**Problem**: Circuit breaker timeout < HTTP client timeout
```javascript
// ❌ BAD: Circuit timeout shorter than axios timeout
const breaker = new CircuitBreaker(apiCall, {
  timeout: 3000  // Circuit breaker times out first
});

axios.get(url, { timeout: 5000 }); // Axios never gets to timeout
```

**Solution**: Circuit breaker timeout should be LONGER than HTTP timeout
```javascript
// ✅ GOOD: Circuit timeout encompasses HTTP timeout
const breaker = new CircuitBreaker(apiCall, {
  timeout: 10000  // Circuit breaker is outer safety net
});

axios.get(url, { timeout: 8000 }); // Axios times out first
```

### 2. Fetch API Error Handling

**Problem**: Fetch doesn't throw on HTTP errors
```javascript
// ❌ BAD: Circuit won't detect 5xx errors
async function fetchData() {
  const response = await fetch(url);
  return response.json(); // Returns even on 500 errors!
}
```

**Solution**: Manually check response.ok
```javascript
// ✅ GOOD: Explicitly throw on HTTP errors
async function fetchData() {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}
```

### 3. Volume Threshold Too Low

**Problem**: Circuit opens on first failure during low traffic
```javascript
// ❌ BAD: Opens immediately on single failure
const breaker = new CircuitBreaker(apiCall, {
  errorThresholdPercentage: 50,
  volumeThreshold: 0  // No minimum volume!
});

// First request fails -> circuit opens immediately
```

**Solution**: Set appropriate volume threshold
```javascript
// ✅ GOOD: Need multiple requests before opening
const breaker = new CircuitBreaker(apiCall, {
  errorThresholdPercentage: 50,
  volumeThreshold: 10  // Need at least 10 requests
});
```

### 4. Not Filtering Expected Errors

**Problem**: 404s and validation errors trigger circuit opening
```javascript
// ❌ BAD: All errors count toward circuit opening
const breaker = new CircuitBreaker(apiCall, {
  errorThresholdPercentage: 50
  // No error filter!
});
```

**Solution**: Filter client errors (4xx)
```javascript
// ✅ GOOD: Only count actual service failures
const breaker = new CircuitBreaker(apiCall, {
  errorThresholdPercentage: 50,
  errorFilter: (err) => {
    // Exclude client errors from statistics
    return err.response?.status >= 400 && err.response?.status < 500;
  }
});
```

### 5. Retry Wrapping Circuit Breaker

**Problem**: Retry logic outside circuit breaker
```javascript
// ❌ BAD: Retry wraps circuit breaker
async function withRetry() {
  for (let i = 0; i < 5; i++) {
    try {
      return await breaker.fire(); // Retries even when circuit open!
    } catch (err) {
      if (i === 4) throw err;
    }
  }
}
```

**Solution**: Circuit breaker wraps retry logic
```javascript
// ✅ GOOD: Circuit breaker wraps retry
async function apiCallWithRetry() {
  // Retry logic INSIDE circuit breaker
  for (let i = 0; i < 5; i++) {
    try {
      return await axios.get(url);
    } catch (err) {
      if (i === 4) throw err;
    }
  }
}

const breaker = new CircuitBreaker(apiCallWithRetry, { ... });
```

### 6. Missing Fallback for Critical Operations

**Problem**: No fallback causes user-facing errors
```javascript
// ❌ BAD: No fallback, throws error to user
const breaker = new CircuitBreaker(fetchRecommendations, {
  errorThresholdPercentage: 50
});

// User sees error when circuit opens
```

**Solution**: Provide appropriate fallback
```javascript
// ✅ GOOD: Graceful degradation with fallback
const breaker = new CircuitBreaker(fetchRecommendations, {
  errorThresholdPercentage: 50
});

breaker.fallback(() => {
  // Return default recommendations
  return { recommendations: DEFAULT_ITEMS, _fallback: true };
});
```

### 7. Shared Circuit for Different Operations

**Problem**: Single circuit for all endpoints
```javascript
// ❌ BAD: One circuit for entire API
const apiBreaker = new CircuitBreaker(makeApiCall, { ... });

apiBreaker.fire('/fast-endpoint');
apiBreaker.fire('/slow-endpoint');
// Slow endpoint failures affect fast endpoint!
```

**Solution**: Separate circuits per service/endpoint
```javascript
// ✅ GOOD: Dedicated circuits
const fastBreaker = new CircuitBreaker(fastApiCall, { timeout: 5000 });
const slowBreaker = new CircuitBreaker(slowApiCall, { timeout: 30000 });

fastBreaker.fire('/fast-endpoint');
slowBreaker.fire('/slow-endpoint');
```

### 8. Not Monitoring Circuit State

**Problem**: Circuit opens silently in production
```javascript
// ❌ BAD: No monitoring or alerting
const breaker = new CircuitBreaker(apiCall, { ... });
// No event listeners!
```

**Solution**: Monitor all circuit events
```javascript
// ✅ GOOD: Comprehensive monitoring
const breaker = new CircuitBreaker(apiCall, { ... });

breaker.on('open', () => {
  logger.error('Circuit opened');
  metrics.increment('circuit.open');
  alerts.send('Circuit breaker opened');
});

breaker.on('halfOpen', () => logger.warn('Circuit testing recovery'));
breaker.on('close', () => logger.info('Circuit recovered'));
```

### 9. Memory Leaks from Event Listeners

**Problem**: Not cleaning up event listeners in tests
```javascript
// ❌ BAD: Event listeners accumulate
it('test circuit breaker', () => {
  const breaker = new CircuitBreaker(fn, { ... });
  breaker.on('open', handler);
  breaker.on('close', handler);
  // No cleanup! Warning: MaxListenersExceededWarning
});
```

**Solution**: Shutdown breakers after tests
```javascript
// ✅ GOOD: Clean up in afterEach
afterEach(() => {
  breaker.shutdown(); // Removes all listeners
});
```

### 10. Ignoring Rate Limits

**Problem**: Circuit opens on rate limits (429)
```javascript
// ❌ BAD: Treats rate limits as service failures
const breaker = new CircuitBreaker(apiCall, {
  errorThresholdPercentage: 50
  // 429 errors count toward opening!
});
```

**Solution**: Filter rate limit errors
```javascript
// ✅ GOOD: Exclude rate limits from circuit statistics
const breaker = new CircuitBreaker(apiCall, {
  errorThresholdPercentage: 50,
  errorFilter: (err) => {
    // Rate limits aren't service failures
    return err.response?.status === 429 ||
           (err.response?.status >= 400 && err.response?.status < 500);
  }
});
```

---

## Summary and Recommendations

### Quick Start Checklist

- [ ] Install opossum: `npm install opossum`
- [ ] Install opossum-prometheus: `npm install opossum-prometheus`
- [ ] Create centralized circuit breaker factory
- [ ] Wrap existing API clients (axios/fetch) with circuit breakers
- [ ] Configure retry logic INSIDE circuit breakers
- [ ] Set appropriate timeouts (circuit > HTTP client)
- [ ] Configure error filtering (exclude 4xx from statistics)
- [ ] Implement fallback strategies
- [ ] Add health check endpoints
- [ ] Setup Prometheus metrics
- [ ] Create Grafana dashboards
- [ ] Configure alerting rules
- [ ] Write unit and integration tests
- [ ] Load test with circuit breakers enabled

### Recommended Configuration by Service

**HubSpot**: Conservative (high volume, critical)
- Timeout: 10s
- Error threshold: 50%
- Volume threshold: 10
- Reset timeout: 30s

**Lemlist**: Tolerant (background operations)
- Timeout: 15s
- Error threshold: 60%
- Volume threshold: 5
- Reset timeout: 45s

**Explorium**: Patient (slow enrichment)
- Timeout: 30s
- Error threshold: 40%
- Volume threshold: 3
- Reset timeout: 60s

### Expected Impact on Resilience Score

Implementing circuit breakers correctly should contribute:
- **15-20 points**: Basic circuit breaker implementation
- **10-15 points**: Comprehensive fallback strategies
- **10-15 points**: Health checks and monitoring
- **10-15 points**: Testing and production validation
- **5-10 points**: Documentation and runbooks

**Total: 50-75 points** toward your 85-90/100 target resilience score.

Combined with existing retry logic (10-15 points), this provides a robust, production-ready resilience layer.

### Next Steps

1. Start with HubSpot integration (highest volume)
2. Add Explorium (most complex timeout requirements)
3. Complete Lemlist (simplest, low criticality)
4. Implement centralized factory and health checks
5. Add Prometheus monitoring
6. Load test and tune thresholds
7. Deploy to staging for validation
8. Gradual rollout to production

---

## Additional Resources

### Official Documentation
- Opossum GitHub: https://github.com/nodeshift/opossum
- Opossum Docs: https://nodeshift.dev/opossum/
- opossum-prometheus: https://github.com/nodeshift/opossum-prometheus

### Community Resources
- Circuit Breaker Pattern (Microsoft): https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker
- Building Resilient APIs: https://blog.logrocket.com/use-circuit-breaker-node-js/
- Production Examples: https://github.com/nodeshift-starters/opossum-examples

### Related Patterns
- Retry Pattern
- Timeout Pattern
- Bulkhead Pattern
- Rate Limiting
- Graceful Degradation
