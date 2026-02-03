/**
 * Project Routes
 * Project CRUD API endpoints
 * @module @task-filewas/backend/routes/projects
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { z } from 'zod'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { authMiddleware } from '../middleware/auth.js'
import { ApiError, asyncHandler } from '../middleware/index.js'
import { paginated, created, success, parsePaginationParams } from '../utils/apiResponse.js'
import { projectStorage } from '../services/project-storage.js'
// @ts-ignore - pnpm workspace issue
import type {
  ProjectSummary,
  ProjectStatus,
  ProjectType,
  ProjectCreate,
  ProjectUpdate,
} from '@task-filewas/shared'
import {
  analyzeTechStack,
  cloneRepo,
  createRepo,
  initGitRepo,
  addRemote,
  parseGitHubUrl,
  type CreateRepoOptions,
  type GitHubRepoVisibility,
} from '../services/github.js'

const router: RouterType = Router()

// =============================================================================
// Validation Schemas
// =============================================================================

/**
 * Local project create schema
 */
const techStackSchema = z.object({
  languages: z.array(z.string()).optional(),
  frameworks: z.array(z.string()).optional(),
  databases: z.array(z.string()).optional(),
  uiLibraries: z.array(z.string()).optional(),
  buildTools: z.array(z.string()).optional(),
  testingFrameworks: z.array(z.string()).optional(),
  other: z.array(z.string()).optional(),
}).optional()

const settingsSchema = z.object({
  defaultModel: z.enum(['claude', 'glm', 'auto']).optional(),
  defaultPermissionMode: z.enum(['safe', 'ask', 'auto']).optional(),
  defaultThinkingLevel: z.enum(['off', 'think', 'max']).optional(),
  autoCommit: z.boolean().optional(),
  autoPush: z.boolean().optional(),
  customLabels: z.array(z.string()).optional(),
  customStatuses: z.array(z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
    color: z.string(),
  })).optional(),
}).optional()

const projectCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  type: z.enum(['web', 'backend', 'fullstack', 'mobile', 'cli', 'library', 'monorepo', 'other']).optional(),
  gitRemote: z.string().optional(),
  path: z.string().optional(),
  githubUrl: z.string().optional(),
  techStack: techStackSchema,
  settings: settingsSchema,
  icon: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

/**
 * Local project update schema
 */
const projectUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  type: z.enum(['web', 'backend', 'fullstack', 'mobile', 'cli', 'library', 'monorepo', 'other']).optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
  path: z.string().optional(),
  gitRemote: z.string().optional(),
  githubUrl: z.string().optional(),
  techStack: techStackSchema,
  settings: settingsSchema,
  icon: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
})

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

// =============================================================================
// GitHub Integration Routes
// =============================================================================

/**
 * Validation schema for create-repo endpoint
 */
const createRepoSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'private']).optional(),
  type: z.enum(['web', 'backend', 'fullstack', 'mobile', 'cli', 'library', 'monorepo', 'other']).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

/**
 * POST /api/projects/create-repo
 * Create a new GitHub repository and local project
 *
 * Request Body:
 * - name: Repository name (required)
 * - description: Repository description (optional)
 * - visibility: 'public' or 'private' (default: private)
 * - type: Project type (optional)
 * - icon: Project icon (optional)
 * - color: Project color (optional)
 * - tags: Project tags (optional)
 *
 * Returns: Created project with GitHub info
 */
router.post(
  '/create-repo',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const parseResult = createRepoSchema.safeParse(req.body)

    if (!parseResult.success) {
      throw ApiError.badRequest(
        'Invalid request body',
        parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const data = parseResult.data

    // Check if project with same name already exists
    const existingResult = await projectStorage.findByName(data.name)
    if (existingResult.success && existingResult.data) {
      throw ApiError.conflict(`Project with name "${data.name}" already exists`)
    }

    // Create GitHub repository
    const repoOptions: CreateRepoOptions = {
      name: data.name,
      visibility: (data.visibility as GitHubRepoVisibility) || 'private',
      autoInit: true,
      gitignoreTemplate: 'Node',
    }

    // Add description if provided
    if (data.description) {
      repoOptions.description = data.description
    }

    const repoResult = await createRepo(repoOptions)

    if (!repoResult.success) {
      throw ApiError.internal(repoResult.error ?? 'Failed to create GitHub repository')
    }

    const repo = repoResult.data

    // Create project directory
    const projectsDir = join(process.cwd(), 'projects')
    await fs.mkdir(projectsDir, { recursive: true })

    const projectPath = join(projectsDir, repo.name)
    await fs.mkdir(projectPath, { recursive: true })

    // Initialize git repository
    const initResult = await initGitRepo(projectPath)
    if (!initResult.success) {
      throw ApiError.internal(initResult.error ?? 'Failed to initialize git repository')
    }

    // Add GitHub remote
    const remoteResult = await addRemote(projectPath, 'origin', repo.sshUrl)
    if (!remoteResult.success) {
      throw ApiError.internal(remoteResult.error ?? 'Failed to add git remote')
    }

    // Copy .task directory from platform root
    const taskSourceDir = join(process.cwd(), '.task')
    const taskTargetDir = join(projectPath, '.task')

    try {
      await fs.mkdir(taskTargetDir, { recursive: true })

      // Copy all files from .task to project
      const entries = await fs.readdir(taskSourceDir, { withFileTypes: true })
      for (const entry of entries) {
        const srcPath = join(taskSourceDir, entry.name)
        const destPath = join(taskTargetDir, entry.name)

        if (entry.isDirectory()) {
          await fs.mkdir(destPath, { recursive: true })
          const subEntries = await fs.readdir(srcPath)
          for (const subEntry of subEntries) {
            const subSrcPath = join(srcPath, subEntry)
            const subDestPath = join(destPath, subEntry)
            await fs.copyFile(subSrcPath, subDestPath)
          }
        } else {
          await fs.copyFile(srcPath, destPath)
        }
      }
    } catch (error) {
      // Non-fatal: log error but continue
      console.error('Failed to copy .task directory:', error)
    }

    // Create project in storage
    const projectCreateData: ProjectCreate = {
      name: repo.name,
      type: data.type || 'other',
      path: projectPath,
      githubUrl: repo.htmlUrl,
    }

    if (data.description) {
      projectCreateData.description = data.description
    }

    if (data.icon) {
      projectCreateData.icon = data.icon
    }

    if (data.color) {
      projectCreateData.color = data.color
    }

    if (data.tags && data.tags.length > 0) {
      projectCreateData.tags = data.tags
    }

    const createResult = await projectStorage.createProject(projectCreateData)

    if (!createResult.success) {
      throw ApiError.internal(createResult.error ?? 'Failed to create project')
    }

    // Add GitHub info to the created project
    const project = createResult.data
    project.github = {
      owner: repo.owner.login,
      repo: repo.name,
      url: repo.htmlUrl,
      defaultBranch: repo.defaultBranch ?? 'main',
      autoPush: false,
    }

    // Return created project with GitHub info
    res.status(201).json(created(project))
  })
)

/**
 * Validation schema for import-repo endpoint
 */
const importRepoSchema = z.object({
  url: z.string().url('Invalid GitHub URL'),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  type: z.enum(['web', 'backend', 'fullstack', 'mobile', 'cli', 'library', 'monorepo', 'other']).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

/**
 * POST /api/projects/import
 * Import an existing GitHub repository
 *
 * Request Body:
 * - url: GitHub repository URL (required)
 * - name: Project name (optional, defaults to repo name)
 * - description: Project description (optional)
 * - type: Project type (optional)
 * - icon: Project icon (optional)
 * - color: Project color (optional)
 * - tags: Project tags (optional)
 *
 * Returns: Created project with imported repo info
 */
router.post(
  '/import',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const parseResult = importRepoSchema.safeParse(req.body)

    if (!parseResult.success) {
      throw ApiError.badRequest(
        'Invalid request body',
        parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const data = parseResult.data

    // Parse GitHub URL to extract owner/repo
    const parsed = parseGitHubUrl(data.url)
    if (!parsed) {
      throw ApiError.badRequest('Invalid GitHub URL. Expected format: https://github.com/owner/repo')
    }

    const { owner, repo } = parsed
    const projectName = data.name || repo

    // Check if project with same name already exists
    const existingResult = await projectStorage.findByName(projectName)
    if (existingResult.success && existingResult.data) {
      throw ApiError.conflict(`Project with name "${projectName}" already exists`)
    }

    // Create project directory
    const projectsDir = join(process.cwd(), 'projects')
    await fs.mkdir(projectsDir, { recursive: true })

    const projectPath = join(projectsDir, projectName)

    // Check if directory already exists
    try {
      await fs.access(projectPath)
      throw ApiError.conflict(`Project directory already exists: ${projectName}`)
    } catch {
      // Directory doesn't exist, continue
    }

    // Clone the repository
    const cloneUrl = `https://github.com/${owner}/${repo}.git`
    const cloneResult = await cloneRepo(cloneUrl, projectPath)

    if (!cloneResult.success) {
      throw ApiError.internal(cloneResult.error ?? 'Failed to clone repository')
    }

    // Copy .task directory from platform root
    const taskSourceDir = join(process.cwd(), '.task')
    const taskTargetDir = join(projectPath, '.task')

    try {
      await fs.mkdir(taskTargetDir, { recursive: true })

      // Copy all files from .task to project
      const entries = await fs.readdir(taskSourceDir, { withFileTypes: true })
      for (const entry of entries) {
        const srcPath = join(taskSourceDir, entry.name)
        const destPath = join(taskTargetDir, entry.name)

        if (entry.isDirectory()) {
          await fs.mkdir(destPath, { recursive: true })
          const subEntries = await fs.readdir(srcPath)
          for (const subEntry of subEntries) {
            const subSrcPath = join(srcPath, subEntry)
            const subDestPath = join(destPath, subEntry)
            await fs.copyFile(subSrcPath, subDestPath)
          }
        } else {
          await fs.copyFile(srcPath, destPath)
        }
      }
    } catch (error) {
      // Non-fatal: log error but continue
      console.error('Failed to copy .task directory:', error)
    }

    // Analyze tech stack (optional, non-fatal)
    let detectedProjectType: ProjectType | undefined = data.type
    let detectedTechStack: ProjectCreate['techStack'] | undefined = undefined

    const analysisResult = await analyzeTechStack(projectPath)
    if (analysisResult.success && analysisResult.data) {
      const analysis = analysisResult.data

      // Use detected project type if not provided
      if (!data.type && analysis.projectType) {
        detectedProjectType = analysis.projectType
      }

      // Build tech stack from analysis
      const techStack: Record<string, string[]> = {}
      if (analysis.languages) techStack['languages'] = analysis.languages
      if (analysis.frameworks) techStack['frameworks'] = analysis.frameworks
      if (analysis.buildTools) techStack['buildTools'] = analysis.buildTools
      if (analysis.packageManagers) techStack['packageManagers'] = analysis.packageManagers

      if (Object.keys(techStack).length > 0) {
        detectedTechStack = techStack as ProjectCreate['techStack']
      }
    }

    // Create project in storage
    const projectCreateData: ProjectCreate = {
      name: projectName,
      type: detectedProjectType || 'other',
      path: projectPath,
      githubUrl: data.url,
    }

    // Add detected tech stack
    if (detectedTechStack) {
      projectCreateData.techStack = detectedTechStack
    }

    if (data.description) {
      projectCreateData.description = data.description
    }

    if (data.icon) {
      projectCreateData.icon = data.icon
    }

    if (data.color) {
      projectCreateData.color = data.color
    }

    if (data.tags && data.tags.length > 0) {
      projectCreateData.tags = data.tags
    }

    const createResult = await projectStorage.createProject(projectCreateData)

    if (!createResult.success) {
      throw ApiError.internal(createResult.error ?? 'Failed to create project')
    }

    // Add GitHub info to the created project
    const project = createResult.data
    project.github = {
      owner,
      repo: projectName,
      url: data.url,
      defaultBranch: 'main',
      autoPush: false,
    }

    // Return created project with GitHub info
    res.status(201).json(created(project))
  })
)
