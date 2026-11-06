// ApiError is the one error type used across services.
// Services throw ApiError with an HTTP status; the central error handler
// (middleware/errorHandler.js) turns it into a consistent JSON response.

class ApiError extends Error {
  constructor(status, message, code = 'ERROR', details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'You do not have permission to do this') {
    return new ApiError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }
  static conflict(message, details) {
    return new ApiError(409, message, 'CONFLICT', details);
  }
}

// Wraps async route handlers so thrown errors reach the central error
// handler instead of crashing the process (Express 4 does not catch
// rejected promises from async handlers on its own).
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { ApiError, asyncHandler };
