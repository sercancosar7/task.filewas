/**
 * Authentication Middleware
 * JWT token verification for protected routes
 * @module @task-filewas/backend/middleware/auth
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { verifyToken, extractBearerToken, type TokenPayload } from '../services/auth.js'
import { ApiError } from './error.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Extended Request with authenticated user payload
 */
export interface AuthenticatedRequest extends Request {
  /** Decoded JWT token payload */
  auth?: TokenPayload | undefined
}

// =============================================================================
// Middleware
// =============================================================================

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 * @throws ApiError.unauthorized if token is missing or invalid
 */
export const authMiddleware: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization
  const token = extractBearerToken(authHeader)

  // Check if token exists
  if (!token) {
    next(ApiError.unauthorized('Authorization token required'))
    return
  }

  // Verify token
  const result = verifyToken(token)

  if (!result.valid) {
    // Provide specific error message
    if (result.error === 'Token expired') {
      next(new ApiError('Token expired', 401, 'TOKEN_EXPIRED'))
    } else {
      next(new ApiError(result.error ?? 'Invalid token', 401, 'INVALID_TOKEN'))
    }
    return
  }

  // Attach payload to request
  const authReq = req as AuthenticatedRequest
  authReq.auth = result.payload

  next()
}

/**
 * Optional authentication middleware
 * Verifies JWT token if present, but doesn't require it
 * Useful for routes that behave differently based on auth status
 */
export const optionalAuthMiddleware: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization
  const token = extractBearerToken(authHeader)

  // If no token, continue without auth
  if (!token) {
    next()
    return
  }

  // If token exists, verify it
  const result = verifyToken(token)

  if (result.valid && result.payload) {
    const authReq = req as AuthenticatedRequest
    authReq.auth = result.payload
  }

  // Continue regardless of verification result
  next()
}

/**
 * Require authentication helper
 * Returns 401 if request is not authenticated
 * Use after optionalAuthMiddleware to enforce auth on specific routes
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest

  if (!authReq.auth) {
    next(ApiError.unauthorized('Authentication required'))
    return
  }

  next()
}

export default authMiddleware
