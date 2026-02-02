/**
 * CORS Middleware
 * Cross-Origin Resource Sharing configuration
 * @module @task-filewas/backend/middleware/cors
 */

import cors, { type CorsOptions } from 'cors'
import { env, isDevelopment } from '../config/env.js'

/**
 * CORS configuration options
 */
const corsOptions: CorsOptions = {
  // Allow requests from frontend origin
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      callback(null, true)
      return
    }

    // Parse allowed origins from env
    const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim())

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

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Request-ID',
  ],

  // Exposed headers (accessible from client)
  exposedHeaders: [
    'X-Request-ID',
    'X-Response-Time',
  ],

  // Preflight cache duration (24 hours)
  maxAge: 86400,

  // Pass preflight response to next handler
  preflightContinue: false,

  // Success status for legacy browsers (IE11)
  optionsSuccessStatus: 204,
}

/**
 * CORS middleware instance
 */
export const corsMiddleware = cors(corsOptions)

export default corsMiddleware
