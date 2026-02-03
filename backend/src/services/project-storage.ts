/**
 * Project Storage Service
 * File-based storage for projects using JSON format
 * @module @task-filewas/backend/services/project-storage
 */

import { BaseStorageService } from './base-storage.js'
import type { StorageResult } from './base-storage.js'
import type {
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectSummary,
  ProjectStatus,
  ProjectType,
  TechStack,
  ProjectSettings,
} from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

/**
 * Filter options for projects
 */
export interface ProjectFilterOptions {
  /** Filter by status */
  status?: ProjectStatus | ProjectStatus[]
  /** Filter by type */
  type?: ProjectType | ProjectType[]
  /** Filter by tags (any match) */
  tags?: string[]
  /** Search in name and description */
  search?: string
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build TechStack object handling optional properties
 */
function buildTechStack(input?: Partial<TechStack>): TechStack | undefined {
  if (!input) return undefined

  const result: TechStack = {
    languages: input.languages ?? [],
    frameworks: input.frameworks ?? [],
  }

  // Only add optional properties if they have values
  if (input.databases && input.databases.length > 0) {
    result.databases = input.databases
  }
  if (input.uiLibraries && input.uiLibraries.length > 0) {
    result.uiLibraries = input.uiLibraries
  }
  if (input.buildTools && input.buildTools.length > 0) {
    result.buildTools = input.buildTools
  }
  if (input.testingFrameworks && input.testingFrameworks.length > 0) {
    result.testingFrameworks = input.testingFrameworks
  }
  if (input.other && input.other.length > 0) {
    result.other = input.other
  }

  return result
}

/**
 * Build ProjectSettings object handling optional properties
 */
function buildSettings(input?: Partial<ProjectSettings>): ProjectSettings {
  const result: ProjectSettings = {}

  if (input?.defaultModel) {
    result.defaultModel = input.defaultModel
  }
  if (input?.defaultPermissionMode) {
    result.defaultPermissionMode = input.defaultPermissionMode
  }
  if (input?.defaultThinkingLevel) {
    result.defaultThinkingLevel = input.defaultThinkingLevel
  }
  if (input?.autoCommit !== undefined) {
    result.autoCommit = input.autoCommit
  }
  if (input?.autoPush !== undefined) {
    result.autoPush = input.autoPush
  }
  if (input?.customLabels && input.customLabels.length > 0) {
    result.customLabels = input.customLabels
  }
  if (input?.customStatuses && input.customStatuses.length > 0) {
    result.customStatuses = input.customStatuses
  }

  return result
}

/**
 * Convert Project to ProjectSummary handling optional properties
 */
function toSummary(project: Project): ProjectSummary {
  const summary: ProjectSummary = {
    id: project.id,
    name: project.name,
    type: project.type,
    status: project.status,
    activeVersion: project.activeVersion,
    sessionCount: project.sessionCount,
  }

  // Only add optional properties if they exist
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
}

// =============================================================================
// Project Storage Service
// =============================================================================

/**
 * Project storage service using JSON format
 * Projects are stored in a single JSON file (array of projects)
 *
 * @example
 * ```typescript
 * const projectStorage = new ProjectStorageService()
 *
 * // Find active project
 * const result = await projectStorage.findActive()
 * if (result.success && result.data) {
 *   console.log('Active project:', result.data.name)
 * }
 *
 * // Create new project
 * const createResult = await projectStorage.createProject({
 *   name: 'My Project',
 *   type: 'fullstack',
 * })
 * ```
 */
export class ProjectStorageService extends BaseStorageService<Project> {
  constructor() {
    super({
      relativePath: 'projects.json',
      format: 'json',
      defaultValue: [],
      timestamps: true,
    })
  }

  // ===========================================================================
  // Project-Specific Methods
  // ===========================================================================

  /**
   * Find the currently active project
   * Active project has status: 'active' and is the most recently active
   * @returns Active project or null if none
   */
  async findActive(): Promise<StorageResult<Project | null>> {
    const result = await this.findAll({
      filter: (project) => project.status === 'active',
      sortBy: 'lastActivityAt',
      sortDirection: 'desc',
      limit: 1,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true, data: result.data[0] ?? null }
  }

  /**
   * Find all active projects
   * @returns Array of active projects
   */
  async findAllActive(): Promise<StorageResult<Project[]>> {
    return this.findWhere((project) => project.status === 'active')
  }

  /**
   * Find project by name (case-insensitive)
   * @param name Project name to search
   * @returns Project or null
   */
  async findByName(name: string): Promise<StorageResult<Project | null>> {
    const lowerName = name.toLowerCase()
    return this.findOne((project) => project.name.toLowerCase() === lowerName)
  }

  /**
   * Find project by path
   * @param path File system path to project
   * @returns Project or null
   */
  async findByPath(path: string): Promise<StorageResult<Project | null>> {
    return this.findOne((project) => project.path === path)
  }

  /**
   * Find projects by filter options
   * @param options Filter options
   * @returns Matching projects
   */
  async findByFilter(options: ProjectFilterOptions): Promise<StorageResult<Project[]>> {
    return this.findWhere((project) => {
      // Status filter
      if (options.status) {
        const statuses = Array.isArray(options.status) ? options.status : [options.status]
        if (!statuses.includes(project.status)) {
          return false
        }
      }

      // Type filter
      if (options.type) {
        const types = Array.isArray(options.type) ? options.type : [options.type]
        if (!types.includes(project.type)) {
          return false
        }
      }

      // Tags filter (any match)
      if (options.tags && options.tags.length > 0) {
        const projectTags = project.tags ?? []
        const hasMatch = options.tags.some((tag) => projectTags.includes(tag))
        if (!hasMatch) {
          return false
        }
      }

      // Search filter
      if (options.search) {
        const searchLower = options.search.toLowerCase()
        const nameMatch = project.name.toLowerCase().includes(searchLower)
        const descMatch = project.description?.toLowerCase().includes(searchLower) ?? false
        if (!nameMatch && !descMatch) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Create a new project
   * @param data Project creation data
   * @returns Created project
   */
  async createProject(data: ProjectCreate): Promise<StorageResult<Project>> {
    const now = new Date().toISOString()

    // Generate default path if not provided
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Build project data, only including defined properties
    const projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
      name: data.name,
      type: data.type ?? 'other',
      status: 'active',
      path: data.path ?? `projects/${slug}`,
      versions: [
        {
          version: '0.1.0',
          description: 'Initial version',
          createdAt: now,
          currentPhase: 0,
          totalPhases: 0,
          status: 'draft',
        },
      ],
      activeVersion: '0.1.0',
      settings: buildSettings(data.settings),
      sessionCount: 0,
      lastActivityAt: now,
    }

    // Add optional properties only if defined
    if (data.description) {
      projectData.description = data.description
    }

    const techStack = buildTechStack(data.techStack)
    if (techStack) {
      projectData.techStack = techStack
    }

    if (data.icon) {
      projectData.icon = data.icon
    }

    if (data.color) {
      projectData.color = data.color
    }

    if (data.tags && data.tags.length > 0) {
      projectData.tags = data.tags
    }

    return this.create(projectData)
  }

  /**
   * Update a project
   * @param id Project ID
   * @param updates Update data
   * @returns Updated project
   */
  async updateProject(id: string, updates: ProjectUpdate): Promise<StorageResult<Project>> {
    const now = new Date().toISOString()

    // Build update object, only including defined values
    const updateData: Partial<Omit<Project, 'id' | 'createdAt'>> = {
      lastActivityAt: now,
    }

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) {
      updateData.description = updates.description ?? undefined
    }
    if (updates.type !== undefined) updateData.type = updates.type
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.icon !== undefined) {
      updateData.icon = updates.icon ?? undefined
    }
    if (updates.color !== undefined) {
      updateData.color = updates.color ?? undefined
    }
    if (updates.tags !== undefined) updateData.tags = updates.tags

    return this.update(id, updateData)
  }

  /**
   * Archive a project
   * @param id Project ID
   * @returns Archived project
   */
  async archiveProject(id: string): Promise<StorageResult<Project>> {
    return this.update(id, { status: 'archived' })
  }

  /**
   * Increment session count for a project
   * @param id Project ID
   * @returns Updated project
   */
  async incrementSessionCount(id: string): Promise<StorageResult<Project>> {
    const findResult = await this.findById(id)
    if (!findResult.success) {
      return { success: false, error: findResult.error }
    }

    if (!findResult.data) {
      return { success: false, error: `Project not found: ${id}` }
    }

    return this.update(id, {
      sessionCount: findResult.data.sessionCount + 1,
      lastActivityAt: new Date().toISOString(),
    } as Partial<Project>)
  }

  /**
   * Update last activity timestamp
   * @param id Project ID
   * @returns Updated project
   */
  async touchActivity(id: string): Promise<StorageResult<Project>> {
    return this.update(id, { lastActivityAt: new Date().toISOString() } as Partial<Project>)
  }

  /**
   * Get project summaries for list view
   * @param options Filter options
   * @returns Array of project summaries
   */
  async getSummaries(options?: ProjectFilterOptions): Promise<StorageResult<ProjectSummary[]>> {
    const result = options ? await this.findByFilter(options) : await this.findAll()

    if (!result.success) {
      return { success: false, error: result.error }
    }

    const summaries = result.data.map(toSummary)
    return { success: true, data: summaries }
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Singleton instance for project storage
 */
export const projectStorage = new ProjectStorageService()

export default ProjectStorageService
