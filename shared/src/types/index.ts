/**
 * Shared type definitions
 * @module @task-filewas/shared/types
 */

// =============================================================================
// Base Types
// =============================================================================

/**
 * Base entity with common fields
 */
export interface BaseEntity {
  /** Unique identifier */
  id: string;
  /** Creation timestamp (ISO string) */
  createdAt: string;
  /** Last update timestamp (ISO string) */
  updatedAt?: string;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if unsuccessful */
  error?: string;
  /** Additional metadata */
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

/**
 * Pagination parameters for list requests
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Items to skip (alternative to page) */
  offset?: number;
}

/**
 * Paginated response with metadata
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    /** Total number of items */
    total: number;
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of pages */
    totalPages: number;
  };
}

// =============================================================================
// Common Enums / Types
// =============================================================================

/**
 * Phase status in a roadmap
 */
export type PhaseStatus = 'pending' | 'in_progress' | 'completed';

/**
 * Agent runtime status
 */
export type AgentStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed';

/**
 * Permission mode for Claude CLI operations
 */
export type PermissionMode = 'safe' | 'ask' | 'auto';

/**
 * Thinking level for Claude
 */
export type ThinkingLevel = 'off' | 'think' | 'max';

/**
 * Model provider selection
 */
export type ModelProvider = 'claude' | 'glm';

// =============================================================================
// Re-exports from module files
// =============================================================================

// Project types
export type {
  ProjectStatus,
  ProjectType,
  ProjectVersion,
  GitHubInfo,
  ProjectSettings,
  TechStack,
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectSummary,
  ProjectWithVersion,
} from './project';

// Session types
export type {
  SessionStatus,
  SessionMode,
  SessionProcessingState,
  TokenUsage,
  SessionPhaseProgress,
  SessionLabel,
  SessionAgent,
  Session,
  SessionCreate,
  SessionUpdate,
  SessionSummary,
  SessionWithMessages,
  SessionFilter,
  SessionSort,
} from './session';

// Message types
export type {
  MessageRole,
  MessageContentType,
  ToolName,
  ToolStatus,
  Message,
  MessageMetadata,
  ToolUseActivity,
  ToolResultActivity,
  Activity,
  Turn,
  MessageCreate,
  MessageChunk,
  TodoItem,
  TodoList,
  Plan,
  MessageHistory,
  WSMessageType,
  WSMessage,
  WSOutputMessage,
  WSStatusMessage,
  WSErrorMessage,
} from './message';
