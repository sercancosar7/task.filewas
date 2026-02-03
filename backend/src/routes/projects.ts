/**
 * Project Routes
 * Project CRUD API endpoints
 * @module @task-filewas/backend/routes/projects
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { ApiError, asyncHandler } from '../middleware/index.js'
import { paginated, created, success, parsePaginationParams } from '../utils/apiResponse.js'
import { projectStorage } from '../services/project-storage.js'
import { projectCreateSchema, projectUpdateSchema } from '@task-filewas/shared'
import type {
  ProjectSummary,
  ProjectStatus,
  ProjectType,
  ProjectCreate,
  ProjectUpdate,
} from '@task-filewas/shared'

const router: RouterType = Router()

// =============================================================================
// Validation Schemas
// =============================================================================

/**
 * Query parameters for project list endpoint
 */
const projectListQuerySchema = z.object({
  // Pagination
  page: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),

  // Filters
  status: z.union([z.string(), z.array(z.string())]).optional(),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  search: z.string().optional(),

  // Sorting
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'lastActivityAt', 'sessionCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse query parameters into filter options
 */
function parseFilter(query: Record<string, unknown>): {
  status?: ProjectStatus | ProjectStatus[]
  type?: ProjectType | ProjectType[]
  tags?: string[]
  search?: string
} {
  const filter: {
    status?: ProjectStatus | ProjectStatus[]
    type?: ProjectType | ProjectType[]
    tags?: string[]
    search?: string
  } = {}

  // Status filter (can be single or array)
  const status = query['status']
  if (status) {
    if (Array.isArray(status)) {
      filter.status = status as ProjectStatus[]
    } else if (typeof status === 'string') {
      if (status.includes(',')) {
        filter.status = status.split(',') as ProjectStatus[]
      } else {
        filter.status = status as ProjectStatus
      }
    }
  }

  // Type filter (can be single or array)
  const type = query['type']
  if (type) {
    if (Array.isArray(type)) {
      filter.type = type as ProjectType[]
    } else if (typeof type === 'string') {
      if (type.includes(',')) {
        filter.type = type.split(',') as ProjectType[]
      } else {
        filter.type = type as ProjectType
      }
    }
  }

  // Tags filter (can be single or array)
  const tags = query['tags']
  if (tags) {
    if (Array.isArray(tags)) {
      filter.tags = tags as string[]
    } else if (typeof tags === 'string') {
      if (tags.includes(',')) {
        filter.tags = tags.split(',')
      } else {
        filter.tags = [tags]
      }
    }
  }

  // Search filter
  const search = query['search']
  if (typeof search === 'string') {
    filter.search = search
  }

  return filter
}

/**
 * Sort projects by given field and direction
 */
function sortProjects<T extends { createdAt: string; updatedAt?: string; name: string; lastActivityAt?: string; sessionCount: number }>(
  projects: T[],
  sortBy?: string,
  sortOrder?: string
): T[] {
  if (!sortBy) {
    // Default sort: lastActivityAt desc
    return [...projects].sort((a, b) => {
      const aDate = a.lastActivityAt ?? a.createdAt
      const bDate = b.lastActivityAt ?? b.createdAt
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })
  }

  const direction = sortOrder === 'asc' ? 1 : -1

  return [...projects].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return direction * a.name.localeCompare(b.name)
      case 'createdAt':
        return direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      case 'updatedAt': {
        const aUpdated = a.updatedAt ?? a.createdAt
        const bUpdated = b.updatedAt ?? b.createdAt
        return direction * (new Date(aUpdated).getTime() - new Date(bUpdated).getTime())
      }
      case 'lastActivityAt': {
        const aActivity = a.lastActivityAt ?? a.createdAt
        const bActivity = b.lastActivityAt ?? b.createdAt
        return direction * (new Date(aActivity).getTime() - new Date(bActivity).getTime())
      }
      case 'sessionCount':
        return direction * (a.sessionCount - b.sessionCount)
      default:
        return 0
    }
  })
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/projects
 * List all projects with optional filters and pagination
 *
 * Query Parameters:
 * - page: Page number (1-indexed, default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - offset: Items to skip (alternative to page)
 * - status: Filter by status (comma-separated for multiple)
 * - type: Filter by type (comma-separated for multiple)
 * - tags: Filter by tags (comma-separated for multiple, any match)
 * - search: Search in name and description
 * - sortBy: Sort field (createdAt, updatedAt, name, lastActivityAt, sessionCount)
 * - sortOrder: Sort direction (asc, desc)
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate query parameters
    const queryResult = projectListQuerySchema.safeParse(req.query)
    if (!queryResult.success) {
      throw ApiError.badRequest(
        'Invalid query parameters',
        queryResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    // Parse pagination
    const { page, limit, offset } = parsePaginationParams(req.query)

    // Parse filter
    const filter = parseFilter(req.query)

    // Get projects from storage
    const result = await projectStorage.findByFilter(filter)

    if (!result.success) {
      throw ApiError.internal(result.error ?? 'Failed to fetch projects')
    }

    // Sort projects
    const sortBy = req.query['sortBy'] as string | undefined
    const sortOrder = req.query['sortOrder'] as string | undefined
    const sortedProjects = sortProjects(result.data, sortBy, sortOrder)

    // Calculate pagination
    const total = sortedProjects.length
    const paginatedProjects = sortedProjects.slice(offset, offset + limit)

    // Convert to summaries for list response (lighter payload)
    const summaries: ProjectSummary[] = paginatedProjects.map((project) => {
      const summary: ProjectSummary = {
        id: project.id,
        name: project.name,
        type: project.type,
        status: project.status,
        activeVersion: project.activeVersion,
        sessionCount: project.sessionCount,
      }

      // Add optional properties only if they exist
      if (project.description) {
        summary.description = project.description
      }
      if (project.lastActivityAt) {
        summary.lastActivityAt = project.lastActivityAt
      }
      if (project.icon) {
        summary.icon = project.icon
      }
      if (project.color) {
        summary.color = project.color
      }
      if (project.tags && project.tags.length > 0) {
        summary.tags = project.tags
      }

      return summary
    })

    // Return paginated response
    res.json(paginated(summaries, { total, page, limit }))
  })
)

/**
 * POST /api/projects
 * Create a new project
 *
 * Request Body:
 * - name: Project name (required)
 * - description: Project description (optional)
 * - type: Project type (optional, default: other)
 * - path: File system path (optional, generated if not provided)
 * - githubUrl: GitHub URL for import (optional)
 * - techStack: Initial tech stack (optional)
 * - settings: Project settings (optional)
 * - icon: Project icon/emoji (optional)
 * - color: Project color hex (optional)
 * - tags: Tags array (optional)
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const parseResult = projectCreateSchema.safeParse(req.body)

    if (!parseResult.success) {
      throw ApiError.badRequest(
        'Invalid request body',
        parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const createData = parseResult.data

    // Check if project with same name already exists
    const existingResult = await projectStorage.findByName(createData.name)
    if (existingResult.success && existingResult.data) {
      throw ApiError.conflict(`Project with name "${createData.name}" already exists`)
    }

    // Build ProjectCreate - use Record to bypass exactOptionalPropertyTypes
    // This is safe because we only set defined values
    const projectCreateData = {
      name: createData.name,
      type: createData.type,
    } as Record<string, unknown>

    // Add optional properties only if they exist and have non-undefined values
    if (createData.description !== undefined) {
      projectCreateData['description'] = createData.description
    }
    if (createData.path !== undefined) {
      projectCreateData['path'] = createData.path
    }
    if (createData.githubUrl !== undefined) {
      projectCreateData['githubUrl'] = createData.githubUrl
    }
    // Filter out undefined values from techStack and settings to satisfy exact types
    if (createData.techStack !== undefined) {
      const techStack: Record<string, string[]> = {}
      const ts = createData.techStack
      if (ts.languages) techStack['languages'] = ts.languages
      if (ts.frameworks) techStack['frameworks'] = ts.frameworks
      if (ts.databases) techStack['databases'] = ts.databases
      if (ts.uiLibraries) techStack['uiLibraries'] = ts.uiLibraries
      if (ts.buildTools) techStack['buildTools'] = ts.buildTools
      if (ts.testingFrameworks) techStack['testingFrameworks'] = ts.testingFrameworks
      if (ts.other) techStack['other'] = ts.other
      if (Object.keys(techStack).length > 0) {
        projectCreateData['techStack'] = techStack
      }
    }
    if (createData.settings !== undefined) {
      const settings: Record<string, unknown> = {}
      const s = createData.settings
      if (s.defaultModel !== undefined) settings['defaultModel'] = s.defaultModel
      if (s.defaultPermissionMode !== undefined) settings['defaultPermissionMode'] = s.defaultPermissionMode
      if (s.defaultThinkingLevel !== undefined) settings['defaultThinkingLevel'] = s.defaultThinkingLevel
      if (s.autoCommit !== undefined) settings['autoCommit'] = s.autoCommit
      if (s.autoPush !== undefined) settings['autoPush'] = s.autoPush
      if (s.customLabels !== undefined) settings['customLabels'] = s.customLabels
      if (s.customStatuses !== undefined) settings['customStatuses'] = s.customStatuses
      if (Object.keys(settings).length > 0) {
        projectCreateData['settings'] = settings
      }
    }
    if (createData.icon !== undefined) {
      projectCreateData['icon'] = createData.icon
    }
    if (createData.color !== undefined) {
      projectCreateData['color'] = createData.color
    }
    if (createData.tags !== undefined) {
      projectCreateData['tags'] = createData.tags
    }

    // Create project (double cast via unknown for exactOptionalPropertyTypes compatibility)
    const result = await projectStorage.createProject(projectCreateData as unknown as ProjectCreate)

    if (!result.success) {
      throw ApiError.internal(result.error ?? 'Failed to create project')
    }

    // Return created project
    res.status(201).json(created(result.data))
  })
)

/**
 * GET /api/projects/:id
 * Get a single project by ID with full details
 *
 * Path Parameters:
 * - id: Project ID
 *
 * Returns: Project with full details
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Project ID is required')
    }

    // Get project from storage
    const result = await projectStorage.findById(id)

    if (!result.success) {
      throw ApiError.internal(result.error ?? 'Failed to fetch project')
    }

    if (!result.data) {
      throw ApiError.notFound(`Project not found: ${id}`)
    }

    // Return project
    res.json(success(result.data))
  })
)

/**
 * PATCH /api/projects/:id
 * Update a project
 *
 * Path Parameters:
 * - id: Project ID
 *
 * Request Body (all optional):
 * - name: Updated name
 * - description: Updated description (null to clear)
 * - type: Updated type
 * - status: Updated status
 * - settings: Updated settings (partial)
 * - techStack: Updated tech stack (partial)
 * - icon: Updated icon (null to clear)
 * - color: Updated color (null to clear)
 * - tags: Updated tags array
 *
 * Returns: Updated project
 */
router.patch(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Project ID is required')
    }

    // Validate request body
    const parseResult = projectUpdateSchema.safeParse(req.body)

    if (!parseResult.success) {
      throw ApiError.badRequest(
        'Invalid request body',
        parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const updateData = parseResult.data

    // Check if project exists
    const existsResult = await projectStorage.findById(id)
    if (!existsResult.success) {
      throw ApiError.internal(existsResult.error ?? 'Failed to check project')
    }
    if (!existsResult.data) {
      throw ApiError.notFound(`Project not found: ${id}`)
    }

    // Check if updating name conflicts with existing project
    if (updateData.name && updateData.name !== existsResult.data.name) {
      const nameCheckResult = await projectStorage.findByName(updateData.name)
      if (nameCheckResult.success && nameCheckResult.data) {
        throw ApiError.conflict(`Project with name "${updateData.name}" already exists`)
      }
    }

    // Build update object - use type assertion to bypass exactOptionalPropertyTypes
    // This is safe because we only set defined values
    const projectUpdate = {} as Record<string, unknown>

    if (updateData.name !== undefined) projectUpdate['name'] = updateData.name
    if (updateData.description !== undefined && updateData.description !== null) {
      projectUpdate['description'] = updateData.description
    }
    if (updateData.type !== undefined) projectUpdate['type'] = updateData.type
    if (updateData.status !== undefined) projectUpdate['status'] = updateData.status
    // Filter out undefined values from settings to satisfy exact types
    if (updateData.settings !== undefined) {
      const settings: Record<string, unknown> = {}
      const s = updateData.settings
      if (s.defaultModel !== undefined) settings['defaultModel'] = s.defaultModel
      if (s.defaultPermissionMode !== undefined) settings['defaultPermissionMode'] = s.defaultPermissionMode
      if (s.defaultThinkingLevel !== undefined) settings['defaultThinkingLevel'] = s.defaultThinkingLevel
      if (s.autoCommit !== undefined) settings['autoCommit'] = s.autoCommit
      if (s.autoPush !== undefined) settings['autoPush'] = s.autoPush
      if (s.customLabels !== undefined) settings['customLabels'] = s.customLabels
      if (s.customStatuses !== undefined) settings['customStatuses'] = s.customStatuses
      if (Object.keys(settings).length > 0) {
        projectUpdate['settings'] = settings
      }
    }
    // Filter out undefined values from techStack to satisfy exact types
    if (updateData.techStack !== undefined) {
      const techStack: Record<string, string[]> = {}
      const ts = updateData.techStack
      if (ts.languages) techStack['languages'] = ts.languages
      if (ts.frameworks) techStack['frameworks'] = ts.frameworks
      if (ts.databases) techStack['databases'] = ts.databases
      if (ts.uiLibraries) techStack['uiLibraries'] = ts.uiLibraries
      if (ts.buildTools) techStack['buildTools'] = ts.buildTools
      if (ts.testingFrameworks) techStack['testingFrameworks'] = ts.testingFrameworks
      if (ts.other) techStack['other'] = ts.other
      if (Object.keys(techStack).length > 0) {
        projectUpdate['techStack'] = techStack
      }
    }
    // Handle null values for icon and color (only set if actual string value)
    if (updateData.icon !== undefined && updateData.icon !== null) {
      projectUpdate['icon'] = updateData.icon
    }
    if (updateData.color !== undefined && updateData.color !== null) {
      projectUpdate['color'] = updateData.color
    }
    if (updateData.tags !== undefined) projectUpdate['tags'] = updateData.tags

    // Update project (cast to ProjectUpdate for type safety at storage layer)
    const result = await projectStorage.updateProject(id, projectUpdate as ProjectUpdate)

    if (!result.success) {
      throw ApiError.internal(result.error ?? 'Failed to update project')
    }

    // Return updated project
    res.json(success(result.data))
  })
)

/**
 * DELETE /api/projects/:id
 * Soft delete a project (sets status to deleted)
 * Hard delete is not recommended - data may be needed for recovery
 *
 * Path Parameters:
 * - id: Project ID
 *
 * Query Parameters:
 * - hard: Set to 'true' for permanent deletion (optional)
 *
 * Returns: Success response or 204 No Content for hard delete
 */
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined
    const hardDelete = req.query['hard'] === 'true'

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Project ID is required')
    }

    // Check if project exists
    const existsResult = await projectStorage.findById(id)
    if (!existsResult.success) {
      throw ApiError.internal(existsResult.error ?? 'Failed to check project')
    }
    if (!existsResult.data) {
      throw ApiError.notFound(`Project not found: ${id}`)
    }

    if (hardDelete) {
      // Permanent deletion
      const deleteResult = await projectStorage.delete(id)

      if (!deleteResult.success) {
        throw ApiError.internal(deleteResult.error ?? 'Failed to delete project')
      }

      res.status(204).send()
    } else {
      // Soft delete - set status to deleted
      const updateResult = await projectStorage.updateProject(id, { status: 'deleted' })

      if (!updateResult.success) {
        throw ApiError.internal(updateResult.error ?? 'Failed to delete project')
      }

      res.json(success({ message: 'Project deleted', project: updateResult.data }))
    }
  })
)

/**
 * POST /api/projects/:id/archive
 * Archive a project (sets status to archived)
 *
 * Path Parameters:
 * - id: Project ID
 *
 * Returns: Updated project with archived status
 */
router.post(
  '/:id/archive',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Project ID is required')
    }

    // Archive project
    const result = await projectStorage.archiveProject(id)

    if (!result.success) {
      // Check if it's a not found error
      if (result.error?.includes('not found')) {
        throw ApiError.notFound(`Project not found: ${id}`)
      }
      throw ApiError.internal(result.error ?? 'Failed to archive project')
    }

    // Return archived project
    res.json(success(result.data))
  })
)

/**
 * POST /api/projects/:id/restore
 * Restore an archived or deleted project (sets status to active)
 *
 * Path Parameters:
 * - id: Project ID
 *
 * Returns: Updated project with active status
 */
router.post(
  '/:id/restore',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Project ID is required')
    }

    // Check if project exists
    const existsResult = await projectStorage.findById(id)
    if (!existsResult.success) {
      throw ApiError.internal(existsResult.error ?? 'Failed to check project')
    }
    if (!existsResult.data) {
      throw ApiError.notFound(`Project not found: ${id}`)
    }

    // Only allow restore for archived or deleted projects
    if (existsResult.data.status === 'active') {
      throw ApiError.badRequest('Project is already active')
    }

    // Restore project
    const result = await projectStorage.updateProject(id, { status: 'active' })

    if (!result.success) {
      throw ApiError.internal(result.error ?? 'Failed to restore project')
    }

    // Return restored project
    res.json(success(result.data))
  })
)

export { router as projectsRouter }
export default router
