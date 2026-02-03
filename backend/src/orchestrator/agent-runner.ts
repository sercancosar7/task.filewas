/**
 * Agent Runner Service
 * Spawns and manages agent instances using CLI subprocess
 * @module @task-filewas/backend/orchestrator/agent-runner
 */

import { EventEmitter } from 'node:events'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  AgentType,
  AgentConfig,
  Agent,
  AgentRuntimeStatus,
  AgentTokenUsage,
  ModelProvider,
  ThinkingLevel,
} from '@task-filewas/shared'
import {
  spawnCli,
  killProcess,
  setProcessSessionId,
  setProcessCliSessionId,
  cliEvents,
  CLI_EVENTS,
  type CliSpawnOptions,
  type CliOutputEvent,
  type CliExitEvent,
  type CliErrorEvent,
} from '../services/cli.js'
import {
  StreamParser,
  isInitMessage,
  isResultMessage,
  calculateTokenUsage,
  type ParsedTokenUsage,
} from '../utils/stream-parser.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Agent spawn options
 */
export interface AgentSpawnOptions {
  /** Agent type to spawn */
  agentType: AgentType
  /** Session ID this agent belongs to */
  sessionId: string
  /** Working directory for the agent */
  cwd: string
  /** Initial prompt to send */
  prompt: string
  /** Override model (if allowed by agent config) */
  modelOverride?: ModelProvider
  /** Override thinking level */
  thinkingLevelOverride?: ThinkingLevel
  /** Parent agent ID (if sub-agent) */
  parentAgentId?: string
  /** Skip permission prompts (autonomous mode) */
  dangerouslySkipPermissions?: boolean
  /** Maximum agentic turns */
  maxTurns?: number
  /** Timeout in milliseconds */
  timeout?: number
  /** Custom environment variables */
  env?: Record<string, string>
}

/**
 * Agent run result
 */
export interface AgentRunResult {
  /** Whether execution was successful */
  success: boolean
  /** Agent instance data */
  agent: Agent
  /** Token usage */
  tokenUsage?: AgentTokenUsage
  /** Output text (final response) */
  output?: string
  /** Error message if failed */
  error?: string
  /** Exit code */
  exitCode?: number | null
  /** Duration in milliseconds */
  duration: number
}

/**
 * Agent event types
 */
export type AgentEventType =
  | 'agent:spawned'
  | 'agent:started'
  | 'agent:output'
  | 'agent:progress'
  | 'agent:completed'
  | 'agent:error'
  | 'agent:stopped'

/**
 * Agent event data
 */
export interface AgentEventData {
  agentId: string
  sessionId: string
  agentType: AgentType
  model: ModelProvider
  timestamp: string
  [key: string]: unknown
}

// =============================================================================
// Constants
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Path to agent definitions */
const AGENTS_DIR = path.resolve(__dirname, '../../../../.task/agents')

/** Default agent model mapping */
const DEFAULT_AGENT_MODELS: Record<AgentType, ModelProvider> = {
  orchestrator: 'claude',
  planner: 'claude',
  architect: 'claude',
  security: 'claude',
  implementer: 'glm',
  reviewer: 'glm',
  tester: 'glm',
  debugger: 'glm',
}

/** Default thinking levels by agent type */
const DEFAULT_THINKING_LEVELS: Record<AgentType, ThinkingLevel> = {
  orchestrator: 'max',
  planner: 'think',
  architect: 'think',
  security: 'think',
  implementer: 'off',
  reviewer: 'off',
  tester: 'off',
  debugger: 'off',
}

/** Agent event names */
export const AGENT_EVENTS = {
  SPAWNED: 'agent:spawned',
  STARTED: 'agent:started',
  OUTPUT: 'agent:output',
  PROGRESS: 'agent:progress',
  COMPLETED: 'agent:completed',
  ERROR: 'agent:error',
  STOPPED: 'agent:stopped',
} as const

// =============================================================================
// Module State
// =============================================================================

/** Active agent instances */
const agents = new Map<string, Agent>()

/** Agent to CLI process mapping */
const agentProcessMap = new Map<string, string>()

/** Stream parsers per agent */
const streamParsers = new Map<string, StreamParser>()

/** Event emitter for agent events */
export const agentEvents = new EventEmitter()

// Increase max listeners for high-concurrency scenarios
agentEvents.setMaxListeners(100)

// =============================================================================
// Agent Config Loading
// =============================================================================

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): { data: Record<string, unknown>; content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { data: {}, content: content.trim() }
  }

  const yamlContent = match[1] ?? ''
  const bodyContent = match[2] ?? ''

  // Simple YAML parser for key: value pairs
  const data: Record<string, unknown> = {}
  const lines = yamlContent.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmed.substring(0, colonIndex).trim()
    let value: unknown = trimmed.substring(colonIndex + 1).trim()

    // Parse arrays
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1)
      value = arrayContent.split(',').map((item) => item.trim().replace(/^["']|["']$/g, ''))
    }
    // Parse booleans
    else if (value === 'true') {
      value = true
    } else if (value === 'false') {
      value = false
    }
    // Remove quotes from strings
    else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }

    data[key] = value
  }

  return { data, content: bodyContent.trim() }
}

/**
 * Load agent configuration from markdown file
 */
export async function loadAgentConfig(agentType: AgentType): Promise<AgentConfig | null> {
  const filePath = path.join(AGENTS_DIR, `${agentType}.md`)

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const { data, content: systemPrompt } = parseFrontmatter(content)

    const name = (data['name'] as string) || agentType
    const description = (data['description'] as string) || ''
    const tools = Array.isArray(data['tools']) ? (data['tools'] as string[]) : []
    const model = (data['model'] as ModelProvider) || DEFAULT_AGENT_MODELS[agentType]
    const modelOverrideAllowed = data['model_override_allowed'] !== false
    const thinkingLevel =
      (data['thinking_level'] as ThinkingLevel) || DEFAULT_THINKING_LEVELS[agentType]

    return {
      name,
      description,
      type: agentType,
      tools: tools as AgentConfig['tools'],
      model,
      modelOverrideAllowed,
      thinkingLevel,
      capabilities: {
        canSpawnAgents: tools.includes('Task'),
        canExecuteTools: true,
        canModifyFiles: tools.includes('Write') || tools.includes('Edit'),
        canRunCommands: tools.includes('Bash'),
        canAccessNetwork: tools.includes('WebFetch') || tools.includes('WebSearch'),
        canReadFiles: tools.includes('Read') || tools.includes('Glob') || tools.includes('Grep'),
      },
      systemPrompt,
      filePath,
    }
  } catch {
    return null
  }
}

/**
 * Get all available agent types
 */
export async function getAvailableAgentTypes(): Promise<AgentType[]> {
  try {
    const files = await fs.readdir(AGENTS_DIR)
    const agentTypes: AgentType[] = []

    for (const file of files) {
      if (file.endsWith('.md') && file !== 'README.md') {
        const agentType = file.replace('.md', '') as AgentType
        agentTypes.push(agentType)
      }
    }

    return agentTypes
  } catch {
    return []
  }
}

// =============================================================================
// Model Selection
// =============================================================================

/**
 * Select model for agent based on config and overrides
 */
export function selectModel(
  agentConfig: AgentConfig,
  modelOverride?: ModelProvider,
  thinkingLevelOverride?: ThinkingLevel
): ModelProvider {
  // If thinking level is 'max', always use claude (ultrathink requires opus)
  const effectiveThinkingLevel = thinkingLevelOverride || agentConfig.thinkingLevel
  if (effectiveThinkingLevel === 'max') {
    return 'claude'
  }

  // If override is provided and allowed, use it
  if (modelOverride && agentConfig.modelOverrideAllowed) {
    return modelOverride
  }

  // Use agent's default model
  return agentConfig.model
}

/**
 * Get CLI command for model provider
 */
export function getModelCommand(model: ModelProvider): string {
  return model === 'glm' ? 'glm' : 'claude'
}

// =============================================================================
// Agent ID Generation
// =============================================================================

/**
 * Generate unique agent instance ID
 */
function generateAgentId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `agent-${timestamp}-${random}`
}

// =============================================================================
// Agent Spawning
// =============================================================================

/**
 * Spawn a new agent instance
 */
export async function spawnAgent(options: AgentSpawnOptions): Promise<Agent> {
  const {
    agentType,
    sessionId,
    cwd,
    prompt,
    modelOverride,
    thinkingLevelOverride,
    parentAgentId,
    dangerouslySkipPermissions = false,
    maxTurns,
    timeout,
    env,
  } = options

  // Load agent configuration
  const agentConfig = await loadAgentConfig(agentType)
  if (!agentConfig) {
    throw new Error(`Agent configuration not found for type: ${agentType}`)
  }

  // Select model
  const model = selectModel(agentConfig, modelOverride, thinkingLevelOverride)

  // Generate agent ID
  const agentId = generateAgentId()

  // Create agent instance
  const agent: Agent = {
    id: agentId,
    type: agentType,
    name: agentConfig.name,
    sessionId,
    model,
    status: 'starting',
    retries: 0,
    maxRetries: 3,
    startedAt: new Date().toISOString(),
  }

  // Set optional parentAgentId only if provided
  if (parentAgentId) {
    agent.parentAgentId = parentAgentId
  }

  // Store agent
  agents.set(agentId, agent)

  // Create stream parser for this agent
  const streamParser = new StreamParser()
  streamParsers.set(agentId, streamParser)

  // Build CLI spawn options
  const cliOptions: CliSpawnOptions = {
    cwd,
    model,
    prompt,
    systemPrompt: agentConfig.systemPrompt,
    dangerouslySkipPermissions,
  }

  // Add optional parameters only if defined
  if (maxTurns !== undefined) {
    cliOptions.maxTurns = maxTurns
  }
  if (timeout !== undefined) {
    cliOptions.timeout = timeout
  }
  if (env !== undefined) {
    cliOptions.env = env
  }

  // Spawn CLI process
  const cliProcess = spawnCli(cliOptions)

  // Map agent to CLI process
  agentProcessMap.set(agentId, cliProcess.id)
  setProcessSessionId(cliProcess.id, sessionId)

  // Setup CLI event handlers for this agent
  setupAgentCliHandlers(agentId, cliProcess.id, streamParser)

  // Emit spawned event
  emitAgentEvent(AGENT_EVENTS.SPAWNED, {
    agentId,
    sessionId,
    agentType,
    model,
    parentAgentId,
  })

  return agent
}

/**
 * Setup CLI event handlers for an agent
 */
function setupAgentCliHandlers(
  agentId: string,
  processId: string,
  streamParser: StreamParser
): void {
  const agent = agents.get(agentId)
  if (!agent) return

  // Output handler
  const outputHandler = (event: CliOutputEvent): void => {
    if (event.processId !== processId) return

    // Update agent status to running
    if (agent.status === 'starting') {
      agent.status = 'running'
      emitAgentEvent(AGENT_EVENTS.STARTED, {
        agentId,
        sessionId: agent.sessionId,
        agentType: agent.type,
        model: agent.model,
      })
    }

    // Parse output chunks
    if (event.type === 'stdout') {
      const results = streamParser.parseChunk(event.data)

      for (const result of results) {
        if (!result.success || !result.message) continue

        // Handle init message - extract CLI session ID
        if (isInitMessage(result.message)) {
          agent.cliSessionId = result.message.session_id
          setProcessCliSessionId(processId, result.message.session_id)
        }

        // Handle result message - extract token usage
        if (isResultMessage(result.message) && result.message.usage) {
          const tokenUsage = calculateTokenUsage(result.message.usage)
          agent.tokenUsage = convertTokenUsage(tokenUsage)
        }
      }

      // Emit output event
      emitAgentEvent(AGENT_EVENTS.OUTPUT, {
        agentId,
        sessionId: agent.sessionId,
        agentType: agent.type,
        model: agent.model,
        output: event.data,
      })
    }
  }

  // Exit handler
  const exitHandler = (event: CliExitEvent): void => {
    if (event.processId !== processId) return

    // Flush remaining data
    streamParser.flush()

    // Calculate duration
    const duration = Date.now() - new Date(agent.startedAt).getTime()
    agent.duration = duration
    agent.completedAt = new Date().toISOString()

    // Update status based on exit
    if (event.code === 0 || event.status === 'stopped') {
      agent.status = 'completed'
      emitAgentEvent(AGENT_EVENTS.COMPLETED, {
        agentId,
        sessionId: agent.sessionId,
        agentType: agent.type,
        model: agent.model,
        duration,
        tokenUsage: agent.tokenUsage,
        exitCode: event.code,
      })
    } else {
      agent.status = 'error'
      agent.errorMessage = `Process exited with code ${event.code}`
      emitAgentEvent(AGENT_EVENTS.ERROR, {
        agentId,
        sessionId: agent.sessionId,
        agentType: agent.type,
        model: agent.model,
        error: agent.errorMessage,
        exitCode: event.code,
      })
    }

    // Cleanup handlers
    cliEvents.removeListener(CLI_EVENTS.OUTPUT, outputHandler)
    cliEvents.removeListener(CLI_EVENTS.EXIT, exitHandler)
    cliEvents.removeListener(CLI_EVENTS.ERROR, errorHandler)
  }

  // Error handler
  const errorHandler = (event: CliErrorEvent): void => {
    if (event.processId !== processId) return

    agent.status = 'error'
    agent.errorMessage = event.error.message
    agent.completedAt = new Date().toISOString()
    agent.duration = Date.now() - new Date(agent.startedAt).getTime()

    emitAgentEvent(AGENT_EVENTS.ERROR, {
      agentId,
      sessionId: agent.sessionId,
      agentType: agent.type,
      model: agent.model,
      error: event.error.message,
    })

    // Cleanup handlers
    cliEvents.removeListener(CLI_EVENTS.OUTPUT, outputHandler)
    cliEvents.removeListener(CLI_EVENTS.EXIT, exitHandler)
    cliEvents.removeListener(CLI_EVENTS.ERROR, errorHandler)
  }

  // Register handlers
  cliEvents.on(CLI_EVENTS.OUTPUT, outputHandler)
  cliEvents.on(CLI_EVENTS.EXIT, exitHandler)
  cliEvents.on(CLI_EVENTS.ERROR, errorHandler)
}

/**
 * Convert ParsedTokenUsage to AgentTokenUsage
 */
function convertTokenUsage(parsed: ParsedTokenUsage): AgentTokenUsage {
  return {
    inputTokens: parsed.inputTokens,
    outputTokens: parsed.outputTokens,
    cacheCreationTokens: parsed.cacheCreationTokens,
    cacheReadTokens: parsed.cacheReadTokens,
    contextPercentage: parsed.percentUsed,
  }
}

/**
 * Agent event data for emitting
 */
interface EmitAgentEventData {
  agentId: string
  sessionId: string
  agentType: AgentType
  model: ModelProvider
  [key: string]: unknown
}

/**
 * Emit agent event
 */
function emitAgentEvent(
  eventType: AgentEventType,
  data: EmitAgentEventData
): void {
  const eventData: AgentEventData = {
    ...data,
    timestamp: new Date().toISOString(),
  }
  agentEvents.emit(eventType, eventData)
}

// =============================================================================
// Agent Control
// =============================================================================

/**
 * Stop an agent
 */
export function stopAgent(agentId: string): boolean {
  const agent = agents.get(agentId)
  if (!agent) {
    return false
  }

  const processId = agentProcessMap.get(agentId)
  if (!processId) {
    return false
  }

  // Kill the CLI process
  const killed = killProcess(processId)

  if (killed) {
    agent.status = 'stopping'
    emitAgentEvent(AGENT_EVENTS.STOPPED, {
      agentId,
      sessionId: agent.sessionId,
      agentType: agent.type,
      model: agent.model,
    })
  }

  return killed
}

/**
 * Update agent progress
 */
export function updateAgentProgress(
  agentId: string,
  progress: number,
  currentAction?: string
): boolean {
  const agent = agents.get(agentId)
  if (!agent) {
    return false
  }

  agent.progress = Math.min(100, Math.max(0, progress))
  if (currentAction) {
    agent.currentAction = currentAction
  }

  emitAgentEvent(AGENT_EVENTS.PROGRESS, {
    agentId,
    sessionId: agent.sessionId,
    agentType: agent.type,
    model: agent.model,
    progress: agent.progress,
    currentAction: agent.currentAction,
  })

  return true
}

// =============================================================================
// Agent Query Functions
// =============================================================================

/**
 * Get agent by ID
 */
export function getAgent(agentId: string): Agent | undefined {
  return agents.get(agentId)
}

/**
 * Get agent status
 */
export function getAgentStatus(agentId: string): AgentRuntimeStatus | undefined {
  return agents.get(agentId)?.status
}

/**
 * Check if agent is running
 */
export function isAgentRunning(agentId: string): boolean {
  const status = getAgentStatus(agentId)
  return status === 'running' || status === 'starting'
}

/**
 * Get all agents for a session
 */
export function getSessionAgents(sessionId: string): Agent[] {
  const sessionAgents: Agent[] = []
  for (const agent of agents.values()) {
    if (agent.sessionId === sessionId) {
      sessionAgents.push(agent)
    }
  }
  return sessionAgents
}

/**
 * Get running agent count
 */
export function getRunningAgentCount(): number {
  let count = 0
  for (const agent of agents.values()) {
    if (agent.status === 'running' || agent.status === 'starting') {
      count++
    }
  }
  return count
}

/**
 * Get all agents
 */
export function getAllAgents(): Agent[] {
  return Array.from(agents.values())
}

// =============================================================================
// Cleanup Functions
// =============================================================================

/**
 * Remove finished agents from tracking
 */
export function cleanupFinishedAgents(): number {
  let removed = 0
  for (const [agentId, agent] of agents) {
    if (agent.status === 'completed' || agent.status === 'error') {
      agents.delete(agentId)
      agentProcessMap.delete(agentId)
      streamParsers.delete(agentId)
      removed++
    }
  }
  return removed
}

/**
 * Remove a specific agent from tracking
 */
export function removeAgent(agentId: string): boolean {
  const deleted = agents.delete(agentId)
  agentProcessMap.delete(agentId)
  streamParsers.delete(agentId)
  return deleted
}

/**
 * Stop all agents for a session
 */
export function stopSessionAgents(sessionId: string): number {
  let stopped = 0
  for (const agent of agents.values()) {
    if (agent.sessionId === sessionId && isAgentRunning(agent.id)) {
      if (stopAgent(agent.id)) {
        stopped++
      }
    }
  }
  return stopped
}

/**
 * Clear all agents (for testing/shutdown)
 */
export function clearAllAgents(): void {
  // Stop all running agents
  for (const agent of agents.values()) {
    if (isAgentRunning(agent.id)) {
      stopAgent(agent.id)
    }
  }

  // Clear all maps
  agents.clear()
  agentProcessMap.clear()
  streamParsers.clear()
}

// =============================================================================
// Export Default
// =============================================================================

export default {
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
}
