import Redis from 'ioredis';
import { createLogger } from '../utils/logger.js';
import { metrics } from '../utils/metrics.js';

const logger = createLogger('OrphanedEventQueue');

/**
 * OrphanedEventQueue - Redis-backed queue for webhook events arriving before enrollment exists
 *
 * CRITICAL FIXES (Phase 2 Production Readiness):
 * - FIX #1: Redis persistence (no data loss on restart)
 * - FIX #2: Batch processing (no silent cycle skipping)
 * - FIX #5: Prometheus metrics (full observability)
 *
 * Purpose: When HubSpot sends events (email opens, clicks) before our enrollment
 * webhook completes, we need to queue these orphaned events and retry them.
 *
 * Retry Strategy:
 * - Attempt 1: 5 seconds delay + jitter
 * - Attempt 2: 15 seconds delay + jitter
 * - Attempt 3: 1 minute delay + jitter
 * - Attempt 4: 5 minutes delay + jitter
 * - Attempt 5: 15 minutes delay + jitter
 * - Attempt 6: 1 hour delay + jitter (final attempt)
 * - After 6 attempts: Move to Dead Letter Queue
 *
 * @see src/controllers/campaign-controller.js - orphaned event detection
 * @see test/integration/orphaned-events.test.js - queue validation
 */
class OrphanedEventQueue {
  constructor() {
    // FIX #1: Redis-backed persistence (replaces in-memory array)
    this.redis = null;
    this.redisConnected = false;
    this.processing = false;
    this.maxAttempts = 6;
    this.maxQueueSize = parseInt(process.env.ORPHANED_QUEUE_MAX_SIZE) || 10000;
    this.batchSize = parseInt(process.env.ORPHANED_QUEUE_BATCH_SIZE) || 50; // FIX #2
    this.initialized = false;

    // Redis keys
    this.queueKey = 'campaign:orphaned_events';
    this.processingKey = 'campaign:orphaned_events:processing';
    this.metricsKey = 'campaign:orphaned_events:metrics';

    // Exponential backoff delays
    this.retryDelays = [
      5000,      // 5 seconds
      15000,     // 15 seconds
      60000,     // 1 minute
      300000,    // 5 minutes
      900000,    // 15 minutes
      3600000    // 1 hour (final attempt)
    ];

    // LAZY INITIALIZATION: Don't connect Redis on import
    // Only connect when first used (prevents test pollution)
    // this._initializeRedis();

    logger.info('OrphanedEventQueue created (lazy initialization)', {
      maxAttempts: this.maxAttempts,
      maxQueueSize: this.maxQueueSize,
      batchSize: this.batchSize,
      retryDelays: this.retryDelays.map(ms => {
        if (ms < 60000) return `${ms/1000}s`;
        if (ms < 3600000) return `${ms/60000}m`;
        return `${ms/3600000}h`;
      })
    });
  }

  /**
   * Ensure Redis is initialized (lazy initialization)
   * @private
   */
  async _ensureInitialized() {
    logger.debug('[_ensureInitialized] Called', { initialized: this.initialized, redisConnected: this.redisConnected });
    if (!this.initialized) {
      logger.debug('[_ensureInitialized] Not initialized yet, calling _initializeRedis');
      await this._initializeRedis();
      this.initialized = true;
      logger.debug('[_ensureInitialized] Initialization complete', { redisConnected: this.redisConnected });
    } else {
      logger.debug('[_ensureInitialized] Already initialized, skipping', { redisConnected: this.redisConnected });
    }
  }

  /**
   * Initialize Redis connection with retry logic
   * Gracefully degrades to in-memory queue if Redis is unavailable
   * @private
   */
  async _initializeRedis() {
    // Check if Redis is explicitly disabled
    if (process.env.REDIS_DISABLED === 'true') {
      logger.info('Redis disabled via REDIS_DISABLED=true, using in-memory queue');
      this.redisConnected = false;
      this.redis = null;
      return;
    }

    try {
      const redisConfig = process.env.REDIS_URL || {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD })
      };

      this.redis = new Redis(redisConfig, {
        retryStrategy: (times) => {
          // Only retry 3 times during initial connection, then give up
          if (times > 3) {
            logger.warn('Redis connection retries exhausted, giving up');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 100, 1000);
          return delay;
        },
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 3000,
        commandTimeout: 5000
      });

      // Set up error handler IMMEDIATELY to prevent unhandled rejection
      this.redis.on('error', (error) => {
        // Log but don't crash - this handles connection errors gracefully
        if (this.redisConnected) {
          logger.error('Redis connection error', { error: error.message, code: error.code });
          metrics.counter('orphaned_queue.redis_errors', 1, { error_type: error.code || 'unknown' });
        }
        this.redisConnected = false;
      });

      // Try to connect with timeout
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout (3s)'));
        }, 3000);

        this.redis.once('ready', () => {
          clearTimeout(timeout);
          this.redisConnected = true;
          logger.info('Redis connected successfully', {
            host: this.redis.options.host,
            port: this.redis.options.port
          });
          resolve();
        });

        // Also listen for end event (connection closed before ready)
        this.redis.once('end', () => {
          clearTimeout(timeout);
          reject(new Error('Redis connection ended before ready'));
        });
      });

      // Connect and wait for ready
      await this.redis.connect().catch(() => {
        // Swallow the connect() rejection, we'll handle it via the promise
      });
      await connectionPromise;

      // Set up additional event listeners after connection established
      this.redis.on('close', () => {
        this.redisConnected = false;
        logger.warn('Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

    } catch (error) {
      logger.warn('Redis not available - OrphanedEventQueue will use in-memory fallback', {
        error: error.message,
        hint: 'Set REDIS_URL environment variable or start Redis for production persistence'
      });
      this.redisConnected = false;

      // Clean up failed Redis connection
      if (this.redis) {
        try {
          this.redis.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
        this.redis = null;
      }
      // Don't throw - gracefully degrade to in-memory queue
    }
  }

  /**
   * Add orphaned event to Redis-backed queue
   * FIX #1: Persists to Redis (survives restarts)
   * FIX #5: Adds metrics
   *
   * @param {Object} eventData - Complete webhook event payload
   * @returns {Promise<Object>} Queue entry metadata
   */
  async enqueue(eventData) {
    await this._ensureInitialized();

    if (!this.redisConnected) {
      logger.warn('Redis not connected - falling back to in-memory queue (NOT PRODUCTION SAFE)', {
        email: eventData.email,
        eventType: eventData.event_type
      });

      // Fallback to in-memory queue for testing/development
      return this._enqueueInMemory(eventData);
    }

    try {
      // Check queue size (OOM protection)
      const queueSize = await this.redis.llen(this.queueKey);

      if (queueSize >= this.maxQueueSize) {
        // Drop oldest event (FIFO)
        const oldest = await this.redis.lpop(this.queueKey);
        const oldestData = oldest ? JSON.parse(oldest) : null;

        logger.error('Queue at max capacity, dropped oldest event', {
          droppedQueueId: oldestData?.id,
          droppedEmail: oldestData?.eventData?.email,
          queueSize,
          maxQueueSize: this.maxQueueSize
        });

        // FIX #5: Metrics for dropped events
        metrics.counter('orphaned_queue.dropped_at_capacity', 1);
      }

      // Add jitter to prevent thundering herd
      const jitter = Math.floor(Math.random() * 1000);
      const firstRetryDelay = this.retryDelays[0] + jitter;

      const queueEntry = {
        eventData,
        attempts: 0,
        nextRetryAt: Date.now() + firstRetryDelay,
        queuedAt: Date.now(),
        id: `${eventData.email || 'unknown'}-${eventData.event_type}-${Date.now()}`
      };

      // Push to Redis (right side = newest)
      await this.redis.rpush(this.queueKey, JSON.stringify(queueEntry));

      // Set TTL on queue key (1 hour)
      await this.redis.expire(this.queueKey, 3600);

      logger.info('Event queued for retry (Redis)', {
        queueId: queueEntry.id,
        email: eventData.email,
        eventType: eventData.event_type,
        nextRetryAt: new Date(queueEntry.nextRetryAt).toISOString(),
        retryDelay: `${(firstRetryDelay / 1000).toFixed(1)}s`,
        queueSize: queueSize + 1
      });

      // FIX #5: Metrics
      metrics.counter('orphaned_queue.enqueued', 1, {
        event_type: eventData.event_type,
        channel: eventData.channel || 'unknown'
      });
      metrics.gauge('orphaned_queue.size', queueSize + 1);

      // Alert if queue backing up
      if (queueSize > 1000) {
        logger.warn('Orphaned event queue backing up', {
          queueSize: queueSize + 1,
          alert: 'QUEUE_BACKUP'
        });
      }

      return {
        success: true,
        queueId: queueEntry.id,
        nextRetryAt: queueEntry.nextRetryAt,
        queueSize: queueSize + 1
      };

    } catch (error) {
      logger.error('Failed to enqueue event', { error: error.message, eventData });
      metrics.counter('orphaned_queue.enqueue_errors', 1);
      throw error;
    }
  }

  /**
   * Process queue in batches (FIX #2: No silent cycle skipping)
   * FIX #5: Comprehensive metrics
   *
   * @param {Function} eventProcessor - Async function to process event
   * @returns {Promise<Object>} Processing results
   */
  async processQueue(eventProcessor) {
    await this._ensureInitialized();

    if (!this.redisConnected) {
      logger.warn('Cannot process queue: Redis not connected');
      return { skipped: true, reason: 'redis_disconnected' };
    }

    // FIX #2: Don't skip if processing - log and return
    if (this.processing) {
      const queueSize = await this.redis.llen(this.queueKey);
      const readyCount = await this._getReadyCount();

      logger.warn('Queue processing in progress, will process in next cycle', {
        queueSize,
        readyForRetry: readyCount,
        alert: 'PROCESSING_LAG'
      });

      metrics.counter('orphaned_queue.cycles_skipped', 1);
      return {
        skipped: true,
        reason: 'processing_in_progress',
        queueSize,
        readyForRetry: readyCount
      };
    }

    const startTime = Date.now();
    this.processing = true;

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      dropped: 0,
      errors: []
    };

    try {
      const queueSize = await this.redis.llen(this.queueKey);

      if (queueSize === 0) {
        return results;
      }

      // FIX #2: Process in batches (limit to this.batchSize)
      const now = Date.now();
      const allEvents = await this.redis.lrange(this.queueKey, 0, -1);

      // Filter events ready for retry
      const readyEvents = allEvents
        .map(json => JSON.parse(json))
        .filter(entry => entry.nextRetryAt <= now)
        .slice(0, this.batchSize); // Limit batch size

      if (readyEvents.length === 0) {
        return results;
      }

      logger.info('Processing orphaned event batch', {
        batchSize: readyEvents.length,
        totalQueued: queueSize,
        ready: readyEvents.length,
        maxBatchSize: this.batchSize
      });

      // Process each event
      for (const entry of readyEvents) {
        results.processed++;
        entry.attempts++;

        try {
          logger.debug('Retrying orphaned event', {
            queueId: entry.id,
            attempt: entry.attempts,
            maxAttempts: this.maxAttempts,
            email: entry.eventData.email,
            eventType: entry.eventData.event_type
          });

          // Call the event processor
          await eventProcessor(entry.eventData);

          // Success - remove from Redis
          await this._removeFromQueue(entry.id);
          results.succeeded++;

          logger.info('Orphaned event successfully processed', {
            queueId: entry.id,
            attempt: entry.attempts,
            timeInQueue: `${((now - entry.queuedAt) / 1000).toFixed(1)}s`,
            email: entry.eventData.email,
            eventType: entry.eventData.event_type
          });

          // FIX #5: Metrics
          metrics.counter('orphaned_queue.succeeded', 1);
          metrics.histogram('orphaned_queue.retry_attempts', entry.attempts);

        } catch (error) {
          // Check if max attempts exceeded
          if (entry.attempts >= this.maxAttempts) {
            // Move to Dead Letter Queue (FIX #6 will implement this)
            await this._moveToDeadLetterQueue(entry, error);
            await this._removeFromQueue(entry.id);
            results.dropped++;

            logger.error('Event dropped after max retries', {
              queueId: entry.id,
              attempts: entry.attempts,
              maxAttempts: this.maxAttempts,
              timeInQueue: `${((now - entry.queuedAt) / 1000).toFixed(1)}s`,
              email: entry.eventData.email,
              eventType: entry.eventData.event_type,
              error: error.message
            });

            results.errors.push({
              queueId: entry.id,
              error: error.message,
              dropped: true
            });

            // FIX #5: Metrics
            metrics.counter('orphaned_queue.dropped', 1);

          } else {
            // Schedule next retry with exponential backoff + jitter
            const baseDelay = this.retryDelays[entry.attempts] || this.retryDelays[this.retryDelays.length - 1];
            const jitter = Math.floor(Math.random() * 1000);
            const nextDelay = baseDelay + jitter;
            entry.nextRetryAt = now + nextDelay;
            results.failed++;

            // Update entry in Redis
            await this._updateInQueue(entry);

            logger.warn('Event retry failed, scheduling next attempt', {
              queueId: entry.id,
              attempt: entry.attempts,
              maxAttempts: this.maxAttempts,
              nextRetryIn: `${(nextDelay / 1000).toFixed(1)}s`,
              nextRetryAt: new Date(entry.nextRetryAt).toISOString(),
              error: error.message
            });

            results.errors.push({
              queueId: entry.id,
              error: error.message,
              willRetry: true,
              nextRetryAt: entry.nextRetryAt
            });

            // FIX #5: Metrics
            metrics.counter('orphaned_queue.failed', 1);
          }
        }
      }

      const processingTime = Date.now() - startTime;

      logger.info('Queue processing complete', {
        ...results,
        queueSize: await this.redis.llen(this.queueKey),
        processingTime: `${processingTime}ms`
      });

      // FIX #5: Metrics
      metrics.counter('orphaned_queue.processed', results.processed);
      metrics.histogram('orphaned_queue.processing_time_ms', processingTime);
      metrics.gauge('orphaned_queue.size', await this.redis.llen(this.queueKey));

    } catch (error) {
      logger.error('Error during queue processing', { error: error.message });
      metrics.counter('orphaned_queue.processing_errors', 1);
      throw error;
    } finally {
      this.processing = false;
    }

    return results;
  }

  /**
   * Helper: Remove event from queue by ID
   * @private
   */
  async _removeFromQueue(queueId) {
    const allEvents = await this.redis.lrange(this.queueKey, 0, -1);

    for (let i = 0; i < allEvents.length; i++) {
      const entry = JSON.parse(allEvents[i]);
      if (entry.id === queueId) {
        // Remove by value (LREM removes count occurrences of value)
        await this.redis.lrem(this.queueKey, 1, allEvents[i]);
        return true;
      }
    }
    return false;
  }

  /**
   * Helper: Update event in queue
   * @private
   */
  async _updateInQueue(updatedEntry) {
    const allEvents = await this.redis.lrange(this.queueKey, 0, -1);

    for (let i = 0; i < allEvents.length; i++) {
      const entry = JSON.parse(allEvents[i]);
      if (entry.id === updatedEntry.id) {
        // Update by removing old and adding new
        await this.redis.lrem(this.queueKey, 1, allEvents[i]);
        await this.redis.rpush(this.queueKey, JSON.stringify(updatedEntry));
        return true;
      }
    }
    return false;
  }

  /**
   * Helper: Get count of events ready for retry
   * @private
   */
  async _getReadyCount() {
    const now = Date.now();
    const allEvents = await this.redis.lrange(this.queueKey, 0, -1);

    return allEvents
      .map(json => JSON.parse(json))
      .filter(entry => entry.nextRetryAt <= now)
      .length;
  }

  /**
   * Move event to Dead Letter Queue (FIX #6: Database-backed DLQ)
   * @private
   */
  async _moveToDeadLetterQueue(entry, error) {
    try {
      // Import DeadLetterEvent model dynamically to avoid circular dependencies
      const { DeadLetterEvent } = await import('../models/index.js');

      // Create database record
      const dlqRecord = await DeadLetterEvent.create({
        event_data: entry.eventData,
        failure_reason: error.message,
        attempts: entry.attempts,
        first_attempted_at: new Date(entry.queuedAt),
        last_attempted_at: new Date(),
        status: 'failed',
        event_type: entry.eventData.event_type,
        channel: entry.eventData.channel,
        email: entry.eventData.email,
        user_id: entry.eventData.user_id
      });

      // Also store in Redis for fast access (7 day TTL)
      const dlqKey = 'campaign:dead_letter_queue';
      const dlqEntry = {
        ...entry,
        dlqId: dlqRecord.id,
        failedAt: Date.now(),
        error: error.message,
        status: 'failed'
      };

      await this.redis.rpush(dlqKey, JSON.stringify(dlqEntry));
      await this.redis.expire(dlqKey, 86400 * 7); // 7 day TTL

      logger.info('Event moved to Dead Letter Queue', {
        queueId: entry.id,
        dlqId: dlqRecord.id,
        email: entry.eventData.email,
        eventType: entry.eventData.event_type,
        attempts: entry.attempts,
        failureReason: error.message
      });

      metrics.counter('orphaned_queue.moved_to_dlq', 1, {
        event_type: entry.eventData.event_type,
        channel: entry.eventData.channel || 'unknown'
      });

    } catch (dlqError) {
      logger.error('Failed to move event to DLQ', {
        queueId: entry.id,
        error: dlqError.message,
        originalError: error.message
      });

      // FIX #5: Metrics for DLQ errors
      metrics.counter('orphaned_queue.dlq_errors', 1);
    }
  }

  /**
   * Get current queue status (for monitoring/health checks)
   * FIX #5: Enhanced with metrics
   *
   * @returns {Promise<Object>} Queue metrics
   */
  async getStatus() {
    logger.debug('[getStatus] Start', { initialized: this.initialized, redisConnected: this.redisConnected });
    try {
      await this._ensureInitialized();
    } catch (error) {
      logger.error('Failed to initialize Redis for health check', { error: error.message });
      return {
        healthy: false,
        error: `Initialization failed: ${error.message}`
      };
    }

    logger.debug('[getStatus] After _ensureInitialized', { initialized: this.initialized, redisConnected: this.redisConnected });

    if (!this.redisConnected) {
      logger.warn('[getStatus] Redis not connected!', { initialized: this.initialized, redisConnected: this.redisConnected });
      return {
        healthy: false,
        error: 'Redis not connected'
      };
    }

    logger.debug('[getStatus] Redis is connected, proceeding with status check');

    try {
      const now = Date.now();
      const queueSize = await this.redis.llen(this.queueKey);
      const allEvents = await this.redis.lrange(this.queueKey, 0, -1);
      const parsedEvents = allEvents.map(json => JSON.parse(json));

      const readyForRetry = parsedEvents.filter(e => e.nextRetryAt <= now).length;
      const staleEvents = parsedEvents.filter(e => now - e.queuedAt > 3600000); // >1 hour

      const byAttempts = {
        attempt1: parsedEvents.filter(e => e.attempts === 1).length,
        attempt2: parsedEvents.filter(e => e.attempts === 2).length,
        attempt3: parsedEvents.filter(e => e.attempts === 3).length,
        attempt4: parsedEvents.filter(e => e.attempts === 4).length,
        attempt5: parsedEvents.filter(e => e.attempts === 5).length,
        attempt6: parsedEvents.filter(e => e.attempts === 6).length
      };

      const oldestEvent = parsedEvents.length > 0
        ? new Date(Math.min(...parsedEvents.map(e => e.queuedAt))).toISOString()
        : null;

      const healthy = staleEvents.length === 0 && queueSize < 5000;

      const result = {
        healthy,
        queueSize,
        processing: this.processing,
        readyForRetry,
        staleEvents: staleEvents.length,
        byAttempts,
        oldestEvent,
        redisConnected: this.redisConnected,
        maxQueueSize: this.maxQueueSize,
        batchSize: this.batchSize
      };

      logger.debug('[getStatus] Returning success result', { healthy, queueSize, redisConnected: this.redisConnected });
      return result;

    } catch (error) {
      logger.error('[getStatus] Exception in try block', { error: error.message, stack: error.stack });
      const errorResult = {
        healthy: false,
        error: error.message
      };
      logger.debug('[getStatus] Returning error result', errorResult);
      return errorResult;
    }
  }

  /**
   * Drain queue for graceful shutdown (FIX #4)
   * Process all ready events within timeout period
   *
   * @param {Function} eventProcessor - Event processing function
   * @param {number} maxDrainTime - Maximum time to drain (ms)
   * @returns {Promise<Object>} Drain results
   */
  async drainQueue(eventProcessor, maxDrainTime = 30000) {
    logger.info('Starting queue drain for graceful shutdown', {
      maxDrainTime: `${maxDrainTime / 1000}s`
    });

    const startTime = Date.now();
    let totalProcessed = 0;
    let drainAttempts = 0;
    const maxDrainAttempts = 5;

    try {
      while (drainAttempts < maxDrainAttempts) {
        const elapsed = Date.now() - startTime;

        if (elapsed >= maxDrainTime) {
          logger.warn('Drain timeout reached', {
            elapsed: `${elapsed / 1000}s`,
            maxDrainTime: `${maxDrainTime / 1000}s`,
            totalProcessed
          });
          break;
        }

        const queueSize = await this.redis.llen(this.queueKey);
        if (queueSize === 0) {
          logger.info('Queue fully drained', { totalProcessed });
          break;
        }

        // Process batch
        const results = await this.processQueue(eventProcessor);
        totalProcessed += results.processed;
        drainAttempts++;

        logger.info('Drain cycle complete', {
          attempt: drainAttempts,
          processed: results.processed,
          remaining: await this.redis.llen(this.queueKey)
        });

        // Small delay between drain cycles
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const remainingSize = await this.redis.llen(this.queueKey);

      if (remainingSize > 0) {
        logger.warn('Events remaining in queue after drain', {
          count: remainingSize,
          totalProcessed,
          drainAttempts
        });
      }

      return {
        success: remainingSize === 0,
        totalProcessed,
        remaining: remainingSize,
        drainAttempts,
        elapsedTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Error during queue drain', { error: error.message });
      throw error;
    }
  }

  /**
   * Clear queue (for testing only)
   */
  async clear() {
    if (!this.redisConnected) {
      logger.warn('Cannot clear queue: Redis not connected');
      return { cleared: 0 };
    }

    const size = await this.redis.llen(this.queueKey);
    await this.redis.del(this.queueKey);
    logger.warn('Queue cleared', { eventsCleared: size });
    return { cleared: size };
  }

  /**
   * Disconnect Redis (for graceful shutdown and test cleanup)
   * Removes all event listeners to prevent memory leaks
   */
  async disconnect() {
    if (this.redis) {
      try {
        // Remove all event listeners to prevent "Cannot log after tests are done" errors
        this.redis.removeAllListeners('connect');
        this.redis.removeAllListeners('error');
        this.redis.removeAllListeners('close');
        this.redis.removeAllListeners('reconnecting');

        // Disconnect Redis connection
        await this.redis.quit();

        // Reset state
        this.redis = null;
        this.redisConnected = false;
        this.initialized = false;

        logger.info('Redis connection closed gracefully');
      } catch (error) {
        logger.warn('Error during Redis disconnect', { error: error.message });

        // Force disconnect if quit() fails
        if (this.redis) {
          this.redis.disconnect();
          this.redis = null;
          this.redisConnected = false;
          this.initialized = false;
        }
      }
    }
  }

  /**
   * In-memory fallback queue (for testing/development when Redis unavailable)
   * @private
   */
  _enqueueInMemory(eventData) {
    // Initialize in-memory fallback if needed
    if (!this.memoryQueue) {
      this.memoryQueue = [];
      logger.warn('Initialized in-memory fallback queue (NOT PRODUCTION SAFE)');
    }

    // Check size limit
    if (this.memoryQueue.length >= this.maxQueueSize) {
      const oldest = this.memoryQueue.shift();
      logger.error('Memory queue at max capacity, dropped oldest event', {
        droppedEmail: oldest.eventData.email
      });
    }

    const jitter = Math.floor(Math.random() * 1000);
    const firstRetryDelay = this.retryDelays[0] + jitter;

    const queueEntry = {
      eventData,
      attempts: 0,
      nextRetryAt: Date.now() + firstRetryDelay,
      queuedAt: Date.now(),
      id: `${eventData.email || 'unknown'}-${eventData.event_type}-${Date.now()}`
    };

    this.memoryQueue.push(queueEntry);

    logger.info('Event queued for retry (in-memory fallback)', {
      queueId: queueEntry.id,
      email: eventData.email,
      eventType: eventData.event_type,
      queueSize: this.memoryQueue.length
    });

    return {
      success: true,
      queueId: queueEntry.id,
      nextRetryAt: queueEntry.nextRetryAt,
      queueSize: this.memoryQueue.length,
      fallback: true
    };
  }
}

// Singleton instance
const orphanedEventQueue = new OrphanedEventQueue();

export default orphanedEventQueue;
