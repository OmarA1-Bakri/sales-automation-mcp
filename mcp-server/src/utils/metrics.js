import { Registry, Counter, Gauge, Histogram } from 'prom-client';
import { createLogger } from './logger.js';

const logger = createLogger('Metrics');

/**
 * Prometheus Metrics System (FIX #5: Monitoring & Observability)
 *
 * PRE-DEFINED METRICS (fixes dynamic label registration bug):
 * All metrics are registered at initialization with fixed label sets.
 * This prevents the "label not defined" errors in production.
 *
 * Provides comprehensive metrics for:
 * - Orphaned Event Queue (size, processing time, success/failure rates)
 * - HTTP requests (rate, latency, errors)
 * - Database operations (query time, connection pool)
 * - Redis operations (connection status, errors)
 *
 * Metrics are exposed at /metrics endpoint in Prometheus format
 *
 * @see https://prometheus.io/docs/concepts/metric_types/
 */
class MetricsSystem {
  constructor() {
    this.registry = new Registry();

    // Set default labels for all metrics
    this.registry.setDefaultLabels({
      app: 'sales-automation-api',
      environment: process.env.NODE_ENV || 'development'
    });

    // Pre-define all metrics to avoid dynamic label registration bug
    this._defineMetrics();

    logger.info('Metrics system initialized', {
      environment: process.env.NODE_ENV || 'development',
      metricsCount: this.registry.getMetricsAsArray().length
    });
  }

  /**
   * Pre-define all metrics with their labels at initialization
   * This fixes the critical dynamic label registration bug
   * @private
   */
  _defineMetrics() {
    // ============================================================================
    // ORPHANED EVENT QUEUE METRICS
    // ============================================================================

    this._orphanedQueueEnqueued = new Counter({
      name: 'orphaned_queue_enqueued_total',
      help: 'Total number of events enqueued to orphaned queue',
      labelNames: ['event_type', 'channel'],
      registers: [this.registry]
    });

    this._orphanedQueueProcessed = new Counter({
      name: 'orphaned_queue_processed_total',
      help: 'Total number of events processed from orphaned queue',
      registers: [this.registry]
    });

    this._orphanedQueueSucceeded = new Counter({
      name: 'orphaned_queue_succeeded_total',
      help: 'Total number of events successfully processed',
      registers: [this.registry]
    });

    this._orphanedQueueFailed = new Counter({
      name: 'orphaned_queue_failed_total',
      help: 'Total number of events that failed processing',
      registers: [this.registry]
    });

    this._orphanedQueueDropped = new Counter({
      name: 'orphaned_queue_dropped_total',
      help: 'Total number of events dropped after max retries',
      registers: [this.registry]
    });

    this._orphanedQueueDroppedAtCapacity = new Counter({
      name: 'orphaned_queue_dropped_at_capacity_total',
      help: 'Total number of events dropped due to queue capacity limit',
      registers: [this.registry]
    });

    this._orphanedQueueMovedToDlq = new Counter({
      name: 'orphaned_queue_moved_to_dlq_total',
      help: 'Total number of events moved to dead letter queue',
      labelNames: ['event_type', 'channel'],
      registers: [this.registry]
    });

    this._orphanedQueueCyclesSkipped = new Counter({
      name: 'orphaned_queue_cycles_skipped_total',
      help: 'Total number of processing cycles skipped due to ongoing processing',
      registers: [this.registry]
    });

    this._orphanedQueueEnqueueErrors = new Counter({
      name: 'orphaned_queue_enqueue_errors_total',
      help: 'Total number of errors during enqueue operations',
      registers: [this.registry]
    });

    this._orphanedQueueProcessingErrors = new Counter({
      name: 'orphaned_queue_processing_errors_total',
      help: 'Total number of errors during queue processing',
      registers: [this.registry]
    });

    this._orphanedQueueDlqErrors = new Counter({
      name: 'orphaned_queue_dlq_errors_total',
      help: 'Total number of errors moving events to DLQ',
      registers: [this.registry]
    });

    this._orphanedQueueSize = new Gauge({
      name: 'orphaned_queue_size',
      help: 'Current number of events in orphaned queue',
      registers: [this.registry]
    });

    this._orphanedQueueProcessingTimeMs = new Histogram({
      name: 'orphaned_queue_processing_time_ms',
      help: 'Time taken to process a batch of orphaned events (milliseconds)',
      buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
      registers: [this.registry]
    });

    this._orphanedQueueRetryAttempts = new Histogram({
      name: 'orphaned_queue_retry_attempts',
      help: 'Number of retry attempts before event succeeded',
      buckets: [1, 2, 3, 4, 5, 6],
      registers: [this.registry]
    });

    // ============================================================================
    // REDIS METRICS
    // ============================================================================

    this._redisErrors = new Counter({
      name: 'redis_errors_total',
      help: 'Total number of Redis connection errors',
      labelNames: ['error_type'],
      registers: [this.registry]
    });

    // ============================================================================
    // HTTP METRICS (for future use)
    // ============================================================================

    this._httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry]
    });

    this._httpRequestDurationMs = new Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in milliseconds',
      labelNames: ['method', 'route'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
      registers: [this.registry]
    });
  }

  /**
   * Increment a counter metric
   * Uses pre-defined metrics to avoid dynamic label registration
   *
   * @param {string} name - Metric name
   * @param {number} value - Value to increment by (default 1)
   * @param {Object} labels - Label key-value pairs
   */
  counter(name, value = 1, labels = {}) {
    try {
      // Map metric names to pre-defined counters
      const metricMap = {
        'orphaned_queue.enqueued': this._orphanedQueueEnqueued,
        'orphaned_queue.processed': this._orphanedQueueProcessed,
        'orphaned_queue.succeeded': this._orphanedQueueSucceeded,
        'orphaned_queue.failed': this._orphanedQueueFailed,
        'orphaned_queue.dropped': this._orphanedQueueDropped,
        'orphaned_queue.dropped_at_capacity': this._orphanedQueueDroppedAtCapacity,
        'orphaned_queue.moved_to_dlq': this._orphanedQueueMovedToDlq,
        'orphaned_queue.cycles_skipped': this._orphanedQueueCyclesSkipped,
        'orphaned_queue.enqueue_errors': this._orphanedQueueEnqueueErrors,
        'orphaned_queue.processing_errors': this._orphanedQueueProcessingErrors,
        'orphaned_queue.dlq_errors': this._orphanedQueueDlqErrors,
        'orphaned_queue.redis_errors': this._redisErrors,
        'http.requests': this._httpRequestsTotal
      };

      const metric = metricMap[name];

      if (!metric) {
        logger.warn('Unknown counter metric', { name, availableMetrics: Object.keys(metricMap) });
        return;
      }

      // Sanitize labels to prevent cardinality explosion
      const sanitizedLabels = this._sanitizeLabels(name, labels);

      metric.inc(sanitizedLabels, value);

    } catch (error) {
      logger.error('Error incrementing counter', {
        name,
        value,
        labels,
        error: error.message
      });
    }
  }

  /**
   * Set a gauge metric (current value)
   *
   * @param {string} name - Metric name
   * @param {number} value - Current value
   * @param {Object} labels - Label key-value pairs
   */
  gauge(name, value, labels = {}) {
    try {
      const metricMap = {
        'orphaned_queue.size': this._orphanedQueueSize
      };

      const metric = metricMap[name];

      if (!metric) {
        logger.warn('Unknown gauge metric', { name, availableMetrics: Object.keys(metricMap) });
        return;
      }

      const sanitizedLabels = this._sanitizeLabels(name, labels);
      metric.set(sanitizedLabels, value);

    } catch (error) {
      logger.error('Error setting gauge', {
        name,
        value,
        labels,
        error: error.message
      });
    }
  }

  /**
   * Observe a histogram metric (for measuring distributions)
   *
   * @param {string} name - Metric name
   * @param {number} value - Observed value
   * @param {Object} labels - Label key-value pairs
   */
  histogram(name, value, labels = {}) {
    try {
      const metricMap = {
        'orphaned_queue.processing_time_ms': this._orphanedQueueProcessingTimeMs,
        'orphaned_queue.retry_attempts': this._orphanedQueueRetryAttempts,
        'http.request.duration_ms': this._httpRequestDurationMs
      };

      const metric = metricMap[name];

      if (!metric) {
        logger.warn('Unknown histogram metric', { name, availableMetrics: Object.keys(metricMap) });
        return;
      }

      const sanitizedLabels = this._sanitizeLabels(name, labels);
      metric.observe(sanitizedLabels, value);

    } catch (error) {
      logger.error('Error observing histogram', {
        name,
        value,
        labels,
        error: error.message
      });
    }
  }

  /**
   * Sanitize labels to prevent cardinality explosion
   * Whitelists known values for each metric
   * @private
   */
  _sanitizeLabels(metricName, labels) {
    // Whitelist of allowed label values by metric
    const whitelist = {
      'orphaned_queue.enqueued': {
        event_type: ['sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed', 'errored'],
        channel: ['email', 'linkedin', 'phone']
      },
      'orphaned_queue.moved_to_dlq': {
        event_type: ['sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed', 'errored'],
        channel: ['email', 'linkedin', 'phone']
      },
      'orphaned_queue.redis_errors': {
        error_type: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'other']
      },
      'http.requests': {
        method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        route: [],  // No whitelist - will use 'other' for unknown
        status_code: []  // No whitelist - status codes are finite
      },
      'http.request.duration_ms': {
        method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        route: []
      }
    };

    const allowed = whitelist[metricName] || {};
    const sanitized = {};

    for (const [key, value] of Object.entries(labels)) {
      const allowedValues = allowed[key];

      if (!allowedValues || allowedValues.length === 0) {
        // No whitelist for this label - pass through as-is
        sanitized[key] = String(value);
      } else if (allowedValues.includes(value)) {
        // Value is in whitelist - use it
        sanitized[key] = value;
      } else {
        // Value not in whitelist - bucket as 'other'
        sanitized[key] = 'other';
        logger.debug('Label value not in whitelist, using "other"', {
          metric: metricName,
          label: key,
          value,
          allowed: allowedValues
        });
      }
    }

    return sanitized;
  }

  /**
   * Get metrics in Prometheus format
   *
   * @returns {Promise<string>} Metrics in Prometheus exposition format
   */
  async getMetrics() {
    try {
      return await this.registry.metrics();
    } catch (error) {
      logger.error('Error getting metrics', { error: error.message });
      return '';
    }
  }

  /**
   * Get metrics as JSON (for debugging)
   *
   * @returns {Promise<Object>} Metrics as JSON
   */
  async getMetricsJSON() {
    try {
      return await this.registry.getMetricsAsJSON();
    } catch (error) {
      logger.error('Error getting metrics JSON', { error: error.message });
      return [];
    }
  }

  /**
   * Reset all metrics (for testing)
   */
  reset() {
    this.registry.resetMetrics();
    logger.warn('All metrics reset');
  }

  /**
   * Clear all metric collectors (for testing)
   */
  clear() {
    this.registry.clear();
    logger.warn('All metric collectors cleared');
  }
}

// Singleton instance
const metrics = new MetricsSystem();

export { metrics, MetricsSystem };
