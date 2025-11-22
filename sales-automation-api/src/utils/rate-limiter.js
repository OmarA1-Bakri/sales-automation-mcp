/**
 * Rate Limiter
 * Manages API rate limits with token bucket algorithm
 */

import Bottleneck from 'bottleneck';

export class RateLimiter {
  constructor() {
    this.limiters = new Map();

    // Default rate limits for each API
    this.configs = {
      hubspot: {
        maxConcurrent: 10,
        minTime: 100, // 100ms between requests (10 req/sec)
        reservoir: 100, // Initial tokens
        reservoirRefreshAmount: 100,
        reservoirRefreshInterval: 10 * 1000, // Refill every 10 seconds
      },
      explorium: {
        maxConcurrent: 5,
        minTime: 200, // 5 req/sec
        reservoir: 50,
        reservoirRefreshAmount: 50,
        reservoirRefreshInterval: 10 * 1000,
      },
      lemlist: {
        maxConcurrent: 3,
        minTime: 500, // 2 req/sec
        reservoir: 20,
        reservoirRefreshAmount: 20,
        reservoirRefreshInterval: 10 * 1000,
      },
      apollo: {
        maxConcurrent: 5,
        minTime: 200, // 5 req/sec
        reservoir: 50,
        reservoirRefreshAmount: 50,
        reservoirRefreshInterval: 60 * 1000, // Per minute
      },
      linkedin: {
        maxConcurrent: 1,
        minTime: 2000, // Very conservative: 1 req every 2 sec
        reservoir: 30,
        reservoirRefreshAmount: 30,
        reservoirRefreshInterval: 60 * 1000,
      },
    };

    this.initialize();
  }

  initialize() {
    // Create Bottleneck limiters for each API
    for (const [api, config] of Object.entries(this.configs)) {
      this.limiters.set(api, new Bottleneck(config));

      // Add event listeners for monitoring
      const limiter = this.limiters.get(api);

      limiter.on('failed', (error, jobInfo) => {
        console.error(`${api} rate limiter: Request failed`, error);

        // Retry with exponential backoff for rate limit errors
        if (error.statusCode === 429) {
          const retryAfter = error.retryAfter || 60000; // Default 60s
          console.log(`${api}: Rate limited, retrying after ${retryAfter}ms`);
          return retryAfter;
        }
      });

      limiter.on('retry', (error, jobInfo) => {
        console.log(`${api}: Retrying request (attempt ${jobInfo.retryCount + 1})`);
      });

      limiter.on('depleted', () => {
        console.warn(`${api}: Rate limit reservoir depleted, throttling requests`);
      });
    }
  }

  /**
   * Schedule a request through the rate limiter
   */
  async schedule(api, fn, priority = 5) {
    const limiter = this.limiters.get(api);

    if (!limiter) {
      throw new Error(`Unknown API: ${api}`);
    }

    return limiter.schedule({ priority }, fn);
  }

  /**
   * Wrap an async function with rate limiting
   */
  wrap(api, fn) {
    const limiter = this.limiters.get(api);

    if (!limiter) {
      throw new Error(`Unknown API: ${api}`);
    }

    return limiter.wrap(fn);
  }

  /**
   * Get current rate limit status
   */
  async getStatus(api) {
    const limiter = this.limiters.get(api);

    if (!limiter) {
      return null;
    }

    const counts = await limiter.counts();

    return {
      api,
      running: counts.RUNNING,
      queued: counts.QUEUED,
      reservoir: counts.RESERVOIR,
      config: this.configs[api],
    };
  }

  /**
   * Get status for all APIs
   */
  async getAllStatus() {
    const status = {};

    for (const api of this.limiters.keys()) {
      status[api] = await this.getStatus(api);
    }

    return status;
  }

  /**
   * Update rate limit configuration for an API
   */
  updateConfig(api, newConfig) {
    if (!this.limiters.has(api)) {
      throw new Error(`Unknown API: ${api}`);
    }

    // Merge with existing config
    this.configs[api] = { ...this.configs[api], ...newConfig };

    // Recreate limiter with new config
    const oldLimiter = this.limiters.get(api);
    oldLimiter.disconnect();

    const newLimiter = new Bottleneck(this.configs[api]);
    this.limiters.set(api, newLimiter);

    console.log(`${api}: Rate limit config updated`, this.configs[api]);
  }

  /**
   * Pause rate limiting for an API (for maintenance)
   */
  async pause(api) {
    const limiter = this.limiters.get(api);

    if (limiter) {
      await limiter.stop({ dropWaitingJobs: false });
      console.log(`${api}: Rate limiter paused`);
    }
  }

  /**
   * Resume rate limiting for an API
   */
  resume(api) {
    const limiter = this.limiters.get(api);

    if (limiter) {
      limiter.start();
      console.log(`${api}: Rate limiter resumed`);
    }
  }

  /**
   * Disconnect all rate limiters (cleanup)
   */
  async disconnect() {
    for (const limiter of this.limiters.values()) {
      await limiter.disconnect();
    }
  }
}
