/**
 * Prometheus Metrics Integration for Circuit Breakers
 *
 * Integrates opossum circuit breakers with Prometheus monitoring
 * Exposes standard opossum metrics plus custom circuit state gauges
 *
 * Metrics Exposed:
 * - circuit_breaker_fire_total - Total requests fired
 * - circuit_breaker_success_total - Total successful requests
 * - circuit_breaker_failure_total - Total failed requests
 * - circuit_breaker_timeout_total - Total timeouts
 * - circuit_breaker_reject_total - Total rejected requests
 * - circuit_breaker_fallback_total - Total fallback executions
 * - circuit_breaker_success_duration_seconds - Success latency histogram
 * - circuit_breaker_failed_duration_seconds - Failure latency histogram
 * - circuit_breaker_state - Current circuit state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
 * - circuit_breaker_resets_total - Total circuit resets
 */

const CircuitBreaker = require('opossum');
const PrometheusMetrics = require('opossum-prometheus');
const client = require('prom-client');
const circuitBreakerFactory = require('./circuitBreakerFactory');

// Create Prometheus registry
const register = new client.Registry();

// Add default system metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'nodejs_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  eventLoopMonitoringPrecision: 10
});

// Initialize opossum-prometheus with existing circuit breakers
const prometheusMetrics = new PrometheusMetrics({
  circuits: circuitBreakerFactory.getAll(),
  registry: register,
  exposePerformanceMetrics: true, // Include latency histograms
  metricPrefix: 'circuit_breaker_' // Prefix for all circuit breaker metrics
});

// Set metrics collector in factory for new circuits
circuitBreakerFactory.setMetricsCollector(prometheusMetrics);

// Custom metric: Circuit breaker state gauge
const circuitStateGauge = new client.Gauge({
  name: 'circuit_breaker_state',
  help: 'Current state of circuit breakers (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
  labelNames: ['circuit_name'],
  registers: [register]
});

// Custom metric: Circuit breaker reset counter
const circuitResetCounter = new client.Counter({
  name: 'circuit_breaker_resets_total',
  help: 'Total number of times a circuit breaker has been reset from OPEN to CLOSED',
  labelNames: ['circuit_name'],
  registers: [register]
});

// Custom metric: Circuit breaker open duration
const circuitOpenDuration = new client.Histogram({
  name: 'circuit_breaker_open_duration_seconds',
  help: 'Duration in seconds that circuit breaker was in OPEN state',
  labelNames: ['circuit_name'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600], // 1s to 1h
  registers: [register]
});

// Track when circuits open for duration calculation
const circuitOpenTimestamps = new Map();

/**
 * Attach Prometheus listeners to a circuit breaker
 * Tracks state transitions and updates custom metrics
 *
 * @param {CircuitBreaker} breaker - Circuit breaker instance
 */
function attachPrometheusListeners(breaker) {
  const circuitName = breaker.name;

  // Track OPEN state
  breaker.on('open', () => {
    console.log(`[Prometheus] Circuit ${circuitName} opened`);
    circuitStateGauge.set({ circuit_name: circuitName }, 2);
    circuitOpenTimestamps.set(circuitName, Date.now());
  });

  // Track HALF_OPEN state
  breaker.on('halfOpen', () => {
    console.log(`[Prometheus] Circuit ${circuitName} half-open`);
    circuitStateGauge.set({ circuit_name: circuitName }, 1);
  });

  // Track CLOSED state
  breaker.on('close', () => {
    console.log(`[Prometheus] Circuit ${circuitName} closed`);
    circuitStateGauge.set({ circuit_name: circuitName }, 0);

    // Increment reset counter
    circuitResetCounter.inc({ circuit_name: circuitName });

    // Record open duration if we have a timestamp
    if (circuitOpenTimestamps.has(circuitName)) {
      const openTimestamp = circuitOpenTimestamps.get(circuitName);
      const duration = (Date.now() - openTimestamp) / 1000; // Convert to seconds
      circuitOpenDuration.observe({ circuit_name: circuitName }, duration);
      circuitOpenTimestamps.delete(circuitName);
    }
  });

  // Initialize state gauge
  const initialState = breaker.opened ? 2 : (breaker.halfOpen ? 1 : 0);
  circuitStateGauge.set({ circuit_name: circuitName }, initialState);
}

// Attach listeners to all existing circuit breakers
circuitBreakerFactory.getAll().forEach(breaker => {
  attachPrometheusListeners(breaker);
});

// Override factory's attachEventListeners to include Prometheus listeners
const originalAttachEventListeners = circuitBreakerFactory.attachEventListeners.bind(circuitBreakerFactory);
circuitBreakerFactory.attachEventListeners = function(breaker, name) {
  originalAttachEventListeners(breaker, name);
  attachPrometheusListeners(breaker);
};

/**
 * Get metrics in Prometheus format
 *
 * @returns {Promise<string>} Prometheus metrics text
 */
async function getMetrics() {
  return register.metrics();
}

/**
 * Get metrics content type header
 *
 * @returns {string} Content type for Prometheus metrics
 */
function getContentType() {
  return register.contentType;
}

/**
 * Reset all metrics (useful for testing)
 */
function resetMetrics() {
  register.resetMetrics();
}

/**
 * Get current circuit states as metrics object
 *
 * @returns {Object} Circuit states with metric values
 */
function getCircuitStates() {
  const states = {};
  const breakers = circuitBreakerFactory.getAll();

  breakers.forEach(breaker => {
    states[breaker.name] = {
      state: breaker.opened ? 'OPEN' : (breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED'),
      stateValue: breaker.opened ? 2 : (breaker.halfOpen ? 1 : 0),
      stats: breaker.stats
    };
  });

  return states;
}

module.exports = {
  register,
  prometheusMetrics,
  attachPrometheusListeners,
  getMetrics,
  getContentType,
  resetMetrics,
  getCircuitStates,

  // Export custom metrics for direct access if needed
  customMetrics: {
    circuitStateGauge,
    circuitResetCounter,
    circuitOpenDuration
  }
};
