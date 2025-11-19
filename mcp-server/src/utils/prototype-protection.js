/**
 * Prototype Pollution Protection
 *
 * Prevents malicious object manipulation via __proto__, constructor, and prototype
 */

/**
 * Dangerous keys that can be used for prototype pollution
 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Check if a key is dangerous for prototype pollution
 *
 * @param {string} key - Key to check
 * @returns {boolean} True if key is dangerous
 */
export function isDangerousKey(key) {
  return DANGEROUS_KEYS.includes(key);
}

/**
 * Sanitize an object by removing dangerous keys recursively
 *
 * @param {any} obj - Object to sanitize
 * @returns {any} Sanitized object
 */
export function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  // Handle objects
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip dangerous keys
    if (isDangerousKey(key)) {
      console.warn(`[PrototypePollution] Blocked dangerous key: ${key}`);
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Safe JSON.parse with prototype pollution protection
 *
 * @param {string} jsonString - JSON string to parse
 * @returns {any} Parsed object (sanitized)
 * @throws {SyntaxError} If JSON is invalid
 */
export function safeJsonParse(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    return sanitizeObject(parsed);
  } catch (error) {
    throw new SyntaxError(`Invalid JSON: ${error.message}`);
  }
}

/**
 * Freeze important objects to prevent mutation
 * Call this at application startup
 *
 * NOTE: Freezing prototypes can break some libraries that modify them.
 * Use middleware validation instead for production environments.
 */
export function freezeBuiltins() {
  // DISABLED: Freezing prototypes breaks HubSpot/Lemlist clients
  // Instead, rely on prototypePollutionMiddleware to validate incoming data
  console.log('[PrototypePollution] Middleware protection enabled (prototype freezing disabled for compatibility)');
}

/**
 * Validate object doesn't contain prototype pollution attempts
 *
 * @param {any} obj - Object to validate
 * @throws {Error} If dangerous keys found
 */
export function validateNoPollution(obj) {
  if (obj === null || typeof obj !== 'object') {
    return;
  }

  // Check current level
  for (const key of Object.keys(obj)) {
    if (isDangerousKey(key)) {
      throw new Error(`Prototype pollution attempt detected: key "${key}" is forbidden`);
    }

    // Recursively check nested objects
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      validateNoPollution(obj[key]);
    }
  }
}

/**
 * Express middleware to protect against prototype pollution in request body
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Next middleware
 */
export function prototypePollutionMiddleware(req, res, next) {
  // Check request body
  if (req.body && typeof req.body === 'object') {
    try {
      validateNoPollution(req.body);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Check query parameters
  if (req.query && typeof req.query === 'object') {
    try {
      validateNoPollution(req.query);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  next();
}

export default {
  isDangerousKey,
  sanitizeObject,
  safeJsonParse,
  freezeBuiltins,
  validateNoPollution,
  prototypePollutionMiddleware,
};
