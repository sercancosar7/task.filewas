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
