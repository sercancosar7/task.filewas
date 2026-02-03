/**
 * Logs Storage Service
 * System logs management (api, agent, error logs)
 * @module @task-filewas/backend/storage/logs
 */

import { resolveDataPath, fileExists, ensureDir } from './jsonl.js'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { StorageResult } from './jsonl.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Log entry types
 */
export type LogType = 'api' | 'agent' | 'error' | 'system' | 'session'

/**
 * Log level severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Single log entry
 */
export interface LogEntry {
  /** Unique identifier */
  id: string
  /** Log type */
  type: LogType
  /** Log level */
  level: LogLevel
  /** Timestamp (ISO string) */
  timestamp: string
  /** Log title/message */
  title: string
  /** Optional detailed message */
  message?: string
  /** Optional error details */
  error?: {
    name?: string
    message: string
    stack?: string
  }
  /** Optional metadata (context, request info, etc.) */
  metadata?: Record<string, unknown>
  /** Related entity IDs (sessionId, projectId, etc.) */
  entityIds?: {
    sessionId?: string
    projectId?: string
    phaseId?: number
    agentId?: string
  }
  /** Related navigation path */
  navigateTo?: {
    path: string
    params?: Record<string, string | number>
  }
}

/**
 * Logs data structure
 */
export interface LogsData {
  logs: LogEntry[]
}

/**
 * Log filter options
 */
export interface LogFilterOptions {
  /** Filter by log type */
  type?: LogType | LogType[]
  /** Filter by log level */
  level?: LogLevel | LogLevel[]
  /** Filter by date range (start timestamp) */
  since?: string
  /** Filter by date range (end timestamp) */
  until?: string
  /** Filter by entity ID */
  sessionId?: string
  /** Filter by entity ID */
  projectId?: string
  /** Search in title and message */
  search?: string
  /** Maximum number of logs to return */
  limit?: number
  /** Number of logs to skip */
  offset?: number
}

// =============================================================================
// File Paths
// =============================================================================

/** Path to logs directory */
const LOGS_DIR = resolveDataPath('logs')

/** Path to main logs.json file */
const LOGS_FILE = join(LOGS_DIR, 'logs.json')

/** Path to archived logs directory */
const ARCHIVE_DIR = join(LOGS_DIR, 'archive')

// =============================================================================
// Default Data
// =============================================================================

const DEFAULT_LOGS_DATA: LogsData = {
  logs: [],
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate unique log ID
 */
function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Ensure logs directory exists
 */
async function ensureLogsDir(): Promise<void> {
  try {
    await ensureDir(LOGS_DIR)
    await ensureDir(ARCHIVE_DIR)
  } catch {
    // Ignore if already exists
  }
}

/**
 * Read logs data
 */
async function readLogsData(): Promise<StorageResult<LogsData>> {
  try {
    await ensureLogsDir()

    const exists = await fileExists(LOGS_FILE)
    if (!exists) {
      return { success: true, data: DEFAULT_LOGS_DATA }
    }

    const content = await readFile(LOGS_FILE, 'utf-8')
    const data = JSON.parse(content) as LogsData

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to read logs: ${message}` }
  }
}

/**
 * Write logs data
 */
async function writeLogsData(data: LogsData): Promise<StorageResult<void>> {
  try {
    await ensureLogsDir()

    const content = JSON.stringify(data, null, 2)
    await writeFile(LOGS_FILE, content, 'utf-8')

    return { success: true, data: undefined }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to write logs: ${message}` }
  }
}

/**
 * Check if log matches filter criteria
 */
function matchesFilter(log: LogEntry, filter: LogFilterOptions): boolean {
  // Type filter
  if (filter.type) {
    const types = Array.isArray(filter.type) ? filter.type : [filter.type]
    if (!types.includes(log.type)) {
      return false
    }
  }

  // Level filter
  if (filter.level) {
    const levels = Array.isArray(filter.level) ? filter.level : [filter.level]
    if (!levels.includes(log.level)) {
      return false
    }
  }

  // Date range filter
  if (filter.since && log.timestamp < filter.since) {
    return false
  }
  if (filter.until && log.timestamp > filter.until) {
    return false
  }

  // Entity filters
  if (filter.sessionId && log.entityIds?.sessionId !== filter.sessionId) {
    return false
  }
  if (filter.projectId && log.entityIds?.projectId !== filter.projectId) {
    return false
  }

  // Search filter
  if (filter.search) {
    const searchLower = filter.search.toLowerCase()
    const titleMatch = log.title.toLowerCase().includes(searchLower)
    const messageMatch = log.message?.toLowerCase().includes(searchLower)
    if (!titleMatch && !messageMatch) {
      return false
    }
  }

  return true
}

// =============================================================================
// Logs Operations
// =============================================================================

/**
 * Get all logs (with optional filtering)
 * @param filter Optional filter options
 * @returns Filtered logs
 */
export async function getLogs(filter?: LogFilterOptions): Promise<StorageResult<LogEntry[]>> {
  const result = await readLogsData()

  if (!result.success) {
    return result
  }

  let logs = result.data!.logs

  // Apply filters
  if (filter) {
    logs = logs.filter(log => matchesFilter(log, filter))
  }

  // Sort by timestamp descending (newest first)
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Apply pagination
  if (filter) {
    if (filter.offset && filter.offset > 0) {
      logs = logs.slice(filter.offset)
    }
    if (filter.limit && filter.limit > 0) {
      logs = logs.slice(0, filter.limit)
    }
  }

  return { success: true, data: logs }
}

/**
 * Get logs grouped by type (for summary view)
 * @returns Logs grouped by type
 */
export async function getLogsByType(): Promise<StorageResult<Record<LogType, LogEntry[]>>> {
  const result = await getLogs()

  if (!result.success) {
    return result
  }

  const logs = result.data!

  const grouped: Record<LogType, LogEntry[]> = {
    api: [],
    agent: [],
    error: [],
    system: [],
    session: [],
  }

  for (const log of logs) {
    if (grouped[log.type]) {
      grouped[log.type].push(log)
    }
  }

  return { success: true, data: grouped }
}

/**
 * Get recent logs (last N logs)
 * @param count Number of recent logs to return
 * @param type Optional type filter
 * @returns Recent logs
 */
export async function getRecentLogs(count: number = 50, type?: LogType): Promise<StorageResult<LogEntry[]>> {
  return getLogs({
    limit: count,
    ...(type && { type }),
  })
}

/**
 * Get a single log by ID
 * @param id Log ID
 * @returns Log entry or null if not found
 */
export async function getLogById(id: string): Promise<StorageResult<LogEntry | null>> {
  const result = await getLogs()

  if (!result.success) {
    return { success: false, error: result.error }
  }

  const log = result.data!.find(l => l.id === id) ?? null

  return { success: true, data: log }
}

/**
 * Add a new log entry
 * @param entry Log entry data (without id and timestamp)
 * @returns Created log entry
 */
export async function addLog(
  entry: Omit<LogEntry, 'id' | 'timestamp'>
): Promise<StorageResult<LogEntry>> {
  const result = await readLogsData()

  if (!result.success) {
    return result
  }

  const logs = result.data!

  const newLog: LogEntry = {
    ...entry,
    id: generateLogId(),
    timestamp: new Date().toISOString(),
  }

  logs.logs.push(newLog)

  // Keep only last 10,000 logs to prevent file bloat
  if (logs.logs.length > 10000) {
    logs.logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    logs.logs = logs.logs.slice(-10000)
  }

  const writeResult = await writeLogsData(logs)

  if (!writeResult.success) {
    return writeResult
  }

  return { success: true, data: newLog }
}

/**
 * Add an API log (request/response logging)
 * @param method HTTP method
 * @param path Request path
 * @param statusCode Response status code
 * @param duration Request duration in ms
 * @param metadata Additional metadata
 * @returns Created log entry
 */
export async function addApiLog(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  metadata?: Record<string, unknown>
): Promise<StorageResult<LogEntry>> {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'

  return addLog({
    type: 'api',
    level,
    title: `${method} ${path} - ${statusCode}`,
    message: `Request completed in ${duration}ms`,
    metadata: {
      method,
      path,
      statusCode,
      duration,
      ...metadata,
    },
  })
}

/**
 * Add an agent log (agent activity)
 * @param agentName Agent name
 * @param action Action performed
 * @param metadata Additional metadata
 * @returns Created log entry
 */
export async function addAgentLog(
  agentName: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<StorageResult<LogEntry>> {
  return addLog({
    type: 'agent',
    level: 'info',
    title: `${agentName}: ${action}`,
    ...(metadata !== undefined && { metadata }),
  })
}

/**
 * Add an error log
 * @param title Error title
 * @param error Error object or message
 * @param metadata Additional context
 * @returns Created log entry
 */
export async function addErrorLog(
  title: string,
  error: Error | string,
  metadata?: Record<string, unknown>
): Promise<StorageResult<LogEntry>> {
  const errorObj = typeof error === 'string'
    ? { message: error }
    : {
        ...(error.name && { name: error.name }),
        message: error.message,
        ...(error.stack && { stack: error.stack }),
      }

  return addLog({
    type: 'error',
    level: 'error',
    title,
    error: errorObj,
    ...(metadata !== undefined && { metadata }),
  })
}

/**
 * Add a session log
 * @param sessionId Session ID
 * @param action Session action (started, stopped, etc.)
 * @param metadata Additional metadata
 * @returns Created log entry
 */
export async function addSessionLog(
  sessionId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<StorageResult<LogEntry>> {
  return addLog({
    type: 'session',
    level: 'info',
    title: `Session ${action}`,
    message: `Session ${sessionId} ${action.toLowerCase()}`,
    entityIds: { sessionId },
    navigateTo: { path: `/sessions/${sessionId}` },
    ...(metadata !== undefined && { metadata }),
  })
}

/**
 * Delete logs older than specified days
 * @param days Number of days to keep
 * @returns Number of deleted logs
 */
export async function cleanOldLogs(days: number = 30): Promise<StorageResult<number>> {
  const result = await readLogsData()

  if (!result.success) {
    return result
  }

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const logs = result.data!
  const initialCount = logs.logs.length

  logs.logs = logs.logs.filter(log => {
    const logDate = new Date(log.timestamp)
    return logDate > cutoffDate
  })

  const deletedCount = initialCount - logs.logs.length

  if (deletedCount > 0) {
    const writeResult = await writeLogsData(logs)
    if (!writeResult.success) {
      return { success: false, error: writeResult.error }
    }
  }

  return { success: true, data: deletedCount }
}

/**
 * Get log statistics
 * @returns Log statistics by type and level
 */
export async function getLogStats(): Promise<
  StorageResult<{
    total: number
    byType: Record<LogType, number>
    byLevel: Record<LogLevel, number>
    recent: LogEntry[]
  }>
> {
  const result = await getLogs({ limit: 1000 })

  if (!result.success) {
    return result
  }

  const logs = result.data!

  const byType: Record<LogType, number> = {
    api: 0,
    agent: 0,
    error: 0,
    system: 0,
    session: 0,
  }

  const byLevel: Record<LogLevel, number> = {
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
  }

  for (const log of logs) {
    byType[log.type]++
    byLevel[log.level]++
  }

  return {
    success: true,
    data: {
      total: logs.length,
      byType,
      byLevel,
      recent: logs.slice(0, 10),
    },
  }
}

export default {
  getLogs,
  getLogsByType,
  getRecentLogs,
  getLogById,
  addLog,
  addApiLog,
  addAgentLog,
  addErrorLog,
  addSessionLog,
  cleanOldLogs,
  getLogStats,
}
