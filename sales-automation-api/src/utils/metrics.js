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

    // ============================================================================
    // AGENT PERFORMANCE METRICS
    // ============================================================================

    this._agentExecutionTotal = new Counter({
      name: 'agent_execution_total',
      help: 'Total number of agent executions',
      labelNames: ['agent_role', 'status'],
      registers: [this.registry]
    });

    this._agentExecutionDurationMs = new Histogram({
      name: 'agent_execution_duration_ms',
      help: 'Agent execution duration in milliseconds',
      labelNames: ['agent_role'],
      buckets: [100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000],
      registers: [this.registry]
    });

    this._agentQualityScore = new Gauge({
      name: 'agent_quality_score',
      help: 'Current quality score for agent output (0-100)',
      labelNames: ['agent_role'],
      registers: [this.registry]
    });

    this._agentErrorsTotal = new Counter({
      name: 'agent_errors_total',
      help: 'Total number of agent errors',
      labelNames: ['agent_role', 'error_type'],
      registers: [this.registry]
    });

    // ============================================================================
    // OUTREACH QUALITY METRICS
    // ============================================================================

    this._outreachQualityScore = new Histogram({
      name: 'outreach_quality_score',
      help: 'Pre-send quality score distribution',
      labelNames: ['persona', 'template'],
      buckets: [20, 40, 60, 70, 80, 90, 100],
      registers: [this.registry]
    });

    this._outreachBlockedTotal = new Counter({
      name: 'outreach_blocked_total',
      help: 'Total number of outreach attempts blocked by quality gates',
      labelNames: ['reason'],
      registers: [this.registry]
    });

    this._outreachSentTotal = new Counter({
      name: 'outreach_sent_total',
      help: 'Total number of outreach messages sent',
      labelNames: ['channel', 'template', 'persona'],
      registers: [this.registry]
    });

    this._outreachOutcomeTotal = new Counter({
      name: 'outreach_outcome_total',
      help: 'Total outreach outcomes by type',
      labelNames: ['outcome_type', 'channel'],
      registers: [this.registry]
    });

    // ============================================================================
    // DATA QUALITY METRICS
    // ============================================================================

    this._dataQualityValidationsTotal = new Counter({
      name: 'data_quality_validations_total',
      help: 'Total number of contact validations',
      labelNames: ['result'],
      registers: [this.registry]
    });

    this._dataQualityScore = new Histogram({
      name: 'data_quality_score',
      help: 'Contact data quality score distribution',
      buckets: [20, 40, 60, 70, 80, 90, 100],
      registers: [this.registry]
    });

    // ============================================================================
    // PROVIDER HEALTH METRICS (Phase 6: 3rd Party Provider Integration)
    // ============================================================================

    // API call tracking by provider
    this._providerApiCallsTotal = new Counter({
      name: 'provider_api_calls_total',
      help: 'Total API calls to external providers',
      labelNames: ['provider', 'endpoint', 'status'],
      registers: [this.registry]
    });

    this._providerApiLatencyMs = new Histogram({
      name: 'provider_api_latency_ms',
      help: 'API latency for external provider calls in milliseconds',
      labelNames: ['provider', 'endpoint'],
      buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000],
      registers: [this.registry]
    });

    this._providerApiErrorsTotal = new Counter({
      name: 'provider_api_errors_total',
      help: 'Total API errors by provider and error type',
      labelNames: ['provider', 'error_type'],
      registers: [this.registry]
    });

    // Webhook metrics by provider
    this._providerWebhooksTotal = new Counter({
      name: 'provider_webhooks_total',
      help: 'Total webhooks received from external providers',
      labelNames: ['provider', 'event_type', 'status'],
      registers: [this.registry]
    });

    this._providerWebhookLatencyMs = new Histogram({
      name: 'provider_webhook_latency_ms',
      help: 'Webhook processing latency in milliseconds',
      labelNames: ['provider', 'event_type'],
      buckets: [5, 10, 25, 50, 100, 250, 500],
      registers: [this.registry]
    });

    // Rate limit tracking (LinkedIn/PhantomBuster)
    this._providerRateLimitUsage = new Gauge({
      name: 'provider_rate_limit_usage',
      help: 'Current rate limit usage (0-1 ratio)',
      labelNames: ['provider', 'action_type'],
      registers: [this.registry]
    });

    this._providerRateLimitHitsTotal = new Counter({
      name: 'provider_rate_limit_hits_total',
      help: 'Total rate limit hits (blocked actions)',
      labelNames: ['provider', 'action_type'],
      registers: [this.registry]
    });

    // Cost tracking
    this._providerCostTotal = new Counter({
      name: 'provider_cost_total',
      help: 'Total cost/credits consumed by provider',
      labelNames: ['provider', 'action_type'],
      registers: [this.registry]
    });

    // Provider health status (for alerting)
    this._providerHealthStatus = new Gauge({
      name: 'provider_health_status',
      help: 'Provider health status (1=healthy, 0=degraded, -1=down)',
      labelNames: ['provider'],
      registers: [this.registry]
    });

    // Video generation metrics (HeyGen specific)
    this._videoGenerationsTotal = new Counter({
      name: 'video_generations_total',
      help: 'Total video generation attempts',
      labelNames: ['status'],
      registers: [this.registry]
    });

    this._videoGenerationDurationMs = new Histogram({
      name: 'video_generation_duration_ms',
      help: 'Video generation time from request to completion',
      buckets: [30000, 60000, 120000, 300000, 600000, 1200000],
      registers: [this.registry]
    });

    // Email metrics (Postmark specific)
    this._emailsSentTotal = new Counter({
      name: 'emails_sent_total',
      help: 'Total emails sent via Postmark',
      labelNames: ['template', 'status'],
      registers: [this.registry]
    });

    this._emailBounceRate = new Gauge({
      name: 'email_bounce_rate',
      help: 'Current email bounce rate (0-1)',
      registers: [this.registry]
    });

    // LinkedIn metrics (PhantomBuster specific)
    this._linkedinActionsTotal = new Counter({
      name: 'linkedin_actions_total',
      help: 'Total LinkedIn actions via PhantomBuster',
      labelNames: ['action_type', 'status'],
      registers: [this.registry]
    });

    this._linkedinDailyUsage = new Gauge({
      name: 'linkedin_daily_usage',
      help: 'Daily LinkedIn action usage count',
      labelNames: ['action_type'],
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
        'http.requests': this._httpRequestsTotal,
        // Agent metrics
        'agent.execution': this._agentExecutionTotal,
        'agent.errors': this._agentErrorsTotal,
        // Outreach metrics
        'outreach.blocked': this._outreachBlockedTotal,
        'outreach.sent': this._outreachSentTotal,
        'outreach.outcome': this._outreachOutcomeTotal,
        // Data quality metrics
        'data_quality.validations': this._dataQualityValidationsTotal,
        // Provider health metrics
        'provider.api_calls': this._providerApiCallsTotal,
        'provider.api_errors': this._providerApiErrorsTotal,
        'provider.webhooks': this._providerWebhooksTotal,
        'provider.rate_limit_hits': this._providerRateLimitHitsTotal,
        'provider.cost': this._providerCostTotal,
        'video.generations': this._videoGenerationsTotal,
        'emails.sent': this._emailsSentTotal,
        'linkedin.actions': this._linkedinActionsTotal
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
        'orphaned_queue.size': this._orphanedQueueSize,
        'agent.quality_score': this._agentQualityScore,
        // Provider health metrics
        'provider.rate_limit_usage': this._providerRateLimitUsage,
        'provider.health_status': this._providerHealthStatus,
        'email.bounce_rate': this._emailBounceRate,
        'linkedin.daily_usage': this._linkedinDailyUsage
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
        'http.request.duration_ms': this._httpRequestDurationMs,
        // Agent metrics
        'agent.execution_duration_ms': this._agentExecutionDurationMs,
        // Outreach metrics
        'outreach.quality_score': this._outreachQualityScore,
        // Data quality metrics
        'data_quality.score': this._dataQualityScore,
        // Provider health metrics
        'provider.api_latency_ms': this._providerApiLatencyMs,
        'provider.webhook_latency_ms': this._providerWebhookLatencyMs,
        'video.generation_duration_ms': this._videoGenerationDurationMs
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
      },
      // Agent metrics whitelists
      'agent.execution': {
        agent_role: ['data-quality-guardian', 'engagement-analyst', 'conversation-strategist',
                     'outreach-orchestrator', 'sales-strategist', 'other'],
        status: ['success', 'failure', 'timeout']
      },
      'agent.errors': {
        agent_role: ['data-quality-guardian', 'engagement-analyst', 'conversation-strategist',
                     'outreach-orchestrator', 'sales-strategist', 'other'],
        error_type: ['timeout', 'validation', 'api_error', 'unknown']
      },
      'agent.execution_duration_ms': {
        agent_role: ['data-quality-guardian', 'engagement-analyst', 'conversation-strategist',
                     'outreach-orchestrator', 'sales-strategist', 'other']
      },
      'agent.quality_score': {
        agent_role: ['data-quality-guardian', 'engagement-analyst', 'conversation-strategist',
                     'outreach-orchestrator', 'sales-strategist', 'other']
      },
      // Outreach metrics whitelists
      'outreach.blocked': {
        reason: ['low_quality', 'duplicate', 'invalid_email', 'missing_data', 'icp_mismatch', 'other']
      },
      'outreach.sent': {
        channel: ['email', 'linkedin', 'sms', 'phone'],
        template: [],  // No whitelist - allow any template name
        persona: []    // No whitelist - allow any persona
      },
      'outreach.outcome': {
        outcome_type: ['opened', 'clicked', 'replied', 'meeting_booked', 'bounced', 'unsubscribed'],
        channel: ['email', 'linkedin', 'sms', 'phone']
      },
      'outreach.quality_score': {
        persona: [],
        template: []
      },
      // Data quality metrics whitelists
      'data_quality.validations': {
        result: ['allow', 'warn', 'block']
      },
      // Provider health metrics whitelists
      'provider.api_calls': {
        provider: ['postmark', 'phantombuster', 'heygen'],
        endpoint: [], // Allow any endpoint
        status: ['success', 'error', 'timeout']
      },
      'provider.api_errors': {
        provider: ['postmark', 'phantombuster', 'heygen'],
        error_type: ['rate_limit', 'auth', 'validation', 'server_error', 'network', 'timeout', 'other']
      },
      'provider.api_latency_ms': {
        provider: ['postmark', 'phantombuster', 'heygen'],
        endpoint: []
      },
      'provider.webhooks': {
        provider: ['postmark', 'phantombuster', 'heygen'],
        event_type: ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'video.completed', 'video.failed', 'connection_sent', 'message_sent', 'other'],
        status: ['processed', 'rejected', 'error']
      },
      'provider.webhook_latency_ms': {
        provider: ['postmark', 'phantombuster', 'heygen'],
        event_type: []
      },
      'provider.rate_limit_usage': {
        provider: ['phantombuster', 'linkedin'],
        action_type: ['connection', 'message', 'profile_visit']
      },
      'provider.rate_limit_hits': {
        provider: ['phantombuster', 'linkedin'],
        action_type: ['connection', 'message', 'profile_visit']
      },
      'provider.health_status': {
        provider: ['postmark', 'phantombuster', 'heygen']
      },
      'provider.cost': {
        provider: ['postmark', 'heygen'],
        action_type: ['email_sent', 'video_generated']
      },
      'video.generations': {
        status: ['pending', 'processing', 'completed', 'failed']
      },
      'emails.sent': {
        template: [],
        status: ['sent', 'delivered', 'bounced', 'failed']
      },
      'linkedin.actions': {
        action_type: ['connection', 'message', 'profile_visit'],
        status: ['success', 'rate_limited', 'error']
      },
      'linkedin.daily_usage': {
        action_type: ['connection', 'message', 'profile_visit']
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
