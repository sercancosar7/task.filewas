/**
 * Roadmap Routes
 * Project roadmap API endpoints
 * @module @task-filewas/backend/routes/roadmap
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { authMiddleware } from '../middleware/auth.js'
import { ApiError, asyncHandler } from '../middleware/index.js'
import { success } from '../utils/apiResponse.js'
import type {
  Roadmap,
  RoadmapProgress,
  Phase,
  RoadmapFilterOptions,
  PhaseStatus,
} from '@task-filewas/shared'

const router: RouterType = Router()

// =============================================================================
// Helpers
// =============================================================================

/**
 * Project roadmaps are stored in:
 * projects/{projectId}/docs/{version}/{version}-roadmaps.json
 *
 * File format (JSON):
 * {
 *   "projectName": "...",
 *   "version": "0.1.0",
 *   "currentPhase": 1,
 *   "totalPhases": 100,
 *   "description": "...",
 *   "milestones": [...],
 *   "phases": [...]
 * }
 */

/**
 * Get the active version for a project
 * Default: v0.1.0
 */
async function getActiveVersion(projectPath: string): Promise<string> {
  const docsDir = join(projectPath, 'docs')
  try {
    const entries = await fs.readdir(docsDir, { withFileTypes: true })
    const versionDirs = entries
      .filter(e => e.isDirectory() && e.name.startsWith('v'))
      .map(e => e.name)
      .sort((a, b) => b.localeCompare(a)) // Descending

    return versionDirs[0] || 'v0.1.0'
  } catch {
    return 'v0.1.0'
  }
}

/**
 * Read and parse roadmap JSON file
 */
async function readRoadmapFile(projectPath: string, version: string): Promise<Roadmap> {
  const roadmapPath = join(projectPath, 'docs', `${version}-roadmaps.json`)

  try {
    const content = await fs.readFile(roadmapPath, 'utf-8')
    const roadmap = JSON.parse(content) as Roadmap
    return roadmap
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Return empty roadmap if file doesn't exist
      return {
        projectName: 'Unknown Project',
        version: version.replace('v', ''),
        currentPhase: 1,
        totalPhases: 0,
        milestones: [],
        phases: [],
      }
    }
    throw error
  }
}

/**
 * Calculate roadmap progress statistics
 */
function calculateProgress(roadmap: Roadmap): RoadmapProgress {
  const total = roadmap.phases.length
  const completed = roadmap.phases.filter(p => p.status === 'completed').length
  const inProgress = roadmap.phases.filter(p => p.status === 'in_progress').length
  const pending = roadmap.phases.filter(p => p.status === 'pending').length
  const percentage = total > 0 ? (completed / total) * 100 : 0

  return { total, completed, inProgress, pending, percentage }
}

/**
 * Apply filters to phases
 */
function applyFilters(
  phases: Phase[],
  filters: Partial<RoadmapFilterOptions>
): Phase[] {
  let filtered = [...phases]

  // Status filter
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
    filtered = filtered.filter(p => statuses.includes(p.status))
  }

  // Milestone filter
  if (filters.milestoneId !== undefined) {
    // Need roadmap to get milestone phases, will be handled in route
  }

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      (p.description && p.description.toLowerCase().includes(searchLower))
    )
  }

  // Pagination
  const offset = filters.offset || 0
  const limit = filters.limit

  if (offset > 0) {
    filtered = filtered.slice(offset)
  }
  if (limit !== undefined) {
    filtered = filtered.slice(0, limit)
  }

  return filtered
}

/**
 * Build filter object from query parameters
 */
function buildFilters(query: Record<string, unknown>): Partial<RoadmapFilterOptions> {
  const filters: Partial<RoadmapFilterOptions> = {}

  if (query['status']) {
    const statusStr = query['status'] as string
    if (statusStr.includes(',')) {
      filters.status = statusStr.split(',') as PhaseStatus[]
    } else {
      filters.status = statusStr as PhaseStatus
    }
  }
  if (query['milestoneId']) {
    filters.milestoneId = Number(query['milestoneId'])
  }
  if (typeof query['search'] === 'string') {
    filters.search = query['search']
  }
  if (query['limit']) {
    filters.limit = Number(query['limit'])
  }
  if (query['offset']) {
    filters.offset = Number(query['offset'])
  }

  return filters
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/projects/:id/roadmap
 * Get roadmap for a project
 *
 * Path Parameters:
 * - id: Project ID
 *
 * Query Parameters:
 * - status: Filter by phase status (optional, comma-separated for multiple)
 * - milestoneId: Filter by milestone ID (optional)
 * - search: Search in name and description (optional)
 * - limit: Max number of results (optional)
 * - offset: Skip first N results (optional)
 *
 * Returns: Roadmap data with progress statistics
 */
router.get(
  '/projects/:id/roadmap',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params['id'] as string

    if (!projectId) {
      throw ApiError.badRequest('Project ID is required')
    }

    // Get project path
    const projectPath = join(process.cwd(), 'projects', projectId)

    // Check if project exists
    try {
      await fs.access(projectPath)
    } catch {
      throw ApiError.notFound(`Project not found: ${projectId}`)
    }

    // Get active version
    const version = await getActiveVersion(projectPath)

    // Read roadmap file
    const roadmap = await readRoadmapFile(projectPath, version)

    // Calculate progress
    const progress = calculateProgress(roadmap)

    // Build and apply filters
    const filters = buildFilters(req.query as Record<string, unknown>)
    let filteredPhases = applyFilters(roadmap.phases, filters)

    // Milestone filter (needs to be applied after getting roadmap)
    if (filters.milestoneId !== undefined) {
      const milestone = roadmap.milestones.find(m => m.id === filters.milestoneId)
      if (milestone) {
        filteredPhases = filteredPhases.filter(p => milestone.phases.includes(p.id))
      }
    }

    // Return with metadata
    res.json(success({
      roadmap: {
        ...roadmap,
        phases: filteredPhases, // Return filtered phases
      },
      progress,
      meta: {
        totalPhases: roadmap.phases.length,
        filteredPhases: filteredPhases.length,
        version,
        currentPhase: roadmap.currentPhase,
      }
    }))
  })
)

/**
 * GET /api/projects/:id/roadmap/version/:version
 * Get roadmap for a specific version
 *
 * Path Parameters:
 * - id: Project ID
 * - version: Version (e.g., 0.1.0)
 *
 * Query Parameters: Same as /projects/:id/roadmap
 *
 * Returns: Roadmap data for the specified version
 */
router.get(
  '/projects/:id/roadmap/version/:version',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params['id'] as string
    const versionInput = req.params['version'] as string

    if (!projectId || !versionInput) {
      throw ApiError.badRequest('Project ID and version are required')
    }

    const projectPath = join(process.cwd(), 'projects', projectId)

    // Check if project exists
    try {
      await fs.access(projectPath)
    } catch {
      throw ApiError.notFound(`Project not found: ${projectId}`)
    }

    // Normalize version (add 'v' prefix if needed)
    const version = versionInput.startsWith('v') ? versionInput : `v${versionInput}`

    // Read roadmap file
    const roadmap = await readRoadmapFile(projectPath, version)

    // Calculate progress
    const progress = calculateProgress(roadmap)

    // Build and apply filters
    const filters = buildFilters(req.query as Record<string, unknown>)
    let filteredPhases = applyFilters(roadmap.phases, filters)

    if (filters.milestoneId !== undefined) {
      const milestone = roadmap.milestones.find(m => m.id === filters.milestoneId)
      if (milestone) {
        filteredPhases = filteredPhases.filter(p => milestone.phases.includes(p.id))
      }
    }

    res.json(success({
      roadmap: {
        ...roadmap,
        phases: filteredPhases,
      },
      progress,
      meta: {
        totalPhases: roadmap.phases.length,
        filteredPhases: filteredPhases.length,
        version,
        currentPhase: roadmap.currentPhase,
      }
    }))
  })
)

/**
 * GET /api/projects/:id/roadmap/progress
 * Get roadmap progress statistics
 *
 * Path Parameters:
 * - id: Project ID
 *
 * Returns: Progress statistics and milestone progress
 */
router.get(
  '/projects/:id/roadmap/progress',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params['id'] as string

    if (!projectId) {
      throw ApiError.badRequest('Project ID is required')
    }

    const projectPath = join(process.cwd(), 'projects', projectId)

    try {
      await fs.access(projectPath)
    } catch {
      throw ApiError.notFound(`Project not found: ${projectId}`)
    }

    const version = await getActiveVersion(projectPath)
    const roadmap = await readRoadmapFile(projectPath, version)

    // Overall progress
    const progress = calculateProgress(roadmap)

    // Milestone progress
    const milestoneProgress = roadmap.milestones.map(milestone => {
      const total = milestone.phases.length
      const completed = milestone.phases
        .map(phaseId => roadmap.phases.find(p => p.id === phaseId))
        .filter(p => p && p.status === 'completed').length
      const percentage = total > 0 ? (completed / total) * 100 : 0

      return {
        id: milestone.id,
        name: milestone.name,
        total,
        completed,
        percentage,
      }
    })

    res.json(success({
      progress,
      milestoneProgress,
      currentPhase: roadmap.currentPhase,
      totalPhases: roadmap.totalPhases,
    }))
  })
)

/**
 * GET /api/projects/:id/roadmap/milestones
 * Get milestones for a project
 *
 * Path Parameters:
 * - id: Project ID
 *
 * Returns: Array of milestones with progress
 */
router.get(
  '/projects/:id/roadmap/milestones',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params['id'] as string

    if (!projectId) {
      throw ApiError.badRequest('Project ID is required')
    }

    const projectPath = join(process.cwd(), 'projects', projectId)

    try {
      await fs.access(projectPath)
    } catch {
      throw ApiError.notFound(`Project not found: ${projectId}`)
    }

    const version = await getActiveVersion(projectPath)
    const roadmap = await readRoadmapFile(projectPath, version)

    // Milestones with progress
    const milestonesWithProgress = roadmap.milestones.map(milestone => {
      const total = milestone.phases.length
      const completed = milestone.phases
        .map(phaseId => roadmap.phases.find(p => p.id === phaseId))
        .filter(p => p && p.status === 'completed').length
      const percentage = total > 0 ? (completed / total) * 100 : 0

      return {
        ...milestone,
        totalPhases: total,
        completedPhases: completed,
        progress: percentage,
      }
    })

    res.json(success({
      milestones: milestonesWithProgress,
      currentPhase: roadmap.currentPhase,
    }))
  })
)

/**
 * GET /api/projects/:id/roadmap/phases/:phaseId
 * Get a specific phase
 *
 * Path Parameters:
 * - id: Project ID
 * - phaseId: Phase ID
 *
 * Returns: Phase details
 */
router.get(
  '/projects/:id/roadmap/phases/:phaseId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params['id'] as string
    const phaseId = Number(req.params['phaseId'])

    if (!projectId || !phaseId) {
      throw ApiError.badRequest('Project ID and Phase ID are required')
    }

    const projectPath = join(process.cwd(), 'projects', projectId)

    try {
      await fs.access(projectPath)
    } catch {
      throw ApiError.notFound(`Project not found: ${projectId}`)
    }

    const version = await getActiveVersion(projectPath)
    const roadmap = await readRoadmapFile(projectPath, version)

    const phase = roadmap.phases.find(p => p.id === phaseId)

    if (!phase) {
      throw ApiError.notFound(`Phase not found: ${phaseId}`)
    }

    res.json(success({
      phase,
      currentPhase: roadmap.currentPhase,
      isCurrent: phaseId === roadmap.currentPhase,
    }))
  })
)

export { router as roadmapRouter }
export default router
