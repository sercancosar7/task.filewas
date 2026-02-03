/**
 * useAgentStatus Hook
 * React hook for managing agent status via WebSocket
 * @module @task-filewas/frontend/hooks/useAgentStatus
 *
 * Features:
 * - Track agent status updates via WebSocket
 * - Manage multiple agents state
 * - Handle agent lifecycle events (started, progress, completed, error)
 * - Auto-cleanup on unmount
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSocket } from './useSocket'
import type { SessionAgent, SessionPhaseProgress } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

/**
 * WebSocket event types for agent status
 */
export type AgentStatusEvent =
  | { type: 'agent:started'; data: AgentStartedData }
  | { type: 'agent:progress'; data: AgentProgressData }
  | { type: 'agent:completed'; data: AgentCompletedData }
  | { type: 'agent:error'; data: AgentErrorData }

/**
 * Agent started event data
 */
export interface AgentStartedData {
  /** Agent ID */
  agentId: string
  /** Agent type (planner, implementer, etc.) */
  type: string
  /** Model being used */
  model: string
  /** Start timestamp */
  startedAt: string
}

/**
 * Agent progress event data
 */
export interface AgentProgressData {
  /** Agent ID */
  agentId: string
  /** Progress percentage (0-100) */
  progress: number
  /** Current status/action description */
  status: string
  /** Optional additional data */
  data?: Record<string, unknown>
}

/**
 * Agent completed event data
 */
export interface AgentCompletedData {
  /** Agent ID */
  agentId: string
  /** Result data */
  result?: {
    /** Success flag */
    success: boolean
    /** Output data */
    output?: unknown
    /** Error message if failed */
    error?: string
  }
  /** Completion timestamp */
  completedAt: string
  /** Duration in milliseconds */
  duration: number
}

/**
 * Agent error event data
 */
export interface AgentErrorData {
  /** Agent ID */
  agentId: string
  /** Error message */
  error: string
  /** Error code if available */
  code?: string
  /** Timestamp */
  timestamp: string
}

/**
 * useAgentStatus hook options
 */
export interface UseAgentStatusOptions {
  /** Session ID to track agents for */
  sessionId?: string
  /** Callback when agent status changes */
  onAgentChange?: (agents: SessionAgent[]) => void
  /** Callback when agent completes */
  onAgentComplete?: (agentId: string, result: AgentCompletedData['result']) => void
  /** Callback when agent errors */
  onAgentError?: (agentId: string, error: string) => void
}

/**
 * useAgentStatus hook return type
 */
export interface UseAgentStatusReturn {
  /** Current list of agents */
  agents: SessionAgent[]
  /** Currently running agent (if any) */
  runningAgent: SessionAgent | undefined
  /** Whether any agent is currently running */
  isRunning: boolean
  /** Overall progress percentage (0-100) */
  overallProgress: number
  /** Phase progress information */
  phaseProgress: SessionPhaseProgress | undefined
  /** Get agent by ID */
  getAgent: (agentId: string) => SessionAgent | undefined
  /** Get agents by type */
  getAgentsByType: (type: string) => SessionAgent[]
  /** Clear all agents */
  clearAgents: () => void
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert agent event data to SessionAgent
 */
function toSessionAgent(
  data: AgentStartedData,
  status: SessionAgent['status'] = 'pending'
): SessionAgent {
  return {
    id: data.agentId,
    type: data.type,
    model: data.model as SessionAgent['model'],
    status,
    startedAt: data.startedAt,
  }
}

/**
 * Update agent in list
 */
function updateAgentInList(
  agents: SessionAgent[],
  agentId: string,
  updates: Partial<SessionAgent>
): SessionAgent[] {
  return agents.map((agent) =>
    agent.id === agentId ? { ...agent, ...updates } : agent
  )
}

/**
 * Calculate overall progress from multiple agents
 */
function calculateOverallProgress(agents: SessionAgent[]): number {
  if (agents.length === 0) return 0

  const completedCount = agents.filter((a) => a.status === 'completed').length
  return Math.round((completedCount / agents.length) * 100)
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useAgentStatus - Track agent execution status via WebSocket
 *
 * @example
 * ```tsx
 * function AgentMonitor({ sessionId }) {
 *   const { agents, runningAgent, isRunning, overallProgress } = useAgentStatus({
 *     sessionId,
 *     onAgentComplete: (id, result) => {
 *       console.log(`Agent ${id} completed:`, result)
 *     },
 *   })
 *
 *   return (
 *     <div>
 *       <h3>Agent Progress: {overallProgress}%</h3>
 *       {runningAgent && <AgentStatusCard agent={runningAgent} />}
 *     </div>
 *   )
 * }
 * ```
 */
export function useAgentStatus({
  sessionId,
  onAgentChange,
  onAgentComplete,
  onAgentError,
}: UseAgentStatusOptions = {}): UseAgentStatusReturn {
  const { isConnected } = useSocket({
    autoConnect: true,
  })

  // State
  const [agents, setAgents] = useState<SessionAgent[]>([])
  const [phaseProgress, setPhaseProgress] = useState<SessionPhaseProgress | undefined>()

  // Refs for callbacks to avoid stale closures
  const onAgentChangeRef = useRef(onAgentChange)
  const onAgentCompleteRef = useRef(onAgentComplete)
  const onAgentErrorRef = useRef(onAgentError)

  // Update refs when callbacks change
  useEffect(() => {
    onAgentChangeRef.current = onAgentChange
  }, [onAgentChange])

  useEffect(() => {
    onAgentCompleteRef.current = onAgentComplete
  }, [onAgentComplete])

  useEffect(() => {
    onAgentErrorRef.current = onAgentError
  }, [onAgentError])

  // Clear agents function
  const clearAgents = useCallback(() => {
    setAgents([])
  }, [])

  // Get agent by ID
  const getAgent = useCallback(
    (agentId: string): SessionAgent | undefined => {
      return agents.find((a) => a.id === agentId)
    },
    [agents]
  )

  // Get agents by type
  const getAgentsByType = useCallback(
    (type: string): SessionAgent[] => {
      return agents.filter((a) => a.type === type)
    },
    [agents]
  )

  // Handle agent started event
  const handleAgentStarted = useCallback((data: AgentStartedData) => {
    setAgents((prev) => {
      // Check if agent already exists
      const existing = prev.find((a) => a.id === data.agentId)
      if (existing) {
        return updateAgentInList(prev, data.agentId, { status: 'running' })
      }

      // Add new agent
      const newAgent = toSessionAgent(data, 'running')
      return [...prev, newAgent]
    })
  }, [])

  // Handle agent progress event
  const handleAgentProgress = useCallback((data: AgentProgressData) => {
    setAgents((prev) =>
      updateAgentInList(prev, data.agentId, {
        status: 'running',
      })
    )
  }, [])

  // Handle agent completed event
  const handleAgentCompleted = useCallback((data: AgentCompletedData) => {
    setAgents((prev) =>
      updateAgentInList(prev, data.agentId, {
        status: 'completed',
        completedAt: data.completedAt,
        duration: data.duration,
      })
    )

    // Trigger callback
    if (onAgentCompleteRef.current) {
      onAgentCompleteRef.current(data.agentId, data.result)
    }
  }, [])

  // Handle agent error event
  const handleAgentError = useCallback((data: AgentErrorData) => {
    setAgents((prev) =>
      updateAgentInList(prev, data.agentId, {
        status: 'error',
        errorMessage: data.error,
      })
    )

    // Trigger callback
    if (onAgentErrorRef.current) {
      onAgentErrorRef.current(data.agentId, data.error)
    }
  }, [])

  // Setup WebSocket listeners
  useEffect(() => {
    if (!isConnected || !sessionId) return

    // Import socket utilities
    let unsubscribe: (() => void) | undefined

    const setupListeners = async () => {
      const { onMessage } = await import('@/lib/socket')

      unsubscribe = onMessage((message) => {
        // Handle agent status events via event/payload structure
        if (message.type === 'status' && message.event) {
          const data = message.payload as Record<string, unknown>

          switch (message.event) {
            case 'agent:started':
              handleAgentStarted(data as unknown as AgentStartedData)
              break
            case 'agent:progress':
              handleAgentProgress(data as unknown as AgentProgressData)
              break
            case 'agent:completed':
              handleAgentCompleted(data as unknown as AgentCompletedData)
              break
            case 'agent:error':
              handleAgentError(data as unknown as AgentErrorData)
              break
            case 'phase_progress':
              setPhaseProgress(data as unknown as SessionPhaseProgress)
              break
          }
        }
      })
    }

    setupListeners()

    return () => {
      unsubscribe?.()
    }
  }, [isConnected, sessionId, handleAgentStarted, handleAgentProgress, handleAgentCompleted, handleAgentError])

  // Notify on agent change
  useEffect(() => {
    if (onAgentChangeRef.current) {
      onAgentChangeRef.current(agents)
    }
  }, [agents])

  // Derived values
  const runningAgent = agents.find((a) => a.status === 'running')
  const isRunning = agents.some((a) => a.status === 'running')
  const overallProgress = calculateOverallProgress(agents)

  return {
    agents,
    runningAgent,
    isRunning,
    overallProgress,
    phaseProgress,
    getAgent,
    getAgentsByType,
    clearAgents,
  }
}

export default useAgentStatus
