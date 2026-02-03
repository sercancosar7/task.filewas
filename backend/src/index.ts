/**
 * Task.filewas Backend Server
 * Express application entry point with Socket.io integration
 */

import express, { type Express, type Request, type Response } from 'express'
import { env } from './config/env.js'
import {
  corsMiddleware,
  loggerMiddleware,
  errorMiddleware,
  notFoundMiddleware,
} from './middleware/index.js'
import {
  healthRouter,
  authRouter,
  sessionsRouter,
  projectsRouter,
  agentsRouter,
  skillsRouter,
  commandsRouter,
  settingsRouter,
  filesRouter,
  uploadsRouter,
} from './routes/index.js'
import { initStorage } from './storage/index.js'
import { createSocketServer, closeAllConnections, getClientCount } from './socket/index.js'

// Create Express application
const app: Express = express()

// =============================================================================
// Core Middleware (order matters!)
// =============================================================================

// 1. CORS - must be first to handle preflight requests
app.use(corsMiddleware)

// 2. Request logging - log all incoming requests
app.use(loggerMiddleware)

// 3. Body parsers
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// =============================================================================
// Routes
// =============================================================================

// Health check routes
app.use('/api/health', healthRouter)

// Auth routes
app.use('/api/auth', authRouter)

// Session routes
app.use('/api/sessions', sessionsRouter)

// Project routes
app.use('/api/projects', projectsRouter)

// ECC routes - Agents, Skills, Commands
app.use('/api/agents', agentsRouter)
app.use('/api/skills', skillsRouter)
app.use('/api/commands', commandsRouter)

// Settings routes
app.use('/api/settings', settingsRouter)

// File browser routes (nested under /api/projects/:id/files/*)
// Note: filesRouter registers its own path with :id parameter
app.use('/api/projects', filesRouter)

// Upload routes (nested under /api/projects/:id/uploads/*)
app.use('/api/projects', uploadsRouter)

// API root endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'Task.filewas API',
    version: '0.1.0',
    status: 'running',
  })
})

// =============================================================================
// Error Handling Middleware (must be last!)
// =============================================================================

// 404 handler - catches all undefined routes
app.use(notFoundMiddleware)

// Global error handler - catches all errors
app.use(errorMiddleware)

// =============================================================================
// Bootstrap Application
// =============================================================================

async function bootstrap(): Promise<void> {
  try {
    // Initialize storage (creates data/ directories and default files)
    await initStorage()

    // Create HTTP server with Socket.io
    const httpServer = createSocketServer(app)

    // Start server
    httpServer.listen(env.PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════╗
║          Task.filewas Backend Server                 ║
╠══════════════════════════════════════════════════════╣
║  Port:        ${env.PORT.toString().padEnd(40)}║
║  Environment: ${env.NODE_ENV.padEnd(40)}║
║  Data Path:   ${env.DATA_PATH.padEnd(40)}║
║  CORS Origin: ${env.CORS_ORIGIN.padEnd(40)}║
║  WebSocket:   Enabled (Socket.io)${' '.repeat(22)}║
╚══════════════════════════════════════════════════════╝
      `)
    })

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n[${signal}] Shutting down gracefully...`)
      console.log(`[Socket.io] Connected clients: ${getClientCount()}`)

      // Close WebSocket connections first
      closeAllConnections()

      // Then close HTTP server
      httpServer.close(() => {
        console.log('[Server] Closed')
        process.exit(0)
      })

      // Force close after 10s
      setTimeout(() => {
        console.error('[Server] Forcing shutdown')
        process.exit(1)
      }, 10000)
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  } catch (error) {
    console.error('[Bootstrap] Failed to start server:', error)
    process.exit(1)
  }
}

// Start the application
bootstrap()

export { app }
export default app
