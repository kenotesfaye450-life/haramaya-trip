// Standardized error handling

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Too many requests', 429, 'RATE_LIMIT_ERROR', { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown): {
  error: string;
  code?: string;
  details?: unknown;
  statusCode: number;
} {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      details: error.details,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    console.error("Unhandled application error.", {
      errorName:
        /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(error.name) ? error.name : "Unknown",
      message: error.message,
    });
    return {
      error: 'Something went wrong. Please try again.',
      statusCode: 500,
    };
  }

  console.error("Unhandled application error.", { errorName: "Unknown" });
  return {
    error: 'Something went wrong. Please try again.',
    statusCode: 500,
  };
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  
  if (error instanceof Error) {
    console.error({
      timestamp,
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context,
    });
  } else {
    console.error({
      timestamp,
      error,
      ...context,
    });
  }
}
