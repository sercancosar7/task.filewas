/**
 * useSocket Hook
 * React hook for managing WebSocket connection lifecycle
 * @module @task-filewas/frontend/hooks/useSocket
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  connect,
  disconnect,
  isConnected,
  getStatus,
  getClientId,
  onStatusChange,
  onMessage,
  emit,
  sendMessage,
  joinSession,
  leaveSession,
  joinProject,
  leaveProject,
  type SocketStatus,
  type WSMessage,
  type SocketOptions,
} from '../lib/socket'

// =============================================================================
// Types
// =============================================================================

/**
 * useSocket hook options
 */
export interface UseSocketOptions extends SocketOptions {
  /** Auto connect on mount (default: true) */
  autoConnect?: boolean
  /** Message handler callback */
  onMessage?: (message: WSMessage) => void
  /** Status change handler callback */
  onStatusChange?: (status: SocketStatus) => void
  /** Error handler callback */
  onError?: (error: Error) => void
}

/**
 * useSocket hook return type
 */
export interface UseSocketReturn {
  /** Current connection status */
  status: SocketStatus
  /** Whether socket is connected */
  isConnected: boolean
  /** Client ID assigned by server */
  clientId: string | null
  /** Last received message */
  lastMessage: WSMessage | null
  /** Connect to server */
  connect: () => void
  /** Disconnect from server */
  disconnect: () => void
  /** Emit an event to server */
  emit: (event: string, data?: unknown) => boolean
  /** Send a WSMessage to server */
  sendMessage: (message: Partial<WSMessage>) => boolean
  /** Join a session room */
  joinSession: (sessionId: string) => boolean
  /** Leave a session room */
  leaveSession: (sessionId: string) => boolean
  /** Join a project room */
  joinProject: (projectId: string) => boolean
  /** Leave a project room */
  leaveProject: (projectId: string) => boolean
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * React hook for managing WebSocket connection
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { status, isConnected, lastMessage, emit } = useSocket({
 *     onMessage: (msg) => console.log('Received:', msg),
 *     onStatusChange: (status) => console.log('Status:', status),
 *   })
 *
 *   return (
 *     <div>
 *       <p>Status: {status}</p>
 *       <button onClick={() => emit('ping', {})}>Ping</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const {
    autoConnect = true,
    onMessage: onMessageCallback,
    onStatusChange: onStatusChangeCallback,
    onError: onErrorCallback,
    ...socketOptions
  } = options

  // State
  const [status, setStatus] = useState<SocketStatus>(getStatus())
  const [clientId, setClientId] = useState<string | null>(getClientId())
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)

  // Refs for callbacks to avoid stale closures
  const onMessageRef = useRef(onMessageCallback)
  const onStatusChangeRef = useRef(onStatusChangeCallback)
  const onErrorRef = useRef(onErrorCallback)

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessageCallback
  }, [onMessageCallback])

  useEffect(() => {
    onStatusChangeRef.current = onStatusChangeCallback
  }, [onStatusChangeCallback])

  useEffect(() => {
    onErrorRef.current = onErrorCallback
  }, [onErrorCallback])

  // Connect function
  const handleConnect = useCallback(() => {
    try {
      connect(socketOptions)
    } catch (error) {
      if (onErrorRef.current && error instanceof Error) {
        onErrorRef.current(error)
      }
    }
  }, [socketOptions])

  // Disconnect function
  const handleDisconnect = useCallback(() => {
    disconnect()
  }, [])

  // Setup connection and listeners on mount
  useEffect(() => {
    // Subscribe to status changes
    const unsubscribeStatus = onStatusChange((newStatus) => {
      setStatus(newStatus)
      setClientId(getClientId())

      if (onStatusChangeRef.current) {
        onStatusChangeRef.current(newStatus)
      }
    })

    // Subscribe to messages
    const unsubscribeMessage = onMessage((message) => {
      setLastMessage(message)

      if (onMessageRef.current) {
        onMessageRef.current(message)
      }
    })

    // Auto connect if enabled
    if (autoConnect) {
      handleConnect()
    }

    // Cleanup on unmount
    return () => {
      unsubscribeStatus()
      unsubscribeMessage()
      // Note: We don't disconnect on unmount to maintain connection across route changes
      // If you need to disconnect, call disconnect() explicitly
    }
  }, [autoConnect, handleConnect])

  // Return hook interface
  return {
    status,
    isConnected: status === 'connected' && isConnected(),
    clientId,
    lastMessage,
    connect: handleConnect,
    disconnect: handleDisconnect,
    emit,
    sendMessage,
    joinSession,
    leaveSession,
    joinProject,
    leaveProject,
  }
}

// =============================================================================
// Re-exports
// =============================================================================

export type { SocketStatus, WSMessage, SocketOptions }

export default useSocket
