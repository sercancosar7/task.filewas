/**
 * Logs Routes
 * System logs management endpoints
 * @module @task-filewas/backend/routes/logs
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { ApiError, asyncHandler } from '../middleware/index.js'
import { success } from '../utils/apiResponse.js'
import type { FieldError, LogType } from '@task-filewas/shared'
import * as logs from '../storage/logs.js'

const router: RouterType = Router()

// =============================================================================
// Validation Schemas
// =============================================================================

const logTypeSchema = z.enum(['api', 'agent', 'error', 'system', 'session'])

const logLevelSchema = z.enum(['debug', 'info', 'warn', 'error'])

const logsQuerySchema = z.object({
  type: z.union([logTypeSchema, z.array(logTypeSchema)]).optional(),
  level: z.union([logLevelSchema, z.array(logLevelSchema)]).optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  sessionId: z.string().optional(),
  projectId: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
})

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/logs
 * Get all logs with optional filtering
 * Query params: ?type=api|agent|error|system|session &level=debug|info|warn|error
 *              &since=ISO_DATE &until=ISO_DATE &sessionId=xxx &projectId=xxx
 *              &search=query &limit=50 &offset=0
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate query parameters
    const parseResult = logsQuerySchema.safeParse(req.query)
    if (!parseResult.success) {
      const fieldErrors: FieldError[] = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      throw ApiError.badRequest('Invalid query parameters', fieldErrors)
    }

    const params = parseResult.data

    // Build filter options
    const filter: Parameters<typeof logs.getLogs>[0] = {}

    if (params.type) {
      filter.type = params.type
    }
    if (params.level) {
      filter.level = params.level
    }
    if (params.since) {
      filter.since = params.since
    }
    if (params.until) {
      filter.until = params.until
    }
    if (params.sessionId) {
      filter.sessionId = params.sessionId
    }
    if (params.projectId) {
      filter.projectId = params.projectId
    }
    if (params.search) {
      filter.search = params.search
    }
    if (params.limit) {
      filter.limit = params.limit
    }
    if (params.offset) {
      filter.offset = params.offset
    }

    const result = await logs.getLogs(filter)

    if (!result.success) {
      throw ApiError.internal('Failed to read logs')
    }

    res.json(success(result.data))
  })
)

/**
 * GET /api/logs/stats
 * Get log statistics (counts by type and level)
 */
router.get(
  '/stats',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const result = await logs.getLogStats()

    if (!result.success) {
      throw ApiError.internal('Failed to read log statistics')
    }

    res.json(success(result.data))
  })
)

/**
 * GET /api/logs/recent
 * Get recent logs (last N logs)
 * Query params: ?count=50 &type=api|agent|error|system|session
 */
router.get(
  '/recent',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const count = req.query['count'] && typeof req.query['count'] === 'string'
      ? Math.min(parseInt(req.query['count'], 10), 1000)
      : 50

    const type = req.query['type'] && typeof req.query['type'] === 'string' && logTypeSchema.safeParse(req.query['type']).success
      ? req.query['type'] as LogType
      : undefined

    const result = await logs.getRecentLogs(count, type)

    if (!result.success) {
      throw ApiError.internal('Failed to read recent logs')
    }

    res.json(success(result.data))
  })
)

/**
 * GET /api/logs/by-type
 * Get logs grouped by type
 */
router.get(
  '/by-type',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const result = await logs.getLogsByType()

    if (!result.success) {
      throw ApiError.internal('Failed to read logs by type')
    }

    res.json(success(result.data))
  })
)

/**
 * GET /api/logs/:id
 * Get a single log by ID
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params

    if (typeof id !== 'string') {
      throw ApiError.badRequest('Invalid log ID')
    }

    const result = await logs.getLogById(id)

    if (!result.success) {
      throw ApiError.internal('Failed to read log')
    }

    if (!result.data) {
      throw ApiError.notFound(`Log with ID "${id}" not found`)
    }

    res.json(success(result.data))
  })
)

/**
 * POST /api/logs
 * Add a new log entry (for manual logging)
 * Body: { type, level, title, message?, metadata?, entityIds?, navigateTo? }
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const schema = z.object({
      type: logTypeSchema,
      level: logLevelSchema,
      title: z.string().min(1),
      message: z.string().optional(),
      error: z.object({
        name: z.string().optional(),
        message: z.string(),
        stack: z.string().optional(),
      }).optional(),
      metadata: z.record(z.unknown()).optional(),
      entityIds: z.object({
        sessionId: z.string().optional(),
        projectId: z.string().optional(),
        phaseId: z.number().optional(),
        agentId: z.string().optional(),
      }).optional(),
      navigateTo: z.object({
        path: z.string(),
        params: z.record(z.union([z.string(), z.number()])).optional(),
      }).optional(),
    })

    const parseResult = schema.safeParse(req.body)
    if (!parseResult.success) {
      const fieldErrors: FieldError[] = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      throw ApiError.badRequest('Invalid request body', fieldErrors)
    }

    const data = parseResult.data

    // Build log entry (omit id and timestamp - they will be added by addLog)
    const { type, level, title, message, error, metadata, entityIds, navigateTo } = data

    // Use conditional spread to avoid exactOptionalPropertyTypes issues
    // Only include properties that have defined values
    const logEntry: Parameters<typeof logs.addLog>[0] = {
      type,
      level,
      title,
      ...(message !== undefined && { message }),
      ...(error !== undefined && {
        error: {
          ...(error.name && { name: error.name }),
          message: error.message,
          ...(error.stack && { stack: error.stack }),
        },
      }),
      ...(metadata !== undefined && { metadata }),
      ...(entityIds !== undefined && {
        entityIds: {
          ...(entityIds.sessionId && { sessionId: entityIds.sessionId }),
          ...(entityIds.projectId && { projectId: entityIds.projectId }),
          ...(entityIds.phaseId !== undefined && { phaseId: entityIds.phaseId }),
          ...(entityIds.agentId && { agentId: entityIds.agentId }),
        },
      }),
      ...(navigateTo !== undefined && {
        navigateTo: {
          path: navigateTo.path,
          ...(navigateTo.params && { params: navigateTo.params }),
        },
      }),
    }

    const result = await logs.addLog(logEntry)

    if (!result.success) {
      throw ApiError.badRequest(result.error ?? 'Failed to add log')
    }

    res.json(success(result.data))
  })
)

/**
 * DELETE /api/logs/clean
 * Delete old logs (older than specified days)
 * Query params: ?days=30
 */
router.delete(
  '/clean',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const days = req.query['days'] && typeof req.query['days'] === 'string'
      ? Math.max(parseInt(req.query['days'], 10), 1)
      : 30

    const result = await logs.cleanOldLogs(days)

    if (!result.success) {
      throw ApiError.internal('Failed to clean old logs')
    }

    res.json(success({
      deleted: result.data,
      message: `Deleted ${result.data} log entries older than ${days} days`,
    }))
  })
)

export { router as logsRouter }
export default router
