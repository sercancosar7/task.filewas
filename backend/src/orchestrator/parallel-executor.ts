/**
 * Parallel Executor Service
 * Manages parallel execution of agents with semaphore-based concurrency control
 * @module @task-filewas/backend/orchestrator/parallel-executor
 */

import type {
  Agent,
  AgentTask,
} from '@task-filewas/shared'
import {
  spawnAgent,
  type AgentSpawnOptions,
  agentEvents,
  AGENT_EVENTS,
} from './agent-runner.js'
import type { TaskQueue } from './task-queue.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Parallel executor configuration
 */
export interface ParallelExecutorConfig {
  /** Maximum parallel agents (default: 3) */
  maxParallel?: number
  /** Working directory for agents */
  cwd: string
  /** Session ID */
  sessionId: string
  /** Skip permissions (autonomous mode) */
  dangerouslySkipPermissions?: boolean
  /** Maximum turns per agent */
  maxTurns?: number
  /** Agent timeout in milliseconds */
  timeout?: number
  /** Whether to stop on first error */
  stopOnError?: boolean
}

/**
 * Execution result for a single task
 */
export interface TaskExecutionResult {
  /** Task ID */
  taskId: string
  /** Whether execution was successful */
  success: boolean
  /** Agent that executed the task */
  agent?: Agent
  /** Error message if failed */
  error?: string
  /** Duration in milliseconds */
  duration: number
}

/**
 * Group of independent tasks that can run in parallel
 */
export interface IndependentTaskGroup {
  /** Tasks in this group */
  tasks: AgentTask[]
  /** Whether tasks in this group are truly independent */
  isIndependent: boolean
  /** Reasons why not independent (if applicable) */
  dependencies?: string[]
}

/**
 * Parallel execution result
 */
export interface ParallelExecutionResult {
  /** All task results */
  results: TaskExecutionResult[]
  /** Total number of tasks executed */
  totalTasks: number
  /** Number of successful tasks */
  successfulTasks: number
  /** Number of failed tasks */
  failedTasks: number
  /** Whether all tasks succeeded */
  allSuccess: boolean
  /** Total duration in milliseconds */
  totalDuration: number
}

// =============================================================================
// Constants
// =============================================================================

/** Default maximum parallel agents */
const DEFAULT_MAX_PARALLEL = 3

/** Default execution timeout (30 minutes) */
const DEFAULT_EXECUTION_TIMEOUT = 30 * 60 * 1000

/** Internal configuration type with required fields */
type InternalExecutorConfig = {
  maxParallel: number
  cwd: string
  sessionId: string
  dangerouslySkipPermissions: boolean
  timeout: number
  stopOnError: boolean
  maxTurns?: number
}

// =============================================================================
// Semaphore Class
// =============================================================================

/**
 * Semaphore for limiting concurrent operations
 */
export class Semaphore {
  private _permits: number
  private _queue: Array<() => void>

  /**
   * Create a new semaphore
   * @param permits Number of concurrent permits available
   */
  constructor(permits: number) {
    this._permits = Math.max(1, permits)
    this._queue = []
  }

  /**
   * Get current available permits
   */
  get available(): number {
    return this._permits
  }

  /**
   * Acquire a permit (blocks until available)
   */
  async acquire(): Promise<void> {
    if (this._permits > 0) {
      this._permits--
      return
    }

    // Wait in queue
    return new Promise<void>((resolve) => {
      this._queue.push(resolve)
    })
  }

  /**
   * Release a permit
   */
  release(): void {
    if (this._queue.length > 0) {
      // Wake up next waiting operation
      const next = this._queue.shift()
      next?.()
    } else {
      this._permits++
    }
  }

  /**
   * Execute an operation with a permit (auto-acquire and release)
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }

  /**
   * Try to acquire a permit without blocking
   * @returns true if permit was acquired, false otherwise
   */
  tryAcquire(): boolean {
    if (this._permits > 0) {
      this._permits--
      return true
    }
    return false
  }
}

// =============================================================================
// Parallel Executor Class
// =============================================================================

/**
 * Parallel Executor for running multiple agents concurrently
 */
export class ParallelExecutor {
  private readonly config: InternalExecutorConfig
  private readonly semaphore: Semaphore
  private readonly results: Map<string, TaskExecutionResult> = new Map()
  private readonly activeAgents: Map<string, Agent> = new Map()
  private startTime: number = 0
  private isStopped: boolean = false

  /**
   * Create a new parallel executor
   */
  constructor(config: ParallelExecutorConfig) {
    // Build internal config with required fields
    const internalConfig: InternalExecutorConfig = {
      maxParallel: config.maxParallel ?? DEFAULT_MAX_PARALLEL,
      cwd: config.cwd,
      sessionId: config.sessionId,
      dangerouslySkipPermissions: config.dangerouslySkipPermissions ?? false,
      timeout: config.timeout ?? DEFAULT_EXECUTION_TIMEOUT,
      stopOnError: config.stopOnError ?? false,
    }

    // Add optional maxTurns only if provided
    if (config.maxTurns !== undefined) {
      internalConfig.maxTurns = config.maxTurns
    }

    this.config = internalConfig
    this.semaphore = new Semaphore(this.config.maxParallel)
  }

  // -------------------------------------------------------------------------
  // Public Properties
  // -------------------------------------------------------------------------

  /**
   * Get current configuration
   */
  get configValue(): ParallelExecutorConfig {
    return { ...this.config }
  }

  /**
   * Get available permits (can start this many more agents)
   */
  get availablePermits(): number {
    return this.semaphore.available
  }

  /**
   * Get number of currently running agents
   */
  get runningCount(): number {
    return this.activeAgents.size
  }

  /**
   * Get all results collected so far
   */
  get resultsCollected(): TaskExecutionResult[] {
    return Array.from(this.results.values())
  }

  // -------------------------------------------------------------------------
  // Task Grouping
  // -------------------------------------------------------------------------

  /**
   * Group tasks by their dependency level
   * Tasks in the same group have no dependencies on each other
   */
  groupTasksByDependency(tasks: AgentTask[]): IndependentTaskGroup[] {
    const groups: IndependentTaskGroup[] = []
    const processed = new Set<string>()

    // Helper to check if a task can be in the current group
    const canBeInGroup = (task: AgentTask, currentGroup: AgentTask[]): boolean => {
      // Check if already processed
      if (processed.has(task.id)) {
        return false
      }

      // Check if all dependencies are processed
      for (const depId of task.dependencies) {
        if (!processed.has(depId)) {
          return false
        }
      }

      // Check if current group tasks depend on this task
      for (const groupTask of currentGroup) {
        if (groupTask.dependencies.includes(task.id)) {
          return false
        }
        if (task.dependencies.includes(groupTask.id)) {
          return false
        }
      }

      return true
    }

    // Build groups iteratively
    let currentGroup: AgentTask[] = []

    for (const task of tasks) {
      if (processed.has(task.id)) {
        continue
      }

      if (canBeInGroup(task, currentGroup)) {
        currentGroup.push(task)
        processed.add(task.id)
      } else if (currentGroup.length > 0) {
        // Current group is complete, start a new one
        groups.push({
          tasks: currentGroup,
          isIndependent: currentGroup.length > 1,
        })
        currentGroup = []

        // Re-check this task for the next group
        if (canBeInGroup(task, [])) {
          currentGroup.push(task)
          processed.add(task.id)
        }
      }
    }

    // Don't forget the last group
    if (currentGroup.length > 0) {
      groups.push({
        tasks: currentGroup,
        isIndependent: currentGroup.length > 1,
      })
    }

    // Handle any remaining unprocessed tasks (circular deps or edge cases)
    for (const task of tasks) {
      if (!processed.has(task.id)) {
        groups.push({
          tasks: [task],
          isIndependent: false,
          dependencies: task.dependencies,
        })
      }
    }

    return groups
  }

  /**
   * Check if tasks are independent (no shared dependencies)
   */
  areTasksIndependent(tasks: AgentTask[]): boolean {
    if (tasks.length <= 1) {
      return true
    }

    // Build a set of all task IDs
    const taskIds = new Set(tasks.map((t) => t.id))

    // Check each task's dependencies
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        // If dependency is in the same set, they're not independent
        if (taskIds.has(depId)) {
          return false
        }
      }
    }

    return true
  }

  // -------------------------------------------------------------------------
  // Single Task Execution
  // -------------------------------------------------------------------------

  /**
   * Execute a single task
   */
  async executeTask(task: AgentTask, prompt: string): Promise<TaskExecutionResult> {
    const startTime = Date.now()

    // Build spawn options
    const spawnOptions: AgentSpawnOptions = {
      agentType: task.assignedAgentType ?? 'implementer',
      sessionId: this.config.sessionId,
      cwd: this.config.cwd,
      prompt,
      dangerouslySkipPermissions: this.config.dangerouslySkipPermissions,
      timeout: this.config.timeout,
    }

    // Add maxTurns only if defined
    if (this.config.maxTurns !== undefined) {
      spawnOptions.maxTurns = this.config.maxTurns
    }

    // Execute with semaphore
    return this.semaphore.execute(async () => {
      if (this.isStopped) {
        return {
          taskId: task.id,
          success: false,
          error: 'Execution stopped',
          duration: Date.now() - startTime,
        }
      }

      try {
        // Spawn agent
        const agent = await spawnAgent(spawnOptions)
        this.activeAgents.set(task.id, agent)

        // Wait for agent completion
        const result = await this.waitForAgent(agent.id)

        // Store result
        const executionResult: TaskExecutionResult = {
          taskId: task.id,
          success: result.success,
          agent,
          ...(result.error !== undefined ? { error: result.error } : {}),
          duration: Date.now() - startTime,
        }

        this.results.set(task.id, executionResult)
        this.activeAgents.delete(task.id)

        return executionResult
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const executionResult: TaskExecutionResult = {
          taskId: task.id,
          success: false,
          error: errorMessage,
          duration: Date.now() - startTime,
        }

        this.results.set(task.id, executionResult)
        this.activeAgents.delete(task.id)

        return executionResult
      }
    })
  }

  /**
   * Wait for an agent to complete
   */
  private waitForAgent(agentId: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const agent = this.activeAgents.values().next().value as Agent | undefined

      // Check if agent already completed
      if (!agent || agent.status === 'completed') {
        resolve({ success: true })
        return
      }

      if (agent?.status === 'error') {
        resolve({ success: false, ...(agent.errorMessage !== undefined ? { error: agent.errorMessage } : {}) })
        return
      }

      // Set up event listener
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
  // Batch Execution
  // -------------------------------------------------------------------------

  /**
   * Execute multiple tasks in parallel (with concurrency limit)
   */
  async executeParallel(
    taskPromptPairs: Array<{ task: AgentTask; prompt: string }>
  ): Promise<ParallelExecutionResult> {
    this.startTime = Date.now()
    this.isStopped = false

    // Create execution promises for all tasks
    const promises = taskPromptPairs.map(({ task, prompt }) =>
      this.executeTask(task, prompt).catch((error) => ({
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - this.startTime,
      }))
    )

    // Wait for all to complete (or fail fast if stopOnError)
    let results: TaskExecutionResult[]

    if (this.config.stopOnError) {
      results = await this.stopOnErrorExecute(promises)
    } else {
      results = await Promise.all(promises)
    }

    // Calculate summary
    const successfulTasks = results.filter((r) => r.success).length
    const failedTasks = results.filter((r) => !r.success).length

    return {
      results,
      totalTasks: results.length,
      successfulTasks,
      failedTasks,
      allSuccess: failedTasks === 0,
      totalDuration: Date.now() - this.startTime,
    }
  }

  /**
   * Execute with stop-on-error behavior
   */
  private async stopOnErrorExecute(
    promises: Promise<TaskExecutionResult>[]
  ): Promise<TaskExecutionResult[]> {
    const results: TaskExecutionResult[] = []

    // Create a wrapper that checks for errors
    const wrappedPromises = promises.map((p) =>
      p.then((result) => {
        results.push(result)
        if (!result.success && this.config.stopOnError) {
          this.stop()
        }
        return result
      })
    )

    await Promise.all(wrappedPromises)
    return results
  }

  /**
   * Execute tasks from a task queue in parallel groups
   * Automatically groups independent tasks and executes them together
   */
  async executeFromQueue(queue: TaskQueue, promptBuilder: (task: AgentTask) => string): Promise<ParallelExecutionResult> {
    this.startTime = Date.now()
    this.isStopped = false

    const allResults: TaskExecutionResult[] = []

    // Get all pending tasks
    const pendingTasks = queue.pendingTasks

    // Group by dependency level
    const groups = this.groupTasksByDependency(pendingTasks)

    // Execute each group sequentially, but tasks within group in parallel
    for (const group of groups) {
      if (this.isStopped) {
        break
      }

      // Skip if group has no tasks
      if (group.tasks.length === 0) {
        continue
      }

      // Mark tasks as running
      for (const task of group.tasks) {
        queue.update(task.id, { status: 'running' })
      }

      // Prepare task-prompt pairs
      const pairs = group.tasks.map((task) => ({
        task,
        prompt: promptBuilder(task),
      }))

      // Execute group
      const groupResult = await this.executeParallel(pairs)
      allResults.push(...groupResult.results)

      // Update queue with results
      for (const result of groupResult.results) {
        const task = queue.get(result.taskId)
        if (task) {
          const updateOptions: { status: 'completed' | 'failed'; error?: string; output?: { agentId: string } } = {
            status: result.success ? 'completed' : 'failed',
          }
          if (result.error !== undefined) {
            updateOptions.error = result.error
          }
          if (result.agent !== undefined) {
            updateOptions.output = { agentId: result.agent.id }
          }
          queue.update(result.taskId, updateOptions)
        }
      }

      // If stopOnError and any failed, stop processing
      if (this.config.stopOnError && !groupResult.allSuccess) {
        break
      }
    }

    // Calculate final summary
    const successfulTasks = allResults.filter((r) => r.success).length
    const failedTasks = allResults.filter((r) => !r.success).length

    return {
      results: allResults,
      totalTasks: allResults.length,
      successfulTasks,
      failedTasks,
      allSuccess: failedTasks === 0,
      totalDuration: Date.now() - this.startTime,
    }
  }

  // -------------------------------------------------------------------------
  // Control
  // -------------------------------------------------------------------------

  /**
   * Stop all execution
   */
  stop(): void {
    this.isStopped = true

    // Stop all active agents
    for (const [, agent] of this.activeAgents) {
      if (agent.status === 'running' || agent.status === 'starting') {
        // Import stopAgent function to avoid circular dependency
        import('./agent-runner.js').then(({ stopAgent }) => {
          stopAgent(agent.id)
        })
      }
    }
  }

  /**
   * Clear results
   */
  clear(): void {
    this.results.clear()
    this.activeAgents.clear()
    this.isStopped = false
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a parallel executor from a task queue
 */
export function createParallelExecutor(
  queue: TaskQueue,
  config: ParallelExecutorConfig
): ParallelExecutor {
  const maxParallel = config.maxParallel ?? queue.maxParallel
  return new ParallelExecutor({
    ...config,
    maxParallel,
  })
}

/**
 * Execute independent tasks from a queue in parallel
 * Automatically detects and groups independent tasks
 */
export async function executeIndependentTasks(
  queue: TaskQueue,
  promptBuilder: (task: AgentTask) => string,
  config: ParallelExecutorConfig
): Promise<ParallelExecutionResult> {
  const executor = new ParallelExecutor({
    ...config,
    maxParallel: config.maxParallel ?? queue.maxParallel,
  })

  return executor.executeFromQueue(queue, promptBuilder)
}

/**
 * Quick check if tasks can run in parallel
 */
export function canRunInParallel(tasks: AgentTask[]): boolean {
  if (tasks.length <= 1) {
    return false
  }

  const taskIds = new Set(tasks.map((t) => t.id))

  for (const task of tasks) {
    for (const depId of task.dependencies) {
      if (taskIds.has(depId)) {
        return false
      }
    }
  }

  return true
}

// =============================================================================
// Export Default
// =============================================================================

export default {
  ParallelExecutor,
  Semaphore,
  createParallelExecutor,
  executeIndependentTasks,
  canRunInParallel,
}
