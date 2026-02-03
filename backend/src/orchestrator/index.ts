/**
 * Orchestrator Module Exports
 * Agent spawning, task queue, and orchestration logic
 * @module @task-filewas/backend/orchestrator
 */

// Agent Runner
export {
  // Config
  loadAgentConfig,
  getAvailableAgentTypes,
  // Model
  selectModel,
  getModelCommand,
  // Spawn
  spawnAgent,
  // Control
  stopAgent,
  updateAgentProgress,
  // Query
  getAgent,
  getAgentStatus,
  isAgentRunning,
  getSessionAgents,
  getRunningAgentCount,
  getAllAgents,
  // Cleanup
  cleanupFinishedAgents,
  removeAgent,
  stopSessionAgents,
  clearAllAgents,
  // Events
  agentEvents,
  AGENT_EVENTS,
} from './agent-runner.js'

export type {
  AgentSpawnOptions,
  AgentRunResult,
  AgentEventType,
  AgentEventData,
} from './agent-runner.js'

// Prompt Builder
export {
  buildPrompt,
  buildSimplePrompt,
  buildResumePrompt,
  buildClaudeMdSection,
  buildContextSection,
  buildHandoffSection,
  buildPhaseInstruction,
  loadProjectOverview,
  loadProjectRoadmap,
  loadProjectChangelog,
  loadProjectClaudeMd,
  paths,
} from './prompt-builder.js'

export type {
  PromptBuilderContext,
  BuiltPrompt,
  DocumentLoadResult,
} from './prompt-builder.js'

// Task Queue
export {
  TaskQueue,
  getQueueStats,
} from './task-queue.js'

export type {
  TaskCreateOptions,
  TaskUpdateOptions,
  NextTaskResult,
  DependencyNode,
  QueueStats,
} from './task-queue.js'

// Parallel Executor
export {
  ParallelExecutor,
  Semaphore,
  createParallelExecutor,
  executeIndependentTasks,
  canRunInParallel,
} from './parallel-executor.js'

export type {
  ParallelExecutorConfig,
  TaskExecutionResult,
  IndependentTaskGroup,
  ParallelExecutionResult,
} from './parallel-executor.js'

// CEO Fallback
export {
  FallbackHandler,
  createFallbackHandler,
  getFallbackHandler,
  removeFallbackHandler,
  clearAllFallbackHandlers,
} from './fallback.js'

export type {
  FallbackConfig,
  FallbackContext,
  FallbackResult,
  FallbackDecision,
} from './fallback.js'

// Roadmap Executor
export {
  RoadmapExecutor,
  createRoadmapExecutor,
  getRoadmapExecutor,
  removeRoadmapExecutor,
  getAllExecutors,
} from './roadmap-executor.js'

export type {
  PhaseState,
  RoadmapPhase,
  PhaseTask,
  RoadmapExecutorConfig,
  ExecutionStatus,
  PhaseExecutionResult,
  StateTransitionResult,
} from './roadmap-executor.js'

// Phase Executor
export {
  PhaseExecutor,
  createPhaseExecutor,
  getPhaseExecutor,
  removePhaseExecutor,
  executePhase,
} from './phase-executor.js'

export type {
  PhaseExecutorConfig,
  PhaseExecutionResult as SinglePhaseExecutionResult,
  AcceptanceCriteriaResult,
  AgentTaskResult,
  TaskToAgentMapper,
  AcceptanceCriteriaChecker,
} from './phase-executor.js'
