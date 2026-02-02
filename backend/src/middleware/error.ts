/**
 * Global Error Handler Middleware
 * Handles all errors and returns standardized API responses
 * @module @task-filewas/backend/middleware/error
 */

import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'
import { isDevelopment } from '../config/env.js'
import type { ApiErrorCode, ApiErrorResponse, FieldError } from '@task-filewas/shared'

/**
 * Custom API Error class
 * Extends Error with status code and error code for API responses
 */
export class ApiError extends Error {
  /** HTTP status code */
  public readonly statusCode: number
  /** API error code for programmatic handling */
  public readonly errorCode: ApiErrorCode
  /** Field-specific validation errors */
  public readonly fieldErrors?: FieldError[]
  /** Whether error should be logged */
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: ApiErrorCode = 'INTERNAL_ERROR',
    fieldErrors?: FieldError[]
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.errorCode = errorCode
    if (fieldErrors !== undefined) {
      this.fieldErrors = fieldErrors
    }
    this.isOperational = true

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Create a 400 Bad Request error
   */
  static badRequest(message: string, fieldErrors?: FieldError[]): ApiError {
    return new ApiError(message, 400, 'VALIDATION_ERROR', fieldErrors)
  }

  /**
   * Create a 401 Unauthorized error
   */
  static unauthorized(message: string = 'Unauthorized'): ApiError {
    return new ApiError(message, 401, 'UNAUTHORIZED')
  }

  /**
   * Create a 403 Forbidden error
   */
  static forbidden(message: string = 'Access denied'): ApiError {
    return new ApiError(message, 403, 'FORBIDDEN')
  }

  /**
   * Create a 404 Not Found error
   */
  static notFound(resource: string = 'Resource'): ApiError {
    return new ApiError(`${resource} not found`, 404, 'NOT_FOUND')
  }

  /**
   * Create a 409 Conflict error
   */
  static conflict(message: string): ApiError {
    return new ApiError(message, 409, 'CONFLICT')
  }

  /**
   * Create a 429 Rate Limited error
   */
  static rateLimited(message: string = 'Too many requests'): ApiError {
    return new ApiError(message, 429, 'RATE_LIMITED')
  }

  /**
   * Create a 500 Internal Server error
   */
  static internal(message: string = 'Internal server error'): ApiError {
    return new ApiError(message, 500, 'INTERNAL_ERROR')
  }

  /**
   * Create a 503 Service Unavailable error
   */
  static serviceUnavailable(message: string = 'Service unavailable'): ApiError {
    return new ApiError(message, 503, 'SERVICE_UNAVAILABLE')
  }
}

/**
 * Map HTTP status codes to error codes
 */
function getErrorCodeFromStatus(statusCode: number): ApiErrorCode {
  switch (statusCode) {
    case 400:
      return 'VALIDATION_ERROR'
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 429:
      return 'RATE_LIMITED'
    case 503:
      return 'SERVICE_UNAVAILABLE'
    default:
      return 'INTERNAL_ERROR'
  }
}

/**
 * Local error details type (to avoid exactOptionalPropertyTypes issues)
 */
interface ErrorDetails {
  message: string
  code: ApiErrorCode
  statusCode: number
  timestamp: string
  requestId?: string
  fieldErrors?: FieldError[]
  stack?: string
}

/**
 * Format error response
 */
function formatErrorResponse(
  error: ApiError | Error,
  requestId?: string
): ApiErrorResponse {
  const isApiError = error instanceof ApiError
  const statusCode = isApiError ? error.statusCode : 500
  const errorCode = isApiError ? error.errorCode : getErrorCodeFromStatus(statusCode)

  const details: ErrorDetails = {
    message: error.message,
    code: errorCode,
    statusCode,
    timestamp: new Date().toISOString(),
  }

  // Add request ID if present
  if (requestId) {
    details.requestId = requestId
  }

  // Add field errors if present
  if (isApiError && error.fieldErrors) {
    details.fieldErrors = error.fieldErrors
  }

  // Add stack trace in development
  if (isDevelopment && error.stack) {
    details.stack = error.stack
  }

  return {
    success: false,
    error: error.message,
    errorCode,
    details,
  } as ApiErrorResponse
}

/**
 * Log error to console
 */
function logError(error: Error, req: Request): void {
  const timestamp = new Date().toISOString()
  const requestId = req.requestId || 'unknown'
  const method = req.method
  const path = req.originalUrl || req.path

  console.error(`[${timestamp}] ERROR [${requestId}] ${method} ${path}`)
  console.error(`  Message: ${error.message}`)

  if (isDevelopment && error.stack) {
    console.error(`  Stack: ${error.stack}`)
  }
}

/**
 * Global error handler middleware
 * Must be the last middleware in the chain
 */
export const errorMiddleware: ErrorRequestHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error
  logError(err, req)

  // Determine status code
  const statusCode = err instanceof ApiError ? err.statusCode : 500

  // Format response
  const response = formatErrorResponse(err, req.requestId)

  // Send response
  res.status(statusCode).json(response)
}

/**
 * Not Found handler middleware
 * Handles 404 errors for undefined routes
 */
export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const error = ApiError.notFound(`Endpoint ${req.method} ${req.path}`)
  next(error)
}

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export default errorMiddleware
