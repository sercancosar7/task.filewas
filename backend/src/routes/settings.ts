/**
 * Settings Routes
 * Platform-wide settings management endpoints
 * @module @task-filewas/backend/routes/settings
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { ApiError, asyncHandler } from '../middleware/index.js'
import { success } from '../utils/apiResponse.js'
import type { FieldError } from '@task-filewas/shared'
import {
  getSettings,
  updateSettings,
  resetSettings,
} from '../storage/settings.js'

const router: RouterType = Router()

// =============================================================================
// Validation Schemas
// =============================================================================

const updateSettingsSchema = z.object({
  defaultModel: z.enum(['auto', 'claude', 'glm']).optional(),
  defaultPermission: z.enum(['safe', 'ask', 'auto']).optional(),
  defaultThinking: z.enum(['off', 'think', 'max']).optional(),
  fallbackEnabled: z.boolean().optional(),
  fallbackOrder: z.array(z.enum(['claude', 'glm'])).optional(),
  autoCommit: z.boolean().optional(),
  autoPush: z.boolean().optional(),
  autoNextPhase: z.boolean().optional(),
})

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/settings
 * Get all platform settings
 * Requires: Authorization header with Bearer token
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const result = await getSettings()

    if (!result.success) {
      throw ApiError.internal('Failed to read settings')
    }

    res.json(success(result.data))
  })
)

/**
 * PATCH /api/settings
 * Update platform settings (partial update)
 * Requires: Authorization header with Bearer token
 */
router.patch(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const parseResult = updateSettingsSchema.safeParse(req.body)
    if (!parseResult.success) {
      // Convert Zod errors to FieldError format
      const fieldErrors: FieldError[] = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      throw ApiError.badRequest('Invalid request body', fieldErrors)
    }

    // Remove undefined values from updates
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parseResult.data)) {
      if (value !== undefined) {
        updates[key] = value
      }
    }

    // Update settings
    const result = await updateSettings(updates)

    if (!result.success) {
      throw ApiError.internal('Failed to update settings')
    }

    res.json(success(result.data))
  })
)

/**
 * POST /api/settings/reset
 * Reset all settings to defaults
 * Requires: Authorization header with Bearer token
 */
router.post(
  '/reset',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const result = await resetSettings()

    if (!result.success) {
      throw ApiError.internal('Failed to reset settings')
    }

    res.json(success(result.data))
  })
)

export { router as settingsRouter }
export default router
