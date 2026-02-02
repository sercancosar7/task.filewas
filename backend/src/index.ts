/**
 * Task.filewas Backend Server
 * Express application entry point
 */

import express, { type Express, type Request, type Response } from 'express'
import { env } from './config/env.js'
import {
  corsMiddleware,
  loggerMiddleware,
  errorMiddleware,
  notFoundMiddleware,
} from './middleware/index.js'
import { healthRouter } from './routes/index.js'

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

// Start server
const server = app.listen(env.PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║          Task.filewas Backend Server                 ║
╠══════════════════════════════════════════════════════╣
║  Port:        ${env.PORT.toString().padEnd(40)}║
║  Environment: ${env.NODE_ENV.padEnd(40)}║
║  Data Path:   ${env.DATA_PATH.padEnd(40)}║
║  CORS Origin: ${env.CORS_ORIGIN.padEnd(40)}║
╚══════════════════════════════════════════════════════╝
  `)
})

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n[${signal}] Shutting down gracefully...`)
  server.close(() => {
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

export { app, server }
export default app
