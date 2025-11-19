/**
 * Circuit Breaker Factory
 * Centralized management of circuit breakers for all external API integrations
 *
 * Features:
 * - Singleton pattern for shared circuit breaker instances
 * - Pre-configured service templates (HubSpot, Lemlist, Explorium)
 * - Shared bucket rotation controller for optimized memory usage
 * - Standardized event logging and metrics
 * - Health check state aggregation
 */

const CircuitBreaker = require('opossum');
const EventEmitter = require('events');

class CircuitBreakerFactory {
  constructor() {
    this.breakers = new Map();
    this.sharedBucketController = new EventEmitter();
    this.defaultOptions = this.getDefaultOptions();
    this.metricsCollector = null; // For Prometheus integration
  }

  /**
   * Get default circuit breaker options
   * These are baseline values that can be overridden per service
   */
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
   *
   * @param {string} name - Unique identifier for the circuit
   * @param {Function} action - Async function to wrap (must be already bound if it uses 'this')
   * @param {Object} options - Custom circuit breaker options
   * @returns {CircuitBreaker} Circuit breaker instance
   */
  create(name, action, options = {}) {
    // Return existing breaker if already created
    if (this.breakers.has(name)) {
      console.log(`[CircuitBreakerFactory] Reusing existing circuit breaker: ${name}`);
      return this.breakers.get(name);
    }

    // Validate action is a function
    if (typeof action !== 'function') {
      throw new TypeError('action must be a function');
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

    console.log(`[CircuitBreakerFactory] Created circuit breaker: ${name}`);

    // Notify metrics collector if available
    if (this.metricsCollector) {
      this.metricsCollector.add([breaker]);
    }

    return breaker;
  }

  /**
   * Create a circuit breaker with pre-configured settings for specific services
   *
   * @param {string} service - Service name (hubspot, lemlist, explorium)
   * @param {Function} action - Async function to wrap
   * @param {Object} customOptions - Override default service config
   * @returns {CircuitBreaker} Circuit breaker instance
   */
  createForService(service, action, customOptions = {}) {
    const serviceConfigs = {
      hubspot: {
        timeout: 10000,                  // 10s for typical CRM operations
        errorThresholdPercentage: 50,    // Open at 50% error rate
        resetTimeout: 30000,             // 30s recovery window
        volumeThreshold: 10,             // Need 10 requests before opening
        rollingCountTimeout: 20000,      // 20s rolling window
        rollingCountBuckets: 10,         // 2s per bucket
        capacity: 50,                    // Max 50 concurrent requests
        allowWarmUp: true,

        errorFilter: (err) => {
          // Exclude rate limits (429) and client errors (4xx) from circuit statistics
          // These are expected errors that don't indicate service health issues
          const status = err.response?.status;
          return status === 429 || (status >= 400 && status < 500);
        }
      },

      lemlist: {
        timeout: 15000,                  // 15s for email operations
        errorThresholdPercentage: 60,    // More tolerant (non-critical path)
        resetTimeout: 45000,             // 45s recovery (less critical)
        volumeThreshold: 5,              // Lower traffic expected
        rollingCountTimeout: 30000,      // 30s rolling window
        rollingCountBuckets: 10,         // 3s per bucket
        capacity: 20,                    // Lower concurrent limit
        allowWarmUp: true,

        errorFilter: (err) => {
          const status = err.response?.status;
          return status >= 400 && status < 500;
        }
      },

      explorium: {
        timeout: 30000,                  // 30s for data enrichment (can be slow)
        errorThresholdPercentage: 40,    // More sensitive (expensive operations)
        resetTimeout: 60000,             // 60s recovery (longer for heavy ops)
        volumeThreshold: 3,              // Lower volume threshold
        rollingCountTimeout: 60000,      // 60s rolling window (longer observation)
        rollingCountBuckets: 12,         // 5s per bucket
        capacity: 10,                    // Lower concurrent (resource intensive)
        allowWarmUp: true,
        cache: true,                     // Enable caching for enrichment
        cacheTTL: 3600000,              // 1 hour cache TTL

        errorFilter: (err) => {
          const status = err.response?.status;
          return status >= 400 && status < 500;
        }
      }
    };

    const serviceConfig = serviceConfigs[service.toLowerCase()];
    if (!serviceConfig) {
      throw new Error(
        `Unknown service: ${service}. Available services: ${Object.keys(serviceConfigs).join(', ')}`
      );
    }

    // Merge service config with custom options
    const options = { ...serviceConfig, ...customOptions };

    return this.create(`${service}-circuit`, action, options);
  }

  /**
   * Attach standard event listeners for logging and monitoring
   *
   * @param {CircuitBreaker} breaker - Circuit breaker instance
   * @param {string} name - Circuit name
   */
  attachEventListeners(breaker, name) {
    // Critical state transitions
    breaker.on('open', () => {
      console.error(`[${name}] Circuit OPENED - service is unhealthy, failing fast`);
      this.emitMetric('circuit.open', { circuit: name });
    });

    breaker.on('halfOpen', () => {
      console.warn(`[${name}] Circuit HALF_OPEN - testing service recovery`);
      this.emitMetric('circuit.halfOpen', { circuit: name });
    });

    breaker.on('close', () => {
      console.info(`[${name}] Circuit CLOSED - service recovered, normal operation resumed`);
      this.emitMetric('circuit.close', { circuit: name });
    });

    // Request outcomes
    breaker.on('success', (result, latency) => {
      console.debug(`[${name}] Request succeeded (${latency}ms)`);
    });

    breaker.on('failure', (error) => {
      console.warn(`[${name}] Request failed: ${error.message}`);
    });

    breaker.on('timeout', () => {
      console.warn(`[${name}] Request timeout exceeded`);
      this.emitMetric('circuit.timeout', { circuit: name });
    });

    breaker.on('reject', () => {
      console.warn(`[${name}] Request rejected (circuit is open)`);
      this.emitMetric('circuit.reject', { circuit: name });
    });

    // Fallback and capacity events
    breaker.on('fallback', (result) => {
      console.info(`[${name}] Fallback executed`);
      this.emitMetric('circuit.fallback', { circuit: name });
    });

    breaker.on('semaphoreLocked', () => {
      console.error(`[${name}] Semaphore locked - at maximum capacity`);
      this.emitMetric('circuit.semaphoreLocked', { circuit: name });
    });

    // Health check events
    breaker.on('healthCheckFailed', (error) => {
      console.error(`[${name}] Health check failed: ${error.message}`);
      this.emitMetric('circuit.healthCheckFailed', { circuit: name });
    });

    // Cache events (if caching enabled)
    breaker.on('cacheHit', () => {
      console.debug(`[${name}] Cache hit`);
    });

    breaker.on('cacheMiss', () => {
      console.debug(`[${name}] Cache miss`);
    });
  }

  /**
   * Emit custom metrics (override this method for your metrics system)
   *
   * @param {string} metricName - Metric name
   * @param {Object} tags - Metric tags/labels
   */
  emitMetric(metricName, tags = {}) {
    // Default implementation - override with your metrics system
    // Examples: Prometheus, StatsD, DataDog, etc.
    console.debug(`[Metric] ${metricName}`, tags);
  }

  /**
   * Set metrics collector (e.g., Prometheus)
   *
   * @param {Object} collector - Metrics collector instance
   */
  setMetricsCollector(collector) {
    this.metricsCollector = collector;

    // Add all existing breakers to collector
    if (collector && collector.add) {
      collector.add(Array.from(this.breakers.values()));
    }
  }

  /**
   * Get all circuit breakers
   *
   * @returns {Array<CircuitBreaker>} Array of all circuit breakers
   */
  getAll() {
    return Array.from(this.breakers.values());
  }

  /**
   * Get circuit breaker by name
   *
   * @param {string} name - Circuit name
   * @returns {CircuitBreaker|undefined} Circuit breaker instance or undefined
   */
  get(name) {
    return this.breakers.get(name);
  }

  /**
   * Check if circuit breaker exists
   *
   * @param {string} name - Circuit name
   * @returns {boolean} True if exists
   */
  has(name) {
    return this.breakers.has(name);
  }

  /**
   * Get all circuit states for health checks
   *
   * @returns {Object} Map of circuit names to their states and statistics
   */
  getStates() {
    const states = {};

    for (const [name, breaker] of this.breakers) {
      const stats = breaker.stats;

      states[name] = {
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
            : '0%'
        }
      };
    }

    return states;
  }

  /**
   * Get summary statistics across all circuits
   *
   * @returns {Object} Aggregated statistics
   */
  getSummary() {
    const breakers = this.getAll();

    const summary = {
      totalCircuits: breakers.length,
      circuitsOpen: 0,
      circuitsHalfOpen: 0,
      circuitsClosed: 0,
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalTimeouts: 0,
      totalRejects: 0
    };

    breakers.forEach(breaker => {
      if (breaker.opened) summary.circuitsOpen++;
      else if (breaker.halfOpen) summary.circuitsHalfOpen++;
      else summary.circuitsClosed++;

      const stats = breaker.stats;
      summary.totalRequests += stats.fires;
      summary.totalSuccesses += stats.successes;
      summary.totalFailures += stats.failures;
      summary.totalTimeouts += stats.timeouts;
      summary.totalRejects += stats.rejects;
    });

    summary.overallSuccessRate = summary.totalRequests > 0
      ? (summary.totalSuccesses / summary.totalRequests * 100).toFixed(2) + '%'
      : '0%';

    return summary;
  }

  /**
   * Reset all circuit breakers to closed state
   * WARNING: Use only for testing or emergency recovery
   */
  resetAll() {
    console.warn('[CircuitBreakerFactory] Resetting all circuit breakers');

    for (const breaker of this.breakers.values()) {
      if (breaker.opened || breaker.halfOpen) {
        breaker.close();
      }
    }
  }

  /**
   * Shutdown all circuit breakers
   * Call this on application shutdown to clean up event listeners
   */
  shutdown() {
    console.log('[CircuitBreakerFactory] Shutting down all circuit breakers');

    for (const breaker of this.breakers.values()) {
      breaker.shutdown();
    }

    this.breakers.clear();
  }
}

// Export singleton instance
module.exports = new CircuitBreakerFactory();
