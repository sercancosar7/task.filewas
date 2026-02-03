/**
 * WebSocket event type definitions
 * @module @task-filewas/shared/types/websocket
 */

import type { MessageRole, ToolName } from './message';
import type { SessionStatus, SessionProcessingState, TokenUsage } from './session';
import type { AgentType, AgentTokenUsage } from './agent';
import type { ModelProvider } from './index';

// =============================================================================
// Base WebSocket Types
// =============================================================================

/**
 * WebSocket message directions
 */
export type WSDirection = 'server-to-client' | 'client-to-server' | 'bidirectional';

/**
 * Base WebSocket message
 */
export interface WSBaseMessage {
  /** Message type */
  type: string;
  /** Timestamp (ISO string) */
  timestamp: string;
  /** Optional session ID */
  sessionId?: string;
}

// =============================================================================
// Server to Client Events
// =============================================================================

/**
 * All server event types
 */
export type ServerEventType =
  // Connection events
  | 'connected'
  | 'ping'
  // Session events
  | 'session:created'
  | 'session:updated'
  | 'session:deleted'
  | 'session:started'
  | 'session:paused'
  | 'session:resumed'
  | 'session:stopped'
  | 'session:ended'
  | 'session:error'
  | 'session:refreshing'
  | 'session:refreshed'
  | 'session:refresh_failed'
  // Message events
  | 'message:new'
  | 'message:chunk'
  | 'message:complete'
  | 'message:error'
  // Agent events
  | 'agent:spawned'
  | 'agent:started'
  | 'agent:progress'
  | 'agent:paused'
  | 'agent:resumed'
  | 'agent:completed'
  | 'agent:error'
  | 'agent:stopped'
  // Tool events
  | 'tool:called'
  | 'tool:progress'
  | 'tool:result'
  | 'tool:error'
  // Phase events
  | 'phase:started'
  | 'phase:progress'
  | 'phase:completed'
  | 'phase:error'
  // Context events
  | 'context:warning'
  | 'context:overflow'
  | 'token:usage'
  // Diff events
  | 'diff:update'
  // Test events
  | 'test:started'
  | 'test:progress'
  | 'test:result'
  // Task events (background tasks)
  | 'task:started'
  | 'task:progress'
  | 'task:completed'
  | 'task:error'
  | 'task:cancelled'
  // Output events
  | 'output';

/**
 * Server to client message wrapper
 */
export interface ServerMessage<T extends ServerEventType = ServerEventType, D = unknown>
  extends WSBaseMessage {
  type: T;
  data?: D;
}

// =============================================================================
// Connection Events
// =============================================================================

/**
 * Client connected event
 */
export interface ConnectedEvent extends ServerMessage<'connected'> {
  data: {
    /** Assigned client ID */
    clientId: string;
    /** Server version */
    serverVersion?: string;
  };
}

/**
 * Ping event (for keepalive)
 */
export interface PingEvent extends ServerMessage<'ping'> {
  data?: undefined;
}

// =============================================================================
// Session Events
// =============================================================================

/**
 * Session created event
 */
export interface SessionCreatedEvent extends ServerMessage<'session:created'> {
  sessionId: string;
  data: {
    projectId: string;
    title: string;
    status: SessionStatus;
  };
}

/**
 * Session updated event
 */
export interface SessionUpdatedEvent extends ServerMessage<'session:updated'> {
  sessionId: string;
  data: {
    status?: SessionStatus;
    processingState?: SessionProcessingState;
    title?: string;
    [key: string]: unknown;
  };
}

/**
 * Session deleted event
 */
export interface SessionDeletedEvent extends ServerMessage<'session:deleted'> {
  sessionId: string;
}

/**
 * Session started event
 */
export interface SessionStartedEvent extends ServerMessage<'session:started'> {
  sessionId: string;
  data: {
    phaseId?: number;
    phaseName?: string;
    cliSessionId?: string;
  };
}

/**
 * Session paused event
 */
export interface SessionPausedEvent extends ServerMessage<'session:paused'> {
  sessionId: string;
  data: {
    tokenUsage?: TokenUsage;
    messagesCount?: number;
  };
}

/**
 * Session resumed event
 */
export interface SessionResumedEvent extends ServerMessage<'session:resumed'> {
  sessionId: string;
  data: {
    cliSessionId?: string;
  };
}

/**
 * Session stopped event
 */
export interface SessionStoppedEvent extends ServerMessage<'session:stopped'> {
  sessionId: string;
  data: {
    duration?: number;
    tokenUsage?: TokenUsage;
  };
}

/**
 * Session ended event
 */
export interface SessionEndedEvent extends ServerMessage<'session:ended'> {
  sessionId: string;
  data: {
    status: 'completed' | 'error' | 'stopped';
    duration?: number;
    tokenUsage?: TokenUsage;
    exitCode?: number;
  };
}

/**
 * Session error event
 */
export interface SessionErrorEvent extends ServerMessage<'session:error'> {
  sessionId: string;
  data: {
    error: string;
    code?: string;
  };
}

/**
 * Session refreshing event (context overflow)
 */
export interface SessionRefreshingEvent extends ServerMessage<'session:refreshing'> {
  sessionId: string;
  data: {
    reason: 'context_overflow' | 'manual';
    contextPercentage: number;
  };
}

/**
 * Session refreshed event
 */
export interface SessionRefreshedEvent extends ServerMessage<'session:refreshed'> {
  sessionId: string;
  data: {
    newCliSessionId: string;
    previousMessagesCount: number;
  };
}

/**
 * Session refresh failed event
 */
export interface SessionRefreshFailedEvent extends ServerMessage<'session:refresh_failed'> {
  sessionId: string;
  data: {
    error: string;
  };
}

// =============================================================================
// Message Events
// =============================================================================

/**
 * New message event
 */
export interface MessageNewEvent extends ServerMessage<'message:new'> {
  sessionId: string;
  data: {
    messageId: string;
    role: MessageRole;
    content: string;
    contentType: 'text' | 'tool_use' | 'tool_result' | 'system';
  };
}

/**
 * Message chunk event (streaming)
 */
export interface MessageChunkEvent extends ServerMessage<'message:chunk'> {
  sessionId: string;
  data: {
    messageId: string;
    chunk: string;
    isFinal: boolean;
  };
}

/**
 * Message complete event
 */
export interface MessageCompleteEvent extends ServerMessage<'message:complete'> {
  sessionId: string;
  data: {
    messageId: string;
    fullContent?: string;
  };
}

/**
 * Message error event
 */
export interface MessageErrorEvent extends ServerMessage<'message:error'> {
  sessionId: string;
  data: {
    messageId?: string;
    error: string;
  };
}

// =============================================================================
// Agent Events
// =============================================================================

/**
 * Agent spawned event
 */
export interface AgentSpawnedEventWS extends ServerMessage<'agent:spawned'> {
  sessionId: string;
  data: {
    agentId: string;
    agentType: AgentType;
    model: ModelProvider;
    parentAgentId?: string;
  };
}

/**
 * Agent started event
 */
export interface AgentStartedEvent extends ServerMessage<'agent:started'> {
  sessionId: string;
  data: {
    agentId: string;
    agentType: AgentType;
    model: ModelProvider;
    taskId?: string;
  };
}

/**
 * Agent progress event
 */
export interface AgentProgressEventWS extends ServerMessage<'agent:progress'> {
  sessionId: string;
  data: {
    agentId: string;
    progress: number;
    currentAction: string;
  };
}

/**
 * Agent paused event
 */
export interface AgentPausedEvent extends ServerMessage<'agent:paused'> {
  sessionId: string;
  data: {
    agentId: string;
  };
}

/**
 * Agent resumed event
 */
export interface AgentResumedEvent extends ServerMessage<'agent:resumed'> {
  sessionId: string;
  data: {
    agentId: string;
  };
}

/**
 * Agent completed event
 */
export interface AgentCompletedEventWS extends ServerMessage<'agent:completed'> {
  sessionId: string;
  data: {
    agentId: string;
    agentType: AgentType;
    duration: number;
    tokenUsage?: AgentTokenUsage;
    output?: string;
  };
}

/**
 * Agent error event
 */
export interface AgentErrorEventWS extends ServerMessage<'agent:error'> {
  sessionId: string;
  data: {
    agentId: string;
    error: string;
    retryCount: number;
    willRetry: boolean;
  };
}

/**
 * Agent stopped event
 */
export interface AgentStoppedEvent extends ServerMessage<'agent:stopped'> {
  sessionId: string;
  data: {
    agentId: string;
    reason: 'user' | 'system' | 'timeout';
  };
}

// =============================================================================
// Tool Events
// =============================================================================

/**
 * Tool called event
 */
export interface ToolCalledEvent extends ServerMessage<'tool:called'> {
  sessionId: string;
  data: {
    toolCallId: string;
    agentId?: string;
    toolName: ToolName;
    input: Record<string, unknown>;
    summary: string;
  };
}

/**
 * Tool progress event
 */
export interface ToolProgressEvent extends ServerMessage<'tool:progress'> {
  sessionId: string;
  data: {
    toolCallId: string;
    progress: number;
    statusText?: string;
  };
}

/**
 * Tool result event
 */
export interface ToolResultEvent extends ServerMessage<'tool:result'> {
  sessionId: string;
  data: {
    toolCallId: string;
    toolName: ToolName;
    success: boolean;
    output: string;
    duration?: number;
    truncated?: boolean;
  };
}

/**
 * Tool error event
 */
export interface ToolErrorEvent extends ServerMessage<'tool:error'> {
  sessionId: string;
  data: {
    toolCallId: string;
    toolName: ToolName;
    error: string;
  };
}

// =============================================================================
// Phase Events
// =============================================================================

/**
 * Phase started event
 */
export interface PhaseStartedEvent extends ServerMessage<'phase:started'> {
  sessionId: string;
  data: {
    phaseId: number;
    phaseName: string;
    totalPhases: number;
  };
}

/**
 * Phase progress event
 */
export interface PhaseProgressEvent extends ServerMessage<'phase:progress'> {
  sessionId: string;
  data: {
    phaseId: number;
    progress: number;
    currentTask?: string;
  };
}

/**
 * Phase completed event
 */
export interface PhaseCompletedEvent extends ServerMessage<'phase:completed'> {
  sessionId: string;
  data: {
    phaseId: number;
    phaseName: string;
    duration: number;
    nextPhaseId?: number;
  };
}

/**
 * Phase error event
 */
export interface PhaseErrorEvent extends ServerMessage<'phase:error'> {
  sessionId: string;
  data: {
    phaseId: number;
    error: string;
    willRetry: boolean;
  };
}

// =============================================================================
// Context & Token Events
// =============================================================================

/**
 * Context warning event (approaching limit)
 */
export interface ContextWarningEvent extends ServerMessage<'context:warning'> {
  sessionId: string;
  data: {
    percentage: number;
    warningThreshold: number;
    message: string;
  };
}

/**
 * Context overflow event
 */
export interface ContextOverflowEvent extends ServerMessage<'context:overflow'> {
  sessionId: string;
  data: {
    percentage: number;
    overflowThreshold: number;
    action: 'refresh' | 'stop';
    message: string;
  };
}

/**
 * Token usage update event
 */
export interface TokenUsageEvent extends ServerMessage<'token:usage'> {
  sessionId: string;
  data: TokenUsage;
}

// =============================================================================
// Diff Events
// =============================================================================

/**
 * File change entry
 */
export interface FileChange {
  /** File path */
  path: string;
  /** Change type */
  type: 'added' | 'modified' | 'deleted';
  /** Lines added */
  additions: number;
  /** Lines removed */
  deletions: number;
  /** Diff content (unified format) */
  diff?: string;
}

/**
 * Diff update event
 */
export interface DiffUpdateEvent extends ServerMessage<'diff:update'> {
  sessionId: string;
  data: {
    files: FileChange[];
    totalAdditions: number;
    totalDeletions: number;
  };
}

// =============================================================================
// Test Events
// =============================================================================

/**
 * Test started event
 */
export interface TestStartedEvent extends ServerMessage<'test:started'> {
  sessionId: string;
  data: {
    testId: string;
    type: 'unit' | 'integration' | 'e2e';
    name: string;
  };
}

/**
 * Test progress event
 */
export interface TestProgressEvent extends ServerMessage<'test:progress'> {
  sessionId: string;
  data: {
    testId: string;
    progress: number;
    currentTest?: string;
  };
}

/**
 * Test result event
 */
export interface TestResultEvent extends ServerMessage<'test:result'> {
  sessionId: string;
  data: {
    testId: string;
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    duration: number;
    output?: string;
    failures?: Array<{
      name: string;
      error: string;
    }>;
  };
}

// =============================================================================
// Task Events (Background Tasks)
// =============================================================================

/**
 * Task started event
 */
export interface TaskStartedEvent extends ServerMessage<'task:started'> {
  sessionId?: string;
  data: {
    taskId: string;
    taskType: 'build' | 'test' | 'deploy' | 'git' | 'file' | 'custom';
    title: string;
    description?: string;
    projectId?: string;
  };
}

/**
 * Task progress event
 */
export interface TaskProgressEvent extends ServerMessage<'task:progress'> {
  sessionId?: string;
  data: {
    taskId: string;
    progress: number;
    currentStep?: string;
    statusText?: string;
  };
}

/**
 * Task completed event
 */
export interface TaskCompletedEvent extends ServerMessage<'task:completed'> {
  sessionId?: string;
  data: {
    taskId: string;
    taskType: 'build' | 'test' | 'deploy' | 'git' | 'file' | 'custom';
    title: string;
    duration: number;
    success: boolean;
    output?: string;
  };
}

/**
 * Task error event
 */
export interface TaskErrorEvent extends ServerMessage<'task:error'> {
  sessionId?: string;
  data: {
    taskId: string;
    title: string;
    error: string;
    willRetry: boolean;
  };
}

/**
 * Task cancelled event
 */
export interface TaskCancelledEvent extends ServerMessage<'task:cancelled'> {
  sessionId?: string;
  data: {
    taskId: string;
    title: string;
    reason: 'user' | 'system' | 'timeout';
  };
}

// =============================================================================
// Output Event (Generic)
// =============================================================================

/**
 * Generic output event
 */
export interface OutputEvent extends ServerMessage<'output'> {
  sessionId: string;
  data: {
    messageType: 'text' | 'tool_use' | 'tool_result' | 'system';
    content?: string;
    role?: MessageRole;
    toolName?: ToolName;
    toolInput?: Record<string, unknown>;
    summary?: string;
    output?: string;
    variant?: 'info' | 'warning' | 'error';
  };
}

// =============================================================================
// Client to Server Events
// =============================================================================

/**
 * Client event types
 */
export type ClientEventType =
  | 'pong'
  | 'subscribe'
  | 'unsubscribe'
  | 'typing'
  | 'stop'
  | 'pause'
  | 'resume';

/**
 * Client to server message wrapper
 */
export interface ClientMessage<T extends ClientEventType = ClientEventType, D = unknown>
  extends WSBaseMessage {
  type: T;
  data?: D;
}

/**
 * Pong event (response to ping)
 */
export interface PongEvent extends ClientMessage<'pong'> {
  data?: undefined;
}

/**
 * Subscribe to session events
 */
export interface SubscribeEvent extends ClientMessage<'subscribe'> {
  sessionId: string;
}

/**
 * Unsubscribe from session events
 */
export interface UnsubscribeEvent extends ClientMessage<'unsubscribe'> {
  sessionId: string;
}

/**
 * Client typing indicator
 */
export interface TypingEvent extends ClientMessage<'typing'> {
  sessionId: string;
  data: {
    isTyping: boolean;
  };
}

/**
 * Client stop request
 */
export interface StopEvent extends ClientMessage<'stop'> {
  sessionId: string;
}

/**
 * Client pause request
 */
export interface PauseEvent extends ClientMessage<'pause'> {
  sessionId: string;
}

/**
 * Client resume request
 */
export interface ResumeEvent extends ClientMessage<'resume'> {
  sessionId: string;
}

// =============================================================================
// Union Types
// =============================================================================

/**
 * All server events
 */
export type ServerEvents =
  | ConnectedEvent
  | PingEvent
  | SessionCreatedEvent
  | SessionUpdatedEvent
  | SessionDeletedEvent
  | SessionStartedEvent
  | SessionPausedEvent
  | SessionResumedEvent
  | SessionStoppedEvent
  | SessionEndedEvent
  | SessionErrorEvent
  | SessionRefreshingEvent
  | SessionRefreshedEvent
  | SessionRefreshFailedEvent
  | MessageNewEvent
  | MessageChunkEvent
  | MessageCompleteEvent
  | MessageErrorEvent
  | AgentSpawnedEventWS
  | AgentStartedEvent
  | AgentProgressEventWS
  | AgentPausedEvent
  | AgentResumedEvent
  | AgentCompletedEventWS
  | AgentErrorEventWS
  | AgentStoppedEvent
  | ToolCalledEvent
  | ToolProgressEvent
  | ToolResultEvent
  | ToolErrorEvent
  | PhaseStartedEvent
  | PhaseProgressEvent
  | PhaseCompletedEvent
  | PhaseErrorEvent
  | ContextWarningEvent
  | ContextOverflowEvent
  | TokenUsageEvent
  | DiffUpdateEvent
  | TestStartedEvent
  | TestProgressEvent
  | TestResultEvent
  | TaskStartedEvent
  | TaskProgressEvent
  | TaskCompletedEvent
  | TaskErrorEvent
  | TaskCancelledEvent
  | OutputEvent;

/**
 * All client events
 */
export type ClientEvents =
  | PongEvent
  | SubscribeEvent
  | UnsubscribeEvent
  | TypingEvent
  | StopEvent
  | PauseEvent
  | ResumeEvent;

/**
 * All WebSocket events
 */
export type WSEvents = ServerEvents | ClientEvents;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if message is a server event
 */
export function isServerEvent(msg: WSBaseMessage): msg is ServerEvents {
  const serverTypes: ServerEventType[] = [
    'connected',
    'ping',
    'session:created',
    'session:updated',
    'session:deleted',
    'session:started',
    'session:paused',
    'session:resumed',
    'session:stopped',
    'session:ended',
    'session:error',
    'session:refreshing',
    'session:refreshed',
    'session:refresh_failed',
    'message:new',
    'message:chunk',
    'message:complete',
    'message:error',
    'agent:spawned',
    'agent:started',
    'agent:progress',
    'agent:paused',
    'agent:resumed',
    'agent:completed',
    'agent:error',
    'agent:stopped',
    'tool:called',
    'tool:progress',
    'tool:result',
    'tool:error',
    'phase:started',
    'phase:progress',
    'phase:completed',
    'phase:error',
    'context:warning',
    'context:overflow',
    'token:usage',
    'diff:update',
    'test:started',
    'test:progress',
    'test:result',
    'task:started',
    'task:progress',
    'task:completed',
    'task:error',
    'task:cancelled',
    'output',
  ];
  return serverTypes.includes(msg.type as ServerEventType);
}

/**
 * Check if message is a client event
 */
export function isClientEvent(msg: WSBaseMessage): msg is ClientEvents {
  const clientTypes: ClientEventType[] = [
    'pong',
    'subscribe',
    'unsubscribe',
    'typing',
    'stop',
    'pause',
    'resume',
  ];
  return clientTypes.includes(msg.type as ClientEventType);
}

/**
 * Check if message is a session event
 */
export function isSessionEvent(
  msg: WSBaseMessage
): msg is ServerEvents & { sessionId: string } {
  return msg.type.startsWith('session:') && 'sessionId' in msg;
}

/**
 * Check if message is an agent event
 */
export function isAgentEvent(
  msg: WSBaseMessage
): msg is ServerEvents & { sessionId: string } {
  return msg.type.startsWith('agent:') && 'sessionId' in msg;
}

/**
 * Check if message is a tool event
 */
export function isToolEvent(
  msg: WSBaseMessage
): msg is ServerEvents & { sessionId: string } {
  return msg.type.startsWith('tool:') && 'sessionId' in msg;
}

/**
 * Check if message is a phase event
 */
export function isPhaseEvent(
  msg: WSBaseMessage
): msg is ServerEvents & { sessionId: string } {
  return msg.type.startsWith('phase:') && 'sessionId' in msg;
}
