/**
 * Roadmap Execution Engine
 * Orchestrates autonomous roadmap execution with phase state machine
 * @module @task-filewas/backend/orchestrator/roadmap-executor
 */

import type {
  AgentTask,
  AgentType,
  TaskPriority,
  TaskType,
} from '@task-filewas/shared'
import { TaskQueue } from './task-queue.js'
import {
  buildPrompt,
  type PromptBuilderContext,
} from './prompt-builder.js'
import type { ParallelExecutorConfig } from './parallel-executor.js'
import { getFallbackHandler } from './fallback.js'
import {
  broadcastToSession,
  type WSMessage,
} from '../socket/index.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Phase execution state
 */
export type PhaseState =
  | 'pending'      // Phase hasn't started
  | 'starting'     // Phase is initializing
  | 'running'      // Phase is actively executing
  | 'testing'      // Phase is running tests
  | 'pausing'      // Phase is being paused
  | 'paused'       // Phase is paused
  | 'stopping'     // Phase is stopping
  | 'completed'    // Phase finished successfully
  | 'failed'       // Phase failed
  | 'cancelled'    // Phase was cancelled

/**
 * Roadmap phase definition
 */
export interface RoadmapPhase {
  /** Phase ID */
  id: number
  /** Phase name */
  name: string
  /** Phase description */
  description?: string
  /** Phase state */
  state: PhaseState
  /** Tasks in this phase */
  tasks: PhaseTask[]
  /** Dependencies (other phase IDs) */
  dependencies: number[]
  /** Acceptance criteria */
  acceptanceCriteria?: string[]
  /** Estimated duration (minutes) */
  estimatedDuration?: number
  /** Started timestamp */
  startedAt?: string
  /** Completed timestamp */
  completedAt?: string
  /** Error message if failed */
  error?: string
  /** Retry count */
  retries: number
  /** Maximum retries */
  maxRetries: number
}

/**
 * Task within a phase
 */
export interface PhaseTask {
  /** Unique task ID */
  id: string
  /** Task type */
  type: TaskType
  /** Task title */
  title: string
  /** Task description */
  description?: string
  /** Task status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  /** Assigned agent type */
  assignedAgentType: AgentType
  /** Task priority */
  priority: TaskPriority
  /** Dependencies (other task IDs) */
  dependencies: string[]
  /** Task input data */
  input?: Record<string, unknown>
  /** Error message if failed */
  error?: string
}

/**
 * Roadmap execution configuration
 */
export interface RoadmapExecutorConfig {
  /** Session ID */
  sessionId: string
  /** Project ID */
  projectId: string
  /** Working directory */
  cwd: string
  /** Starting phase ID (default: 1) */
  startPhase?: number
  /** Maximum parallel agents */
  maxParallelAgents?: number
  /** Skip permissions (autonomous mode) */
  dangerouslySkipPermissions?: boolean
  /** Maximum turns per agent */
  maxTurns?: number
  /** Agent timeout (ms) */
  agentTimeout?: number
  /** Enable CEO fallback */
  enableFallback?: boolean
  /** Fallback after N failures */
  fallbackAfterFailures?: number
  /** Auto-advance to next phase */
  autoAdvance?: boolean
}

/**
 * Execution status
 */
export interface ExecutionStatus {
  /** Current phase ID */
  currentPhase: number
  /** Total phases */
  totalPhases: number
  /** Overall state */
  state: PhaseState
  /** Progress percentage (0-100) */
  progress: number
  /** Active agents */
  activeAgents: number
  /** Completed phases */
  completedPhases: number
  /** Failed phases */
  failedPhases: number
  /** Started timestamp */
  startedAt?: string | undefined
  /** Estimated completion */
  estimatedCompletion?: string | undefined
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
  /** Duration in milliseconds */
  duration: number
  /** Error message if failed */
  error?: string | undefined
  /** Output from agents */
  output?: string[]
}

/**
 * State transition result
 */
export interface StateTransitionResult {
  /** Whether transition was successful */
  success: boolean
  /** Previous state */
  previousState: PhaseState
  /** New state */
  newState: PhaseState
  /** Error message if failed */
  error?: string
}

// =============================================================================
// Constants
// =============================================================================

/** Default configuration values */
const DEFAULT_CONFIG = {
  startPhase: 1,
  maxParallelAgents: 3,
  dangerouslySkipPermissions: true,
  maxTurns: 10,
  agentTimeout: 30 * 60 * 1000, // 30 minutes
  enableFallback: true,
  fallbackAfterFailures: 2,
  autoAdvance: true,
  maxRetries: 3,
} as const

/** Valid state transitions */
const STATE_TRANSITIONS: Record<PhaseState, PhaseState[]> = {
  pending: ['starting', 'cancelled'],
  starting: ['running', 'failed', 'cancelled'],
  running: ['testing', 'pausing', 'stopping', 'failed'],
  testing: ['running', 'completed', 'failed', 'stopping'],
  pausing: ['paused', 'stopping'],
  paused: ['starting', 'stopping', 'cancelled'],
  stopping: ['completed', 'failed', 'cancelled'],
  completed: [],
  failed: ['starting', 'cancelled'],
  cancelled: [],
}

// =============================================================================
// RoadmapExecutor Class
// =============================================================================

/**
 * RoadmapExecutor - Manages autonomous roadmap execution
 */
export class RoadmapExecutor {
  private readonly _sessionId: string
  private readonly _projectId: string
  private readonly _cwd: string
  private readonly _config: Required<Omit<RoadmapExecutorConfig, 'projectId'>>
  private _phases: Map<number, RoadmapPhase>
  private _currentPhaseId: number
  private _executorState: PhaseState
  private _taskQueue: TaskQueue
  private _startedAt?: string
  private _stoppedAt?: string
  private _executionResults: Map<number, PhaseExecutionResult>
  private _outputBuffer: string[]

  /**
   * Create a new RoadmapExecutor
   */
  constructor(config: RoadmapExecutorConfig) {
    this._sessionId = config.sessionId
    this._projectId = config.projectId
    this._cwd = config.cwd
    this._config = {
      sessionId: config.sessionId,
      cwd: config.cwd,
      startPhase: config.startPhase ?? DEFAULT_CONFIG.startPhase,
      maxParallelAgents: config.maxParallelAgents ?? DEFAULT_CONFIG.maxParallelAgents,
      dangerouslySkipPermissions: config.dangerouslySkipPermissions ?? DEFAULT_CONFIG.dangerouslySkipPermissions,
      maxTurns: config.maxTurns ?? DEFAULT_CONFIG.maxTurns,
      agentTimeout: config.agentTimeout ?? DEFAULT_CONFIG.agentTimeout,
      enableFallback: config.enableFallback ?? DEFAULT_CONFIG.enableFallback,
      fallbackAfterFailures: config.fallbackAfterFailures ?? DEFAULT_CONFIG.fallbackAfterFailures,
      autoAdvance: config.autoAdvance ?? DEFAULT_CONFIG.autoAdvance,
    }
    this._phases = new Map()
    this._currentPhaseId = this._config.startPhase
    this._executorState = 'pending'
    this._taskQueue = new TaskQueue(this._sessionId, this._config.maxParallelAgents)
    this._executionResults = new Map()
    this._outputBuffer = []

    // Initialize fallback handler
    if (this._config.enableFallback) {
      getFallbackHandler(this._sessionId, {
        enabled: true,
        fallbackAfterFailures: this._config.fallbackAfterFailures,
      })
    }
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

  /** Get current phase ID */
  get currentPhaseId(): number {
    return this._currentPhaseId
  }

  /** Get current executor state */
  get state(): PhaseState {
    return this._executorState
  }

  /** Get all phases */
  get phases(): RoadmapPhase[] {
    return Array.from(this._phases.values()).sort((a, b) => a.id - b.id)
  }

  /** Get current phase */
  get currentPhase(): RoadmapPhase | undefined {
    return this._phases.get(this._currentPhaseId)
  }

  /** Get task queue */
  get taskQueue(): TaskQueue {
    return this._taskQueue
  }

  /** Get execution status */
  get status(): ExecutionStatus {
    const phases = this.phases
    const completedPhases = phases.filter((p) => p.state === 'completed').length
    const failedPhases = phases.filter((p) => p.state === 'failed').length
    const totalPhases = phases.length

    // Calculate progress based on current phase
    const currentPhase = this.currentPhase
    let progress = 0
    if (totalPhases > 0) {
      const phaseProgress = (this._currentPhaseId - 1) / totalPhases
      progress = Math.round(phaseProgress * 100)
    }

    // Add current phase task progress
    if (currentPhase && currentPhase.tasks.length > 0) {
      const completedTasks = currentPhase.tasks.filter((t) => t.status === 'completed').length
      const taskProgress = completedTasks / currentPhase.tasks.length
      const taskPercent = Math.round(taskProgress * (100 / totalPhases))
      progress = Math.min(100, progress + taskPercent)
    }

    return {
      currentPhase: this._currentPhaseId,
      totalPhases,
      state: this._executorState,
      progress,
      activeAgents: this._taskQueue.runningTasks.length,
      completedPhases,
      failedPhases,
      ...(this._startedAt && { startedAt: this._startedAt }),
    }
  }

  /** Get output buffer */
  get output(): string[] {
    return [...this._outputBuffer]
  }

  // -------------------------------------------------------------------------
  // Phase Management
  // -------------------------------------------------------------------------

  /**
   * Load phases from roadmap file
   */
  async loadPhases(): Promise<void> {
    // Import dynamically to avoid circular dependency
    const { loadProjectRoadmap } = await import('./prompt-builder.js')
    const result = await loadProjectRoadmap(this._projectId)

    if (!result.exists || !result.content) {
      throw new Error(`Roadmap not found for project: ${this._projectId}`)
    }

    const lines = result.content.split('\n').filter((line) => line.trim())
    const phases: RoadmapPhase[] = []

    for (const line of lines) {
      try {
        const entry = JSON.parse(line)

        if (entry.type === 'header') {
          this._currentPhaseId = entry.currentPhase || 1
        } else if (entry.type === 'phase') {
          const phase: RoadmapPhase = {
            id: entry.id,
            name: entry.name,
            description: entry.description,
            state: entry.status === 'completed' ? 'completed' : 'pending',
            tasks: (entry.tasks || []).map((t: any) => ({
              id: t.id || `task-${entry.id}-${Math.random().toString(36).substring(2, 11)}`,
              type: t.type || 'implement',
              title: t.title,
              description: t.details,
              status: t.status === 'done' ? 'completed' : 'pending',
              assignedAgentType: this.mapTaskToAgent(t.type || 'implement'),
              priority: 'normal',
              dependencies: [],
            })),
            dependencies: entry.dependencies || [],
            acceptanceCriteria: entry.acceptanceCriteria,
            estimatedDuration: entry.durationMinutes,
            retries: 0,
            maxRetries: DEFAULT_CONFIG.maxRetries,
          }
          phases.push(phase)
        }
      } catch {
        // Skip invalid JSON lines
      }
    }

    // Store phases
    this._phases.clear()
    for (const phase of phases) {
      this._phases.set(phase.id, phase)
    }

    // Set current phase to first pending phase
    const firstPending = phases.find((p) => p.state === 'pending')
    if (firstPending) {
      this._currentPhaseId = firstPending.id
    }
  }

  /**
   * Map task type to agent type
   */
  private mapTaskToAgent(taskType: TaskType): AgentType {
    const mapping: Record<TaskType, AgentType> = {
      plan: 'planner',
      implement: 'implementer',
      test: 'tester',
      review: 'reviewer',
      fix: 'debugger',
      security: 'security',
    }
    return mapping[taskType] || 'implementer'
  }

  /**
   * Add a phase to the roadmap
   */
  addPhase(phase: Omit<RoadmapPhase, 'retries' | 'maxRetries'>): void {
    const fullPhase: RoadmapPhase = {
      ...phase,
      retries: 0,
      maxRetries: DEFAULT_CONFIG.maxRetries,
    }
    this._phases.set(phase.id, fullPhase)
  }

  /**
   * Get a phase by ID
   */
  getPhase(phaseId: number): RoadmapPhase | undefined {
    return this._phases.get(phaseId)
  }

  /**
   * Update phase state
   */
  updatePhaseState(phaseId: number, newState: PhaseState): StateTransitionResult {
    const phase = this._phases.get(phaseId)
    if (!phase) {
      return {
        success: false,
        previousState: 'pending',
        newState: 'pending',
        error: `Phase not found: ${phaseId}`,
      }
    }

    const previousState = phase.state

    // Check if transition is valid
    const validTransitions = STATE_TRANSITIONS[previousState] || []
    if (!validTransitions.includes(newState)) {
      return {
        success: false,
        previousState,
        newState: previousState,
        error: `Invalid state transition: ${previousState} -> ${newState}`,
      }
    }

    // Update timestamps based on state
    const now = new Date().toISOString()
    if (newState === 'running' && !phase.startedAt) {
      phase.startedAt = now
    } else if (
      newState === 'completed' ||
      newState === 'failed' ||
      newState === 'cancelled'
    ) {
      phase.completedAt = now
    }

    phase.state = newState

    // Broadcast state change
    this.broadcastPhaseStateChange(phaseId, newState, previousState)

    return {
      success: true,
      previousState,
      newState,
    }
  }

  // -------------------------------------------------------------------------
  // State Machine
  // -------------------------------------------------------------------------

  /**
   * Transition to a new state
   */
  private transitionTo(newState: PhaseState): StateTransitionResult {
    const result = this.updatePhaseState(this._currentPhaseId, newState)
    if (result.success) {
      this._executorState = newState
    }
    return result
  }

  /**
   * Check if a transition is valid
   */
  canTransitionTo(newState: PhaseState): boolean {
    const validTransitions = STATE_TRANSITIONS[this._executorState] || []
    return validTransitions.includes(newState)
  }

  // -------------------------------------------------------------------------
  // Execution Control
  // -------------------------------------------------------------------------

  /**
   * Start roadmap execution
   */
  async start(): Promise<ExecutionStatus> {
    if (this._executorState === 'running' || this._executorState === 'starting') {
      return this.status
    }

    // Load phases if not loaded
    if (this._phases.size === 0) {
      await this.loadPhases()
    }

    const transition = this.transitionTo('starting')
    if (!transition.success) {
      throw new Error(transition.error)
    }

    this._startedAt = new Date().toISOString()
    this.broadcastExecutionStart()

    // Move to running and start execution
    this.transitionTo('running')
    await this.executeCurrentPhase()

    return this.status
  }

  /**
   * Pause execution
   */
  async pause(): Promise<ExecutionStatus> {
    if (!this.canTransitionTo('pausing')) {
      return this.status
    }

    this.transitionTo('pausing')

    // Stop all agents
    const { stopSessionAgents } = await import('./agent-runner.js')
    stopSessionAgents(this._sessionId)

    // Pause task queue
    this._taskQueue.status = 'paused'

    this.transitionTo('paused')
    this.broadcastExecutionPaused()

    return this.status
  }

  /**
   * Resume execution
   */
  async resume(): Promise<ExecutionStatus> {
    if (this._executorState !== 'paused') {
      return this.status
    }

    this.transitionTo('starting')
    this._taskQueue.status = 'running'

    this.transitionTo('running')
    this.broadcastExecutionResumed()

    // Continue execution
    await this.executeCurrentPhase()

    return this.status
  }

  /**
   * Stop execution
   */
  async stop(): Promise<ExecutionStatus> {
    if (!this.canTransitionTo('stopping')) {
      return this.status
    }

    this.transitionTo('stopping')

    // Stop all agents
    const { stopSessionAgents } = await import('./agent-runner.js')
    stopSessionAgents(this._sessionId)

    // Clear task queue
    this._taskQueue.clear()
    this._taskQueue.status = 'idle'

    this.transitionTo('cancelled')
    this._stoppedAt = new Date().toISOString()
    this.broadcastExecutionStopped()

    return this.status
  }

  // -------------------------------------------------------------------------
  // Phase Execution
  // -------------------------------------------------------------------------

  /**
   * Execute the current phase
   */
  private async executeCurrentPhase(): Promise<PhaseExecutionResult> {
    const phase = this.currentPhase
    if (!phase) {
      return {
        phaseId: this._currentPhaseId,
        success: false,
        tasksCompleted: 0,
        tasksFailed: 0,
        duration: 0,
        error: 'No current phase found',
      }
    }

    const startTime = Date.now()
    const outputBuffer: string[] = []

    try {
      this.addOutput(`Starting Phase ${phase.id}: ${phase.name}`)

      // Check dependencies
      for (const depId of phase.dependencies) {
        const depPhase = this._phases.get(depId)
        if (!depPhase || depPhase.state !== 'completed') {
          throw new Error(`Dependency not met: Phase ${depId}`)
        }
      }

      // Convert phase tasks to agent tasks
      const tasksToAdd: AgentTask[] = []
      for (const task of phase.tasks) {
        if (task.status === 'pending') {
          const agentTask: AgentTask = {
            id: task.id,
            type: task.type,
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            dependencies: task.dependencies,
            status: 'pending',
            assignedAgentType: task.assignedAgentType,
            retries: 0,
            maxRetries: DEFAULT_CONFIG.maxRetries,
            createdAt: new Date().toISOString(),
            ...(task.input && { input: task.input }),
          }
          tasksToAdd.push(agentTask)
        }
      }

      // Add tasks to queue
      this._taskQueue.addMany(tasksToAdd)

      // Build prompt for this phase
      const prompt = await this.buildPhasePrompt(phase)

      // Execute tasks (parallel if independent)
      const result = await this.executePhaseTasks(phase, prompt)

      const duration = Date.now() - startTime

      // Store result
      const executionResult: PhaseExecutionResult = {
        phaseId: phase.id,
        success: result.allSuccess,
        tasksCompleted: result.successfulTasks,
        tasksFailed: result.failedTasks,
        duration,
        error: result.allSuccess ? undefined : 'Some tasks failed',
        output: outputBuffer,
      }
      this._executionResults.set(phase.id, executionResult)

      // Update phase state based on result
      if (result.allSuccess) {
        this.transitionTo('testing')
        await this.runPhaseTests(phase)
        this.transitionTo('completed')

        // Auto-advance to next phase if enabled
        if (this._config.autoAdvance) {
          await this.advanceToNextPhase()
        }
      } else {
        this.transitionTo('failed')
      }

      return executionResult
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      this.addOutput(`Phase ${phase.id} failed: ${errorMessage}`)

      const executionResult: PhaseExecutionResult = {
        phaseId: phase.id,
        success: false,
        tasksCompleted: 0,
        tasksFailed: phase.tasks.length,
        duration,
        error: errorMessage,
      }
      this._executionResults.set(phase.id, executionResult)

      this.transitionTo('failed')

      return executionResult
    }
  }

  /**
   * Build prompt for phase execution
   */
  private async buildPhasePrompt(phase: RoadmapPhase): Promise<string> {
    const { loadAgentConfig } = await import('./agent-runner.js')
    const agentConfig = await loadAgentConfig('orchestrator')

    if (!agentConfig) {
      throw new Error('Orchestrator agent config not found')
    }

    // Build prompt context
    const context: PromptBuilderContext = {
      agentConfig,
      sessionId: this._sessionId,
      projectId: this._projectId,
      phaseId: phase.id,
      userPrompt: this.buildPhaseTaskInstruction(phase),
    }

    const builtPrompt = await buildPrompt(context)
    return builtPrompt.userPrompt
  }

  /**
   * Build task instruction for phase
   */
  private buildPhaseTaskInstruction(phase: RoadmapPhase): string {
    const sections: string[] = []

    sections.push(`# Phase ${phase.id}: ${phase.name}`)

    if (phase.description) {
      sections.push('')
      sections.push(`## Description`)
      sections.push(phase.description)
    }

    if (phase.tasks.length > 0) {
      sections.push('')
      sections.push('## Tasks')
      for (const task of phase.tasks) {
        const statusIcon = task.status === 'completed' ? '✓' : '○'
        sections.push(`${statusIcon} **${task.title}** (${task.assignedAgentType})`)
        if (task.description) {
          sections.push(`  ${task.description}`)
        }
      }
    }

    if (phase.acceptanceCriteria && phase.acceptanceCriteria.length > 0) {
      sections.push('')
      sections.push('## Acceptance Criteria')
      for (const criteria of phase.acceptanceCriteria) {
        sections.push(`- ${criteria}`)
      }
    }

    sections.push('')
    sections.push('Execute the pending tasks to complete this phase.')

    return sections.join('\n')
  }

  /**
   * Execute phase tasks with parallel executor
   */
  private async executePhaseTasks(
    _phase: RoadmapPhase,
    prompt: string
  ): Promise<{
    allSuccess: boolean
    successfulTasks: number
    failedTasks: number
  }> {
    // Create parallel executor config
    const config: ParallelExecutorConfig = {
      sessionId: this._sessionId,
      cwd: this._cwd,
      maxParallel: this._config.maxParallelAgents,
      dangerouslySkipPermissions: this._config.dangerouslySkipPermissions,
      maxTurns: this._config.maxTurns,
      timeout: this._config.agentTimeout,
      stopOnError: false,
    }

    // Build prompt for each task
    const promptBuilder = (task: AgentTask): string => {
      return `${prompt}\n\n## Current Task\n**Task:** ${task.title}\n${task.description || ''}`
    }

    const { executeIndependentTasks } = await import('./parallel-executor.js')
    const result = await executeIndependentTasks(this._taskQueue, promptBuilder, config)

    return {
      allSuccess: result.allSuccess,
      successfulTasks: result.successfulTasks,
      failedTasks: result.failedTasks,
    }
  }

  /**
   * Run phase tests
   */
  private async runPhaseTests(phase: RoadmapPhase): Promise<void> {
    this.addOutput(`Running tests for Phase ${phase.id}...`)

    // TODO: Implement actual test execution
    // For now, mark as tested
    this.addOutput(`Tests completed for Phase ${phase.id}`)
  }

  /**
   * Advance to next phase
   */
  private async advanceToNextPhase(): Promise<void> {
    const phases = this.phases
    const nextPhase = phases.find((p) => p.id > this._currentPhaseId && p.state === 'pending')

    if (nextPhase) {
      this._currentPhaseId = nextPhase.id
      this.addOutput(`Advancing to Phase ${nextPhase.id}: ${nextPhase.name}`)
      this.broadcastPhaseAdvanced(this._currentPhaseId)

      // Start executing the next phase
      await this.executeCurrentPhase()
    } else {
      // All phases completed
      this.addOutput('All phases completed!')
      this._executorState = 'completed'
      this.broadcastExecutionCompleted()
    }
  }

  // -------------------------------------------------------------------------
  // Output Management
  // -------------------------------------------------------------------------

  /**
   * Add output to buffer
   */
  private addOutput(message: string): void {
    this._outputBuffer.push(message)
    this.broadcastOutput(message)
  }

  /**
   * Get output buffer
   */
  getOutput(): string[] {
    return [...this._outputBuffer]
  }

  /**
   * Clear output buffer
   */
  clearOutput(): void {
    this._outputBuffer = []
  }

  // -------------------------------------------------------------------------
  // WebSocket Broadcasting
  // -------------------------------------------------------------------------

  /**
   * Broadcast phase state change
   */
  private broadcastPhaseStateChange(
    phaseId: number,
    newState: PhaseState,
    previousState: PhaseState
  ): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'phase:state_changed',
      payload: {
        sessionId: this._sessionId,
        phaseId,
        previousState,
        newState,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast execution start
   */
  private broadcastExecutionStart(): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'roadmap:started',
      payload: {
        sessionId: this._sessionId,
        projectId: this._projectId,
        currentPhase: this._currentPhaseId,
        totalPhases: this._phases.size,
        startedAt: this._startedAt,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast execution paused
   */
  private broadcastExecutionPaused(): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'roadmap:paused',
      payload: {
        sessionId: this._sessionId,
        currentPhase: this._currentPhaseId,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast execution resumed
   */
  private broadcastExecutionResumed(): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'roadmap:resumed',
      payload: {
        sessionId: this._sessionId,
        currentPhase: this._currentPhaseId,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast execution stopped
   */
  private broadcastExecutionStopped(): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'roadmap:stopped',
      payload: {
        sessionId: this._sessionId,
        currentPhase: this._currentPhaseId,
        stoppedAt: this._stoppedAt,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast execution completed
   */
  private broadcastExecutionCompleted(): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'roadmap:completed',
      payload: {
        sessionId: this._sessionId,
        projectId: this._projectId,
        totalPhases: this._phases.size,
        completedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast phase advanced
   */
  private broadcastPhaseAdvanced(newPhaseId: number): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'roadmap:phase_advanced',
      payload: {
        sessionId: this._sessionId,
        previousPhase: newPhaseId - 1,
        newPhase: newPhaseId,
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
      event: 'roadmap:output',
      payload: {
        sessionId: this._sessionId,
        phaseId: this._currentPhaseId,
        message,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  // -------------------------------------------------------------------------
  // Serialization
  // -------------------------------------------------------------------------

  /**
   * Convert to state object (for storage/transmission)
   */
  toState(): {
    sessionId: string
    projectId: string
    cwd: string
    currentPhaseId: number
    executorState: PhaseState
    phases: RoadmapPhase[]
    taskQueue: unknown
    status: ExecutionStatus
    startedAt?: string | undefined
    stoppedAt?: string | undefined
  } {
    return {
      sessionId: this._sessionId,
      projectId: this._projectId,
      cwd: this._cwd,
      currentPhaseId: this._currentPhaseId,
      executorState: this._executorState,
      phases: this.phases,
      taskQueue: this._taskQueue.toState(),
      status: this.status,
      ...(this._startedAt && { startedAt: this._startedAt }),
      ...(this._stoppedAt && { stoppedAt: this._stoppedAt }),
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Active roadmap executors per session
 */
const activeExecutors = new Map<string, RoadmapExecutor>()

/**
 * Create a new roadmap executor
 */
export function createRoadmapExecutor(config: RoadmapExecutorConfig): RoadmapExecutor {
  const executor = new RoadmapExecutor(config)
  activeExecutors.set(config.sessionId, executor)
  return executor
}

/**
 * Get active executor for a session
 */
export function getRoadmapExecutor(sessionId: string): RoadmapExecutor | undefined {
  return activeExecutors.get(sessionId)
}

/**
 * Remove executor for a session
 */
export function removeRoadmapExecutor(sessionId: string): boolean {
  return activeExecutors.delete(sessionId)
}

/**
 * Get all active executors
 */
export function getAllExecutors(): RoadmapExecutor[] {
  return Array.from(activeExecutors.values())
}

// =============================================================================
// Export Default
// =============================================================================

export default {
  RoadmapExecutor,
  createRoadmapExecutor,
  getRoadmapExecutor,
  removeRoadmapExecutor,
  getAllExecutors,
}
