/**
 * Project Storage Service
 * JSON-based project read/write operations
 * @module @task-filewas/backend/storage/projects
 */

import { randomUUID } from 'node:crypto'
import {
  readJsonWithDefault,
  updateJson,
  resolveDataPath,
  ensureDir,
} from './json.js'
import type { StorageResult } from './json.js'
import { countSessions } from './sessions.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Project status
 */
export type ProjectStatus = 'active' | 'archived' | 'deleted'

/**
 * Project type based on tech stack
 */
export type ProjectType =
  | 'web'
  | 'backend'
  | 'fullstack'
  | 'mobile'
  | 'cli'
  | 'library'
  | 'monorepo'
  | 'other'

/**
 * Version information
 */
export interface ProjectVersion {
  version: string
  description?: string
  createdAt: string
  currentPhase: number
  totalPhases: number
  status: 'draft' | 'active' | 'completed'
}

/**
 * GitHub repository information
 */
export interface GitHubInfo {
  owner: string
  repo: string
  url: string
  defaultBranch: string
  autoPush: boolean
}

/**
 * Project settings
 */
export interface ProjectSettings {
  defaultModel?: 'claude' | 'glm' | 'auto'
  defaultPermissionMode?: 'safe' | 'ask' | 'auto'
  defaultThinkingLevel?: 'off' | 'think' | 'max'
  autoCommit?: boolean
  autoPush?: boolean
  customLabels?: string[]
  customStatuses?: Array<{
    id: string
    name: string
    icon: string
    color: string
  }>
}

/**
 * Tech stack information
 */
export interface TechStack {
  languages: string[]
  frameworks: string[]
  databases?: string[]
  uiLibraries?: string[]
  buildTools?: string[]
  testingFrameworks?: string[]
  other?: string[]
}

/**
 * Full Project interface
 */
export interface Project {
  id: string
  name: string
  description?: string
  type: ProjectType
  status: ProjectStatus
  path: string
  github?: GitHubInfo
  techStack?: TechStack
  versions: ProjectVersion[]
  activeVersion: string
  settings: ProjectSettings
  sessionCount: number
  lastActivityAt?: string
  icon?: string
  color?: string
  tags?: string[]
  createdAt: string
  updatedAt?: string
}

/**
 * Project create input
 */
export interface ProjectCreateInput {
  name: string
  description?: string
  type?: ProjectType
  path?: string
  githubUrl?: string
  techStack?: Partial<TechStack>
  settings?: Partial<ProjectSettings>
  icon?: string
  color?: string
  tags?: string[]
}

/**
 * Project update input
 */
export interface ProjectUpdateInput {
  name?: string
  description?: string
  type?: ProjectType
  status?: ProjectStatus
  settings?: Partial<ProjectSettings>
  github?: Partial<GitHubInfo>
  techStack?: Partial<TechStack>
  icon?: string
  color?: string
  tags?: string[]
  lastActivityAt?: string
  activeVersion?: string
  sessionCount?: number
}

/**
 * Projects index file structure
 */
interface ProjectsIndex {
  version: string
  projects: Project[]
  lastUpdated: string
}

// =============================================================================
// Constants
// =============================================================================

const PROJECTS_INDEX_FILE = 'projects.json'
const PROJECTS_DIR = 'projects'

const DEFAULT_PROJECTS_INDEX: ProjectsIndex = {
  version: '0.1.0',
  projects: [],
  lastUpdated: new Date().toISOString(),
}

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Get projects index file path
 */
export function getProjectsIndexPath(): string {
  return resolveDataPath(PROJECTS_INDEX_FILE)
}

/**
 * Get project directory path
 */
export function getProjectDirPath(projectId: string): string {
  return resolveDataPath(`${PROJECTS_DIR}/${projectId}`)
}

/**
 * Generate unique project ID
 */
export function generateProjectId(): string {
  const timestamp = Date.now().toString(36)
  const random = randomUUID().split('-')[0]
  return `proj-${timestamp}-${random}`
}

/**
 * Generate project path from name
 */
export function generateProjectPath(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${PROJECTS_DIR}/${slug}`
}

// =============================================================================
// Index Operations
// =============================================================================

/**
 * Read projects index
 */
async function readProjectsIndex(): Promise<StorageResult<ProjectsIndex>> {
  const path = getProjectsIndexPath()
  return readJsonWithDefault<ProjectsIndex>(path, DEFAULT_PROJECTS_INDEX)
}

// writeProjectsIndex removed - using updateProjectsIndex instead

/**
 * Update projects index with a modifier function
 */
async function updateProjectsIndex(
  modifier: (index: ProjectsIndex) => ProjectsIndex
): Promise<StorageResult<ProjectsIndex>> {
  const path = getProjectsIndexPath()
  return updateJson<ProjectsIndex>(path, modifier, DEFAULT_PROJECTS_INDEX)
}

// =============================================================================
// Project CRUD Operations
// =============================================================================

/**
 * Create a new project
 */
export async function createProject(
  input: ProjectCreateInput
): Promise<StorageResult<Project>> {
  const projectId = generateProjectId()
  const now = new Date().toISOString()
  const projectPath = input.path ?? generateProjectPath(input.name)

  // Build base project object
  const project: Project = {
    id: projectId,
    name: input.name,
    type: input.type ?? 'other',
    status: 'active',
    path: projectPath,
    versions: [{
      version: '0.1.0',
      createdAt: now,
      currentPhase: 1,
      totalPhases: 0,
      status: 'draft',
    }],
    activeVersion: '0.1.0',
    settings: input.settings ?? {},
    sessionCount: 0,
    createdAt: now,
  }

  // Add optional fields
  if (input.description) {
    project.description = input.description
  }
  if (input.icon) {
    project.icon = input.icon
  }
  if (input.color) {
    project.color = input.color
  }
  if (input.tags) {
    project.tags = input.tags
  }
  if (input.techStack) {
    project.techStack = {
      languages: input.techStack.languages ?? [],
      frameworks: input.techStack.frameworks ?? [],
      ...input.techStack,
    }
  }
  if (input.githubUrl) {
    // Parse GitHub URL
    const match = input.githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (match && match[1] && match[2]) {
      project.github = {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
        url: input.githubUrl,
        defaultBranch: 'main',
        autoPush: false,
      }
    }
  }

  // Create project directory
  const dirPath = getProjectDirPath(projectId)
  await ensureDir(dirPath)

  // Add to index
  const result = await updateProjectsIndex((index) => ({
    ...index,
    projects: [...index.projects, project],
  }))

  if (!result.success) {
    return { success: false, error: result.error }
  }

  return { success: true, data: project }
}

/**
 * Get a project by ID
 */
export async function getProject(projectId: string): Promise<StorageResult<Project | null>> {
  const indexResult = await readProjectsIndex()
  if (!indexResult.success) {
    return indexResult
  }

  const project = indexResult.data.projects.find((p) => p.id === projectId)
  return { success: true, data: project ?? null }
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  updates: ProjectUpdateInput
): Promise<StorageResult<Project>> {
  const now = new Date().toISOString()

  const result = await updateProjectsIndex((index) => {
    const projectIndex = index.projects.findIndex((p) => p.id === projectId)
    if (projectIndex === -1) {
      return index
    }

    const existing = index.projects[projectIndex]
    if (!existing) {
      return index
    }

    // Build updated project with explicit property assignment
    const updatedProject: Project = {
      id: existing.id,
      name: updates.name ?? existing.name,
      type: updates.type ?? existing.type,
      status: updates.status ?? existing.status,
      path: existing.path,
      versions: existing.versions,
      activeVersion: updates.activeVersion ?? existing.activeVersion,
      settings: updates.settings
        ? { ...existing.settings, ...updates.settings }
        : existing.settings,
      sessionCount: updates.sessionCount ?? existing.sessionCount,
      createdAt: existing.createdAt,
      updatedAt: now,
    }

    // Add optional fields
    if (updates.description !== undefined) {
      updatedProject.description = updates.description
    } else if (existing.description) {
      updatedProject.description = existing.description
    }

    if (updates.icon !== undefined) {
      updatedProject.icon = updates.icon
    } else if (existing.icon) {
      updatedProject.icon = existing.icon
    }

    if (updates.color !== undefined) {
      updatedProject.color = updates.color
    } else if (existing.color) {
      updatedProject.color = existing.color
    }

    if (updates.tags !== undefined) {
      updatedProject.tags = updates.tags
    } else if (existing.tags) {
      updatedProject.tags = existing.tags
    }

    if (updates.lastActivityAt !== undefined) {
      updatedProject.lastActivityAt = updates.lastActivityAt
    } else if (existing.lastActivityAt) {
      updatedProject.lastActivityAt = existing.lastActivityAt
    }

    // Handle techStack
    if (updates.techStack) {
      const newTechStack: TechStack = {
        languages: updates.techStack.languages ?? existing.techStack?.languages ?? [],
        frameworks: updates.techStack.frameworks ?? existing.techStack?.frameworks ?? [],
      }
      const databases = updates.techStack.databases ?? existing.techStack?.databases
      if (databases) newTechStack.databases = databases
      const uiLibraries = updates.techStack.uiLibraries ?? existing.techStack?.uiLibraries
      if (uiLibraries) newTechStack.uiLibraries = uiLibraries
      const buildTools = updates.techStack.buildTools ?? existing.techStack?.buildTools
      if (buildTools) newTechStack.buildTools = buildTools
      const testingFrameworks = updates.techStack.testingFrameworks ?? existing.techStack?.testingFrameworks
      if (testingFrameworks) newTechStack.testingFrameworks = testingFrameworks
      const other = updates.techStack.other ?? existing.techStack?.other
      if (other) newTechStack.other = other
      updatedProject.techStack = newTechStack
    } else if (existing.techStack) {
      updatedProject.techStack = existing.techStack
    }

    // Handle github
    if (updates.github) {
      updatedProject.github = {
        owner: updates.github.owner ?? existing.github?.owner ?? '',
        repo: updates.github.repo ?? existing.github?.repo ?? '',
        url: updates.github.url ?? existing.github?.url ?? '',
        defaultBranch: updates.github.defaultBranch ?? existing.github?.defaultBranch ?? 'main',
        autoPush: updates.github.autoPush ?? existing.github?.autoPush ?? false,
      }
    } else if (existing.github) {
      updatedProject.github = existing.github
    }

    const newProjects = [...index.projects]
    newProjects[projectIndex] = updatedProject

    return { ...index, projects: newProjects }
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  // Find and return the updated project
  const project = result.data.projects.find((p) => p.id === projectId)
  if (!project) {
    return { success: false, error: 'Project not found after update' }
  }

  return { success: true, data: project }
}

/**
 * Delete a project (marks as deleted, doesn't remove files)
 */
export async function deleteProject(projectId: string): Promise<StorageResult<void>> {
  const result = await updateProject(projectId, { status: 'deleted' })
  if (!result.success) {
    return { success: false, error: result.error }
  }
  return { success: true, data: undefined }
}

/**
 * Hard delete a project (removes from index)
 */
export async function hardDeleteProject(projectId: string): Promise<StorageResult<void>> {
  const result = await updateProjectsIndex((index) => ({
    ...index,
    projects: index.projects.filter((p) => p.id !== projectId),
  }))

  if (!result.success) {
    return { success: false, error: result.error }
  }

  return { success: true, data: undefined }
}

// =============================================================================
// Project List Operations
// =============================================================================

/**
 * List all projects
 */
export async function listProjects(
  options?: {
    status?: ProjectStatus | ProjectStatus[]
    type?: ProjectType | ProjectType[]
    search?: string
    includeDeleted?: boolean
  }
): Promise<StorageResult<Project[]>> {
  const indexResult = await readProjectsIndex()
  if (!indexResult.success) {
    return indexResult
  }

  let projects = indexResult.data.projects

  // Filter by status
  if (!options?.includeDeleted) {
    projects = projects.filter((p) => p.status !== 'deleted')
  }

  if (options?.status) {
    const statuses = Array.isArray(options.status) ? options.status : [options.status]
    projects = projects.filter((p) => statuses.includes(p.status))
  }

  // Filter by type
  if (options?.type) {
    const types = Array.isArray(options.type) ? options.type : [options.type]
    projects = projects.filter((p) => types.includes(p.type))
  }

  // Search filter
  if (options?.search) {
    const searchLower = options.search.toLowerCase()
    projects = projects.filter((p) =>
      p.name.toLowerCase().includes(searchLower) ||
      p.description?.toLowerCase().includes(searchLower)
    )
  }

  // Sort by last activity (or created date)
  projects.sort((a, b) => {
    const dateA = new Date(a.lastActivityAt ?? a.createdAt).getTime()
    const dateB = new Date(b.lastActivityAt ?? b.createdAt).getTime()
    return dateB - dateA // Newest first
  })

  return { success: true, data: projects }
}

/**
 * Count projects
 */
export async function countProjects(
  options?: {
    status?: ProjectStatus | ProjectStatus[]
    type?: ProjectType | ProjectType[]
  }
): Promise<StorageResult<number>> {
  const result = await listProjects(options)
  if (!result.success) {
    return result
  }
  return { success: true, data: result.data.length }
}

// =============================================================================
// Project Version Operations
// =============================================================================

/**
 * Add a new version to a project
 */
export async function addProjectVersion(
  projectId: string,
  version: Omit<ProjectVersion, 'createdAt'>
): Promise<StorageResult<Project>> {
  const projectResult = await getProject(projectId)
  if (!projectResult.success) {
    return projectResult as StorageResult<Project>
  }
  if (!projectResult.data) {
    return { success: false, error: 'Project not found' }
  }

  const now = new Date().toISOString()
  const newVersion: ProjectVersion = {
    version: version.version,
    currentPhase: version.currentPhase,
    totalPhases: version.totalPhases,
    status: version.status,
    createdAt: now,
  }
  if (version.description) {
    newVersion.description = version.description
  }

  // Add to versions array and set as active
  const updatedVersions = [...projectResult.data.versions, newVersion]

  return updateProjectsIndex((index) => {
    const projectIndex = index.projects.findIndex((p) => p.id === projectId)
    if (projectIndex === -1) {
      return index
    }

    const currentProject = index.projects[projectIndex]
    if (!currentProject) {
      return index
    }

    const updatedProject: Project = {
      ...currentProject,
      versions: updatedVersions,
      activeVersion: version.version,
      updatedAt: now,
    }

    const newProjects = [...index.projects]
    newProjects[projectIndex] = updatedProject

    return { ...index, projects: newProjects }
  }).then((result) => {
    if (!result.success) {
      return { success: false as const, error: result.error }
    }
    const project = result.data.projects.find((p) => p.id === projectId)
    if (!project) {
      return { success: false as const, error: 'Project not found after update' }
    }
    return { success: true as const, data: project }
  })
}

/**
 * Update a project version
 */
export async function updateProjectVersion(
  projectId: string,
  versionStr: string,
  updates: Partial<ProjectVersion>
): Promise<StorageResult<Project>> {
  const result = await updateProjectsIndex((index) => {
    const projectIndex = index.projects.findIndex((p) => p.id === projectId)
    if (projectIndex === -1) {
      return index
    }

    const currentProject = index.projects[projectIndex]
    if (!currentProject) {
      return index
    }

    const versionIndex = currentProject.versions.findIndex((v) => v.version === versionStr)
    if (versionIndex === -1) {
      return index
    }

    const existingVersion = currentProject.versions[versionIndex]
    if (!existingVersion) {
      return index
    }

    // Create updated version with explicit required fields
    const updatedVersion: ProjectVersion = {
      version: updates.version ?? existingVersion.version,
      createdAt: updates.createdAt ?? existingVersion.createdAt,
      currentPhase: updates.currentPhase ?? existingVersion.currentPhase,
      totalPhases: updates.totalPhases ?? existingVersion.totalPhases,
      status: updates.status ?? existingVersion.status,
    }
    if (updates.description !== undefined) {
      updatedVersion.description = updates.description
    } else if (existingVersion.description) {
      updatedVersion.description = existingVersion.description
    }

    const updatedVersions = [...currentProject.versions]
    updatedVersions[versionIndex] = updatedVersion

    // Create updated project
    const updatedProject: Project = {
      ...currentProject,
      versions: updatedVersions,
      updatedAt: new Date().toISOString(),
    }

    const newProjects = [...index.projects]
    newProjects[projectIndex] = updatedProject

    return { ...index, projects: newProjects }
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  const project = result.data.projects.find((p) => p.id === projectId)
  if (!project) {
    return { success: false, error: 'Project not found after update' }
  }

  return { success: true, data: project }
}

// =============================================================================
// Helper Operations
// =============================================================================

/**
 * Update session count for a project
 */
export async function updateSessionCount(projectId: string): Promise<StorageResult<number>> {
  const countResult = await countSessions(projectId)
  if (!countResult.success) {
    return countResult
  }

  const sessionCount = countResult.data
  await updateProject(projectId, {
    sessionCount,
    lastActivityAt: new Date().toISOString(),
  })

  return { success: true, data: sessionCount }
}

/**
 * Check if a project exists
 */
export async function projectExists(projectId: string): Promise<boolean> {
  const result = await getProject(projectId)
  return result.success && result.data !== null
}

// =============================================================================
// Export defaults
// =============================================================================

export default {
  // Path utilities
  getProjectsIndexPath,
  getProjectDirPath,
  generateProjectId,
  generateProjectPath,
  // Project CRUD
  createProject,
  getProject,
  updateProject,
  deleteProject,
  hardDeleteProject,
  // Project list
  listProjects,
  countProjects,
  // Version operations
  addProjectVersion,
  updateProjectVersion,
  // Helpers
  updateSessionCount,
  projectExists,
}
