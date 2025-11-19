/**
 * Provider Error Classes
 * Standardized error hierarchy for all provider operations
 */

/**
 * Base error for all provider errors
 */
export class ProviderError extends Error {
  constructor(message, provider, originalError = null) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
    this.originalError = originalError;
    this.timestamp = new Date();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      provider: this.provider,
      timestamp: this.timestamp,
      stack: this.stack,
      originalError: this.originalError?.message
    };
  }
}

/**
 * Configuration error - invalid API keys, missing config
 */
export class ProviderConfigError extends ProviderError {
  constructor(message, provider, missingConfig = []) {
    super(message, provider);
    this.name = 'ProviderConfigError';
    this.missingConfig = missingConfig;
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends ProviderError {
  constructor(message, provider, limit, resetAt) {
    super(message, provider);
    this.name = 'RateLimitError';
    this.limit = limit;
    this.resetAt = resetAt;
  }
}

/**
 * Webhook verification failed
 */
export class WebhookVerificationError extends ProviderError {
  constructor(message, provider) {
    super(message, provider);
    this.name = 'WebhookVerificationError';
  }
}

/**
 * API request failed
 */
export class ProviderApiError extends ProviderError {
  constructor(message, provider, statusCode, responseBody) {
    super(message, provider);
    this.name = 'ProviderApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/**
 * Validation error - invalid input parameters
 */
export class ProviderValidationError extends ProviderError {
  constructor(message, provider, validationErrors = []) {
    super(message, provider);
    this.name = 'ProviderValidationError';
    this.validationErrors = validationErrors;
  }
}

/**
 * Quota exceeded error - video credits, email quota, etc.
 */
export class QuotaExceededError extends ProviderError {
  constructor(message, provider, quotaType, remaining, total) {
    super(message, provider);
    this.name = 'QuotaExceededError';
    this.quotaType = quotaType;
    this.remaining = remaining;
    this.total = total;
  }
}

/**
 * Timeout error - operation took too long
 */
export class ProviderTimeoutError extends ProviderError {
  constructor(message, provider, timeoutMs) {
    super(message, provider);
    this.name = 'ProviderTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export default {
  ProviderError,
  ProviderConfigError,
  RateLimitError,
  WebhookVerificationError,
  ProviderApiError,
  ProviderValidationError,
  QuotaExceededError,
  ProviderTimeoutError
};
