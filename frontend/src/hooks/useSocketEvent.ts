/**
 * useSocketEvent Hook
 * React hook for subscribing to specific WebSocket events with automatic cleanup
 * @module @task-filewas/frontend/hooks/useSocketEvent
 */

import { useEffect, useRef, useCallback } from 'react'
import {
  onMessage,
  onEvent,
  onNamedEvent,
  onStatusChange,
  type WSMessage,
  type WSMessageType,
  type SocketStatus,
} from '../lib/socket'

// =============================================================================
// Types
// =============================================================================

/**
 * Event filter options
 */
export interface EventFilterOptions {
  /** Filter by message type */
  type?: WSMessageType
  /** Filter by event name */
  event?: string
  /** Custom filter function */
  filter?: (message: WSMessage) => boolean
}

// =============================================================================
// useSocketEvent - Listen to any message with optional filter
// =============================================================================

/**
 * Subscribe to WebSocket messages with optional filtering
 *
 * @example
 * ```tsx
 * // Listen to all messages
 * useSocketEvent((message) => {
 *   console.log('Message:', message)
 * })
 *
 * // Listen to specific type
 * useSocketEvent(
 *   (message) => console.log('Output:', message),
 *   { type: 'output' }
 * )
 *
 * // Listen to specific event name
 * useSocketEvent(
 *   (message) => console.log('Session started:', message),
 *   { event: 'session_started' }
 * )
 *
 * // Custom filter
 * useSocketEvent(
 *   (message) => console.log('Filtered:', message),
 *   { filter: (msg) => msg.type === 'status' && msg.event?.startsWith('session_') }
 * )
 * ```
 */
export function useSocketEvent(
  callback: (message: WSMessage) => void,
  options?: EventFilterOptions
): void {
  // Ref to keep callback stable
  const callbackRef = useRef(callback)

  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    // Determine which subscription to use based on options
    let unsubscribe: () => void

    if (options?.type && !options?.event && !options?.filter) {
      // Simple type filter - use optimized onEvent
      unsubscribe = onEvent(options.type, (message) => {
        callbackRef.current(message)
      })
    } else if (options?.event && !options?.type && !options?.filter) {
      // Simple event name filter - use optimized onNamedEvent
      unsubscribe = onNamedEvent(options.event, (message) => {
        callbackRef.current(message)
      })
    } else {
      // Complex filter or no filter - use onMessage with custom filtering
      unsubscribe = onMessage((message) => {
        // Apply filters
        if (options?.type && message.type !== options.type) {
          return
        }
        if (options?.event && message.event !== options.event) {
          return
        }
        if (options?.filter && !options.filter(message)) {
          return
        }

        callbackRef.current(message)
      })
    }

    // Cleanup on unmount or options change
    return unsubscribe
  }, [options?.type, options?.event, options?.filter])
}

// =============================================================================
// useSocketStatus - Listen to connection status changes
// =============================================================================

/**
 * Subscribe to WebSocket connection status changes
 *
 * @example
 * ```tsx
 * useSocketStatus((status) => {
 *   if (status === 'connected') {
 *     console.log('Connected!')
 *   } else if (status === 'disconnected') {
 *     console.log('Lost connection')
 *   }
 * })
 * ```
 */
export function useSocketStatus(callback: (status: SocketStatus) => void): void {
  // Ref to keep callback stable
  const callbackRef = useRef(callback)

  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const unsubscribe = onStatusChange((status) => {
      callbackRef.current(status)
    })

    return unsubscribe
  }, [])
}

// =============================================================================
// useSocketOutput - Listen specifically to output messages
// =============================================================================

/**
 * Subscribe to output messages (Claude CLI output)
 *
 * @example
 * ```tsx
 * useSocketOutput((message) => {
 *   console.log('Claude output:', message.payload)
 * })
 * ```
 */
export function useSocketOutput(callback: (message: WSMessage) => void): void {
  useSocketEvent(callback, { type: 'output' })
}

// =============================================================================
// useSocketError - Listen specifically to error messages
// =============================================================================

/**
 * Subscribe to error messages
 *
 * @example
 * ```tsx
 * useSocketError((message) => {
 *   console.error('Socket error:', message.payload)
 * })
 * ```
 */
export function useSocketError(callback: (message: WSMessage) => void): void {
  useSocketEvent(callback, { type: 'error' })
}

// =============================================================================
// useSessionEvents - Listen to session-related events
// =============================================================================

/**
 * Callback types for session events
 */
export interface SessionEventCallbacks {
  onSessionStarted?: (message: WSMessage) => void
  onSessionPaused?: (message: WSMessage) => void
  onSessionResumed?: (message: WSMessage) => void
  onSessionStopped?: (message: WSMessage) => void
  onSessionEnded?: (message: WSMessage) => void
  onSessionError?: (message: WSMessage) => void
  onSessionJoined?: (message: WSMessage) => void
  onPhaseStarted?: (message: WSMessage) => void
  onPhaseCompleted?: (message: WSMessage) => void
  onOutput?: (message: WSMessage) => void
}

/**
 * Subscribe to multiple session-related events
 *
 * @example
 * ```tsx
 * useSessionEvents({
 *   onSessionStarted: (msg) => console.log('Started'),
 *   onSessionEnded: (msg) => console.log('Ended'),
 *   onOutput: (msg) => setOutput(prev => [...prev, msg]),
 * })
 * ```
 */
export function useSessionEvents(callbacks: SessionEventCallbacks): void {
  // Ref to keep callbacks stable
  const callbacksRef = useRef(callbacks)

  // Update ref when callbacks change
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  // Create a stable handler
  const handler = useCallback((message: WSMessage) => {
    const cbs = callbacksRef.current

    // Route to appropriate callback based on event name
    switch (message.event) {
      case 'session_started':
        cbs.onSessionStarted?.(message)
        break
      case 'session_paused':
        cbs.onSessionPaused?.(message)
        break
      case 'session_resumed':
        cbs.onSessionResumed?.(message)
        break
      case 'session_stopped':
        cbs.onSessionStopped?.(message)
        break
      case 'session_ended':
        cbs.onSessionEnded?.(message)
        break
      case 'session_error':
        cbs.onSessionError?.(message)
        break
      case 'session_joined':
        cbs.onSessionJoined?.(message)
        break
      case 'phase_started':
        cbs.onPhaseStarted?.(message)
        break
      case 'phase_completed':
        cbs.onPhaseCompleted?.(message)
        break
    }

    // Also check message type for output
    if (message.type === 'output') {
      cbs.onOutput?.(message)
    }
  }, [])

  useSocketEvent(handler)
}

// =============================================================================
// Re-exports
// =============================================================================

export type { WSMessage, WSMessageType, SocketStatus }

export default useSocketEvent
