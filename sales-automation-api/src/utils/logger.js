/**
 * Secure Logger Utility - Sales Automation API
 *
 * Centralized logging with automatic sanitization of sensitive data.
 * Prevents API keys, tokens, passwords, and PII from appearing in logs.
 */

/**
 * Sensitive field patterns to redact from logs
 * Matches common sensitive field names and patterns
 */
const SENSITIVE_PATTERNS = [
  // API Keys and Tokens
  /api[_-]?key/i,
  /access[_-]?token/i,
  /auth[_-]?token/i,
  /bearer[_-]?token/i,
  /secret/i,
  /private[_-]?key/i,

  // Authentication
  /password/i,
  /passwd/i,
  /pwd/i,
  /authorization/i,
  /x-api-key/i,

  // Personal Information
  /ssn/i,
  /social[_-]?security/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /pin/i,

  // HubSpot/CRM specific
  /hubspot[_-]?api[_-]?key/i,
  /lemlist[_-]?api[_-]?key/i,
  /explorium[_-]?api[_-]?key/i,
  /linkedin[_-]?api[_-]?key/i,
  /apollo[_-]?api[_-]?key/i,

  // PII Field Names (SECURITY FIX: Phase 2, T2.4)
  /email/i,
  /phone/i,
  /mobile/i,
  /first[_-]?name/i,
  /last[_-]?name/i,
  /full[_-]?name/i,
  /address/i,
  /street/i,
  /city/i,
  /zip/i,
  /postal/i,
  /date[_-]?of[_-]?birth/i,
  /dob/i,
];

/**
 * Patterns to detect sensitive values in strings
 * Matches common API key/token formats and PII (email, phone, names)
 */
const SENSITIVE_VALUE_PATTERNS = [
  // API keys starting with sk_live_, sk_test_, etc.
  /sk_[a-zA-Z0-9_-]{20,}/g,

  // Bearer tokens
  /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,

  // Generic long alphanumeric tokens (likely API keys)
  /\b[a-zA-Z0-9]{32,}\b/g,

  // JWT tokens (three base64 segments separated by dots)
  /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,

  // PII - Email addresses (SECURITY FIX: Phase 2, T2.4)
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // PII - Phone numbers (various formats)
  /\+?[1-9]\d{0,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // PII - SSN format (US)
  /\b\d{3}-\d{2}-\d{4}\b/g,

  // PII - Credit card numbers (13-19 digits, with optional separators)
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4,7}\b/g,
];

/**
 * Check if a field name is sensitive
 *
 * @param {string} key - Field name to check
 * @returns {boolean} True if field is sensitive
 */
function isSensitiveField(key) {
  if (typeof key !== 'string') return false;
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Sanitize a string value by redacting sensitive patterns
 *
 * @param {string} value - String value to sanitize
 * @returns {string} Sanitized string with redacted sensitive data
 */
function sanitizeStringValue(value) {
  if (typeof value !== 'string') return value;

  let sanitized = value;

  // Replace sensitive value patterns
  SENSITIVE_VALUE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  return sanitized;
}

/**
 * Recursively sanitize an object by redacting sensitive fields
 *
 * @param {any} data - Data to sanitize (object, array, primitive)
 * @returns {any} Sanitized data with sensitive fields redacted
 */
function sanitize(data) {
  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitives
  if (typeof data !== 'object') {
    return typeof data === 'string' ? sanitizeStringValue(data) : data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitize(item));
  }

  // Handle objects
  const sanitized = {};

  for (const [key, value] of Object.entries(data)) {
    // Redact sensitive fields
    if (isSensitiveField(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitize(value);
    } else if (typeof value === 'string') {
      // Sanitize string values for embedded sensitive data
      sanitized[key] = sanitizeStringValue(value);
    } else {
      // Keep primitive values as-is
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Format log message with timestamp and component prefix
 *
 * @param {string} component - Component name (e.g., 'Auth', 'API', 'Worker')
 * @param {string} message - Log message
 * @returns {string} Formatted log message
 */
function formatMessage(component, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${component}] ${message}`;
}

/**
 * Secure logger class with sanitization
 */
class Logger {
  constructor(component = 'App') {
    this.component = component;
  }

  /**
   * Log info message with sanitization
   *
   * @param {string} message - Log message
   * @param {object} data - Optional data to log (will be sanitized)
   */
  info(message, data = null) {
    const formattedMessage = formatMessage(this.component, message);

    if (data) {
      const sanitizedData = sanitize(data);
      console.log(formattedMessage, sanitizedData);
    } else {
      console.log(formattedMessage);
    }
  }

  /**
   * Log warning message with sanitization
   *
   * @param {string} message - Warning message
   * @param {object} data - Optional data to log (will be sanitized)
   */
  warn(message, data = null) {
    const formattedMessage = formatMessage(this.component, message);

    if (data) {
      const sanitizedData = sanitize(data);
      console.warn(formattedMessage, sanitizedData);
    } else {
      console.warn(formattedMessage);
    }
  }

  /**
   * Log error message with sanitization
   *
   * @param {string} message - Error message
   * @param {Error|object} error - Error object or data (will be sanitized)
   */
  error(message, error = null) {
    const formattedMessage = formatMessage(this.component, message);

    if (error) {
      // Special handling for Error objects
      if (error instanceof Error) {
        const errorInfo = {
          message: error.message,
          stack: error.stack,
          ...error,
        };
        const sanitizedError = sanitize(errorInfo);
        console.error(formattedMessage, sanitizedError);
      } else {
        const sanitizedData = sanitize(error);
        console.error(formattedMessage, sanitizedData);
      }
    } else {
      console.error(formattedMessage);
    }
  }

  /**
   * Log debug message (only in development)
   *
   * @param {string} message - Debug message
   * @param {object} data - Optional data to log (will be sanitized)
   */
  debug(message, data = null) {
    if (process.env.NODE_ENV !== 'production') {
      const formattedMessage = formatMessage(this.component, `[DEBUG] ${message}`);

      if (data) {
        const sanitizedData = sanitize(data);
        console.log(formattedMessage, sanitizedData);
      } else {
        console.log(formattedMessage);
      }
    }
  }
}

/**
 * Create a logger instance for a component
 *
 * @param {string} component - Component name
 * @returns {Logger} Logger instance
 */
export function createLogger(component) {
  return new Logger(component);
}

/**
 * Sanitize data for logging (export for external use)
 *
 * @param {any} data - Data to sanitize
 * @returns {any} Sanitized data
 */
export { sanitize };

/**
 * Default logger instance
 */
export const logger = new Logger('App');

export default logger;
