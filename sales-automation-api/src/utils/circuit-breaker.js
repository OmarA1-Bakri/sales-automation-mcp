/**
 * Circuit Breaker Factory
 * PHASE 3 FIX (P3.6): Centralized circuit breaker management using opossum
 *
 * Prevents cascading failures by automatically opening circuits to failing services.
 * Implements the Circuit Breaker pattern with:
 * - Automatic failure detection
 * - Half-open recovery testing
 * - Configurable thresholds and timeouts
 * - Event-driven monitoring
 *
 * Architecture: Circuit Breaker (Outer) → Retry Logic (Inner) → HTTP Request
 * This allows retries to exhaust before circuit opens, preventing premature opening.
 */

import CircuitBreaker from 'opossum';
import { createLogger } from './logger.js';

const logger = createLogger('CircuitBreaker');

/**
 * Circuit breaker registry
 * Stores all active circuit breakers by name
 */
const circuitBreakerRegistry = new Map();

/**
 * Default circuit breaker configuration
 * Conservative values suitable for most external APIs
 */
const DEFAULT_OPTIONS = {
  timeout: 10000,              // 10s - Request timeout
  errorThresholdPercentage: 50, // Open after 50% error rate
  resetTimeout: 30000,          // 30s - Time before attempting recovery
  rollingCountTimeout: 10000,   // 10s - Window for error rate calculation
  rollingCountBuckets: 10,      // 10 buckets for rolling window
  volumeThreshold: 5,           // Min 5 requests before opening circuit
  name: 'unknown-service'       // Service name for logging
};

/**
 * Service-specific configurations
 * Tuned based on each service's characteristics and SLA
 */
const SERVICE_CONFIGS = {
  hubspot: {
    timeout: 10000,              // HubSpot API is typically fast
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 10,         // Higher volume for busy service
    name: 'HubSpot API'
  },

  lemlist: {
    timeout: 15000,              // Lemlist can be slower for email operations
    errorThresholdPercentage: 60, // More tolerant of transient errors
    resetTimeout: 45000,
    volumeThreshold: 5,
    name: 'Lemlist API'
  },

  explorium: {
    timeout: 30000,              // Enrichment operations can take longer
    errorThresholdPercentage: 40, // Less tolerant due to data criticality
    resetTimeout: 60000,          // Longer reset for heavy operations
    volumeThreshold: 3,           // Lower volume threshold
    name: 'Explorium API'
  },

  // Future services (Phase 7E-7F)
  postmark: {
    timeout: 8000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 10,
    name: 'Postmark API'
  },

  phantombuster: {
    timeout: 20000,
    errorThresholdPercentage: 55,
    resetTimeout: 45000,
    volumeThreshold: 5,
    name: 'Phantombuster API'
  },

  heygen: {
    timeout: 60000,              // Video generation is slow
    errorThresholdPercentage: 40,
    resetTimeout: 120000,
    volumeThreshold: 2,
    name: 'HeyGen API'
  }
};

/**
 * Create a circuit breaker for a function
 *
 * @param {Function} fn - The async function to wrap
 * @param {Object} options - Circuit breaker configuration
 * @param {string} options.serviceName - Service identifier (hubspot, lemlist, etc.)
 * @param {Object} options.fallback - Optional fallback function
 * @param {Object} options.cache - Optional cache instance for fallback
 * @returns {CircuitBreaker} Configured circuit breaker instance
 */
export function createCircuitBreaker(fn, options = {}) {
  const { serviceName, fallback, cache, ...customOptions } = options;

  // Get service-specific config or use defaults
  const serviceConfig = serviceName ? SERVICE_CONFIGS[serviceName] : {};
  const config = {
    ...DEFAULT_OPTIONS,
    ...serviceConfig,
    ...customOptions
  };

  // Check if circuit already exists
  if (circuitBreakerRegistry.has(config.name)) {
    logger.debug(`Returning existing circuit breaker for ${config.name}`);
    return circuitBreakerRegistry.get(config.name);
  }

  logger.info(`Creating circuit breaker for ${config.name}`, {
    timeout: config.timeout,
    errorThreshold: config.errorThresholdPercentage,
    resetTimeout: config.resetTimeout
  });

  // Create circuit breaker
  const breaker = new CircuitBreaker(fn, config);

  // Configure fallback if provided
  if (fallback) {
    breaker.fallback(fallback);
  } else if (cache) {
    // Default cache-based fallback
    breaker.fallback((...args) => {
      logger.warn(`Circuit open for ${config.name}, attempting cache fallback`);

      // Generate cache key from arguments
      const cacheKey = `${config.name}:${JSON.stringify(args)}`;
      const cached = cache.get(cacheKey);

      if (cached) {
        logger.info(`Returning cached data for ${config.name}`);
        return { ...cached, fromCache: true };
      }

      // No cache available, throw error
      throw new Error(`${config.name} circuit open and no cached data available`);
    });
  }

  // Event listeners for monitoring and logging

  // Circuit opened - service is failing
  breaker.on('open', () => {
    logger.error(`Circuit OPENED for ${config.name}`, {
      stats: breaker.stats,
      errorRate: `${(breaker.stats.failures / breaker.stats.fires * 100).toFixed(2)}%`,
      failures: breaker.stats.failures,
      fires: breaker.stats.fires
    });
  });

  // Circuit half-open - testing recovery
  breaker.on('halfOpen', () => {
    logger.warn(`Circuit HALF-OPEN for ${config.name} - testing recovery`);
  });

  // Circuit closed - service recovered
  breaker.on('close', () => {
    logger.info(`Circuit CLOSED for ${config.name} - service recovered`, {
      stats: breaker.stats
    });
  });

  // Individual failure
  breaker.on('failure', (error) => {
    logger.warn(`Circuit failure for ${config.name}`, {
      error: error.message,
      errorType: error.constructor.name
    });
  });

  // Request timeout
  breaker.on('timeout', () => {
    logger.warn(`Circuit timeout for ${config.name}`, {
      timeout: config.timeout
    });
  });

  // Request rejected (circuit open)
  breaker.on('reject', () => {
    logger.warn(`Request rejected - circuit open for ${config.name}`);
  });

  // Fallback executed
  breaker.on('fallback', (result) => {
    logger.info(`Fallback executed for ${config.name}`, {
      hasResult: !!result
    });
  });

  // Success
  breaker.on('success', (result) => {
    logger.debug(`Circuit success for ${config.name}`, {
      latency: breaker.stats.latencyMean
    });
  });

  // Register circuit breaker
  circuitBreakerRegistry.set(config.name, breaker);

  return breaker;
}

/**
 * Get all registered circuit breakers
 * Used for health checks and monitoring
 *
 * @returns {Map<string, CircuitBreaker>} Map of circuit breakers by name
 */
export function getAllCircuitBreakers() {
  return circuitBreakerRegistry;
}

/**
 * Get circuit breaker by name
 *
 * @param {string} name - Circuit breaker name
 * @returns {CircuitBreaker|null} Circuit breaker instance or null
 */
export function getCircuitBreaker(name) {
  return circuitBreakerRegistry.get(name) || null;
}

/**
 * Get circuit breaker health status
 *
 * @param {string} name - Circuit breaker name
 * @returns {Object} Health status object
 */
export function getCircuitBreakerHealth(name) {
  const breaker = circuitBreakerRegistry.get(name);

  if (!breaker) {
    return {
      name,
      exists: false,
      state: 'unknown'
    };
  }

  const stats = breaker.stats;
  const errorRate = stats.fires > 0
    ? (stats.failures / stats.fires * 100).toFixed(2)
    : 0;

  return {
    name,
    exists: true,
    state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
    stats: {
      fires: stats.fires,
      successes: stats.successes,
      failures: stats.failures,
      rejects: stats.rejects,
      timeouts: stats.timeouts,
      fallbacks: stats.fallbacks,
      errorRate: `${errorRate}%`,
      latencyMean: stats.latencyMean,
      latencyP95: stats.percentiles ? stats.percentiles['0.95'] : null
    }
  };
}

/**
 * Get health status for all circuit breakers
 *
 * @returns {Object} Map of health statuses by service name
 */
export function getAllCircuitBreakerHealth() {
  const health = {};

  for (const [name, breaker] of circuitBreakerRegistry.entries()) {
    health[name] = getCircuitBreakerHealth(name);
  }

  return health;
}

/**
 * Manually reset a circuit breaker (force close)
 * Use with caution - should only be done after fixing underlying issue
 *
 * @param {string} name - Circuit breaker name
 * @returns {boolean} True if reset successful
 */
export function resetCircuitBreaker(name) {
  const breaker = circuitBreakerRegistry.get(name);

  if (!breaker) {
    logger.warn(`Cannot reset circuit breaker ${name} - not found`);
    return false;
  }

  if (breaker.opened || breaker.halfOpen) {
    logger.warn(`Manually resetting circuit breaker ${name}`);
    breaker.close();
    return true;
  }

  logger.debug(`Circuit breaker ${name} already closed`);
  return true;
}

/**
 * Shutdown all circuit breakers
 * Call this during graceful shutdown
 */
export function shutdownCircuitBreakers() {
  logger.info('Shutting down all circuit breakers');

  for (const [name, breaker] of circuitBreakerRegistry.entries()) {
    breaker.shutdown();
    logger.debug(`Circuit breaker ${name} shut down`);
  }

  circuitBreakerRegistry.clear();
}

export default {
  createCircuitBreaker,
  getAllCircuitBreakers,
  getCircuitBreaker,
  getCircuitBreakerHealth,
  getAllCircuitBreakerHealth,
  resetCircuitBreaker,
  shutdownCircuitBreakers
};
