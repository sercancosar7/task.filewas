/**
 * Session Storage Service
 * JSONL-based session read/write/query operations
 * @module @task-filewas/backend/storage/sessions
 */

import { randomUUID } from 'node:crypto'
import {
  readJsonl,
  appendJsonl,
  updateJsonl,
  findInJsonl,
  filterJsonl,
  resolveDataPath,
  fileExists,
} from './jsonl.js'
import type { StorageResult, JsonlReadOptions } from './jsonl.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Session JSONL entry types
 */
export type SessionEntryType =
  | 'header'
  | 'message'
  | 'overview'
  | 'roadmap'
  | 'phase'
  | 'tool'
  | 'summary'

/**
 * Base entry with type discriminator
 */
interface BaseEntry {
  type: SessionEntryType
  ts: string
}

/**
 * Session header entry (first line in JSONL)
 */
export interface SessionHeaderEntry extends BaseEntry {
  type: 'header'
  id: string
  projectId: string
  version: string
  title: string
  description?: string
  status: SessionStatus
  mode: SessionMode
  processingState: SessionProcessingState
  permissionMode: PermissionMode
  thinkingLevel: ThinkingLevel
  modelProvider: ModelProvider | 'auto'
  createdAt: string
  updatedAt?: string
  labels?: SessionLabelEntry[]
  isFlagged?: boolean
  hasUnread?: boolean
  hasPlan?: boolean
  messageCount?: number
  cliSessionId?: string
  phaseProgress?: PhaseProgressEntry
  tokenUsage?: TokenUsageEntry
}

/**
 * Message entry in session JSONL
 */
export interface SessionMessageEntry extends BaseEntry {
  type: 'message'
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  contentType?: 'text' | 'tool_use' | 'tool_result' | 'error' | 'summary'
  metadata?: Record<string, unknown>
}

/**
 * Tool usage entry
 */
export interface SessionToolEntry extends BaseEntry {
  type: 'tool'
  phase?: number
  name: string
  input?: Record<string, unknown>
  output?: string
  file?: string
  duration?: number
}

/**
 * Phase event entry
 */
export interface SessionPhaseEntry extends BaseEntry {
  type: 'phase'
  id: number
  name: string
  status: 'pending' | 'in_progress' | 'completed'
  agent?: string
  model?: string
  duration?: number
}

/**
 * Overview entry
 */
export interface SessionOverviewEntry extends BaseEntry {
  type: 'overview'
  version: string
  status: string
  file: string
}

/**
 * Roadmap entry
 */
export interface SessionRoadmapEntry extends BaseEntry {
  type: 'roadmap'
  version: string
  status: string
  file: string
  totalPhases: number
}

/**
 * Summary entry (context compaction)
 */
export interface SessionSummaryEntry extends BaseEntry {
  type: 'summary'
  content: string
  fromTurn?: number
  toTurn?: number
}

/**
 * Union type for all session entries
 */
export type SessionEntry =
  | SessionHeaderEntry
  | SessionMessageEntry
  | SessionToolEntry
  | SessionPhaseEntry
  | SessionOverviewEntry
  | SessionRoadmapEntry
  | SessionSummaryEntry

/**
 * Helper types
 */
export type SessionStatus = 'todo' | 'in-progress' | 'needs-review' | 'done' | 'cancelled'
export type SessionMode = 'quick-chat' | 'planning' | 'tdd' | 'debug' | 'code-review'
export type SessionProcessingState = 'idle' | 'starting' | 'running' | 'paused' | 'stopping' | 'completed' | 'error'
export type PermissionMode = 'safe' | 'ask' | 'auto'
export type ThinkingLevel = 'off' | 'think' | 'max'
export type ModelProvider = 'claude' | 'glm'

export interface SessionLabelEntry {
  id: string
  name: string
  color: string
}

export interface PhaseProgressEntry {
  currentPhase: number
  totalPhases: number
  phaseName?: string
  phaseStatus: 'pending' | 'in_progress' | 'completed'
}

export interface TokenUsageEntry {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalContext: number
  percentUsed: number
}

/**
 * Session create input
 */
export interface SessionCreateInput {
  projectId: string
  title: string
  description?: string
  version?: string
  mode?: SessionMode
  permissionMode?: PermissionMode
  thinkingLevel?: ThinkingLevel
  modelProvider?: ModelProvider | 'auto'
  labels?: SessionLabelEntry[]
  isFlagged?: boolean
}

/**
 * Session update input
 */
export interface SessionUpdateInput {
  title?: string
  description?: string
  status?: SessionStatus
  processingState?: SessionProcessingState
  permissionMode?: PermissionMode
  thinkingLevel?: ThinkingLevel
  modelProvider?: ModelProvider | 'auto'
  labels?: SessionLabelEntry[]
  isFlagged?: boolean
  hasUnread?: boolean
  hasPlan?: boolean
  messageCount?: number
  cliSessionId?: string
  phaseProgress?: PhaseProgressEntry
  tokenUsage?: TokenUsageEntry
}

/**
 * Session filter options
 */
export interface SessionFilterOptions {
  projectId?: string
  status?: SessionStatus | SessionStatus[]
  mode?: SessionMode | SessionMode[]
  isFlagged?: boolean
  hasUnread?: boolean
  search?: string
  version?: string
}

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Generate session filename
 * Format: {projectId}--{sessionId}.jsonl
 */
export function getSessionFilename(projectId: string, sessionId: string): string {
  return `${projectId}--${sessionId}.jsonl`
}

/**
 * Get session file path
 */
export function getSessionPath(projectId: string, sessionId: string): string {
  const filename = getSessionFilename(projectId, sessionId)
  return resolveDataPath(`sessions/${filename}`)
}

/**
 * Generate unique session ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const random = randomUUID().split('-')[0]
  return `sess-${timestamp}-${random}`
}

// =============================================================================
// Session CRUD Operations
// =============================================================================

/**
 * Create a new session
 * Creates a new JSONL file with header entry
 */
export async function createSession(
  input: SessionCreateInput
): Promise<StorageResult<SessionHeaderEntry>> {
  const sessionId = generateSessionId()
  const now = new Date().toISOString()

  // Build header object with required fields
  const baseHeader = {
    type: 'header' as const,
    id: sessionId,
    projectId: input.projectId,
    version: input.version ?? '0.1.0',
    title: input.title,
    status: 'todo' as const,
    mode: input.mode ?? 'quick-chat',
    processingState: 'idle' as const,
    permissionMode: input.permissionMode ?? 'ask',
    thinkingLevel: input.thinkingLevel ?? 'off',
    modelProvider: input.modelProvider ?? 'auto',
    createdAt: now,
    labels: input.labels ?? [],
    isFlagged: input.isFlagged ?? false,
    hasUnread: false,
    hasPlan: false,
    messageCount: 0,
    ts: now,
  }

  // Add optional description if provided
  const header: SessionHeaderEntry = input.description
    ? { ...baseHeader, description: input.description }
    : baseHeader

  const filePath = getSessionPath(input.projectId, sessionId)
  const result = await appendJsonl(filePath, header)

  if (!result.success) {
    return { success: false, error: result.error }
  }

  return { success: true, data: header }
}

/**
 * Get session header by ID
 */
export async function getSession(
  projectId: string,
  sessionId: string
): Promise<StorageResult<SessionHeaderEntry | null>> {
  const filePath = getSessionPath(projectId, sessionId)
  const exists = await fileExists(filePath)

  if (!exists) {
    return { success: true, data: null }
  }

  const result = await findInJsonl<SessionEntry>(
    filePath,
    (entry) => entry.type === 'header'
  )

  if (!result.success) {
    return result
  }

  return { success: true, data: result.data as SessionHeaderEntry | null }
}

/**
 * Update session header
 */
export async function updateSession(
  projectId: string,
  sessionId: string,
  updates: SessionUpdateInput
): Promise<StorageResult<SessionHeaderEntry>> {
  const filePath = getSessionPath(projectId, sessionId)
  const now = new Date().toISOString()

  const result = await updateJsonl<SessionEntry>(
    filePath,
    (entry) => entry.type === 'header',
    (entry) => {
      const header = entry as SessionHeaderEntry
      return {
        ...header,
        ...updates,
        updatedAt: now,
        ts: now,
      }
    }
  )

  if (!result.success) {
    return { success: false, error: result.error }
  }

  // Read back the updated header
  const headerResult = await getSession(projectId, sessionId)
  if (!headerResult.success || !headerResult.data) {
    return { success: false, error: 'Failed to read updated session' }
  }

  return { success: true, data: headerResult.data }
}

/**
 * Delete a session (removes the JSONL file)
 */
export async function deleteSession(
  projectId: string,
  sessionId: string
): Promise<StorageResult<void>> {
  const filePath = getSessionPath(projectId, sessionId)
  const exists = await fileExists(filePath)

  if (!exists) {
    return { success: true, data: undefined }
  }

  try {
    const { unlink } = await import('node:fs/promises')
    await unlink(filePath)
    return { success: true, data: undefined }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to delete session: ${message}` }
  }
}

// =============================================================================
// Session List Operations
// =============================================================================

/**
 * List all sessions for a project
 * Reads header entries from all session files
 */
export async function listSessions(
  projectId: string,
  filter?: SessionFilterOptions
): Promise<StorageResult<SessionHeaderEntry[]>> {
  const sessionsDir = resolveDataPath('sessions')

  try {
    const { readdir } = await import('node:fs/promises')
    const dirExists = await fileExists(sessionsDir)

    if (!dirExists) {
      return { success: true, data: [] }
    }

    const files = await readdir(sessionsDir)
    const sessionFiles = files.filter((f) => f.startsWith(`${projectId}--`) && f.endsWith('.jsonl'))

    const headers: SessionHeaderEntry[] = []

    for (const file of sessionFiles) {
      const filePath = `${sessionsDir}/${file}`
      const headerResult = await findInJsonl<SessionEntry>(
        filePath,
        (entry) => entry.type === 'header'
      )

      if (headerResult.success && headerResult.data) {
        const header = headerResult.data as SessionHeaderEntry

        // Apply filters
        if (filter) {
          if (filter.status) {
            const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
            if (!statuses.includes(header.status)) continue
          }
          if (filter.mode) {
            const modes = Array.isArray(filter.mode) ? filter.mode : [filter.mode]
            if (!modes.includes(header.mode)) continue
          }
          if (filter.isFlagged !== undefined && header.isFlagged !== filter.isFlagged) continue
          if (filter.hasUnread !== undefined && header.hasUnread !== filter.hasUnread) continue
          if (filter.version && header.version !== filter.version) continue
          if (filter.search) {
            const searchLower = filter.search.toLowerCase()
            const titleMatch = header.title.toLowerCase().includes(searchLower)
            const descMatch = header.description?.toLowerCase().includes(searchLower)
            if (!titleMatch && !descMatch) continue
          }
        }

        headers.push(header)
      }
    }

    // Sort by createdAt descending (newest first)
    headers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return { success: true, data: headers }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to list sessions: ${message}` }
  }
}

/**
 * Count sessions for a project
 */
export async function countSessions(
  projectId: string,
  filter?: SessionFilterOptions
): Promise<StorageResult<number>> {
  const result = await listSessions(projectId, filter)
  if (!result.success) {
    return result
  }
  return { success: true, data: result.data.length }
}

// =============================================================================
// Message Operations
// =============================================================================

/**
 * Add a message to a session
 */
export async function addMessage(
  projectId: string,
  sessionId: string,
  message: Omit<SessionMessageEntry, 'type' | 'ts' | 'id'>
): Promise<StorageResult<SessionMessageEntry>> {
  const filePath = getSessionPath(projectId, sessionId)
  const now = new Date().toISOString()
  const messageId = `msg-${Date.now().toString(36)}-${randomUUID().split('-')[0]}`

  const entry: SessionMessageEntry = {
    type: 'message',
    id: messageId,
    ...message,
    ts: now,
  }

  const result = await appendJsonl(filePath, entry)
  if (!result.success) {
    return { success: false, error: result.error }
  }

  // Update message count in header
  await updateSession(projectId, sessionId, {
    messageCount: await getMessageCount(projectId, sessionId),
    hasUnread: true,
  })

  return { success: true, data: entry }
}

/**
 * Get all messages from a session
 */
export async function getMessages(
  projectId: string,
  sessionId: string,
  options?: JsonlReadOptions<SessionEntry>
): Promise<StorageResult<SessionMessageEntry[]>> {
  const filePath = getSessionPath(projectId, sessionId)

  const result = await filterJsonl<SessionEntry>(
    filePath,
    (entry) => entry.type === 'message'
  )

  if (!result.success) {
    return result
  }

  let messages = result.data as SessionMessageEntry[]

  // Apply additional options
  if (options?.reverse) {
    messages = messages.reverse()
  }
  if (options?.offset) {
    messages = messages.slice(options.offset)
  }
  if (options?.limit) {
    messages = messages.slice(0, options.limit)
  }

  return { success: true, data: messages }
}

/**
 * Get message count for a session
 */
async function getMessageCount(
  projectId: string,
  sessionId: string
): Promise<number> {
  const result = await getMessages(projectId, sessionId)
  return result.success ? result.data.length : 0
}

// =============================================================================
// Entry Operations
// =============================================================================

/**
 * Add any entry type to a session
 */
export async function addEntry<T extends SessionEntry>(
  projectId: string,
  sessionId: string,
  entry: Omit<T, 'ts'>
): Promise<StorageResult<T>> {
  const filePath = getSessionPath(projectId, sessionId)
  const now = new Date().toISOString()

  const fullEntry = {
    ...entry,
    ts: now,
  } as T

  const result = await appendJsonl(filePath, fullEntry)
  if (!result.success) {
    return { success: false, error: result.error }
  }

  return { success: true, data: fullEntry }
}

/**
 * Get all entries from a session
 */
export async function getEntries(
  projectId: string,
  sessionId: string,
  options?: JsonlReadOptions<SessionEntry>
): Promise<StorageResult<SessionEntry[]>> {
  const filePath = getSessionPath(projectId, sessionId)
  return readJsonl<SessionEntry>(filePath, options)
}

/**
 * Get entries by type
 */
export async function getEntriesByType<T extends SessionEntry>(
  projectId: string,
  sessionId: string,
  type: SessionEntryType
): Promise<StorageResult<T[]>> {
  const filePath = getSessionPath(projectId, sessionId)

  const result = await filterJsonl<SessionEntry>(
    filePath,
    (entry) => entry.type === type
  )

  if (!result.success) {
    return result
  }

  return { success: true, data: result.data as T[] }
}

// =============================================================================
// Export defaults
// =============================================================================

export default {
  // Path utilities
  getSessionFilename,
  getSessionPath,
  generateSessionId,
  // Session CRUD
  createSession,
  getSession,
  updateSession,
  deleteSession,
  // Session list
  listSessions,
  countSessions,
  // Message operations
  addMessage,
  getMessages,
  // Entry operations
  addEntry,
  getEntries,
  getEntriesByType,
}
