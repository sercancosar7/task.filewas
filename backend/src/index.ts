/**
 * Task.filewas Backend Server
 * Express application entry point
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { env, isDevelopment } from './config/env.js'

// Create Express application
const app: Express = express()

// Middleware
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Request logging middleware (development only)
if (isDevelopment) {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${req.method} ${req.url}`)
    next()
  })
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: '0.1.0',
  })
})

// API root endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'Task.filewas API',
    version: '0.1.0',
    status: 'running',
  })
})

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
  })
})

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message)

  if (isDevelopment) {
    console.error(err.stack)
  }

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : 'An unexpected error occurred',
  })
})

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
