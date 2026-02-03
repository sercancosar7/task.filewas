/**
 * Socket.io Server Setup
 * WebSocket server for real-time communication
 * @module @task-filewas/backend/socket
 */

import { Server as SocketServer, type Socket } from 'socket.io'
import { createServer, type Server as HttpServer } from 'node:http'
import type { Express } from 'express'
import { env, isDevelopment } from '../config/env.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Client info stored for each connection
 */
interface ConnectedClient {
  id: string
  socket: Socket
  connectedAt: Date
  sessionId?: string
  projectId?: string
}

/**
 * Message types for WebSocket communication
 */
export type WSMessageType =
  | 'output'        // Claude CLI output
  | 'status'        // Session/phase status updates
  | 'error'         // Error messages
  | 'connected'     // Initial connection acknowledgment
  | 'ping'          // Keep-alive ping
  | 'pong'          // Keep-alive pong

/**
 * WebSocket message structure
 */
export interface WSMessage {
  type: WSMessageType
  event?: string
  payload?: unknown
  timestamp: string
  clientId?: string
}

// =============================================================================
// Module State
// =============================================================================

let io: SocketServer | null = null
let httpServer: HttpServer | null = null
const clients: Map<string, ConnectedClient> = new Map()
let pingInterval: NodeJS.Timeout | null = null

// =============================================================================
// Server Setup
// =============================================================================

/**
 * Create and configure Socket.io server
 * @param app Express application instance
 * @returns HTTP server wrapped around Express
 */
export function createSocketServer(app: Express): HttpServer {
  // Create HTTP server from Express app
  httpServer = createServer(app)

  // Parse allowed origins from env
  const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim())

  // Create Socket.io server with CORS configuration
  io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) {
          callback(null, true)
          return
        }

        // In development, allow localhost variations
        if (isDevelopment) {
          const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1')
          if (isLocalhost) {
            callback(null, true)
            return
          }
        }

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error(`CORS: Origin ${origin} not allowed`))
        }
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Connection options
    pingTimeout: 60000,        // 60 seconds to respond to ping
    pingInterval: 25000,       // Send ping every 25 seconds
    transports: ['websocket', 'polling'],  // Prefer WebSocket, fallback to polling
    maxHttpBufferSize: 1e6,    // 1MB max message size
  })

  // Setup connection handling
  setupConnectionHandlers()

  // Start ping interval for custom keep-alive
  startPingInterval()

  console.log('[Socket.io] Server initialized')

  return httpServer
}

// =============================================================================
// Connection Handlers
// =============================================================================

/**
 * Setup Socket.io connection event handlers
 */
function setupConnectionHandlers(): void {
  if (!io) return

  io.on('connection', (socket: Socket) => {
    const clientId = socket.id

    // Store client info
    const client: ConnectedClient = {
      id: clientId,
      socket,
      connectedAt: new Date(),
    }
    clients.set(clientId, client)

    console.log(`[Socket.io] Client connected: ${clientId} (total: ${clients.size})`)

    // Send connection acknowledgment
    sendToClient(clientId, {
      type: 'connected',
      event: 'connection_established',
      payload: { clientId },
      timestamp: new Date().toISOString(),
      clientId,
    })

    // Handle client messages
    socket.on('message', (data: unknown) => {
      handleClientMessage(clientId, data)
    })

    // Handle pong responses
    socket.on('pong_response', () => {
      // Client is alive, nothing to do
    })

    // Handle session join request
    socket.on('join_session', (sessionId: string) => {
      handleJoinSession(clientId, sessionId)
    })

    // Handle session leave request
    socket.on('leave_session', (sessionId: string) => {
      handleLeaveSession(clientId, sessionId)
    })

    // Handle project join request
    socket.on('join_project', (projectId: string) => {
      handleJoinProject(clientId, projectId)
    })

    // Handle project leave request
    socket.on('leave_project', (projectId: string) => {
      handleLeaveProject(clientId, projectId)
    })

    // Handle disconnect
    socket.on('disconnect', (reason: string) => {
      handleDisconnect(clientId, reason)
    })

    // Handle errors
    socket.on('error', (error: Error) => {
      console.error(`[Socket.io] Client ${clientId} error:`, error.message)
    })
  })
}

/**
 * Handle incoming client message
 */
function handleClientMessage(clientId: string, data: unknown): void {
  try {
    // Parse message if it's a string
    const message = typeof data === 'string' ? JSON.parse(data) : data

    // Handle ping messages
    if (message?.type === 'ping') {
      sendToClient(clientId, {
        type: 'pong',
        timestamp: new Date().toISOString(),
        clientId,
      })
      return
    }

    // Log other messages in development
    if (isDevelopment) {
      console.log(`[Socket.io] Message from ${clientId}:`, message)
    }
  } catch (error) {
    console.error(`[Socket.io] Error parsing message from ${clientId}:`, error)
  }
}

/**
 * Handle client disconnect
 */
function handleDisconnect(clientId: string, reason: string): void {
  const client = clients.get(clientId)

  if (client) {
    // Leave all rooms
    if (client.sessionId) {
      client.socket.leave(`session:${client.sessionId}`)
    }
    if (client.projectId) {
      client.socket.leave(`project:${client.projectId}`)
    }

    clients.delete(clientId)
    console.log(`[Socket.io] Client disconnected: ${clientId} (reason: ${reason}, remaining: ${clients.size})`)
  }
}

// =============================================================================
// Room Management
// =============================================================================

/**
 * Join a session room
 */
function handleJoinSession(clientId: string, sessionId: string): void {
  const client = clients.get(clientId)
  if (!client) return

  // Leave previous session room if any
  if (client.sessionId) {
    client.socket.leave(`session:${client.sessionId}`)
  }

  // Join new session room
  client.sessionId = sessionId
  client.socket.join(`session:${sessionId}`)

  console.log(`[Socket.io] Client ${clientId} joined session: ${sessionId}`)

  // Acknowledge join
  sendToClient(clientId, {
    type: 'status',
    event: 'session_joined',
    payload: { sessionId },
    timestamp: new Date().toISOString(),
    clientId,
  })
}

/**
 * Leave a session room
 */
function handleLeaveSession(clientId: string, sessionId: string): void {
  const client = clients.get(clientId)
  if (!client) return

  client.socket.leave(`session:${sessionId}`)

  if (client.sessionId === sessionId) {
    delete client.sessionId
  }

  console.log(`[Socket.io] Client ${clientId} left session: ${sessionId}`)
}

/**
 * Join a project room
 */
function handleJoinProject(clientId: string, projectId: string): void {
  const client = clients.get(clientId)
  if (!client) return

  // Leave previous project room if any
  if (client.projectId) {
    client.socket.leave(`project:${client.projectId}`)
  }

  // Join new project room
  client.projectId = projectId
  client.socket.join(`project:${projectId}`)

  console.log(`[Socket.io] Client ${clientId} joined project: ${projectId}`)

  // Acknowledge join
  sendToClient(clientId, {
    type: 'status',
    event: 'project_joined',
    payload: { projectId },
    timestamp: new Date().toISOString(),
    clientId,
  })
}

/**
 * Leave a project room
 */
function handleLeaveProject(clientId: string, projectId: string): void {
  const client = clients.get(clientId)
  if (!client) return

  client.socket.leave(`project:${projectId}`)

  if (client.projectId === projectId) {
    delete client.projectId
  }

  console.log(`[Socket.io] Client ${clientId} left project: ${projectId}`)
}

// =============================================================================
// Message Sending
// =============================================================================

/**
 * Send message to a specific client
 */
export function sendToClient(clientId: string, message: WSMessage): boolean {
  const client = clients.get(clientId)
  if (!client) {
    return false
  }

  try {
    client.socket.emit('message', message)
    return true
  } catch (error) {
    console.error(`[Socket.io] Error sending to client ${clientId}:`, error)
    return false
  }
}

/**
 * Broadcast message to all connected clients
 */
export function broadcast(message: WSMessage): void {
  if (!io) return

  io.emit('message', message)
}

/**
 * Broadcast message to a specific session room
 */
export function broadcastToSession(sessionId: string, message: WSMessage): void {
  if (!io) return

  io.to(`session:${sessionId}`).emit('message', message)
}

/**
 * Broadcast message to a specific project room
 */
export function broadcastToProject(projectId: string, message: WSMessage): void {
  if (!io) return

  io.to(`project:${projectId}`).emit('message', message)
}

// =============================================================================
// Keep-Alive
// =============================================================================

/**
 * Start ping interval for custom keep-alive
 */
function startPingInterval(): void {
  // Clear existing interval if any
  if (pingInterval) {
    clearInterval(pingInterval)
  }

  // Send ping every 30 seconds
  pingInterval = setInterval(() => {
    const pingMessage: WSMessage = {
      type: 'ping',
      timestamp: new Date().toISOString(),
    }

    broadcast(pingMessage)
  }, 30000)
}

/**
 * Stop ping interval
 */
function stopPingInterval(): void {
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Get current client count
 */
export function getClientCount(): number {
  return clients.size
}

/**
 * Get all connected client IDs
 */
export function getClientIds(): string[] {
  return Array.from(clients.keys())
}

/**
 * Check if a client is connected
 */
export function isClientConnected(clientId: string): boolean {
  return clients.has(clientId)
}

/**
 * Get Socket.io server instance
 */
export function getSocketServer(): SocketServer | null {
  return io
}

/**
 * Get HTTP server instance
 */
export function getHttpServer(): HttpServer | null {
  return httpServer
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Close all connections and cleanup
 */
export function closeAllConnections(): void {
  console.log('[Socket.io] Closing all connections...')

  // Stop ping interval
  stopPingInterval()

  // Disconnect all clients
  for (const [clientId, client] of clients) {
    try {
      client.socket.disconnect(true)
    } catch (error) {
      console.error(`[Socket.io] Error disconnecting client ${clientId}:`, error)
    }
  }
  clients.clear()

  // Close Socket.io server
  if (io) {
    io.close()
    io = null
  }

  console.log('[Socket.io] All connections closed')
}

export default {
  createSocketServer,
  sendToClient,
  broadcast,
  broadcastToSession,
  broadcastToProject,
  getClientCount,
  getClientIds,
  isClientConnected,
  getSocketServer,
  getHttpServer,
  closeAllConnections,
}
