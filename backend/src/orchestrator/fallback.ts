/**
 * CEO Fallback Handler
 * Orchestrator takes over when an agent fails multiple times
 * @module @task-filewas/backend/orchestrator/fallback
 */

import type {
  Agent,
  AgentType,
  AgentTask,
} from '@task-filewas/shared'
import {
  spawnAgent,
  getAgent,
  loadAgentConfig,
  type AgentSpawnOptions,
} from './agent-runner.js'
import {
  broadcastToSession,
  type WSMessage,
} from '../socket/index.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Fallback configuration
 */
export interface FallbackConfig {
  /** Number of failures before triggering CEO fallback */
  fallbackAfterFailures: number
  /** Whether CEO fallback is enabled */
  enabled: boolean
  /** Timeout for CEO agent (ms) */
  ceoTimeout?: number
  /** Maximum turns for CEO agent */
  ceoMaxTurns?: number
}

/**
 * Fallback context passed to CEO
 */
export interface FallbackContext {
  /** Failed task */
  task: AgentTask
  /** Original agent type that failed */
  originalAgentType: AgentType
  /** Agent instance that failed */
  failedAgent: Agent
  /** Error messages from failures */
  errors: string[]
  /** Number of retry attempts */
  retryCount: number
  /** Session ID */
  sessionId: string
  /** Working directory */
  cwd: string
}

/**
 * Fallback execution result
 */
export interface FallbackResult {
  /** Whether fallback was successful */
  success: boolean
  /** CEO agent ID (if spawned) */
  ceoAgentId?: string | undefined
  /** CEO agent output */
  output?: string | undefined
  /** Error message if fallback failed */
  error?: string | undefined
  /** Duration in milliseconds */
  duration: number
}

/**
 * Fallback decision
 */
export interface FallbackDecision {
  /** Should trigger fallback */
  shouldFallback: boolean
  /** Reason for decision */
  reason: string
  /** Number of failures */
  failureCount: number
  /** Threshold reached */
  thresholdReached: boolean
}

// =============================================================================
// Constants
// =============================================================================

/** Default fallback configuration */
const DEFAULT_CONFIG: FallbackConfig = {
  fallbackAfterFailures: 2,
  enabled: true,
  ceoTimeout: 300000, // 5 minutes
  ceoMaxTurns: 10,
}

/** Orchestrator agent type (CEO) */
const ORCHESTRATOR_TYPE: AgentType = 'orchestrator'

// =============================================================================
// Fallback Handler Class
// =============================================================================

/**
 * Handles CEO fallback when agents fail repeatedly
 */
export class FallbackHandler {
  private _sessionId: string
  private _config: FallbackConfig
  private _failureHistory: Map<string, string[]> // taskId -> errors

  /**
   * Create a new FallbackHandler
   */
  constructor(sessionId: string, config: Partial<FallbackConfig> = {}) {
    this._sessionId = sessionId
    this._config = { ...DEFAULT_CONFIG, ...config }
    this._failureHistory = new Map()
  }

  // -------------------------------------------------------------------------
  // Public Properties
  // -------------------------------------------------------------------------

  /** Get session ID */
  get sessionId(): string {
    return this._sessionId
  }

  /** Get config */
  get config(): FallbackConfig {
    return { ...this._config }
  }

  /** Update config */
  set config(config: Partial<FallbackConfig>) {
    this._config = { ...this._config, ...config }
  }

  // -------------------------------------------------------------------------
  // Fallback Decision
  // -------------------------------------------------------------------------

  /**
   * Decide whether to trigger CEO fallback
   */
  async shouldTriggerFallback(
    task: AgentTask,
    _agent: Agent,
    error: string
  ): Promise<FallbackDecision> {
    if (!this._config.enabled) {
      return {
        shouldFallback: false,
        reason: 'CEO fallback is disabled',
        failureCount: task.retries,
        thresholdReached: false,
      }
    }

    const failureCount = task.retries + 1
    const threshold = this._config.fallbackAfterFailures
    const thresholdReached = failureCount >= threshold

    // Record this failure
    this.recordFailure(task.id, error)

    // Check if task has exceeded max retries
    const maxRetriesReached = failureCount >= task.maxRetries

    if (thresholdReached || maxRetriesReached) {
      return {
        shouldFallback: true,
        reason: maxRetriesReached
          ? `Task exceeded max retries (${task.maxRetries})`
          : `Task failed ${failureCount} times (threshold: ${threshold})`,
        failureCount,
        thresholdReached: true,
      }
    }

    return {
      shouldFallback: false,
      reason: `Task has only failed ${failureCount} times (threshold: ${threshold})`,
      failureCount,
      thresholdReached: false,
    }
  }

  /**
   * Record a failure for a task
   */
  private recordFailure(taskId: string, error: string): void {
    const errors = this._failureHistory.get(taskId) || []
    errors.push(error)
    this._failureHistory.set(taskId, errors)
  }

  /**
   * Get failure history for a task
   */
  getFailureHistory(taskId: string): string[] {
    return this._failureHistory.get(taskId) || []
  }

  /**
   * Clear failure history for a task
   */
  clearFailureHistory(taskId: string): void {
    this._failureHistory.delete(taskId)
  }

  // -------------------------------------------------------------------------
  // Fallback Execution
  // -------------------------------------------------------------------------

  /**
   * Execute CEO fallback for a failed task
   */
  async executeFallback(context: FallbackContext): Promise<FallbackResult> {
    const startTime = Date.now()

    try {
      // Broadcast fallback start
      this.broadcastFallbackStart(context)

      // Load orchestrator config
      const orchestratorConfig = await loadAgentConfig(ORCHESTRATOR_TYPE)
      if (!orchestratorConfig) {
        throw new Error('Orchestrator agent configuration not found')
      }

      // Build fallback prompt for CEO
      const prompt = await this.buildFallbackPrompt(context)

      // Spawn CEO agent
      const spawnOptions: AgentSpawnOptions = {
        agentType: ORCHESTRATOR_TYPE,
        sessionId: context.sessionId,
        cwd: context.cwd,
        prompt,
        dangerouslySkipPermissions: true, // CEO needs full autonomy
        parentAgentId: context.failedAgent.id,
      }

      // Add optional properties only if defined
      if (this._config.ceoMaxTurns !== undefined) {
        spawnOptions.maxTurns = this._config.ceoMaxTurns
      }
      if (this._config.ceoTimeout !== undefined) {
        spawnOptions.timeout = this._config.ceoTimeout
      }

      const ceoAgent = await spawnAgent(spawnOptions)

      // Broadcast CEO spawned
      this.broadcastCeoSpawned(ceoAgent, context)

      // Wait for CEO to complete (with timeout)
      const result = await this.waitForCompletion(ceoAgent.id, this._config.ceoTimeout || 300000)

      const duration = Date.now() - startTime

      if (result.success) {
        this.broadcastFallbackSuccess(ceoAgent.id, context, duration)
      } else {
        this.broadcastFallbackFailed(ceoAgent.id, context, result.error || 'Unknown error', duration)
      }

      return {
        success: result.success,
        ceoAgentId: ceoAgent.id,
        output: result.output,
        error: result.error,
        duration,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      this.broadcastFallbackFailed('unknown', context, errorMessage, duration)

      return {
        success: false,
        error: errorMessage,
        duration,
      }
    }
  }

  /**
   * Build prompt for CEO fallback
   */
  private async buildFallbackPrompt(context: FallbackContext): Promise<string> {
    const { task, originalAgentType, failedAgent, errors, retryCount } = context

    // Build prompt sections
    const sections: string[] = []

    // Header
    sections.push('# CEO Fallback: Task Recovery Required')
    sections.push('')
    sections.push('A task has failed multiple times and requires your intervention.')
    sections.push('')

    // Task Information
    sections.push('## Failed Task')
    sections.push(`**ID:** ${task.id}`)
    sections.push(`**Type:** ${task.type}`)
    sections.push(`**Title:** ${task.title}`)
    sections.push(`**Description:** ${task.description}`)
    sections.push(`**Priority:** ${task.priority}`)
    sections.push('')

    // Failure Information
    sections.push('## Failure Details')
    sections.push(`**Original Agent:** ${originalAgentType}`)
    sections.push(`**Agent Model:** ${failedAgent.model}`)
    sections.push(`**Retry Count:** ${retryCount}/${task.maxRetries}`)
    sections.push('')

    // Error History
    sections.push('### Error Messages')
    errors.forEach((error, index) => {
      sections.push(`${index + 1}. ${error}`)
    })
    sections.push('')

    // Instructions
    sections.push('## Your Task')
    sections.push('')
    sections.push('As the Orchestrator (CEO), you need to:')
    sections.push('')
    sections.push('1. **Analyze the failure** - Understand why the original agent failed')
    sections.push('2. **Identify the root cause** - Determine what went wrong')
    sections.push('3. **Formulate a recovery plan** - Decide how to fix this')
    sections.push('4. **Execute the fix** - Use available tools to resolve the issue')
    sections.push('')
    sections.push('### Recovery Options')
    sections.push('')
    sections.push('- **Retry with different approach** - Modify the task execution strategy')
    sections.push('- **Delegate to another agent** - Assign to a more suitable agent type')
    sections.push('- **Break down the task** - Split into smaller, manageable sub-tasks')
    sections.push('- **Fix environmental issues** - Resolve configuration, dependency, or resource problems')
    sections.push('- **Escalate to user** - If truly blocked, explain what user intervention is needed')
    sections.push('')
    sections.push('### Important Notes')
    sections.push('')
    sections.push('- You have access to all tools available to the original agent')
    sections.push('- The original task input is available in the task data')
    sections.push('- Focus on completing the original task goal, not just analyzing')
    sections.push('- If you successfully complete the task, mark it as done')
    sections.push('- If the task is genuinely impossible, explain why clearly')
    sections.push('')

    // Task Input (if available)
    if (task.input && Object.keys(task.input).length > 0) {
      sections.push('## Original Task Input')
      sections.push('```json')
      sections.push(JSON.stringify(task.input, null, 2))
      sections.push('```')
      sections.push('')
    }

    return sections.join('\n')
  }

  /**
   * Wait for agent completion with timeout
   */
  private waitForCompletion(
    agentId: string,
    timeout: number
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      const timeoutHandle = setTimeout(() => {
        // Timeout exceeded
        cleanup()
        resolve({
          success: false,
          error: `CEO agent timeout after ${timeout}ms`,
        })
      }, timeout)

      const checkInterval = setInterval(() => {
        const agent = getAgent(agentId)

        if (!agent) {
          // Agent was removed (shouldn't happen)
          cleanup()
          resolve({
            success: false,
            error: 'Agent disappeared',
          })
          return
        }

        if (agent.status === 'completed') {
          cleanup()
          resolve({
            success: true,
            output: agent.currentAction || 'Task completed',
          })
        } else if (agent.status === 'error') {
          cleanup()
          resolve({
            success: false,
            error: agent.errorMessage || 'Agent failed',
          })
        }
      }, 500)

      function cleanup() {
        clearTimeout(timeoutHandle)
        clearInterval(checkInterval)
      }
    })
  }

  // -------------------------------------------------------------------------
  // WebSocket Broadcasting
  // -------------------------------------------------------------------------

  /**
   * Broadcast fallback start event
   */
  private broadcastFallbackStart(context: FallbackContext): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'fallback:started',
      payload: {
        sessionId: this._sessionId,
        taskId: context.task.id,
        originalAgentType: context.originalAgentType,
        failedAgentId: context.failedAgent.id,
        retryCount: context.retryCount,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast CEO spawned event
   */
  private broadcastCeoSpawned(ceoAgent: Agent, context: FallbackContext): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'fallback:ceo_spawned',
      payload: {
        sessionId: this._sessionId,
        taskId: context.task.id,
        ceoAgentId: ceoAgent.id,
        ceoAgentName: ceoAgent.name,
        model: ceoAgent.model,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast fallback success event
   */
  private broadcastFallbackSuccess(ceoAgentId: string, context: FallbackContext, duration: number): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'fallback:success',
      payload: {
        sessionId: this._sessionId,
        taskId: context.task.id,
        ceoAgentId,
        duration,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  /**
   * Broadcast fallback failed event
   */
  private broadcastFallbackFailed(
    ceoAgentId: string,
    context: FallbackContext,
    error: string,
    duration: number
  ): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'fallback:failed',
      payload: {
        sessionId: this._sessionId,
        taskId: context.task.id,
        ceoAgentId,
        error,
        duration,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._sessionId, wsMessage)
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  /**
   * Clear all failure history
   */
  clearAllHistory(): void {
    this._failureHistory.clear()
  }

  /**
   * Get statistics about fallback decisions
   */
  getStats(): {
    totalFailures: number
    tasksWithFailures: number
    config: FallbackConfig
  } {
    let totalFailures = 0
    for (const errors of this._failureHistory.values()) {
      totalFailures += errors.length
    }

    return {
      totalFailures,
      tasksWithFailures: this._failureHistory.size,
      config: this._config,
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new FallbackHandler for a session
 */
export function createFallbackHandler(
  sessionId: string,
  config?: Partial<FallbackConfig>
): FallbackHandler {
  return new FallbackHandler(sessionId, config)
}

/**
 * Global fallback handlers per session
 */
const globalFallbackHandlers = new Map<string, FallbackHandler>()

/**
 * Get or create fallback handler for a session
 */
export function getFallbackHandler(
  sessionId: string,
  config?: Partial<FallbackConfig>
): FallbackHandler {
  let handler = globalFallbackHandlers.get(sessionId)

  if (!handler) {
    handler = new FallbackHandler(sessionId, config)
    globalFallbackHandlers.set(sessionId, handler)
  } else if (config) {
    // Update config if provided
    handler.config = config
  }

  return handler
}

/**
 * Remove fallback handler for a session
 */
export function removeFallbackHandler(sessionId: string): boolean {
  return globalFallbackHandlers.delete(sessionId)
}

/**
 * Clear all fallback handlers
 */
export function clearAllFallbackHandlers(): void {
  globalFallbackHandlers.clear()
}

// =============================================================================
// Export Default
// =============================================================================

export default {
  FallbackHandler,
  createFallbackHandler,
  getFallbackHandler,
  removeFallbackHandler,
  clearAllFallbackHandlers,
}
