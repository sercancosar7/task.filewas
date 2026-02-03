/**
 * Sources Storage Service
 * MCP, API, and Local source management
 * @module @task-filewas/backend/storage/sources
 */

import { resolveDataPath, readJson, writeJson, type StorageResult } from './json.js'
import type {
  Source,
  SourceType,
  SourceCreate,
  SourceUpdate,
  SourceSummary,
  MCPSourceConfig,
} from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

/**
 * Sources storage structure (array of sources)
 */
export interface SourcesData {
  sources: Source[]
}

/**
 * Connection status for a source
 */
export type SourceConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// =============================================================================
// File Path
// =============================================================================

/** Path to sources.json file */
const SOURCES_PATH = resolveDataPath('sources.json')

// =============================================================================
// Default Sources
// =============================================================================

/**
 * Default MCP sources (not enabled by default)
 */
const DEFAULT_MCP_SOURCES: Source[] = [
  {
    id: 'mcp-memory',
    type: 'mcp',
    name: 'Memory MCP',
    config: {
      type: 'memory',
      name: 'Memory MCP',
      enabled: false,
    } as MCPSourceConfig,
    enabled: false,
    status: 'disconnected',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mcp-context7',
    type: 'mcp',
    name: 'Context7',
    config: {
      type: 'context7',
      name: 'Context7',
      enabled: false,
    } as MCPSourceConfig,
    enabled: false,
    status: 'disconnected',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mcp-playwright',
    type: 'mcp',
    name: 'Playwright',
    config: {
      type: 'playwright',
      name: 'Playwright',
      enabled: false,
    } as MCPSourceConfig,
    enabled: false,
    status: 'disconnected',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mcp-puppeteer',
    type: 'mcp',
    name: 'Puppeteer',
    config: {
      type: 'puppeteer',
      name: 'Puppeteer',
      enabled: false,
    } as MCPSourceConfig,
    enabled: false,
    status: 'disconnected',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mcp-sequential-thinking',
    type: 'mcp',
    name: 'Sequential Thinking',
    config: {
      type: 'sequential-thinking',
      name: 'Sequential Thinking',
      enabled: false,
    } as MCPSourceConfig,
    enabled: false,
    status: 'disconnected',
    createdAt: new Date().toISOString(),
  },
]

/**
 * Default storage data
 */
const DEFAULT_SOURCES_DATA: SourcesData = {
  sources: DEFAULT_MCP_SOURCES,
}

// =============================================================================
// Sources Operations
// =============================================================================

/**
 * Get all sources
 * @returns All sources
 */
export async function getSources(): Promise<StorageResult<Source[]>> {
  const result = await readJson<SourcesData>(SOURCES_PATH, {
    defaultValue: DEFAULT_SOURCES_DATA,
  })

  if (!result.success) {
    return result
  }

  return { success: true, data: result.data!.sources }
}

/**
 * Get sources by type
 * @param type Source type filter
 * @returns Filtered sources
 */
export async function getSourcesByType(type: SourceType): Promise<StorageResult<Source[]>> {
  const result = await getSources()

  if (!result.success) {
    return result
  }

  const filtered = result.data!.filter((s) => s.type === type)
  return { success: true, data: filtered }
}

/**
 * Get source summaries (for list views)
 * @returns Source summaries
 */
export async function getSourceSummaries(): Promise<StorageResult<SourceSummary[]>> {
  const result = await getSources()

  if (!result.success) {
    return result
  }

  const summaries: SourceSummary[] = result.data!.map((s) => ({
    id: s.id,
    type: s.type,
    name: s.name,
    enabled: s.enabled,
    status: s.status,
  }))

  return { success: true, data: summaries }
}

/**
 * Get a single source by ID
 * @param id Source ID
 * @returns Source or null if not found
 */
export async function getSourceById(id: string): Promise<StorageResult<Source | null>> {
  const result = await getSources()

  if (!result.success) {
    return { success: false, error: result.error }
  }

  const source = result.data!.find((s) => s.id === id) ?? null

  return { success: true, data: source }
}

/**
 * Create a new source
 * @param create Source creation data
 * @returns Created source
 */
export async function createSource(create: SourceCreate): Promise<StorageResult<Source>> {
  const getResult = await getSources()

  if (!getResult.success) {
    return getResult
  }

  const sources = getResult.data!

  // Check for duplicate name
  const existingByName = sources.find((s) => s.name === create.name)
  if (existingByName) {
    return {
      success: false,
      error: `Source with name "${create.name}" already exists`,
    }
  }

  // Generate ID from name
  const id = create.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  // Check for duplicate ID
  const existingById = sources.find((s) => s.id === id)
  if (existingById) {
    return {
      success: false,
      error: `Source with ID "${id}" already exists`,
    }
  }

  const newSource: Source = {
    id,
    type: create.type,
    name: create.name,
    config: create.config,
    enabled: true,
    status: 'disconnected',
    createdAt: new Date().toISOString(),
  }

  sources.push(newSource)

  const writeResult = await writeJson<SourcesData>(SOURCES_PATH, { sources })

  if (!writeResult.success) {
    return writeResult
  }

  return { success: true, data: newSource }
}

/**
 * Update a source
 * @param id Source ID
 * @param update Update data
 * @returns Updated source or null if not found
 */
export async function updateSource(
  id: string,
  update: SourceUpdate
): Promise<StorageResult<Source | null>> {
  const getResult = await getSources()

  if (!getResult.success) {
    return getResult
  }

  const sources = getResult.data!
  const index = sources.findIndex((s) => s.id === id)

  if (index === -1) {
    return { success: true, data: null }
  }

  const source = sources[index]!

  // Check for duplicate name if name is being changed
  if (update.name && update.name !== source.name) {
    const existingByName = sources.find((s) => s.name === update.name && s.id !== id)
    if (existingByName) {
      return {
        success: false,
        error: `Source with name "${update.name}" already exists`,
      }
    }
  }

  // Apply updates
  const updated: Source = {
    id: source.id,
    type: source.type,
    name: update.name ?? source.name,
    config: update.config ?? source.config,
    enabled: update.enabled ?? source.enabled,
    status: source.status,
    createdAt: source.createdAt,
    lastConnectedAt: source.lastConnectedAt,
    error: source.error,
    updatedAt: new Date().toISOString(),
  } as Source

  sources[index] = updated

  const writeResult = await writeJson<SourcesData>(SOURCES_PATH, { sources })

  if (!writeResult.success) {
    return writeResult
  }

  return { success: true, data: updated }
}

/**
 * Delete a source
 * @param id Source ID
 * @returns Deleted source or null if not found
 */
export async function deleteSource(id: string): Promise<StorageResult<Source | null>> {
  const getResult = await getSources()

  if (!getResult.success) {
    return getResult
  }

  const sources = getResult.data!
  const index = sources.findIndex((s) => s.id === id)

  if (index === -1) {
    return { success: true, data: null }
  }

  const [deleted] = sources.splice(index, 1)

  const writeResult = await writeJson<SourcesData>(SOURCES_PATH, { sources })

  if (!writeResult.success) {
    return writeResult
  }

  return { success: true, data: deleted ?? null }
}

/**
 * Toggle source enabled status
 * @param id Source ID
 * @returns Updated source or null if not found
 */
export async function toggleSource(id: string): Promise<StorageResult<Source | null>> {
  const getResult = await getSourceById(id)

  if (!getResult.success || !getResult.data) {
    return getResult
  }

  const source = getResult.data
  return updateSource(id, { enabled: !source.enabled })
}

/**
 * Update source connection status
 * @param id Source ID
 * @param status New connection status
 * @param error Optional error message
 * @returns Updated source or null if not found
 */
export async function updateSourceStatus(
  id: string,
  status: SourceConnectionStatus,
  error?: string
): Promise<StorageResult<Source | null>> {
  const getResult = await getSources()

  if (!getResult.success) {
    return getResult
  }

  const sources = getResult.data!
  const index = sources.findIndex((s) => s.id === id)

  if (index === -1) {
    return { success: true, data: null }
  }

  const source = sources[index]!

  const updated: Source = {
    id: source.id,
    type: source.type,
    name: source.name,
    config: source.config,
    enabled: source.enabled,
    status,
    createdAt: source.createdAt,
    lastConnectedAt: status === 'connected' ? new Date().toISOString() : source.lastConnectedAt ?? undefined,
    error: status === 'error' ? error : undefined,
    updatedAt: new Date().toISOString(),
  } as Source

  sources[index] = updated

  const writeResult = await writeJson<SourcesData>(SOURCES_PATH, { sources })

  if (!writeResult.success) {
    return writeResult
  }

  return { success: true, data: updated }
}

/**
 * Get MCP sources
 * @returns MCP sources
 */
export async function getMCPSources(): Promise<StorageResult<Source[]>> {
  return getSourcesByType('mcp')
}

/**
 * Get API sources
 * @returns API sources
 */
export async function getAPISources(): Promise<StorageResult<Source[]>> {
  return getSourcesByType('api')
}

/**
 * Get local sources
 * @returns Local sources
 */
export async function getLocalSources(): Promise<StorageResult<Source[]>> {
  return getSourcesByType('local')
}

export default {
  getSources,
  getSourcesByType,
  getSourceSummaries,
  getSourceById,
  createSource,
  updateSource,
  deleteSource,
  toggleSource,
  updateSourceStatus,
  getMCPSources,
  getAPISources,
  getLocalSources,
}
