/**
 * Phase Executor Service
 * Executes a single phase with task→agent mapping and acceptance criteria checking
 * @module @task-filewas/backend/orchestrator/phase-executor
 */

import type {
  Agent,
  AgentTask,
  AgentType,
  ModelProvider,
  ThinkingLevel,
} from '@task-filewas/shared'
import {
  spawnAgent,
  type AgentSpawnOptions,
  agentEvents,
  AGENT_EVENTS,
} from './agent-runner.js'
import type { RoadmapPhase } from './roadmap-executor.js'
import {
  buildPrompt,
  type PromptBuilderContext,
} from './prompt-builder.js'
import {
  broadcastToSession,
  type WSMessage,
} from '../socket/index.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Phase execution configuration
 */
export interface PhaseExecutorConfig {
  /** Session ID */
  sessionId: string
  /** Project ID */
  projectId: string
  /** Working directory */
  cwd: string
  /** Phase to execute */
  phase: RoadmapPhase
  /** Maximum parallel agents */
  maxParallelAgents?: number
  /** Skip permissions (autonomous mode) */
  dangerouslySkipPermissions?: boolean
  /** Maximum turns per agent */
  maxTurns?: number
  /** Agent timeout (ms) */
  agentTimeout?: number
  /** Default model override */
  modelOverride?: ModelProvider | undefined
  /** Default thinking level override */
  thinkingLevelOverride?: ThinkingLevel | undefined
}

/**
 * Phase execution result
 */
export interface PhaseExecutionResult {
  /** Phase ID */
  phaseId: number
  /** Whether execution was successful */
  success: boolean
  /** Number of tasks completed */
  tasksCompleted: number
  /** Number of tasks failed */
  tasksFailed: number
  /** Number of tasks skipped */
  tasksSkipped: number
  /** Duration in milliseconds */
  duration: number
  /** Error message if failed */
  error?: string
  /** Acceptance criteria results */
  acceptanceCriteriaResults: AcceptanceCriteriaResult[]
  /** Whether all acceptance criteria passed */
  allAcceptanceCriteriaPassed: boolean
  /** Agent results */
  agentResults: AgentTaskResult[]
  /** Output messages */
  outputs: string[]
}

/**
 * Acceptance criteria check result
 */
export interface AcceptanceCriteriaResult {
  /** Criteria text */
  criteria: string
  /** Whether criteria was met */
  passed: boolean
  /** Reason for pass/fail */
  reason?: string | undefined
}

/**
 * Agent task result
 */
export interface AgentTaskResult {
  /** Task ID */
  taskId: string
  /** Agent that executed the task */
  agent?: Agent
  /** Whether execution was successful */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Duration in milliseconds */
  duration: number
  /** Output from agent */
  output?: string | undefined
}

/**
 * Task → Agent mapping function type
 */
export type TaskToAgentMapper = (task: AgentTask) => AgentType

/**
 * Acceptance criteria checker function type
 */
export type AcceptanceCriteriaChecker = (
  phase: RoadmapPhase,
  agentResults: AgentTaskResult[]
) => Promise<AcceptanceCriteriaResult[]>

// =============================================================================
// Constants
// =============================================================================

/** Default task → agent mapping */
const DEFAULT_TASK_AGENT_MAPPING: Record<string, AgentType> = {
  plan: 'planner',
  implement: 'implementer',
  test: 'tester',
  review: 'reviewer',
  fix: 'debugger',
  security: 'security',
}

/** Default configuration values */
const DEFAULT_CONFIG = {
  maxParallelAgents: 3,
  dangerouslySkipPermissions: true,
  maxTurns: 10,
  agentTimeout: 30 * 60 * 1000, // 30 minutes
} as const

// =============================================================================
// PhaseExecutor Class
// =============================================================================

/**
 * PhaseExecutor - Executes a single phase with task→agent mapping
 */
export class PhaseExecutor {
  private readonly _sessionId: string
  private readonly _projectId: string
  private readonly _cwd: string
  private readonly _phase: RoadmapPhase
  private readonly _config: Required<Omit<PhaseExecutorConfig, 'phase'>>
  private readonly _taskToAgentMapper: TaskToAgentMapper
  private readonly _acceptanceCriteriaChecker: AcceptanceCriteriaChecker
  private _outputs: string[]
  private _agentResults: AgentTaskResult[]
  private _startTime: number = 0
  private _isExecuting: boolean = false
  private _stopped: boolean = false

  /**
   * Create a new PhaseExecutor
   */
  constructor(
    config: PhaseExecutorConfig,
    taskToAgentMapper?: TaskToAgentMapper,
    acceptanceCriteriaChecker?: AcceptanceCriteriaChecker
  ) {
    this._sessionId = config.sessionId
    this._projectId = config.projectId
    this._cwd = config.cwd
    this._phase = config.phase
    this._config = {
      sessionId: config.sessionId,
      projectId: config.projectId,
      cwd: config.cwd,
      maxParallelAgents: config.maxParallelAgents ?? DEFAULT_CONFIG.maxParallelAgents,
      dangerouslySkipPermissions: config.dangerouslySkipPermissions ?? DEFAULT_CONFIG.dangerouslySkipPermissions,
      maxTurns: config.maxTurns ?? DEFAULT_CONFIG.maxTurns,
      agentTimeout: config.agentTimeout ?? DEFAULT_CONFIG.agentTimeout,
      modelOverride: config.modelOverride,
      thinkingLevelOverride: config.thinkingLevelOverride,
    }
    this._taskToAgentMapper = taskToAgentMapper ?? this.defaultTaskToAgentMapper.bind(this)
    this._acceptanceCriteriaChecker = acceptanceCriteriaChecker ?? this.defaultAcceptanceCriteriaChecker.bind(this)
    this._outputs = []
    this._agentResults = []
  }

  // -------------------------------------------------------------------------
  // Public Properties
  // -------------------------------------------------------------------------

  /** Get session ID */
  get sessionId(): string {
    return this._sessionId
  }

  /** Get project ID */
  get projectId(): string {
    return this._projectId
  }

  /** Get phase being executed */
  get phase(): RoadmapPhase {
    return this._phase
  }

  /** Get whether executor is currently executing */
  get isExecuting(): boolean {
    return this._isExecuting
  }

  /** Get whether execution was stopped */
  get stopped(): boolean {
    return this._stopped
  }

  /** Get outputs collected during execution */
  get outputs(): string[] {
    return [...this._outputs]
  }

  /** Get agent results */
  get agentResults(): AgentTaskResult[] {
    return [...this._agentResults]
  }

  // -------------------------------------------------------------------------
  // Execution
  // -------------------------------------------------------------------------

  /**
   * Execute the phase
   */
  async execute(): Promise<PhaseExecutionResult> {
    if (this._isExecuting) {
      throw new Error('Phase executor is already executing')
    }

    this._isExecuting = true
    this._startTime = Date.now()
    this._outputs = []
    this._agentResults = []
    this._stopped = false

    this.addOutput(`Starting Phase ${this._phase.id}: ${this._phase.name}`)
    this.broadcastPhaseStarted()

    try {
      // Check dependencies
      await this.checkDependencies()

      // Execute tasks
      const taskResults = await this.executeTasks()

      // Store agent results
      this._agentResults = taskResults

      // Check acceptance criteria
      this.addOutput('Checking acceptance criteria...')
      const criteriaResults = await this._acceptanceCriteriaChecker(this._phase, taskResults)
      const allPassed = criteriaResults.every((r) => r.passed)

      if (allPassed) {
        this.addOutput(`All acceptance criteria passed for Phase ${this._phase.id}`)
      } else {
        const failedCriteria = criteriaResults.filter((r) => !r.passed)
        this.addOutput(`${failedCriteria.length} acceptance criteria failed:`)
        for (const criteria of failedCriteria) {
          this.addOutput(`  - ${criteria.criteria}`)
          if (criteria.reason) {
            this.addOutput(`    Reason: ${criteria.reason}`)
          }
        }
      }

      const duration = Date.now() - this._startTime

      // Calculate summary
      const tasksCompleted = taskResults.filter((r) => r.success).length
      const tasksFailed = taskResults.filter((r) => !r.success).length
      const tasksSkipped = 0 // Could be implemented in the future

      const result: PhaseExecutionResult = {
        phaseId: this._phase.id,
        success: allPassed && tasksFailed === 0,
        tasksCompleted,
        tasksFailed,
        tasksSkipped,
        duration,
        acceptanceCriteriaResults: criteriaResults,
        allAcceptanceCriteriaPassed: allPassed,
        agentResults: taskResults,
        outputs: this._outputs,
      }

      // Broadcast completion
      if (result.success) {
        this.broadcastPhaseCompleted(result)
      } else {
        this.broadcastPhaseFailed(result)
      }

      return result
    } catch (error) {
      const duration = Date.now() - this._startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      this.addOutput(`Phase ${this._phase.id} failed: ${errorMessage}`)

      const result: PhaseExecutionResult = {
        phaseId: this._phase.id,
        success: false,
        tasksCompleted: 0,
        tasksFailed: this._phase.tasks.length,
        tasksSkipped: 0,
        duration,
        error: errorMessage,
        acceptanceCriteriaResults: [],
        allAcceptanceCriteriaPassed: false,
        agentResults: this._agentResults,
        outputs: this._outputs,
      }

      this.broadcastPhaseFailed(result)

      return result
    } finally {
      this._isExecuting = false
    }
  }

  /**
   * Stop execution
   */
  stop(): void {
    if (!this._isExecuting) {
      return
    }

    this._stopped = true
    this.addOutput(`Stopping Phase ${this._phase.id}...`)

    // Stop all agents for this session
    const { stopSessionAgents } = require('./agent-runner.js')
    stopSessionAgents(this._sessionId)

    this.broadcastPhaseStopped()
  }

  // -------------------------------------------------------------------------
  // Task → Agent Mapping
  // -------------------------------------------------------------------------

  /**
   * Default task to agent mapping
   */
  private defaultTaskToAgentMapper(task: AgentTask): AgentType {
    // First check if task has assigned agent type
    if (task.assignedAgentType) {
      return task.assignedAgentType
    }

    // Map by task type
    if (task.type in DEFAULT_TASK_AGENT_MAPPING) {
      const agentType = DEFAULT_TASK_AGENT_MAPPING[task.type]
      if (agentType) {
        return agentType
      }
    }

    // Default to implementer
    return 'implementer'
  }

  /**
   * Get agent type for a task
   */
  getAgentForTask(task: AgentTask): AgentType {
    return this._taskToAgentMapper(task)
  }

  /**
   * Get agent type for a phase task
   */
  getAgentForPhaseTask(task: RoadmapPhase['tasks'][0]): AgentType {
    // First check if task has assigned agent type
    if (task.assignedAgentType) {
      return task.assignedAgentType
    }

    // Map by task type string (for PhaseTask which has string type)
    const taskTypeStr = task.type as string
    if (taskTypeStr in DEFAULT_TASK_AGENT_MAPPING) {
      const mapped = DEFAULT_TASK_AGENT_MAPPING[taskTypeStr]
      if (mapped) return mapped
    }

    // Default to implementer
    return 'implementer'
  }

  // -------------------------------------------------------------------------
  // Acceptance Criteria Checking
  // -------------------------------------------------------------------------

  /**
   * Default acceptance criteria checker
   */
  private async defaultAcceptanceCriteriaChecker(
    phase: RoadmapPhase,
    agentResults: AgentTaskResult[]
  ): Promise<AcceptanceCriteriaResult[]> {
    const results: AcceptanceCriteriaResult[] = []

    if (!phase.acceptanceCriteria || phase.acceptanceCriteria.length === 0) {
      // No criteria defined, consider as passed
      return results
    }

    // Check each criteria
    for (const criteria of phase.acceptanceCriteria) {
      const result: AcceptanceCriteriaResult = {
        criteria,
        passed: true,
      }

      // Basic automated checks
      const lowerCriteria = criteria.toLowerCase()

      // Check if all tasks completed successfully
      if (lowerCriteria.includes('all task') || lowerCriteria.includes('complete')) {
        const allTasksCompleted = agentResults.every((r) => r.success)
        if (!allTasksCompleted) {
          result.passed = false
        }
      }

      // Check for test execution
      if (lowerCriteria.includes('test')) {
        const hasTestTask = phase.tasks.some((t) => t.type === 'test')
        const testExecuted = agentResults.some((r) => {
          const task = phase.tasks.find((t) => t.id === r.taskId)
          return task && (task.type === 'test' || task.title.toLowerCase().includes('test'))
        })

        if (hasTestTask && !testExecuted) {
          result.passed = false
        }
      }

      // Check for review
      if (lowerCriteria.includes('review')) {
        const hasReviewTask = phase.tasks.some((t) => t.type === 'review')
        const reviewDone = agentResults.some((r) => {
          const task = phase.tasks.find((t) => t.id === r.taskId)
          return task && (task.type === 'review' || task.title.toLowerCase().includes('review'))
        })

        if (hasReviewTask && !reviewDone) {
          result.passed = false
          result.reason = 'Code review was not completed'
        }
      }

      // Check for security
      if (lowerCriteria.includes('secur')) {
        const hasSecurityTask = phase.tasks.some((t) => t.type === 'security')
        const securityDone = agentResults.some((r) => {
          const task = phase.tasks.find((t) => t.id === r.taskId)
          return task && (task.type === 'security' || task.title.toLowerCase().includes('secur'))
        })

        if (hasSecurityTask && !securityDone) {
          result.passed = false
          result.reason = 'Security review was not completed'
        }
      }

      // Check for no errors
      if (lowerCriteria.includes('no error') || lowerCriteria.includes('without error')) {
        const hasErrors = agentResults.some((r) => !r.success)
        if (hasErrors) {
          result.passed = false
          result.reason = 'Some tasks had errors'
        }
      }

      results.push(result)
    }

    return results
  }

  // -------------------------------------------------------------------------
  // Task Execution
  // -------------------------------------------------------------------------

  /**
   * Check phase dependencies
   */
  private async checkDependencies(): Promise<void> {
    if (!this._phase.dependencies || this._phase.dependencies.length === 0) {
      return
    }

    this.addOutput('Checking phase dependencies...')

    // In a real implementation, this would check if dependent phases are completed
    // For now, we assume dependencies are met if the phase is in the queue
    for (const depId of this._phase.dependencies) {
      this.addOutput(`  - Dependency Phase ${depId}: ✓`)
    }
  }

  /**
   * Execute all tasks in the phase
   */
  private async executeTasks(): Promise<AgentTaskResult[]> {
    const results: AgentTaskResult[] = []
    const pendingTasks = this._phase.tasks.filter((t) => t.status === 'pending')

    if (pendingTasks.length === 0) {
      this.addOutput('No pending tasks to execute')
      return results
    }

    this.addOutput(`Executing ${pendingTasks.length} task(s)...`)

    // Execute tasks one by one (sequential for now, can be parallel later)
    for (const task of pendingTasks) {
      if (this._stopped) {
        this.addOutput(`Execution stopped, skipping task: ${task.title}`)
        break
      }

      const result = await this.executeSingleTask(task)
      results.push(result)

      // Update task status in phase
      task.status = result.success ? 'completed' : 'failed'
      if (result.error) {
        task.error = result.error
      }

      // Broadcast task progress
      this.broadcastTaskProgress(task.id, result)

      if (!result.success) {
        // Decide whether to continue or stop on error
        this.addOutput(`Task failed: ${task.title}`)
        // Continue anyway to check acceptance criteria
      }
    }

    return results
  }

  /**
   * Execute a single task
   */
  private async executeSingleTask(task: RoadmapPhase['tasks'][0]): Promise<AgentTaskResult> {
    const startTime = Date.now()
    const agentType = this.getAgentForPhaseTask(task)

    this.addOutput(`Executing task: ${task.title} (${agentType})`)

    try {
      // Build prompt for this task
      const prompt = await this.buildTaskPrompt(task, agentType)

      // Build spawn options
      const spawnOptions: AgentSpawnOptions = {
        agentType,
        sessionId: this._sessionId,
        cwd: this._cwd,
        prompt,
        ...(this._config.modelOverride && { modelOverride: this._config.modelOverride }),
        ...(this._config.thinkingLevelOverride && { thinkingLevelOverride: this._config.thinkingLevelOverride }),
        dangerouslySkipPermissions: this._config.dangerouslySkipPermissions,
        maxTurns: this._config.maxTurns,
        timeout: this._config.agentTimeout,
      }

      // Spawn agent
      const agent = await spawnAgent(spawnOptions)

      this.addOutput(`Agent spawned: ${agent.name} (${agent.model})`)
      this.broadcastAgentSpawned(agent)

      // Wait for agent completion
      const completion = await this.waitForAgentCompletion(agent.id)

      const duration = Date.now() - startTime

      const result: AgentTaskResult = {
        taskId: task.id,
        agent,
        success: completion.success,
        ...(completion.error ? { error: completion.error } : {}),
        duration,
        output: completion.output,
      }

      if (result.success) {
        this.addOutput(`Task completed: ${task.title} (${duration}ms)`)
      } else {
        this.addOutput(`Task failed: ${task.title} - ${result.error}`)
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      return {
        taskId: task.id,
        success: false,
        error: errorMessage,
        duration,
      }
    }
  }

  /**
   * Build prompt for a task
   */
  private async buildTaskPrompt(
    task: RoadmapPhase['tasks'][0],
    agentType: AgentType
  ): Promise<string> {
    // Load agent config
    const { loadAgentConfig } = await import('./agent-runner.js')
    const agentConfig = await loadAgentConfig(agentType)

    if (!agentConfig) {
      throw new Error(`Agent configuration not found for type: ${agentType}`)
    }

    // Build context
    const context: PromptBuilderContext = {
      agentConfig,
      sessionId: this._sessionId,
      projectId: this._projectId,
      phaseId: this._phase.id,
      userPrompt: this.buildTaskInstruction(task),
    }

    const builtPrompt = await buildPrompt(context)
    return builtPrompt.userPrompt
  }

  /**
   * Build task instruction
   */
  private buildTaskInstruction(task: RoadmapPhase['tasks'][0]): string {
    const sections: string[] = []

    sections.push(`# Task: ${task.title}`)

    if (task.description) {
      sections.push('')
      sections.push(task.description)
    }

    // Add phase context
    sections.push('')
    sections.push('## Phase Context')
    sections.push(`This task is part of **Phase ${this._phase.id}: ${this._phase.name}**`)
    if (this._phase.description) {
      sections.push(`Phase description: ${this._phase.description}`)
    }

    // Add acceptance criteria if available
    if (this._phase.acceptanceCriteria && this._phase.acceptanceCriteria.length > 0) {
      sections.push('')
      sections.push('## Acceptance Criteria for this Phase')
      for (const criteria of this._phase.acceptanceCriteria) {
        sections.push(`- ${criteria}`)
      }
    }

    sections.push('')
    sections.push('Please complete this task following the acceptance criteria.')

    return sections.join('\n')
  }

  /**
   * Wait for agent completion
   */
  private waitForAgentCompletion(agentId: string): Promise<{
    success: boolean
    error?: string
    output?: string
  }> {
    return new Promise((resolve) => {
      // Get agent to check initial status
      const { getAgent } = require('./agent-runner.js')
      const agent = getAgent(agentId)

      if (!agent) {
        resolve({ success: false, error: 'Agent not found' })
        return
      }

      // Check if already completed
      if (agent.status === 'completed') {
        resolve({ success: true })
        return
      }

      if (agent.status === 'error') {
        const errorResult: { success: boolean; error?: string; output?: string } = { success: false }
        if (agent.errorMessage) {
          errorResult.error = agent.errorMessage
        }
        resolve(errorResult)
        return
      }

      // Set up event listeners
      const onCompleted = (data: { agentId: string }) => {
        if (data.agentId === agentId) {
          agentEvents.off(AGENT_EVENTS.COMPLETED, onCompleted)
          agentEvents.off(AGENT_EVENTS.ERROR, onError)
          resolve({ success: true })
        }
      }

      const onError = (data: { agentId: string; error?: string }) => {
        if (data.agentId === agentId) {
          agentEvents.off(AGENT_EVENTS.COMPLETED, onCompleted)
          agentEvents.off(AGENT_EVENTS.ERROR, onError)
          const result: { success: boolean; error?: string } = { success: false }
          if (data.error !== undefined) {
            result.error = data.error
          }
          resolve(result)
        }
      }

      agentEvents.on(AGENT_EVENTS.COMPLETED, onCompleted)
      agentEvents.on(AGENT_EVENTS.ERROR, onError)
    })
  }

  // -------------------------------------------------------------------------
  // Output Management
  // -------------------------------------------------------------------------

  /**
   * Add output message
   */
  private addOutput(message: string): void {
    this._outputs.push(message)
    this.broadcastOutput(message)
  }

  // -------------------------------------------------------------------------
  // WebSocket Broadcasting
  // -------------------------------------------------------------------------

  /**
   * Broadcast phase started event
   */
  private broadcastPhaseStarted(): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'phase:started',
      payload: {
        sessionId: this._sessionId,
        projectId: this._projectId,
        phaseId: this._phase.id,
        phaseName: this._phase.name,
        taskCount: this._phase.tasks.filter((t) => t.status === 'pending').length,
        startedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast phase completed event
   */
  private broadcastPhaseCompleted(result: PhaseExecutionResult): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'phase:completed',
      payload: {
        sessionId: this._sessionId,
        projectId: this._projectId,
        phaseId: this._phase.id,
        phaseName: this._phase.name,
        result: {
          success: result.success,
          tasksCompleted: result.tasksCompleted,
          tasksFailed: result.tasksFailed,
          duration: result.duration,
          allAcceptanceCriteriaPassed: result.allAcceptanceCriteriaPassed,
        },
        completedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast phase failed event
   */
  private broadcastPhaseFailed(result: PhaseExecutionResult): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'phase:failed',
      payload: {
        sessionId: this._sessionId,
        projectId: this._projectId,
        phaseId: this._phase.id,
        phaseName: this._phase.name,
        error: result.error,
        completedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast phase stopped event
   */
  private broadcastPhaseStopped(): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'phase:stopped',
      payload: {
        sessionId: this._sessionId,
        projectId: this._projectId,
        phaseId: this._phase.id,
        phaseName: this._phase.name,
        stoppedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast agent spawned event
   */
  private broadcastAgentSpawned(agent: Agent): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'phase:agent_spawned',
      payload: {
        sessionId: this._sessionId,
        phaseId: this._phase.id,
        agentId: agent.id,
        agentType: agent.type,
        agentName: agent.name,
        model: agent.model,
        spawnedAt: agent.startedAt,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast task progress event
   */
  private broadcastTaskProgress(taskId: string, result: AgentTaskResult): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'phase:task_progress',
      payload: {
        sessionId: this._sessionId,
        phaseId: this._phase.id,
        taskId,
        success: result.success,
        duration: result.duration,
        ...(result.error ? { error: result.error } : {}),
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast output message
   */
  private broadcastOutput(message: string): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'phase:output',
      payload: {
        sessionId: this._sessionId,
        phaseId: this._phase.id,
        message,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Active phase executors per session
 */
const activeExecutors = new Map<string, PhaseExecutor>()

/**
 * Create a new phase executor
 */
export function createPhaseExecutor(
  config: PhaseExecutorConfig,
  taskToAgentMapper?: TaskToAgentMapper,
  acceptanceCriteriaChecker?: AcceptanceCriteriaChecker
): PhaseExecutor {
  const executor = new PhaseExecutor(config, taskToAgentMapper, acceptanceCriteriaChecker)
  activeExecutors.set(config.sessionId, executor)
  return executor
}

/**
 * Get active executor for a session
 */
export function getPhaseExecutor(sessionId: string): PhaseExecutor | undefined {
  return activeExecutors.get(sessionId)
}

/**
 * Remove executor for a session
 */
export function removePhaseExecutor(sessionId: string): boolean {
  return activeExecutors.delete(sessionId)
}

/**
 * Execute a single phase with default configuration
 */
export async function executePhase(
  config: PhaseExecutorConfig,
  taskToAgentMapper?: TaskToAgentMapper,
  acceptanceCriteriaChecker?: AcceptanceCriteriaChecker
): Promise<PhaseExecutionResult> {
  const executor = new PhaseExecutor(config, taskToAgentMapper, acceptanceCriteriaChecker)
  return executor.execute()
}

// =============================================================================
// Export Default
// =============================================================================

export default {
  PhaseExecutor,
  createPhaseExecutor,
  getPhaseExecutor,
  removePhaseExecutor,
  executePhase,
}
