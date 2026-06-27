/**
 * Global Error Handler Middleware
 *
 * All unhandled errors are caught here and formatted as the standard
 * error envelope defined in api_specification.md §1.
 */

import type { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found.`);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Access denied.') {
    super(403, 'FORBIDDEN_SCOPE', message);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class InvalidStateTransitionError extends ApiError {
  constructor(from: string, to: string) {
    super(409, 'INVALID_STATE_TRANSITION',
      `Cannot transition from "${from}" to "${to}". See user_flows.md canonical state machine.`);
  }
}

export class MissingRequiredEvidenceError extends ApiError {
  constructor(message = 'Missing required evidence (e.g. after-photo for resolution).') {
    super(422, 'MISSING_REQUIRED_EVIDENCE', message);
  }
}

export class OutsideServiceAreaError extends ApiError {
  constructor() {
    super(422, 'OUTSIDE_SERVICE_AREA', 'Location is outside the supported service area.');
  }
}

// Global error handler (must have 4 parameters to be recognized by Express)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function globalErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Unexpected error
  console.error('[INTERNAL_ERROR]', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.stack : 'An unexpected server error occurred.',
    },
  });
}

/** Wraps an async route handler to forward errors to the global handler */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
