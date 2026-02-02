/**
 * Message type definitions
 * @module @task-filewas/shared/types/message
 */

/**
 * Message role (who sent the message)
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Message content type
 */
export type MessageContentType =
  | 'text'
  | 'tool_use'
  | 'tool_result'
  | 'error'
  | 'summary';

/**
 * Tool names used by Claude CLI
 */
export type ToolName =
  | 'Read'
  | 'Write'
  | 'Edit'
  | 'Bash'
  | 'Grep'
  | 'Glob'
  | 'Task'
  | 'WebFetch'
  | 'TodoWrite'
  | 'AskUserQuestion'
  | 'EnterPlanMode'
  | 'ExitPlanMode'
  | 'Skill'
  | 'WebSearch'
  | 'NotebookEdit';

/**
 * Tool use status
 */
export type ToolStatus = 'running' | 'completed' | 'error';

/**
 * Base message interface
 */
export interface Message {
  /** Unique message ID */
  id: string;
  /** Session ID this message belongs to */
  sessionId: string;
  /** Message role */
  role: MessageRole;
  /** Message content (text) */
  content: string;
  /** Content type */
  contentType: MessageContentType;
  /** When the message was created */
  timestamp: string;
  /** Additional metadata */
  metadata?: MessageMetadata;
}

/**
 * Message metadata for additional context
 */
export interface MessageMetadata {
  /** Model that generated this message */
  model?: string;
  /** Token usage for this message */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  /** Thinking content (if extended thinking was used) */
  thinking?: string;
  /** Duration to generate (ms) */
  duration?: number;
  /** Any error information */
  error?: string;
}

/**
 * Tool use activity
 */
export interface ToolUseActivity {
  /** Activity ID */
  id: string;
  /** Tool name */
  toolName: ToolName;
  /** Tool input/parameters */
  toolInput: Record<string, unknown>;
  /** Human-readable summary */
  summary: string;
  /** Tool status */
  status: ToolStatus;
  /** Timestamp */
  timestamp: string;
  /** Duration in milliseconds */
  duration?: number;
}

/**
 * Tool result activity
 */
export interface ToolResultActivity {
  /** Activity ID (matches tool use ID) */
  id: string;
  /** Tool name */
  toolName: ToolName;
  /** Tool output/result */
  output: string;
  /** Was the operation successful */
  success: boolean;
  /** Timestamp */
  timestamp: string;
  /** Truncated output (if original was too long) */
  truncated?: boolean;
}

/**
 * Combined activity (tool use with its result)
 */
export interface Activity {
  /** Activity ID */
  id: string;
  /** Activity type */
  type: 'tool' | 'text' | 'system';
  /** Tool information (for tool type) */
  tool?: {
    name: ToolName;
    input: Record<string, unknown>;
    summary: string;
    output?: string;
    success?: boolean;
    duration?: number;
  };
  /** Text content (for text type) */
  text?: string;
  /** System message (for system type) */
  system?: {
    variant: 'info' | 'warning' | 'error';
    message: string;
  };
  /** Timestamp */
  timestamp: string;
}

/**
 * Turn represents a user message + assistant response cycle
 */
export interface Turn {
  /** Turn ID */
  id: string;
  /** Turn number in session */
  turnNumber: number;
  /** Session ID */
  sessionId: string;
  /** User message */
  userMessage: Message;
  /** Assistant response */
  assistantMessage?: Message;
  /** Activities during this turn */
  activities: Activity[];
  /** Turn status */
  status: 'pending' | 'processing' | 'completed' | 'error';
  /** Start timestamp */
  startedAt: string;
  /** End timestamp */
  completedAt?: string;
  /** Duration in milliseconds */
  duration?: number;
  /** Token usage for this turn */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    totalContext: number;
  };
}

/**
 * User message creation data
 */
export interface MessageCreate {
  /** Session ID */
  sessionId: string;
  /** Message content */
  content: string;
  /** Optional role override (defaults to 'user') */
  role?: MessageRole;
  /** Optional metadata */
  metadata?: Partial<MessageMetadata>;
}

/**
 * Streaming message chunk
 */
export interface MessageChunk {
  /** Session ID */
  sessionId: string;
  /** Message ID this chunk belongs to */
  messageId: string;
  /** Chunk type */
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  /** Chunk content */
  content: string;
  /** Is this the final chunk */
  isFinal: boolean;
  /** Timestamp */
  timestamp: string;
}

/**
 * Todo item (from TodoWrite tool)
 */
export interface TodoItem {
  /** Todo content */
  content: string;
  /** Todo status */
  status: 'pending' | 'in_progress' | 'completed';
  /** Active form (present tense description) */
  activeForm: string;
}

/**
 * Todo list state
 */
export interface TodoList {
  /** Session ID */
  sessionId: string;
  /** Todo items */
  items: TodoItem[];
  /** Last updated */
  updatedAt: string;
}

/**
 * Plan submission (from ExitPlanMode)
 */
export interface Plan {
  /** Plan ID */
  id: string;
  /** Session ID */
  sessionId: string;
  /** Plan content (markdown) */
  content: string;
  /** Plan status */
  status: 'pending' | 'approved' | 'rejected' | 'executing';
  /** Created timestamp */
  createdAt: string;
  /** Approved/rejected timestamp */
  decidedAt?: string;
  /** Execution start timestamp */
  executionStartedAt?: string;
}

/**
 * Message history for a session
 */
export interface MessageHistory {
  /** Session ID */
  sessionId: string;
  /** All messages */
  messages: Message[];
  /** Turns (grouped messages) */
  turns: Turn[];
  /** Current todo list */
  todoList?: TodoList;
  /** Active plan */
  activePlan?: Plan;
  /** Total message count */
  totalMessages: number;
  /** Total turns count */
  totalTurns: number;
}

/**
 * WebSocket message types for real-time updates
 */
export type WSMessageType =
  | 'output'          // Output from Claude
  | 'status'          // Status update
  | 'error'           // Error occurred
  | 'connected'       // Client connected
  | 'ping'            // Ping
  | 'pong';           // Pong

/**
 * WebSocket message payload
 */
export interface WSMessage {
  /** Message type */
  type: WSMessageType;
  /** Session ID */
  sessionId?: string;
  /** Payload data */
  data?: unknown;
  /** Timestamp */
  timestamp: string;
}

/**
 * Output message from WebSocket
 */
export interface WSOutputMessage extends WSMessage {
  type: 'output';
  data: {
    /** Message type */
    messageType: 'text' | 'tool_use' | 'tool_result' | 'system';
    /** Content (for text) */
    content?: string;
    /** Role (for text) */
    role?: MessageRole;
    /** Tool name (for tool_use/tool_result) */
    toolName?: ToolName;
    /** Tool input (for tool_use) */
    toolInput?: Record<string, unknown>;
    /** Tool summary (for tool_use) */
    summary?: string;
    /** Tool output (for tool_result) */
    output?: string;
  };
}

/**
 * Status message from WebSocket
 */
export interface WSStatusMessage extends WSMessage {
  type: 'status';
  data: {
    /** Event name */
    event: string;
    /** Additional event data */
    [key: string]: unknown;
  };
}

/**
 * Error message from WebSocket
 */
export interface WSErrorMessage extends WSMessage {
  type: 'error';
  data: {
    /** Error message */
    message: string;
    /** Error code */
    code?: string;
    /** Stack trace (dev only) */
    stack?: string;
  };
}
