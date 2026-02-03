/**
 * Task Queue Service
 * Manages task scheduling with priority and dependency resolution
 * @module @task-filewas/backend/orchestrator/task-queue
 */

import { randomUUID } from 'node:crypto'
import type {
  AgentTask,
  AgentType,
  TaskPriority,
  TaskType,
  TaskQueue as TaskQueueState,
} from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

/**
 * Task creation options
 */
export interface TaskCreateOptions {
  /** Task type */
  type: TaskType
  /** Task title */
  title: string
  /** Task description */
  description?: string
  /** Task priority (default: 'normal') */
  priority?: TaskPriority
  /** IDs of tasks this depends on */
  dependencies?: string[]
  /** Assigned agent type */
  assignedAgentType?: AgentType
  /** Maximum retries (default: 3) */
  maxRetries?: number
  /** Task input data */
  input?: Record<string, unknown>
}

/**
 * Next task result
 */
export interface NextTaskResult {
  /** The task to execute */
  task: AgentTask | null
  /** Reason if no task available */
  reason?:
    | 'queue_empty'      // No tasks in queue
    | 'all_completed'    // All tasks completed
    | 'all_failed'       // All tasks failed
    | 'blocked'          // Next task is blocked by dependencies
    | 'max_parallel'     // Max parallel tasks running
}

/**
 * Task update options
 */
export interface TaskUpdateOptions {
  /** Task status */
  status?: AgentTask['status']
  /** Agent ID assigned to task */
  assignedAgentId?: string
  /** Error message if failed */
  error?: string
  /** Task output/result */
  output?: Record<string, unknown>
  /** Increment retry count */
  incrementRetry?: boolean
}

// =============================================================================
// Constants
// =============================================================================]

/** Priority order (higher index = higher priority) */
const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
}

/** Default task retry limit */
const DEFAULT_MAX_RETRIES = 3

/** Default maximum parallel tasks */
const DEFAULT_MAX_PARALLEL = 3

// =============================================================================
// TaskQueue Class
// =============================================================================

/**
 * Task Queue for managing agent tasks with dependencies and priorities
 */
export class TaskQueue {
  private _sessionId: string
  private _tasks: Map<string, AgentTask>
  private _maxParallel: number
  private _status: TaskQueueState['status']
  private _createdAt: string
  private _updatedAt: string

  /**
   * Create a new TaskQueue
   */
  constructor(sessionId: string, maxParallel = DEFAULT_MAX_PARALLEL) {
    this._sessionId = sessionId
    this._tasks = new Map()
    this._maxParallel = maxParallel
    this._status = 'idle'
    this._createdAt = new Date().toISOString()
    this._updatedAt = new Date().toISOString()
  }

  // -------------------------------------------------------------------------
  // Public Properties
  // -------------------------------------------------------------------------

  /** Get session ID */
  get sessionId(): string {
    return this._sessionId
  }

  /** Get queue status */
  get status(): TaskQueueState['status'] {
    return this._status
  }

  /** Set queue status */
  set status(value: TaskQueueState['status']) {
    this._status = value
    this._updatedAt = new Date().toISOString()
  }

  /** Get max parallel tasks */
  get maxParallel(): number {
    return this._maxParallel
  }

  /** Set max parallel tasks */
  set maxParallel(value: number) {
    this._maxParallel = Math.max(1, value)
    this._updatedAt = new Date().toISOString()
  }

  /** Get all tasks */
  get tasks(): AgentTask[] {
    return Array.from(this._tasks.values())
  }

  /** Get running task IDs */
  get runningTasks(): string[] {
    return this.tasks
      .filter((t) => t.status === 'running')
      .map((t) => t.id)
  }

  /** Get pending task IDs */
  get pendingTasks(): AgentTask[] {
    return this.tasks.filter((t) => t.status === 'pending')
  }

  /** Get completed task IDs */
  get completedTasks(): AgentTask[] {
    return this.tasks.filter((t) => t.status === 'completed')
  }

  /** Get failed task IDs */
  get failedTasks(): AgentTask[] {
    return this.tasks.filter((t) => t.status === 'failed')
  }

  /** Get task count */
  get size(): number {
    return this._tasks.size
  }

  /** Get created timestamp */
  get createdAt(): string {
    return this._createdAt
  }

  /** Get updated timestamp */
  get updatedAt(): string {
    return this._updatedAt
  }

  // -------------------------------------------------------------------------
  // Task Management
  // -------------------------------------------------------------------------

  /**
   * Add a new task to the queue
   */
  add(options: TaskCreateOptions): AgentTask {
    const taskId = `task-${randomUUID()}`

    const now = new Date().toISOString()

    const task: AgentTask = {
      id: taskId,
      type: options.type,
      title: options.title,
      description: options.description ?? '',
      priority: options.priority ?? 'normal',
      dependencies: options.dependencies ?? [],
      status: 'pending',
      ...(options.assignedAgentType ? { assignedAgentType: options.assignedAgentType } : {}),
      retries: 0,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      createdAt: now,
      ...(options.input ? { input: options.input } : {}),
    }

    this._tasks.set(taskId, task)
    this._updatedAt = now

    return task
  }

  /**
   * Add multiple tasks to the queue
   */
  addMany(optionsList: TaskCreateOptions[]): AgentTask[] {
    return optionsList.map((opts) => this.add(opts))
  }

  /**
   * Get a task by ID
   */
  get(taskId: string): AgentTask | undefined {
    return this._tasks.get(taskId)
  }

  /**
   * Check if a task exists
   */
  has(taskId: string): boolean {
    return this._tasks.has(taskId)
  }

  /**
   * Update a task
   */
  update(taskId: string, options: TaskUpdateOptions): boolean {
    const task = this._tasks.get(taskId)
    if (!task) {
      return false
    }

    if (options.status !== undefined) {
      task.status = options.status

      // Update timestamps based on status
      const now = new Date().toISOString()
      if (options.status === 'running' && !task.startedAt) {
        task.startedAt = now
      } else if (
        options.status === 'completed' ||
        options.status === 'failed' ||
        options.status === 'skipped'
      ) {
        task.completedAt = now
      }
    }

    if (options.assignedAgentId !== undefined) {
      task.assignedAgentId = options.assignedAgentId
    }

    if (options.error !== undefined) {
      task.error = options.error
    }

    if (options.output !== undefined) {
      task.output = options.output
    }

    if (options.incrementRetry) {
      task.retries++
    }

    this._updatedAt = new Date().toISOString()
    return true
  }

  /**
   * Remove a task from the queue
   */
  delete(taskId: string): boolean {
    const deleted = this._tasks.delete(taskId)
    if (deleted) {
      this._updatedAt = new Date().toISOString()
    }
    return deleted
  }

  /**
   * Clear all tasks from the queue
   */
  clear(): void {
    this._tasks.clear()
    this._status = 'idle'
    this._updatedAt = new Date().toISOString()
  }

  // -------------------------------------------------------------------------
  // Priority Handling
  // -------------------------------------------------------------------------

  /**
   * Get priority value for sorting (higher = more important)
   */
  private getPriorityValue(priority: TaskPriority): number {
    return PRIORITY_ORDER[priority] ?? 0
  }

  /**
   * Sort tasks by priority (highest first)
   */
  sortByPriority(tasks: AgentTask[]): AgentTask[] {
    return [...tasks].sort((a, b) => {
      const priorityDiff = this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority)
      if (priorityDiff !== 0) {
        return priorityDiff
      }
      // If same priority, sort by creation time (earlier first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }

  /**
   * Get pending tasks sorted by priority
   */
  getPendingSortedByPriority(): AgentTask[] {
    return this.sortByPriority(this.pendingTasks)
  }

  // -------------------------------------------------------------------------
  // Dependency Graph
  // -------------------------------------------------------------------------

  /**
   * Check if a task's dependencies are all satisfied
   */
  areDependenciesSatisfied(taskId: string): boolean {
    const task = this._tasks.get(taskId)
    if (!task || task.dependencies.length === 0) {
      return true
    }

    // All dependencies must be completed
    return task.dependencies.every((depId) => {
      const dep = this._tasks.get(depId)
      return dep?.status === 'completed'
    })
  }

  /**
   * Get tasks that are blocking this task (incomplete dependencies)
   */
  getBlockingTasks(taskId: string): AgentTask[] {
    const task = this._tasks.get(taskId)
    if (!task || task.dependencies.length === 0) {
      return []
    }

    const blocking: AgentTask[] = []
    for (const depId of task.dependencies) {
      const dep = this._tasks.get(depId)
      if (dep && dep.status !== 'completed') {
        blocking.push(dep)
      }
    }

    return blocking
  }

  /**
   * Check if a task can be executed (pending + deps satisfied)
   */
  isExecutable(taskId: string): boolean {
    const task = this._tasks.get(taskId)
    if (!task) {
      return false
    }

    return task.status === 'pending' && this.areDependenciesSatisfied(taskId)
  }

  /**
   * Get executable tasks sorted by priority
   */
  getExecutableTasks(): AgentTask[] {
    return this.sortByPriority(
      this.pendingTasks.filter((t) => this.areDependenciesSatisfied(t.id))
    )
  }

  /**
   * Check for circular dependencies
   */
  hasCircularDependency(startTaskId: string, visited = new Set<string>()): boolean {
    if (visited.has(startTaskId)) {
      return true // Circular dependency detected
    }

    const task = this._tasks.get(startTaskId)
    if (!task) {
      return false
    }

    visited.add(startTaskId)

    for (const depId of task.dependencies) {
      if (this.hasCircularDependency(depId, new Set(visited))) {
        return true
      }
    }

    return false
  }

  /**
   * Check if the entire queue has any circular dependencies
   */
  hasAnyCircularDependencies(): boolean {
    for (const taskId of this._tasks.keys()) {
      if (this.hasCircularDependency(taskId)) {
        return true
      }
    }
    return false
  }

  /**
   * Get dependency tree for a task
   */
  getDependencyTree(taskId: string): DependencyNode {
    const task = this._tasks.get(taskId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    const node: DependencyNode = {
      task,
      dependencies: [],
    }

    for (const depId of task.dependencies) {
      node.dependencies.push(this.getDependencyTree(depId))
    }

    return node
  }

  // -------------------------------------------------------------------------
  // Queue Execution
  // -------------------------------------------------------------------------

  /**
   * Get the next task to execute
   */
  getNext(): NextTaskResult {
    // Check if we've hit the parallel limit
    if (this.runningTasks.length >= this._maxParallel) {
      return {
        task: null,
        reason: 'max_parallel',
      }
    }

    // Get executable tasks
    const executableTasks = this.getExecutableTasks()

    if (executableTasks.length === 0) {
      // No executable tasks - check why
      if (this.pendingTasks.length === 0) {
        // No pending tasks - check final state
        if (this.completedTasks.length > 0) {
          return {
            task: null,
            reason: 'all_completed',
          }
        } else if (this.failedTasks.length === this.size && this.size > 0) {
          return {
            task: null,
            reason: 'all_failed',
          }
        } else {
          return {
            task: null,
            reason: 'queue_empty',
          }
        }
      }

      // There are pending tasks but they're blocked
      return {
        task: null,
        reason: 'blocked',
      }
    }

    // Return the highest priority executable task
    const nextTask = executableTasks[0] ?? null
    return {
      task: nextTask,
    }
  }

  /**
   * Mark a task as running and return it
   */
  startNext(): AgentTask | null {
    const result = this.getNext()

    if (!result.task) {
      return null
    }

    // Mark as running
    this.update(result.task.id, { status: 'running' })
    this._status = 'running'

    return this.get(result.task.id) ?? null as AgentTask | null
  }

  /**
   * Get number of tasks by status
   */
  getStatusCounts(): Record<AgentTask['status'], number> {
    const counts: Record<AgentTask['status'], number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
    }

    for (const task of this._tasks.values()) {
      counts[task.status]++
    }

    return counts
  }

  /**
   * Check if all tasks are complete
   */
  isComplete(): boolean {
    if (this._tasks.size === 0) {
      return false
    }

    for (const task of this._tasks.values()) {
      if (task.status !== 'completed' && task.status !== 'skipped') {
        return false
      }
    }

    return true
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this._tasks.size === 0
  }

  // -------------------------------------------------------------------------
  // Serialization
  // -------------------------------------------------------------------------

  /**
   * Convert to state object (for storage/transmission)
   */
  toState(): TaskQueueState {
    return {
      sessionId: this._sessionId,
      tasks: this.tasks,
      runningTasks: this.runningTasks,
      maxParallel: this._maxParallel,
      status: this._status,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    }
  }

  /**
   * Create TaskQueue from state object
   */
  static fromState(state: TaskQueueState): TaskQueue {
    const queue = new TaskQueue(state.sessionId, state.maxParallel)

    // Restore tasks
    for (const task of state.tasks) {
      queue._tasks.set(task.id, task)
    }

    // Restore status
    queue._status = state.status
    queue._createdAt = state.createdAt
    queue._updatedAt = state.updatedAt

    return queue
  }

  /**
   * Serialize to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.toState())
  }

  /**
   * Create TaskQueue from JSON
   */
  static fromJSON(json: string): TaskQueue {
    const state = JSON.parse(json) as TaskQueueState
    return TaskQueue.fromState(state)
  }
}

// =============================================================================
// Additional Types
// =============================================================================

/**
 * Dependency tree node
 */
export interface DependencyNode {
  /** The task */
  task: AgentTask
  /** Tasks this depends on */
  dependencies: DependencyNode[]
}

/**
 * Queue statistics
 */
export interface QueueStats {
  /** Total tasks */
  total: number
  /** Status counts */
  byStatus: Record<AgentTask['status'], number>
  /** Type counts */
  byType: Record<TaskType, number>
  /** Priority counts */
  byPriority: Record<TaskPriority, number>
  /** Completion percentage */
  completionPercentage: number
  /** Tasks with unmet dependencies */
  blocked: number
  /** Tasks that can run now */
  ready: number
}

/**
 * Get statistics for a task queue
 */
export function getQueueStats(queue: TaskQueue): QueueStats {
  const tasks = queue.tasks
  const byStatus: Record<AgentTask['status'], number> = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
  }
  const byType: Record<string, number> = {}
  const byPriority: Record<string, number> = {}

  for (const task of tasks) {
    byStatus[task.status]++
    byType[task.type] = (byType[task.type] ?? 0) + 1
    byPriority[task.priority] = (byPriority[task.priority] ?? 0) + 1
  }

  const completed = byStatus.completed + byStatus.skipped
  const completionPercentage = tasks.length > 0
    ? Math.round((completed / tasks.length) * 100)
    : 0

  const blocked = tasks.filter(
    (t) => t.status === 'pending' && !queue.areDependenciesSatisfied(t.id)
  ).length

  const ready = tasks.filter(
    (t) => t.status === 'pending' && queue.areDependenciesSatisfied(t.id)
  ).length

  return {
    total: tasks.length,
    byStatus: byStatus as Record<AgentTask['status'], number>,
    byType: byType as Record<TaskType, number>,
    byPriority: byPriority as Record<TaskPriority, number>,
    completionPercentage,
    blocked,
    ready,
  }
}

// =============================================================================
// Export Default
// =============================================================================

export default {
  TaskQueue,
  getQueueStats,
}
