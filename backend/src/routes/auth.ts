/**
 * Authentication Routes
 * Login, verify, and token management endpoints
 * @module @task-filewas/backend/routes/auth
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { z } from 'zod'
import { generateToken, verifyToken, verifyEnvPassword, calculateExpirationDate } from '../services/auth.js'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js'
import { ApiError, asyncHandler } from '../middleware/index.js'
import { success } from '../utils/apiResponse.js'
import type { LoginRequest, LoginResponse, VerifyTokenResponse } from '@task-filewas/shared'

const router: RouterType = Router()

// =============================================================================
// Validation Schemas
// =============================================================================

const loginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/auth/login
 * Authenticate with password and receive JWT token
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const parseResult = loginSchema.safeParse(req.body)
    if (!parseResult.success) {
      throw ApiError.badRequest('Invalid request body', [
        { field: 'password', message: 'Password is required' },
      ])
    }

    const { password }: LoginRequest = parseResult.data

    // Verify password against environment variable
    const isValid = verifyEnvPassword(password)
    if (!isValid) {
      throw ApiError.unauthorized('Invalid password')
    }

    // Generate JWT token (7 days expiry)
    const token = generateToken()
    const expiresAt = calculateExpirationDate()

    const responseData: LoginResponse = {
      token,
      expiresAt,
    }

    res.json(success(responseData))
  })
)

/**
 * GET /api/auth/verify
 * Verify current JWT token
 * Requires: Authorization header with Bearer token
 */
router.get(
  '/verify',
  authMiddleware,
  (req: Request, res: Response): void => {
    const authReq = req as AuthenticatedRequest
    const payload = authReq.auth

    // Build response
    if (payload) {
      const responseData: VerifyTokenResponse = {
        valid: true,
        payload: {
          iat: payload.iat,
          ...(payload.exp !== undefined ? { exp: payload.exp } : {}),
        },
      }
      res.json(success(responseData))
    } else {
      res.json(success({ valid: true }))
    }
  }
)

/**
 * POST /api/auth/refresh
 * Refresh current JWT token (get new token with fresh expiry)
 * Requires: Authorization header with Bearer token
 */
router.post(
  '/refresh',
  authMiddleware,
  (_req: Request, res: Response): void => {
    // Generate new token
    const token = generateToken()
    const expiresAt = calculateExpirationDate()

    const responseData: LoginResponse = {
      token,
      expiresAt,
    }

    res.json(success(responseData))
  }
)

/**
 * POST /api/auth/validate
 * Validate a token without requiring authentication
 * Body: { token: string }
 */
router.post(
  '/validate',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body as { token?: string }

    if (!token || typeof token !== 'string') {
      throw ApiError.badRequest('Token is required')
    }

    const result = verifyToken(token)

    // Build response based on validation result
    if (result.valid && result.payload) {
      const responseData: VerifyTokenResponse = {
        valid: true,
        payload: {
          iat: result.payload.iat,
          ...(result.payload.exp !== undefined ? { exp: result.payload.exp } : {}),
        },
      }
      res.json(success(responseData))
    } else {
      res.json(success({ valid: false }))
    }
  })
)

export { router as authRouter }
export default router
