/**
 * Agent type definitions
 * @module @task-filewas/shared/types/agent
 */

import type { ModelProvider } from './index';
import type { ToolName } from './message';

// =============================================================================
// Agent Status & Types
// =============================================================================

/**
 * Agent runtime status
 */
export type AgentRuntimeStatus =
  | 'idle'       // Not started
  | 'starting'   // Agent is initializing
  | 'running'    // Actively processing
  | 'paused'     // Paused by user or system
  | 'stopping'   // In process of stopping
  | 'completed'  // Finished successfully
  | 'error';     // Error occurred

/**
 * Agent type based on role
 */
export type AgentType =
  | 'orchestrator'  // Coordinates other agents (CEO)
  | 'planner'       // Plans phases and tasks
  | 'architect'     // System design decisions
  | 'implementer'   // Writes code
  | 'reviewer'      // Code review
  | 'tester'        // Test writing and execution
  | 'security'      // Security analysis
  | 'debugger';     // Debugging

/**
 * Agent capability flags
 */
export interface AgentCapabilities {
  /** Can spawn sub-agents */
  canSpawnAgents: boolean;
  /** Can execute tools */
  canExecuteTools: boolean;
  /** Can modify files */
  canModifyFiles: boolean;
  /** Can run shell commands */
  canRunCommands: boolean;
  /** Can access network */
  canAccessNetwork: boolean;
  /** Can read project files */
  canReadFiles: boolean;
}

// =============================================================================
// Agent Configuration
// =============================================================================

/**
 * Agent configuration from .task/agents/*.md files
 */
export interface AgentConfig {
  /** Agent name (from YAML frontmatter) */
  name: string;
  /** Agent description */
  description: string;
  /** Agent type */
  type: AgentType;
  /** Tools this agent can use */
  tools: ToolName[];
  /** Preferred model for this agent */
  model: ModelProvider;
  /** Whether model can be overridden */
  modelOverrideAllowed: boolean;
  /** Default thinking level */
  thinkingLevel: 'off' | 'think' | 'max';
  /** Agent capabilities */
  capabilities: AgentCapabilities;
  /** System prompt content (markdown) */
  systemPrompt: string;
  /** File path to agent definition */
  filePath: string;
}

/**
 * Agent model mapping configuration
 */
export interface AgentModelMapping {
  /** Agent type */
  agentType: AgentType;
  /** Default model */
  defaultModel: ModelProvider;
  /** Fallback model */
  fallbackModel?: ModelProvider;
  /** Allow user override */
  allowOverride: boolean;
}

// =============================================================================
// Agent Instance
// =============================================================================

/**
 * Agent instance representing a running agent
 */
export interface Agent {
  /** Unique agent instance ID */
  id: string;
  /** Agent type */
  type: AgentType;
  /** Agent name */
  name: string;
  /** Session ID this agent belongs to */
  sessionId: string;
  /** Model being used */
  model: ModelProvider;
  /** Current status */
  status: AgentRuntimeStatus;
  /** Parent agent ID (if this is a sub-agent) */
  parentAgentId?: string;
  /** Current task being processed */
  currentTask?: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Current action description */
  currentAction?: string;
  /** Start time */
  startedAt: string;
  /** End time (if completed) */
  completedAt?: string;
  /** Duration in milliseconds */
  duration?: number;
  /** Token usage */
  tokenUsage?: AgentTokenUsage;
  /** Number of retries */
  retries: number;
  /** Maximum retries allowed */
  maxRetries: number;
  /** Error message if failed */
  errorMessage?: string;
  /** CLI session ID (for resume) */
  cliSessionId?: string;
}

/**
 * Token usage specific to an agent
 */
export interface AgentTokenUsage {
  /** Input tokens consumed */
  inputTokens: number;
  /** Output tokens generated */
  outputTokens: number;
  /** Cache creation tokens */
  cacheCreationTokens: number;
  /** Cache read tokens */
  cacheReadTokens: number;
  /** Total context percentage */
  contextPercentage: number;
}

/**
 * Agent summary for list views
 */
export interface AgentSummary {
  /** Agent ID */
  id: string;
  /** Agent type */
  type: AgentType;
  /** Agent name */
  name: string;
  /** Model being used */
  model: ModelProvider;
  /** Current status */
  status: AgentRuntimeStatus;
  /** Progress percentage */
  progress?: number;
  /** Current action */
  currentAction?: string;
  /** Start time */
  startedAt: string;
  /** Duration (ms) */
  duration?: number;
}

// =============================================================================
// Tool Calls & Results
// =============================================================================

/**
 * Tool call input parameters (varies by tool)
 */
export type ToolInput = Record<string, unknown>;

/**
 * Tool call made by an agent
 */
export interface ToolCall {
  /** Unique tool call ID */
  id: string;
  /** Agent ID that made the call */
  agentId: string;
  /** Session ID */
  sessionId: string;
  /** Tool name */
  toolName: ToolName;
  /** Tool input parameters */
  input: ToolInput;
  /** Human-readable summary */
  summary: string;
  /** Status of the tool call */
  status: 'pending' | 'running' | 'completed' | 'error';
  /** Start timestamp */
  startedAt: string;
  /** End timestamp */
  completedAt?: string;
  /** Duration in milliseconds */
  duration?: number;
}

/**
 * Tool result after execution
 */
export interface ToolResult {
  /** Tool call ID this result belongs to */
  toolCallId: string;
  /** Agent ID that made the call */
  agentId: string;
  /** Session ID */
  sessionId: string;
  /** Tool name */
  toolName: ToolName;
  /** Whether the operation was successful */
  success: boolean;
  /** Tool output (string representation) */
  output: string;
  /** Raw output (for programmatic access) */
  rawOutput?: unknown;
  /** Error message if failed */
  error?: string;
  /** Whether output was truncated */
  truncated: boolean;
  /** Timestamp */
  timestamp: string;
}

// =============================================================================
// Agent Handoff
// =============================================================================

/**
 * Handoff data when passing work between agents
 */
export interface AgentHandoff {
  /** Source agent ID */
  fromAgentId: string;
  /** Source agent type */
  fromAgentType: AgentType;
  /** Target agent type (or ID if specific) */
  toAgentType: AgentType;
  /** Summary of work done */
  summary: string;
  /** Files modified */
  files: string[];
  /** Open questions */
  questions: string[];
  /** Recommendations for next agent */
  recommendations: string[];
  /** Context data to pass */
  context?: Record<string, unknown>;
  /** Timestamp */
  timestamp: string;
}

// =============================================================================
// Agent Task Queue
// =============================================================================

/**
 * Task priority levels
 */
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Task type for queue
 */
export type TaskType =
  | 'plan'       // Planning phase
  | 'implement'  // Code implementation
  | 'test'       // Test writing/running
  | 'review'     // Code review
  | 'fix'        // Bug fix
  | 'security';  // Security analysis

/**
 * Task in the agent queue
 */
export interface AgentTask {
  /** Unique task ID */
  id: string;
  /** Task type */
  type: TaskType;
  /** Task title */
  title: string;
  /** Task description */
  description: string;
  /** Task priority */
  priority: TaskPriority;
  /** IDs of tasks this depends on */
  dependencies: string[];
  /** Task status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  /** Assigned agent ID */
  assignedAgentId?: string;
  /** Assigned agent type */
  assignedAgentType?: AgentType;
  /** Number of retries */
  retries: number;
  /** Maximum retries */
  maxRetries: number;
  /** Created timestamp */
  createdAt: string;
  /** Started timestamp */
  startedAt?: string;
  /** Completed timestamp */
  completedAt?: string;
  /** Error message if failed */
  error?: string;
  /** Task input data */
  input?: Record<string, unknown>;
  /** Task output/result */
  output?: Record<string, unknown>;
}

/**
 * Task queue state
 */
export interface TaskQueue {
  /** Session ID */
  sessionId: string;
  /** All tasks in queue */
  tasks: AgentTask[];
  /** Currently running tasks */
  runningTasks: string[];
  /** Maximum parallel tasks */
  maxParallel: number;
  /** Queue status */
  status: 'idle' | 'running' | 'paused' | 'completed';
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

// =============================================================================
// Agent Orchestration
// =============================================================================

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  /** Maximum parallel agents */
  maxParallelAgents: number;
  /** Self-healing enabled */
  selfHealingEnabled: boolean;
  /** Maximum self-heal attempts */
  maxSelfHealAttempts: number;
  /** CEO fallback enabled */
  ceoFallbackEnabled: boolean;
  /** Fallback after N failures */
  fallbackAfterFailures: number;
  /** Agent timeout (ms) */
  agentTimeout?: number;
  /** Auto-commit after phase */
  autoCommit: boolean;
  /** Auto-push after commit */
  autoPush: boolean;
}

/**
 * Orchestration state
 */
export interface OrchestrationState {
  /** Session ID */
  sessionId: string;
  /** Current orchestrator config */
  config: OrchestratorConfig;
  /** Active agents */
  activeAgents: AgentSummary[];
  /** Task queue */
  taskQueue: TaskQueue;
  /** Phase progress */
  currentPhase?: number;
  /** Total phases */
  totalPhases?: number;
  /** Orchestrator status */
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  /** Error message */
  errorMessage?: string;
  /** Started timestamp */
  startedAt?: string;
  /** Completed timestamp */
  completedAt?: string;
}

// =============================================================================
// Agent Events
// =============================================================================

/**
 * Agent lifecycle event types
 */
export type AgentEventType =
  | 'agent:spawned'
  | 'agent:started'
  | 'agent:progress'
  | 'agent:paused'
  | 'agent:resumed'
  | 'agent:completed'
  | 'agent:error'
  | 'agent:stopped';

/**
 * Base agent event
 */
export interface AgentEvent {
  /** Event type */
  type: AgentEventType;
  /** Agent ID */
  agentId: string;
  /** Session ID */
  sessionId: string;
  /** Timestamp */
  timestamp: string;
  /** Additional event data */
  data?: Record<string, unknown>;
}

/**
 * Agent spawned event
 */
export interface AgentSpawnedEvent extends AgentEvent {
  type: 'agent:spawned';
  data: {
    agentType: AgentType;
    model: ModelProvider;
    parentAgentId?: string;
  };
}

/**
 * Agent progress event
 */
export interface AgentProgressEvent extends AgentEvent {
  type: 'agent:progress';
  data: {
    progress: number;
    currentAction: string;
  };
}

/**
 * Agent completed event
 */
export interface AgentCompletedEvent extends AgentEvent {
  type: 'agent:completed';
  data: {
    duration: number;
    tokenUsage: AgentTokenUsage;
    output?: string;
  };
}

/**
 * Agent error event
 */
export interface AgentErrorEvent extends AgentEvent {
  type: 'agent:error';
  data: {
    error: string;
    retryCount: number;
    willRetry: boolean;
  };
}
