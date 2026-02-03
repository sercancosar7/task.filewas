/**
 * Hooks exports
 * @module @task-filewas/frontend/hooks
 */

export {
  useResizable,
  type UseResizableOptions,
  type UseResizableReturn,
  type ResizeConstraints,
  type ResizeDirection,
} from './useResizable'

export {
  useSocket,
  type UseSocketOptions,
  type UseSocketReturn,
  type SocketStatus,
  type WSMessage,
  type SocketOptions,
} from './useSocket'

export {
  useSocketEvent,
  useSocketStatus,
  useSocketOutput,
  useSocketError,
  useSessionEvents,
  type EventFilterOptions,
  type SessionEventCallbacks,
} from './useSocketEvent'

export {
  useSessions,
  type UseSessionsOptions,
  type UseSessionsReturn,
} from './useSessions'

export {
  useProjects,
  type UseProjectsOptions,
  type UseProjectsReturn,
  type ProjectFilter,
  type ProjectSort,
} from './useProjects'

export {
  useAgentStatus,
  type UseAgentStatusOptions,
  type UseAgentStatusReturn,
  type AgentStatusEvent,
  type AgentStartedData,
  type AgentProgressData,
  type AgentCompletedData,
  type AgentErrorData,
} from './useAgentStatus'

export {
  useToast,
  toast,
  type ToastAPI,
  type ToastOptions,
  type ToastVariant,
} from './useToast'
