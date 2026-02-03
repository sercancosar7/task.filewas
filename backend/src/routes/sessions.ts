/**
 * Session Routes
 * Session list and create endpoints
 * @module @task-filewas/backend/routes/sessions
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { ApiError, asyncHandler } from '../middleware/index.js'
import { paginated, created, parsePaginationParams, success } from '../utils/apiResponse.js'
import { sessionStorage } from '../services/session-storage.js'
// @ts-ignore - pnpm workspace issue
import type {
  SessionSummary,
  SessionFilter,
  SessionSort,
  SessionStatus,
  SessionMode,
  SessionCreate,
  SessionUpdate,
} from '@task-filewas/shared'

const router: RouterType = Router()

// =============================================================================
// Validation Schemas
// =============================================================================

/**
 * Local session create schema (to avoid shared module import issues)
 */
const sessionCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  mode: z.enum(['quick-chat', 'planning', 'tdd', 'debug', 'code-review']).optional(),
  permissionMode: z.enum(['safe', 'ask', 'auto']).optional(),
  thinkingLevel: z.enum(['off', 'think', 'max']).optional(),
  modelProvider: z.enum(['claude', 'glm', 'auto']).optional(),
  version: z.string().optional(),
  labels: z.array(z.string()).optional(),
  isFlagged: z.boolean().optional(),
})

/**
 * Query parameters for session list endpoint
 */
const sessionListQuerySchema = z.object({
  // Pagination
  page: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),

  // Filters (from SessionFilter)
  projectId: z.string().optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  mode: z.union([z.string(), z.array(z.string())]).optional(),
  labelIds: z.union([z.string(), z.array(z.string())]).optional(),
  isFlagged: z.string().optional(),
  hasUnread: z.string().optional(),
  version: z.string().optional(),
  search: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),

  // Sorting
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'status', 'messageCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse query parameters into SessionFilter
 */
function parseFilter(query: Record<string, unknown>): SessionFilter {
  const filter: SessionFilter = {}

  // Project ID
  const projectId = query['projectId']
  if (typeof projectId === 'string') {
    filter.projectId = projectId
  }

  // Status (can be single or array)
  const status = query['status']
  if (status) {
    if (Array.isArray(status)) {
      filter.status = status as SessionStatus[]
    } else if (typeof status === 'string') {
      // Check if comma-separated
      if (status.includes(',')) {
        filter.status = status.split(',') as SessionStatus[]
      } else {
        filter.status = status as SessionStatus
      }
    }
  }

  // Mode (can be single or array)
  const mode = query['mode']
  if (mode) {
    if (Array.isArray(mode)) {
      filter.mode = mode as SessionMode[]
    } else if (typeof mode === 'string') {
      if (mode.includes(',')) {
        filter.mode = mode.split(',') as SessionMode[]
      } else {
        filter.mode = mode as SessionMode
      }
    }
  }

  // Label IDs (can be single or array)
  const labelIds = query['labelIds']
  if (labelIds) {
    if (Array.isArray(labelIds)) {
      filter.labelIds = labelIds as string[]
    } else if (typeof labelIds === 'string') {
      if (labelIds.includes(',')) {
        filter.labelIds = labelIds.split(',')
      } else {
        filter.labelIds = [labelIds]
      }
    }
  }

  // Boolean flags
  const isFlagged = query['isFlagged']
  if (typeof isFlagged === 'string') {
    filter.isFlagged = isFlagged === 'true'
  }

  const hasUnread = query['hasUnread']
  if (typeof hasUnread === 'string') {
    filter.hasUnread = hasUnread === 'true'
  }

  // Version
  const version = query['version']
  if (typeof version === 'string') {
    filter.version = version
  }

  // Search
  const search = query['search']
  if (typeof search === 'string') {
    filter.search = search
  }

  // Date range
  const fromDate = query['fromDate']
  if (typeof fromDate === 'string') {
    filter.fromDate = fromDate
  }

  const toDate = query['toDate']
  if (typeof toDate === 'string') {
    filter.toDate = toDate
  }

  return filter
}

/**
 * Parse query parameters into SessionSort
 */
function parseSort(query: Record<string, unknown>): SessionSort | undefined {
  const sortBy = query['sortBy'] as string | undefined
  const sortOrder = query['sortOrder'] as string | undefined

  if (!sortBy) {
    return undefined
  }

  const validFields = ['createdAt', 'updatedAt', 'title', 'status', 'messageCount'] as const
  if (!validFields.includes(sortBy as (typeof validFields)[number])) {
    return undefined
  }

  return {
    field: sortBy as SessionSort['field'],
    direction: sortOrder === 'asc' ? 'asc' : 'desc',
  }
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/sessions
 * List sessions with optional filters and pagination
 *
 * Query Parameters:
 * - page: Page number (1-indexed, default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - offset: Items to skip (alternative to page)
 * - projectId: Filter by project ID
 * - status: Filter by status (comma-separated for multiple)
 * - mode: Filter by mode (comma-separated for multiple)
 * - labelIds: Filter by label IDs (comma-separated for multiple)
 * - isFlagged: Filter flagged sessions (true/false)
 * - hasUnread: Filter sessions with unread messages (true/false)
 * - version: Filter by version
 * - search: Search in title and description
 * - fromDate: Filter by start date (ISO string)
 * - toDate: Filter by end date (ISO string)
 * - sortBy: Sort field (createdAt, updatedAt, title, status, messageCount)
 * - sortOrder: Sort direction (asc, desc)
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate query parameters
    const queryResult = sessionListQuerySchema.safeParse(req.query)
    if (!queryResult.success) {
      throw ApiError.badRequest('Invalid query parameters',
        queryResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    // Parse pagination
    const { page, limit, offset } = parsePaginationParams(req.query)

    // Parse filter
    const filter = parseFilter(req.query)

    // Parse sort
    const sort = parseSort(req.query)

    // Get sessions from storage
    const result = await sessionStorage.findByFilter(filter, sort)

    if (!result.success) {
      throw ApiError.internal(result.error ?? 'Failed to fetch sessions')
    }

    const allSessions = result.data

    // Calculate pagination
    const total = allSessions.length
    const paginatedSessions = allSessions.slice(offset, offset + limit)

    // Convert to summaries for list response (lighter payload)
    const summaries: SessionSummary[] = paginatedSessions.map((session) => {
      const summary: SessionSummary = {
        id: session.id,
        projectId: session.projectId,
        title: session.title,
        status: session.status,
        mode: session.mode,
        processingState: session.processingState,
        modelProvider: session.modelProvider,
        permissionMode: session.permissionMode,
        labels: session.labels,
        isFlagged: session.isFlagged,
        hasUnread: session.hasUnread,
        hasPlan: session.hasPlan,
        messageCount: session.messageCount,
        createdAt: session.createdAt,
      }

      // Add optional properties only if they exist
      if (session.phaseProgress) {
        summary.phaseProgress = session.phaseProgress
      }
      if (session.updatedAt) {
        summary.updatedAt = session.updatedAt
      }

      return summary
    })

    // Return paginated response
    res.json(paginated(summaries, { total, page, limit }))
  })
)

/**
 * POST /api/sessions
 * Create a new session
 *
 * Request Body:
 * - projectId: Parent project ID (required)
 * - title: Session title (required)
 * - description: Session description (optional)
 * - mode: Session mode (optional, default: quick-chat)
 * - permissionMode: Permission mode (optional, default: safe)
 * - thinkingLevel: Thinking level (optional, default: off)
 * - modelProvider: Model provider (optional, default: auto)
 * - version: Version (optional)
 * - labels: Initial label IDs (optional)
 * - isFlagged: Is flagged (optional, default: false)
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const parseResult = sessionCreateSchema.safeParse(req.body)

    if (!parseResult.success) {
      throw ApiError.badRequest('Invalid request body',
        parseResult.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const createData = parseResult.data

    // Build SessionCreate with proper typing
    const sessionCreateData: SessionCreate = {
      projectId: createData.projectId,
      title: createData.title,
      mode: createData.mode,
      permissionMode: createData.permissionMode,
      thinkingLevel: createData.thinkingLevel,
      modelProvider: createData.modelProvider,
      isFlagged: createData.isFlagged,
    }

    // Add optional properties only if they exist (not undefined)
    if (createData.description !== undefined) {
      sessionCreateData.description = createData.description
    }
    if (createData.version !== undefined) {
      sessionCreateData.version = createData.version
    }
    if (createData.labels !== undefined) {
      sessionCreateData.labels = createData.labels
    }

    // Create session
    const result = await sessionStorage.createSession(sessionCreateData)

    if (!result.success) {
      throw ApiError.internal(result.error ?? 'Failed to create session')
    }

    // Return created session
    res.status(201).json(created(result.data))
  })
)

// =============================================================================
// Session Detail Routes (CRUD)
// =============================================================================

/**
 * GET /api/sessions/:id
 * Get a single session by ID with full details
 *
 * Path Parameters:
 * - id: Session ID
 *
 * Returns: Session with full details
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Session ID is required')
    }

    // Get session from storage
    const result = await sessionStorage.findById(id)

    if (!result.success) {
      throw ApiError.internal(result.error ?? 'Failed to fetch session')
    }

    if (!result.data) {
      throw ApiError.notFound(`Session not found: ${id}`)
    }

    // Return session
    res.json(success(result.data))
  })
)

/**
 * PATCH /api/sessions/:id
 * Update a session
 *
 * Path Parameters:
 * - id: Session ID
 *
 * Request Body (all optional):
 * - title: Updated title
 * - description: Updated description (null to clear)
 * - status: Updated status
 * - mode: Updated mode
 * - permissionMode: Updated permission mode
 * - thinkingLevel: Updated thinking level
 * - modelProvider: Updated model provider
 * - labels: Updated labels array
 * - isFlagged: Updated flag status
 * - hasUnread: Mark as read/unread
 *
 * Returns: Updated session
 */
router.patch(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Session ID is required')
    }

    // Import and validate request body
    // @ts-ignore - pnpm workspace issue
    const { sessionUpdateSchema } = await import('@task-filewas/shared')
    const parseResult = sessionUpdateSchema.safeParse(req.body)

    if (!parseResult.success) {
      throw ApiError.badRequest('Invalid request body',
        parseResult.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const updateData = parseResult.data

    // Check if session exists
    const existsResult = await sessionStorage.findById(id)
    if (!existsResult.success) {
      throw ApiError.internal(existsResult.error ?? 'Failed to check session')
    }
    if (!existsResult.data) {
      throw ApiError.notFound(`Session not found: ${id}`)
    }

    // Build update object with proper typing
    const sessionUpdate: SessionUpdate = {}

    if (updateData.title !== undefined) sessionUpdate.title = updateData.title
    if (updateData.description !== undefined && updateData.description !== null) {
      sessionUpdate.description = updateData.description
    }
    if (updateData.status !== undefined) sessionUpdate.status = updateData.status
    if (updateData.mode !== undefined) sessionUpdate.mode = updateData.mode
    if (updateData.permissionMode !== undefined) sessionUpdate.permissionMode = updateData.permissionMode
    if (updateData.thinkingLevel !== undefined) sessionUpdate.thinkingLevel = updateData.thinkingLevel
    if (updateData.modelProvider !== undefined) sessionUpdate.modelProvider = updateData.modelProvider
    if (updateData.labels !== undefined) sessionUpdate.labels = updateData.labels
    if (updateData.isFlagged !== undefined) sessionUpdate.isFlagged = updateData.isFlagged
    if (updateData.hasUnread !== undefined) sessionUpdate.hasUnread = updateData.hasUnread

    // Update session
    const result = await sessionStorage.updateSession(id, sessionUpdate)

    if (!result.success) {
      throw ApiError.internal(result.error ?? 'Failed to update session')
    }

    // Return updated session
    res.json(success(result.data))
  })
)

/**
 * DELETE /api/sessions/:id
 * Soft delete a session (sets status to cancelled)
 * Hard delete is not recommended - data may be needed for recovery
 *
 * Path Parameters:
 * - id: Session ID
 *
 * Query Parameters:
 * - hard: Set to 'true' for permanent deletion (optional)
 *
 * Returns: Success response
 */
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined
    const hardDelete = req.query['hard'] === 'true'

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Session ID is required')
    }

    // Check if session exists
    const existsResult = await sessionStorage.findById(id)
    if (!existsResult.success) {
      throw ApiError.internal(existsResult.error ?? 'Failed to check session')
    }
    if (!existsResult.data) {
      throw ApiError.notFound(`Session not found: ${id}`)
    }

    if (hardDelete) {
      // Permanent deletion
      const deleteResult = await sessionStorage.delete(id)

      if (!deleteResult.success) {
        throw ApiError.internal(deleteResult.error ?? 'Failed to delete session')
      }

      res.status(204).send()
    } else {
      // Soft delete - set status to cancelled
      const updateResult = await sessionStorage.updateStatus(id, 'cancelled')

      if (!updateResult.success) {
        throw ApiError.internal(updateResult.error ?? 'Failed to cancel session')
      }

      res.json(success({ message: 'Session cancelled', session: updateResult.data }))
    }
  })
)

/**
 * POST /api/sessions/:id/flag
 * Toggle the flagged status of a session
 *
 * Path Parameters:
 * - id: Session ID
 *
 * Returns: Updated session with new flag status
 */
router.post(
  '/:id/flag',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Session ID is required')
    }

    // Toggle flag
    const result = await sessionStorage.toggleFlag(id)

    if (!result.success) {
      // Check if it's a not found error
      if (result.error?.includes('not found')) {
        throw ApiError.notFound(`Session not found: ${id}`)
      }
      throw ApiError.internal(result.error ?? 'Failed to toggle flag')
    }

    // Return updated session
    res.json(success(result.data))
  })
)

export { router as sessionsRouter }
export default router
