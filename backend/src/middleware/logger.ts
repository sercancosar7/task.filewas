/**
 * Request Logger Middleware
 * Logs incoming requests with method, path, status, and duration
 * @module @task-filewas/backend/middleware/logger
 */

import type { Request, Response, NextFunction } from 'express'
import { env, isDevelopment } from '../config/env.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * Log levels
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Log level priority (lower = more verbose)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
}

/**
 * HTTP method colors
 */
const methodColors: Record<string, string> = {
  GET: colors.green,
  POST: colors.blue,
  PUT: colors.yellow,
  PATCH: colors.cyan,
  DELETE: colors.red,
  OPTIONS: colors.gray,
  HEAD: colors.gray,
}

/**
 * Status code color based on range
 */
function getStatusColor(status: number): string {
  if (status >= 500) return colors.red
  if (status >= 400) return colors.yellow
  if (status >= 300) return colors.cyan
  if (status >= 200) return colors.green
  return colors.gray
}

/**
 * Check if log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[env.LOG_LEVEL]
}

/**
 * Format duration for display
 */
function formatDuration(ms: number): string {
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * Format timestamp for logs
 */
function formatTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Create log message
 */
function createLogMessage(
  method: string,
  path: string,
  status: number,
  duration: number,
  requestId: string
): string {
  const timestamp = formatTimestamp()
  const methodColor = methodColors[method] || colors.gray
  const statusColor = getStatusColor(status)
  const durationStr = formatDuration(duration)

  if (isDevelopment) {
    // Colored output for development
    return [
      `${colors.dim}[${timestamp}]${colors.reset}`,
      `${methodColor}${method.padEnd(7)}${colors.reset}`,
      `${path}`,
      `${statusColor}${status}${colors.reset}`,
      `${colors.dim}${durationStr}${colors.reset}`,
      `${colors.gray}id:${requestId.slice(0, 8)}${colors.reset}`,
    ].join(' ')
  }

  // Plain output for production (JSON-friendly logs)
  return JSON.stringify({
    timestamp,
    level: status >= 400 ? 'error' : 'info',
    method,
    path,
    status,
    duration: Math.round(duration),
    requestId,
  })
}

/**
 * Request logger middleware
 * Attaches request ID and logs request completion
 */
export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip health check endpoints from logging (too noisy)
  if (req.path === '/api/health' && !shouldLog('debug')) {
    next()
    return
  }

  // Generate unique request ID
  const requestId = (req.headers['x-request-id'] as string) || uuidv4()
  req.requestId = requestId

  // Set request ID header for tracing
  res.setHeader('X-Request-ID', requestId)

  // Record start time
  const startTime = process.hrtime.bigint()

  // Log request start in debug mode
  if (shouldLog('debug')) {
    console.log(`${colors.dim}[${formatTimestamp()}]${colors.reset} → ${req.method} ${req.path}`)
  }

  // Log on response finish
  res.on('finish', () => {
    const endTime = process.hrtime.bigint()
    const durationMs = Number(endTime - startTime) / 1_000_000 // Convert nanoseconds to ms

    // Set response time header
    res.setHeader('X-Response-Time', `${Math.round(durationMs)}ms`)

    // Determine log level based on status
    const level: LogLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'

    if (shouldLog(level)) {
      const message = createLogMessage(
        req.method,
        req.originalUrl || req.path,
        res.statusCode,
        durationMs,
        requestId
      )
      console.log(message)
    }
  })

  next()
}

/**
 * Extend Express Request type to include requestId
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string
    }
  }
}

export default loggerMiddleware
