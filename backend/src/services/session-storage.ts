/**
 * Session Storage Service
 * JSONL-based storage for sessions with append-only support
 * @module @task-filewas/backend/services/session-storage
 */

import { BaseStorageService } from './base-storage.js'
import type { StorageResult } from './base-storage.js'
import type {
  Session,
  SessionCreate,
  SessionUpdate,
  SessionSummary,
  SessionStatus,
  SessionMode,
  SessionFilter,
  SessionSort,
  SessionLabel,
  PermissionMode,
  ThinkingLevel,
} from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

/**
 * Default session values
 */
const SESSION_DEFAULTS = {
  mode: 'quick-chat' as SessionMode,
  status: 'todo' as SessionStatus,
  processingState: 'idle' as const,
  permissionMode: 'safe' as PermissionMode,
  thinkingLevel: 'off' as ThinkingLevel,
  modelProvider: 'auto' as const,
} as const

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert Session to SessionSummary handling optional properties
 */
function toSummary(session: Session): SessionSummary {
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
}

/**
 * Check if session matches filter
 */
function matchesFilter(session: Session, filter: SessionFilter): boolean {
  // Project filter
  if (filter.projectId && session.projectId !== filter.projectId) {
    return false
  }

  // Status filter
  if (filter.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
    if (!statuses.includes(session.status)) {
      return false
    }
  }

  // Mode filter
  if (filter.mode) {
    const modes = Array.isArray(filter.mode) ? filter.mode : [filter.mode]
    if (!modes.includes(session.mode)) {
      return false
    }
  }

  // Label filter
  if (filter.labelIds && filter.labelIds.length > 0) {
    const sessionLabelIds = session.labels.map((l) => l.id)
    const hasMatch = filter.labelIds.some((id) => sessionLabelIds.includes(id))
    if (!hasMatch) {
      return false
    }
  }

  // Flag filter
  if (filter.isFlagged !== undefined && session.isFlagged !== filter.isFlagged) {
    return false
  }

  // Unread filter
  if (filter.hasUnread !== undefined && session.hasUnread !== filter.hasUnread) {
    return false
  }

  // Version filter
  if (filter.version && session.version !== filter.version) {
    return false
  }

  // Search filter
  if (filter.search) {
    const searchLower = filter.search.toLowerCase()
    const titleMatch = session.title.toLowerCase().includes(searchLower)
    const descMatch = session.description?.toLowerCase().includes(searchLower) ?? false
    if (!titleMatch && !descMatch) {
      return false
    }
  }

  // Date range filter
  if (filter.fromDate) {
    const sessionDate = new Date(session.createdAt)
    const fromDate = new Date(filter.fromDate)
    if (sessionDate < fromDate) {
      return false
    }
  }

  if (filter.toDate) {
    const sessionDate = new Date(session.createdAt)
    const toDate = new Date(filter.toDate)
    if (sessionDate > toDate) {
      return false
    }
  }

  return true
}

// =============================================================================
// Session Storage Service
// =============================================================================

/**
 * Session storage service using JSONL format
 * Sessions are stored as append-only JSONL for efficient writes
 *
 * @example
 * ```typescript
 * const sessionStorage = new SessionStorageService()
 *
 * // Find sessions by project
 * const result = await sessionStorage.findByProject('project-id')
 * if (result.success) {
 *   console.log('Sessions:', result.data.length)
 * }
 *
 * // Create new session
 * const createResult = await sessionStorage.createSession({
 *   projectId: 'project-id',
 *   title: 'New Session',
 * })
 * ```
 */
export class SessionStorageService extends BaseStorageService<Session> {
  constructor() {
    super({
      relativePath: 'sessions.jsonl',
      format: 'jsonl',
      timestamps: true,
    })
  }

  // ===========================================================================
  // Session-Specific Read Methods
  // ===========================================================================

  /**
   * Find all sessions for a specific project
   * @param projectId Project ID
   * @param sort Optional sort options
   * @returns Sessions belonging to the project
   */
  async findByProject(
    projectId: string,
    sort?: SessionSort
  ): Promise<StorageResult<Session[]>> {
    const result = await this.findWhere((session) => session.projectId === projectId)

    if (!result.success) {
      return result
    }

    // Apply sorting if specified
    let sessions = result.data
    if (sort) {
      sessions = this.sortSessions(sessions, sort)
    } else {
      // Default: newest first
      sessions = this.sortSessions(sessions, { field: 'createdAt', direction: 'desc' })
    }

    return { success: true, data: sessions }
  }

  /**
   * Find sessions with filter and sort options
   * @param filter Filter options
   * @param sort Sort options
   * @returns Matching sessions
   */
  async findByFilter(
    filter: SessionFilter,
    sort?: SessionSort
  ): Promise<StorageResult<Session[]>> {
    const result = await this.findWhere((session) => matchesFilter(session, filter))

    if (!result.success) {
      return result
    }

    // Apply sorting
    let sessions = result.data
    if (sort) {
      sessions = this.sortSessions(sessions, sort)
    } else {
      // Default: newest first
      sessions = this.sortSessions(sessions, { field: 'createdAt', direction: 'desc' })
    }

    return { success: true, data: sessions }
  }

  /**
   * Find sessions with active processing state
   * @param projectId Optional project filter
   * @returns Running or starting sessions
   */
  async findActive(projectId?: string): Promise<StorageResult<Session[]>> {
    return this.findWhere((session) => {
      const isActive =
        session.processingState === 'running' || session.processingState === 'starting'
      if (projectId) {
        return isActive && session.projectId === projectId
      }
      return isActive
    })
  }

  /**
   * Find flagged sessions
   * @param projectId Optional project filter
   * @returns Flagged sessions
   */
  async findFlagged(projectId?: string): Promise<StorageResult<Session[]>> {
    return this.findWhere((session) => {
      if (projectId) {
        return session.isFlagged && session.projectId === projectId
      }
      return session.isFlagged
    })
  }

  /**
   * Find sessions with unread messages
   * @param projectId Optional project filter
   * @returns Sessions with unread messages
   */
  async findUnread(projectId?: string): Promise<StorageResult<Session[]>> {
    return this.findWhere((session) => {
      if (projectId) {
        return session.hasUnread && session.projectId === projectId
      }
      return session.hasUnread
    })
  }

  /**
   * Find session by CLI session ID
   * @param cliSessionId CLI session ID
   * @returns Session or null
   */
  async findByCliSessionId(cliSessionId: string): Promise<StorageResult<Session | null>> {
    return this.findOne((session) => session.cliSessionId === cliSessionId)
  }

  /**
   * Count sessions by project
   * @param projectId Project ID
   * @returns Number of sessions
   */
  async countByProject(projectId: string): Promise<StorageResult<number>> {
    return this.count((session) => session.projectId === projectId)
  }

  /**
   * Count sessions by status
   * @param projectId Optional project filter
   * @param status Session status
   * @returns Number of sessions
   */
  async countByStatus(
    status: SessionStatus,
    projectId?: string
  ): Promise<StorageResult<number>> {
    return this.count((session) => {
      const statusMatch = session.status === status
      if (projectId) {
        return statusMatch && session.projectId === projectId
      }
      return statusMatch
    })
  }

  // ===========================================================================
  // Session-Specific Write Methods
  // ===========================================================================

  /**
   * Create a new session
   * @param data Session creation data
   * @returns Created session
   */
  async createSession(data: SessionCreate): Promise<StorageResult<Session>> {
    // Build labels from IDs if provided
    const labels: SessionLabel[] = []
    if (data.labels && data.labels.length > 0) {
      // Labels come as IDs - need to resolve them (placeholder for now)
      // In real implementation, would fetch from label storage
      data.labels.forEach((labelId) => {
        labels.push({
          id: labelId,
          name: labelId,
          color: '#808080',
        })
      })
    }

    const sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'> = {
      projectId: data.projectId,
      title: data.title,
      status: 'todo',
      mode: data.mode ?? SESSION_DEFAULTS.mode,
      processingState: SESSION_DEFAULTS.processingState,
      permissionMode: data.permissionMode ?? SESSION_DEFAULTS.permissionMode,
      thinkingLevel: data.thinkingLevel ?? SESSION_DEFAULTS.thinkingLevel,
      modelProvider: data.modelProvider ?? SESSION_DEFAULTS.modelProvider,
      version: data.version ?? '0.1.0',
      labels,
      isFlagged: data.isFlagged ?? false,
      hasUnread: false,
      hasPlan: false,
      messageCount: 0,
    }

    // Add optional properties
    if (data.description) {
      sessionData['description'] = data.description
    }

    return this.create(sessionData)
  }

  /**
   * Update a session
   * @param id Session ID
   * @param updates Update data
   * @returns Updated session
   */
  async updateSession(id: string, updates: SessionUpdate): Promise<StorageResult<Session>> {
    const updateData: Partial<Omit<Session, 'id' | 'createdAt'>> = {}

    if (updates.title !== undefined) updateData['title'] = updates.title
    if (updates.description !== undefined) {
      updateData['description'] = updates.description ?? undefined
    }
    if (updates.status !== undefined) updateData['status'] = updates.status
    if (updates.mode !== undefined) updateData['mode'] = updates.mode
    if (updates.permissionMode !== undefined) updateData['permissionMode'] = updates.permissionMode
    if (updates.thinkingLevel !== undefined) updateData['thinkingLevel'] = updates.thinkingLevel
    if (updates.modelProvider !== undefined) updateData['modelProvider'] = updates.modelProvider
    if (updates.labels !== undefined) updateData['labels'] = updates.labels
    if (updates.isFlagged !== undefined) updateData['isFlagged'] = updates.isFlagged
    if (updates.hasUnread !== undefined) updateData['hasUnread'] = updates.hasUnread

    return this.update(id, updateData)
  }

  /**
   * Update session status
   * @param id Session ID
   * @param status New status
   * @returns Updated session
   */
  async updateStatus(id: string, status: SessionStatus): Promise<StorageResult<Session>> {
    return this.update(id, { status })
  }

  /**
   * Update session processing state
   * @param id Session ID
   * @param state New processing state
   * @returns Updated session
   */
  async updateProcessingState(
    id: string,
    state: Session['processingState']
  ): Promise<StorageResult<Session>> {
    const updates: Partial<Session> = { processingState: state }

    // Set timestamps based on state
    const now = new Date().toISOString()
    if (state === 'running') {
      updates.startedAt = now
    }
    if (state === 'completed' || state === 'error') {
      updates.endedAt = now
    }

    return this.update(id, updates)
  }

  /**
   * Toggle session flag
   * @param id Session ID
   * @returns Updated session
   */
  async toggleFlag(id: string): Promise<StorageResult<Session>> {
    const findResult = await this.findById(id)
    if (!findResult.success) {
      return { success: false, error: findResult.error }
    }

    if (!findResult.data) {
      return { success: false, error: `Session not found: ${id}` }
    }

    return this.update(id, { isFlagged: !findResult.data.isFlagged })
  }

  /**
   * Mark session as read
   * @param id Session ID
   * @returns Updated session
   */
  async markAsRead(id: string): Promise<StorageResult<Session>> {
    return this.update(id, { hasUnread: false })
  }

  /**
   * Increment message count
   * @param id Session ID
   * @returns Updated session
   */
  async incrementMessageCount(id: string): Promise<StorageResult<Session>> {
    const findResult = await this.findById(id)
    if (!findResult.success) {
      return { success: false, error: findResult.error }
    }

    if (!findResult.data) {
      return { success: false, error: `Session not found: ${id}` }
    }

    return this.update(id, {
      messageCount: findResult.data.messageCount + 1,
      hasUnread: true,
    })
  }

  /**
   * Set CLI session ID
   * @param id Session ID
   * @param cliSessionId CLI session ID
   * @returns Updated session
   */
  async setCliSessionId(id: string, cliSessionId: string): Promise<StorageResult<Session>> {
    return this.update(id, { cliSessionId })
  }

  /**
   * Set error message
   * @param id Session ID
   * @param errorMessage Error message
   * @returns Updated session
   */
  async setError(id: string, errorMessage: string): Promise<StorageResult<Session>> {
    return this.update(id, {
      processingState: 'error',
      errorMessage,
      endedAt: new Date().toISOString(),
    })
  }

  /**
   * Delete all sessions for a project
   * @param projectId Project ID
   * @returns Number of deleted sessions
   */
  async deleteByProject(projectId: string): Promise<StorageResult<number>> {
    return this.deleteWhere((session) => session.projectId === projectId)
  }

  // ===========================================================================
  // Summary Methods
  // ===========================================================================

  /**
   * Get session summaries for a project
   * @param projectId Project ID
   * @param sort Optional sort options
   * @returns Array of session summaries
   */
  async getSummaries(
    projectId: string,
    sort?: SessionSort
  ): Promise<StorageResult<SessionSummary[]>> {
    const result = await this.findByProject(projectId, sort)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    const summaries = result.data.map(toSummary)
    return { success: true, data: summaries }
  }

  /**
   * Get session summaries with filter
   * @param filter Filter options
   * @param sort Sort options
   * @returns Array of session summaries
   */
  async getSummariesByFilter(
    filter: SessionFilter,
    sort?: SessionSort
  ): Promise<StorageResult<SessionSummary[]>> {
    const result = await this.findByFilter(filter, sort)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    const summaries = result.data.map(toSummary)
    return { success: true, data: summaries }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Sort sessions by field
   */
  private sortSessions(sessions: Session[], sort: SessionSort): Session[] {
    const sorted = [...sessions]

    sorted.sort((a, b) => {
      let aVal: string | number
      let bVal: string | number

      switch (sort.field) {
        case 'createdAt':
          aVal = a.createdAt
          bVal = b.createdAt
          break
        case 'updatedAt':
          aVal = a.updatedAt ?? a.createdAt
          bVal = b.updatedAt ?? b.createdAt
          break
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        case 'messageCount':
          aVal = a.messageCount
          bVal = b.messageCount
          break
        default:
          aVal = a.createdAt
          bVal = b.createdAt
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sort.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sort.direction === 'asc' ? aVal - bVal : bVal - aVal
      }

      return 0
    })

    return sorted
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Singleton instance for session storage
 */
export const sessionStorage = new SessionStorageService()

export default SessionStorageService
