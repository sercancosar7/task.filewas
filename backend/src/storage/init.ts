/**
 * Storage Initialization
 * Creates required directories and default files on startup
 * @module @task-filewas/backend/storage/init
 */

import { resolveDataPath, ensureDir, fileExists } from './jsonl.js'
import { writeJson } from './json.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Platform settings structure
 */
interface PlatformSettings {
  version: string
  models: {
    default: 'claude' | 'glm' | 'auto'
    fallbackEnabled: boolean
    fallbackOrder: string[]
  }
  permissions: {
    defaultMode: 'safe' | 'ask' | 'auto'
  }
  thinking: {
    defaultLevel: 'off' | 'think' | 'max'
  }
  ui: {
    theme: 'dark'
    language: 'tr'
  }
}

/**
 * Sources configuration structure
 */
interface SourcesConfig {
  version: string
  mcp: Array<{
    id: string
    name: string
    type: 'mcp'
    enabled: boolean
    config: Record<string, unknown>
  }>
  api: Array<{
    id: string
    name: string
    type: 'api'
    enabled: boolean
    baseUrl: string
    authType?: string
  }>
  local: Array<{
    id: string
    name: string
    type: 'local'
    enabled: boolean
    path: string
  }>
}

/**
 * Custom status definitions
 */
interface StatusesConfig {
  version: string
  builtIn: Array<{
    id: string
    name: string
    icon: string
    color: string
    order: number
  }>
  custom: Array<{
    id: string
    name: string
    icon: string
    color: string
    order: number
  }>
}

// =============================================================================
// Default Data
// =============================================================================

const DEFAULT_SETTINGS: PlatformSettings = {
  version: '0.1.0',
  models: {
    default: 'auto',
    fallbackEnabled: true,
    fallbackOrder: ['claude', 'glm'],
  },
  permissions: {
    defaultMode: 'ask',
  },
  thinking: {
    defaultLevel: 'off',
  },
  ui: {
    theme: 'dark',
    language: 'tr',
  },
}

const DEFAULT_SOURCES: SourcesConfig = {
  version: '0.1.0',
  mcp: [
    {
      id: 'memory',
      name: 'Memory MCP',
      type: 'mcp',
      enabled: true,
      config: {},
    },
    {
      id: 'context7',
      name: 'Context7',
      type: 'mcp',
      enabled: true,
      config: {},
    },
  ],
  api: [],
  local: [],
}

const DEFAULT_STATUSES: StatusesConfig = {
  version: '0.1.0',
  builtIn: [
    { id: 'todo', name: 'Todo', icon: 'Circle', color: '#6b7280', order: 1 },
    { id: 'in-progress', name: 'In Progress', icon: 'CircleDot', color: '#a78bfa', order: 2 },
    { id: 'needs-review', name: 'Needs Review', icon: 'CircleDashed', color: '#fbbf24', order: 3 },
    { id: 'done', name: 'Done', icon: 'CheckCircle2', color: '#22c55e', order: 4 },
    { id: 'cancelled', name: 'Cancelled', icon: 'XCircle', color: '#6b7280', order: 5 },
  ],
  custom: [],
}

// =============================================================================
// Directory Structure
// =============================================================================

/**
 * Required directories under data/
 */
const REQUIRED_DIRS = [
  '', // data/ root
  'sessions', // session JSONL files
  'logs', // application logs
  'logs/api', // API request logs
  'logs/agents', // agent execution logs
  'logs/errors', // error logs
]

/**
 * Default files to create if they don't exist
 */
const DEFAULT_FILES: Array<{
  path: string
  data: unknown
}> = [
  { path: 'settings.json', data: DEFAULT_SETTINGS },
  { path: 'sources.json', data: DEFAULT_SOURCES },
  { path: 'statuses.json', data: DEFAULT_STATUSES },
]

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize storage directories
 * Creates all required directories under data/
 */
async function initDirectories(): Promise<void> {
  console.log('[Storage] Initializing directories...')

  for (const dir of REQUIRED_DIRS) {
    const path = resolveDataPath(dir)
    await ensureDir(path)
    console.log(`[Storage] ✓ Directory: ${dir || 'data/'}`)
  }
}

/**
 * Initialize default files
 * Creates default configuration files if they don't exist
 */
async function initDefaultFiles(): Promise<void> {
  console.log('[Storage] Initializing default files...')

  for (const file of DEFAULT_FILES) {
    const path = resolveDataPath(file.path)
    const exists = await fileExists(path)

    if (!exists) {
      const result = await writeJson(path, file.data)
      if (result.success) {
        console.log(`[Storage] ✓ Created: ${file.path}`)
      } else {
        console.error(`[Storage] ✗ Failed to create ${file.path}: ${result.error}`)
      }
    } else {
      console.log(`[Storage] ○ Exists: ${file.path}`)
    }
  }
}

/**
 * Initialize storage system
 * Creates directories and default files
 * Should be called on application startup
 */
export async function initStorage(): Promise<void> {
  console.log('\n[Storage] ════════════════════════════════════════')
  console.log('[Storage] Initializing file-based storage...')
  console.log('[Storage] ════════════════════════════════════════\n')

  try {
    // Create directories first
    await initDirectories()

    // Then create default files
    await initDefaultFiles()

    console.log('\n[Storage] ════════════════════════════════════════')
    console.log('[Storage] Storage initialization complete!')
    console.log('[Storage] ════════════════════════════════════════\n')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`\n[Storage] ✗ Initialization failed: ${message}`)
    throw error
  }
}

/**
 * Get storage status
 * Returns information about storage directories and files
 */
export async function getStorageStatus(): Promise<{
  initialized: boolean
  directories: Array<{ path: string; exists: boolean }>
  files: Array<{ path: string; exists: boolean }>
}> {
  const directories = await Promise.all(
    REQUIRED_DIRS.map(async (dir) => ({
      path: dir || 'data/',
      exists: await fileExists(resolveDataPath(dir)),
    }))
  )

  const files = await Promise.all(
    DEFAULT_FILES.map(async (file) => ({
      path: file.path,
      exists: await fileExists(resolveDataPath(file.path)),
    }))
  )

  const allDirsExist = directories.every((d) => d.exists)
  const allFilesExist = files.every((f) => f.exists)

  return {
    initialized: allDirsExist && allFilesExist,
    directories,
    files,
  }
}

// Re-export types for external use
export type { PlatformSettings, SourcesConfig, StatusesConfig }

export default {
  initStorage,
  getStorageStatus,
}
