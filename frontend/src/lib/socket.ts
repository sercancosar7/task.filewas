/**
 * Socket.io Client Singleton
 * WebSocket connection management for real-time communication
 * @module @task-filewas/frontend/lib/socket
 */

import { io, Socket } from 'socket.io-client'

// =============================================================================
// Types
// =============================================================================

/**
 * WebSocket message types (matches backend WSMessageType)
 */
export type WSMessageType =
  | 'output'    // Claude CLI output
  | 'status'    // Session/phase status updates
  | 'error'     // Error messages
  | 'connected' // Initial connection acknowledgment
  | 'ping'      // Keep-alive ping
  | 'pong'      // Keep-alive pong

/**
 * WebSocket message structure (matches backend WSMessage)
 */
export interface WSMessage {
  type: WSMessageType
  event?: string
  payload?: unknown
  timestamp: string
  clientId?: string
}

/**
 * Socket connection status
 */
export type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

/**
 * Socket connection options
 */
export interface SocketOptions {
  /** Auto connect on initialization */
  autoConnect?: boolean
  /** Enable reconnection attempts */
  reconnection?: boolean
  /** Number of reconnection attempts before giving up */
  reconnectionAttempts?: number
  /** Delay between reconnection attempts (ms) */
  reconnectionDelay?: number
  /** Maximum delay between reconnection attempts (ms) */
  reconnectionDelayMax?: number
}

// =============================================================================
// Environment Configuration
// =============================================================================

/**
 * Get WebSocket URL from environment
 * Falls back to current host with default port
 */
function getSocketUrl(): string {
  // Check for Vite environment variable
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL
  }

  // Fallback: Use API URL or construct from current location
  if (import.meta.env.VITE_API_URL) {
    // API URL is typically the same as WS URL for Socket.io
    return import.meta.env.VITE_API_URL
  }

  // Default fallback for development
  if (import.meta.env.DEV) {
    return 'http://localhost:3001'
  }

  // Production: Use current origin
  return window.location.origin
}

/**
 * Check if running in development mode
 */
function isDevelopment(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_ENV === 'development'
}

// =============================================================================
// Socket Singleton
// =============================================================================

/** Socket instance singleton */
let socket: Socket | null = null

/** Current connection status */
let status: SocketStatus = 'disconnected'

/** Status change listeners */
const statusListeners: Set<(status: SocketStatus) => void> = new Set()

/** Message listeners */
const messageListeners: Set<(message: WSMessage) => void> = new Set()

/** Client ID assigned by server */
let clientId: string | null = null

// =============================================================================
// Internal Functions
// =============================================================================

/**
 * Update status and notify listeners
 */
function setStatus(newStatus: SocketStatus): void {
  if (status !== newStatus) {
    status = newStatus
    if (isDevelopment()) {
      console.log(`[Socket] Status changed: ${newStatus}`)
    }
    statusListeners.forEach((listener) => {
      try {
        listener(newStatus)
      } catch (error) {
        console.error('[Socket] Status listener error:', error)
      }
    })
  }
}

/**
 * Handle incoming messages
 */
function handleMessage(message: WSMessage): void {
  if (isDevelopment()) {
    console.log('[Socket] Message received:', message.type, message.event)
  }

  // Handle ping/pong internally
  if (message.type === 'ping') {
    socket?.emit('message', { type: 'pong', timestamp: new Date().toISOString() })
    return
  }

  // Store client ID from connection message
  if (message.type === 'connected' && message.payload) {
    const payload = message.payload as { clientId?: string }
    if (payload.clientId) {
      clientId = payload.clientId
      if (isDevelopment()) {
        console.log('[Socket] Client ID:', clientId)
      }
    }
  }

  // Notify message listeners
  messageListeners.forEach((listener) => {
    try {
      listener(message)
    } catch (error) {
      console.error('[Socket] Message listener error:', error)
    }
  })
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get or create socket instance
 */
export function getSocket(): Socket {
  if (!socket) {
    throw new Error('Socket not initialized. Call connect() first.')
  }
  return socket
}

/**
 * Connect to WebSocket server
 * @param options Connection options
 * @returns Socket instance
 */
export function connect(options: SocketOptions = {}): Socket {
  // Return existing socket if already connected or connecting
  if (socket && (status === 'connected' || status === 'connecting')) {
    return socket
  }

  const {
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
    reconnectionDelayMax = 5000,
  } = options

  const url = getSocketUrl()

  if (isDevelopment()) {
    console.log('[Socket] Connecting to:', url)
  }

  setStatus('connecting')

  // Create socket instance
  socket = io(url, {
    autoConnect,
    reconnection,
    reconnectionAttempts,
    reconnectionDelay,
    reconnectionDelayMax,
    transports: ['websocket', 'polling'],
    withCredentials: true,
  })

  // Connection events
  socket.on('connect', () => {
    setStatus('connected')
    if (isDevelopment()) {
      console.log('[Socket] Connected, socket ID:', socket?.id)
    }
  })

  socket.on('disconnect', (reason) => {
    setStatus('disconnected')
    clientId = null
    if (isDevelopment()) {
      console.log('[Socket] Disconnected:', reason)
    }
  })

  socket.on('connect_error', (error) => {
    if (isDevelopment()) {
      console.error('[Socket] Connection error:', error.message)
    }
  })

  // Reconnection events
  socket.io.on('reconnect_attempt', (attempt) => {
    setStatus('reconnecting')
    if (isDevelopment()) {
      console.log('[Socket] Reconnection attempt:', attempt)
    }
  })

  socket.io.on('reconnect', (attempt) => {
    setStatus('connected')
    if (isDevelopment()) {
      console.log('[Socket] Reconnected after', attempt, 'attempts')
    }
  })

  socket.io.on('reconnect_failed', () => {
    setStatus('disconnected')
    if (isDevelopment()) {
      console.log('[Socket] Reconnection failed')
    }
  })

  // Message handling
  socket.on('message', handleMessage)

  return socket
}

/**
 * Disconnect from WebSocket server
 */
export function disconnect(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    clientId = null
    setStatus('disconnected')
    if (isDevelopment()) {
      console.log('[Socket] Disconnected manually')
    }
  }
}

/**
 * Check if socket is connected
 */
export function isConnected(): boolean {
  return status === 'connected' && socket?.connected === true
}

/**
 * Get current connection status
 */
export function getStatus(): SocketStatus {
  return status
}

/**
 * Get client ID assigned by server
 */
export function getClientId(): string | null {
  return clientId
}

/**
 * Send a message to the server
 * @param event Event name
 * @param data Event data
 * @returns true if sent, false if not connected
 */
export function emit(event: string, data?: unknown): boolean {
  if (!socket || !isConnected()) {
    console.warn('[Socket] Cannot emit, not connected')
    return false
  }

  socket.emit(event, data)
  return true
}

/**
 * Send a generic message to the server
 * @param message Message to send
 * @returns true if sent, false if not connected
 */
export function sendMessage(message: Partial<WSMessage>): boolean {
  return emit('message', {
    ...message,
    timestamp: message.timestamp || new Date().toISOString(),
  })
}

// =============================================================================
// Room Management
// =============================================================================

/**
 * Join a session room to receive session-specific updates
 * @param sessionId Session ID to join
 */
export function joinSession(sessionId: string): boolean {
  return emit('join_session', sessionId)
}

/**
 * Leave a session room
 * @param sessionId Session ID to leave
 */
export function leaveSession(sessionId: string): boolean {
  return emit('leave_session', sessionId)
}

/**
 * Join a project room to receive project-specific updates
 * @param projectId Project ID to join
 */
export function joinProject(projectId: string): boolean {
  return emit('join_project', projectId)
}

/**
 * Leave a project room
 * @param projectId Project ID to leave
 */
export function leaveProject(projectId: string): boolean {
  return emit('leave_project', projectId)
}

// =============================================================================
// Listener Management
// =============================================================================

/**
 * Subscribe to status changes
 * @param listener Callback function
 * @returns Unsubscribe function
 */
export function onStatusChange(listener: (status: SocketStatus) => void): () => void {
  statusListeners.add(listener)
  return () => {
    statusListeners.delete(listener)
  }
}

/**
 * Subscribe to all messages
 * @param listener Callback function
 * @returns Unsubscribe function
 */
export function onMessage(listener: (message: WSMessage) => void): () => void {
  messageListeners.add(listener)
  return () => {
    messageListeners.delete(listener)
  }
}

/**
 * Subscribe to a specific event type
 * @param eventType Event type to listen for
 * @param listener Callback function
 * @returns Unsubscribe function
 */
export function onEvent(
  eventType: WSMessageType,
  listener: (message: WSMessage) => void
): () => void {
  const wrappedListener = (message: WSMessage) => {
    if (message.type === eventType) {
      listener(message)
    }
  }

  messageListeners.add(wrappedListener)
  return () => {
    messageListeners.delete(wrappedListener)
  }
}

/**
 * Subscribe to a specific named event
 * @param eventName Event name to listen for
 * @param listener Callback function
 * @returns Unsubscribe function
 */
export function onNamedEvent(
  eventName: string,
  listener: (message: WSMessage) => void
): () => void {
  const wrappedListener = (message: WSMessage) => {
    if (message.event === eventName) {
      listener(message)
    }
  }

  messageListeners.add(wrappedListener)
  return () => {
    messageListeners.delete(wrappedListener)
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  connect,
  disconnect,
  getSocket,
  isConnected,
  getStatus,
  getClientId,
  emit,
  sendMessage,
  joinSession,
  leaveSession,
  joinProject,
  leaveProject,
  onStatusChange,
  onMessage,
  onEvent,
  onNamedEvent,
}
