/**
 * Session Routes
 * Session list and create endpoints
 * @module @task-filewas/backend/routes/sessions
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { ApiError, asyncHandler } from '../middleware/index.js'
import { paginated, created, parsePaginationParams } from '../utils/apiResponse.js'
import { sessionStorage } from '../services/session-storage.js'
import { sessionCreateSchema } from '@task-filewas/shared'
import type {
  SessionSummary,
  SessionFilter,
  SessionSort,
  SessionStatus,
  SessionMode,
  SessionCreate,
} from '@task-filewas/shared'

const router: RouterType = Router()

// =============================================================================
// Validation Schemas
// =============================================================================

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
        parseResult.error.errors.map(e => ({
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

export { router as sessionsRouter }
export default router
