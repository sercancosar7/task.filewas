/**
 * Changelog Routes
 * Project changelog API endpoints
 * @module @task-filewas/backend/routes/changelog
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { authMiddleware } from '../middleware/auth.js'
import { ApiError, asyncHandler } from '../middleware/index.js'
import { success } from '../utils/apiResponse.js'
import type { ChangelogEntry, ChangelogFilterOptions } from '@task-filewas/shared'

const router: RouterType = Router()

// =============================================================================
// Helpers
// =============================================================================

/**
 * Project changelogs are stored in:
 * projects/{projectId}/docs/{version}/changelog.jsonl
 *
 * Each line is a JSON object:
 * {"type":"entry", "phase": 1, "date": "2026-01-15", "title": "...", "changes": [...], "files": [...]}
 */

interface ChangelogJsonlEntry {
  type: 'entry' | 'header'
  phase?: number
  date?: string
  title?: string
  changes?: string[]
  files?: string[]
}

/**
 * Get the active version for a project
 * Default: v0.1.0
 */
async function getActiveVersion(projectPath: string): Promise<string> {
  // Check for versions in docs directory
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
 * Read and parse changelog.jsonl file
 */
async function readChangelogFile(projectPath: string, version: string): Promise<ChangelogEntry[]> {
  const changelogPath = join(projectPath, 'docs', version, 'changelog.jsonl')

  try {
    const content = await fs.readFile(changelogPath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    const entries: ChangelogEntry[] = []

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as ChangelogJsonlEntry

        // Skip non-entry lines
        if (parsed.type !== 'entry') continue
        if (parsed.phase === undefined) continue

        const phaseNum = parsed.phase ?? 0
        // Use fallback values for optional fields with type assertions
        const dateValue = (parsed.date || new Date().toISOString().split('T')[0]) as string
        const titleValue = (parsed.title || `Faz ${phaseNum}`) as string
        const changesArr = (parsed.changes || []) as string[]
        const filesArr = (parsed.files || []) as string[]

        entries.push({
          id: `phase-${phaseNum}`,
          phase: phaseNum,
          date: dateValue,
          title: titleValue,
          changes: changesArr,
          files: filesArr,
        })
      } catch {
        // Skip invalid JSON lines
        continue
      }
    }

    return entries
  } catch (error) {
    // File doesn't exist or is unreadable
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

/**
 * Apply filters to changelog entries
 */
function applyFilters(
  entries: ChangelogEntry[],
  filters: Partial<ChangelogFilterOptions>
): ChangelogEntry[] {
  let filtered = [...entries]

  // Phase filter
  if (filters.phase !== undefined) {
    filtered = filtered.filter(e => e.phase === filters.phase)
  }

  // Date range filter
  if (filters.dateFrom) {
    filtered = filtered.filter(e => e.date >= filters.dateFrom!)
  }
  if (filters.dateTo) {
    filtered = filtered.filter(e => e.date <= filters.dateTo!)
  }

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(e =>
      e.title.toLowerCase().includes(searchLower) ||
      e.changes.some(c => c.toLowerCase().includes(searchLower))
    )
  }

  // Sort by phase descending (newest first)
  filtered.sort((a, b) => b.phase - a.phase)

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
function buildFilters(query: Record<string, unknown>): Partial<ChangelogFilterOptions> {
  const filters: Partial<ChangelogFilterOptions> = {}

  if (query['phase'] !== undefined) {
    filters.phase = Number(query['phase'])
  }
  if (typeof query['dateFrom'] === 'string') {
    filters.dateFrom = query['dateFrom']
  }
  if (typeof query['dateTo'] === 'string') {
    filters.dateTo = query['dateTo']
  }
  if (typeof query['search'] === 'string') {
    filters.search = query['search']
  }
  if (query['limit'] !== undefined) {
    filters.limit = Number(query['limit'])
  }
  if (query['offset'] !== undefined) {
    filters.offset = Number(query['offset'])
  }

  return filters
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/projects/:id/changelog
 * Get changelog entries for a project
 *
 * Path Parameters:
 * - id: Project ID
 *
 * Query Parameters:
 * - phase: Filter by phase number (optional)
 * - dateFrom: Filter by date range start (YYYY-MM-DD) (optional)
 * - dateTo: Filter by date range end (YYYY-MM-DD) (optional)
 * - search: Search in title and changes (optional)
 * - limit: Max number of results (optional)
 * - offset: Skip first N results (optional)
 *
 * Returns: Array of changelog entries
 */
router.get(
  '/projects/:id/changelog',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params['id'] as string

    if (!projectId) {
      throw ApiError.badRequest('Project ID is required')
    }

    // Get project path from project storage
    // For now, construct the path directly
    const projectPath = join(process.cwd(), 'projects', projectId)

    // Check if project exists
    try {
      await fs.access(projectPath)
    } catch {
      throw ApiError.notFound(`Project not found: ${projectId}`)
    }

    // Get active version
    const version = await getActiveVersion(projectPath)

    // Read changelog file
    const entries = await readChangelogFile(projectPath, version)

    // Build and apply filters
    const filters = buildFilters(req.query as Record<string, unknown>)
    const filtered = applyFilters(entries, filters)

    // Return with metadata
    res.json(success({
      entries: filtered,
      meta: {
        total: entries.length,
        filtered: filtered.length,
        version,
        projectPath: projectId,
      }
    }))
  })
)

/**
 * GET /api/projects/:id/changelog/version/:version
 * Get changelog entries for a specific version
 *
 * Path Parameters:
 * - id: Project ID
 * - version: Version (e.g., v0.1.0)
 *
 * Query Parameters: Same as /projects/:id/changelog
 *
 * Returns: Array of changelog entries for the specified version
 */
router.get(
  '/projects/:id/changelog/version/:version',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params['id'] as string
    const version = req.params['version'] as string

    if (!projectId || !version) {
      throw ApiError.badRequest('Project ID and version are required')
    }

    const projectPath = join(process.cwd(), 'projects', projectId)

    // Check if project exists
    try {
      await fs.access(projectPath)
    } catch {
      throw ApiError.notFound(`Project not found: ${projectId}`)
    }

    // Read changelog file for specific version
    const entries = await readChangelogFile(projectPath, version)

    // Build and apply filters
    const filters = buildFilters(req.query as Record<string, unknown>)
    const filtered = applyFilters(entries, filters)

    res.json(success({
      entries: filtered,
      meta: {
        total: entries.length,
        filtered: filtered.length,
        version,
        projectPath: projectId,
      }
    }))
  })
)

/**
 * GET /api/projects/:id/changelog/versions
 * List available changelog versions for a project
 *
 * Path Parameters:
 * - id: Project ID
 *
 * Returns: Array of available versions
 */
router.get(
  '/projects/:id/changelog/versions',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params['id'] as string

    if (!projectId) {
      throw ApiError.badRequest('Project ID is required')
    }

    const projectPath = join(process.cwd(), 'projects', projectId)
    const docsDir = join(projectPath, 'docs')

    // Check if project exists
    try {
      await fs.access(projectPath)
    } catch {
      throw ApiError.notFound(`Project not found: ${projectId}`)
    }

    // Get versions
    const versions = await getActiveVersion(projectPath)
    const allVersions = [versions]

    // Try to find all version directories
    try {
      const entries = await fs.readdir(docsDir, { withFileTypes: true })
      const versionDirs = entries
        .filter(e => e.isDirectory() && e.name.startsWith('v'))
        .map(e => e.name)
        .sort((a, b) => b.localeCompare(a)) // Descending

      // Get unique versions (excluding duplicates)
      const uniqueVersions = Array.from(new Set(versionDirs))

      // Check if each version has a changelog file
      const versionsWithChangelog: string[] = []
      for (const v of uniqueVersions) {
        try {
          const changelogPath = join(projectPath, 'docs', v, 'changelog.jsonl')
          await fs.access(changelogPath)
          versionsWithChangelog.push(v)
        } catch {
          // Changelog doesn't exist for this version
        }
      }

      if (versionsWithChangelog.length > 0) {
        allVersions.length = 0
        allVersions.push(...versionsWithChangelog)
      }
    } catch {
      // Docs directory doesn't exist, use default version
    }

    res.json(success({
      versions: allVersions,
      active: versions,
      meta: {
        total: allVersions.length,
      }
    }))
  })
)

export { router as changelogRouter }
export default router
