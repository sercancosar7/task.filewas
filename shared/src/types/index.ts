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
// Common Enums / Types
// =============================================================================

/**
 * Phase status in a roadmap
 */
export type PhaseStatus = 'pending' | 'in_progress' | 'completed';

/**
 * Agent runtime status (legacy, use AgentRuntimeStatus from agent.ts)
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

// API types
export type {
  ApiResponse,
  ApiMeta,
  PaginatedResponse,
  PaginationMeta,
  ApiErrorCode,
  ApiError,
  FieldError,
  ApiErrorResponse,
  PaginationParams,
  SortParams,
  ListParams,
  DateRangeFilter,
  HealthCheckResponse,
  ServiceStatus,
  LoginRequest,
  LoginResponse,
  VerifyTokenResponse,
  BatchRequest,
  BatchResult,
  BatchDeleteRequest,
  BatchUpdateRequest,
  SSEMessage,
  StreamStatus,
} from './api';

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

// Agent types
export type {
  AgentRuntimeStatus,
  AgentType,
  AgentCapabilities,
  AgentConfig,
  AgentModelMapping,
  Agent,
  AgentTokenUsage,
  AgentSummary,
  ToolInput,
  ToolCall,
  ToolResult,
  AgentHandoff,
  TaskPriority,
  TaskType,
  AgentTask,
  TaskQueue,
  OrchestratorConfig,
  OrchestrationState,
  AgentEventType,
  AgentEvent,
  AgentSpawnedEvent,
  AgentProgressEvent,
  AgentCompletedEvent,
  AgentErrorEvent,
} from './agent';

// WebSocket event types
export type {
  WSDirection,
  WSBaseMessage,
  ServerEventType,
  ServerMessage,
  ConnectedEvent,
  PingEvent,
  SessionCreatedEvent,
  SessionUpdatedEvent,
  SessionDeletedEvent,
  SessionStartedEvent,
  SessionPausedEvent,
  SessionResumedEvent,
  SessionStoppedEvent,
  SessionEndedEvent,
  SessionErrorEvent,
  SessionRefreshingEvent,
  SessionRefreshedEvent,
  SessionRefreshFailedEvent,
  MessageNewEvent,
  MessageChunkEvent,
  MessageCompleteEvent,
  MessageErrorEvent,
  AgentSpawnedEventWS,
  AgentStartedEvent,
  AgentProgressEventWS,
  AgentPausedEvent,
  AgentResumedEvent,
  AgentCompletedEventWS,
  AgentErrorEventWS,
  AgentStoppedEvent,
  ToolCalledEvent,
  ToolProgressEvent,
  ToolResultEvent,
  ToolErrorEvent,
  PhaseStartedEvent,
  PhaseProgressEvent,
  PhaseCompletedEvent,
  PhaseErrorEvent,
  ContextWarningEvent,
  ContextOverflowEvent,
  TokenUsageEvent,
  FileChange,
  DiffUpdateEvent,
  TestStartedEvent,
  TestProgressEvent,
  TestResultEvent,
  TaskStartedEvent,
  TaskProgressEvent,
  TaskCompletedEvent,
  TaskErrorEvent,
  TaskCancelledEvent,
  OutputEvent,
  ClientEventType,
  ClientMessage,
  PongEvent,
  SubscribeEvent,
  UnsubscribeEvent,
  TypingEvent,
  StopEvent,
  PauseEvent,
  ResumeEvent,
  ServerEvents,
  ClientEvents,
  WSEvents,
} from './websocket';

// WebSocket type guards
export {
  isServerEvent,
  isClientEvent,
  isSessionEvent,
  isAgentEvent,
  isToolEvent,
  isPhaseEvent,
} from './websocket';
