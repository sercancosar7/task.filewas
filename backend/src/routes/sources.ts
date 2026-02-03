/**
 * Sources Routes
 * MCP, API, and Local source management endpoints
 * @module @task-filewas/backend/routes/sources
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { ApiError, asyncHandler } from '../middleware/index.js'
import { success } from '../utils/apiResponse.js'
import type { FieldError } from '@task-filewas/shared'
import type { SourceType, SourceCreate, SourceUpdate } from '@task-filewas/shared'
import * as sources from '../storage/sources.js'

const router: RouterType = Router()

// =============================================================================
// Validation Schemas
// =============================================================================

const sourceTypeSchema = z.enum(['mcp', 'api', 'local'])

const mcpConfigSchema = z.object({
  type: z.enum(['memory', 'context7', 'playwright', 'puppeteer', 'sequential-thinking', 'custom']),
  name: z.string(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  endpoint: z.string().optional(),
  enabled: z.boolean().optional(),
})

const apiConfigSchema = z.object({
  baseUrl: z.string().url(),
  name: z.string(),
  authType: z.enum(['none', 'bearer', 'basic', 'api-key', 'oauth2']),
  authConfig: z
    .object({
      token: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      keyHeader: z.string().optional(),
      keyValue: z.string().optional(),
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
    })
    .optional(),
  headers: z.record(z.string()).optional(),
  rateLimit: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
})

const localConfigSchema = z.object({
  path: z.string(),
  type: z.enum(['project', 'docs', 'tests', 'config', 'custom']),
  name: z.string(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  watch: z.boolean().optional(),
  enabled: z.boolean().optional(),
})

const createSourceSchema = z.object({
  type: sourceTypeSchema,
  name: z.string().min(1, 'Name is required'),
  config: z.union([mcpConfigSchema, apiConfigSchema, localConfigSchema]),
})

const updateSourceSchema = z.object({
  name: z.string().min(1).optional(),
  config: z.union([mcpConfigSchema, apiConfigSchema, localConfigSchema]).optional(),
  enabled: z.boolean().optional(),
})

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/sources
 * Get all sources (or filtered by type)
 * Query params: ?type=mcp|api|local
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { type } = req.query

    let result
    if (type && typeof type === 'string' && ['mcp', 'api', 'local'].includes(type as SourceType)) {
      result = await sources.getSourcesByType(type as SourceType)
    } else {
      result = await sources.getSources()
    }

    if (!result.success) {
      throw ApiError.internal('Failed to read sources')
    }

    res.json(success(result.data))
  })
)

/**
 * GET /api/sources/summaries
 * Get source summaries (for list views)
 */
router.get(
  '/summaries',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const result = await sources.getSourceSummaries()

    if (!result.success) {
      throw ApiError.internal('Failed to read source summaries')
    }

    res.json(success(result.data))
  })
)

/**
 * GET /api/sources/mcp
 * Get MCP sources
 */
router.get(
  '/mcp',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const result = await sources.getMCPSources()

    if (!result.success) {
      throw ApiError.internal('Failed to read MCP sources')
    }

    res.json(success(result.data))
  })
)

/**
 * GET /api/sources/api
 * Get API sources
 */
router.get(
  '/api',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const result = await sources.getAPISources()

    if (!result.success) {
      throw ApiError.internal('Failed to read API sources')
    }

    res.json(success(result.data))
  })
)

/**
 * GET /api/sources/local
 * Get local sources
 */
router.get(
  '/local',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const result = await sources.getLocalSources()

    if (!result.success) {
      throw ApiError.internal('Failed to read local sources')
    }

    res.json(success(result.data))
  })
)

/**
 * GET /api/sources/:id
 * Get a single source by ID
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params

    if (typeof id !== 'string') {
      throw ApiError.badRequest('Invalid source ID')
    }

    const result = await sources.getSourceById(id)

    if (!result.success) {
      throw ApiError.internal('Failed to read source')
    }

    if (!result.data) {
      throw ApiError.notFound(`Source with ID "${id}" not found`)
    }

    res.json(success(result.data))
  })
)

/**
 * POST /api/sources
 * Create a new source
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const parseResult = createSourceSchema.safeParse(req.body)
    if (!parseResult.success) {
      const fieldErrors: FieldError[] = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      throw ApiError.badRequest('Invalid request body', fieldErrors)
    }

    const parsed = parseResult.data

    // Build SourceCreate with proper typing
    const data: SourceCreate = {
      type: parsed.type,
      name: parsed.name,
      config: parsed.config as SourceCreate['config'],
    }

    // Create source
    const result = await sources.createSource(data)

    if (!result.success) {
      throw ApiError.badRequest(result.error ?? 'Failed to create source')
    }

    res.json(success(result.data))
  })
)

/**
 * PATCH /api/sources/:id
 * Update a source
 */
router.patch(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params

    if (typeof id !== 'string') {
      throw ApiError.badRequest('Invalid source ID')
    }

    // Validate request body (partial)
    const parseResult = updateSourceSchema.safeParse(req.body)
    if (!parseResult.success) {
      const fieldErrors: FieldError[] = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      throw ApiError.badRequest('Invalid request body', fieldErrors)
    }

    const parsed = parseResult.data

    // Build SourceUpdate with proper typing
    const updates: SourceUpdate = {}
    if (parsed.name !== undefined) {
      updates.name = parsed.name
    }
    if (parsed.config !== undefined) {
      ;(updates as { config: SourceUpdate['config'] }).config = parsed.config as any
    }
    if (parsed.enabled !== undefined) {
      updates.enabled = parsed.enabled
    }

    // Update source
    const result = await sources.updateSource(id, updates)

    if (!result.success) {
      throw ApiError.internal(result.error ?? 'Failed to update source')
    }

    if (!result.data) {
      throw ApiError.notFound(`Source with ID "${id}" not found`)
    }

    res.json(success(result.data))
  })
)

/**
 * POST /api/sources/:id/toggle
 * Toggle source enabled status
 */
router.post(
  '/:id/toggle',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params

    if (typeof id !== 'string') {
      throw ApiError.badRequest('Invalid source ID')
    }

    const result = await sources.toggleSource(id)

    if (!result.success) {
      throw ApiError.internal(result.error ?? 'Failed to toggle source')
    }

    if (!result.data) {
      throw ApiError.notFound(`Source with ID "${id}" not found`)
    }

    res.json(success(result.data))
  })
)

/**
 * POST /api/sources/:id/test
 * Test source connection
 * (Placeholder - actual connection testing would be implemented per source type)
 */
router.post(
  '/:id/test',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params

    if (typeof id !== 'string') {
      throw ApiError.badRequest('Invalid source ID')
    }

    // First check if source exists
    const getResult = await sources.getSourceById(id)

    if (!getResult.success || !getResult.data) {
      throw ApiError.notFound(`Source with ID "${id}" not found`)
    }

    const source = getResult.data

    // TODO: Implement actual connection testing based on source type
    // For now, return a placeholder response
    const testResult = {
      success: source.enabled,
      latency: source.enabled ? 50 : undefined,
      error: source.enabled ? undefined : 'Source is disabled',
      info: {
        type: source.type,
        name: source.name,
      },
    }

    // Update connection status
    const newStatus = source.enabled ? 'connected' : 'disconnected'
    await sources.updateSourceStatus(id, newStatus, testResult.error)

    res.json(success(testResult))
  })
)

/**
 * DELETE /api/sources/:id
 * Delete a source
 */
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params

    if (typeof id !== 'string') {
      throw ApiError.badRequest('Invalid source ID')
    }

    const result = await sources.deleteSource(id)

    if (!result.success) {
      throw ApiError.internal('Failed to delete source')
    }

    if (!result.data) {
      throw ApiError.notFound(`Source with ID "${id}" not found`)
    }

    res.json(
      success({
        id: result.data.id,
        deleted: true,
      })
    )
  })
)

export { router as sourcesRouter }
export default router
