/**
 * Session type definitions
 * @module @task-filewas/shared/types/session
 */

import type { BaseEntity } from './index';
import type { PermissionMode, ThinkingLevel, ModelProvider } from './index';

/**
 * Session status values
 * Built-in statuses following the workflow:
 * todo → in-progress → needs-review → done
 *                                    ↓
 *                               cancelled
 */
export type SessionStatus =
  | 'todo'
  | 'in-progress'
  | 'needs-review'
  | 'done'
  | 'cancelled';

/**
 * Session mode determines how the session operates
 */
export type SessionMode =
  | 'quick-chat'   // Single task, quick conversation
  | 'planning'     // Complex project planning, roadmap creation
  | 'tdd'          // Test-driven development workflow
  | 'debug'        // Debugging focused session
  | 'code-review'; // Code review session

/**
 * Session processing state (runtime state)
 */
export type SessionProcessingState =
  | 'idle'         // Not currently processing
  | 'starting'     // Session is starting up
  | 'running'      // Actively processing
  | 'paused'       // Paused by user
  | 'stopping'     // In process of stopping
  | 'completed'    // Finished successfully
  | 'error';       // Error occurred

/**
 * Token usage tracking
 */
export interface TokenUsage {
  /** Input tokens consumed */
  inputTokens: number;
  /** Output tokens generated */
  outputTokens: number;
  /** Tokens used for cache creation */
  cacheCreationTokens: number;
  /** Tokens read from cache */
  cacheReadTokens: number;
  /** Total context tokens used */
  totalContext: number;
  /** Percentage of context limit used */
  percentUsed: number;
}

/**
 * Phase progress within a session
 */
export interface SessionPhaseProgress {
  /** Current phase ID */
  currentPhase: number;
  /** Total phases in roadmap */
  totalPhases: number;
  /** Phase name */
  phaseName?: string;
  /** Phase status */
  phaseStatus: 'pending' | 'in_progress' | 'completed';
}

/**
 * Session label/tag
 */
export interface SessionLabel {
  /** Label ID */
  id: string;
  /** Label name */
  name: string;
  /** Label color (hex or CSS color) */
  color: string;
}

/**
 * Agent information within a session
 */
export interface SessionAgent {
  /** Agent ID */
  id: string;
  /** Agent type (planner, implementer, etc.) */
  type: string;
  /** Model being used */
  model: ModelProvider;
  /** Agent status */
  status: 'pending' | 'running' | 'completed' | 'error';
  /** Start time */
  startedAt?: string;
  /** End time */
  completedAt?: string;
  /** Duration in milliseconds */
  duration?: number;
}

/**
 * Full Session interface
 */
export interface Session extends BaseEntity {
  /** Parent project ID */
  projectId: string;
  /** Session title/summary */
  title: string;
  /** Session description */
  description?: string;
  /** Session status (workflow state) */
  status: SessionStatus;
  /** Session mode */
  mode: SessionMode;
  /** Processing state (runtime) */
  processingState: SessionProcessingState;
  /** Permission mode for this session */
  permissionMode: PermissionMode;
  /** Thinking level */
  thinkingLevel: ThinkingLevel;
  /** Model provider preference */
  modelProvider: ModelProvider | 'auto';
  /** Version this session belongs to */
  version: string;
  /** Phase progress (for autonomous mode) */
  phaseProgress?: SessionPhaseProgress;
  /** Token usage */
  tokenUsage?: TokenUsage;
  /** Labels/tags */
  labels: SessionLabel[];
  /** Is session flagged */
  isFlagged: boolean;
  /** Has unread messages */
  hasUnread: boolean;
  /** Has an active plan */
  hasPlan: boolean;
  /** Number of messages */
  messageCount: number;
  /** CLI session ID (for resume) */
  cliSessionId?: string;
  /** Active agents */
  agents?: SessionAgent[];
  /** Session start time */
  startedAt?: string;
  /** Session end time */
  endedAt?: string;
  /** Total duration in milliseconds */
  duration?: number;
  /** Error message if any */
  errorMessage?: string;
  /** JSONL file path for this session */
  logFile?: string;
}

/**
 * Data required to create a new session
 */
export interface SessionCreate {
  /** Parent project ID (required) */
  projectId: string;
  /** Session title */
  title: string;
  /** Session description */
  description?: string;
  /** Session mode */
  mode?: SessionMode;
  /** Permission mode */
  permissionMode?: PermissionMode;
  /** Thinking level */
  thinkingLevel?: ThinkingLevel;
  /** Model provider preference */
  modelProvider?: ModelProvider | 'auto';
  /** Version to use */
  version?: string;
  /** Initial labels */
  labels?: string[];
  /** Is flagged */
  isFlagged?: boolean;
}

/**
 * Data for updating an existing session
 */
export interface SessionUpdate {
  /** Updated title */
  title?: string;
  /** Updated description */
  description?: string;
  /** Updated status */
  status?: SessionStatus;
  /** Updated mode */
  mode?: SessionMode;
  /** Updated permission mode */
  permissionMode?: PermissionMode;
  /** Updated thinking level */
  thinkingLevel?: ThinkingLevel;
  /** Updated model provider */
  modelProvider?: ModelProvider | 'auto';
  /** Updated labels */
  labels?: SessionLabel[];
  /** Updated flag status */
  isFlagged?: boolean;
  /** Mark as read */
  hasUnread?: boolean;
}

/**
 * Session summary for list views
 */
export interface SessionSummary {
  /** Session ID */
  id: string;
  /** Project ID */
  projectId: string;
  /** Session title */
  title: string;
  /** Session status */
  status: SessionStatus;
  /** Session mode */
  mode: SessionMode;
  /** Processing state */
  processingState: SessionProcessingState;
  /** Model provider */
  modelProvider: ModelProvider | 'auto';
  /** Permission mode */
  permissionMode: PermissionMode;
  /** Phase progress */
  phaseProgress?: SessionPhaseProgress;
  /** Labels */
  labels: SessionLabel[];
  /** Is flagged */
  isFlagged: boolean;
  /** Has unread */
  hasUnread: boolean;
  /** Has plan */
  hasPlan: boolean;
  /** Message count */
  messageCount: number;
  /** Last activity */
  updatedAt?: string;
  /** Created timestamp */
  createdAt: string;
}

/**
 * Session with full message history
 */
export interface SessionWithMessages extends Session {
  /** Full message history */
  messages: import('./message').Message[];
}

/**
 * Session filter options
 */
export interface SessionFilter {
  /** Filter by project ID */
  projectId?: string;
  /** Filter by status */
  status?: SessionStatus | SessionStatus[];
  /** Filter by mode */
  mode?: SessionMode | SessionMode[];
  /** Filter by label IDs */
  labelIds?: string[];
  /** Filter flagged only */
  isFlagged?: boolean;
  /** Filter unread only */
  hasUnread?: boolean;
  /** Filter by version */
  version?: string;
  /** Search query (title, description) */
  search?: string;
  /** Date range start */
  fromDate?: string;
  /** Date range end */
  toDate?: string;
}

/**
 * Session sort options
 */
export interface SessionSort {
  /** Field to sort by */
  field: 'createdAt' | 'updatedAt' | 'title' | 'status' | 'messageCount';
  /** Sort direction */
  direction: 'asc' | 'desc';
}
