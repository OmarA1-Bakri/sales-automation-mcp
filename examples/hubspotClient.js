/**
 * HubSpot API Client with Circuit Breaker Protection
 *
 * Features:
 * - Circuit breaker pattern for resilience
 * - Automatic retry with exponential backoff
 * - Redis caching for GET requests
 * - Rate limit handling (429 responses)
 * - Comprehensive error handling
 * - Request/response logging
 */

const axios = require('axios');
const axiosRetry = require('axios-retry');
const circuitBreakerFactory = require('./circuitBreakerFactory');
const Redis = require('ioredis');

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (err) => {
  console.error('[HubSpot] Redis error:', err);
});

// Create axios instance for HubSpot
const hubspotAxios = axios.create({
  baseURL: 'https://api.hubspot.com/crm/v3',
  timeout: 8000, // 8s timeout (less than circuit breaker timeout)
  headers: {
    'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Configure automatic retry with exponential backoff
axiosRetry(hubspotAxios, {
  retries: 5, // 5 retry attempts
  retryDelay: (retryCount) => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return Math.pow(2, retryCount - 1) * 1000;
  },
  retryCondition: (error) => {
    // Retry on network errors and 5xx server errors
    // Do NOT retry on rate limits (429) - handle separately
    const isRetryable =
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status >= 500 && error.response?.status < 600);

    const isNotRateLimit = error.response?.status !== 429;

    return isRetryable && isNotRateLimit;
  },
  shouldResetTimeout: true, // Reset timeout between retries
  onRetry: (retryCount, error, requestConfig) => {
    console.log(
      `[HubSpot] Retry attempt ${retryCount}/5 for ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`
    );
  }
});

// Add request interceptor for logging
hubspotAxios.interceptors.request.use(
  (config) => {
    console.log(`[HubSpot] Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for logging and rate limit handling
hubspotAxios.interceptors.response.use(
  (response) => {
    console.log(`[HubSpot] Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response?.status === 429) {
      // Rate limit hit - log and include retry-after header
      const retryAfter = error.response.headers['retry-after'] || 'unknown';
      console.warn(`[HubSpot] Rate limit hit (429). Retry after: ${retryAfter}s`);

      // Add retry-after to error for potential queue handling
      error.retryAfter = retryAfter;
    }

    return Promise.reject(error);
  }
);

/**
 * Core request function with caching
 * This is wrapped by the circuit breaker
 *
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
 * @param {string} endpoint - API endpoint (relative to base URL)
 * @param {Object|null} data - Request body data
 * @returns {Promise<Object>} API response data
 */
async function makeHubSpotRequest(method, endpoint, data = null) {
  const cacheKey = `hubspot:${method}:${endpoint}:${JSON.stringify(data || {})}`;

  // Try cache for GET requests
  if (method === 'GET') {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`[HubSpot] Cache hit for ${endpoint}`);
        const parsedCache = JSON.parse(cached);
        return {
          ...parsedCache,
          _cached: true,
          _cacheTimestamp: Date.now()
        };
      }
    } catch (cacheError) {
      console.warn('[HubSpot] Cache read error:', cacheError.message);
      // Continue with API request if cache fails
    }
  }

  // Make API request (with automatic retry via axios-retry)
  try {
    const response = await hubspotAxios.request({
      method,
      url: endpoint,
      data
    });

    // Cache successful GET responses
    if (method === 'GET' && response.data) {
      try {
        await redis.setex(
          cacheKey,
          300, // 5 minute cache TTL
          JSON.stringify(response.data)
        );
      } catch (cacheError) {
        console.warn('[HubSpot] Cache write error:', cacheError.message);
        // Don't fail the request if caching fails
      }
    }

    return response.data;

  } catch (error) {
    // Enhance error with additional context
    const enhancedError = new Error(
      `HubSpot API error: ${error.message}`
    );
    enhancedError.originalError = error;
    enhancedError.statusCode = error.response?.status;
    enhancedError.endpoint = endpoint;
    enhancedError.method = method;

    throw enhancedError;
  }
}

// Create circuit breaker wrapping the request function
const hubspotBreaker = circuitBreakerFactory.createForService(
  'hubspot',
  makeHubSpotRequest
);

/**
 * Fallback function - returns cached data or throws error
 * Executed when circuit is OPEN
 */
hubspotBreaker.fallback(async (method, endpoint, data) => {
  console.log(`[HubSpot] Circuit OPEN - attempting cache fallback for ${method} ${endpoint}`);

  // Only return cache for GET requests
  if (method === 'GET') {
    const cacheKey = `hubspot:${method}:${endpoint}:${JSON.stringify(data || {})}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        return {
          ...parsedCache,
          _fallback: true,
          _cached: true,
          _timestamp: Date.now()
        };
      }
    } catch (cacheError) {
      console.error('[HubSpot] Cache fallback error:', cacheError.message);
    }
  }

  // No cache available or non-GET request
  const error = new Error('HubSpot service temporarily unavailable');
  error.code = 'SERVICE_UNAVAILABLE';
  error.statusCode = 503;
  error.retryAfter = 30; // seconds

  throw error;
});

/**
 * HubSpot Client Class
 * Public API for interacting with HubSpot CRM
 */
class HubSpotClient {
  /**
   * Get a contact by ID
   *
   * @param {string} contactId - HubSpot contact ID
   * @param {Array<string>} properties - Optional array of properties to retrieve
   * @returns {Promise<Object>} Contact data
   */
  async getContact(contactId, properties = []) {
    const endpoint = `/objects/contacts/${contactId}`;
    const queryString = properties.length > 0
      ? `?properties=${properties.join(',')}`
      : '';

    return hubspotBreaker.fire('GET', endpoint + queryString);
  }

  /**
   * Search for contacts
   *
   * @param {Object} searchQuery - HubSpot search query object
   * @returns {Promise<Object>} Search results
   */
  async searchContacts(searchQuery) {
    return hubspotBreaker.fire('POST', '/objects/contacts/search', searchQuery);
  }

  /**
   * Create a new contact
   *
   * @param {Object} contactData - Contact properties
   * @returns {Promise<Object>} Created contact data
   */
  async createContact(contactData) {
    return hubspotBreaker.fire('POST', '/objects/contacts', {
      properties: contactData
    });
  }

  /**
   * Update an existing contact
   *
   * @param {string} contactId - HubSpot contact ID
   * @param {Object} updates - Properties to update
   * @returns {Promise<Object>} Updated contact data
   */
  async updateContact(contactId, updates) {
    return hubspotBreaker.fire('PATCH', `/objects/contacts/${contactId}`, {
      properties: updates
    });
  }

  /**
   * Delete a contact
   *
   * @param {string} contactId - HubSpot contact ID
   * @returns {Promise<void>}
   */
  async deleteContact(contactId) {
    return hubspotBreaker.fire('DELETE', `/objects/contacts/${contactId}`);
  }

  /**
   * Batch create contacts
   *
   * @param {Array<Object>} contacts - Array of contact data objects
   * @returns {Promise<Object>} Batch operation results
   */
  async batchCreateContacts(contacts) {
    const inputs = contacts.map(contact => ({ properties: contact }));
    return hubspotBreaker.fire('POST', '/objects/contacts/batch/create', { inputs });
  }

  /**
   * Get circuit breaker state and statistics
   *
   * @returns {Object} Circuit state information
   */
  getCircuitState() {
    const stats = hubspotBreaker.stats;

    return {
      name: 'hubspot',
      state: hubspotBreaker.opened
        ? 'OPEN'
        : (hubspotBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED'),
      enabled: hubspotBreaker.enabled,
      stats: {
        fires: stats.fires,
        successes: stats.successes,
        failures: stats.failures,
        timeouts: stats.timeouts,
        rejects: stats.rejects,
        fallbacks: stats.fallbacks,
        cacheHits: stats.cacheHits || 0,
        cacheMisses: stats.cacheMisses || 0
      },
      metrics: {
        successRate: stats.fires > 0
          ? (stats.successes / stats.fires * 100).toFixed(2) + '%'
          : '0%',
        errorRate: stats.fires > 0
          ? ((stats.failures + stats.timeouts) / stats.fires * 100).toFixed(2) + '%'
          : '0%',
        cacheHitRate: (stats.cacheHits + stats.cacheMisses) > 0
          ? (stats.cacheHits / (stats.cacheHits + stats.cacheMisses) * 100).toFixed(2) + '%'
          : 'N/A'
      }
    };
  }

  /**
   * Manually reset the circuit breaker
   * Use only for testing or emergency recovery
   */
  resetCircuit() {
    if (hubspotBreaker.opened || hubspotBreaker.halfOpen) {
      hubspotBreaker.close();
      console.log('[HubSpot] Circuit manually reset to CLOSED');
    }
  }

  /**
   * Clear Redis cache for HubSpot
   */
  async clearCache() {
    const pattern = 'hubspot:*';
    const stream = redis.scanStream({ match: pattern, count: 100 });

    let deletedCount = 0;

    stream.on('data', async (keys) => {
      if (keys.length > 0) {
        await redis.del(...keys);
        deletedCount += keys.length;
      }
    });

    stream.on('end', () => {
      console.log(`[HubSpot] Cleared ${deletedCount} cache entries`);
    });
  }
}

// Export singleton instance
module.exports = new HubSpotClient();
