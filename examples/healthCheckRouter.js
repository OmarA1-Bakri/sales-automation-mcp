/**
 * Health Check Router for Express
 *
 * Provides comprehensive health check endpoints for monitoring
 * circuit breaker status, system health, and service availability
 *
 * Endpoints:
 * - GET /health                - Basic health status
 * - GET /health/detailed       - Detailed circuit breaker statistics
 * - GET /health/ready          - Kubernetes readiness probe
 * - GET /health/live           - Kubernetes liveness probe
 * - POST /health/circuits/:name/reset - Manual circuit reset (admin)
 */

const express = require('express');
const circuitBreakerFactory = require('./circuitBreakerFactory');

const router = express.Router();

/**
 * Basic health check endpoint
 * Returns 200 if all systems healthy, 503 if degraded
 *
 * GET /health
 */
router.get('/health', (req, res) => {
  const states = circuitBreakerFactory.getStates();
  const summary = circuitBreakerFactory.getSummary();

  // Define which circuits are critical for service health
  const criticalCircuits = ['hubspot-circuit', 'explorium-circuit'];

  // Check if any critical circuits are open
  const hasCriticalFailure = criticalCircuits.some(name =>
    states[name]?.state === 'OPEN'
  );

  const status = hasCriticalFailure ? 'degraded' : 'healthy';
  const statusCode = hasCriticalFailure ? 503 : 200;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    summary: {
      totalCircuits: summary.totalCircuits,
      circuitsOpen: summary.circuitsOpen,
      circuitsHalfOpen: summary.circuitsHalfOpen,
      circuitsClosed: summary.circuitsClosed,
      overallSuccessRate: summary.overallSuccessRate
    },
    circuits: Object.keys(states).reduce((acc, name) => {
      acc[name] = states[name].state;
      return acc;
    }, {})
  });
});

/**
 * Detailed health check with full circuit statistics
 * Includes latency percentiles, error rates, and cache metrics
 *
 * GET /health/detailed
 */
router.get('/health/detailed', (req, res) => {
  const breakers = circuitBreakerFactory.getAll();
  const summary = circuitBreakerFactory.getSummary();

  const circuitDetails = breakers.map(breaker => {
    const stats = breaker.stats;

    return {
      name: breaker.name,
      state: breaker.opened ? 'OPEN' : (breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED'),
      enabled: breaker.enabled,
      config: {
        timeout: breaker.options.timeout,
        errorThresholdPercentage: breaker.options.errorThresholdPercentage,
        volumeThreshold: breaker.options.volumeThreshold,
        resetTimeout: breaker.options.resetTimeout
      },
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
        rejectRate: stats.fires > 0
          ? (stats.rejects / stats.fires * 100).toFixed(2) + '%'
          : '0%',
        fallbackRate: stats.fires > 0
          ? (stats.fallbacks / stats.fires * 100).toFixed(2) + '%'
          : '0%',
        cacheHitRate: (stats.cacheHits + stats.cacheMisses) > 0
          ? (stats.cacheHits / (stats.cacheHits + stats.cacheMisses) * 100).toFixed(2) + '%'
          : 'N/A'
      },
      latency: {
        mean: stats.latencyMean ? stats.latencyMean.toFixed(2) + 'ms' : 'N/A',
        percentiles: breaker.options.rollingPercentilesEnabled && stats.percentiles ? {
          p50: stats.percentiles['0.5'] ? stats.percentiles['0.5'].toFixed(2) + 'ms' : 'N/A',
          p90: stats.percentiles['0.9'] ? stats.percentiles['0.9'].toFixed(2) + 'ms' : 'N/A',
          p95: stats.percentiles['0.95'] ? stats.percentiles['0.95'].toFixed(2) + 'ms' : 'N/A',
          p99: stats.percentiles['0.99'] ? stats.percentiles['0.99'].toFixed(2) + 'ms' : 'N/A',
          p99_9: stats.percentiles['0.999'] ? stats.percentiles['0.999'].toFixed(2) + 'ms' : 'N/A'
        } : null
      }
    };
  });

  // Overall system health
  const anyCircuitOpen = circuitDetails.some(c => c.state === 'OPEN');
  const status = anyCircuitOpen ? 'degraded' : 'healthy';

  res.status(anyCircuitOpen ? 503 : 200).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    summary: {
      totalCircuits: summary.totalCircuits,
      circuitsOpen: summary.circuitsOpen,
      circuitsHalfOpen: summary.circuitsHalfOpen,
      circuitsClosed: summary.circuitsClosed,
      totalRequests: summary.totalRequests,
      totalSuccesses: summary.totalSuccesses,
      totalFailures: summary.totalFailures,
      totalTimeouts: summary.totalTimeouts,
      totalRejects: summary.totalRejects,
      overallSuccessRate: summary.overallSuccessRate
    },
    circuits: circuitDetails,
    process: {
      pid: process.pid,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  });
});

/**
 * Readiness probe for Kubernetes
 * Returns 200 if service is ready to receive traffic
 * Returns 503 if any critical circuits are open
 *
 * GET /health/ready
 */
router.get('/health/ready', (req, res) => {
  const states = circuitBreakerFactory.getStates();

  // Define critical circuits that must be operational for readiness
  const criticalCircuits = ['hubspot-circuit', 'explorium-circuit'];

  const criticalCircuitsOpen = criticalCircuits.filter(name =>
    states[name]?.state === 'OPEN'
  );

  if (criticalCircuitsOpen.length === 0) {
    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      ready: false,
      reason: 'One or more critical circuit breakers are open',
      openCircuits: criticalCircuitsOpen,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness probe for Kubernetes
 * Returns 200 if the process is alive and responsive
 * Should NOT check external dependencies
 *
 * GET /health/live
 */
router.get('/health/live', (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid
  });
});

/**
 * Manual circuit breaker reset (admin endpoint)
 * Should be protected by authentication in production
 *
 * POST /health/circuits/:name/reset
 */
router.post('/health/circuits/:name/reset', (req, res) => {
  const { name } = req.params;
  const breaker = circuitBreakerFactory.get(name);

  if (!breaker) {
    return res.status(404).json({
      error: `Circuit breaker '${name}' not found`,
      availableCircuits: Array.from(circuitBreakerFactory.breakers.keys())
    });
  }

  const previousState = breaker.opened ? 'OPEN' : (breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED');

  // Close the circuit manually
  if (breaker.opened || breaker.halfOpen) {
    breaker.close();

    res.json({
      message: `Circuit breaker '${name}' has been reset`,
      previousState,
      currentState: 'CLOSED',
      timestamp: new Date().toISOString()
    });
  } else {
    res.json({
      message: `Circuit breaker '${name}' was already closed`,
      state: 'CLOSED',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get specific circuit breaker details
 *
 * GET /health/circuits/:name
 */
router.get('/health/circuits/:name', (req, res) => {
  const { name } = req.params;
  const breaker = circuitBreakerFactory.get(name);

  if (!breaker) {
    return res.status(404).json({
      error: `Circuit breaker '${name}' not found`,
      availableCircuits: Array.from(circuitBreakerFactory.breakers.keys())
    });
  }

  const stats = breaker.stats;

  res.json({
    name: breaker.name,
    state: breaker.opened ? 'OPEN' : (breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED'),
    enabled: breaker.enabled,
    config: {
      timeout: breaker.options.timeout,
      errorThresholdPercentage: breaker.options.errorThresholdPercentage,
      volumeThreshold: breaker.options.volumeThreshold,
      resetTimeout: breaker.options.resetTimeout,
      rollingCountTimeout: breaker.options.rollingCountTimeout,
      rollingCountBuckets: breaker.options.rollingCountBuckets,
      capacity: breaker.options.capacity
    },
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
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * List all available circuit breakers
 *
 * GET /health/circuits
 */
router.get('/health/circuits', (req, res) => {
  const states = circuitBreakerFactory.getStates();

  res.json({
    circuits: Object.keys(states).map(name => ({
      name,
      state: states[name].state,
      enabled: states[name].enabled,
      stats: {
        fires: states[name].stats.fires,
        successes: states[name].stats.successes,
        failures: states[name].stats.failures,
        errorRate: states[name].metrics.errorRate
      }
    })),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
