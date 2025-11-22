/**
 * Centralized Error Handling Middleware for Campaign API
 * Handles all errors from routes and controllers
 */

/**
 * Custom Application Error
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // vs programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

/**
 * Validation Error (400)
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
  }
}

/**
 * Unauthorized Error (401)
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Forbidden Error (403)
 */
class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * Conflict Error (409)
 */
class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, details);
  }
}

/**
 * Handle Sequelize errors
 */
function handleSequelizeError(err) {
  // Unique constraint violation
  if (err.name === 'SequelizeUniqueConstraintError') {
    return new ConflictError(
      'Resource already exists',
      err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    );
  }

  // Validation error
  if (err.name === 'SequelizeValidationError') {
    return new ValidationError(
      'Validation failed',
      err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    );
  }

  // Foreign key constraint
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return new ValidationError('Referenced resource does not exist');
  }

  // Database connection error
  if (err.name === 'SequelizeConnectionError') {
    return new AppError('Database connection error', 503);
  }

  // Generic database error
  return new AppError('Database error: ' + err.message, 500);
}

/**
 * Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  let error = err;

  // Convert Sequelize errors to AppErrors
  if (err.name && err.name.startsWith('Sequelize')) {
    error = handleSequelizeError(err);
  }

  // Handle operational errors
  if (error.isOperational) {
    const response = {
      error: error.message,
      statusCode: error.statusCode
    };

    if (error.details) {
      response.details = error.details;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack;
    }

    return res.status(error.statusCode).json(response);
  }

  // Handle programming errors (unexpected)
  console.error('[Error Handler] ❌ Unexpected error:', err);

  const response = {
    error: 'Internal server error',
    statusCode: 500
  };

  // Include error details in development only
  if (process.env.NODE_ENV === 'development') {
    response.message = err.message;
    response.stack = err.stack;
  }

  res.status(500).json(response);
}

/**
 * Async handler wrapper
 * Catches async errors and passes to error handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler
 */
function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}

export {
  // Error classes
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,

  // Middleware
  errorHandler,
  asyncHandler,
  notFoundHandler
};
