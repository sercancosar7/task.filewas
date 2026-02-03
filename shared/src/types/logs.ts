/**
 * Log Types
 * System log definitions
 * @module @task-filewas/shared/types/logs
 */

// =============================================================================
// Log Type Enums
// =============================================================================

/**
 * Log entry types
 */
export type LogType = 'api' | 'agent' | 'error' | 'system' | 'session';

/**
 * Log level severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// =============================================================================
// Log Entry Types
// =============================================================================

/**
 * Single log entry
 */
export interface LogEntry {
  /** Unique identifier */
  id: string;
  /** Log type */
  type: LogType;
  /** Log level */
  level: LogLevel;
  /** Timestamp (ISO string) */
  timestamp: string;
  /** Log title/message */
  title: string;
  /** Optional detailed message */
  message?: string;
  /** Optional error details */
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
  /** Optional metadata (context, request info, etc.) */
  metadata?: Record<string, unknown>;
  /** Related entity IDs (sessionId, projectId, etc.) */
  entityIds?: {
    sessionId?: string;
    projectId?: string;
    phaseId?: number;
    agentId?: string;
  };
  /** Related navigation path */
  navigateTo?: {
    path: string;
    params?: Record<string, string | number>;
  };
}

/**
 * Log filter options
 */
export interface LogFilterOptions {
  /** Filter by log type */
  type?: LogType | LogType[];
  /** Filter by log level */
  level?: LogLevel | LogLevel[];
  /** Filter by date range (start timestamp) */
  since?: string;
  /** Filter by date range (end timestamp) */
  until?: string;
  /** Filter by entity ID */
  sessionId?: string;
  /** Filter by entity ID */
  projectId?: string;
  /** Search in title and message */
  search?: string;
  /** Maximum number of logs to return */
  limit?: number;
  /** Number of logs to skip */
  offset?: number;
}

/**
 * Log statistics
 */
export interface LogStats {
  /** Total log count */
  total: number;
  /** Logs grouped by type */
  byType: Record<LogType, number>;
  /** Logs grouped by level */
  byLevel: Record<LogLevel, number>;
  /** Recent logs */
  recent: LogEntry[];
}
