/**
 * Zod Validation Middleware
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('Validation');

function validate(schema) {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync({
        body: req.body || {},
        query: req.query || {},
        params: req.params || {}
      });

      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;
      req.validated = true;

      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        logger.warn('[Validation] Request validation failed', {
          method: req.method,
          path: req.path,
          errors
        });

        // In production, hide detailed schema structure to prevent information disclosure
        // Only expose field names, not full error messages that could leak validation logic
        const sanitizedErrors = process.env.NODE_ENV === 'production'
          ? errors.map(e => ({ field: e.field }))  // Field names only in production
          : errors;  // Full details in development

        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: sanitizedErrors
        });
      }

      logger.error('[Validation] Unexpected validation error:', error);
      return res.status(500).json({ error: 'Validation error', code: 'VALIDATION_UNEXPECTED_ERROR' });
    }
  };
}

function validateOptional(schema) {
  return async (req, res, next) => {
    try {
      if (!req.body && !req.query && !req.params) return next();

      const validated = await schema.parseAsync({
        body: req.body || {},
        query: req.query || {},
        params: req.params || {}
      });

      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;
      req.validated = true;

      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        // Apply same production sanitization as validate()
        const errorDetails = error.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
        const sanitizedDetails = process.env.NODE_ENV === 'production'
          ? errorDetails.map(e => ({ field: e.field }))
          : errorDetails;

        return res.status(400).json({
          error: 'Validation failed',
          details: sanitizedDetails
        });
      }
      next();
    }
  };
}

export { validate, validateOptional };
export default validate;
